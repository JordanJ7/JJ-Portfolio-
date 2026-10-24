#!/usr/bin/env node
/*
  RETIRED: the special site now uses vault v2 and is edited in the page editor (pencil on the first password page).
  This tool writes the old v1 format, which the page no longer reads, so it refuses to run.

  Builds the encrypted vault for the special site (site/special/).

  Usage (Node 18+):
    PRIVATE_PW1='...' PRIVATE_PW2='...' PRIVATE_PW3='...' node tools/build-private.mjs [sourceDir] [outDir]

  sourceDir (default: private-src)   content.json plus a media/ folder. Keep it OUT of git (it is in .gitignore).
  outDir    (default: site/special)  vault.json and media/*.enc are written here. These are safe to publish.

  Nothing readable is published: the content, the media and the folder names are all encrypted with a key
  made from ALL THREE passwords (PBKDF2-SHA256 plus AES-256-GCM). Passwords are read from the environment and are
  never written to disk.
*/
console.error('build-private.mjs is retired: edit the special site in its page editor instead (see README-v2.md).');process.exit(1);
import {readFileSync,writeFileSync,mkdirSync,rmSync,existsSync,statSync} from 'node:fs';
import {pbkdf2Sync,randomBytes,createCipheriv} from 'node:crypto';
import {join,extname,resolve} from 'node:path';

const src=resolve(process.argv[2]||'private-src');
const out=resolve(process.argv[3]||'site/special');
const pw1=process.env.PRIVATE_PW1,pw2=process.env.PRIVATE_PW2,pw3=process.env.PRIVATE_PW3;
if(!pw1||!pw2||!pw3){console.error('Set PRIVATE_PW1, PRIVATE_PW2 and PRIVATE_PW3 in the environment first.');process.exit(1);}
const ITER=Number(process.env.PRIVATE_ITER||250000);

/* the page normalizes what people type in exactly the same way */
const norm1=v=>{const s=String(v).replace(/\s+/g,'');return /^\d+$/.test(s)?s.replace(/^0+/,''):s;};
const norm2=v=>String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
const p1=norm1(pw1),p2=norm2(pw2),p3=norm2(pw3);
if(!p1||!p2||!p3){console.error('Passwords cannot be empty.');process.exit(1);}

const salt1=randomBytes(16),salt2=randomBytes(16),salt3=randomBytes(16),saltK=randomBytes(16);
const v1=pbkdf2Sync(p1,salt1,ITER,32,'sha256').toString('hex');
const v2=pbkdf2Sync(p2,salt2,ITER,32,'sha256').toString('hex');
const v3=pbkdf2Sync(p3,salt3,ITER,32,'sha256').toString('hex');
const key=pbkdf2Sync(p1+'\u0000'+p2+'\u0000'+p3,saltK,ITER,32,'sha256');
const seal=buf=>{const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key,iv);return Buffer.concat([iv,c.update(buf),c.final(),c.getAuthTag()]);};

const MIME={'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.gif':'image/gif','.avif':'image/avif','.mp4':'video/mp4','.m4v':'video/mp4','.webm':'video/webm','.mov':'video/quicktime'};
const content=JSON.parse(readFileSync(join(src,'content.json'),'utf8'));
rmSync(join(out,'media'),{recursive:true,force:true});
mkdirSync(join(out,'media'),{recursive:true});

const ids=new Map();let bytes=0;const warn=[];
function pack(file){
  if(ids.has(file))return ids.get(file);
  const p=join(src,'media',file);
  if(!existsSync(p))throw new Error('Missing media file: '+p);
  const mime=MIME[extname(file).toLowerCase()];
  if(!mime)throw new Error('Unsupported file type: '+file);
  const buf=readFileSync(p),id=randomBytes(6).toString('hex'),sealed=seal(buf);
  writeFileSync(join(out,'media',id+'.enc'),sealed);bytes+=sealed.length;
  if(buf.length>8e6)warn.push(file+' is '+(buf.length/1e6).toFixed(1)+' MB; consider compressing it (tools/optimize.sh)');
  const r={id,mime};ids.set(file,r);return r;
}
function fixItem(it){
  if(it.kind==='text')return it;
  if(!it.file)throw new Error('Item without a file: '+JSON.stringify(it).slice(0,80));
  const m=pack(it.file);it.id=m.id;it.mime=m.mime;delete it.file;
  if(typeof it.poster==='string')it.poster=pack(it.poster);
  return it;
}
(content.slides||[]).forEach(s=>(s.items||[]).forEach(fixItem));
(content.folders||[]).forEach(f=>((f.bubble||{}).items||[]).forEach(fixItem));
content.montage=(content.montage||[]).map(f=>typeof f==='string'?pack(f):f);

const vault={v:1,iter:ITER,s1:salt1.toString('base64'),s2:salt2.toString('base64'),s3:salt3.toString('base64'),sk:saltK.toString('base64'),v1,v2,v3,
  data:seal(Buffer.from(JSON.stringify(content))).toString('base64')};
writeFileSync(join(out,'vault.json'),JSON.stringify(vault));

console.log('Built',out);
console.log('  slides :',(content.slides||[]).length);
console.log('  folders:',(content.folders||[]).length,'of 16');
console.log('  media  :',ids.size,'files,',(bytes/1e6).toFixed(1),'MB encrypted');
(content.folders||[]).forEach((f,i)=>console.log('   folder',String(i+1).padStart(2),'=',f.name||'(unnamed)'));
warn.forEach(w=>console.warn('  warning:',w));
