import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
import {createPreviewApi} from './preview-api.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const shim=fileURLToPath(new URL('./next.jsx',import.meta.url)).replaceAll('\\','/');
const defaults={'next/image':'Image','next/link':'Link','next/dynamic':'dynamic'};
const mime={'.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg','.json':'application/json'};
export default function canonicalPreview(){return {name:'canonical-consultation-preview',apply:'serve',enforce:'pre',
  transform(code,id){
    if(!id.includes('node_modules')&&/\.[jt]sx?(?:\?|$)/.test(id))code=code.replace(/process\.env\.(?!NODE_ENV\b)[A-Z][A-Z_0-9]*/g,'undefined');
    if(id.replaceAll('\\','/').includes('/js/core/')&&code.includes('module.exports = api')){const global=code.match(/(?:globalThis|root)\.([\w]+) = api;/)?.[1];if(global)code+='\nexport default globalThis.'+global+';';}
    if(id.replaceAll('\\','/').endsWith('/NeoOperationRoomPage.tsx'))code+='\nexport {localPreviewBriefing,localPreviewRefinedOrder};';
    return code;
  },
  resolveId(id){const path=id.replaceAll('\\','/');if(path.endsWith('/app/checkout/CheckoutClient'))return fileURLToPath(new URL('./checkout.jsx',import.meta.url));if(path.endsWith('/app/_lib/billing-client'))return fileURLToPath(new URL('./billing.jsx',import.meta.url));if(id==='next/navigation'||defaults[id])return '\0canonical:'+id;},
  load(id){if(!id.startsWith('\0canonical:'))return;const name=id.slice('\0canonical:'.length);return defaults[name]?`export {${defaults[name]} as default} from ${JSON.stringify(shim)};`:`export {useRouter,usePathname,useSearchParams} from ${JSON.stringify(shim)};`;},
  configureServer(server){const api=createPreviewApi(server,root);server.middlewares.use(async(req,res,next)=>{
    const url=new URL(req.url||'/','http://localhost');
    if(url.pathname.startsWith('/__canonical_api/'))return api(req,res);
    if(/^\/(yeongnyangi\/(fortune|result|library)|fortune-tea-house|neo-operation-room(?:\/(result|strategy-books))?|records(?:\/view)?)\/?$/.test(url.pathname)){
      const html=await readFile(new URL('../test/consultations.html',import.meta.url),'utf8');res.setHeader('Content-Type','text/html');res.end(await server.transformIndexHtml(url.pathname,html));return;
    }
    if(!/^\/(assets|images|fonts|neo-operation-room|fortune-tea-house)\//.test(url.pathname))return next();
    const folder=resolve(root,'public');
    let path;try{path=resolve(folder,'.'+decodeURIComponent(url.pathname));}catch{return next();}
    if(!path.startsWith(folder+sep))return next();
    try{const data=await readFile(path);res.setHeader('Content-Type',mime[extname(path)]||'application/octet-stream');res.end(data);}catch{next();}
  });},
};}
