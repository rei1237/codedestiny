import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';
import {CUSTOMER_REVIEWS,splitReviews,visibleReviews,postedMonth} from '../../lib/brand/customer-reviews.mjs';
import {EXPERTISE_FACTS} from '../../lib/brand/expertise-facts.mjs';

const require=createRequire(import.meta.url),Module=require('node:module');
// 후기 원문(블로그 캡처와 3회 대조)이 바뀌면 실패한다. 의도한 수정이면 이미지 재대조 후에만 갱신한다.
const REVIEWS_SHA256='3d016255d76987f19ea703ea6eee5aa5d2975a573130aceda4f309360ca6c017';
const BANNED=/유일|100%|정확히 적중|항상 맞는|최고|대통령/;
const base={id:'kakao-x',source:'kakao',service:'neo-1on1',postedAt:'2025-03-30',consent:true,visible:true,featured:false,bubbles:['감사합니다']};

async function renderFounderTrust(){
 const bundle=await build({stdin:{contents:"export {default} from './app/components/FounderTrust';",resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',loader:{'.css':'empty','.module.css':'empty'},external:['react','react/jsx-runtime','react-dom']});
 const loaded=new Module(path.resolve('founder-trust-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 return renderToStaticMarkup(React.createElement(loaded.exports.default));
}

test('review texts stay byte-identical to the verified originals',()=>{
 const digest=createHash('sha256').update(JSON.stringify(CUSTOMER_REVIEWS.map(r=>[r.id,r.postedAt,r.bubbles]))).digest('hex');
 assert.equal(digest,REVIEWS_SHA256);
 assert.equal(new Set(CUSTOMER_REVIEWS.map(r=>r.id)).size,CUSTOMER_REVIEWS.length);
 assert.equal(postedMonth({postedAt:'2025-03-30'}),'2025.03');
});

test('only explicitly consented, visible and complete reviews are published',()=>{
 assert.deepEqual(visibleReviews([base]).map(r=>r.id),['kakao-x']);
 for(const broken of [{consent:undefined},{consent:'true'},{visible:false},{postedAt:'2025.03'},{bubbles:[]},{bubbles:['  ']},{id:''}]){
  assert.deepEqual(visibleReviews([{...base,...broken}]),[],JSON.stringify(broken));
 }
 assert.deepEqual(visibleReviews(null),[]);
 assert.deepEqual(splitReviews(3,[]),{lead:[],rest:[]});
});

test('featured reviews lead and the rest keep their original order',()=>{
 const {lead,rest}=splitReviews(3);
 assert.deepEqual(lead.map(r=>r.id),CUSTOMER_REVIEWS.filter(r=>r.featured).map(r=>r.id));
 assert.deepEqual(rest.map(r=>r.id),CUSTOMER_REVIEWS.filter(r=>!r.featured).map(r=>r.id));
 const list=[{...base,id:'a'},{...base,id:'b',featured:true},{...base,id:'c'}];
 assert.deepEqual(splitReviews(2,list).lead.map(r=>r.id),['b','a']);
 assert.deepEqual(splitReviews(2,list).rest.map(r=>r.id),['c']);
});

test('trust copy has no superlatives, guarantees or political claims',()=>{
 for(const review of CUSTOMER_REVIEWS) for(const text of review.bubbles) assert.doesNotMatch(text,BANNED,review.id);
 for(const fact of EXPERTISE_FACTS) assert.doesNotMatch(fact.ko,BANNED,fact.key);
 const founder=readFileSync('lib/brand/founder.ts','utf8').match(/offerHeadline:[^\n]+/)[0];
 assert.doesNotMatch(founder,BANNED);
});

test('static home shell carries the featured reviews verbatim and no evidence link',()=>{
 const shell=readFileSync('index.html','utf8'),{lead}=splitReviews(3);
 assert.equal(shell.match(/class="cdh-kakao__card"/g)?.length,lead.length);
 const escape=text=>text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/\n/g,'<br>');
 for(const review of lead) for(const text of review.bubbles) assert.ok(shell.includes('<p>'+escape(text)+'</p>'),review.id);
 assert.doesNotMatch(shell,/neosaju|cdh-prediction-records/);
});

test('founder trust renders every review once with disclaimers and no evidence link',async()=>{
 const html=await renderFounderTrust();
 assert.match(html,/1회 30만원 1:1 상담으로 풀던 사주를, 이제 천원에/);
 assert.equal(html.match(/<article/g).length,visibleReviews().length);
 assert.match(html,new RegExp(`후기 ${visibleReviews().length-3}개 더 보기`));
 assert.match(html,/개인 경험에 따른 후기이며 결과를 보장하지 않습니다\. 사주 풀이는 참고용 정보입니다\./);
 assert.match(html,/천원 상담은 계산 엔진과 AI 해설로 제공돼요/);
 assert.equal(html.match(/<li>/g).length,EXPERTISE_FACTS.length);
 assert.doesNotMatch(html,/neosaju|blog\.naver|founder-timeline|target="_blank"/);
 assert.doesNotMatch(html.replace(/<[^>]+>/g,''),BANNED);
});
