import {publicStreamList} from '../../canonical/music-shelf';
import type {Plugin} from 'vite';

// Local-only PCM silence exercises the WebView audio element without contacting the production music CDN.
const url='/test/offline/music-sample.wav';
function silence(){
  const rate=8000,samples=rate*3,bytes=Buffer.alloc(44+samples,128);
  bytes.write('RIFF');bytes.writeUInt32LE(36+samples,4);bytes.write('WAVEfmt ',8);
  bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);
  bytes.writeUInt32LE(rate,24);bytes.writeUInt32LE(rate,28);bytes.writeUInt16LE(1,32);bytes.writeUInt16LE(8,34);
  bytes.write('data',36);bytes.writeUInt32LE(samples,40);
  return bytes;
}
export default function offlineMusic():Plugin{
  return {name:'offline-music-fixture',enforce:'pre',apply:'serve',
    resolveId(id){if(id==='virtual:toss-music-shelf')return '\0offline-music-shelf';},
    load(id){if(id==='\0offline-music-shelf')return 'export default '+JSON.stringify(publicStreamList().map(t=>({...t,stream:url})));},
    configureServer(server){
      server.middlewares.use(url,(_req,res)=>{res.setHeader('Content-Type','audio/wav');res.setHeader('Cache-Control','no-store');res.end(silence());});
    }};
}
