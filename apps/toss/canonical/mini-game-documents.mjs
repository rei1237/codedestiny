import {readFile,readdir} from 'node:fs/promises';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import {gameStorageKeys,miniGameRoutes} from './mini-games.mjs';

const root=new URL('../../../public/',import.meta.url);
const file=path=>new URL(path.slice(1),root);
const sources={'destiny-poker':'/destiny-poker.html','fortune-fish':'/fortune-teller-fish.html','blood-type':'/blood-type-app.html','hwatu-life':'/HwatuFortune.js'};

function frameBoot(slug){
 const allowed=JSON.stringify(gameStorageKeys[slug]);
 return `<script>
 const miniState=JSON.parse(window.name||'{}');window.name='';
 const allowedKeys=${allowed};
 function notify(action,payload){parent.postMessage({type:'code-destiny:mini-game',game:${JSON.stringify(slug)},action,payload},'*');}
 const miniStore={getItem:key=>allowedKeys.includes(key)?miniState[key]??null:null,setItem(key,value){if(allowedKeys.includes(key)){miniState[key]=String(value);notify('store',miniState);}},removeItem(key){if(allowedKeys.includes(key)){delete miniState[key];notify('store',miniState);}}};
 Object.defineProperty(window,'localStorage',{value:miniStore});
 let sequence=0;function send(action,payload){
  const id=String(++sequence);return new Promise((resolve,reject)=>{
   const done=event=>{if(event.source!==parent||event.data?.type!=='code-destiny:mini-share-result'||event.data.id!==id)return;clearTimeout(timer);removeEventListener('message',done);event.data.ok?resolve():reject(Error('요청을 마치지 못했어요.'));};
   const timer=setTimeout(()=>{removeEventListener('message',done);reject(Error('응답을 기다리고 있어요.'));},15000);
   addEventListener('message',done);parent.postMessage({type:'code-destiny:mini-game',game:${JSON.stringify(slug)},id,action,payload},'*');
  });
 }
 Object.defineProperty(navigator,'share',{value:async data=>send('share',String(data.text||data.title||''))});
 Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>send('copy',String(text))}});
 addEventListener('click',event=>{const a=event.target.closest?.('a');if(a&&a.getAttribute('href')&&!a.getAttribute('href').startsWith('#')){event.preventDefault();notify('back');}},true);
 </script>`;
}

export async function miniGameDocument(slug){
 if(!Object.hasOwn(sources,slug))throw Error('Unknown mini game');
 let html=await readFile(file(sources[slug]),'utf8');
 if(slug==='hwatu-life'){
  html=html.replace(/function loadGSAP\(callback\)\s*\{[\s\S]*?\n\}/,'function loadGSAP(callback){callback();}');
  if(html.includes('cdnjs.cloudflare'))throw Error('unmapped Hwatu dependency');
  // Sharing an earned reading opens the host share sheet. The app has no web reward ledger.
  html=html.replace('shareWithReward(function() {','(function() {').replace("}, 'hwatu'); /* shareWithReward 콜백 끝 */","})();");
  const cardArt={};
  for(const name of await readdir(file('/sudda/hwatu/thumbs/'))){
   if(/^\d+_\d+\.webp$/.test(name))cardArt[name]=(await readFile(file('/sudda/hwatu/thumbs/'+name))).toString('base64');
  }
  if(Object.keys(cardArt).length!==48)throw Error('Original Hwatu deck changed');
  html=html.replace("return '/sudda/hwatu/thumbs/' + month + '_' + index + '.webp';","return 'data:image/webp;base64,'+miniCards[month+'_'+index+'.webp'];");
  html='<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><script>const miniCards='+JSON.stringify(cardArt)+';\n'+html+'\nopenHwatuModal("lifecard");const closeOriginal=window.closeHwatuModal;window.closeHwatuModal=()=>{closeOriginal();notify("back");};</script></body></html>';
 }
 if(slug==='destiny-poker'){
  const translation=html.indexOf("  var GT_ID = 'cdStandaloneGtHost';");
  if(translation<0)throw Error('Poker translation boundary changed');
  html=html.slice(0,html.lastIndexOf('<script>',translation))+'</body></html>';
 }
 html=html.replace(/<script\b[^>]*\bsrc=[^>]*><\/script>/gi,'').replace(/<link\b[^>]*(?:preconnect|canonical|icon)[^>]*>/gi,'').replace(/<style data-cd-r2-static-fonts>[\s\S]*?<\/style>/gi,'').replace(/@font-face\s*\{[^}]*\}/gi,'').replace(/<meta\s+(?:name|property)="(?:og:|twitter:)[^>]+>/gi,'');
 const paths=new Set(html.match(/\/(?:assets\/fortune-fish|assets\/destiny-poker|fuctionassets\/destinyporker|sudda)\/[\w.-]+\.(?:webp|png)/g)||[]);
 for(const path of paths){
  const sprite=path.endsWith('sprite-v1.png');
  const art=await sharp(await readFile(file(path))).resize({width:sprite?1024:480,withoutEnlargement:true}).webp({quality:76,alphaQuality:90}).toBuffer();
  html=html.replaceAll(path,'data:image/webp;base64,'+art.toString('base64'));
 }
 if(slug==='blood-type')html=html.replace("showToast('💬 카카오톡 공유 준비 중!');","shareLink();");
 const csp="<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none';script-src 'unsafe-inline';style-src 'unsafe-inline';img-src data:;connect-src 'none';form-action 'none';base-uri 'none'\">";
 return html.replace(/<head(?:\s[^>]*)?>/i,head=>head+csp+frameBoot(slug));
}

export default function miniGamePlugin(){
 const prefix='virtual:toss-mini-game/';let serving=false;
 const covers=new Map(Object.keys(miniGameRoutes).map(slug=>['/__mini-game-covers/'+slug+'.webp',file('/images/mini-games/'+slug+'-320.webp')]));
 return {name:'toss-original-mini-games',configResolved(config){serving=config.command==='serve';},async generateBundle(){for(const [route,source] of covers)this.emitFile({type:'asset',fileName:route.slice(1),source:await readFile(source)});},
 configureServer(server){server.middlewares.use(async(req,res,next)=>{
  const path=req.url?.split('?')[0],source=covers.get(path),slug=/^\/__mini-games\/([a-z-]+)\.html$/.exec(path||'')?.[1];
  try{
   if(source){res.setHeader('Content-Type','image/webp');res.end(await readFile(source));}
   else if(slug&&Object.hasOwn(sources,slug)){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(await miniGameDocument(slug));}
   else next();
  }catch(error){next(error);}
 });},
 resolveId(id){if(id.startsWith(prefix))return '\0'+id;},
 async load(id){if(!id.startsWith('\0'+prefix))return;
  const slug=id.slice(prefix.length+1);this.addWatchFile(fileURLToPath(file(sources[slug])));
  const route='/__mini-games/'+slug+'.html';
  if(serving)return 'export default '+JSON.stringify(route);
  const ref=this.emitFile({type:'asset',fileName:route.slice(1),source:await miniGameDocument(slug)});
  return 'export default import.meta.ROLLUP_FILE_URL_'+ref;
 }};
}
