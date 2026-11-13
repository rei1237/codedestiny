// Local planning tool only. Source registries are not imported into the miniapp.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {SAJU_BUNDLE_ALIAS_MEMBER_KEYS,SAJU_BUNDLE_SALE_CLOSED_KEYS,SAJU_BUNDLE_FEATURE_KEY} from '../../worker/lib/saju-bundle-policy.js';
import {loadTsModule} from '../../scripts/lib/load-ts-module.mjs';
import {extractObjectLiteral} from '../../scripts/lib/feature-marketing-extract.mjs';
import {APPROVED_TOSS_PRODUCTS} from '../../worker/toss/catalog.js';
import {reviewServices} from '../../apps/toss/src/review-scope.mjs';
import {isFreeFortuneFeatureKey} from '../../lib/payment/free-fortune-policy.mjs';
import {TOSS_PUBLIC_SECTIONS} from '../../lib/fortune/toss-public-sections.mjs';
import {TOSS_TAROT_LIBRARY_FLOWS} from '../../lib/tarot/toss-library-flows.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'js/core/service-registry.js'),'utf8'),context);
const react=loadTsModule('app/_lib/serviceFeatureRegistry.ts').SERVICE_FEATURES;
const visual=extractObjectLiteral(fs.readFileSync(path.join(root,'index.html'),'utf8'),'FEATURE_VISUAL_DETAILS');
const sources=[
 ...context.window.__cdServiceRegistry.map(v=>({source:'home-registry',id:v.id,name:v.name,entry:v.href||v.action,featureKey:v.featureKey||null,accessEvidence:v.price||null})),
 ...react.map(v=>({source:'react-registry',id:v.slug,name:v.title,entry:v.launchRoute,featureKey:v.featureKey||null,accessEvidence:v.accessType})),
 ...Object.entries(visual).map(([id,v])=>({source:'shell-visual-details',id,name:v.title||id,entry:v.href||v.sourceAction||null,featureKey:v.featureKey||null,accessEvidence:null})),
];
const ids=new Map();
for(const item of sources){
 if(!ids.has(item.id))ids.set(item.id,{id:item.id,name:item.name,evidence:[],toss:{screen:'not-ported',login:'not-verified',iapSku:null,result:'not-verified',library:'not-verified',device:'not-tested'}});
 ids.get(item.id).evidence.push(item);
}
// Explicitly requested surfaces that can be absent from the discovery registries.
for(const [id,name,entry] of [['flower','운명의 꽃','app/flower/page.tsx'],['yeongnyangi','영냥이','app/yeongnyangi/page.tsx']]){
 if(!ids.has(id))ids.set(id,{id,name,evidence:[{source:entry,entry:'/'+id+'/'}],toss:{screen:id==='yeongnyangi'?'saju-preview-only':'not-ported',login:'not-verified',iapSku:null,result:'not-verified',library:'not-verified',device:'not-tested'}});
}
const rows=[...ids.values()].sort((a,b)=>a.id.localeCompare(b.id));
const aliases={
 'destiny-flower':'flower','astrology-flower':'flower','ziwei-flower':'flower','sukuyo-flower':'flower',
 sukyo:'sukuyo','stonehenge-rune':'stonehenge-runes','love-simulation':'love-code',
 'daily-fortune':'today-hub','saju-lifebook':'life-book-ai','animal-guardian-unlock':'animal-destiny','saju-animal':'saju-guardian',
};
const aliasEvidence={
 flower:['app/flower/destiny/page.tsx','app/flower/astrology/page.tsx','app/flower/jamidusu/page.tsx','app/flower/sukuyo/page.tsx'],
 sukuyo:['js/core/service-registry.js','app/_lib/serviceFeatureRegistry.ts'],
 'stonehenge-runes':['js/core/index-inline-runtime.js:openRuneOracle'],
 'love-code':['js/core/index-inline-runtime.js:openLoveSimulation'],
 'today-hub':['js/core/service-registry.js'],
 'life-book-ai':['js/core/service-registry.js','app/_lib/serviceFeatureRegistry.ts'],
 'animal-destiny':['js/core/service-registry.js:animal-destiny-unlock','index.html:animal-guardian-unlock.inlineAliases'],
 'saju-guardian':['index.html:openSajuGuardianPage -> /saju-guardian','app/_lib/serviceFeatureRegistry.ts:saju-animal.launchRoute','app/saju-guardian/SajuGuardianClient.tsx:verifyGuardianUnlockAccess; registry free/paid descriptions conflict'],
};
const groups=new Map();
// These entries are reached from the current root or from an existing report.
// A shared product or URL does not imply the same input or result.
for(const [id,name,entry,implementation] of [
 ['home-widget','홈 화면 꾸미기','/app/home-widget/','app/app/home-widget/page.tsx'],
 ['consultation-webtoons','상담 세계관 웹툰','/consultations/','app/consultations/StoryDiscovery.tsx'],
 ['yeongnyangi-season','영냥이 시즌 연재','/yeongnyangi/season-1/','app/yeongnyangi/season-1/page.tsx'],
 ['heukwol-story','흑월 이야기','/heukwol/#heukwol-story','app/heukwol/page.tsx'],
 ['island-consult','자미두수 섬 해설·궁별 상담','/island-consult/','app/island-consult/IslandConsultClient.tsx'],
 ['yeongnyangi-prashna','프라쉬나 질문 상담','/yeongnyangi/fortune/?mode=prashna','app/yeongnyangi/_components/QuestionSkyConsultation.tsx'],
 ['yeongnyangi-horary','호라리 질문 차트','/yeongnyangi/fortune/?mode=horary','app/yeongnyangi/_components/QuestionSkyConsultation.tsx'],
 ['yeongnyangi-daily','영냥이 출석과 오늘의 운세','/yeongnyangi/free-fortune/','app/yeongnyangi/_components/FreeFortune.tsx'],
 ['neo-letter','네오 상담 편지','/fortune-chat/?character=neo','app/fortune-chat/ConsultationRoom.tsx'],
]){
 if(!fs.existsSync(path.join(root,implementation)))throw new Error('Missing web entry: '+implementation);
 groups.set(id,{id,discoveryIds:[],evidence:[{name,entry,implementation}],aliasEvidence:id==='yeongnyangi-prashna'?['app/yeongnyangi/_components/Experience.tsx: mode=spirit → prashna-v1']:[],status:'not-ported',tossRoute:null,sku:null,inputContract:null,resultRenderer:null,storageContract:null});
}
for(const row of rows){
 const canonicalId=aliases[row.id]||row.id;
 if(!groups.has(canonicalId))groups.set(canonicalId,{id:canonicalId,discoveryIds:[],evidence:[],aliasEvidence:aliasEvidence[canonicalId]||[],
  status:'requires-full-flow-port-and-verification',tossRoute:null,sku:null,inputContract:null,resultRenderer:null,storageContract:null});
 const group=groups.get(canonicalId);group.discoveryIds.push(row.id);group.evidence.push(...row.evidence);
}
if(groups.has('saju-guardian'))groups.get('saju-guardian').verification='same screen; free registry description conflicts with paid unlock evidence; access contract must be reconciled before port';
for(const [id,entry,api] of [['pet-saju','pet-saju.html','/api/pet-saju/blueprint'],['ziwei-island','destiny-island.html','/api/ziwei-island/blueprint']]){
 if(!fs.readFileSync(path.join(root,'index.html'),'utf8').includes('/'+entry))throw new Error('Missing active entry: '+entry);
 if(!fs.readFileSync(path.join(root,entry),'utf8').includes(api))throw new Error('Missing calculation API: '+api);
 groups.set(id,{id,discoveryIds:[],evidence:[{source:'index.html',entry:'/'+entry,api}],status:'not-ported',tossRoute:null,sku:null,inputContract:null,resultRenderer:null,storageContract:null});
}
// The Saju result dashboard has an independently billed consultation that is
// absent from all three registries. It is not the villain blacklist.
const dashboard=fs.readFileSync(path.join(root,'js/core/saju/reportDashboard.js'),'utf8');
if(!dashboard.includes("id:'relationshipTemptation'")||!dashboard.includes("'/relationship-boundary-test/'")||!dashboard.includes('relationshipBoundaryTestEntry'))throw new Error('Missing standalone relationship consultation evidence');
if(!fs.existsSync(path.join(root,'app/relationship-boundary-test/page.tsx'))||!fs.readFileSync(path.join(root,'worker/routes/relationship-boundary-test.js'),'utf8').includes('"relationship-boundary-test"'))throw new Error('Missing relationship consultation implementation');
groups.set('relationship-boundary-test',{id:'relationship-boundary-test',discoveryIds:[],evidence:[{source:'js/core/saju/reportDashboard.js:relationshipTemptation',entry:'/relationship-boundary-test/',implementation:'app/relationship-boundary-test/page.tsx',featureKey:'relationship-boundary-test',accessEvidence:'independent paid report'}],status:'not-ported',tossRoute:null,sku:null,inputContract:null,resultRenderer:null,storageContract:null,verification:'separate from relationship-boundaries (villain blacklist); purchase, stored results, policy and Toss flow unverified'});
for(const [card,id,target] of [['meryok','personal-charm','specialCharmCard'],['quantum','quantum-saju','quantumCard'],['sajuhealth','health-rhythm','healthReportCard'],['sajurpg','life-skill-tree','skillTreeCard'],['trip','energy-travel','energyCoordCard'],['vilun','relationship-boundaries','villainCard']]){
 if(!dashboard.includes(`id:'${card}'`)||!dashboard.includes(`target:'${target}'`)||!visual[id]?.inlineAliases?.includes(`rpt_${target}`)||!groups.has(id))throw new Error(`Missing dashboard alias evidence: ${card}`);
 groups.get(id).aliasEvidence.push(`js/core/saju/reportDashboard.js:${card} -> ${target}`,`index.html:${id}.inlineAliases -> rpt_${target}`);
}
// These are reachable cards within the still-unported Saju result. Track them
// as unresolved subflows until their individual rights and aliases are proven.
const sajuCards=[['sajuprompt','aiPromptCard'],['tbal','tTestCard'],['tetoegen','hormone-vibe-section'],['lotto','lottoCard'],['4CUT','sajuFourCutCard'],['dopamine','dopamineCard']];
for(const [id,target] of sajuCards)if(!dashboard.includes(`id:'${id}'`)||!dashboard.includes(`target:'${target}'`))throw new Error(`Missing Saju result card: ${id}`);
if(!groups.has('saju')||!groups.has('luck-sync-diary'))throw new Error('Missing parent candidate for Saju or diary');
groups.get('saju').subfeatures=sajuCards.map(([id,target])=>({id,target,source:'js/core/saju/reportDashboard.js',status:'requires-full-flow-port-and-verification',accessEvidence:id==='lotto'?'dashboard says Saju bundle; separate entitlement mapping unverified':'dashboard points to section_summary; historic rights unverified'}));
if(!context.window.__cdServiceRegistry.some(row=>row.href==='/diary/')||!fs.readFileSync(path.join(root,'js/core/index-inline-runtime.js'),'utf8').includes('window.openLegacyLuckSyncDiary =')||!fs.readFileSync(path.join(root,'js/core/index-inline-runtime.js'),'utf8').includes("location.assign('/diary/')"))throw new Error('Missing new or legacy diary entry');
groups.get('luck-sync-diary').subfeatures=[{id:'fortunePlanner',entry:'/diary/',status:'requires-full-flow-port-and-verification'},{id:'legacyLuckSyncDiary',entry:'js/luck-sync-diary.js:openLegacyLuckSyncDiary',status:'requires-full-flow-port-and-verification',verification:'legacy stored records and migration not verified'}];
const localEvidence={
 'dream':{tossRoute:'/dream/tarot',status:'local-partial',inputContract:'index.html:openDreamModal + js/dream-ledger.js → worker/routes/dream.js → lib/tarot/dream-prompt.mjs',resultRenderer:'apps/toss/src/DreamPrompt.tsx',storageContract:'게스트 현재 화면 및 원문 복사. 정신분석 해몽은 별도 유료 기능',verification:'360px 일반 홈에서 1~5장 원본 카드와 프롬프트, 잘못된 입력 및 다시 쓰기 검증'},
 'mbti-animal-compat':{tossRoute:'/mbti/animals',status:'local-partial',inputContract:'js/astral-soul.js:ASTRAL_DATA / getPairScore / getSynergyText',resultRenderer:'apps/toss/src/AstralAnimals.tsx',storageContract:'게스트 화면 계산. 두 동물 256쌍 원본 점수·조언',verification:'astral-animals.test.mjs + 일반 홈 두 동물 선택'},
 'ifa-oracle':{tossRoute:'/oracle/ifa',status:'local-partial',inputContract:'public/ifa-oracle.html 여덟 표식, 오두 256개, 네 주제',resultRenderer:'apps/toss/src/IfaReading.tsx',storageContract:'현재 화면. 토스 저장·공유는 실기기 확인 필요',verification:'ifa-reading.test.mjs, 360px public-readings-browser.mjs 네 가지 주제'},
 'consultation-webtoons':{tossRoute:'/consultations/stories',status:'local-partial',inputContract:'app/consultations/home-stories.ts + lib/brand/consultation-webtoons.mjs',resultRenderer:'apps/toss/src/StoryLibrary.tsx + app/components/webtoon/CutReader.tsx',storageContract:'게스트 공개 14편. 읽던 이야기는 URL의 story로 유지',verification:'Vite 배포본 360px에서 14편 전체 컷 수와 대사, 원본 그림 디코딩. 원격 이미지 실기기 확인 필요'},
 'heukwol-story':{tossRoute:'/consultations/stories?story=heukwol',status:'local-partial',inputContract:'app/heukwol/FateWarningEpisode.tsx 및 원본 12컷',resultRenderer:'apps/toss/src/StoryLibrary.tsx + app/components/webtoon/CutReader.tsx',storageContract:'공개 서장. 유료 흑월 상담과 별도',verification:'story-library-browser.mjs 360px 12컷 원본 텍스트 비교'},
 'neo-letter':{tossRoute:'/fortune-tea-house/?counsel=letter&persona=neo',status:'local-partial',inputContract:'app/fortune-chat/ConsultationIntake.tsx + worker/toss/letter.js',resultRenderer:'apps/toss/service/TossLetterRoom.tsx + app/fortune-chat/ConsultationResult.tsx',storageContract:'꿀꿀운세 구매 기록. 상담자·계정·주문 소유권 검사',verification:'letter-browser.mjs 360px 두 상담자의 사주 결과 및 계정 교체. 각 6개 분야 mock 상품 매핑'},

 'animal-destiny':{tossRoute:'/saju/animal-destiny',status:'local-partial',inputContract:'lib/korean-calendar/natal.js:calculateNatalSaju',resultRenderer:'apps/toss/src/AnimalDestiny.tsx',storageContract:'화면 메모리. 계정 변경 시 TossSessionScope 재설정'},
 'career-style':{tossRoute:'/saju/career-style/',status:'local-partial',inputContract:'worker/routes/career-style.js:readOwnedCareerStyle',resultRenderer:'apps/toss/service/TossCareerStyle.jsx + app/saju/career-style/CareerStyleClient.tsx',storageContract:'계정별 프로필을 사용한 무료 개인 명식 8장. 실기기 미검증'},
 'yeongnyangi-horary':{tossRoute:'/yeongnyangi/fortune/?mode=horary',status:'local-partial',inputContract:'worker/yeongnyangi/fortune/free/horary.ts',resultRenderer:'app/yeongnyangi/_components/QuestionSkyConsultation.tsx',storageContract:'무료 질문 시각·도시 차트. 유료 결과 보관 계약 없음'},
 'yeongnyangi-prashna':{tossRoute:'/yeongnyangi/fortune/?mode=spirit',status:'local-partial',inputContract:'worker/yeongnyangi/fortune/question-sky.ts',resultRenderer:'app/yeongnyangi/_components/QuestionSkyConsultation.tsx',storageContract:'영냥이 질문점성술 별도 권한. 일반 사주 승인 SKU로 구매 가능하다고 보지 않는다'},
 ziwei:{tossRoute:'/ziwei/chart',status:'local-partial',inputContract:'BirthFields + normalizeZiweiInput + calculateZiweiChart; domestic locations only',resultRenderer:'apps/toss/src/ZiweiChart.tsx + canonical ZiweiPalaceGrid',storageContract:'current screen only; clear input and chart on session replacement or exit',verification:'basic twelve-palace chart only; original detailed readings, profile recovery, device navigation and accessibility pending'},
 'pet-saju':{tossRoute:'/pet-saju/',status:'local-partial',inputContract:'worker/toss/pet-saju.js deterministic blueprint + worker/toss/pet-paid-contract.js paid inputs',resultRenderer:'apps/toss/service/TossPetSaju.tsx with original sprite artwork and paid report reader',storageContract:'up to five free pet inputs in current screen memory; no app-restart or cross-device recovery of that list. Paid results use an owned order and intent in worker/toss/native-pet-paid.js',verification:'local mock covers all 10 free species, paid report and compatibility checkout, intent resume, library ownership and recovery. Original screen displays 3000 KRW per paid feature while server registry specifies 5000 KRW; approved SKUs, saved pets, device verification and official purchase recovery remain pending'},
 'relationship-boundary-test':{tossRoute:'/relationship-boundary-test/',status:'local-partial',inputContract:'worker/routes/relationship-boundary-test.js:nativeRelationshipContract + worker/toss/native-relationship.js',resultRenderer:'apps/toss/service/TossRelationship.tsx + app/relationship-boundary-test/RelationshipReportParts.tsx',storageContract:'owner-scoped Toss intent and relationship report, paid-order check before results and resume; production index and approved SKU pending',verification:'local mock checkout, price changes, account and refund boundaries, partial result, recovery and native back; order buyer binding, order-ID-less checkout uncertainty, generation failure handling, policy and official device remain unverified'},
 'human-design':{tossRoute:'/human-design',status:'local-partial',inputContract:'worker/toss/human-design.js + original human-design ephemeris',resultRenderer:'apps/toss/src/HumanDesignChart.tsx + original interactive BodyGraph and DetailSheet',storageContract:'screen-only free chart; no saved result or cross-device recovery',verification:'offline mock and local Swiss ephemeris (one independently recorded 26-activation chart), original graph, calendar, auth, session and back checks; full free-screen parity, production astronomy configuration, previously paid guides, premium report and official device remain unverified'},
 psychotest:{tossRoute:'/psychotest/',status:'local-partial',inputContract:'22 original tests in src/features/psychotest/data/testData.ts',resultRenderer:'apps/toss/service/TossPsychotest.tsx + src/features/psychotest/TestPlayer.tsx',storageContract:'owner-scoped in-memory results for the current screen session only; app restart and cross-device recovery absent',verification:'local React mock exercises 22 result paths, back, account switch and clipboard permissions; clinical wording and fabricated fixed trait scores narrowed for Toss; complete editorial audit, official policy, screen-reader and device verification pending'},
 omikuji:{tossRoute:'/omikuji/',status:'local-partial',inputContract:'public/emoi_omikuji_v2.html canonical deterministic engine',resultRenderer:'apps/toss/service/TossOmikuji.jsx',storageContract:'signed-in owner-scoped session-only input and result recovery; guest result remains in memory; no cross-device record',verification:'local React mock validates draw, reroll, back, session restore, account switch, clipboard permission and native share; guest recovery, official device, console permission and policy verification pending'},
 maya:{tossRoute:'/maya/',status:'local-partial',inputContract:'worker/toss/maya-contract.js',resultRenderer:'apps/toss/service/TossMayaPrompt.tsx + src/components/maya/MayaCalendarView.tsx',storageContract:'owner-scoped prepared input, paid prompt and explicit unassigned-order recovery; production index and approved SKU pending',verification:'mock purchase, account/refund checks and draft recovery; source UI 3000 KRW conflicts with server registry 5000 KRW, actual SKU price, external-AI prompt policy and official device not verified'},
 novel:{tossRoute:'/novel',status:'local-partial',inputContract:'Korean transcript; original manifest, cast and ending choices',resultRenderer:'apps/toss/src/NovelReader.tsx',storageContract:'in-screen reading position only; persistent bookmark, visual/audio and device parity pending'},
 'famous-saju':{tossRoute:'/insights/famous-saju',status:'local-partial',inputContract:'published profile search by name, alias or field',resultRenderer:'apps/toss/src/FamousSaju.tsx',storageContract:'public articles only; historical archive, detail deep links and device parity pending'},
 music:{tossRoute:'/music',status:'local-partial',inputContract:'stream list projected from original track manifest and free_full policy only',resultRenderer:'apps/toss/src/MusicShelf.tsx',storageContract:'stream only; paid downloads, library and device audio parity pending'},
 astrology:{tossRoute:'/astrology',status:'local-partial',inputContract:'authenticated birth input; precise Swiss tropical/Placidus chart',resultRenderer:'apps/toss/src/BasicSkyChart.tsx',storageContract:'result in memory only; guest/web profiles, wheel, original unlocks and device parity pending'},
 vedic:{tossRoute:'/vedic',status:'local-partial',inputContract:'authenticated birth input; precise Swiss sidereal/Lahiri chart',resultRenderer:'apps/toss/src/BasicSkyChart.tsx',storageContract:'result in memory only; guest/web profiles, full chart and device parity pending'},
 nakshatra:{publicSubflows:['/nakshatra/codex','/nakshatra/codex/[0..26]'],verification:'Public atlas only; paid personal reading has no Toss order flow. Remains on remainingPorts.'},
 saju:{tossRoute:'/saju/basic/play',status:'local-partial',inputContract:'shared natal engine; Korean city, solar/lunar/leap and unknown hour',resultRenderer:'apps/toss/src/BasicSajuReading.tsx',storageContract:'memory-only free basic chart; web result and device parity pending'},
 manse:{tossRoute:'/manse',status:'local-partial',inputContract:'worker/toss/manse.js (canonical screen saju engine)',resultRenderer:'apps/toss/src/ManseReading.tsx',storageContract:'screen-only; web-profile-history-parity-pending'},
 sukuyo:{tossRoute:'/sukuyo',status:'local-partial',inputContract:'worker/toss/sukuyo-basic.js + canonical Sukuyo domain and free dashboard',resultRenderer:'apps/toss/src/SukuyoBasic.tsx',storageContract:'screen-only; no result storage or cross-device recovery',verification:'local offline canonical calculation plus 27 synthetic lunar sectors, home/direct route, native-back and session-isolation checks; original annual flow, relationship tools, paid nature/compatibility rights, editorial review and official device remain incomplete'},
 flower:{tossRoute:'/flower',status:'local-partial',inputContract:'worker/toss/flower.js',resultRenderer:'apps/toss/src/FlowerReading.tsx',storageContract:'not-stored-by-current-policy'},
 'bias-destiny':{tossRoute:'/bias',status:'local-partial',inputContract:'app/saju/destiny-bias/engine/chemiReportBridge.ts',resultRenderer:'apps/toss/src/BiasReading.tsx + BiasReport.tsx',storageContract:'native-card-save-summary-share-mocked; device-and-web-history-parity-pending'},
 yeongnyangi:{tossRoute:'/yeongnyangi/fortune/',status:'local-partial',inputContract:'worker/toss/routes.js',resultRenderer:'app/yeongnyangi/_components/Result.tsx',storageContract:'owner-bound TossPurchase and YeongnyangiRequest; /yeongnyangi/library/'},
 'fortune-chat':{tossRoute:'/fortune-tea-house/?counsel=letter',status:'local-partial',inputContract:'worker/toss/letter.js + worker/toss/services.js',resultRenderer:'apps/toss/service/TossLetterRoom.tsx + app/fortune-chat/ConsultationIntake.tsx',storageContract:'persona-bound-TossPurchase-to-YeongnyangiRequest; official device and approved SKU pending',verification:'original Yeoni letter intake and owner-bound recovery are mocked; full web parity and device tests pending'},
 'today-hub':{tossRoute:'/today',status:'local-partial',inputContract:'24개 별자리·띠와 오늘·내일·이번 주·이번 달 선택. 원본 loadWeekRange·loadMonthRange·computeSignScore·getPeriodReading. 오늘·내일 네 체계는 날짜 또는 소유 프로필 선택',resultRenderer:'apps/toss/src/TodayPublic.tsx + TodayPersonal.tsx + app/today/DailyTarot.tsx',storageContract:'별자리·띠 공개. 원본 오늘의 세 장은 로그인 후 계정별 기기 저장·재열람',verification:'360px apps/toss/test/studio-today-browser.mjs: 공개 주간·월간→mock 로그인→소유 프로필 네 체계→세 장→재시작. worker/toss/today-hub.js → worker/routes/fortune-today.js 정본. __tests__/worker/toss-today-hub.test.js 소유 검증. 실기기와 운영 계산의 연결은 미검증'},
 'juyuk-turtle':{tossRoute:'/oracle/turtle',status:'local-partial',inputContract:'js/iching-engine.js 원본 질문·2.2초 길게 누르기·seed·상하괘·64괘, 7장과 전문가 프롬프트. 무료 키 openJuyukModal',resultRenderer:'apps/toss/src/TurtleOracle.tsx + apps/toss/canonical/turtle-oracle.mjs',storageContract:'게스트 공개, 화면 결과. 기존 웹 주문 정책과 별개',verification:'studio-turtle-browser.mjs: 360px 게스트 홈→질문→짧게 누르기 취소→길게 누르기→7장/원문 프롬프트. 64괘 계산 비교. 실기기 제스처·클립보드 미검증'},
 'yeongnyangi-season':{tossRoute:'/moonlight/season-1',status:'local-partial',inputContract:'영냥이의 점술방 시즌 1 → 공개 회차 → 다음/이전 쪽. 웹 serial.mjs 게이트가 빌드 때 공개한 회차만 열람',resultRenderer:'apps/toss/src/MoonlightSeason.tsx + apps/toss/canonical/moonlight-season.mjs',storageContract:'게스트 공개. 원본 크롬과 같은 회차별 기기 이어보기. 다음 회차 번호와 시각만 사전 안내',verification:'studio-season-browser.mjs: 360px 영냥이 홈→1화 18쪽 원본, 이미지 오류 대체 대사·재시도, 재실행→3쪽, 열람 종료. 실기기 이미지 호스트 연결 미검증'},
 'cosmic-soul-meditation':{tossRoute:'/meditation/cosmic',status:'local-partial',inputContract:'cosmic-soul-meditation.html 의도 4개, 30·60분 PHASES, 웹의 _composePhaseLines·_scheduleLines·_buildSchedule 원본 함수와 행동·저널',resultRenderer:'apps/toss/src/CosmicMeditation.tsx + apps/toss/canonical/cosmic-sessions.mjs',storageContract:'토스 소유 계정별 기기 저널 최근 50개와 통계. 무료 키 cosmic-soul-meditation',verification:'studio-cosmic-browser.mjs: 360px 홈→로그인→30·60분→원문·일시정지·완주→저널 저장→재실행→같은 단말 다른 계정에서 기록 없음. R2 실제 재생 미검증'},
 'neville-meditation':{tossRoute:'/meditation/neville',status:'local-partial',inputContract:'neville-meditation.html COURSES 30·60분, 시간별 단계·안내와 THETA_PRESETS 세 음악 세트, 웹 로그인 및 무료 기능 키 neville-meditation',resultRenderer:'apps/toss/src/NevilleMeditation.tsx + apps/toss/canonical/neville-courses.mjs',storageContract:'토스 로그인 후 회차별 현재 화면 진행. 주문·LLM 없음',verification:'studio-neville-browser.mjs 360px 홈→mock 로그인→두 코스 일시정지·재개/곡 선택/단계 전환→완주. R2 스트림의 실기기 재생 미검증'},
 'olympus-oracle':{tossRoute:'/olympus',status:'local-partial',inputContract:'웹 /olympus/ → 오늘의 신탁만 보기 → 수동 생년월일. 원본의 12별자리, 수호신, 날짜별 신탁·지령·행운 값',resultRenderer:'apps/toss/src/OlympusDaily.tsx + lib/fortune/olympus-daily.mjs (OlympusVIPLounge.jsx 공유)',storageContract:'게스트 수동 입력, 현재 화면 결과. 꽃돼지 프로필에서 여는 여덟 행성 라운지와 커플 궁합은 별도',verification:'studio-olympus-browser.mjs 360px 홈에서 게스트/별자리 경계 두 날짜/원본 지령과 행운 값 확인. 프로필 인계·여덟 배치와 궁합은 미이식'},
 'stonehenge-runes':{tossRoute:'/oracle/rune',status:'local-partial',inputContract:'StonehengeRune의 네 가지 무료 펼침',resultRenderer:'apps/toss/src/RuneReading.tsx + StonehengeRune.jsx',storageContract:'현재 화면의 원본 룬 결과와 토스 공유. 유료 AI 프롬프트 별도 계약',verification:'350768ae1, 73b5f45f4. 실기기 미검증'},
 'yeongnyangi-daily':{tossRoute:'/daily',status:'local-partial',inputContract:'worker/toss/daily.js',resultRenderer:'apps/toss/src/DailyReadings.tsx',storageContract:'계정별 출석·당일 결과 15종. 호라리는 별도 무료 화면'},
 'fortune-tea-house':{tossRoute:'/fortune-tea-house/',status:'local-partial',inputContract:'worker/toss/native-tea.js',resultRenderer:'apps/toss/service/Screens.jsx',storageContract:'owned-TossPurchase; device-and-console-approval-pending'},
 'saju-fpti':{tossRoute:'/saju-fpti/',status:'local-partial',inputContract:'lib/fpti/fpti-adapter.ts',resultRenderer:'apps/toss/service/TossFpti.tsx',storageContract:'same-tab owner-scoped free result only; profile entitlement and permanent premium report not ported',verification:'mock UI and original calculation only; free-screen parity, approved permanent rights and official device pending'},
 'neo-operation-room':{tossRoute:'/neo-operation-room/',status:'local-partial',inputContract:'worker/toss/native-neo.js',resultRenderer:'apps/toss/service/Screens.jsx',storageContract:'owned-TossPurchase; device-and-console-approval-pending'},
 'fusion-fortune':{tossRoute:'/fusion-fortune/',status:'local-partial',inputContract:'worker/toss/native-fusion.js',resultRenderer:'apps/toss/service/Fusion.jsx',storageContract:'owned-TossPurchase; device-and-console-approval-pending'},
 'life-book-ai':{tossRoute:'/life-book-ai/',status:'local-partial',inputContract:'worker/toss/native-life-book.js',resultRenderer:'apps/toss/service/LifeBook.jsx',storageContract:'owned-TossPurchase; device-and-console-approval-pending'},
 'life-fortune-report':{tossRoute:'/life-book-ai/',status:'local-partial',inputContract:'worker/routes/life-book-ai.js:nativeLifeBookContract (lifeFortune mode)',resultRenderer:'apps/toss/service/LifeBook.jsx + app/life-book-ai/LifeBookAiClient.tsx',storageContract:'owned-TossPurchase with life-fortune-ai-consultation feature; device-and-console-approval-pending',verification:'apps/toss/test/fusion-billing.test.mjs covers payload and request id only; full parity pending'},
 'love-secret-ai':{tossRoute:'/love-secret-ai/',status:'local-partial',inputContract:'worker/toss/native-love-secret.js',resultRenderer:'apps/toss/service/LoveSecret.jsx + app/love-secret-ai/result/LoveSecretAiResultClient.tsx',storageContract:'owned Toss purchase, Toss-origin consultation and verified follow-up recovery; approved SKU, purchaser binding, durable checkout and device verification pending',verification:'mock result and follow-up access, refund and account-switch tests; legacy unmarked web records, AI policy and official device remain unverified'},
 'astrology-ai':{tossRoute:'/astrology-ai/',status:'local-partial',inputContract:'worker/toss/native-astrology.js + nativeAstrologyContract',resultRenderer:'app/astrology-ai/AstrologyAiClient.tsx + app/astrology-ai/result/AstrologyAiResultClient.tsx',storageContract:'owned-TossPurchase and Toss-origin AstrologyAiConsultation; approved SKU, durable checkout, policy and device verification pending',verification:'mock-contracts-only; complete flow and official sandbox not verified'},
 'vedic-ai':{tossRoute:'/vedic-ai/',status:'local-partial',inputContract:'worker/toss/native-vedic.js + nativeVedicContract',resultRenderer:'app/vedic-ai/VedicAiClient.tsx',storageContract:'owned Toss purchase and Toss-origin VedicAiConsultation; approved SKU, durable checkout, policy and device verification pending',verification:'mock contracts, local mobile layout and build only; official Toss device and full flow not verified'},
 'ziwei-ai':{tossRoute:'/ziwei-ai/',status:'local-partial',inputContract:'worker/toss/native-ziwei.js + nativeZiweiContract',resultRenderer:'app/ziwei-ai/ZiweiAiClient.tsx',storageContract:'owned Toss purchase and Toss-origin ZiweiAiConsultation; approved SKU, durable checkout, policy and device verification pending',verification:'mock contracts, local mobile layout and build only; Japanese input states results are Korean; other locale quality, official device and full flow not verified'},
 'new-year-ai':{tossRoute:'/new-year-ai-consultation/',status:'local-partial',inputContract:'worker/toss/native-new-year.js + nativeNewYearContract',resultRenderer:'app/new-year-ai-consultation/NewYearAiClient.tsx',storageContract:'owned Toss purchase and Toss-origin NewYearAiConsultation; approved SKU, durable checkout, policy and device verification pending',verification:'mock contracts, local mobile layout and build only; Japanese input states results are Korean; other locale quality, official device and full flow not verified'},
 'karma-destiny-ai':{tossRoute:'/karma-destiny-ai/',status:'local-partial',inputContract:'worker/toss/native-karma.js + nativeKarmaContract',resultRenderer:'apps/toss/service/TossKarma.tsx + app/karma-destiny-ai/result/KarmaDestinyAiResultClient.tsx',storageContract:'owner-scoped Toss intent and original KarmaDestinyAiConsultation; approved SKU, purchaser binding, durable checkout and device verification pending',verification:'mock purchase, follow-up authorization and recovery, lunar leap validation and local mobile layout only; other locales, AI policy, official device and complete flow not verified'},
 'sukuyo-compatibility-ai':{tossRoute:'/sukuyo-compatibility-ai/',status:'local-partial',inputContract:'worker/toss/native-sukuyo.js + nativeSukuyoContract',resultRenderer:'apps/toss/service/TossSukuyoGate.tsx + app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx',storageContract:'owner-scoped Toss intent and Toss-origin SukuyoCompatibilityAiConsultation; verified saved-input selection or explicit new input for unassigned orders; bounded explicit retry after authorized generation failure',verification:'local SDK mock purchase, result reload, selected-input recovery, account isolation and back-event checks only; production recovery index, approved SKU, purchaser binding, durable checkout, safety policy and official device pending'},
};
// These active library links are absent from all three feature registries.
for(const [id,entry,source] of [
 ['tarot-healing','/tarot/healing/','app/tarot/healing/TarotHealingRouteClient.tsx'],
 ['tarot-self-esteem','/tarot/self-esteem/','js/tarot-self-esteem-experience.js'],
]){
 if(!fs.readFileSync(path.join(root,'index.html'),'utf8').includes(`href="${entry}"`))throw new Error('Missing tarot entry: '+entry);
 groups.set(id,{id,discoveryIds:[],evidence:[{source:'index.html:tarotCollection',entry,implementation:source}],status:'not-ported',tossRoute:null,sku:null,inputContract:null,resultRenderer:null,storageContract:null});
}
// A web section can remain a separate port even when it shares a purchase with other sections.
for(const group of groups.values()){
 const manifestPath='content/product-details/'+group.id+'/manifest.json';
 const manifest=fs.existsSync(path.join(root,manifestPath))?JSON.parse(fs.readFileSync(path.join(root,manifestPath),'utf8')):null;
 const match=[manifest?.featureKey,...group.evidence.map(e=>e.featureKey)].find(key=>SAJU_BUNDLE_ALIAS_MEMBER_KEYS.includes(key));
 if(!match)continue;
 group.webEntitlement={featureKey:match,bundleKey:SAJU_BUNDLE_FEATURE_KEY,birthScoped:true,
   individualSaleClosed:SAJU_BUNDLE_SALE_CLOSED_KEYS.includes(match),
   source:'worker/lib/saju-bundle-policy.js',...(manifest?.featureKey===match?{contentSource:manifestPath}:{})};
}
const house=groups.get('secret-house');
if(house?.webEntitlement?.featureKey==='rpt_secretHouseEntryCard'&&dashboard.includes('/secret-house_real.html')){
 const shell=fs.readFileSync(path.join(root,'secret-house_real.html'),'utf8');
 if(!shell.includes("HOUSE_ENDPOINT='/api/saju/section'")||!shell.includes("HOUSE_FEATURE='rpt_secretHouseEntryCard'"))throw new Error('Secret House access evidence changed');
 house.aliasEvidence.push('js/core/saju/reportDashboard.js -> /secret-house_real.html -> POST /api/saju/section (rpt_secretHouseEntryCard)');
}
for(const [id,fields] of Object.entries(localEvidence))if(groups.has(id))Object.assign(groups.get(id),fields);
const dashboardSections={
 rpt_quantumCard:'quantum-saju',rpt_energyCoordCard:'energy-travel',rpt_villainCard:'relationship-boundaries',
 rpt_healthReportCard:'health-rhythm',rpt_specialCharmCard:'personal-charm',rpt_skillTreeCard:'life-skill-tree',
};
for(const [featureKey,title] of Object.entries(TOSS_PUBLIC_SECTIONS)){
 const ziwei=featureKey.startsWith('ziwei_');
 const group=groups.get(dashboardSections[featureKey]||(ziwei?'ziwei':'saju'));
 if(!group||!isFreeFortuneFeatureKey(featureKey))throw new Error('Missing public section contract: '+featureKey);
 const tossRoute=ziwei?'/ziwei/sections':'/saju/sections';
 const section={featureKey,title,webEntry:ziwei?'js/saju-engine.js: 자미두수 명반 상세 장':featureKey==='saju_natal_reading'?'js/core/saju/section-client.js:loadNatalReading':'js/core/saju/reportDashboard.js',
   source:'worker/routes/saju-section.js → worker/lib/saju-section/report.js:buildSajuSectionHtml',
   input:'출생 날짜·시각·달력·성별·국내 출생 도시',tossRoute,
   login:'공개',iap:false,storage:'현재 화면 메모리',status:'일부만 이식',
   verification:'apps/toss/test/public-sections.test.mjs 원본 HTTP 응답 동등성 · public-sections-browser.mjs 360px 일반 홈에서 결과 열람. Worker 승격·실기기 미검증'};
 (group.publicSections||=[]).push(section);
 if(dashboardSections[featureKey])Object.assign(group,{status:'local-partial',tossRoute,inputContract:section.input,
   resultRenderer:'apps/toss/src/PublicSectionReading.tsx',storageContract:section.storage,verification:section.verification});
}
groups.get('ziwei').verification='기본 열두 궁 명반 및 상세 4종 공개 계산. 다른 궁합·연운·섬·상담은 별도 계약. 실기기 미검증';
groups.get('life-skill-tree').questProgress={status:'일부만 이식',source:'js/entertain-engine.js:buildRpgTemplate, buildRpgFallbackQuests → js/destiny-profile.js:CDLevel',
 policy:'게스트 기기 저장. 로그인하면 현재 계정에 한 번 이관. KST 일일 한도·완료 로그·EXP 적립은 worker/routes/rpg.js 원장',
 implementation:'apps/toss/src/rpg-progress.ts → /canonical/rpg/progress, quest, adopt',
 verification:'public-sections-browser.mjs 게스트 3회 완료·비밀 운세, rpg-progress.test.mjs 소유·중복·한도, rpg-session.test.mjs 이관 응답 유실·두 계정 격리. 운영 Worker와 토스 기기 미검증'};
