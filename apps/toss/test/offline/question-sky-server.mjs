import {build} from 'esbuild';
import path from 'node:path';
import {createRequire,Module} from 'node:module';
import {fileURLToPath} from 'node:url';

const entry=fileURLToPath(new URL('./question-sky-engine.ts',import.meta.url));
const root=path.resolve(path.dirname(entry),'../../../..');
// Swiss loads local ephemeris files relative to cwd. Mock network guard also
// rejects external requests. Only this disposable child uses the repo cwd.
import {fork} from 'node:child_process';
async function runEngine(){
 const guard=createRequire(import.meta.url);
 guard(path.join(root,'scripts/lib/mock-network-guard.cjs'));
 const {outputFiles}=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'cjs',loader:{'.wasm':'binary'}});
 const mod=new Module(path.join(root,'question-sky-fixture.cjs'));mod.paths=Module._nodeModulePaths(root);mod._compile(outputFiles[0].text,mod.id);
 process.on('message',async({id,kind,input})=>{
  try{process.send({id,status:200,data:await mod.exports.calculate(kind,input)});}
  catch(e){process.send({id,status:e.status||400,data:{error:e.code||'QUESTION_CALCULATION_UNAVAILABLE'}});}
 });
 process.send('ready');
}
if(process.env.TOSS_LOCAL_SKY_CHILD==='true')await runEngine();

export default function questionSkyServer(){
 let engine,sequence=0,pending=new Map();
 return {name:'loopback-question-sky',configureServer(server){
  function ensureEngine(){
   if(engine)return engine;
   const proc=fork(path.join(path.dirname(entry),'question-sky-server.mjs'),[],{cwd:root,execArgv:[],env:{...process.env,TOSS_LOCAL_SKY_CHILD:'true'},stdio:['ignore','ignore','inherit','ipc']});
   const ready=new Promise((resolve,reject)=>{
    proc.on('error',reject);
    proc.on('exit',()=>{reject(Error('Fixture stopped'));for(const rejectRequest of pending.values())rejectRequest({status:503,data:{error:'FIXTURE_STOPPED'}});pending.clear();engine=null;});
    proc.on('message',message=>{if(message==='ready'){resolve();return;}pending.get(message.id)?.(message);pending.delete(message.id);});
   });
   engine={proc,ready};return engine;
  }
  server.httpServer?.on('close',()=>engine?.proc.kill());
  server.middlewares.use('/__offline_question_sky',async(req,res)=>{
   try{
    const kind=req.url?.slice(1);
    if(req.method!=='POST'||!['prashna','horary'].includes(kind)){res.statusCode=404;res.end();return;}
    let input='';for await(const chunk of req){input+=chunk;if(input.length>12000)throw Error('INPUT_TOO_LARGE');}
    const parsed=JSON.parse(input),{proc,ready}=ensureEngine();await ready;
    const id=++sequence;
    const message=await new Promise(resolve=>{pending.set(id,resolve);proc.send({id,kind,input:parsed});});
    res.statusCode=message.status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(message.data));
   }catch{res.statusCode=503;res.end(JSON.stringify({error:'FIXTURE_UNAVAILABLE'}));}
  });
 }};
}
