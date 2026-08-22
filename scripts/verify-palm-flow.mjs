// 손금 플로우 회귀 가드.
//
// 이 가드가 존재하는 이유(2026-07 사고):
//   프로덕션 빌드는 next.config.mjs 의 output:"export" 라 app/api/** 라우트가 통째로 빠진다.
//   그래서 Gemini Vision 이 들어있던 app/api/palm/analyze/route.ts 는 로컬 dev 에서만 돌았고,
//   실제 트래픽이 타는 worker/routes/palm.js 에는 LLM 호출이 한 줄도 없었다.
//   사용자는 "AI 손금"이라는 이름으로 고정 좌표 가이드라인 + 정적 템플릿을 받고 있었다.
//   손금에는 verify 가드가 하나도 없어서 이 상태가 오래 드러나지 않았다.
//
// 아래 단언들은 "AI 가 실제로 배선되어 있는가"를 소스 수준에서 강제한다.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (p) => readFileSync(resolve(root, p), 'utf8');

const route = read('worker/routes/palm.js');
const vision = read('worker/lib/palm-vision.js');
const gemini = read('worker/lib/gemini.js');
const paidRegistry = read('worker/lib/paid-feature-registry.js');
const billingRegistry = read('worker/lib/billing-feature-registry.js');
const client = read('app/palm-reading/PalmDestinyMain.tsx');
const clientCopy = read('app/palm-reading/_lib/copy.ts');
const uiState = read('lib/palm/palm-ui-state.js');
const landmarks = read('app/palm-reading/palm-hand-landmarks.ts');

