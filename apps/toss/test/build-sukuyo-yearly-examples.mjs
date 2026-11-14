// Rebuild only explicit synthetic examples; never calls an LLM, DB, or remote ephemeris.
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {basename,resolve} from 'node:path';
const directory=resolve('public/js/vendor/sweph-wasm/ephe');
const server=createServer(async(req,res)=>{try{const name=basename(new URL(req.url,'http://localhost').pathname);res.end(await readFile(resolve(directory,name)));}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
process.env.SWISS_EPHEMERIS_FILES_BASE_URL='http://127.0.0.1:'+server.address().port+'/';
try{
 const {buildSukuyoYearlyFortuneResultV2:build}=await import('../../../worker/lib/sukuyo-yearly.js');
 const profile={profileId:'mock-profile',name:'테스트 프로필',gender:'F',birth:{year:1990,month:1,day:1,timeUnknown:true,calType:'solar'}};
 const examples={};for(const person of ['A','B'])for(const year of [2026,2027])examples[person+'-'+year]=await build({auth:{userId:'private-simulation-person-'+person},profile,targetYear:year});
 await writeFile(new URL('../private-simulation/sukuyo-yearly-examples.json',import.meta.url),JSON.stringify(examples));
}finally{server.close();}
