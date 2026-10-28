import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adviceTopics, chapterAdviceTopics, teaAdviceTopics, neoAdviceTopics } from '../../js/recommendations-context.mjs';
import { cleanProduct, reviewProduct, selectProducts, normalizeContext, validateAffiliateUrl, cleanSettings, providerEnabled } from '../../js/recommendations-core.mjs';
const now = Date.parse('2026-10-09T00:00:00Z');
const product = (id, tag, patch = {}) => reviewProduct(cleanProduct({ id,category:'books',kind:'book',title:id,reason:'일반 소개',practiceTags:[tag],topicReasons:{[tag]:'이 조언의 실천과 책의 내용을 연결합니다.'},interests:['reading'],affiliateUrl:'https://link.coupang.com/a/FixtureOnly',evidence:'mock facts',book:{author:'fixture',publisher:'fixture',edition:'1',language:'ko',format:'paper',editionEvidence:'mock edition',contentsEvidence:'mock contents',audience:'adult',perspective:'practical'},...patch }),{account:true,facts:true,image:true,allowedCategory:true},now);
test('negation, third-person, examples and religious speculation never produce tags',()=>{
  for(const text of ['집착이 강하다는 뜻은 아니다','상대가 불안해할 수 있다','카르마 때문이라고 단정할 수 없다','만약 가계부를 정리하라고 한다면','예를 들어 마음챙김을 해보세요','상대방은 경계를 설정하세요']) assert.deepEqual(adviceTopics([text]),[],text);
  assert.deepEqual(adviceTopics(['마음챙김보다 가계부 정리가 우선']),['budgeting']);
});
test('same service returns different actual practice matches and no generic fallback',()=>{
  const catalogue=[product('habit-book','habit-building'),product('budget-book','budgeting'),product('mindful-book','mindfulness')];
  for(const [text,id] of [['작은 행동을 꾸준히 반복해 보세요','habit-book'],['지출 내역을 정리하세요','budget-book'],['호흡을 살피는 연습을 해보세요','mindful-book']]) assert.deepEqual(selectProducts(catalogue,{service:'saju_mackerel',practiceTags:adviceTopics([text])},now).map(p=>p.id),[id]);
  assert.deepEqual(selectProducts(catalogue,{service:'saju_mackerel'},now),[]);
  assert.deepEqual(selectProducts(catalogue,{service:'recommendations'},now),[]);
});
test('adapters read only action fields, not question, personality or health fields',()=>{
  assert.deepEqual(chapterAdviceTopics([{analysis:['가계부를 정리하세요'],summary:'호흡을 살피세요',advice:'작은 습관을 정해 보세요',questionAnswers:[{mode:'care',action:'가계부를 정리하세요'}]}]),['habit-building']);
  assert.deepEqual(teaAdviceTopics({yeoniReading:{main:'가계부를 정리하세요',advice:'자신의 기준을 세워 보세요'}}),['boundaries']);
  assert.deepEqual(neoAdviceTopics({actionOrders:['지출을 정리하세요']},null),['budgeting']);
  assert.equal(JSON.stringify(normalizeContext({practiceTags:['budgeting'],question:'private',result:'private',religion:'private'})).includes('private'),false);
});
test('provider and exact issued link survive; spoofed providers and cross-provider links fail',()=>{
  const url='https://s.click.aliexpress.com/e/_FixtureOnly';
  assert.equal(validateAffiliateUrl(url,'aliexpress'),true);
  assert.equal(validateAffiliateUrl(url,'coupang'),false);
  assert.equal(validateAffiliateUrl('https://s.click.aliexpress.com.evil.test/e/_x','aliexpress'),false);
  assert.equal(validateAffiliateUrl('https://link.coupang.com/re/AFFSDP?lptag=OTHER&pageKey=1&itemId=2'),false);
  const p=product('ali-fixture','journaling',{providerId:'aliexpress',affiliateUrl:url,currency:'USD'});
  const row=selectProducts([p],{practiceTags:['journaling']},now)[0];
  assert.equal(row.providerId,'aliexpress');assert.equal(row.currency,'USD');assert.equal(row.affiliateUrl,url);
  assert.equal(row.book.author,'fixture');assert.equal('evidence' in row,false);
});
test('books precede relevant supplements; currency budgets never compare KRW and USD',()=>{
  const book=product('book-id','journaling');
  const journal=product('journal-id','journaling',{kind:'journal',featured:true,order:0});
  assert.deepEqual(selectProducts([journal,book],{practiceTags:['journaling']},now).map(p=>p.id),['book-id','journal-id']);
  const usd=product('usd-book','journaling',{currency:'USD',price:10,priceVerifiedAt:new Date(now).toISOString()});
  assert.deepEqual(selectProducts([usd],{practiceTags:['journaling'],maxPrice:20000,currency:'KRW'},now),[]);
});
test('provider settings require documented account/media approval; tracking ID alone cannot activate',()=>{
  const s=cleanSettings({providers:{aliexpress:{trackingId:'NEO2277',enabled:true,approved:true}}});
  assert.equal(providerEnabled(s,'aliexpress'),false);
  assert.equal(providerEnabled({},'unregistered'),false);
});

