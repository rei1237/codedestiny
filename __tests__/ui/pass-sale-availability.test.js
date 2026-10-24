const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const {JSDOM} = require('jsdom');
const React = require('react');
const {act} = React;
const {createRoot} = require('react-dom/client');
const {transformSync} = require('esbuild');

test('pass sale lookup distinguishes loading and failure, and retry never enables an unavailable offer', async () => {
  const filename = path.resolve(__dirname, '../../app/hooks/usePassSaleAvailability.ts');
  const loaded = new Module(filename, module);
  loaded.filename = filename; loaded.paths = module.paths;
  loaded._compile(transformSync(fs.readFileSync(filename, 'utf8'), {loader:'ts', format:'cjs'}).code, filename);
  const dom = new JSDOM('<div id="root"></div>', {url:'http://localhost/'});
  const keys = ['window','document','fetch','IS_REACT_ACT_ENVIRONMENT'];
  const originals = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  let resolveRequest, state;
  globalThis.fetch = () => new Promise(resolve => {resolveRequest=resolve;});
  function Probe(){state=loaded.exports.usePassSaleAvailabilityDetails();return null;}
  const root=createRoot(document.getElementById('root'));
  try {
    await act(async()=>root.render(React.createElement(Probe)));
    assert.equal(state.status,'loading');assert.deepEqual(state.ready,{});
    await act(async()=>resolveRequest({ok:false}));
    assert.equal(state.status,'error');assert.deepEqual(state.ready,{});
    await act(async()=>state.refresh());
    assert.equal(state.status,'loading');assert.deepEqual(state.ready,{});
    await act(async()=>resolveRequest({ok:true,json:async()=>({offers:[{tier:'standard',saleEnabled:false},{tier:'premium',saleEnabled:true}]})}));
    assert.equal(state.status,'ready');assert.equal(state.ready.standard,false);assert.equal(state.ready.premium,true);assert.equal(state.ready.family,undefined);
  } finally {
    await act(async()=>root.unmount());dom.window.close();
    keys.forEach((key,i)=>originals[i]?Object.defineProperty(globalThis,key,originals[i]):delete globalThis[key]);
  }
});