groups.get('life-skill-tree').storageContract='클래스 시트는 화면 메모리. 게스트의 퀘스트·EXP는 기기 저장, 로그인 후 계정별 진행 조회·완료·이관';
groups.get('energy-travel').storageContract='리포트는 화면 메모리. 최근 여행지·룰렛 당첨 ID는 기기에서 게스트·토스 계정과 출생 입력별로 분리해 앱 재실행 후 복원';
for(const flow of TOSS_TAROT_LIBRARY_FLOWS){
 const group=groups.get(flow.id);
 if(!group)throw new Error('Missing discovered tarot flow: '+flow.id);
 Object.assign(group,{status:'local-partial',tossRoute:'/tarot-library',inputContract:'lib/tarot/toss-library-flows.mjs',
  resultRenderer:'apps/toss/src/TarotLibrary.tsx',storageContract:flow.access==='free-local'?'local-reading-not-server-stored':flow.featureKeys.some(isFreeFortuneFeatureKey)?'canonical-free-calculation; previously paid orders retain stored result':'owned-TossPurchase-to-PaidExecutionRecord',
  verification:'mock-contracts-only; device-and-web-parity-pending'});
}
for(const row of rows){
 const group=groups.get(aliases[row.id]||row.id);
 if(!group)throw new Error('Missing canonical candidate for '+row.id);
 row.toss.screen='not-independently-verified';
 row.toss.canonicalId=group.id;
 row.toss.candidateStatus=group.status;
 row.toss.canonicalRoute=group.tossRoute;
}
const readJson = file => JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const ledger = readJson('docs/product-details/product-ledger.json');
const {products,chatDomains,chatQuestionProducts} = loadTsModule('worker/yeongnyangi/payments/catalog.ts');
const {consultationDomain,consultationKinds,supportsKind,consultationManifest} = loadTsModule('worker/yeongnyangi/fortune/consultation-kinds.ts');
const {birthCategories} = loadTsModule('worker/yeongnyangi/fortune/free/categories.ts');
const {NEW_PURCHASES_AVAILABLE} = loadTsModule('apps/toss/src/release.ts');
const consultationProducts = products.map(product=>{
 const domain=consultationDomain(product);
 const sale=APPROVED_TOSS_PRODUCTS.find(row=>row.serviceId==='yeongnyangi'&&row.productId===product.id);
 return {
  productId:product.id,domain,systems:product.systems,depth:product.fishId,
  kinds:consultationKinds[domain].filter(kind=>supportsKind(product,kind)).map(kind=>({
   id:kind.id,label:kind.label,partner:!!kind.partner,question:!!kind.question,
   chapters:consultationManifest(product,kind).length,
  })),
  webEntry:'/yeongnyangi/fortune/?product='+product.id,
  tossEntry:domain==='fusion'?'/yeongnyangi/fortune/?flow=legacy&domain=fusion':'/yeongnyangi/fortune/?domain='+domain+'&flow=question',
  webInput:'app/yeongnyangi/_components/Consultation.tsx',
  worker:'worker/yeongnyangi/service.ts:prepareFortune',
  result:'app/yeongnyangi/_components/Result.tsx',library:'/yeongnyangi/library/',
  sale:sale?{sku:sale.sku,amountKRW:sale.approvedPriceKRW,evidence:sale.priceEvidence}:null,
  newPurchases:!!sale&&NEW_PURCHASES_AVAILABLE,
  deliveryVerification:product.id==='saju_mackerel'?'apps/toss/test/studio-browser.mjs 사주 질문 대표 흐름 mock 검증':['astrology_mackerel','vedic_mackerel','ziwei_mackerel','sukuyo_mackerel'].includes(product.id)?'apps/toss/test/studio-unsold-browser.mjs: 상품별 입력→분리된 mock SKU 구매→fixture 생성→보관함. 상품별 실제 출력·실기기 미검증':'상품별 전체 흐름 미검증',
 };
});
const daily = readJson('worker/yeongnyangi/fortune/free/categories.json').map(({id,label,fields})=>({
 id,label,fields:fields.map(({id,required,type})=>({id,type,required:!!required})),usesProfile:birthCategories.has(id),
 webEntry:id==='horary'?'/yeongnyangi/fortune/?mode=horary':'/yeongnyangi/free-fortune/?category='+id,
 tossRoute:id==='horary'?'/yeongnyangi/fortune/?mode=horary':'/daily',account:id==='horary'?'공개 질문 시각 차트':'영냥이 출석·당일 열람권',iap:false,
 worker:id==='horary'?'worker/yeongnyangi/fortune/free/horary.ts':'worker/yeongnyangi/free-service.ts',
}));
const letterProducts = ['yeoni','neo'].map(persona=>({
 persona,webEntry:'/fortune-chat/?character='+persona,webInput:'app/fortune-chat/ConsultationRoom.tsx',
 worker:'worker/routes/fortune-chat-consultations.js',result:'app/fortune-chat/ConsultationResult.tsx',
 base:chatDomains.map(domain=>'chat_'+domain),questionProducts:chatQuestionProducts().map(product=>product.id),
 tossEntry:'/fortune-tea-house/?counsel=letter'+(persona==='neo'?'&persona=neo':''),library:'/records/',
 registered:APPROVED_TOSS_PRODUCTS.filter(row=>row.serviceId===persona).map(row=>row.productId),
}));
const productContracts = ledger.products.map(product=>({
 productId:product.productId,displayName:product.displayName,entry:product.entry,
 inputRequirements:product.inputRequirements,resultRenderer:product.resultRenderer,
 detailAliases:product.detailAliases,sourceEvidence:product.verification,
 historicalLedgerStatus:product.saleStatus,freeCalculation:isFreeFortuneFeatureKey(product.productId),
}));
const nativeSource = {
 'fortune-tea-house':'fortune-tea-house','neo-operation-room':'neo-operation-room','life-book-ai':'life-book-ai',
 'life-fortune-report':'life-book-ai','astrology-ai':'astrology-ai','vedic-ai':'vedic-ai','ziwei-ai':'ziwei-ai',
 'new-year-ai':'new-year-ai','sukuyo-compatibility-ai':'sukuyo-compatibility-ai','karma-destiny-ai':'karma-destiny-ai',
 'love-secret-ai':'love-secret-ai','relationship-boundary-test':'relationship-boundary-test','fusion-fortune':'fusion-fortune',
};
const releaseLink = id=>id==='yeongnyangi-daily'||id!=='today-hub'&&reviewServices.some(item=>item.id===id);
const filesAtRoute = href=>{
 if(typeof href!=='string'||!href.startsWith('/'))return [];
 const pathname=href.split(/[?#]/)[0].replace(/^\/|\/$/g,'');
 if(!pathname||pathname==='index.html')return ['index.html','js/core/service-registry.js'];
 const candidates=pathname.endsWith('.html')?[pathname,'public/'+pathname]:['tsx','jsx','js'].map(ext=>'app/'+pathname+'/page.'+ext);
 return candidates.filter(file=>fs.existsSync(path.join(root,file)));
};
const canonicalCandidates=[...groups.values()].sort((a,b)=>a.id.localeCompare(b.id));
for(const group of canonicalCandidates){
 const webEntries=group.evidence.flatMap(item=>item.entry?[item.entry]:[]);
 const keys=group.evidence.map(item=>item.featureKey).filter(Boolean);
 for(const key of visual[group.id]?.inlineAliases||[])keys.push(key);
 if(group.id==='life-fortune-report')keys.push('life-fortune-ai-consultation');
 const matched=productContracts.filter(p=>p.productId===group.id||keys.includes(p.productId)||p.detailAliases?.includes(group.id));
 group.webEntries=[...new Set(webEntries.length?webEntries:[...matched.flatMap(p=>p.entry),...group.aliasEvidence])];
 group.webSources=[...new Set([
  ...group.evidence.flatMap(item=>item.implementation?[item.implementation]:[]),
  ...webEntries.flatMap(filesAtRoute),...matched.flatMap(p=>p.resultRenderer),
  ...(nativeSource[group.id]?['worker/routes/'+nativeSource[group.id]+'.js']:[]),
 ])];
 if(!group.webSources.length)group.webSources.push(...group.aliasEvidence.length?group.aliasEvidence:['index.html:FEATURE_VISUAL_DETAILS','js/core/service-registry.js']);
 group.webProductIds=matched.map(p=>p.productId);
 group.freeCalculation=keys.concat(group.webProductIds).some(isFreeFortuneFeatureKey);
 group.portStatus=group.tossRoute||group.publicSubflows?.length?'일부만 이식':'미이식';
 group.reducedBundle=releaseLink(group.id)?'홈 진입 있음':['today-hub','stonehenge-runes','yeongnyangi-prashna','yeongnyangi-horary'].includes(group.id)?'홈 진입 없음':group.tossRoute?'구현은 있으나 진입 차단':'홈 진입 없음';
 group.currentEntry=group.tossRoute?'일반 홈의 진입 코드 확인':group.publicSubflows?.length?'일부 하위 경로만 홈에 연결':'연결 경로 없음';
 group.bundleVerification=group.id==='yeongnyangi'?'20261114-8 실제 Linux AIT 일반 홈 → 달빛 점술방 → 질문 검색 → 입력. mock 로그인과 소유 원문 조회 통과. 휴대폰 미검증':'휴대폰 및 상품별 전체 흐름 미검증';
 if(!group.tossRoute)group.tossLogin='토스 기능 미연결';
 else if(nativeSource[group.id]||['neo-letter','fortune-chat','yeongnyangi','yeongnyangi-prashna'].includes(group.id))group.tossLogin='구매·기록에 토스 계정 필요';
 else if(['manse','astrology','vedic','human-design','flower','yeongnyangi-daily','career-style','cosmic-soul-meditation','neville-meditation'].includes(group.id))group.tossLogin='계산 또는 기록 조회에 토스 계정 필요';
 else if(group.id==='today-hub')group.tossLogin='별자리·띠는 공개. 네 체계와 오늘의 세 장은 토스 로그인 필요. 개인화는 소유 프로필만 선택';
 else if(['juyuk-turtle','dream','mbti-animal-compat','ifa-oracle','consultation-webtoons','heukwol-story','saju','animal-destiny','music','novel','famous-saju','bias-destiny','yeongnyangi-horary','yeongnyangi-season','olympus-oracle','stonehenge-runes'].includes(group.id))group.tossLogin='공개 진입';
 else group.tossLogin='기능별 단계 검증 필요';
 group.tossResult=group.resultRenderer||'결과 화면 연결 미확인';
 group.reread=group.storageContract||'재열람 경로 미확인';
 if(group.publicSections){
  group.freeCalculation=true;
  group.webSources=[...new Set([...group.webSources,...group.publicSections.map(s=>s.source)])];
  if(dashboardSections[group.publicSections[0].featureKey]){
   group.tossLogin='공개 입력 · 구매 없음';
   group.reducedBundle='홈 진입 없음';
  }
 }
 if(nativeSource[group.id])group.saleStatus='콘솔·운영 설정 필요';
}
const registeredProducts=APPROVED_TOSS_PRODUCTS.map(({serviceId,productId,sku,priceEvidence,approvedPriceKRW})=>({serviceId,productId,sku,priceEvidence,approvedPriceKRW}));
const report={
 sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
 sourceCounts:{home:context.window.__cdServiceRegistry.length,react:react.length,visual:Object.keys(visual).length},
 scope:'홈 별칭, 상담 상품·모드, 무료 카테고리, 과거 상품 원장은 서로 다른 단위다. 코드상 진입과 실기기 검증을 분리한다.',
 entries:rows,canonicalCandidates,consultationProducts,daily,letterProducts,productContracts,
 registeredProducts,newPurchasesAvailable:NEW_PURCHASES_AVAILABLE,
};
fs.writeFileSync(path.join(root,'docs/toss/full-service-inventory.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({sourceCounts:report.sourceCounts,discoveryIds:rows.length,canonicalCandidates:groups.size,
 consultationProducts:consultationProducts.length,productKindPairs:consultationProducts.reduce((sum,p)=>sum+p.kinds.length,0),
 daily:daily.length,ledger:productContracts.length,registeredProducts:registeredProducts.length}));
