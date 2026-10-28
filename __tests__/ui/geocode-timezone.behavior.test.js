const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=fs.readFileSync('worker/index.js','utf8'),ast=ts.createSourceFile('index.js',source,ts.ScriptTarget.Latest,true);
const names=['cleanGeocodeText','validGeocodeCoordinates','handleGeocodeRequest'];
const code=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(n=>n.getText(ast)).join('\n');
function context(payload,ok=true){return vm.createContext({URL,Number,Array,String,fetch:async()=>({ok,json:async()=>payload}),tzLookup:require('tz-lookup'),GEOCODE_FALLBACK_SEOUL:{fallback:true},jsonResponse:(_r,_e,value,options)=>({value,options})});}
test('actual geocode route resolves multiple time zones within one country',async()=>{
 for(const [lat,lon,timezone] of [[40.7128,-74.006,'America/New_York'],[34.0522,-118.2437,'America/Los_Angeles'],[28.6139,77.209,'Asia/Kolkata'],[37.5665,126.978,'Asia/Seoul']]){
  const c=context([{lat:String(lat),lon:String(lon),display_name:'fixture',address:{country_code:'us'}}]);vm.runInContext(code,c);
  const result=await c.handleGeocodeRequest({url:'https://example.invalid/api/geocode?place=fixture'},{});
  assert.equal(result.value.timezone,timezone);assert.equal(result.value.fallback,false);
 }
});
test('failed and invalid geocodes stay explicitly marked as fallback',async()=>{
 for(const payload of [[],null,[{lat:'invalid',lon:1}],[{lat:91,lon:0}]]){const c=context(payload);vm.runInContext(code,c);assert.equal((await c.handleGeocodeRequest({url:'https://example.invalid/api/geocode?place=fixture'},{})).value.fallback,true);}
 const c=context([],false);vm.runInContext(code,c);assert.equal((await c.handleGeocodeRequest({url:'https://example.invalid/api/geocode?place=fixture'},{})).value.fallback,true);
});
