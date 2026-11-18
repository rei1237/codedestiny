import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),Module=require('node:module');
const load=async(contents,plugins=[])=>{
 const built=await build({stdin:{contents,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent',plugins,
  define:{'process.env.NEXT_PUBLIC_ASSETS_BASE_URL':'"https://assets.test"'}});
 const mod=new Module('pdf-export.cjs');mod.paths=Module._nodeModulePaths(process.cwd());mod._compile(built.outputFiles[0].text,'pdf-export.cjs');return mod.exports;
};
// Fonts and artwork need a browser (R2 fetch, canvas); the stubs record what the export asks for and keep the rest real.
const calls=[];
const browserStubs={name:'browser-stubs',setup(b){
 b.onResolve({filter:/^\.\/(export-result-pdf|report-art)$/},args=>({path:args.path.slice(2),namespace:'stub'}));
 b.onLoad({filter:/.*/,namespace:'stub'},args=>({loader:'js',contents:args.path==='report-art'?'export const loadYeongnyangiArt=async()=>[];':
  'export const prefetchPdfFonts=keys=>{globalThis.__pdfCalls.push(["prefetch",keys])};export const registerPdfFontsSafely=async(pdf,opts)=>{globalThis.__pdfCalls.push(["register",opts]);return {title:"helvetica",body:"helvetica"}};'}));
}};
globalThis.__pdfCalls=calls;
const m=await load("export * from './lib/pdf/export-yeongnyangi-report-pdf';",[browserStubs]);
const fonts=await load("export {registerPdfFontsSafely} from './lib/pdf/export-result-pdf';");
const row=n=>({createdAt:'2026-11-18T01:00:00.000Z',product:{name:'Omakase reading',readingKind:'fusion'},consultation:{question:'What next?'},
 manifest:Array.from({length:n},(_,i)=>({id:'c'+i,title:'Chapter '+(i+1),part:'Part '+(1+(i>>2))})),
 chapters:Array.from({length:n},(_,i)=>({chapterId:'c'+i,title:'Chapter '+(i+1),summary:'Summary '+i,blocks:[{id:'b',title:'Flow',paragraphs:['Body text for chapter '+(i+1)+'. '.repeat(1).padEnd(600,'x ')]}]}))});

test('the book is compressed, set in the body font only, and returns its pages and bytes without a second render',async()=>{
 calls.length=0;const progress=[];
 const result=await m.exportYeongnyangiReportPdf({row:row(12),fileName:'t.pdf',save:false,onProgress:(phase,p)=>progress.push([phase,p])});
 assert.deepEqual(calls.find(c=>c[0]==='register')[1],{only:['body']});
 assert.deepEqual(calls.find(c=>c[0]==='prefetch')[1],['body']);
 assert.ok(result.pages>12,'every chapter starts a page after the cover and contents');
 assert.equal(result.bytes,result.blob.size);
 const raw=Buffer.from(await result.blob.arrayBuffer()).toString('latin1');
 assert.match(raw,/^%PDF-/);assert.match(raw,/\/FlateDecode/);
 // Progress counts chapters, rises one by one and finishes before saving.
 const counted=progress.filter(([phase,p])=>phase==='typesetting'&&p?.total).map(([,p])=>p);
 assert.ok(counted.length>=12);assert.equal(counted.at(-1).done,counted.at(-1).total);
 assert.ok(counted.every((p,i)=>p.done===i+1));
 assert.deepEqual([progress[0][0],progress.at(-1)[0]],['preparing','saving']);
});

test('only the requested font files are downloaded, while other PDF features keep both',async()=>{
 const seen=[];const original=globalThis.fetch;
 globalThis.fetch=async url=>{seen.push(String(url).split('/').pop());return {ok:false,arrayBuffer:async()=>new ArrayBuffer(0)};};
 const warn=console.warn;console.warn=()=>{};
 try{
  assert.equal(await fonts.registerPdfFontsSafely({},{only:['body']}),null);
  assert.deepEqual(seen,['Paperlogy-5Medium.ttf']);
  seen.length=0;assert.equal(await fonts.registerPdfFontsSafely({}),null);
  assert.deepEqual(seen.sort(),['Mulmaru.ttf','Paperlogy-5Medium.ttf']);
  // A failed download is not cached: the next save asks again.
  seen.length=0;await fonts.registerPdfFontsSafely({},{only:['body']});assert.deepEqual(seen,['Paperlogy-5Medium.ttf']);
 }finally{globalThis.fetch=original;console.warn=warn;}
});
