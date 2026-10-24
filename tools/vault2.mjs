#!/usr/bin/env node
/*
  One-time upgrade of the special site's vault (docs/special/vault.json) from v1 to v2.

  Usage (Node 18+), run from the repo root:
    PRIVATE_PW1='...' PRIVATE_PW2='...' PRIVATE_PW3='...' EDITOR_PW='...' \
      node tools/vault2.mjs [--covers a.jpg,b.jpg] [--titles "Title A|Title B"] [--map heartmap.json] [dir]

  dir defaults to docs/special. Passwords come from the environment and are never written to disk.

  v2 keeps the same content key (so every existing media/*.enc file stays valid) but stores it differently:
    - each question has its own random secret, wrapped once per accepted answer (PBKDF2 of the answer + AES-GCM)
    - the content key is wrapped by a key made from all the question secrets (what visitors unlock)
    - the content key is also wrapped by the editor password (what the page editor unlocks)
  The question secrets are kept inside the encrypted content so the editor can change one answer without the others.
*/
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {pbkdf2Sync,randomBytes,createCipheriv,createDecipheriv,createHash} from 'node:crypto';
import {join,resolve,extname} from 'node:path';

const args=process.argv.slice(2);
function opt(name){const i=args.indexOf('--'+name);if(i<0)return null;const v=args[i+1];args.splice(i,2);return v;}
const covers=(opt('covers')||'').split(',').filter(Boolean);
const titles=(opt('titles')||'').split('|');
const mapFile=opt('map');
const dir=resolve(args[0]||'docs/special');
const env=process.env,E=env.EDITOR_PW;
if(!env.PRIVATE_PW1||!env.PRIVATE_PW2||!env.PRIVATE_PW3||!E){console.error('Set PRIVATE_PW1, PRIVATE_PW2, PRIVATE_PW3 and EDITOR_PW in the environment first.');process.exit(1);}

/* the page normalizes what people type in exactly the same way */
const NORM={digits:v=>{const s=String(v).replace(/\s+/g,'');return /^\d+$/.test(s)?s.replace(/^0+/,''):s;},
  text:v=>String(v).normalize('NFD').replace(/[̀-ͯ]/g,'').trim().toLowerCase().replace(/\s+/g,' ')};

const vault=JSON.parse(readFileSync(join(dir,'vault.json'),'utf8'));
if(vault.v!==1){console.error('vault.json is already v'+vault.v+'; nothing to do.');process.exit(1);}
const ITER=vault.iter;
const p=[NORM.digits(env.PRIVATE_PW1),NORM.text(env.PRIVATE_PW2),NORM.text(env.PRIVATE_PW3)];
p.forEach((x,i)=>{if(pbkdf2Sync(x,Buffer.from(vault['s'+(i+1)],'base64'),ITER,32,'sha256').toString('hex')!==vault['v'+(i+1)]){console.error('Answer '+(i+1)+' does not match the current vault.');process.exit(1);}});
const CK=pbkdf2Sync(p.join('\u0000'),Buffer.from(vault.sk,'base64'),ITER,32,'sha256');

const seal=(key,buf)=>{const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key,iv);return Buffer.concat([iv,c.update(buf),c.final(),c.getAuthTag()]);};
const open=(key,buf)=>{const d=createDecipheriv('aes-256-gcm',key,buf.subarray(0,12));d.setAuthTag(buf.subarray(buf.length-16));return Buffer.concat([d.update(buf.subarray(12,buf.length-16)),d.final()]);};
const content=JSON.parse(open(CK,Buffer.from(vault.data,'base64')).toString('utf8'));

/* questions: the prompts and hints the page used to hard-code */
const Q=[{prompt:'',hint:'birthday',kind:'digits'},{prompt:'My Child’s Name',hint:'Its a Pokemon',kind:'text'},{prompt:'My Original Child',hint:'never had an actual name for it',kind:'text'}];
const secrets=Q.map(()=>randomBytes(32));
const wrapAnswer=(ans,secret)=>{const s=randomBytes(16),k=pbkdf2Sync(ans,s,ITER,32,'sha256');return {s:s.toString('base64'),d:seal(k,secret).toString('base64')};};
const q=Q.map((x,i)=>({prompt:x.prompt,hint:x.hint,kind:x.kind,w:[wrapAnswer(p[i],secrets[i])]}));
const KEK=createHash('sha256').update(Buffer.concat(secrets)).digest();
const es=randomBytes(16),EK=pbkdf2Sync(E,es,ITER,32,'sha256');

/* new media: the heart map and the book covers */
const MIME={'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.json':'application/json'};
function pack(file){
  const id=randomBytes(6).toString('hex'),buf=readFileSync(file);
  writeFileSync(join(dir,'media',id+'.enc'),seal(CK,buf));
  return {id,mime:MIME[extname(file).toLowerCase()]||'application/octet-stream'};
}

/* content v2 */
const item=it=>{const o=Object.assign({},it);if(o.poster&&typeof o.poster==='object')o.poster={id:o.poster.id,mime:o.poster.mime};return o;};
const c2={
  v:2,
  _secrets:secrets.map(b=>b.toString('base64')),
  look:{slideBg:'#8fb8e6',slideText:'#fffdf7',quoteSpeed:1},
  quotes:content.quotes||[],attribution:content.attribution||'— Me',
  slides:(content.slides||[]).map(s=>({title:s.title||'',items:(s.items||[]).map(item)})),
  montage:{items:(content.montage||[]).map(m=>({kind:'photo',id:m.id,mime:m.mime})),count:64,startMs:150,endMs:60,finale:null,holdMs:3000},
  folders:(content.folders||[]).map(f=>({name:f.name||'',title:(f.bubble||{}).title||'',items:((f.bubble||{}).items||[]).map(item)})),
  books:covers.map((f,i)=>({title:titles[i]||'',cover:pack(f),pages:[]})),
  map:mapFile&&existsSync(mapFile)?pack(mapFile):null
};
while(c2.folders.length<16)c2.folders.push({name:'',title:'',items:[]});

const v2={v:2,iter:ITER,q,
  kw:seal(KEK,CK).toString('base64'),
  ke:{s:es.toString('base64'),d:seal(EK,CK).toString('base64')},
  data:seal(CK,Buffer.from(JSON.stringify(c2))).toString('base64')};
writeFileSync(join(dir,'vault.json'),JSON.stringify(v2));
console.log('vault.json upgraded to v2:',q.length,'questions,',c2.slides.length,'slides,',c2.folders.length,'folders,',c2.books.length,'books, map',c2.map?'added':'none');
