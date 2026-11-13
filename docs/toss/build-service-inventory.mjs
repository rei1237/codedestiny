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
 ['heukwol-consult','흑월의 경고 상담','/heukwol/','app/heukwol/HeukwolClient.tsx'],
 ['destiny-compass-crossroads','운명의 갈림길','/destiny-compass/','app/destiny-compass/_components/Crossroads.tsx'],
 ['destiny-compass-future-sim','미래 시뮬레이션','/destiny-compass/','app/destiny-compass/_components/FutureSim.tsx'],
 ['destiny-compass-life-voyage','삶의 항로','/destiny-compass/','app/destiny-compass/_components/LifeVoyage.tsx'],
 ['destiny-compass-deep-report','운명의 지도 심층 리포트','/destiny-compass/','app/destiny-compass/_components/SavedCompassReport.tsx'],
 ['nakshatra-lord-report','나크샤트라 지배성 심화 리포트','/nakshatra/lord-report/','app/nakshatra/lord-report/LordReportClient.tsx'],
 ['nakshatra-dasha-map','나크샤트라 다샤 인생지도','/nakshatra/dasha-map/','app/nakshatra/dasha-map/DashaMapClient.tsx'],
 ['past-life-face','전생 관상·전생 궁합','/?action=openPhysiognomyApp','PastLifeFaceUI.js'],
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
groups.get('luck-sync-diary').subfeatures=[{id:'fortunePlanner',entry:'/diary/',status:'local-partial'},{id:'legacyLuckSyncDiary',entry:'js/luck-sync-diary.js:openLegacyLuckSyncDiary',status:'requires-full-flow-port-and-verification',verification:'legacy stored records and migration not verified'}];
const localEvidence={
 'palm-reading':{tossRoute:'/palm-reading/',status:'local-partial',inputContract:'원본 카메라·좌/우 손 사진, 주사용 손과 판독 목적',resultRenderer:'app/palm-reading/PalmDestinyMain.tsx · worker/routes/palm.js Vision 근거 및 심층 해석',storageContract:'사진 없이 입력 해시와 준비한 판독을 보관. 결제한 토스 계정만 원문 열기',verification:'360px palm-browser.mjs 합성 이미지로 모의 판독·구매·재진입·타 계정 차단. 네이티브 14건과 웹 390/1280px 복구 검사. 사진 촬영 성능은 실기기 필요'},
 'neo-consultation':{tossRoute:'/neo-consultation/',status:'local-partial',inputContract:'질문 1~10개, 본인·상대 출생, 사주·자미, 이메일 및 동의. 원본 NeoConsultationClient',resultRenderer:'worker/neo-consultation/service.js 수동 검토·답변 이메일. 토스 개발 fixture에서 접수 원문과 상태 재열람',storageContract:'새 manual_email 주문은 서버에 답변 본문 없음. 기존 웹 주문 계약 별도. 토스 실판매 비활성',verification:'360px neo-email-browser.mjs 접수·다른 계정 URL 차단. 웹 원본 회귀 41건, 모의 발송기록. 실제 메일·결제 미실행'},
 'animal-totem':{tossRoute:'/animal-totem/',status:'local-partial',inputContract:'한 장·세 장·다섯 장, 원본 동물 17종 추첨, 질문·선택 출생 정보',resultRenderer:'웹 AnimalTotemContentEngine 및 worker/routes/animal-totem.js 원본 프롬프트, 카드별 메시지·행동·그림자',storageContract:'기본·심화 상품별 주문 원문, 생성 재개 및 소유 보관함',verification:'360px totem-browser.mjs 모의 구매 1회·생성 중 이탈·재진입·타 계정 차단. 웹 Worker 61건. 실판매 SKU 미확인'},
 'destiny-meeting-place':{tossRoute:'/saju/destiny-meeting-place/',status:'local-partial',inputContract:'app/saju/animal-destiny/lib/sajuAdapter.ts → generateDestinyMeetingPlaceResult',resultRenderer:'apps/toss/service/TossMeetingPlace.tsx + DestinyMeetingPlaceResult.tsx',storageContract:'웹처럼 계정 확인 후 현재 화면. 직접 출생 입력 또는 소유 프로필 선택',verification:'일반 홈→mock 로그인→출생정보→7131자 장소·프롬프트→같은 입력으로 돌아가기. 실제 KASI 연동은 운영 Worker 승격 후 확인'},
 'face-reading':{tossRoute:'/animal/physio/',status:'local-partial',inputContract:'한 사람 또는 두 사람의 얼굴 사진. 원본 FaceMesh 특징점과 27동물 분류',resultRenderer:'apps/toss/service/TossFace.jsx에서 웹 AnalysisEngine.js와 PhysiognomyUI.js 실행',storageContract:'게스트 기기 내 판독. 수집한 이미지·점과 원본 결제 주문 분리',verification:'face-browser.mjs의 합성 PNG, 고정 좌표, 게스트 360px. 기기별 모델 다운로드·촬영 미검증'},
 'physiognomy':{tossRoute:'/animal/physio/',status:'local-partial',inputContract:'웹 SEO /physiognomy/의 openPhysiognomyApp. 오관·점 위치 입력과 해설',resultRenderer:'apps/toss/service/TossFace.jsx 원본 상세 화면',storageContract:'현재 단말 게스트 판독',verification:'face-browser.mjs 합성 이미지·오관·점·관상 궁합. 실사진 성능 미검증'},
 'past-life-face':{tossRoute:'/past-life-face/',status:'local-partial',inputContract:'원본 얼굴 한 장의 전생 및 두 얼굴의 전생 궁합',resultRenderer:'apps/toss/service/TossFace.jsx와 웹 PastLifeFaceUI.js',storageContract:'게스트 현재 결과',verification:'face-browser.mjs 로컬 이미지·얼굴 특징 fixture, 전생 비교 결과. 실기기 미검증'},
 'luck-sync-diary':{tossRoute:'/diary',status:'local-partial',inputContract:'오늘과 과거 날짜·기분·한 줄·메모·태그·일정·할 일·루틴',resultRenderer:'apps/toss/src/FortuneDiary.tsx + app/diary/_components 원본',storageContract:'게스트/토스 계정별 기기 저장. 원본 일/월 샤드로 재실행 후 읽기',verification:'diary-browser.mjs 360px 날짜별 입력·할 일·재실행·기간별 통계와 기록→해당 날짜 달력, 쓰기 API 0회. 웹의 기존 기기 저장 기록 이전과 계정 프로필 운기는 별도'},
 'naming-ai':{tossRoute:'/naming-ai/',status:'local-partial',inputContract:'원본 성 한자·양/음력·출생과 선호, v2 무료 후보 5·유료 후보 12',resultRenderer:'apps/toss/service/TossNaming.tsx, worker/routes/naming-prompt.js의 8장',storageContract:'꿀꿀 기록에서 토스 소유 주문의 저장 원문',verification:'naming-browser.mjs, native-naming.test.mjs. mock 1주문/생성, 이탈·재실행·타 계정 차단. 전용 SKU 필요'},
 'master-love-codex':{tossRoute:'/master-love-codex/',status:'local-partial',inputContract:'개인판 출생·질문과 사주·자미두수 근거',resultRenderer:'원본 인연의 서 20장 세션과 결과 리더',storageContract:'개인판 토스 주문과 소유 계정의 저장 원문',verification:'codex-browser.mjs에서 개인·궁합 각 mock 주문 1건, 중간 이탈 후 재열람·타인 차단. 실상품 없음'},
 'master-love-codex-compat':{tossRoute:'/master-love-codex/',status:'local-partial',inputContract:'궁합판 두 사람 출생·질문과 별도 원장',resultRenderer:'원본 궁합판 20장 세션과 결과 리더',storageContract:'궁합판 토스 주문과 소유 계정의 저장 원문',verification:'codex-browser.mjs. 개인판과 독립 가상 SKU·질문 해시·생성 작업. 실상품 없음'},
 'geomancy-oracle':{tossRoute:'/geomancy/',status:'local-partial',inputContract:'연금술사/술탄·질문·16줄 흙점, 웹과 공유하는 방패 차트·증인 둘·재판관 계산',resultRenderer:'worker/routes/oracle.js 7부분 원본 프롬프트·생성, apps/toss/service/TossGeomancy.tsx',storageContract:'동일 주문의 흙점과 결과 원문. 꿀꿀운세 기록에 토스 소유권 적용',verification:'geomancy-browser.mjs. 360px mock 주문·생성 1회, 테마와 초안 복원·타계정 거절, 웹 Worker 45건·UI 3건 통과'},
 'home-widget':{tossRoute:'/app/home-widget',status:'local-partial',inputContract:'캐릭터 둘, 그림·꽃말·오늘 운세 위젯 선택',resultRenderer:'app/app/home-widget/HomeWidgetStudio.tsx의 미리보기',storageContract:'게스트 미리보기. OS 홈 고정은 기존 Android 앱 플러그인 전용',verification:'widget-preview-browser.mjs에서 360px, 6개 선택, 실제 그림 디코드, 결제 요청 0건'},
 'dream-psycho-analysis':{tossRoute:'/dream/psycho/',status:'local-partial',inputContract:'꿈 기록 8~6000자와 원본 자동 말투, 로그인 뒤 원래 주문으로 복귀',resultRenderer:'apps/toss/service/TossDream.tsx 및 worker/routes/dream.js의 원본 5장·10부분 생성',storageContract:'동일 토스 계정의 주문·저장된 원문. 기존 작업 재개와 환불·타 계정 접근 거절',verification:'dream-browser.mjs · native-dream.test.mjs. 실판매 SKU 미확인'},
 'heukwol-consult':{tossRoute:'/heukwol/?consult=1',status:'local-partial',inputContract:'원본 buildHeukwolAnalysis·generateHeukwolChapter, 소유 프로필의 출생 시각·선택 연도·질문',resultRenderer:'apps/toss/service/TossHeukwol.tsx + app/heukwol/HeukwolResult.tsx',storageContract:'TossNativeConsultation과 소유 구매. 원 주문과 마지막 성공 장에서 복구. 신규 SKU 미등록',verification:'360px mock 두 장으로 생성 중 이탈·다른 계정 차단. 원본 27개 프롬프트·저장 임대 테스트. 운영 실패 주문 처리 및 기기 PDF 미검증'},

 'dream':{tossRoute:'/dream/tarot',status:'local-partial',inputContract:'index.html:openDreamModal + js/dream-ledger.js → worker/routes/dream.js → lib/tarot/dream-prompt.mjs',resultRenderer:'apps/toss/src/DreamPrompt.tsx',storageContract:'게스트 현재 화면 및 원문 복사. 정신분석 해몽은 별도 유료 기능',verification:'360px 일반 홈에서 1~5장 원본 카드와 프롬프트, 잘못된 입력 및 다시 쓰기 검증'},
 'mbti-animal-compat':{tossRoute:'/mbti/animals',status:'local-partial',inputContract:'js/astral-soul.js:ASTRAL_DATA / getPairScore / getSynergyText',resultRenderer:'apps/toss/src/AstralAnimals.tsx',storageContract:'게스트 화면 계산. 두 동물 256쌍 원본 점수·조언',verification:'astral-animals.test.mjs + 일반 홈 두 동물 선택'},
 'ziwei-island':{tossRoute:'/ziwei/sections?reading=island',status:'local-partial',inputContract:'원본 양력·음력·윤달, 생일·성별·시각 미상, 연도 선택',resultRenderer:'public/destiny-island.html → worker/routes/ziwei-island.js → 12궁·대한·유년·수호자·섬 일지·퀘스트',storageContract:'기기 내 게스트·토스 계정별 명반, 당일 청사진, 방문 도장과 퀘스트 EXP 복원',verification:'island-browser.mjs 360px 홈, 열두 궁 원문과 초상, 유년 변경, 재진입. 구매 종료 궁별 AI 웹 원문 복구는 별도. 토스 실기기·운영 Worker 미검증'},
 'love-code':{tossRoute:'/saju/love-simulation/',status:'local-partial',inputContract:'원본 16인 프리셋 또는 상대 출생정보 사주 매칭. 내 명식·상대 선택·데이트 장면 선택으로 결말',resultRenderer:'app/saju/love-simulation/_components/LoveSimulationEngine.tsx + 원본 명식·호감 점수·스토리',storageContract:'현재 세션의 원본 결말. 다음 진입 때 다시 플레이. 타 계정 프로필·웹 결제 복구와 독립',verification:'love-code-browser.mjs 360px 일반 홈, 게스트 탐색, mock 토스 로그인, 두 출생정보·네오 원화·선택과 결말. 실기기 미검증'},
 'saju-compatibility':{tossRoute:'/saju/compatibility/',status:'local-partial',inputContract:'두 출생정보·시간 미상·달력·상대 호칭·연인/친구/사업. 웹 정본 명식과 analyzeCompat·analyzePastLifeCompat facts',resultRenderer:'js/saju-compat-render.mjs + worker/routes/saju-compat-basic.js',storageContract:'토스 계정·주문별 paidNarrative 불변 원문. 꿀꿀운세 구매 기록에서 생성 재개와 원문 재열람',verification:'saju-compat-browser.mjs 360px 홈, mock 로그인·입력 복원·1주문·생성 도중 이탈·원문·타 계정 거절. native-saju-compat.test.mjs, 웹 정본 전달 34건'},
 points:{tossRoute:'/settings#web-history',status:'local-partial',inputContract:'토스 내 정보 → 웹 이용 내역 → 기존 웹 계정 인증',resultRenderer:'app/points/history/PointHistoryClient.tsx · GET /api/payments/me?view=history · 소유 주문 상세',storageContract:'원래 웹 계정의 이용권·월정석·단건 주문 및 이용권 사용 이력. 토스 IAP와 별도',verification:'web-history-browser.mjs: 360px 일반 홈에서 순수 웹 구매 내역 주소만 이동, 토스 토큰·주문·결제 전달 없음'},
 'island-consult':{tossRoute:'/ziwei/sections#island-history',status:'local-partial',resultRenderer:'웹 /records/ 원본 궁별 기록, /island-consult/?view=report 원래 저장 프로필의 고정 12궁 리포트'},
 'saju-guardian':{tossRoute:'/saju-guardian/',status:'local-partial',inputContract:'계정에 저장한 프로필의 birthKey, calendar·시각 미상. 원본 calculateNatalSaju 네 기둥',resultRenderer:'웹 guardianReading + ResultCard 원본 인장·십성·영문 프롬프트, 단말 레거시 그림은 웹 귀속',storageContract:'계정·환경·출생정보·상품별 주문 및 저장 원본, 환불 재검사. 콘솔 SKU 미확인',verification:'birth-readings.test.mjs 검증. birth-readings-browser.mjs 360px 일반 홈, mock 주문 후 프롬프트, 타 계정 거절'},
 'saju-sibyl':{tossRoute:'/saju/sibyl/',status:'local-partial',inputContract:'양력·음력·윤달 출생 정보와 한국 시간 기준 현재부터 10개 연도',resultRenderer:'worker/routes/sibyl.js /preview → buildSibylAnnual → 원본 기질·대비 행동·불확실성',storageContract:'무료 연간 대비는 다시 계산. 심층은 출생정보·계정별 1회 해금 후 연도별 원본 10장·월별 흐름 저장. 콘솔 SKU 미확인',verification:'sibyl-public-browser 및 birth-readings-browser 360px, 원본 HTTP 일치. mock 2개 연도, 중간 종료·재개·타 계정 거절. sibyl-report-store-v2 원본 LLM mock 검증'},
 'ifa-oracle':{tossRoute:'/oracle/ifa',status:'local-partial',inputContract:'public/ifa-oracle.html 여덟 표식, 오두 256개, 네 주제',resultRenderer:'apps/toss/src/IfaReading.tsx',storageContract:'현재 화면. 토스 저장·공유는 실기기 확인 필요',verification:'ifa-reading.test.mjs, 360px public-readings-browser.mjs 네 가지 주제'},
 'consultation-webtoons':{tossRoute:'/consultations/stories',status:'local-partial',inputContract:'app/consultations/home-stories.ts + lib/brand/consultation-webtoons.mjs',resultRenderer:'apps/toss/src/StoryLibrary.tsx + app/components/webtoon/CutReader.tsx',storageContract:'게스트 공개 14편. 읽던 이야기는 URL의 story로 유지',verification:'Vite 배포본 360px에서 14편 전체 컷 수와 대사, 원본 그림 디코딩. 원격 이미지 실기기 확인 필요'},
 'heukwol-story':{tossRoute:'/consultations/stories?story=heukwol',status:'local-partial',inputContract:'app/heukwol/FateWarningEpisode.tsx 및 원본 12컷',resultRenderer:'apps/toss/src/StoryLibrary.tsx + app/components/webtoon/CutReader.tsx',storageContract:'공개 서장. 유료 흑월 상담과 별도',verification:'story-library-browser.mjs 360px 12컷 원본 텍스트 비교'},
 'neo-letter':{tossRoute:'/fortune-tea-house/?counsel=letter&persona=neo',status:'local-partial',inputContract:'app/fortune-chat/ConsultationIntake.tsx + worker/toss/letter.js',resultRenderer:'apps/toss/service/TossLetterRoom.tsx + app/fortune-chat/ConsultationResult.tsx',storageContract:'꿀꿀운세 구매 기록. 상담자·계정·주문 소유권 검사',verification:'letter-browser.mjs 360px 두 상담자의 사주 결과 및 계정 교체. 각 6개 분야 mock 상품 매핑'},

 'ziwei-deep-report':{tossRoute:'/ziwei/chart',status:'local-partial',inputContract:'명반 출생(음력·윤달·시각) + 원본 8개 관심 분야·질문 → worker/toss/native-ziwei-deep.js → runZiweiDeepReportDeliveryBatch',resultRenderer:'app/components/ziwei/ZiweiDeepChapters.tsx + lib/pdf/export-ziwei-report-pdf.ts',storageContract:'구매 기록에서 본인 토스 주문의 15장 원문 재열람·저장 지점 재개. 웹 과거 구매는 웹 계정',verification:'studio-ziwei-deep-browser.mjs 360px 명반→원본 관심분야→질문 복원→모의 독립 IAP→재실행·15장 일치·타계정 차단. ziwei-deep-paid-delivery.behavior.test.js 원본 다단계·복구·환불. 전용 SKU·기기 PDF 저장 미검증'},
 'destiny-compass':{tossRoute:'/destiny-compass',status:'local-partial',inputContract:'양·음력, 윤달, 출생시각·성별과 고민 → computeDirectionField',resultRenderer:'JourneyHub, DestinyMap, CompassReport, TodayQuest, Arrival; worker/routes/destiny-compass.js:narrate',storageContract:'기기별 마지막 무료 차트, 소유자·게스트 구분',verification:'studio-compass-browser.mjs 360px 공개 5체계 근거, 여섯 점수, 모바일 섬 그림·네오, 재실행 복원. 웹 RPG 경험치·월정석은 웹 계정 권리'},
 'destiny-compass-crossroads':{tossRoute:'/destiny-compass',status:'local-partial',inputContract:'차트와 두 선택지 A·B',resultRenderer:'app/destiny-compass/_components/Crossroads.tsx',storageContract:'기기 마지막 차트에서 무료 재계산. 웹 과거 주문은 웹 보관 계정 소유',verification:'studio-compass-browser.mjs 360px 로그인 후 기존 질문과 무료 판독, 결제 0건'},
 'destiny-compass-future-sim':{tossRoute:'/destiny-compass',status:'local-partial',inputContract:'차트와 30일·90일·1년·3년 시점 선택',resultRenderer:'app/destiny-compass/_components/FutureSim.tsx',storageContract:'기기 마지막 차트에서 무료 재계산. 웹 과거 주문은 웹 보관 계정 소유',verification:'studio-compass-browser.mjs 360px 로그인 후 기존 질문과 무료 판독, 결제 0건'},
 'destiny-compass-life-voyage':{tossRoute:'/destiny-compass',status:'local-partial',inputContract:'차트의 방향장과 장기 시간선',resultRenderer:'app/destiny-compass/_components/LifeVoyage.tsx',storageContract:'기기 마지막 차트에서 무료 재계산. 웹 과거 주문은 웹 보관 계정 소유',verification:'studio-compass-browser.mjs 360px 로그인 후 기존 질문과 무료 판독, 결제 0건'},
 'destiny-compass-deep-report':{tossRoute:'/destiny-compass',status:'local-partial',inputContract:'collectDeepEvidence와 원본 워커 10장 프롬프트',resultRenderer:'app/destiny-compass/_components/SavedCompassReport.tsx',storageContract:'토스 소유 주문과 묶은 DestinyCompassReport의 미완료 상태 및 구매 기록 원문',verification:'studio-compass-browser.mjs 360px mock 1건·10장 유지·타계정 차단. 원본 Worker 저장 실패와 재생성 방지 검사. 미등록 SKU 및 실기기 미검증'},
 'animal-destiny':{tossRoute:'/saju/animal-destiny',status:'local-partial',inputContract:'lib/korean-calendar/natal.js:calculateNatalSaju',resultRenderer:'apps/toss/src/AnimalDestiny.tsx',storageContract:'화면 메모리. 계정 변경 시 TossSessionScope 재설정'},
 'career-style':{tossRoute:'/saju/career-style/',status:'local-partial',inputContract:'worker/routes/career-style.js:readOwnedCareerStyle',resultRenderer:'apps/toss/service/TossCareerStyle.jsx + app/saju/career-style/CareerStyleClient.tsx',storageContract:'계정별 프로필을 사용한 무료 개인 명식 8장. 실기기 미검증'},
 'yeongnyangi-horary':{tossRoute:'/yeongnyangi/fortune/?mode=horary',status:'local-partial',inputContract:'worker/yeongnyangi/fortune/free/horary.ts',resultRenderer:'app/yeongnyangi/_components/QuestionSkyConsultation.tsx',storageContract:'무료 질문 시각·도시 차트. 유료 결과 보관 계약 없음'},
 'yeongnyangi-prashna':{tossRoute:'/yeongnyangi/fortune/?mode=spirit',status:'local-partial',inputContract:'worker/yeongnyangi/fortune/question-sky.ts',resultRenderer:'app/yeongnyangi/_components/QuestionSkyConsultation.tsx',storageContract:'영냥이 질문점성술 별도 권한. 일반 사주 승인 SKU로 구매 가능하다고 보지 않는다'},
 ziwei:{tossRoute:'/ziwei/chart',status:'local-partial',inputContract:'BirthFields + normalizeZiweiInput + calculateZiweiChart; domestic locations only',resultRenderer:'apps/toss/src/ZiweiChart.tsx + canonical ZiweiPalaceGrid',storageContract:'기본 명반은 현재 화면에서 재계산, 출생 초안은 기기·토스 계정별. 15장 구매 기록은 별도 ziwei-deep-report 행',verification:'basic twelve-palace chart only; original detailed readings, profile recovery, device navigation and accessibility pending'},
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
 nakshatra:{tossRoute:'/nakshatra/resolve',status:'local-partial',publicSubflows:['/nakshatra/codex','/nakshatra/codex/[0..26]'],inputContract:'웹 /nakshatra/calc/ 양력·출생시각/미상·도시와 국가. 원본 resolveNatal과 일본 구력, Lahiri',resultRenderer:'apps/toss/src/MansionReading.tsx + app/nakshatra/_components/LifeReading.tsx',storageContract:'게스트 현재 화면 무료 리딩 5개 주제. 기존 웹 주문·개인 AI 리포트 별도',verification:'studio-mansion-reading-browser.mjs 360px 게스트→출생→5장·계산 근거·오늘의 달/격각/타라발라. 토스 세션에서는 소유 프로필 입력도 지원. 서비스별 이력·실기기 미검증'},
 'nakshatra-lord-report':{tossRoute:'/nakshatra/lord-report',status:'local-partial',inputContract:'소유 프로필·음력/시간미상. worker/routes/nakshatra-premium.js와 원본 buildNakshatraLordReport',resultRenderer:'apps/toss/src/MansionReports.tsx. 원본 지배성과 파다·기질·근거 11개 절',storageContract:'무료 기능 키를 확인하고 같은 계정의 저장된 출생으로 재계산. 웹의 예전 영구 해금은 웹 원장에 유지',verification:'studio-mansion-reports-browser.mjs: 360px 로그인과 소유 프로필→원본 11개 절·주문 0. 실제 Worker/기기 미검증'},
 'nakshatra-dasha-map':{tossRoute:'/nakshatra/dasha-map',status:'local-partial',inputContract:'소유 프로필·음력/시간미상. 원본 buildNakshatraDashaMap, 비쇼타리 + 동양 대운',resultRenderer:'apps/toss/src/MansionReports.tsx + app/nakshatra/dasha-map/PeriodRow.tsx 원본 타임라인',storageContract:'무료 키와 계정을 확인하고 재계산. 웹의 과거 영구 해금은 웹 원장에 유지',verification:'360px 대주기·매번 9개 부주기·날짜·시기별 해설, 0주문. 실기기·운영 Swiss 미검증'},
 'yoga-guru':{tossRoute:'/yoga-guru',status:'local-partial',inputContract:'yoga-guru.html에서 현재 몸·마음 자유서술 및 30분 가네샤 또는 60분 시바 코스 선택. 웹의 두 openYogaGuru 사유와 같은 상품 yoga-guru-per-use, 각 5,000원. 출생정보를 요구하지 않는다',resultRenderer:'apps/toss/src/YogaGuru.tsx + apps/toss/canonical/yoga-course.mjs가 원본 renderCourse, buildTypingLines, 생성 음악 6종과 카드 리더 사용. worker/routes/yoga-guru.js의 yogaNarrativeAdapter와 웹 공통 js/core/yoga-guru-prompts.js',storageContract:'TossNativeConsultation의 소유자·환경·주문·입력 해시에 결합한 ServiceExecutionTransaction 원문. 웹 주문과 별개. 꿀꿀운세 구매 기록에서 생성 재개·완료 원문 읽기. 토스 계정과 주문별 마지막 단계는 기기에 저장',verification:'studio-yoga-browser.mjs 360px, 홈→mock 로그인→입력 복원→30/60분 전용 가상 IAP→생성 중 이탈→구매 기록→저장 원문·음악 전환·단계 복원, 타 계정 결과 차단. 원본 Worker와 토스 경계 32개, 웹 UI 3개. 토스 SKU 미등록·실기기 미검증'},
 'nakshatra-ai':{tossRoute:'/nakshatra/ai',status:'local-partial',inputContract:'app/nakshatra/ai/NakshatraAiClient.tsx. 양력 출생 일시·시간 미상·도시(11개 프리셋)·성별과 선택 질문 1200자. 웹 상품 30000원·이용권·월정석은 웹 원장에 유지, 토스 SKU 미등록',resultRenderer:'apps/toss/src/MansionConsultation.tsx + app/nakshatra/ai/AiConsultDecks.tsx + worker/routes/nakshatra-ai.js + worker/lib/nakshatra-ai-prompt.js',storageContract:'토스 주문을 원래 NakshatraAiConsultation(소유자·idempotencyKey·inputHash)에 결합. 꿀꿀운세 구매 기록으로 9장 원문을 다시 연다. 웹의 기구매·환불 경로와 분리',verification:'studio-mansion-ai-browser.mjs: 360px 홈→mock 로그인→입력 복원→전용 가상 SKU 하나→3/9 생성 중 이탈→보관함→9장·재실행→다른 계정 URL 거부. nakshatra-paid-delivery.test.js 42/42. 웹 cardToFormValues로 소유 프로필 선택. 원본 PDF·네이티브 저장 호출 mock 검증. 운영 Swiss/LLM·콘솔·실기기 파일 열람 미검증'},
 'nakshatra-compat':{tossRoute:'/nakshatra/compat',status:'local-partial',inputContract:'app/nakshatra/compat/NakshatraCompatClient.tsx의 각자 출생 날짜·시각·나라·성별. 원본 resolveCompat와 일본 숙요, Lahiri 아쉬타쿠타 8항목',resultRenderer:'apps/toss/src/MansionReading.tsx + app/nakshatra/compat/CompatResultView.tsx',storageContract:'토스 로그인·무료 현재 화면 계산. 기존 웹 구매 GET은 웹 원장과 소유 인증으로 유지',verification:'360px mock 로그인, 서로 다른 도시와 출생 정보 두 사람→8쿠타와 격각, 재입력 확인. 각각 소유 프로필 또는 수동 입력. 초대 링크·운영 Swiss·실기기 미검증'},
 saju:{tossRoute:'/saju/basic/play',status:'local-partial',inputContract:'shared natal engine; Korean city, solar/lunar/leap and unknown hour',resultRenderer:'apps/toss/src/BasicSajuReading.tsx',storageContract:'memory-only free basic chart; web result and device parity pending'},
 manse:{tossRoute:'/manse',status:'local-partial',inputContract:'worker/toss/manse.js (canonical screen saju engine)',resultRenderer:'apps/toss/src/ManseReading.tsx',storageContract:'screen-only; web-profile-history-parity-pending'},
 sukuyo:{tossRoute:'/sukuyo',status:'local-partial',inputContract:'worker/toss/sukuyo-basic.js + canonical Sukuyo domain and free dashboard',resultRenderer:'apps/toss/src/SukuyoBasic.tsx',storageContract:'screen-only; no result storage or cross-device recovery',verification:'local offline canonical calculation plus 27 synthetic lunar sectors, home/direct route, native-back and session-isolation checks; original annual flow, relationship tools, paid nature/compatibility rights, editorial review and official device remain incomplete'},
 flower:{tossRoute:'/flower',status:'local-partial',inputContract:'worker/toss/flower.js',resultRenderer:'apps/toss/src/FlowerReading.tsx',storageContract:'not-stored-by-current-policy'},
 'bias-destiny':{tossRoute:'/bias',status:'local-partial',inputContract:'app/saju/destiny-bias/engine/chemiReportBridge.ts',resultRenderer:'apps/toss/src/BiasReading.tsx + BiasReport.tsx',storageContract:'native-card-save-summary-share-mocked; device-and-web-history-parity-pending'},
 yeongnyangi:{tossRoute:'/yeongnyangi/fortune/',status:'local-partial',inputContract:'worker/toss/routes.js',resultRenderer:'app/yeongnyangi/_components/Result.tsx',storageContract:'owner-bound TossPurchase and YeongnyangiRequest; /yeongnyangi/library/'},
 'fortune-chat':{tossRoute:'/fortune-tea-house/?counsel=letter',status:'local-partial',inputContract:'worker/toss/letter.js + worker/toss/services.js',resultRenderer:'apps/toss/service/TossLetterRoom.tsx + app/fortune-chat/ConsultationIntake.tsx',storageContract:'persona-bound-TossPurchase-to-YeongnyangiRequest; official device and approved SKU pending',verification:'original Yeoni letter intake and owner-bound recovery are mocked; full web parity and device tests pending'},
 'today-hub':{tossRoute:'/today',status:'local-partial',inputContract:'24개 별자리·띠와 오늘·내일·이번 주·이번 달 선택. 원본 loadWeekRange·loadMonthRange·computeSignScore·getPeriodReading. 오늘·내일 네 체계는 날짜 또는 소유 프로필 선택',resultRenderer:'apps/toss/src/TodayPublic.tsx + TodayPersonal.tsx + app/today/DailyTarot.tsx',storageContract:'별자리·띠 공개. 원본 오늘의 세 장은 로그인 후 계정별 기기 저장·재열람',verification:'360px apps/toss/test/studio-today-browser.mjs: 공개 주간·월간→mock 로그인→소유 프로필 네 체계→세 장→재시작. worker/toss/today-hub.js → worker/routes/fortune-today.js 정본. __tests__/worker/toss-today-hub.test.js 소유 검증. 실기기와 운영 계산의 연결은 미검증'},
 "nakshatra-muhurta":{"tossRoute":"/nakshatra/muhurta","status":"local-partial","inputContract":"app/nakshatra/muhurta/MuhurtaClient.tsx. 소유 출생 프로필·목적 6가지·시작일. 원본 handleMuhurta가 Swiss 달 황경으로 60일 계산","resultRenderer":"apps/toss/src/MansionReports.tsx + worker/toss/mansion-reports.js + worker/routes/nakshatra-premium.js","storageContract":"웹과 같은 인증 필요. 무료 키를 재확인하고 현재 화면에 추천·유의일·60일과 원문 해설, 주문 없음","verification":"studio-mansion-reports-browser.mjs의 360px 홈 입장·로그인·60일 확인. toss-mansion-reports.test.js의 음력·시간 미상·계정분리. 운영 Swiss와 실기기 미검증"},
 "nakshatra-vvip-codex":{"tossRoute":"/nakshatra/vvip-codex","status":"local-partial","inputContract":"app/nakshatra/vvip/VvipClient.tsx. 소유 출생 프로필·장소·시각; 원본 handleVvipCodex 기준 달, 지배성·다샤·동양 대운","resultRenderer":"apps/toss/src/MansionReports.tsx + worker/toss/mansion-reports.js + worker/routes/nakshatra-premium.js","storageContract":"무료 키를 확인하고 토스 로그인 후 5장 전체·27수 지형·지배성 세부 장과 다샤 타임라인 해설. 현재 화면에 표시","verification":"360px 로그인→5장·27수·다샤 해설, 0주문. 연산 전 타계정 프로필 거부. 웹 PDF 생성·토스 파일 저장 요청 mock 검증. 운영 Swiss·실기기 파일 열람 미검증"},
 'kemet-oracle':{tossRoute:'/oracle/kemet',status:'local-partial',inputContract:'js/oracle-kcg.js 원본 12신 중 3장 선택, 질문의 사랑·재물·성취 분류, 카드별 과거/현재/미래, 합독·헤카·파피루스·전문가 프롬프트',resultRenderer:'apps/toss/src/KemetOracle.tsx + apps/toss/canonical/kemet-oracle.mjs',storageContract:'게스트 무료 키 openKemetModal. 현재 화면 결과',verification:'studio-kemet-browser.mjs: 360px 홈→세 분야 질문→카드 취소·재선택→7장·프롬프트. 12신 원문 구조·무구매 확인. 실기기 미검증'},
 'royal-tea-oracle':{tossRoute:'/oracle/royal-tea',status:'local-partial',inputContract:'royal-tea-oracle.html INTENTS 5개·buildCupMap·buildCertificateHtml. 게스트 기기 또는 소유자 기초시드와 KST 날짜',resultRenderer:'apps/toss/src/RoyalTea.tsx + apps/toss/canonical/royal-tea.mjs',storageContract:'게스트 공개, 같은 소유자·날짜·질문의 동일한 찻잔 감정서를 재계산. 현재 화면의 최근 기록 8개',verification:'studio-royal-tea-browser.mjs 360px 홈에서 5분야와 3개 구역·8장, 재실행 같은 인장 확인. 실기기 미검증'},
 'juyuk-turtle':{tossRoute:'/oracle/turtle',status:'local-partial',inputContract:'js/iching-engine.js 원본 질문·2.2초 길게 누르기·seed·상하괘·64괘, 7장과 전문가 프롬프트. 무료 키 openJuyukModal',resultRenderer:'apps/toss/src/TurtleOracle.tsx + apps/toss/canonical/turtle-oracle.mjs',storageContract:'게스트 공개, 화면 결과. 기존 웹 주문 정책과 별개',verification:'studio-turtle-browser.mjs: 360px 게스트 홈→질문→짧게 누르기 취소→길게 누르기→7장/원문 프롬프트. 64괘 계산 비교. 실기기 제스처·클립보드 미검증'},
 'yeongnyangi-season':{tossRoute:'/moonlight/season-1',status:'local-partial',inputContract:'영냥이의 점술방 시즌 1 → 공개 회차 → 다음/이전 쪽. 웹 serial.mjs 게이트가 빌드 때 공개한 회차만 열람',resultRenderer:'apps/toss/src/MoonlightSeason.tsx + apps/toss/canonical/moonlight-season.mjs',storageContract:'게스트 공개. 원본 크롬과 같은 회차별 기기 이어보기. 다음 회차 번호와 시각만 사전 안내',verification:'studio-season-browser.mjs: 360px 영냥이 홈→1화 18쪽 원본, 이미지 오류 대체 대사·재시도, 재실행→3쪽, 열람 종료. 실기기 이미지 호스트 연결 미검증'},
 'cosmic-soul-meditation':{tossRoute:'/meditation/cosmic',status:'local-partial',inputContract:'cosmic-soul-meditation.html 의도 4개, 30·60분 PHASES, 웹의 _composePhaseLines·_scheduleLines·_buildSchedule 원본 함수와 행동·저널',resultRenderer:'apps/toss/src/CosmicMeditation.tsx + apps/toss/canonical/cosmic-sessions.mjs',storageContract:'토스 소유 계정별 기기 저널 최근 50개와 통계. 무료 키 cosmic-soul-meditation',verification:'studio-cosmic-browser.mjs: 360px 홈→로그인→30·60분→원문·일시정지·완주→저널 저장→재실행→같은 단말 다른 계정에서 기록 없음. R2 실제 재생 미검증'},
 'neville-meditation':{tossRoute:'/meditation/neville',status:'local-partial',inputContract:'neville-meditation.html COURSES 30·60분, 시간별 단계·안내와 THETA_PRESETS 세 음악 세트, 웹 로그인 및 무료 기능 키 neville-meditation',resultRenderer:'apps/toss/src/NevilleMeditation.tsx + apps/toss/canonical/neville-courses.mjs',storageContract:'토스 로그인 후 회차별 현재 화면 진행. 주문·LLM 없음',verification:'studio-neville-browser.mjs 360px 홈→mock 로그인→두 코스 일시정지·재개/곡 선택/단계 전환→완주. R2 스트림의 실기기 재생 미검증'},
 'olympus-oracle':{tossRoute:'/olympus',status:'local-partial',inputContract:'웹 /olympus/ → 오늘의 신탁만 보기 → 수동 생년월일. 원본의 12별자리, 수호신, 날짜별 신탁·지령·행운 값',resultRenderer:'apps/toss/src/OlympusDaily.tsx + lib/fortune/olympus-daily.mjs (OlympusVIPLounge.jsx 공유)',storageContract:'게스트 수동 입력, 현재 화면 결과. 꽃돼지 프로필에서 여는 여덟 행성 라운지와 커플 궁합은 별도',verification:'studio-olympus-browser.mjs 360px 홈에서 게스트/별자리 경계 두 날짜/원본 지령과 행운 값 확인. 프로필 인계·여덟 배치와 궁합은 미이식'},
 'stonehenge-runes':{tossRoute:'/oracle/rune',status:'local-partial',inputContract:'StonehengeRune의 네 가지 무료 펼침',resultRenderer:'apps/toss/src/RuneReading.tsx + StonehengeRune.jsx',storageContract:'현재 화면의 원본 룬 결과·질문 프롬프트와 토스 공유. 네 배열 모두 무료',verification:'350768ae1, 73b5f45f4. 실기기 미검증'},
 'yeongnyangi-daily':{tossRoute:'/daily',status:'local-partial',inputContract:'worker/toss/daily.js',resultRenderer:'apps/toss/src/DailyReadings.tsx',storageContract:'계정별 출석·당일 결과 15종. 호라리는 별도 무료 화면'},
 'fortune-tea-house':{tossRoute:'/fortune-tea-house/',status:'local-partial',inputContract:'worker/toss/native-tea.js',resultRenderer:'apps/toss/service/Screens.jsx',storageContract:'owned-TossPurchase; device-and-console-approval-pending'},
 'saju-fpti':{tossRoute:'/saju-fpti/',status:'local-partial',inputContract:'lib/fpti/fpti-adapter.ts',resultRenderer:'apps/toss/service/TossFpti.tsx',storageContract:'same-tab owner-scoped free result only; profile entitlement and permanent premium report not ported',verification:'mock UI and original calculation only; free-screen parity, approved permanent rights and official device pending'},
 'neo-operation-room':{tossRoute:'/neo-operation-room/',status:'local-partial',inputContract:'worker/toss/native-neo.js',resultRenderer:'apps/toss/service/Screens.jsx',storageContract:'owned-TossPurchase; device-and-console-approval-pending'},
 'fusion-fortune':{tossRoute:'/fusion-fortune/',status:'local-partial',inputContract:'worker/toss/native-fusion.js',resultRenderer:'apps/toss/service/Fusion.jsx',storageContract:'owned-TossPurchase; device-and-console-approval-pending'},
 'life-book-ai':{tossRoute:'/life-book-ai/',status:'local-partial',inputContract:'worker/toss/native-life-book.js',resultRenderer:'apps/toss/service/LifeBook.jsx',storageContract:'owned-TossPurchase; device-and-console-approval-pending'},
 'life-fortune-report':{tossRoute:'/life-book-ai/?mode=lifeFortune',status:'local-partial',inputContract:'worker/routes/life-book-ai.js:nativeLifeBookContract (lifeFortune mode)',resultRenderer:'apps/toss/service/LifeBook.jsx + app/life-book-ai/LifeBookAiClient.tsx',storageContract:'owned-TossPurchase with life-fortune-ai-consultation feature; device-and-console-approval-pending',verification:'life-reading-browser.mjs · 360px 원본 입력 → 독립 모의 가격·주문 2건 → 같은 계정 보관함 원문 → 다른 계정 URL 차단'},
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
 rpt_secretHouseEntryCard:'secret-house',
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
const houseSection=groups.get('secret-house').publicSections[0];
Object.assign(houseSection,{webEntry:'/secret-house_real.html',input:'일간 선택 → 5인 합숙 선택 이력 → 최종 상대',verification:'secret-house-browser.mjs 일반 홈에서 5인 원본 초상·선택·반응·엔딩·다시 도전. Worker 승격·실기기 공유 미검증'});
Object.assign(groups.get('secret-house'),{inputContract:houseSection.input,resultRenderer:'apps/toss/src/SecretHouseReading.tsx + public/secret-house_real.html',verification:houseSection.verification,storageContract:'웹 원본과 같이 현재 게임 상태만 유지. 엔딩 공유는 토스 SDK'});
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
for(const [id,route,entry,source,contract,render] of [
 ['tin-oracle','/oracle/sikojen-povailu','/oracle/sikojen-povailu/','app/oracle/sikojen-povailu/data/shapes.ts','원본 20형상·세 주머니·핀란드어·행운수','apps/toss/src/TinOracle.tsx'],
 ['saju-image-prompts','/saju/sections','index.html:사주 리포트','js/saju-engine.js','일간 오행에 따른 그림 13종 및 10개 하위 분류','apps/toss/src/PublicSectionReading.tsx'],
]){
 groups.set(id,{id,discoveryIds:[],evidence:[{source,entry,implementation:source}],status:'local-partial',tossRoute:route,sku:null,inputContract:contract,resultRenderer:render,storageContract:'무료 원본을 현재 화면에 표시',verification:'일반 홈 360px public-readings-browser.mjs / public-sections-browser.mjs. 네이티브 공유·클립보드 실기기 확인 필요'});
}
groups.set('lenormand-six',{id:'lenormand-six',discoveryIds:[],evidence:[{source:'app/tarot/prompt-maker/TarotPromptMakerClient.tsx',entry:'/tarot/prompt-maker/',implementation:'app/tarot/prompt-maker/data/lenormand.ts'}],status:'local-partial',tossRoute:'/tarot-library',sku:null,inputContract:'원본 36장에서 6장을 고른 뒤 로컬 프롬프트 작성',resultRenderer:'apps/toss/src/Lenormand.tsx',storageContract:'현재 화면의 무료 프롬프트',verification:'paid-tarot-browser.mjs · 360px 게스트 실제 카드 6장·프롬프트'});
for(const id of ['tarot-mindscan','tarot-love-relationship','tarot-celestial-harmony','tarot-prompt-maker']){
 const group=groups.get(id);
 group.webGenerator='worker/toss/tarot-library-generator.js → 원본 웹 유료 전달 Worker';
 group.verification='원본 공급자 mock 단위 194개. 오라클은 360px 77개 배열 중 12장 → 고유 등급 SKU → 이탈·원문 재열람 → 타 계정 차단. 천체 메이저 11장과 황금 통합 카드 별도 검사';
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
  mockContract:'private-simulation.test.mjs 모든 28개 모의 상품 고유 SKU, 같은 주문 중복 전달과 앱 재시작·보관함, 다른 계정 주문·결과 거절 확인',
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
 webVisibleModes:'기본 편지 폼에 6분야. 상담자별 등급형 21개는 웹 Worker catalog/prepare 계약',
 verification:'letter-methods-browser.mjs 12개 기본 편지, letter-question-browser.mjs 두 상담자의 등급·프로필·추가 질문·재열람. 42개 등급형은 모의 소유·SKU 계약.',
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
 'ziwei-deep-report':'ziwei-deep-report',
 'destiny-compass-deep-report':'destiny-compass-ai',
 'animal-totem':'animal-totem','geomancy-oracle':'oracle','naming-ai':'naming-prompt','master-love-codex':'master-love-codex','master-love-codex-compat':'master-love-codex','yoga-guru':'yoga-guru',
 'nakshatra-ai':'nakshatra-ai',
 'dream-psycho-analysis':'dream','fortune-tea-house':'fortune-tea-house','neo-operation-room':'neo-operation-room','life-book-ai':'life-book-ai',
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
 if(['nakshatra-lord-report','nakshatra-dasha-map'].includes(group.id))keys.push(group.id);
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
 if(group.id==='lenormand-six'){group.webEntries=['/tarot/prompt-maker/'];group.webSources.push('app/tarot/prompt-maker/data/lenormand.ts');}
 if(group.id==='home-widget')group.platformDependency='웹은 미리보기, 홈 위젯 설치는 HomeWidgetStudio.tsx의 Android Code Destiny 전용 네이티브 플러그인 필요';
 group.freeCalculation=keys.concat(group.webProductIds).some(isFreeFortuneFeatureKey);
 group.portStatus=group.tossRoute||group.publicSubflows?.length?'일부만 이식':'미이식';
 group.reducedBundle=releaseLink(group.id)?'홈 진입 있음':['today-hub','stonehenge-runes','yeongnyangi-prashna','yeongnyangi-horary'].includes(group.id)?'홈 진입 없음':group.tossRoute?'구현은 있으나 진입 차단':'홈 진입 없음';
 group.currentEntry=group.tossRoute?'일반 홈의 진입 코드 확인':group.publicSubflows?.length?'일부 하위 경로만 홈에 연결':'연결 경로 없음';
 group.bundleVerification=group.id==='yeongnyangi'?'20261114-8 실제 Linux AIT 일반 홈 → 달빛 점술방 → 질문 검색 → 입력. mock 로그인과 소유 원문 조회 통과. 휴대폰 미검증':'휴대폰 및 상품별 전체 흐름 미검증';
 if(!group.tossRoute)group.tossLogin='토스 기능 미연결';
 else if(nativeSource[group.id]||['heukwol-consult','neo-letter','fortune-chat','yeongnyangi','yeongnyangi-prashna'].includes(group.id))group.tossLogin='구매·기록에 토스 계정 필요';
 else if(['manse','vedic','pet-saju'].includes(group.id))group.tossLogin=group.id==='pet-saju'?'기본 입력·오행 게스트, 심층 구매·보관함은 계정별':'비회원 수동 출생정보 계산 가능';
 else if(['nakshatra-lord-report','nakshatra-dasha-map','nakshatra-muhurta','nakshatra-vvip-codex','destiny-meeting-place','manse','astrology','vedic','human-design','flower','yeongnyangi-daily','career-style','cosmic-soul-meditation','neville-meditation'].includes(group.id))group.tossLogin='계산 또는 기록 조회에 토스 계정 필요';
 else if(group.id==='destiny-compass')group.tossLogin='기본 차트·퀘스트 공개';
 else if(['destiny-compass-crossroads','destiny-compass-life-voyage','destiny-compass-future-sim'].includes(group.id))group.tossLogin='토스 로그인 후 무료 판독';
 else if(group.id==='nakshatra')group.tossLogin='출생 개인 계산·도감 게스트 공개';
 else if(group.id==='nakshatra-compat')group.tossLogin='두 사람 계산은 토스 로그인 필요';
 else if(group.id==='today-hub')group.tossLogin='별자리·띠는 공개. 네 체계와 오늘의 세 장은 토스 로그인 필요. 개인화는 소유 프로필만 선택';
 else if(['face-reading','physiognomy','past-life-face','luck-sync-diary','home-widget','kemet-oracle','royal-tea-oracle','juyuk-turtle','dream','mbti-animal-compat','ifa-oracle','consultation-webtoons','heukwol-story','saju','animal-destiny','music','novel','famous-saju','bias-destiny','yeongnyangi-horary','yeongnyangi-season','olympus-oracle','stonehenge-runes'].includes(group.id))group.tossLogin='공개 진입';
 else group.tossLogin='기능별 단계 검증 필요';
 group.tossResult=group.resultRenderer||'결과 화면 연결 미확인';
 group.reread=group.storageContract||'재열람 경로 미확인';
 if(group.id==='love-code'){
  group.freeCalculation=true;group.tossLogin='탐색과 상대 매칭은 공개. 시뮬레이션 시작 시 토스 로그인 확인';group.reducedBundle='홈 진입 없음';
  group.webSources=[...new Set([...group.webSources,'app/saju/love-simulation/_components/LoveSimulationEngine.tsx','app/saju/love-simulation/_services/sajuApi.ts','app/saju/love-simulation/_engine/compatibilityEngine.ts'])];
 }
 if(group.id==='saju-compatibility'){
  group.freeCalculation=false;group.reducedBundle='홈 진입 없음';group.tossLogin='입력은 공개, 구매 및 원문은 토스 계정 필요';group.saleStatus='콘솔·운영 설정 필요';
  group.webSources=[...new Set([...group.webSources,'js/saju-engine.js','js/saju-compat-flow.mjs','worker/routes/saju-compat-basic.js','worker/lib/saju-compat-schema.js'])];
 }
 if(group.id==='saju-sibyl'){group.freeCalculation=true;group.tossLogin='연도별 무료 분석은 공개';group.reducedBundle='홈 진입 없음';}
 if(group.id==='naming-ai')group.tossLogin='후보·입력은 게스트. 유료 상담과 기록은 토스 로그인 필요';
 if(group.id==='points'){group.tossLogin='안내는 공개, 이용권과 단건 거래 내역은 기존 웹 계정으로 인증';group.saleStatus='토스 판매 없음 · 웹 보유권 조회';group.webSources.push('app/points/history/PointHistoryClient.tsx','worker/routes/payments.js');}
 if(group.id==='island-consult'){
  group.webSources=[...new Set([...group.webSources,'app/island-consult/page.tsx','worker/routes/ziwei-island-ai.js','worker/routes/ziwei-island-report.js','app/records/view/SavedServiceReading.tsx'])];
  group.webProductIds=[...new Set([...group.webProductIds,'ziwei-island-palace-consult','ziwei-island-deep-report'])];
  group.tossLogin='안내는 공개. 기록·출생 프로필 열람은 기존 웹 계정으로 인증';
  group.inputContract='궁별 상담은 원래 웹 계정의 저장 세션 id 또는 pending=1, 고정 리포트는 동일 웹 계정에서 구매한 출생정보의 profileId';
  group.storageContract='웹 궁별 AI는 완료·부분 저장 원문, 별도 고정 12궁 리포트는 원래 웹 계정과 출생정보 권리로 원본을 계산';
  group.reread=group.storageContract;group.verification='web-history-browser.mjs 360px. 원본 Worker 신규 AI 준비·생성에 410 ISLAND_NOW_FREE. GET /result 소유자·환불·부분 원문 및 별도 고정 리포트의 birthKey 권한 mock 테스트';
 }
 if(group.id==='ziwei-island'){group.freeCalculation=true;group.tossLogin='게스트 공개 계산';group.reducedBundle='홈 진입 없음';}
 const testedGuestTarot=['tarot-reunion','tarot-crystal-soul','tarot-year-fortune','tarot-numerology','tarot-ijik'];
 if(testedGuestTarot.includes(group.id)||['olympus-oracle','ifa-oracle','stonehenge-runes','dream'].includes(group.id)){
  group.bundleVerification='Linux AIT c3a960736 · 43460223398 · 360px 일반 홈에서 게스트 입력과 원본 결과 확인. private-bundle-public-readings.mjs tarot olympus; 네이티브 공유는 기기 미검증';
  group.tossLogin='공개 입력 · 구매 없음';
  if(group.id==='dream'||testedGuestTarot.includes(group.id)){group.portStatus='이미 동작';group.verification=group.bundleVerification;group.saleStatus='웹 무료 계산';}
 }
 if(['juyuk-turtle','kemet-oracle','royal-tea-oracle'].includes(group.id))group.bundleVerification='20261114-9 Linux AIT 43463538068, 공개 홈에서 질문/점술 선택부터 원본 결과, 게스트, 360px 통과';
 if(group.id==='ziwei-island'||group.id==='home-widget')group.bundleVerification='f2e46d05a · Linux AIT 43468160819 일반 홈, 무구매 360px. 자미 12궁·초상 및 위젯 6개 구성을 확인';
 if(['lenormand-six','saju-image-prompts','tin-oracle'].includes(group.id)){group.freeCalculation=true;group.tossLogin='게스트 공개';group.saleStatus='웹 무료 계산';}
 if(group.id==='saju-sibyl')group.tossLogin='연간 기본 분석 공개. 각 출생 프로필의 심층 연도별 보고서는 로그인·구매 필요';
 if(group.id==='palm-reading')group.tossLogin='분석 준비·주문·원문은 토스 계정 필요';
 if(group.id==='neo-consultation')group.tossLogin='질문과 견적 열람 가능, 모의 접수와 기록은 계정별';
 if(group.publicSections){
  group.freeCalculation=true;
  group.webSources=[...new Set([...group.webSources,...group.publicSections.map(s=>s.source)])];
  if(dashboardSections[group.publicSections[0].featureKey]){
   group.tossLogin='공개 입력 · 구매 없음';
   group.reducedBundle='홈 진입 없음';
  }
 }
 const coreTarot=['tarot','tarot-healing','tarot-self-esteem'];
 if(coreTarot.includes(group.id)){
  group.resultRenderer='apps/toss/src/CoreTarot.tsx + apps/toss/service/core-tarot-loader.mjs';
  group.tossResult=group.resultRenderer;
  group.tossLogin='게스트 입력과 원본 결과 공개';
  group.verification='core-tarot-browser.mjs 360px 일반 홈에서 오늘 1장, 태양 회복 4장, 자기 기준 5장. local-tarot-parity.test.mjs 원문 352조합 및 156개 카드 대조';
  group.portStatus='이미 동작';group.freeCalculation=true;group.saleStatus='공개 리딩 · 토스 구매 없음';
 }
 const paidTarot=['tarot-celestial-harmony','tarot-love-relationship','tarot-mindscan','tarot-prompt-maker'];
 if(paidTarot.includes(group.id)){group.tossLogin='배열·질문·카드 입력은 공개. 유료 생성과 저장 원문은 주문 소유 계정으로 인증';group.saleStatus='콘솔·운영 설정 필요';}
 const accessByService={
  maya:'기본 달력 공개. 유료 프롬프트는 소유 계정 필요',
  omikuji:'비회원 뽑기 가능. 같은 탭의 임시 복구는 로그인 계정별',
  psychotest:'게스트 검사 가능. 현재 화면에서만 결과 열람',
  'saju-fpti':'게스트 계산 가능. 현재 탭의 저장 결과는 같은 로그인 계정으로 재열람',
  'saju-guardian':'보관한 출생정보와 구매 원문은 토스 계정 필요',
  sukuyo:'기본 본명숙 입력 정책은 SukuyoBasic.tsx, 전문가 궁합은 별도 로그인·주문',
  ziwei:'기본 명반과 12궁은 게스트 계산. 별도 심층 결과는 로그인·소유 확인',
 };
 if(accessByService[group.id])group.tossLogin=accessByService[group.id];
 if(['juyuk-turtle','kemet-oracle','royal-tea-oracle','stonehenge-runes','ifa-oracle'].includes(group.id))group.portStatus='이미 동작';
 if(['fortune-chat','neo-letter'].includes(group.id)){group.verification=letterProducts[0].verification;group.saleStatus='기본·질문 편지별 콘솔 원장 확인 필요';}
 if(group.id==='yeongnyangi')group.saleStatus='상품별 승인된 독립 SKU만 원장에 기록. 신규 판매 보류';
 if(['manse','vedic','pet-saju'].includes(group.id))group.verification='guest-calculators-browser.mjs 360px 홈, 비회원 계산. 기본 베다 local Swiss 원본, 만세력 원본 대운·명식, 반려동물 원본 오행·유료 로그인 경계';
 if(['vedic-ai','ziwei-ai','astrology-ai','new-year-ai','karma-destiny-ai','sukuyo-compatibility-ai','fusion-fortune','love-secret-ai'].includes(group.id))group.verification='expert-purchase-browser.mjs 7종 및 sukuyo-expert-browser.mjs 1종. 360px 일반 홈 → 상품별 입력·모의 결제와 생성 → 구매 기록·원문 재열람 → 다른 계정 URL 거절. expert-offers-browser.mjs 일반 판매 비활성';
 if(group.id==='life-book-ai'||group.id==='life-fortune-report')group.verification='life-reading-browser.mjs 360px 홈, 두 상품 각각의 모의 주문 → 원문 → 구매 기록 재열람·다른 계정 차단';
 if(!group.verification){
  const checks={'animal-destiny':'animal-destiny.test.mjs',astrology:'basic-sky-chart.test.mjs · basic-sky-ui.test.mjs',vedic:'basic-sky-chart.test.mjs · basic-sky-ui.test.mjs','bias-destiny':'bias-report.test.mjs',flower:'flower.test.mjs · flower-ui.test.mjs','famous-saju':'famous-archive.test.mjs',novel:'novel-reader.test.mjs',music:'music-shelf.test.mjs',manse:'manse-ui.test.mjs',saju:'basic-saju-flow.test.mjs','fortune-tea-house':'room-browser.mjs','neo-operation-room':'room-browser.mjs','yeongnyangi-daily':'daily-ui.test.mjs · daily.test.mjs','fusion-fortune':'fusion-billing.test.mjs · native-fusion-boundary.test.mjs',yeongnyangi:'studio-browser.mjs · private-bundle-owner-browser.mjs'};
  group.verification=checks[group.id]?'apps/toss/test/ '+checks[group.id]+' · 개별 검사 범위. 실제 기기 미검증':group.tossRoute?'입구와 결과 소스 대조. 독립적인 전체 사용자 경로 검증 근거 미기록':'독립적인 일반 홈 경로 미확인';
 }
 if(nativeSource[group.id]||['heukwol-consult','palm-reading','neo-consultation','saju-guardian','saju-sibyl','maya','pet-saju','yeongnyangi-prashna'].includes(group.id))group.saleStatus='유료 상품 콘솔·운영 설정 필요';
 if(!group.saleStatus)group.saleStatus=group.freeCalculation?'기본 계산은 구매 없음 · 부가 상품은 별도 행 참조':'현재 기능에 신규 구매 버튼 없음';
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