test('malformed optional advice rows never break consultation rendering',()=>{
  assert.deepEqual(chapterAdviceTopics([null,{questionAnswers:[null,{},'ignored']}]),[]);
  assert.deepEqual(neoAdviceTopics(null,{actionAlternatives:[null,{}]}),[]);
});

test('saved report adapters use explicit action sections without transmitting private prose',async()=>{
 const {reportAdviceTopics}=await import('../../js/recommendations-context.mjs');
 assert.deepEqual(reportAdviceTopics(JSON.stringify({question:'일기를 기록하세요.',sections:{health:{body:'휴식 시간을 확보하세요.'},action_plan:{body:'집중 시간을 확보하세요.\n하루의 생각을 기록하세요.'}}})),['focus','journaling']);
 assert.deepEqual(reportAdviceTopics('## 현재 흐름\n일기를 기록하세요.\n## 추천 행동\n지출 내역을 정리하세요.\n## 건강\n휴식 시간을 확보하세요.'),['budgeting']);
 assert.deepEqual(adviceTopics(['바쁜 일상 속에서도 혼자만의 휴식 시간이 필요합니다.']),['rest']);
 assert.deepEqual(reportAdviceTopics('추천 행동\n지출 내역을 정리하세요.\n건강\n휴식 시간을 확보하세요.'),['budgeting']);
 for(const text of ['일기를 기록하세요.','{"sections":','## 추천 행동\n상대방은 일기를 기록하세요.','## 추천 행동\n일기를 기록하지 마세요.']) assert.deepEqual(reportAdviceTopics(text),[]);
});

test('numbered advice without terminal punctuation remains advice, numbered headings end it', async () => {
 const {reportAdviceTopics}=await import('../../js/recommendations-context.mjs');
 for (const marker of ['1.', '1)']) {
  assert.deepEqual(reportAdviceTopics(`## 실천 조언\n${marker} 집중 시간을 확보하세요\n2. 하루의 생각을 기록하세요\n3. 건강\n휴식 시간을 확보하세요`), ['focus','journaling']);
 }
 assert.deepEqual(reportAdviceTopics('## 실천 조언\n1. 상대방은 일기를 기록하세요\n2. 지출을 정리하지 마세요'), []);
});

