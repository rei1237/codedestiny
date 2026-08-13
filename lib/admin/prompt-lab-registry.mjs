// 관리자 프롬프트 랩 레지스트리 — "어떤 운세의 프롬프트를 뽑을 수 있는가"의 단일 정본.
//
// 워커(worker/lib/admin-prompt-lab-loaders.js)와 관리자 UI(app/admin/prompts)가 이 파일 하나를
// 함께 import 한다. 양쪽에 따로 선언하면 반드시 어긋나므로 순수 데이터만 두고 import 는 넣지 않는다
// (lib/cms/registry.mjs 와 같은 이유·같은 규칙).
//
// 새 운세를 랩에 추가하는 방법:
//   1) 그 라우트에 `export async function buildAdminLabPrompt(body, options)` 를 추가한다.
//      프로덕션이 쓰는 조립 함수를 그대로 불러서 { systemPrompt, prompt } 를 돌려주면 된다.
//      🔴 랩 전용 프롬프트를 새로 쓰지 말 것 — 프로덕션과 다른 문장을 보여주면 랩이 거짓말을 한다.
//   2) 아래 ADMIN_PROMPT_LAB_SERVICES 에 항목 1개를 추가한다.
//   3) worker/lib/admin-prompt-lab-loaders.js 에 동적 import 한 줄을 추가한다.
// 관리자 화면의 셀렉트·입력폼·그룹 구분은 이 선언에서 자동 생성된다.
//
// 🔴 랩은 LLM 을 부르지 않는다. 프롬프트 문자열만 조립해서 돌려준다(과금 0). 결제 게이트도 타지 않는다
//    — 관리자 인증만 통과하면 어떤 운세든 프롬프트를 볼 수 있어야 하는 것이 이 기능의 존재 이유다.

/** 좌측 셀렉트의 묶음. order 순으로 렌더한다. */
export const ADMIN_PROMPT_LAB_GROUPS = Object.freeze([
  { id: "core", label: "기본 점술", order: 10 },
  { id: "report", label: "심층 리포트", order: 20 },
  { id: "compat", label: "궁합 · 관계", order: 30 },
  { id: "special", label: "특화 상담", order: 40 },
]);

/* 입력 kind — UI 가 이 선언을 보고 폼을 조건부로 렌더한다.
     profile      생년 프로필(이름·성별·생년월일·시각·달력·출생지). 거의 모든 운세가 쓴다
     question     사용자 질문 한 줄
     domain       분야 선택(연애/재물/직업…). 분야별 프롬프트 템플릿이 있는 운세만
     variant      기능 고유의 변형 선택. variantOptions 에 선택지를 둔다
     targetYear   대상 연도(신년운세)
     partner      상대방 생년 프로필(궁합류)
     dreamText    꿈 내용 원문
     petInfo      반려동물 정보 */

