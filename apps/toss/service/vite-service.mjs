import {COMPAT_ART} from '../../../js/saju-compat-art.mjs';
import {islandArtwork,islandDocument} from './island-loader.mjs';
import {secretHouseDocument} from './secret-house-loader.mjs';
import {extractRpgEngine} from './rpg-loader.mjs';
import {extractVillainBindings} from './section-bindings-loader.mjs';
import {extractIfaEngine} from './ifa-engine-loader.mjs';
import {readFile,readdir,stat} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,dirname,sep,extname} from 'node:path';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {extractOmikujiEngine} from './omikuji-engine-loader.mjs';
import {TOSS_WEBP_ART} from './bundle-art.mjs';
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
 // The Toss card renderer draws the card or its back; it never requests the standalone frame artwork.
 const {frame,...deck}=manifest;
 return {...deck,cards:manifest.cards.map(screen),back:screen(manifest.back)};
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
 const references=new Set(['/fuctionassets/rune.webp']);
 return {name:'canonical-service-runtime',enforce:'pre',
  transform(code,id){
   if(id.includes('node_modules'))return;
   if(id.replaceAll('\\','/').endsWith('/app/neo-consultation/NeoConsultationClient.tsx'))code=code.replace(/["'](\/(?:assets|images)\/[^"']+\.webp)["']/g,'"https://code-destiny.com$1"');
   if(id.replaceAll('\\','/').endsWith('/app/palm-reading/PalmDestinyMain.tsx'))code=code.replace(/["'](\/images\/(?:service-introductions\/palm-reading-960|expert-characters\/yeoni\/shooting-guide)\.webp)["']/g,'"https://code-destiny.com$1"');
   if(id.replaceAll('\\','/').endsWith('/lib/palm/palm-ui-state.js'))return code.replace('module.exports = {','export default {');
   if(id.replaceAll('\\','/').endsWith('/assets/yeongnyangi/tarot/v1/manifest.json'))return JSON.stringify(screenDeckManifest(JSON.parse(code)));
   if(/\.[jt]sx?(?:\?|$)/.test(id))code=code.replace(/process\.env\.NEXT_PUBLIC_EFFECTIVE_API_BASE_URL\b/g,JSON.stringify('https://code-destiny.com')).replace(/process\.env\.(?!NODE_ENV\b)[A-Z][A-Z_0-9]*/g,'undefined');
   if(id.replaceAll('\\','/').includes('/js/core/')&&code.includes('module.exports = api')){const name=code.match(/(?:globalThis|root)\.([\w]+) = api;/)?.[1];if(name)code+='\nexport default globalThis.'+name+';';}
   return code;
  },
  resolveId(id,importer){
   if(id==='virtual:consultation-webtoons')return '\0toss-consultation-webtoons';
   if(id==='virtual:destiny-island')return '\0toss-destiny-island';
   if(id==='virtual:secret-house-page')return '\0toss-secret-house';
   if(id==='virtual:rpg-sheet')return '\0toss-rpg-sheet';
   if(id==='virtual:section-villain-bindings')return '\0toss-villain-bindings';
   if(id==='virtual:ifa-engine')return '\0toss-ifa-engine';
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
   if(normalized.endsWith('/app/neo-consultation/checkout'))return fileURLToPath(new URL('./neo-email-checkout.ts',import.meta.url));
   if(normalized.endsWith('/app/hooks/usePayment'))return fileURLToPath(new URL('./payment-state.jsx',import.meta.url));
   if(/\/app\/_lib\/auth-client(?:\.[jt]s)?$/.test(normalized)&&!importer?.split('?')[0].replaceAll('\\','/').endsWith('/apps/toss/service/auth-client.jsx'))return fileURLToPath(new URL('./auth-client.jsx',import.meta.url));
   if(normalized.endsWith('/app/_lib/billing-client'))return fileURLToPath(new URL('./billing.jsx',import.meta.url));
   if(id.replaceAll('\\','/').endsWith('/app/checkout/CheckoutClient'))return fileURLToPath(new URL('./Checkout.jsx',import.meta.url));
   if(id==='next/navigation'||defaults[id])return '\0toss-service:'+id;
  },
  async load(id){
   if(id==='\0toss-consultation-webtoons'){
    // Readers stream original full-size panels. Keep other services' bundled portraits local.
    const file=resolve(publicRoot,'../lib/brand/consultation-webtoons.mjs');
    this.addWatchFile(file);
    const {consultationWebtoons}=await import(pathToFileURL(file).href+'?v='+(await stat(file)).mtimeMs);
    const stories=Object.fromEntries(Object.entries(consultationWebtoons).map(([key,story])=>[key,{
     ...story,cuts:story.cuts.map(cut=>({...cut,src:cut.src?'https://code-destiny.com'+cut.src:''})),
    }]));
    return 'export default '+JSON.stringify(stories);
   }
   if(id==='\0toss-destiny-island'){
    const file=resolve(publicRoot,'destiny-island.html');this.addWatchFile(file);
    for(const ref of islandArtwork)references.add(ref);
    return 'export default '+JSON.stringify(islandDocument(await readFile(file,'utf8')))+';';
   }
   if(id==='\0toss-secret-house'){
    const file=resolve(publicRoot,'secret-house_real.html');this.addWatchFile(file);
    return 'export default '+JSON.stringify(secretHouseDocument(await readFile(file,'utf8')))+';';
   }
   if(id==='\0toss-rpg-sheet'){
    const files=['entertain-engine.js','destiny-profile.js'].map(name=>resolve(publicRoot,'../js',name));
    files.forEach(file=>this.addWatchFile(file));
    return extractRpgEngine(...await Promise.all(files.map(file=>readFile(file,'utf8'))));
   }
   if(id==='\0toss-villain-bindings'){
    const source=resolve(publicRoot,'../js/core/saju/section-client.js');this.addWatchFile(source);
    return extractVillainBindings(await readFile(source,'utf8'));
   }
   if(id==='\0toss-ifa-engine'){
    const source=resolve(publicRoot,'ifa-oracle.html');this.addWatchFile(source);
    return extractIfaEngine(await readFile(source,'utf8'));
   }
   if(id==='\0toss-omikuji-engine'){const source=resolve(publicRoot,'emoi_omikuji_v2.html');this.addWatchFile(source);return extractOmikujiEngine(await readFile(source,'utf8'));}if(id==='\0toss-sample-intro-art'||id==='\0toss-ziwei-intro-art'){const registry=JSON.parse(await readFile(resolve(publicRoot,'../lib/marketing/service-introduction-art.json'),'utf8'));if(id==='\0toss-ziwei-intro-art'){if(!registry['ziwei-ai'])throw new Error('Ziwei artwork missing');return `export default ${JSON.stringify({'ziwei-ai':registry['ziwei-ai']})};`;}const samples=JSON.parse(await readFile(resolve(publicRoot,'../lib/marketing/result-samples.json'),'utf8'));return `export default ${JSON.stringify(sampleIntroductionArt(registry,samples))};`;}if(!id.startsWith('\0toss-service:'))return;const name=id.slice('\0toss-service:'.length);return defaults[name]?`export {${defaults[name]} as default} from ${JSON.stringify(shim)};`:`export {useRouter,usePathname,useSearchParams} from ${JSON.stringify(shim)};`;},
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
   // Original named LOVE CODE character portraits (including Korean spaces) are used by the web engine.
   if(Object.values(bundle).some(entry=>entry.type==='chunk'&&entry.code.includes('/fuctionassets/러브 코드/'))){
    references.add('/fuctionassets/love code.webp');
    for(const file of await readdir(resolve(publicRoot,'fuctionassets/러브 코드')))if(file.endsWith('.webp'))references.add('/fuctionassets/러브 코드/'+file);
   }
   if(tea640)for(const file of await readdir(resolve(publicRoot,'images/service-introductions')))if(/^tea-.+-640\.webp$/.test(file))references.add('/images/service-introductions/'+file);
   if(yeongnyangi640)for(const file of await readdir(resolve(publicRoot,'images/service-introductions')))if(/^yeongnyangi-.+-640\.webp$/.test(file))references.add('/images/service-introductions/'+file);
   // The relationship report uses five scene records from the shared web
   // compatibility registry; the other compatibility flows are not in this shell.
   if(references.delete('/images/compat-story/'))for(const art of Object.values(COMPAT_ART))references.add(art.src);
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
   async function sourceBytes(path){
    const ref=path.slice(publicRoot.length+1).split(sep).join('/');
    if(ref.startsWith('fuctionassets/러브 코드/'))return sharp(path).resize({width:640,withoutEnlargement:true}).webp({quality:82}).toBuffer();
    if(ref==='fuctionassets/love code.webp')return sharp(path).resize({width:800,withoutEnlargement:true}).webp({quality:82}).toBuffer();
    if(ref.startsWith('images/compat-story/'))return sharp(path).resize({width:640,withoutEnlargement:true}).webp({quality:82}).toBuffer();
    // Guardians occupy a 72px reading portrait; the map also supports pinch zoom.
    if(/^images\/destiny-island\/guardians\/[^/]+-v1\.webp$/.test(ref))return sharp(path).resize({width:240,withoutEnlargement:true}).webp({quality:85}).toBuffer();
    if(ref==='images/destiny-island/exploration-map-v3.webp')return sharp(path).resize({width:1200,withoutEnlargement:true}).webp({quality:84}).toBuffer();
    if(ref==='assets/yeongnyangi/tarot/v1/back-600.webp')return sharp(path).webp({quality:88,effort:6}).toBuffer();
    // Keep the three animation frames aligned on mobile, including transparent edges.
    if(/^assets\/yeongnyangi\/readings\/[^/]+-loading-sprite-v1\.webp$/.test(ref))return sharp(path).resize({width:1536,withoutEnlargement:true}).webp({quality:87,alphaQuality:100}).toBuffer();
    // The web waiting scene is displayed at most 416 CSS pixels wide.
    if(ref==='images/consultation-webtoons/heukwol/portraits/moon-library.webp')return sharp(path).resize({width:640,withoutEnlargement:true}).webp({quality:84}).toBuffer();
    // These portraits and scene covers fill at most the miniapp content width.
    if(/^images\/(master-profiles|consultation-editorial|service-introductions|fusion-fortune)\/[^/]+\.webp$/.test(ref)){
     const source=await readFile(path);
     const {width}=await sharp(source).metadata();
     if(width>800)return sharp(source).resize({width:800}).webp({quality:88,alphaQuality:100}).toBuffer();
     return source;
    }
    return readFile(path);
   }
   const collect=async(folder,prefix)=>{
    for(const entry of await readdir(folder,{withFileTypes:true})){
     const path=resolve(folder,entry.name);
     if(entry.isDirectory()){if(path.startsWith(prefix)||prefix.startsWith(path+sep))await collect(path,prefix);}
     else if(path.startsWith(prefix)&&mime[extname(path)]&&!emitted.has(path)){
      if(/^images\/psychotest\/bmovie-v1\/[a-z]+-960\.webp$/.test(path.slice(publicRoot.length+1).split(sep).join('/')))continue;
      if(Object.hasOwn(TOSS_WEBP_ART,'/'+path.slice(publicRoot.length+1).replaceAll('\\','/')))continue;
      emitted.add(path);this.emitFile({type:'asset',fileName:path.slice(publicRoot.length+1).replaceAll('\\','/'),source:await sourceBytes(path)});
     }
    }
   };
   for(const ref of references){
    const path=resolve(publicRoot,'.'+ref);
    if(!path.startsWith(publicRoot+sep))continue;
    if(ref.startsWith('/assets/talismans/originals/')||ref.startsWith('/assets/talismans/widget/'))continue;
    let info;try{info=await stat(path);}catch{/* Dynamic filename prefix. */}
    if(info?.isFile()){if(!Object.hasOwn(TOSS_WEBP_ART,ref)&&!emitted.has(path)){emitted.add(path);this.emitFile({type:'asset',fileName:ref.slice(1),source:await sourceBytes(path)});}continue;}
    const folder=info?.isDirectory()?path:dirname(path);
    try{await collect(folder,path);}catch(error){if(error.code!=='ENOENT')throw error;}
   }
  },
 };
}
