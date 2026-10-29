const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const React=require('react');
const {JSDOM}=require('jsdom');
const base=path.resolve(__dirname,'../..');
const compiled=ts.transpileModule(fs.readFileSync(path.join(base,'app/stories/StoryEdition.tsx'),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;

async function mount({stale=false,available=['ko','en','ja']}={}){
  const dom=new JSDOM('<div id="root"></div>',{url:'https://novel.test/stories/prologue/?lang=fr'});
  const saved={window:global.window,document:global.document,act:global.IS_REACT_ACT_ENVIRONMENT};
  global.window=dom.window;global.document=dom.window.document;global.IS_REACT_ACT_ENVIRONMENT=true;
  const locales=await import('../../lib/stories/vn/locales.mjs');
  const first=JSON.parse(fs.readFileSync(path.join(base,'content/novel/translations/authored/prologue-001.json'),'utf8')).rows[0];
  const requested=[];
  const fetch=async url=>{
    requested.push(url);
    const locale=url.includes('/ja/')?'ja':'en';
    let data;
    if(url==='/data/novel/manifest.json')data={sourceHash:'current',availableLocales:available,episodes:[{id:'prologue'}]};
    else if(url.endsWith('manifest.json'))data={sourceHash:stale?'old':'current',locale,episodes:[{id:'prologue',no:'PROLOGUE',title:'Opening',tag:'Chapter',path:`/data/novel/${locale}/episodes/prologue.json`}]};
    else data={sourceHash:'current',id:'prologue',no:'PROLOGUE',title:'Opening',tag:'Chapter',beats:[{id:first.id,s:'n',t:first.translations[locale]}]};
    return {ok:true,json:async()=>data};
  };
  const module={exports:{}};
  vm.runInNewContext(compiled,{module,exports:module.exports,React,URL,URLSearchParams,AbortController,window:dom.window,document:dom.window.document,navigator:dom.window.navigator,localStorage:dom.window.localStorage,fetch,require:name=>name==='./StoryHubCopy'?{StoryHubLocaleProvider:({children})=>children}:name.endsWith('locales.mjs')?locales:name.endsWith('ui-copy.json')?require('../../content/novel/ui-copy.json'):require(name)});
  const {createRoot}=require('react-dom/client');const root=createRoot(dom.window.document.getElementById('root'));
  await React.act(async()=>root.render(React.createElement(module.exports.default,{episodeId:'prologue'},React.createElement('main',null,'한국어 원문'))));
  return {dom,first,requested,close:async()=>{await React.act(async()=>root.unmount());dom.window.close();global.window=saved.window;global.document=saved.document;global.IS_REACT_ACT_ENVIRONMENT=saved.act;}};
}

test('text reader defaults French to English and keeps its language separate from counseling',async()=>{
  const f=await mount();
  try{
    assert.ok(f.dom.window.document.querySelector('article').textContent.includes(f.first.translations.en));
    const select=f.dom.window.document.querySelector('select');
    await React.act(async()=>{select.value='ja';select.dispatchEvent(new f.dom.window.Event('change',{bubbles:true}));});
    assert.ok(f.dom.window.document.querySelector('article').textContent.includes(f.first.translations.ja));
    assert.equal(f.dom.window.localStorage.getItem('cd:novel:language'),'ja');
    assert.equal(f.dom.window.localStorage.length,1);
    assert.match(f.dom.window.location.search,/lang=fr/);
    assert.match(f.dom.window.location.search,/novelLang=ja/);
    assert.equal(f.dom.window.document.querySelector('a[href*="codedestiny-novel"]').search,'?novelLang=ja');
  }finally{await f.close();}
});
test('text reader never displays a stale translation under the requested language',async()=>{
  const f=await mount({stale:true});
  try{assert.equal(f.dom.window.document.querySelector('article'),null);assert.ok(f.dom.window.document.querySelector('[role=alert]'));assert.ok(!f.requested.some(url=>url.includes('/episodes/')));}finally{await f.close();}
});
test('text reader preserves Korean and discloses unavailable editions',async()=>{
  const f=await mount({available:['ko']});
  try{assert.equal(f.dom.window.document.querySelector('main').textContent,'한국어 원문');assert.match(f.dom.window.document.querySelector('[role=status]').textContent,/being prepared/);assert.equal(f.dom.window.document.querySelector('option[value=en]').disabled,true);}finally{await f.close();}
});

test('late native language updates the automatic edition but preserves a manual novel choice',async()=>{
  const f=await mount();
  try{
    await React.act(async()=>{f.dom.window.__cdAppLanguage='ja';f.dom.window.dispatchEvent(new f.dom.window.Event('cd:locale-ready'));});
    assert.ok(f.dom.window.document.querySelector('article').textContent.includes(f.first.translations.ja));
    const select=f.dom.window.document.querySelector('select');
    await React.act(async()=>{select.value='en';select.dispatchEvent(new f.dom.window.Event('change',{bubbles:true}));});
    const requests=f.requested.length;
    await React.act(async()=>f.dom.window.dispatchEvent(new f.dom.window.Event('cd:locale-ready')));
    assert.equal(f.requested.length,requests);
    assert.ok(f.dom.window.document.querySelector('article').textContent.includes(f.first.translations.en));
  }finally{await f.close();}
});
