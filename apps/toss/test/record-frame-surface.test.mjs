import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'../../..');
const require=createRequire(path.join(root,'apps/toss/package.json'));
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),Module=require('node:module');
test('Toss record navigation stays within the app and the original web links remain available',async()=>{
 const src=path.join(root,'app/records/RecordFrame.tsx');
 const bundle=await build({entryPoints:[src],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'record-frame',setup(b){
  b.onResolve({filter:/^(lucide-react|@\/|\.\/records\.module\.css)/},args=>({path:args.path,namespace:'mock'}));
  b.onLoad({filter:/.*/,namespace:'mock'},({path:p})=>({contents:p==='lucide-react'?`export const Archive=()=>null,ArrowLeft=()=>null,MessageCircleHeart=()=>null;`:p==='@/lib/i18n/useT'?`export const useLocale=()=> 'ko';`:p==='@/lib/records/copy'?`export const recordsCopy=()=>({back:'보관함',home:'홈',hub:'상담',title:'기록'});`:`export default {};`}));
 }}]});
 const loaded=new Module(src+'.cjs');loaded.paths=Module._nodeModulePaths(path.join(root,'apps/toss'));loaded._compile(bundle.outputFiles[0].text,loaded.id);
 const render=(view,paymentSurface)=>renderToStaticMarkup(React.createElement(loaded.exports.default,{title:'테스트',view,paymentSurface},'내용'));
 const result=render('result','toss'),library=render('library','toss');
 assert.match(result,/href="\/records\/"/);assert.match(result,/href="\/"/);assert.doesNotMatch(result,/\/consultations\/|\/ggulggul\//);
 assert.match(library,/href="\/"/);assert.doesNotMatch(library,/\/consultations\/|\/ggulggul\//);
 assert.match(render('result','web'),/href="\/consultations\/"/);assert.match(render('library','web'),/href="\/ggulggul\/"/);
});
