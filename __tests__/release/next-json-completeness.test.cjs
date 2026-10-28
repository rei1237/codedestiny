const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('scripts/next-manifest-read-guard.cjs','utf8');
const functions=['fileContentsText','looksIncompleteJson'].map(name=>source.match(new RegExp('function '+name+'\\([^]*?\\n}'))?.[0]);
const context={Buffer};vm.runInNewContext(functions.join('\n')+';this.check=looksIncompleteJson;',context);
test('partial nested manifests with closing braces are still incomplete',()=>{for(const text of ['', '{"nested":{}', '[{}', '{"nested":[{}]'])assert.equal(context.check(text),true);});
test('complete string and buffer manifests are usable',()=>{for(const text of ['{}','[]','{"nested":{}}']){assert.equal(context.check(text),false);assert.equal(context.check(Buffer.from(text)),false);}});
