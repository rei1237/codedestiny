const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function fixture(storageKey,saved){
 const source=fs.readFileSync('app/fusion-fortune/_lib/toc.ts','utf8');
 const code=source.slice(source.indexOf('export function useFusionToc')).replace('export function','function');
 const effects=[],frames=[],opened=[],scrolled=[],storage=new Map(saved||[]);let observer;
 const anchor={getAttribute:()=> 'sajuSection'};
 const ctx=vm.createContext({useRef:value=>({current:value}),useMemo:fn=>fn(),useState:value=>[value,()=>{}],useCallback:fn=>fn,useEffect:fn=>effects.push(fn),
 useFusionSharedCopy:()=>({systemLabels:{saju:'사주'}}),SECTION_KEYS:['sajuSection'],SECTION_SYSTEM_KEYS:['saju'],countResultChars:()=>100,countSectionChars:()=>100,countTimingChars:()=>100,countVerdictChars:()=>100,
 IntersectionObserver:class{constructor(fn){observer=fn}observe(){}disconnect(){}},localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},
 window:{matchMedia:()=>({matches:true})},document:{getElementById:id=>({scrollIntoView:()=>scrolled.push(id)})},requestAnimationFrame:fn=>frames.push(fn),
 result:{openingMessage:'서문',sajuSection:{content:'본문'}},scope:{current:{querySelectorAll:()=>[anchor]}},onOpenSection:key=>opened.push(key),storageKey,
 });
 vm.runInContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,ctx);
 vm.runInContext('useFusionToc(result,scope,onOpenSection,storageKey)',ctx);effects.forEach(fn=>fn());frames.forEach(fn=>fn());
 return{storage,opened,scrolled,visible:()=>observer([{target:anchor,isIntersecting:true}])};
}
test('fusion restores the saved chapter and preserves account/result isolation',()=>{
 const key='cdFusionReading:owner-a:request-a',f=fixture(key,[[key,'sajuSection'],['cdFusionReading:owner-b:request-a','closing']]);
 assert.deepEqual(f.opened,['sajuSection']);assert.deepEqual(f.scrolled,['fusion-toc-sajuSection']);f.visible();
 assert.equal(f.storage.get(key),'sajuSection');assert.equal(f.storage.get('cdFusionReading:owner-b:request-a'),'closing');
});
test('fusion waits for a later saved chapter without overwriting its position',()=>{
 const key='cdFusionReading:owner-a:request-a',f=fixture(key,[[key,'closing']]);f.visible();assert.equal(f.storage.get(key),'closing');assert.deepEqual(f.scrolled,[]);
});
