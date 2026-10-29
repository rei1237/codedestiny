const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const file = fs.readFileSync(path.resolve(__dirname, '../../scripts/app-native-bridge.js'), 'utf8');
const tree = ts.createSourceFile('bridge.js', file, ts.ScriptTarget.Latest, true);
function extract(name) {
  let source;
  function visit(node) {
    if ((ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) && node.name?.getText(tree) === name) {
      source = ts.isVariableDeclaration(node) ? 'var ' + node.getText(tree) + ';' : node.getText(tree);
    }
    ts.forEachChild(node, visit);
  }
  visit(tree); assert.ok(source, name); return source;
}
const locales = ['ko','en','ja','zh-CN','zh-TW','vi','hi','es','fr','de','nl','ms'];
function fixture() {
  const dom = new JSDOM('<html lang="ko"><body><div id="cdMySheet"><ul><li><a href="/points/history/">History</a></li></ul></div></body></html>', {url:'https://localhost/ggulggul/'});
  Object.defineProperty(dom.window.navigator, 'onLine', {value:false, configurable:true});
  dom.window.setTimeout = () => 1;
  const ctx = vm.createContext({window:dom.window, document:dom.window.document, console, exitHintTimer:null,
    resetExitIntent() {}, trace() {}, openAuthStartedAt:0, appPlugin:()=>null, billingPlugin:()=>null, browserPlugin:()=>null});
  for(const name of ['installAppLocaleBridge','installAppUrlListener','installBackButton','installExternalLinkGuard','installDiagnosticsGesture','installProfileSheetProbe','installLogoutCredentialClear']) ctx[name]=()=>{};
  const names=['nativeAppCopy','nativeAppText','showExitHint','describeSocialError','cdAppText','offlineNoticeNode','syncOfflineNotice','installOfflineNotice','boot'];
  vm.runInContext(names.map(extract).join('\n'),ctx);
  return {dom,ctx};
}
test('native menus, offline state, sign-in errors and exit hint follow all 12 selected languages without a page dictionary',()=>{
  const {dom,ctx}=fixture();
  try {
    ctx.boot();
    for(const locale of locales) {
      dom.window.__cdAppLanguage=locale;
      dom.window.document.documentElement.lang=locale;
      dom.window.dispatchEvent(new dom.window.CustomEvent('cd:locale-ready',{detail:{lang:locale}}));
      const copy=ctx.nativeAppCopy[locale];
      assert.deepEqual(Object.keys(copy),Object.keys(ctx.nativeAppCopy.en));
      for(const text of Object.values(copy)) {
        assert.ok(text.trim()); if(locale!=='ko') assert.doesNotMatch(text,/[가-힣]/);
      }
      for(const [id,key] of [['cdTalismanEntry','talismans'],['cdInsightsEntry','insights'],['cdFamousEntry','famousSaju']]) assert.equal(dom.window.document.getElementById(id).textContent,copy[key]);
      assert.equal(dom.window.document.querySelectorAll('#cdTalismanEntry').length,1);
      assert.equal(dom.window.document.querySelector('#cdAppOfflineNotice span').textContent,copy.offline);
      assert.equal(dom.window.document.querySelector('#cdAppOfflineNotice button').textContent,copy.retry);
      ctx.showExitHint(); assert.equal(dom.window.document.getElementById('cdAppExitHint').textContent,copy.exitHint);
      dom.window.document.getElementById('cdAppExitHint').remove();
      for(const [error,key] of [['underage','authUnderage'],['guardian','authGuardian'],['database timeout','authServer'],['already processed','authDuplicate'],['google_token_exchange_failed','authGoogle']]) assert.equal(ctx.describeSocialError(error),copy[key]);
      assert.equal(ctx.describeSocialError('UNKNOWN'),copy.authFailed+'UNKNOWN');
    }
    Object.defineProperty(dom.window.navigator,'onLine',{value:true});
    dom.window.dispatchEvent(new dom.window.Event('online'));
    assert.equal(dom.window.document.getElementById('cdAppOfflineNotice'),null);
  } finally {dom.window.close();}
});
test('native preference wins stale page language and regional variants normalize safely',()=>{
  const {dom,ctx}=fixture();
  try {
    dom.window.document.documentElement.lang='ko';
    for(const [language,expected] of [['zh-Hant-HK','zh-TW'],['zh-Hans-CN','zh-CN'],['de-DE','de'],['vi-VN','vi'],['pt-BR','en']]) {
      dom.window.__cdAppLanguage=language;
      assert.equal(ctx.nativeAppText('talismans'),ctx.nativeAppCopy[expected].talismans);
    }
    delete dom.window.__cdAppLanguage;
    dom.window.cdGetCurrentLanguage=()=> 'fr';
    assert.equal(ctx.nativeAppText('exitHint'),ctx.nativeAppCopy.fr.exitHint);
  } finally {dom.window.close();}
});
