import {readFile,readdir,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,sep,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {extractOmikujiEngine} from './omikuji-engine-loader.mjs';
const publicRoot=fileURLToPath(new URL('../../../public/',import.meta.url)).replace(/[\\/]$/,'');
const shim=fileURLToPath(new URL('../canonical/next.jsx',import.meta.url)).replaceAll('\\','/');
const defaults={'next/image':'Image','next/link':'Link','next/dynamic':'dynamic'};
const asset=/["'`(\s,](\/(?:assets|images|icons|neo-operation-room|fuctionassets\/omikuji-charms)\/[^"'`)\s,]*)(?=["'`)\s,])/g;
const mime={'.webp':'image/webp','.avif':'image/avif','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg','.json':'application/json'};

// The same font bytes already exist in the original artwork tree. Resolve by
// content hash, preserving font family, weight and unicode ranges exactly.
export function localBrandFonts(){
 let fonts;
 async function localFiles(){
  if(!fonts)fonts=(async()=>{
   const folder=resolve(publicRoot,'assets/yeongnyangi/fonts'),map=new Map();
   for(const file of await readdir(folder))if(file.endsWith('.woff2'))map.set(createHash('sha256').update(await readFile(resolve(folder,file))).digest('hex').slice(0,12),'/assets/yeongnyangi/fonts/'+file);
   return map;
  })();
  return fonts;
 }
 return {postcssPlugin:'toss-local-brand-fonts',async Declaration(decl){
  if(decl.prop==='src'&&decl.value.includes('https://assets.code-destiny.com/Mulmaru.woff2')){
   decl.value=decl.value.replace('https://assets.code-destiny.com/Mulmaru.woff2','/fonts/Mulmaru.woff2');return;
  }
  if(decl.prop!=='src'||!decl.value.includes('https://assets.code-destiny.com/fonts/serif-'))return;
  const map=await localFiles();
  decl.value=decl.value.replace(/https:\/\/assets\.code-destiny\.com\/fonts\/(serif-(?:kr|latin))\/([a-f0-9]+)\.woff2/g,(_url,family,hash)=>{
   if(family==='serif-latin')return '/fonts/'+family+'/'+hash+'.woff2';
   const file=map.get(hash);if(!file)throw new Error('Original font missing: '+hash);return file;
  });
 }};
}

// yeongnyangiCardArt requests the original 600px `std` artwork. The WebP
// fallback is supported independently of AVIF and retains every card.
// The Worker and web site's manifest are never modified.
export function screenDeckManifest(manifest){
 const screen=card=>{const {files,avifFiles,integrity,sourceContentHash,...metadata}=card;return {...metadata,files:{std:files.std},avifFiles:{}};};
 return {...manifest,cards:manifest.cards.map(screen),back:screen(manifest.back)};
}

// The sample renderer only compares its own visual paths and the tea artwork.
// Keep their original records, while leaving the shared web registry untouched.
export function sampleIntroductionArt(registry,samples){
 if(!registry['fortune-tea-house'])throw new Error('Tea sample artwork missing');
 const visuals=new Set(samples.map(sample=>sample.visual));
 return Object.fromEntries(Object.entries(registry).filter(([id,art])=>id==='fortune-tea-house'||visuals.has(art.image)));
}
export function responsiveIntroductionArt(registry,samples){
 const visuals=new Set(Object.values(registry).map(art=>art.image)),refs=new Set();
 for(const sample of samples){if(!visuals.has(sample.visual))continue;const widths=sample.visual===registry['fortune-tea-house']?.image?[320,480,640,960]:[320,640,960];for(const width of widths)refs.add(sample.visual.replace(/\.webp$/,`-${width}.webp`));}
 const ziwei=registry['ziwei-ai']?.cardImage;
 if(typeof ziwei!=='string'||!ziwei.endsWith('-320.webp'))throw new Error('Ziwei responsive artwork missing');
 for(const width of [320,480,640,960])refs.add(ziwei.replace('-320.webp',`-${width}.webp`));
 return [...refs];
}
export function isTea640Reference(ref){return /^\/images\/service-introductions\/tea-\$\{[^}]+\}-640\.webp$/.test(ref);}
export function isYeongnyangi640Reference(ref){return /^\/images\/service-introductions\/yeongnyangi-\$\{[^}\r\n]+\}-640\.webp(?=[`"'])/.test(ref);}

export default function serviceCompat(){
 const references=new Set();
 return {name:'canonical-service-runtime',enforce:'pre',
  transform(code,id){
   if(id.includes('node_modules'))return;
   if(id.replaceAll('\\','/').endsWith('/assets/yeongnyangi/tarot/v1/manifest.json'))return JSON.stringify(screenDeckManifest(JSON.parse(code)));
   if(/\.[jt]sx?(?:\?|$)/.test(id))code=code.replace(/process\.env\.NEXT_PUBLIC_EFFECTIVE_API_BASE_URL\b/g,JSON.stringify('https://code-destiny.com')).replace(/process\.env\.(?!NODE_ENV\b)[A-Z][A-Z_0-9]*/g,'undefined');
   if(id.replaceAll('\\','/').includes('/js/core/')&&code.includes('module.exports = api')){const name=code.match(/(?:globalThis|root)\.([\w]+) = api;/)?.[1];if(name)code+='\nexport default globalThis.'+name+';';}
   return code;
  },
  resolveId(id,importer){
   if(id==='virtual:omikuji-engine')return '\0toss-omikuji-engine';
   if(id.endsWith('/service-introduction-art.json')&&importer){
    const from=importer.split('?')[0].replaceAll('\\','/');
    if(from.endsWith('/lib/marketing/render-result-samples.mjs'))return '\0toss-sample-intro-art';
    if(from.endsWith('/app/ziwei-ai/ZiweiAiClient.tsx'))return '\0toss-ziwei-intro-art';
   }
   const sourceId=id.startsWith('.')&&importer?resolve(dirname(importer.split('?')[0]),id):id;
   const normalized=sourceId.replaceAll('\\','/');
   if(/\/app\/components\/ReviewRewardBanner(?:\.[jt]sx)?$/.test(normalized))return fileURLToPath(new URL('./WebReviewReward.jsx',import.meta.url));
   if(/\/app\/components\/recommendations\/RecommendationResult(?:\.[jt]sx)?$/.test(normalized))return fileURLToPath(new URL('./WebOnlyRecommendations.jsx',import.meta.url));
   if(/\/app\/(?:components\/activation\/ResultBenefits|yeongnyangi\/_components\/ResultSharing)(?:\.[jt]sx)?$/.test(normalized))return fileURLToPath(new URL('./WebReviewReward.jsx',import.meta.url));
   if(/\/components\/fortune\/ConsultationShare(?:\.[jt]sx)?$/.test(normalized))return fileURLToPath(new URL('./WebReviewReward.jsx',import.meta.url));
   if(/\/components\/fortune\/SavedRecordLink(?:\.[jt]sx)?$/.test(normalized))return fileURLToPath(new URL('./SavedRecordLink.jsx',import.meta.url));
   if(normalized.endsWith('/app/hooks/usePayment'))return fileURLToPath(new URL('./payment-state.jsx',import.meta.url));
   if(/\/app\/_lib\/auth-client(?:\.[jt]s)?$/.test(normalized)&&!importer?.split('?')[0].replaceAll('\\','/').endsWith('/apps/toss/service/auth-client.jsx'))return fileURLToPath(new URL('./auth-client.jsx',import.meta.url));
   if(normalized.endsWith('/app/_lib/billing-client'))return fileURLToPath(new URL('./billing.jsx',import.meta.url));
   if(id.replaceAll('\\','/').endsWith('/app/checkout/CheckoutClient'))return fileURLToPath(new URL('./Checkout.jsx',import.meta.url));
   if(id==='next/navigation'||defaults[id])return '\0toss-service:'+id;
  },
  async load(id){if(id==='\0toss-omikuji-engine'){const source=resolve(publicRoot,'emoi_omikuji_v2.html');this.addWatchFile(source);return extractOmikujiEngine(await readFile(source,'utf8'));}if(id==='\0toss-sample-intro-art'||id==='\0toss-ziwei-intro-art'){const registry=JSON.parse(await readFile(resolve(publicRoot,'../lib/marketing/service-introduction-art.json'),'utf8'));if(id==='\0toss-ziwei-intro-art'){if(!registry['ziwei-ai'])throw new Error('Ziwei artwork missing');return `export default ${JSON.stringify({'ziwei-ai':registry['ziwei-ai']})};`;}const samples=JSON.parse(await readFile(resolve(publicRoot,'../lib/marketing/result-samples.json'),'utf8'));return `export default ${JSON.stringify(sampleIntroductionArt(registry,samples))};`;}if(!id.startsWith('\0toss-service:'))return;const name=id.slice('\0toss-service:'.length);return defaults[name]?`export {${defaults[name]} as default} from ${JSON.stringify(shim)};`:`export {useRouter,usePathname,useSearchParams} from ${JSON.stringify(shim)};`;},
  configureServer(server){server.middlewares.use(async(req,res,next)=>{
   let path;try{path=resolve(publicRoot,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{return next();}
   if(!path.startsWith(publicRoot+sep)||!mime[extname(path)])return next();
   try{const bytes=await readFile(path);res.setHeader('Content-Type',mime[extname(path)]);res.end(bytes);}catch{next();}
  });},
  async generateBundle(_options,bundle){
   let tea640=false,yeongnyangi640=false;
   // Inspect the emitted chunks, not every imported module before tree shaking.
   // Otherwise dead catalog entries and navigation URLs copy whole art archives.
   for(const entry of Object.values(bundle)){
    const source=entry.type==='chunk'?entry.code:entry.fileName.endsWith('.css')?String(entry.source):'';
    if(source.includes('/fuctionassets/saju-relationship-temptation-768.webp'))references.add('/fuctionassets/saju-relationship-temptation-768.webp');
    for(const match of source.matchAll(asset)){const ref=match[1];if(isTea640Reference(ref)){tea640=true;continue;}if(ref.startsWith('/images/service-introductions/yeongnyangi-${')&&isYeongnyangi640Reference(source.slice(match.index+match[0].indexOf(ref),match.index+512))){yeongnyangi640=true;continue;}const prefix=ref.split('${')[0];if(prefix.length>8&&prefix!=='/neo-operation-room/')references.add(prefix);}
   }
   if(tea640)for(const file of await readdir(resolve(publicRoot,'images/service-introductions')))if(/^tea-.+-640\.webp$/.test(file))references.add('/images/service-introductions/'+file);
   if(yeongnyangi640)for(const file of await readdir(resolve(publicRoot,'images/service-introductions')))if(/^yeongnyangi-.+-640\.webp$/.test(file))references.add('/images/service-introductions/'+file);
   // The relationship report uses five scene records from the shared web
   // compatibility registry; the other compatibility flows are not in this shell.
   if(references.delete('/images/compat-story/'))for(const id of ['love','month','past-knot','day','hour'])references.add('/images/compat-story/'+id+'.webp');
   const artwork=JSON.parse(await readFile(resolve(publicRoot,'../lib/marketing/service-introduction-art.json'),'utf8'));
   const samples=JSON.parse(await readFile(resolve(publicRoot,'../lib/marketing/result-samples.json'),'utf8'));
   for(const ref of responsiveIntroductionArt(artwork,samples))references.add(ref);
   // The PDF exporter constructs one of the canonical cover filenames. Do not
   // mistake that expression for a request to package every service's artwork.
   if(references.delete('/images/service-introductions/')){
    const themes=await readFile(resolve(publicRoot,'../lib/pdf/report-cover-theme.ts'),'utf8');
    for(const match of themes.matchAll(/artwork:\s*'([^']+)'/g))references.add('/images/service-introductions/'+match[1]+'-960.webp');
   }
   // Original product disclosures fetch their authored manifest after opening.
   const catalogue=JSON.parse(await readFile(resolve(publicRoot,'../content/product-details/catalog.json'),'utf8'));
   const ids=new Set(Object.entries(catalogue.products).filter(([key])=>key.startsWith('fortune-tea-house-')||key==='neo-operation-room-consultation'||key==='fusion-fortune-consultation'||key==='love-secret-ai-consultation'||key==='life-book-ai-consultation'||key==='life-fortune-ai-consultation').map(([,id])=>id));
   for(const id of ids){
    const ref='/feature-details/crafted/'+id+'/manifest.json';
    const source=await readFile(resolve(publicRoot,'.'+ref),'utf8');
    references.add(ref);
    for(const match of source.matchAll(asset))references.add(match[1]);
   }
   const emitted=new Set();
   const collect=async(folder,prefix)=>{
    for(const entry of await readdir(folder,{withFileTypes:true})){
     const path=resolve(folder,entry.name);
     if(entry.isDirectory()){if(path.startsWith(prefix)||prefix.startsWith(path+sep))await collect(path,prefix);}
     else if(path.startsWith(prefix)&&mime[extname(path)]&&!emitted.has(path)){
      emitted.add(path);this.emitFile({type:'asset',fileName:path.slice(publicRoot.length+1).replaceAll('\\','/'),source:await readFile(path)});
     }
    }
   };
   for(const ref of references){
    const path=resolve(publicRoot,'.'+ref);
    if(!path.startsWith(publicRoot+sep))continue;
    let info;try{info=await stat(path);}catch{/* Dynamic filename prefix. */}
    if(info?.isFile()){if(!emitted.has(path)){emitted.add(path);this.emitFile({type:'asset',fileName:ref.slice(1),source:await readFile(path)});}continue;}
    const folder=info?.isDirectory()?path:dirname(path);
    try{await collect(folder,path);}catch(error){if(error.code!=='ENOENT')throw error;}
   }
  },
 };
}
