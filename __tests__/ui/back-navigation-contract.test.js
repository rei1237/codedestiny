const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function provider(pathname, {standalone=false}={}) {
  const dom = new JSDOM('<body></body>', {url:'https://example.test'+pathname});
  const { window }=dom;
  const effects=[], cleanups=[], calls=[];
  let clock=10000, paid=false;
  window.matchMedia=()=>({matches:standalone});
  window.history.back=()=>calls.push('back');
  const context=vm.createContext({window,document:window.document,MutationObserver:window.MutationObserver,Event:window.Event,Date:{now:()=>clock},console});
  function load(file, imports) {
    const code=ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
    const exports={};
    vm.runInContext('(function(require,exports){'+code+'\n})',context)(name=>{if(name in imports)return imports[name];throw Error(name);},exports);
    return exports;
  }
  const back=load('lib/navigation/backHandler.ts',{});
  const component=load('app/providers/NavigationProvider.tsx',{
    react:{createContext:()=>({Provider:'provider'}),useRef:v=>({current:v}),useEffect:fn=>effects.push(fn),useMemo:fn=>fn(),useCallback:fn=>fn},
    'react/jsx-runtime':{jsx:(type,props)=>({type,props})},
    'next/navigation':{usePathname:()=>pathname,useRouter:()=>({replace:p=>calls.push(p)})},
    '@/lib/navigation/backHandler':back,
    '@/lib/navigation/transientBack':{installTransientBackHost:()=>()=>{}},
    '@/lib/analytics':{trackEvent:()=>{}},
    '@/app/_lib/paid-attempt-session':{getActivePaidAttemptSession:()=>paid?{attemptId:'mock'}:null,isPaidAttemptInProgress:()=>paid,logPaidAttemptEvent:()=>{}},
  });
  const api=component.default({children:null}).props.value;
  effects.forEach(fn=>{const cleanup=fn();if(cleanup)cleanups.push(cleanup);});
  clock+=500;
  return {window,calls,api,
    paid:()=>{paid=true;},
    native:(scope='screen')=>{const e=new window.CustomEvent('cd:app-back',{cancelable:true,detail:{scope}});window.dispatchEvent(e);return e.defaultPrevented;},
    pop:()=>{clock+=500;window.history.replaceState({...window.history.state,__cdBackGuardV1:false},'');window.dispatchEvent(new window.PopStateEvent('popstate'));},
    close:()=>{cleanups.reverse().forEach(fn=>fn());window.close();},
  };
}
function handler(scope,onBack,locked=false) {return {id:scope,scope,enabled:()=>true,isLocked:()=>locked,canGoBack:()=>true,onBack};}
for(const standalone of [false,true]) for(const path of ['/','/yeongnyangi/']) {
  test(`${path} standalone=${standalone}: root does not add history or claim exit`,()=>{
    const app=provider(path,{standalone});assert.equal(app.window.history.length,1);assert.equal(app.native(),false);app.pop();assert.deepEqual(app.calls,[]);app.close();
  });
}
test('native wizard consumes one real guard; locked checkout never goes back',()=>{
  const app=provider('/yeongnyangi/');let steps=0;
  const remove=app.api.registerBackHandler(handler('wizard',()=>{steps++;return true;}));
  assert.equal(app.native(),true);assert.deepEqual(app.calls,['back']);app.pop();assert.equal(steps,1);
  remove();app.api.registerBackHandler(handler('wizard',()=>{throw Error('locked');},true));
  assert.equal(app.native(),true);assert.deepEqual(app.calls,['back']);app.close();
});
test('popup has priority over wizard and pending paid attempt protects unregistered screen',()=>{
  const app=provider('/yeongnyangi/');const handled=[];
  const wizard=app.api.registerBackHandler(handler('wizard',()=>{handled.push('wizard');return true;}));
  const overlay=app.api.registerBackHandler(handler('overlay',()=>{handled.push('overlay');return true;}));
  assert.equal(app.native('overlay'),true);app.pop();assert.deepEqual(handled,['overlay']);
  overlay();wizard();app.paid();const count=app.calls.length;
  assert.equal(app.native(),true);assert.equal(app.calls.length,count);app.close();
});
test('HTML dialog uses cancel on browser back; cleanup removes native listener',async()=>{
  const app=provider('/yeongnyangi/');const dialog=app.window.document.createElement('dialog');
  app.window.document.body.appendChild(dialog);let cancelled=0;
  dialog.addEventListener('cancel',e=>{e.preventDefault();dialog.open=false;cancelled++;});dialog.open=true;
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(app.window.history.length,2);app.pop();assert.equal(cancelled,1);
  app.close();assert.equal(app.native(),false);
});

function shell(standalone) {
  const dom=new JSDOM('<body></body>',{url:'https://example.test/ggulggul/',runScripts:'outside-only'});
  const {window}=dom;const calls=[];const listeners={};
  Object.defineProperty(window.document,'readyState',{value:'complete'});
  window.matchMedia=()=>({matches:standalone});window.setInterval=()=>0;
  window.history.back=()=>calls.push('back');window.close=()=>calls.push('close');
  const add=window.addEventListener.bind(window);
  window.addEventListener=(name,fn,...args)=>{(listeners[name]||=[]).push(fn);add(name,fn,...args);};
  window.eval(read('js/mobile-backstack-navigation.js'));
  return {window,calls,listeners,close:()=>dom.window.document.body.remove()};
}
for(const standalone of [false,true]) test(`static shell standalone=${standalone}: no exit hint, window.close, or root rearm`,()=>{
  const app=shell(standalone);const before=app.window.history.length;
  app.window.history.replaceState({__cdStaticBackGuardV1:false},'');
  app.window.dispatchEvent(new app.window.PopStateEvent('popstate'));
  assert.deepEqual(app.calls,['back']);assert.equal(app.window.history.length,before);
  assert.equal(app.window.document.getElementById('cdExitIntentToast'),null);
  app.window.eval(read('js/mobile-backstack-navigation.js'));assert.equal(app.listeners.popstate.length,1);app.close();
});
test('static native back respects locked payment chooser and HTML dialog cancel',()=>{
  const app=shell(false);let payment=0;
  app.window.__cdCheckoutEntry={hasOpenPaymentChoiceModal:()=>true,stepBackOpenPaymentChoice:()=>{payment++;}};
  const event=new app.window.CustomEvent('cd:app-back',{cancelable:true,detail:{scope:'overlay'}});
  app.window.dispatchEvent(event);assert.equal(event.defaultPrevented,true);assert.deepEqual(app.calls,['back']);
  app.window.dispatchEvent(new app.window.PopStateEvent('popstate'));assert.equal(payment,1);
  app.close();
});