export const ADMIN_PROMPT_LAB_SERVICES = Object.freeze([
  // ───────────────── 기본 점술 — admin.js 에 이미 조립기가 있는 6종 ─────────────────
  // builtIn: admin.js 의 buildAdminPromptByService 가 직접 처리한다. 검증된 경로라 건드리지 않는다.
  {
    key: "saju",
    label: "사주",
    routes: ["fortune.js"],
    group: "core",
    builtIn: true,
    inputs: ["profile", "domain", "question"],
    note: "격국·용신·대운까지 엔진 계산을 태운 완성 프롬프트",
  },
  {
    key: "tarot",
    label: "타로",
    routes: ["fortune.js"],
    group: "core",
    builtIn: true,
    inputs: ["profile", "domain", "question"],
  },
  {
    key: "sukuyo",
    label: "숙요",
    routes: ["fortune.js"],
    group: "core",
    builtIn: true,
    inputs: ["profile", "domain", "question"],
  },
  {
    key: "astrology",
    label: "서양 점성술",
    routes: ["astrology-ai.js"],
    group: "core",
    builtIn: true,
    inputs: ["profile", "domain", "question"],
    note: "출생지 좌표가 있어야 정확한 차트가 나온다",
  },
  {
    key: "ziwei",
    label: "자미두수",
    routes: ["ziwei-ai.js"],
    group: "core",
    builtIn: true,
    inputs: ["profile", "domain", "question"],
  },
  {
    key: "vedic",
    label: "베다 점성술",
    routes: ["vedic-ai.js"],
    group: "core",
    builtIn: true,
    inputs: ["profile", "domain", "question"],
    note: "출생지 좌표가 있어야 정확한 차트가 나온다",
  },

  // ───────────────── 심층 리포트 ─────────────────
  {
    key: "new-year",
    label: "신년운세",
    routes: ["new-year-ai.js"],
    group: "report",
    inputs: ["profile", "targetYear", "question"],
    note: "원국 + 목표 연도의 세운·월운을 함께 계산한다",
  },
  {
    key: "karma-destiny",
    label: "카르마 데스티니",
    routes: ["karma-destiny-ai.js"],
    group: "report",
    inputs: ["profile", "question"],
    note: "사주·서양·베다·자미·숙요 다섯 렌즈를 통합 계산한다 (다소 느림)",
  },
  {
    key: "life-book",
    label: "인생의 책",
    routes: ["life-book-ai.js"],
    group: "report",
    inputs: ["profile", "variant", "question"],
    variantLabel: "장(章)",
    note: "장 목록은 프롬프트를 뽑으면 응답에서 채워진다",
  },
  {
    key: "ziwei-deep-report",
    label: "자미두수 심층 리포트",
    routes: ["ziwei-deep-report.js"],
    group: "report",
    inputs: ["profile", "variant", "question"],
    variantLabel: "장(chapter)",
  },

  // ───────────────── 궁합 · 관계 ─────────────────
  {
    key: "sukuyo-compatibility",
    label: "숙요 궁합",
    routes: ["sukuyo-compatibility-ai.js"],
    group: "compat",
    inputs: ["profile", "partner", "question"],
  },
  {
    key: "master-love-codex",
    label: "마스터 러브 코덱스",
    routes: ["master-love-codex.js"],
    group: "compat",
    inputs: ["profile", "partner", "variant", "question"],
    variantLabel: "장(chapter)",
  },
  {
    key: "love-secret",
    label: "연애 비책",
    routes: ["love-secret-ai.js"],
    group: "compat",
    inputs: ["profile", "question"],
  },

  // ───────────────── 특화 상담 ─────────────────
  {
    key: "destiny-compass",
    label: "운명의 지도",
    routes: ["destiny-compass.js"],
    group: "special",
    inputs: ["profile", "question"],
  },
  {
    key: "destiny-compass-report",
    label: "운명의 지도 심층 리포트",
    routes: ["destiny-compass-ai.js"],
    group: "special",
    inputs: ["profile", "question"],
    note: "9섹션 계약 프롬프트",
  },
  {
    key: "fortune-tea-house",
    label: "운명 찻집",
    routes: ["fortune-tea-house.js"],
    group: "special",
    inputs: ["profile", "variant", "question"],
    variantLabel: "상담 모드",
    variantOptions: [
      { key: "tarot", label: "타로" },
      { key: "saju", label: "사주" },
      { key: "sukuyo", label: "숙요" },
    ],
  },
  {
    key: "ziwei-island",
    label: "자미두수 섬 상담",
    routes: ["ziwei-island-ai.js"],
    group: "special",
    inputs: ["profile", "variant", "question"],
    variantLabel: "궁(palace)",
  },
  {
    key: "nakshatra",
    label: "나크샤트라",
    routes: ["nakshatra-ai.js"],
    group: "special",
    inputs: ["profile", "variant", "question"],
    variantLabel: "섹션",
  },
  {
    key: "neo-operation-room",
    label: "팩폭 운명 전략실",
    routes: ["neo-operation-room.js"],
    group: "special",
    inputs: ["profile", "variant", "question"],
    variantLabel: "섹션",
  },
  {
    key: "animal-totem",
    label: "동물 토템",
    routes: ["animal-totem.js"],
    group: "special",
    inputs: ["profile", "question"],
  },
  {
    key: "guardian-fortune",
    label: "수호신 운세",
    // 전용 라우트가 없다 — fortune.js 가 guardian-fortune-generate.js 를 거쳐 서빙한다.
    routes: ["fortune.js"],
    group: "special",
    inputs: ["profile", "variant", "question"],
    variantLabel: "모드",
  },
  {
    key: "dream",
    label: "꿈해몽",
    routes: ["dream.js"],
    group: "special",
    inputs: ["dreamText", "question"],
    note: "생년 정보 없이 꿈 내용만으로 프롬프트가 만들어진다",
  },
  {
    key: "pet-saju",
    label: "반려동물 사주",
    routes: ["pet-saju-ai.js"],
    group: "special",
    inputs: ["petInfo", "question"],
  },
]);

