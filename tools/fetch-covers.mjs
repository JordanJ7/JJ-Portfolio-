#!/usr/bin/env node
/*
  Downloads cover art for the Culture Log into site/assets/covers/ and writes site/js/covers.js.
  Run it on your own computer (it needs internet access):

    TMDB_KEY=your_free_tmdb_api_key node tools/fetch-covers.mjs            # everything
    TMDB_KEY=... node tools/fetch-covers.mjs --only=movies --limit=100    # just movies, first 100
    node tools/fetch-covers.mjs --only=games                               # games and music need no key

  Sources
    movies and TV : The Movie Database (needs a free key from themoviedb.org/settings/api)
    games         : Steam store artwork (no key). Console-only games are skipped and listed at the end.
    albums, songs : iTunes Search API (no key)
  Files are saved locally (self-hosted), and the script can be re-run: it skips anything already downloaded.
  NOTE: this script was written without being able to reach those services from the build environment, so
  run it once with --limit=10 first and check site/assets/covers/ before running it on everything.
*/
import {writeFileSync,mkdirSync,existsSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const root=resolve(new URL('..',import.meta.url).pathname);
const outDir=join(root,'site/assets/covers'),outJs=join(root,'site/js/covers.js');
const args=Object.fromEntries(process.argv.slice(2).filter(a=>a.startsWith('--')).map(a=>{const [k,v]=a.slice(2).split('=');return [k,v??true];}));
const only=args.only||'all',limit=Number(args.limit||1e9),TMDB=process.env.TMDB_KEY;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const slug=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);
mkdirSync(outDir,{recursive:true});

const {WATCH,STEAM,MUSIC}=await import(pathToFileURL(join(root,'site/js/data.js')).href);
let covers={};
if(existsSync(outJs)){try{covers=JSON.parse(readFileSync(outJs,'utf8').replace(/^[^{]*/,'').replace(/;?\s*$/,''));}catch{}}
const skipped=[];let done=0;

async function save(key,url){
  const file=slug(key)+'.jpg',path=join(outDir,file);
  if(!existsSync(path)){
    const r=await fetch(url);if(!r.ok)throw new Error('HTTP '+r.status+' '+url);
    writeFileSync(path,Buffer.from(await r.arrayBuffer()));await sleep(150);
  }
  covers[key]='assets/covers/'+file;done++;
}
const json=async u=>{const r=await fetch(u);if(!r.ok)throw new Error('HTTP '+r.status);return r.json();};
const norm=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

/* movies and TV */
async function tmdb(kind,title){
  const j=await json(`https://api.themoviedb.org/3/search/${kind==='tv'?'tv':'movie'}?query=${encodeURIComponent(title)}&api_key=${TMDB}`);
  const hit=(j.results||[]).find(r=>r.poster_path&&norm(r.title||r.name||'')===norm(title))||(j.results||[]).find(r=>r.poster_path);
  return hit?'https://image.tmdb.org/t/p/w342'+hit.poster_path:null;
}
if(only==='all'||only==='movies'||only==='tv'){
  if(!TMDB)console.warn('TMDB_KEY not set: skipping movies and TV.');
  else{
    const items=[];
    for(const k of Object.keys(WATCH))for(const s of WATCH[k].split('|')){const tv=s[0]==='~';items.push([tv?'tv':'movie',tv?s.slice(1):s]);}
    for(const [t,title] of items){
      if(only==='movies'&&t!=='movie')continue;if(only==='tv'&&t!=='tv')continue;
      if(done>=limit)break;
      const key=t+':'+title.toLowerCase();if(covers[key]&&existsSync(join(root,'site',covers[key])))continue;
      try{const u=await tmdb(t,title);if(u)await save(key,u);else skipped.push(key);}catch(e){skipped.push(key+' ('+e.message+')');}
    }
  }
}
/* games from Steam */
if(only==='all'||only==='games'){
  for(const g of STEAM){
    if(done>=limit)break;const title=g[0],key='game:'+title.toLowerCase();if(covers[key]&&existsSync(join(root,'site',covers[key])))continue;
    try{
      const j=await json(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&cc=us&l=en`);
      const hit=(j.items||[]).find(i=>norm(i.name)===norm(title))||(j.items||[])[0];
      if(!hit){skipped.push(key);continue;}
      await save(key,`https://cdn.cloudflare.steamstatic.com/steam/apps/${hit.id}/library_600x900.jpg`).catch(()=>save(key,`https://cdn.cloudflare.steamstatic.com/steam/apps/${hit.id}/header.jpg`));
    }catch(e){skipped.push(key+' ('+e.message+')');}
  }
}
/* albums and songs from iTunes */
if(only==='all'||only==='music'){
  const seen=new Set();
  for(const y of Object.keys(MUSIC.years)){
    for(const [kind,str] of [['album',MUSIC.years[y].l],['song',MUSIC.years[y].s]]){
      for(const row of (str?str.split(';'):[])){
        if(done>=limit)break;
        const [name,artist]=row.split('|');const key=kind+':'+(name+'|'+artist).toLowerCase();
        if(seen.has(key)||(covers[key]&&existsSync(join(root,'site',covers[key]))))continue;seen.add(key);
        try{
          const j=await json(`https://itunes.apple.com/search?term=${encodeURIComponent(name+' '+artist.split(/[,&]/)[0])}&entity=${kind==='album'?'album':'song'}&limit=3`);
          const hit=(j.results||[])[0];
          if(hit&&hit.artworkUrl100)await save(key,hit.artworkUrl100.replace('100x100bb','300x300bb'));else skipped.push(key);
          await sleep(300);
        }catch(e){skipped.push(key+' ('+e.message+')');}
      }
    }
  }
}
writeFileSync(outJs,'/* generated by tools/fetch-covers.mjs */\nwindow.COVERS='+JSON.stringify(covers,null,0)+';\n');
console.log('Saved',done,'new covers. Total mapped:',Object.keys(covers).length);
if(skipped.length){console.log('No cover found for',skipped.length,'items (they keep the letter tile). First few:');skipped.slice(0,12).forEach(s=>console.log('  ',s));}
