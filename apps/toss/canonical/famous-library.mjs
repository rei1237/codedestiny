import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
import {publishedReadings} from './famous-archive.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
// Run the web's deterministic calculators at packaging time, never in a Worker
// or against the production database. Publication stays with the source registry.
export async function famousLibrary(){
 const result=await build({stdin:{contents:`
 import {getFamousArchive} from './lib/famous-saju/archive';
 import {getCelebritySajuPage,getCelebrityRelatedList} from './lib/famous-saju/celebrity-saju-service';
 import {getCelebrityEditorial} from './lib/famous-saju/celebrity-editorial';
 import {buildCelebrityMultiSystem} from './lib/famous-saju/celebrity-multi-system';
 import {getPublicProfile} from './lib/famous-saju/public-profiles';
 import {ILJU} from './lib/famous-saju/cycle';
 import {getIljuReading} from './lib/famous-saju/ilju-reading';
 export async function collect(){
  const people=getFamousArchive();const readings={};
  for(const person of people){const source=getCelebritySajuPage(person.slug);if(!source)continue;
   const {celebrity,magazine}=source,profile=getPublicProfile(person.slug);
   readings[person.slug]={magazine,related:getCelebrityRelatedList(celebrity).map(({slug,nameKo,category})=>({slug,nameKo,category})),comparisonSlug:profile?.comparisonSlug||null,editorial:getCelebrityEditorial(person.slug),multiSystem:await buildCelebrityMultiSystem({birthDate:celebrity.birthDate||'',birthTime:celebrity.birthTime,country:profile?.birthCountry||celebrity.country,magazine})};
  }
  return {people,readings,ilju:ILJU.map(item=>getIljuReading(item.name))};
 }`,resolveDir:root,loader:'ts'},bundle:true,write:false,define:{'process.cwd':'tossFamousBuildRoot'},banner:{js:'const tossFamousBuildRoot=()=>'+JSON.stringify(root)+';'},platform:'node',format:'cjs',external:['*.wasm'],logLevel:'silent'});
 const compiled={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(createRequire(new URL('../../../package.json',import.meta.url)),compiled,compiled.exports);
 return {...await compiled.exports.collect(),approved:publishedReadings()};
}
export default function famousLibraryAsset(){
 const key='virtual:toss-famous-library',file='assets/famous-library.json.gz';let pending;
 const packed=()=>pending||=(famousLibrary().then(data=>gzipSync(JSON.stringify(data),{level:9})));
 return {name:'toss-famous-library',resolveId(id){if(id===key)return '\0'+key;},load(id){if(id==='\0'+key)return 'export default '+JSON.stringify('/'+file);},
 configureServer(server){server.middlewares.use(async(req,res,next)=>{if(req.url?.split('?')[0]!=='/'+file)return next();try{res.setHeader('Content-Type','application/octet-stream');res.end(await packed());}catch(error){next(error);}});},
 async generateBundle(){this.emitFile({type:'asset',fileName:file,source:await packed()});}};
}
