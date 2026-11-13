import {readFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {transform} from 'esbuild';
import {isFreeFortuneFeatureKey} from '../../../lib/payment/free-fortune-policy.mjs';

// Package the authored classic scripts as one compressed local asset. Photos
// and derived landmarks remain inside the isolated upload frame.
export default function faceReading(){
 const key='virtual:toss-face-reading',file='assets/face-reading-runtime.gz';
 let promise;
 async function pack(){
  const texts=await Promise.all(['AnalysisEngine.js','PhysiognomyUI.js','PastLifeFaceUI.js'].map(name=>readFile(new URL('../../../'+name,import.meta.url),'utf8')));
  const free=['physiognomy-compatibility','physiognomy-ogwan-mole-deep','physiognomy-pastlife-compatibility'].filter(isFreeFortuneFeatureKey);
  if(free.length!==3)throw Error('Face analysis pricing requires a Toss policy review.');
  const bootstrap=`window.__CODE_DESTINY_RUNTIME_TARGET='mobile-app';window._cdCoinGatePerUse=function(cost,title,grant,ignored,offer){if(${JSON.stringify(free)}.includes(offer?.featureKey))grant();};`;
  let source=texts.join('\n;\n');
  // These inserts advertise a web checkout after the reading. The Toss frame
  // resolves the three deterministic follow-ups directly from the free policy.
  source=source.replace(/import\('\/js\/core\/saju\/crafted-product-details\.mjs'\)\.then\(function\(module\) \{[^\n]*\n[^\n]*mountCraftedStaticOffer[^\n]*\n\s*\}\);/g,'');
  source=source.replaceAll('🐷 5,000원 결제','무료').replaceAll('5,000원에 정밀 분석 보기','오관·점 정밀 분석 보기').replace('오관·점 정밀 분석을 5,000원에 열람','오관·점 정밀 분석 열기')
   .replace("price: '5,000원'","price: '무료'").replace('PLF_DEEPER_CTAS.map(function','PLF_DEEPER_CTAS.filter(cta=>cta.mode==="compat").map(function')
   .replace("const PLF_STORY_ASSET_BASE = '/fuctionassets/","const PLF_STORY_ASSET_BASE = 'https://code-destiny.com/fuctionassets/")
   .replace("const PLF_COMPAT_ASSET_BASE = '/fuctionassets/","const PLF_COMPAT_ASSET_BASE = 'https://code-destiny.com/fuctionassets/");
  const bridge=`const closeFace=window.closePhysiognomyApp, closePast=window.closePastLifeFaceApp;
   window.closePhysiognomyApp=()=>{closeFace();parent.postMessage('toss-face-close','*');};
   window.closePastLifeFaceApp=()=>{closePast();if(window.__tossFaceMode==='past')parent.postMessage('toss-face-close','*');};
   window.addEventListener('message',e=>{if(e.source===parent&&e.data==='toss-face-back'){const p=document.getElementById('pastlife-face-app');if(p&&p.style.display==='flex')window.closePastLifeFaceApp();else window.closePhysiognomyApp();}});
   if(window.__tossFaceMode==='past')window.openPastLifeFaceApp();else window.openPhysiognomyApp();`;
  const {code}=await transform(bootstrap+'\n'+source+'\n'+bridge,{minify:true,charset:'utf8',target:'es2022'});
  const bytes=gzipSync(code,{level:9});
  return {bytes,hash:createHash('sha256').update(bytes).digest('hex').slice(0,16)};
 }
 const load=()=>promise||=(pack());
 return {name:'toss-face-reading',resolveId(id){if(id===key)return '\0'+key;},
  async load(id){if(id==='\0'+key){const {hash}=await load();return 'export default '+JSON.stringify('/'+file+'?v='+hash);}},
  configureServer(server){server.middlewares.use(async(req,res,next)=>{if(req.url?.split('?')[0]!=='/'+file)return next();res.setHeader('Content-Type','application/octet-stream');res.end((await load()).bytes);});},
  async generateBundle(){this.emitFile({type:'asset',fileName:file,source:(await load()).bytes});}
 };
}
