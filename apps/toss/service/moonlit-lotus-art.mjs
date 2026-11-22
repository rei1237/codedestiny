import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const root=new URL('../../../public/assets/moonlit-lotus/',import.meta.url);
const prefix='/__lotus-art/';
const sourcePrefix='/assets/moonlit-lotus/';
const web='https://code-destiny.com'+sourcePrefix;
const originalTracks=fileURLToPath(new URL('../../../app/diary/_lib/meditation-tracks.ts',import.meta.url)).replaceAll('\\','/');
const localTracks='\0toss-lotus-preview-tracks';
const directories=['companions-rear-v1','companions-v2','zodiac-v1','unique-v1','photo-v1','views-v1','space-v1','stickers-v1','story-v1','yeoni/2d-v1','yeoni/2d-v2','yeoni/rear-v3'];

export async function listLotusArt(){
 const files=[];
 const walk=async dir=>{for(const entry of await readdir(new URL(dir+'/',root),{withFileTypes:true})){
  const name=dir+'/'+entry.name;
  if(entry.isDirectory())await walk(name);
  else if(/\.(webp|svg)$/.test(name)&&!name.endsWith('-1024.webp')&&!name.includes('/archive/'))files.push(name);
 }};
 for(const dir of directories)await walk(dir);
 return files.sort();
}
export async function lotusPreviewBytes(name){
 const path=fileURLToPath(new URL(name,root));
 if(name.endsWith('.svg'))return readFile(path);
 const scene=/^(views-v1|space-v1|story-v1)\//.test(name);
 const single=name.startsWith('photo-v1/')||name.includes('still');
 // Preserve sheet proportions and frame coordinates for each original drawing.
 const width=scene?352:single?120:224;
 return sharp(path).resize({width,withoutEnlargement:true}).webp({quality:45,alphaQuality:65,effort:4}).toBuffer();
}
export default function moonlitLotusArt(){
 let offline=false;
 const files=listLotusArt().then(names=>new Set(names));
 const cache=new Map();
 const bytes=name=>{if(!cache.has(name))cache.set(name,lotusPreviewBytes(name));return cache.get(name);};
 return {name:'moonlit-lotus-original-art',enforce:'pre',
  config(_config,env){offline=env.mode!=='production';},
  resolveId(id,importer){
   if(offline&&id.endsWith('/diary/_lib/meditation-tracks')&&importer?.replaceAll('\\','/').includes('/app/moonlit-lotus/'))return localTracks;
  },
  load(id){if(id===localTracks)return 'import {DIARY_MEDITATION_TRACKS as tracks} from '+JSON.stringify(originalTracks)+';export const DIARY_MEDITATION_TRACKS=tracks.map(t=>({...t,url:"/__room-art/sound.wav?lotus="+t.id}));';},
  transform(source,id){
   if(!id.replaceAll('\\','/').includes('/app/moonlit-lotus/'))return;
   let code=source.replace(/(?<!\/public)\/assets\/moonlit-lotus\//g,offline?prefix:web);
   if(id.replaceAll('\\','/').endsWith('/_lib/use-space-profile.ts')){
    const webPetFactory="import {petArtUrl} from '@/js/core/profile-pet.mjs';";
    if(!code.includes(webPetFactory))throw Error('Moonlit Lotus web pet source changed');
    code=code.replace(webPetFactory,"const petArtUrl=()=>{throw Error('WEB_PET_OWNER_UNAVAILABLE');};");
   }
   if(id.replaceAll('\\','/').endsWith('/_lib/private-store.ts'))code=code.replace("'cd-moonlit-private-v1'",JSON.stringify(offline?'toss-moonlit-private-mock-v1':'toss-moonlit-private-v1'));
   if(offline){
    code=code.replaceAll(prefix+'audio-v2/moktak-chant.mp3','/__room-art/sound.wav?lotus=moktak');
    if(id.replaceAll('\\','/').includes('/story/'))code=code.replaceAll('-1024.webp','-640.webp');
   }
   return code===source?undefined:code;
  },
  configureServer(server){
   if(!offline)return;
   server.middlewares.use(async(req,res,next)=>{
    const path=new URL(req.url,'http://localhost').pathname;
    if(!path.startsWith(prefix))return next();
    const name=path.slice(prefix.length);
    try{if(!(await files).has(name)){res.writeHead(404).end();return;}
     res.writeHead(200,{'content-type':name.endsWith('.svg')?'image/svg+xml':'image/webp'}).end(await bytes(name));
    }catch(error){next(error);}
   });
  },
  async generateBundle(){
   if(!offline)return;
   for(const file of await files)this.emitFile({type:'asset',fileName:prefix.slice(1)+file,source:await bytes(file)});
  },
 };
}
