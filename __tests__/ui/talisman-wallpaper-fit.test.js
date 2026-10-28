const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname,'../../app/app/talismans/wallpaper-fit.ts'),'utf8'), {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const result={};vm.runInNewContext(compiled,{exports:result});
const {wallpaperFit,normalizeScreen}=result;
for(const [width,height] of [[720,1280],[1080,2400],[1170,2532],[1290,2796],[1440,3200],[2160,3840]]) {
 test(`화면 ${width}x${height}: 원본/하단문구 전체가 여백 안에 남는다`,()=>{
   const screen=normalizeScreen(width,height);
   for(const size of [.6,.8,1]) for(const position of [0,.5,1]) {
     const fit=wallpaperFit({width:941,height:1672},screen,size,position);
     assert.ok(fit.x>=0 && fit.y>=0);
     assert.ok(fit.x+fit.width<=screen.width && fit.y+fit.height<=screen.height*.86+1);
     assert.ok(fit.width<=941 && fit.height<=1672,'artwork must not be enlarged');
     assert.ok(Math.abs(fit.width/fit.height-941/1672)<.003,'aspect ratio preserved');
   }
 });
}
test('비정상/초대형 화면 크기는 안전한 캔버스 범위로 제한한다',()=>{
 for(const input of [[NaN,0],[1e6,2e6],[1920,1080]]){
  const size=normalizeScreen(...input);
  assert.ok(size.width>=720 && size.width<=2160 && size.height>=1280 && size.height<=4096);
 }
});