test('saved result route projects only completed advice and keeps one bottom mount', async () => {
 const {savedRecommendation}=await import('../../lib/records/recommendations.mjs');
 const content={messages:[{role:'user',content:'## 실천 조언\n지출을 정리하세요'},{role:'assistant',content:'## 실천 조언\n1. 집중 시간을 확보하세요'}],question:'일기를 기록하세요',health:'휴식 시간을 확보하세요'};
 for(const source of ['astrology','vedic']) {
  const result=savedRecommendation({source,status:'completed'},content);
  assert.deepEqual(result.practiceTags,['focus']);
  assert.equal(result.service,source+'-ai-consultation');
  assert.deepEqual(Object.keys(result).sort(),['brand','practiceTags','service']);
 }
 for(const status of ['generating','partial','failed','revoked','refund_pending','conversation']) assert.equal(savedRecommendation({source:'astrology',status},content),null);
 for(const value of [null,{}, {messages:[{role:'user',content:'## 실천 조언\n집중 시간을 확보하세요'}]}]) assert.equal(savedRecommendation({source:'astrology',status:'completed'},value),null);
 assert.equal(savedRecommendation({source:'tea',status:'completed'},content),null);
 assert.equal(savedRecommendation({source:'unknown',status:'completed'},content),null);
 const chapter={advice:'하루의 생각을 기록하세요',summary:'지출을 정리하세요'};
 for(const source of ['chat-consultation','codex']) assert.deepEqual(savedRecommendation({source,status:'completed'},{chapters:[chapter]}).practiceTags,['journaling']);
 assert.deepEqual(savedRecommendation({source:'life-book',status:'saved'},{reportJson:{chapters:[chapter]}}).practiceTags,['journaling']);
 assert.deepEqual(savedRecommendation({source:'neo',status:'completed'},{initialBriefing:{actionOrders:['지출을 정리하세요']}}).practiceTags,['budgeting']);
 assert.deepEqual(savedRecommendation({source:'fusion',status:'completed'},{result:{finalVerdict:{doNow:['집중 시간을 확보하세요']}}}).practiceTags,['focus']);
 assert.deepEqual(savedRecommendation({source:'human-design',status:'completed'},{sections:[{key:'health',keyPoints:['일기를 기록하세요']},{key:'practicalGuide',keyPoints:['집중 시간을 확보하세요']}]}).practiceTags,['focus']);
 const page=readFileSync(new URL('../../app/records/view/SavedRecordClient.tsx',import.meta.url),'utf8');
 assert.equal((page.match(/<RecommendationResult\b/g)||[]).length,1);
 assert.ok(page.indexOf('<RecommendationResult')>page.indexOf('className={styles.readingActions}'));
 assert.match(page,/key=\{`\$\{source\}:\$\{id\}`\}/);
});

test('fusion and human design inspect only explicit action fields', async()=>{
 const {fusionAdviceTopics,humanDesignAdviceTopics}=await import('../../js/recommendations-context.mjs');
 assert.deepEqual(fusionAdviceTopics({finalVerdict:{doNow:['예산을 세워 보세요.']},executiveSummary:'일기를 기록하세요.'}),['budgeting']);
 assert.deepEqual(humanDesignAdviceTopics([{key:'practicalGuide',blocks:[{kind:'steps',items:[{text:'집중 시간을 확보하세요.'}]}]},{key:'health',blocks:[{kind:'steps',items:[{text:'일기를 기록하세요.'}]}]}]),['focus']);
 assert.deepEqual(fusionAdviceTopics({finalVerdict:{doNow:'invalid'}}),[]);
});

test('sukuyo compatibility and the free human design chart read only their action lists', async()=>{
 const {sukuyoCompatAdviceTopics,humanDesignChartAdviceTopics}=await import('../../js/recommendations-context.mjs');
 const filler='두 사람의 대화 흐름을 길게 풀어 쓴 문단이에요. '.repeat(60);
 assert.deepEqual(sukuyoCompatAdviceTopics({communication:{body:filler+'\n집중 시간을 확보하세요.\n1. 저녁마다 그날의 감정을 짧게 기록해 보세요.'},overview:{body:'1. 예산을 세워 보세요.'}}),['journaling']);
 assert.deepEqual(sukuyoCompatAdviceTopics({caution:{body:'- 거절할 때 나의 기준을 먼저 말하세요.'}}),['boundaries']);
 assert.deepEqual(sukuyoCompatAdviceTopics(null),[]);
 const guide={authority:{action:'날짜별 느낌을 일기에 기록해 보세요.'},centers:[{state:'defined',action:'집중 시간을 확보하세요.'},{state:'open',action:'예산을 세워 보세요.'}]};
 assert.deepEqual(humanDesignChartAdviceTopics(guide).sort(),['focus','journaling']);
 assert.deepEqual(humanDesignChartAdviceTopics(null),[]);
});

test('result pair adds action coverage or a practical companion without changing browse order',()=>{
 const book=product('focus-book','focus');
 const duplicate=product('focus-book-two','focus',{order:101});
 const timer=product('focus-timer','focus',{category:'daily-life',kind:'timer',order:102});
 const diary=product('daily-journal','journaling',{kind:'journal',order:103});
 const c={service:'fortune-chat',source:'result',practiceTags:['focus']};
 assert.deepEqual(selectProducts([book,duplicate,timer,diary],c,now).map(p=>p.id),['focus-book','focus-timer']);
 assert.deepEqual(selectProducts([book,duplicate,timer,diary],{...c,practiceTags:['focus','journaling']},now).map(p=>p.id),['focus-book','daily-journal']);
 assert.deepEqual(selectProducts([book,duplicate,timer,diary],{...c,source:'browse'},now).map(p=>p.id),['focus-book','focus-book-two','focus-timer']);
 assert.deepEqual(selectProducts([book,diary],c,now).map(p=>p.id),['focus-book']);
 assert.deepEqual(selectProducts([book,timer],{...c,practiceTags:[]},now),[]);
 const multi=product('multi-journal','focus',{kind:'journal',practiceTags:['focus','journaling'],topicReasons:{focus:'집중 메모',journaling:'하루 회고 기록'}});
 assert.equal(selectProducts([book,multi],{...c,practiceTags:['focus','journaling']},now)[1].reason,'하루 회고 기록');
});

