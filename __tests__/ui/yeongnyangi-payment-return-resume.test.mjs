import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';

// S6(2026-11-18): 채팅 안 결제창에서 모바일 PG 가 돌아오면 복귀 URL 에 PG 쿼리가 붙어 대화 초안이 복원되지 않고,
// 결제 시트가 마운트되지 않아 'yeongnyangi-checkout' 재개 핸들러가 없었다 — 결제 뒤 생성 중 화면으로 못 갔다.
const bundle=await build({stdin:{contents:"export * from './app/yeongnyangi/_lib/result-resume';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const {openYeongnyangiResultFromResume,YEONGNYANGI_RESULT_RESUME_KIND}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const id='a'.repeat(64);

test('resume opens only the frozen yeongnyangi result path',()=>{
 const seen=[];const nav=target=>seen.push(target);
 assert.equal(YEONGNYANGI_RESULT_RESUME_KIND,'yeongnyangi-checkout');
 assert.equal(openYeongnyangiResultFromResume({returnTo:`/yeongnyangi/result/?id=${id}&lang=ko`},nav),true);
 for(const returnTo of ['/yeongnyangi/','https://evil.example/yeongnyangi/result/?id='+id,`/yeongnyangi/result/?id=${id}&next=/x`,null])
  assert.equal(openYeongnyangiResultFromResume({returnTo},nav),false);
 assert.deepEqual(seen,[`/yeongnyangi/result/?id=${id}&lang=ko`]);
});

test('every yeongnyangi page registers the resume handler on PG return documents, and only then',()=>{
 const layout=readFileSync('app/yeongnyangi/layout.tsx','utf8');
 assert.match(layout,/const ResultPaymentResume=dynamic\(\(\)=>import\('\.\/_components\/ResultPaymentResume'\),\{ssr:false\}\);/);
 assert.match(layout,/setPaymentReturn\(isPaymentReturnDocument\(\)\)/);
 assert.match(layout,/return <>\{resume\}\{children\}<\/>;/,'full-screen pages (chat home) must keep the handler');
 assert.match(layout,/data-yn-night lang=\{siteLocale\}>\{resume\}/);
 const component=readFileSync('app/yeongnyangi/_components/ResultPaymentResume.tsx','utf8');
 assert.match(component,/usePaidResume\(YEONGNYANGI_RESULT_RESUME_KIND,args=>openYeongnyangiResultFromResume\(args\)\)/);
 const checkout=readFileSync('app/checkout/YeongnyangiCheckout.tsx','utf8');
 assert.match(checkout,/usePaidResume\(YEONGNYANGI_RESULT_RESUME_KIND,args=>openYeongnyangiResultFromResume\(args\)\)/);
});