/* 랩에서 뽑을 수 없는 기능과 그 이유. verify:admin-prompt-lab 가드가 이 목록을 읽어
   "LLM 을 쓰는데 랩에 없는 운세"를 신고할 때 예외로 인정한다. 사유 없이 여기 추가하지 말 것.
   항목의 route 는 실제로 존재하는 worker/routes/*.js 여야 한다(가드가 확인한다).

   관상은 여기 없다 — 워커 라우트 자체가 없기 때문이다. 루트 AnalysisEngine.js 의 규칙 엔진이라
   LLM 을 쓰지 않고, 따라서 뽑을 프롬프트도 없다. */
export const ADMIN_PROMPT_LAB_EXCLUSIONS = Object.freeze([
  {
    route: "palm.js",
    reason: "손금 이미지가 있어야 프롬프트가 성립한다(worker/lib/palm-vision.js). 이미지 업로드는 랩 범위 밖.",
  },
  {
    route: "yoga-guru",
    reason: "시스템 프롬프트를 클라이언트가 요청 본문으로 보내는 구조라 서버에 정본이 없다(worker/routes/yoga-guru.js).",
  },
  {
    route: "oracle",
    reason: "지오맨시 괘를 뽑는 난수 결과가 있어야 프롬프트가 성립한다. 매 실행이 달라 랩 미리보기의 의미가 약하다.",
  },
  {
    route: "celestial-harmony",
    reason: "리딩 결과 + 골든카드 스냅샷이 선행돼야 한다. 단독 프로필로는 조립되지 않는다.",
  },
  {
    route: "naming-prompt",
    reason: "이 라우트 자체가 사용자에게 프롬프트를 만들어 주는 기능이라 랩과 목적이 겹친다.",
  },
  {
    route: "fusion-fortune",
    reason: "여러 운세의 선행 결과를 합치는 2차 상담이라 단독 조립 불가.",
  },
]);

const SERVICE_BY_KEY = new Map(ADMIN_PROMPT_LAB_SERVICES.map((entry) => [entry.key, entry]));

export function getAdminPromptLabService(key) {
  return SERVICE_BY_KEY.get(String(key || "")) || null;
}

export function listAdminPromptLabServiceKeys() {
  return ADMIN_PROMPT_LAB_SERVICES.map((entry) => entry.key);
}

/** admin.js 의 기존 if-체인이 직접 처리하는 6종. 나머지는 라우트의 buildAdminLabPrompt 를 부른다. */
export function isBuiltInPromptLabService(key) {
  return Boolean(getAdminPromptLabService(key)?.builtIn);
}

/** 그룹 순서대로 정렬된 [{ group, services }] — UI 셀렉트가 그대로 쓴다. */
export function groupedAdminPromptLabServices() {
  return ADMIN_PROMPT_LAB_GROUPS
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((group) => ({
      group,
      services: ADMIN_PROMPT_LAB_SERVICES.filter((entry) => entry.group === group.id),
    }))
    .filter((entry) => entry.services.length > 0);
}

/** 이 서비스가 특정 입력을 요구하는가. UI 가 폼 필드를 조건부로 그릴 때 쓴다. */
export function promptLabServiceNeeds(key, input) {
  const service = getAdminPromptLabService(key);
  return Array.isArray(service?.inputs) ? service.inputs.includes(input) : false;
}
