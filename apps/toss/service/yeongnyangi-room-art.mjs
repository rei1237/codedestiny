import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const artRoot=new URL('../../../public/assets/yeongnyangi/',import.meta.url);
const scenes=JSON.parse(readFileSync(new URL('../../../app/yeongnyangi/_home/prologue-scenes.json',import.meta.url),'utf8'));
export const roomPreviews=new Map([
 ...scenes.map(scene=>['prologue/'+scene.id+'.webp',320]),
 ['original/room-780.webp',480],['original/hero-480.webp',240],['original/mascot-reactions.webp',512],
 ['original/neo-fish-curse.webp',180],...['coffee-sigh','shy','ponder'].map(name=>['moods/'+name+'.webp',180]),
]);
const offlinePrefix='/__room-art/';
const webPrefix='https://code-destiny.com/assets/yeongnyangi/';
// A quiet, short test tone exercises the real media element without fetching a paid track.
function soundPreview(){
 const pcm=Buffer.alloc(4000,128);
 for(let i=0;i<1000;i++)pcm[i]+=Math.round(16*Math.sin(i*2*Math.PI*330/8000)*Math.sin(i*Math.PI/1000));
 const header=Buffer.from('524946460000000057415645666d74201000000001000100401f0000401f0000010008006461746100000000','hex');
 header.writeUInt32LE(36+pcm.length,4);header.writeUInt32LE(pcm.length,40);
 return Buffer.concat([header,pcm]);
}
export async function roomPreview(name){
 const width=roomPreviews.get(name);
 if(!width)throw Error('Unknown room art: '+name);
 return sharp(fileURLToPath(new URL(name,artRoot))).resize({width,withoutEnlargement:true}).webp({quality:48,effort:5}).toBuffer();
}
export default function yeongnyangiRoomArt(){
 let offline=false;
 const cached=new Map();
 const preview=name=>{if(!cached.has(name))cached.set(name,roomPreview(name));return cached.get(name);};
 return {name:'yeongnyangi-room-original-art',enforce:'pre',
  config(_config,env){offline=env.mode!=='production';return {define:{__TOSS_ROOM_PREVIEW__:JSON.stringify(offline)}};},
  transform(source,id){
   const filename=id.split('?')[0].replaceAll('\\','/');
   if(filename.endsWith('/app/yeongnyangi/_home/prologue.module.css')){
    // The panel lettering is embedded in the original illustrations. Use a local UI font in the offline reader.
    return source.replace("url('/assets/yeongnyangi/prologue/Jua-Regular.ttf') format('truetype')",offline?'local("Malgun Gothic")':'url("'+webPrefix+'prologue/Jua-Regular.ttf") format("truetype")');
   }
   if(!['/_home/RoomPresence.tsx','/_home/RoomInteractions.tsx','/_home/StoryPanel.tsx','/_components/PetMascot.tsx'].some(suffix=>filename.endsWith('/app/yeongnyangi'+suffix)))return;
   let code=source.replaceAll('/assets/yeongnyangi/',offline?offlinePrefix:webPrefix);
   if(offline)code=code.replaceAll('room-1440','room-780').replaceAll('hero-800','hero-480');
   return code;
  },
  configureServer(server){
   if(!offline)return;
   server.middlewares.use(async(req,res,next)=>{
    const path=new URL(req.url,'http://localhost').pathname;
    if(!path.startsWith(offlinePrefix))return next();
    const name=path.slice(offlinePrefix.length);
    if(name==='sound.wav'){res.writeHead(200,{'content-type':'audio/wav'}).end(soundPreview());return;}
    if(!roomPreviews.has(name)){res.writeHead(404).end();return;}
    try{res.writeHead(200,{'content-type':'image/webp'}).end(await preview(name));}catch(error){next(error);}
   });
  },
  async generateBundle(){
   if(!offline)return;
   this.emitFile({type:'asset',fileName:offlinePrefix.slice(1)+'sound.wav',source:soundPreview()});
   for(const name of roomPreviews.keys())this.emitFile({type:'asset',fileName:offlinePrefix.slice(1)+name,source:await preview(name)});
  },
 };
}