test('symbol accessories can match an explicit browsing purpose without invented colours',()=>{
 const accessory=product('uncoloured-accessory','symbolism',{category:'daily-life',kind:'symbol-accessory',book:null,interests:['collecting'],colors:[],motifs:[]});
 const c={service:'recommendations',source:'browse',practiceTags:['symbolism'],interests:['collecting']};
 assert.deepEqual(selectProducts([accessory],c,now).map(p=>p.id),['uncoloured-accessory']);
 for(const patch of [{interests:[]},{interests:['reading']},{practiceTags:[]},{color:'gold'},{motif:'flower'},{source:'result'},{source:'article'}]) {
   assert.deepEqual(selectProducts([accessory],{...c,...patch},now),[],JSON.stringify(patch));
 }
 const gold=product('gold-accessory','symbolism',{category:'daily-life',kind:'bracelet',book:null,interests:['collecting'],colors:['gold']});
 assert.equal(selectProducts([gold],{...c,color:'gold'},now).length,1);
 assert.deepEqual(selectProducts([gold],{...c,color:'green'},now),[]);
 for(const patch of [{status:'draft'},{stock:'sold-out'},{accountVerified:false},{expiresAt:new Date(now-1).toISOString()}]) {
   assert.deepEqual(selectProducts([{...accessory,...patch}],c,now),[]);
 }
});

test('expanded editorial catalogue matches advice and keeps publication gates closed',()=>{
 const release=JSON.parse(readFileSync(new URL('../../docs/operations/affiliate-release-20261016.json',import.meta.url),'utf8'));
 const ali=JSON.parse(readFileSync(new URL('../../docs/operations/affiliate-aliexpress-20261009.json',import.meta.url),'utf8'));
 const drafts=[...release.products,...ali.products];
 assert.equal(release.settings.enabled,false);
 assert.equal(release.proposedPublication.requiresSeparateApproval,true);
 assert.equal(new Set(drafts.map(p=>p.id)).size,drafts.length);
 assert.ok(drafts.every(p=>p.status==='draft' && !p.accountVerified));
 const catalogue=drafts.map(p=>reviewProduct(cleanProduct(p),{account:true,facts:true,image:true,allowedCategory:true},now));
 const choose=tags=>selectProducts(catalogue,{service:'fortune-chat',source:'result',practiceTags:tags},now);
 for(const [tag,expected] of [
  ['focus',['deep-work-ko','tamsa-focus-timer']],
  ['budgeting',['psychology-money-2026-ko','indigo-budget-cream']],
  ['rest',['mindfulness-poems-ko','bigtree-rest-mask']],
  ['self-compassion',['live-as-me-ko']],
  ['meaning-purpose',['mans-search-meaning-ko']],
 ]) assert.deepEqual(choose([tag]).map(p=>p.id),expected,tag);
 assert.equal(choose(['focus','journaling'])[1].id,'reflection-notebook-pair');
 assert.deepEqual(choose([]),[]);
 assert.deepEqual(choose(['symbolism','supplement-information']),[]);
 for(const tag of release.selectionStrategy.coverage) assert.ok(choose([tag]).length>0 && choose([tag]).length<=2,tag);
 assert.equal(selectProducts(catalogue,{service:'recommendations',source:'browse',practiceTags:['symbolism'],color:'pink'},now)[0].id,'rosequartz-pink-6mm');
 assert.deepEqual(selectProducts(catalogue.map(p=>({...p,stock:'sold-out'})),{service:'fortune-chat',practiceTags:['focus']},now),[]);
 assert.deepEqual(selectProducts(catalogue,{service:'fortune-chat',practiceTags:['focus']},now+31*86400000),[]);
});