// ── 1. 워커 라우트가 실제로 LLM 을 호출한다 ──
// (이게 깨지면 프로덕션 손금이 다시 "AI 없는 템플릿"으로 되돌아간다)
assert.match(route, /from ["']\.\.\/lib\/palm-vision\.js["']/, 'worker/routes/palm.js: palm-vision 모듈을 import 해야 함');
assert.match(route, /analyzeHandWithGeminiVision\(/, 'worker/routes/palm.js: Gemini Vision 을 실제로 호출해야 함');
assert.match(route, /buildPalmDeepConsult\(/, 'worker/routes/palm.js: 심층 해석을 생성해야 함');

// ── 2. interpretation 이 항상 null 이면 안 된다 ──
// 종전에는 `interpretation: null` 하드코딩이라 클라이언트가 늘 로컬 템플릿으로 폴백했다.
assert.doesNotMatch(
  route,
  /interpretation:\s*null\s*,/,
  'worker/routes/palm.js: interpretation 을 무조건 null 로 반환하면 안 됨 (템플릿 폴백 고착)',
);
assert.match(route, /consultText/, 'worker/routes/palm.js: 응답에 consultText 가 실려야 함');

// ── 3. 🔴 비전 호출은 Workers AI 폴백을 꺼야 한다 ──
// 폴백 경로는 normalized.prompt 만으로 메시지를 만들어 inline_data(사진)를 버린다.
// 켜두면 "사진 없이 손금을 판독하라"를 받은 텍스트 모델이 판독을 지어낸다.
const visionCall = vision.slice(
  vision.indexOf('callGeminiJsonWithRetry(env'),
  vision.indexOf('if (!ai?.ok)'),
);
assert.ok(visionCall.length > 0, 'palm-vision: 비전 호출 블록을 찾지 못함');
assert.match(visionCall, /geminiParts:\s*parts/, 'palm-vision: 비전 호출에 geminiParts 를 넘겨야 함');
assert.match(
  visionCall,
  /fallbackToWorkersAI:\s*false/,
  'palm-vision: 비전 호출은 fallbackToWorkersAI:false 여야 함 (폴백이 이미지를 버려 판독을 지어냄)',
);

// ── 4. gemini.js 가 geminiParts 를 실제로 전달한다 ──
assert.match(gemini, /geminiParts:\s*Array\.isArray\(options\.geminiParts\)/, 'worker/lib/gemini.js: geminiParts 전달 누락');

// ── 5. 심층 해석(텍스트 전용)은 폴백을 켜되 fallbackMinChars 를 준다 ──
// CLAUDE.md: 폴백을 켠 유료 라우트는 fallbackMinChars 를 반드시 함께 준다.
assert.match(vision, /PALM_CONSULT_MIN_CHARS\s*=\s*(\d+)/, 'palm-vision: 최소 분량 상수가 있어야 함');
assert.match(
  vision,
  /fallbackMinChars:\s*PALM_CONSULT_FALLBACK_MIN_CHARS/,
  'palm-vision: 심층 해석에 fallbackMinChars 를 줘야 함 (짧은 폴백이 유료 결과로 나가는 것 차단)',
);
const minChars = Number(vision.match(/PALM_CONSULT_MIN_CHARS\s*=\s*(\d+)/)[1]);
assert.match(
  vision,
  /PALM_CONSULT_FALLBACK_MIN_CHARS\s*=\s*Math\.round\(PALM_CONSULT_MIN_CHARS\s*\*\s*0\.4\)/,
  `palm-vision: 폴백 문턱은 관례대로 최소분량(${minChars}) × 0.4 여야 함`,
);

// ── 6. 문양·세부선은 미검출이 기본값 ──
// 없는 걸 있다고 하지 않는 방향으로 편향시킨 지점. 되돌리면 헛소리가 화면에 올라간다.
assert.match(vision, /detected=false,\s*confidence=0/, 'palm-vision 프롬프트: 미검출 기본값 지시가 있어야 함');
assert.match(
  vision,
  /if \(!bool\(o\.detected, false\)\) return null;/,
  'palm-vision: specialMarks 는 detected!==true 면 버려야 함',
);
assert.match(vision, /if \(confidence <= 0\) return null;/, 'palm-vision: 신뢰도 0 문양은 버려야 함');
for (const code of ['cross', 'triangle', 'star', 'island', 'square', 'grid']) {
  assert.match(vision, new RegExp(`${code}:`), `palm-vision: 문양 ${code} 정의 누락`);
}
for (const line of ['healthLine', 'intuitionLine', 'girdleOfVenus', 'travelLine', 'braceletLine']) {
  assert.match(vision, new RegExp(line), `palm-vision: 세부선 ${line} 누락`);
}

// ── 7. 워커 라우트 보안 가드 ──
// Gemini Vision(사진 2장)을 태우는 유료 경로라 무인증이면 무제한 무과금 비용 경로가 된다.
assert.match(route, /await requirePalmAuth\(request, env\)/, 'worker/routes/palm.js: 인증 필수');
assert.match(route, /readJsonWithLimit\(request, MAX_REQUEST_BODY_BYTES\)/, 'worker/routes/palm.js: 본문 크기 상한 필수');
assert.doesNotMatch(route, /await readJson\(request\)/, 'worker/routes/palm.js: 무제한 readJson 사용 금지');
// DB 일시 장애를 확정 401 로 세탁하면 로그인 유저가 게스트로 강등된다.
assert.match(route, /isAuthDbInfraError\(error\)/, 'worker/routes/palm.js: 인프라 장애를 401 로 세탁하지 말 것');
assert.match(route, /AUTH_TEMPORARILY_UNAVAILABLE/, 'worker/routes/palm.js: 인프라 장애는 503 으로 표면화');

// ── 8. 결제: 단일 SKU, 가격 정합 ──
const generalCost = Number(paidRegistry.match(/"palm-reading-general":\s*\{\s*cost:\s*(\d+)/)[1]);
assert.equal(generalCost, 100, 'palm-reading-general 은 100코인(10,000원)이어야 함');
// billing-feature-registry 는 가격을 재기입하지 않고 paid-feature-registry 에서 파생한다.
// 리터럴이 되살아나면 두 표가 조용히 갈라지므로 소스에서 먼저 막고, 실제 해석값으로 한 번 더 본다.
assert.doesNotMatch(
  billingRegistry,
  /featureKey:\s*"palm-reading-general",\s*cost:/,
  'billing-feature-registry: 손금 가격을 리터럴로 재기입하지 말 것(FEATURE_KEY_PRICE_TABLE 파생 유지)',
);
const { getBillingFeaturePricing } = await import('../worker/lib/billing-feature-registry.js');
const billingPalm = getBillingFeaturePricing({ categoryKey: 'palm-reading', subFeatureKey: 'general' });
assert.equal(billingPalm?.ok, true, 'palm-reading.general 이 카테고리 경로로 해석돼야 함');
assert.equal(billingPalm.pricing.cost, generalCost, '두 레지스트리의 손금 가격이 일치해야 함');
assert.equal(billingPalm.pricing.amountKRW, generalCost * 100, '손금 원화가는 코인×100 이어야 함');
assert.match(
  paidRegistry,
  /PER_USE_PAID_FEATURE_KEY_LIST[\s\S]*?"palm-reading-general"/,
  'palm-reading-general 은 회당결제 목록에 있어야 함',
);
// 레거시 키는 과거 주문·환불이 참조하므로 지우지 않는다.
assert.match(paidRegistry, /"palm-reading-ai-consult"/, '레거시 ai-consult 키는 레지스트리에 남아 있어야 함');

// ── 9. 클라이언트: 2차 과금이 사라졌다 ──
assert.doesNotMatch(client, /handleGeneratePalmAiConsult/, '클라이언트: 2차 과금 핸들러가 남아 있으면 안 됨');
assert.doesNotMatch(client, /PALM_AI_CONSULT_SUB_FEATURE_KEY/, '클라이언트: ai-consult 과금 키 참조 제거');
assert.doesNotMatch(client, /전문가 상담 보기 \(5,000원\)/, '클라이언트: 하드코딩 5,000원 CTA 제거');
// 존재하지 않는 하위키(love/wealth/...)를 결제에 보내면 가격 조회가 빈다.
assert.doesNotMatch(
  client,
  /PALM_BILLING_SUB_FEATURE_BY_PURPOSE/,
  '클라이언트: 레지스트리에 없는 purpose 별 하위키 매핑 금지',
);
assert.match(client, /PALM_BILLING_SUB_FEATURE_KEY = "general"/, '클라이언트: 결제 하위키는 general 단일');

// ── 10. 실제 손 검출: no-hand 와 unavailable 을 구분한다 ──
// 둘을 합치면 CDN 이 막힌 사용자의 정상 손 사진을 "손이 아니다"라며 거부하게 된다.
assert.match(landmarks, /status:\s*"no-hand"/, 'palm-hand-landmarks: no-hand 상태가 있어야 함');
assert.match(landmarks, /status:\s*"unavailable"/, 'palm-hand-landmarks: unavailable 상태가 있어야 함');
assert.match(landmarks, /staticImageMode:\s*true/, 'palm-hand-landmarks: 정지 이미지 모드여야 함');
assert.match(
  client,
  /if \(landmarkCheck\.status === "no-hand"\)/,
  '클라이언트: 손 미검출은 업로드 단계에서 막아야 함(과금 이전)',
);
assert.doesNotMatch(
  client,
  /landmarkCheck\.status === "unavailable"[\s\S]{0,120}return;/,
  '클라이언트: 검출기 미가용을 이유로 업로드를 막으면 안 됨(degrade 해야 함)',
);

// ── 10b. 품질 게이트는 막다른 길이 되면 안 된다 ──
// 사전점검은 144px 샘플 휴리스틱이라 오탐이 난다. 확정 차단으로 두면 멀쩡한 사진을 든
// 유료 사용자가 빠져나갈 길이 없어진다(과거 정적 게이트 leaf throw → alert 사고와 같은 형태).
assert.match(client, /isQualityBlocked/, '클라이언트: 저품질 시 CTA 를 막아야 함');
assert.match(
  client,
  /onClick=\{\(\) => setQualityOverride\(true\)\}/,
  '클라이언트: 저품질 차단에는 사용자가 직접 진행할 수 있는 탈출 경로가 있어야 함',
);
// 새 사진이 들어오면 이전 "그대로 진행" 판단은 승계되면 안 된다.
assert.match(
  client,
  /setLandmarkStateBySide\(\(prev\) => \(\{ \.\.\.prev, \[side\]: landmarkCheck \}\)\);\s*\n\s*\/\/[^\n]*\n\s*setQualityOverride\(false\);/,
  '클라이언트: 새 사진 등록 시 품질 오버라이드가 해제돼야 함',
);

// ── 10c. 한 손만으로도 된다는 사실을 화면에 명시한다 ──
// 종전에는 '양손 비교 업로드(선택)' 제목으로만 암시돼 양손 필수로 오해할 여지가 있었다.
// 🔴 2026-08-22 다국어화(_lib/copy.ts 도입)로 이 문구가 클라이언트 소스가 아니라 카피 모듈로 이동했다.
assert.match(clientCopy, /한 손만 등록해도 분석됩니다/, '클라이언트 카피: 한 손 분석 가능 문구 필요');

// ── 10d. 촬영/앨범 버튼 우선순위는 CSS 로 가른다 ──
// JS 기기 판별은 SSR 과 첫 렌더가 어긋나 버튼이 튄다. 너비가 아니라 포인터 종류로 가른다.
assert.match(client, /@media \(hover: none\) and \(pointer: coarse\)/, '터치 기기 분기 필요');
assert.match(client, /@media \(hover: hover\) and \(pointer: fine\)/, '포인터 기기 분기 필요');
assert.match(client, /\.cd-capture-actions__camera \{ order: 1; \}/, '터치=촬영 우선');
assert.match(client, /\.cd-capture-actions__gallery \{ order: 1; \}/, '데스크톱=파일 선택 우선');

// ── 11. 에러 문구: 워커 원문이 사용자에게 새지 않는다 ──
for (const code of ['MISSING_IMAGE', 'MISSING_DOMINANT_HAND', 'AUTH_TEMPORARILY_UNAVAILABLE']) {
  assert.match(uiState, new RegExp(`code === "${code}"`), `palm-ui-state: ${code} 사용자 문구 매핑 누락`);
}

// ── 12. 한 손만으로도 분석 가능 (양손 강제 금지) ──
assert.match(
  uiState,
  /\(leftFile \|\| rightFile\)/,
  'palm-ui-state: 한 손만 등록해도 분석 가능해야 함 (|| 유지, && 금지)',
);
assert.match(route, /hasMeaningfulInput\(leftInput\) && !hasMeaningfulInput\(rightInput\)/, '워커: 양손 강제 금지');

console.log(
  `[verify-palm-flow] PASS — 워커 Vision 배선·폴백차단·미검출기본값·인증/본문가드·단일SKU ${generalCost}코인·손검출 degrade`,
);
