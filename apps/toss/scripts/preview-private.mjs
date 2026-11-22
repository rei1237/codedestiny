// Local-only, user-operated mobile preview of the isolated private simulation build.
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,relative,extname,isAbsolute} from 'node:path';
import {createRequire} from 'node:module';
const root=resolve(process.env.TOSS_PREVIEW_DIST||resolve(import.meta.dirname,'../private-simulation/dist'));
// A retained Linux simulation can be previewed straight from its signed-off build.
// The regular service bundle is rejected by the same marker check as a dist directory.
const archivePath=process.argv[2];
async function openArchive(file){
 const require=createRequire(import.meta.url);
 const sdk=createRequire(require.resolve('@apps-in-toss/cli/package.json'));
 const archive=sdk('@apps-in-toss/ait-format').AppsInTossBundle.reader(await readFile(file));
 if(archive.appName!=='ai-saju-studio'||archive.bundle.index.some(item=>item.name.includes('\\')))throw Error('Expected a Linux ai-saju-studio archive');
 return archive;
}
const archive=archivePath?await openArchive(archivePath):null;
async function readAsset(name){
 if(archive)return Buffer.from(await archive.readEntry('sources/'+name));
 const file=resolve(root,name);
 const inside=relative(root,file);
 if(isAbsolute(inside)||inside.startsWith('..')||!(await stat(file)).isFile())throw Error('Asset unavailable');
 return readFile(file);
}
const index=(await readAsset('index.html')).toString('utf8');
if(!index.includes('private-simulation-person'))throw Error('Build the private simulation first; a regular service bundle cannot be previewed here.');
const port=Number(process.env.TOSS_PREVIEW_PORT||4330);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid loopback preview port');
const native=`window.__appsInTossConstants={operationalEnvironment:'sandbox',safeAreaInsets:{top:0,bottom:12,left:0,right:0},schemeUri:'intoss://ai-saju-studio',locale:'ko-KR',platformOS:'android',tossAppVersion:'5.300.0'};window.__bridgeMethods__=['__subscribeAppEvent','__unsubscribeAppEvent'];window.ReactNativeWebView={postMessage(raw){const {type,body,bridgeId}=JSON.parse(raw);if(type!=='bridge')return;const {method,eventId}=body;if(!window.__bridgeMethods__.includes(method))throw Error('Preview blocked native action '+method);queueMicrotask(()=>window.nativeEmitterMap[bridgeId].emit(method+'-'+eventId,null));}};`;
const controls=`const frame=document.querySelector('iframe');const width=document.querySelector('#width'),height=document.querySelector('#height'),font=document.querySelector('#font');
function resize(){
 frame.style.width=width.value+'px';
 frame.style.height=height.value?height.value+'px':'';
 frame.style.minHeight=height.value?'0':'';
}
function applyFont(){if(frame.contentDocument)frame.contentDocument.documentElement.style.fontSize=font.value;}
width.onchange=height.onchange=resize;
font.onchange=applyFont;
frame.addEventListener('load',applyFont);
document.querySelector('#reopen').onclick=()=>frame.src='/';document.querySelector('#back').onclick=()=>{const w=frame.contentWindow;if(!w.dispatchEvent(new w.Event('code-destiny:toss-overlay-back',{cancelable:true})))return;if(!w.dispatchEvent(new w.Event('code-destiny:toss-back',{cancelable:true})))return;if(w.history.length>1)w.history.back();else frame.src='/';};document.querySelector('#reset').onclick=()=>{if(!confirm('모의 계정 A·B의 입력과 결과를 지울까요? 실제 계정과 구매 내역에는 영향이 없습니다.'))return;for(const storage of [localStorage,sessionStorage])for(const key of Object.keys(storage))if(key.startsWith('ai-saju-studio:private-simulation:v1:'))storage.removeItem(key);frame.src='/';};`;
const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>꿀꿀운세 · 가상 모바일 테스트</title><style>body{margin:0;background:#f5efe5;color:#493342;font:16px/1.6 system-ui,sans-serif}header{max-width:1080px;margin:auto;padding:20px;display:flex;flex-wrap:wrap;align-items:center;gap:12px}h1{font-size:20px;margin:0}header p{flex-basis:100%;margin:0;font-size:14px}nav{display:flex;gap:8px;flex-wrap:wrap}button,select{font:inherit;min-height:44px;border:1px solid #bca786;border-radius:10px;padding:8px 14px;background:#fffbf5;color:#493342}button{cursor:pointer}:focus-visible{outline:3px solid #82415b;outline-offset:3px}main{display:flex;justify-content:center;padding:0 12px 20px}iframe{width:390px;max-width:100%;height:calc(100dvh - 190px);min-height:450px;border:1px solid #a98d6b;border-radius:22px;background:#fff;box-shadow:0 12px 36px #49334226}a{color:#82415b}@media(max-width:550px){header{padding:12px}iframe{height:calc(100dvh - 210px);min-height:360px}}</style></head><body><header><h1>꿀꿀운세 가상 모바일</h1><nav aria-label="테스트 도구"><button id="back">뒤로</button><button id="reopen">앱 다시 열기</button><label>화면 너비 <select id="width" aria-label="화면 너비"><option>360</option><option selected>390</option><option>430</option></select></label><label>화면 높이 <select id="height"><option value="">자동</option><option value="420">키보드 공간 420px</option></select></label><label>기본 글씨 <select id="font"><option value="">기본</option><option value="150%">150%</option></select></label><button id="reset">모의 기록 초기화</button></nav><p>실제 로그인·결제·AI 호출이 없는 모의 앱입니다. 앱 안의 A·B 계정 선택으로 계정 분리를 확인할 수 있어요. <a href="/" target="_blank" rel="noreferrer">앱만 크게 열기</a></p></header><main><iframe title="꿀꿀운세 모의 모바일 앱" src="/"></iframe></main><script src="/__preview/controls.js"></script></body></html>`;
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.avif':'image/avif','.woff2':'font/woff2','.mp3':'audio/mpeg','.wasm':'application/wasm'};
const server=createServer(async(req,res)=>{
 try{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return;}
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  res.setHeader('Cache-Control','no-store');
  if(pathname==='/preview'||pathname==='/__preview/native.js'||pathname==='/__preview/controls.js'){res.writeHead(200,{'Content-Type':pathname==='/preview'?'text/html; charset=utf-8':'text/javascript; charset=utf-8'}).end(pathname==='/preview'?html:pathname.endsWith('native.js')?native:controls);return;}
  if(pathname.startsWith('/api/')||pathname.startsWith('/private-simulation-api/')){res.writeHead(403).end();return;}
  const file=extname(pathname)?pathname.slice(1):'index.html';
  const body=file==='index.html'?index.replace('<head>','<head><script src="/__preview/native.js"></script>'):await readAsset(file);
  res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'}).end(body);
 }catch{res.writeHead(404).end();}
});
server.listen(port,'127.0.0.1',()=>console.log('Private mobile preview: http://127.0.0.1:'+port+'/preview',archive?.deploymentId||'local dist'));
