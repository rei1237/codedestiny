// 통합 CMS 레지스트리 — "관리자가 무엇을 고칠 수 있는가"의 단일 정본.
//
// 워커(worker/routes/cms.js)와 관리자 UI(app/admin/cms)가 이 파일 하나를 함께 import 한다.
// 양쪽에 따로 선언하면 반드시 어긋나므로 순수 데이터만 두고 import 는 넣지 않는다.
//
// 새 콘텐츠군을 늘리는 방법:
//   1) 아래 CMS_NAMESPACES 에 항목 1개 추가
//   2) channel: "build" 라면 소비 지점에서 cmsText(ns, key, 기존문자열) 로 감싸기 (1줄)
//      channel: "runtime" 이라면 워커에서 cmsPrompt/cmsCopy 로 감싸기 (1줄)
// 그 외 코드 변경은 필요 없다. 관리자 메뉴·에디터·검색·버전관리는 이 선언에서 자동 생성된다.
//
// 🔴 폴백 우선 원칙: 코드의 기존 문자열은 지우지 않고 기본값으로 남긴다. CMS 에 값이 없거나
//    조회가 실패하면 그 기본값이 그대로 쓰인다. DB 가 죽어도 화면이 비지 않고, 서버 렌더 텍스트가
//    사라지지 않아 AdSense 배포 게이트(라우트당 최소 분량)도 영향을 받지 않는다.

/** 전달 채널. 관리자 UI 가 "즉시 반영 / 사이트 반영 필요" 배지로 그대로 보여준다. */
export const CMS_CHANNELS = Object.freeze({
  // 워커가 DB 에서 읽어 바로 서빙한다. 발행 즉시 다음 요청부터 적용.
  runtime: Object.freeze({ id: "runtime", label: "즉시 반영", hint: "발행하면 다음 요청부터 바로 적용됩니다." }),
  // 정적 빌드에 구워진다. 발행 후 "사이트 반영"으로 재빌드해야 노출.
  build: Object.freeze({ id: "build", label: "사이트 반영 필요", hint: "발행 후 '사이트 반영'을 눌러 재빌드해야 실제 사이트에 나타납니다." }),
});

export const CMS_STATUSES = Object.freeze(["draft", "review", "scheduled", "published", "archived"]);

export const CMS_STATUS_LABELS = Object.freeze({
  draft: "임시저장",
  review: "검수 대기",
  scheduled: "예약",
  published: "발행됨",
  archived: "보관",
});

/** 좌측 네비 그룹. order 순으로 렌더한다. */
export const CMS_GROUPS = Object.freeze([
  { id: "prompt", label: "AI 프롬프트", order: 10 },
  { id: "fortune", label: "운세 콘텐츠", order: 20 },
  { id: "novel", label: "라이트 노벨", order: 30 },
  { id: "phrase", label: "문구", order: 40 },
  { id: "page", label: "페이지", order: 50 },
  { id: "feature", label: "기능 화면", order: 60 },
  { id: "seo", label: "SEO", order: 70 },
]);

/* 필드 kind
     text      한 줄 입력
     textarea  여러 줄 평문 (줄바꿈 보존)
     richtext  tiptap 에디터 (HTML)
     lines     한 줄에 하나씩 = 배열. 구분자가 필요한 항목은 separator 로 명시
     qa-list   질문/답변 쌍 목록
     beats     라이트 노벨 전용 — 비트 인덱스 고정 목록
     record    고정 키 표 — 키 추가·삭제 불가, 칸의 값만 편집
     json      원본 JSON (최후수단)
     number    숫자
     select    options 중 택1 */

/** listSource
 *   static  registry 의 entries 배열이 곧 목록
 *   code    코드 데이터에서 목록을 만든다(어댑터가 제공) — 라이트 노벨, 유명인 사주 등
 *   user    운영자가 새 항목을 직접 만든다 — 공지/이벤트/배너 */

export const CMS_NAMESPACES = Object.freeze([
  // ────────────────────────────── AI 프롬프트 (즉시 반영) ──────────────────────────────
  {
    ns: "prompt.system",
    label: "시스템 프롬프트",
    group: "prompt",
    channel: "runtime",
    editor: "prompt",
    listSource: "code",
    description: "각 AI 상담의 성격·말투·금칙을 정하는 최상위 지시문. 저장·발행하면 다음 AI 요청부터 즉시 적용됩니다.",
    fields: [
      { name: "text", label: "시스템 프롬프트", kind: "textarea", rows: 18, max: 20000 },
      { name: "temperature", label: "Temperature", kind: "number", min: 0, max: 2, step: 0.05, optional: true },
      { name: "topP", label: "Top P", kind: "number", min: 0, max: 1, step: 0.05, optional: true },
      { name: "maxTokens", label: "Max Tokens", kind: "number", min: 256, max: 32768, step: 256, optional: true },
    ],
  },
  {
    ns: "prompt.domain",
    label: "분야별 프롬프트",
    group: "prompt",
    channel: "runtime",
    editor: "prompt",
    listSource: "code",
    description: "연애·재물·건강 등 분야별 분석 관점과 예시 질문. 사주·베다·숙요·점성술·자미두수 5개 체계에 걸쳐 있습니다.",
    fields: [
      { name: "title", label: "프롬프트 제목", kind: "text", max: 200 },
      { name: "analysisAngles", label: "분석 관점 (한 줄에 하나)", kind: "lines", rows: 8, max: 4000 },
      { name: "questionPatterns", label: "예시 질문 (한 줄에 하나)", kind: "lines", rows: 6, max: 4000 },
    ],
  },

  // ────────────────────────────── 라이트 노벨 (사이트 반영) ──────────────────────────────
  {
    ns: "light-novel",
    label: "라이트 노벨 대본",
    group: "novel",
    channel: "build",
    editor: "beats",
    listSource: "code",
    description: "화별 제목·부제와 대사/지문을 편집합니다. 비트 개수와 순서는 바꿀 수 없습니다 — 독자의 저장된 진행 위치가 인덱스 기준이라 어긋나면 읽던 자리를 잃습니다.",
    fields: [
      { name: "title", label: "화 제목", kind: "text", max: 200 },
      { name: "tag", label: "부제 / 태그", kind: "text", max: 200 },
      { name: "beats", label: "대본", kind: "beats", max: 400000 },
    ],
    constraints: {
      beatMaxLength: 250,
      forbiddenInBeat: ["\"", "\\", "</script"],
      minKoreanCharsPerEpisode: 1800,
    },
  },

  // ────────────────────────────── 운세 콘텐츠 (사이트 반영) ──────────────────────────────
  {
    ns: "famous-saju",
    label: "유명인 사주",
    group: "fortune",
    channel: "build",
    editor: "plain",
    listSource: "code",
    description: "유명인 사주 아티클의 소개문·요약·맺음말과 SEO 문구.",
    fields: [
      { name: "shortDescription", label: "목록 소개문", kind: "textarea", rows: 3, max: 4000 },
      { name: "heroCopy", label: "히어로 문장", kind: "textarea", rows: 4, max: 4000 },
      { name: "summary", label: "요약", kind: "textarea", rows: 6, max: 4000 },
      { name: "conclusion", label: "맺음말", kind: "textarea", rows: 6, max: 4000 },
      { name: "seoTitle", label: "SEO 제목", kind: "text", max: 200 },
      { name: "seoDescription", label: "SEO 설명", kind: "textarea", rows: 3, max: 600 },
    ],
  },

  // ─────────────── 운세 결과 해설 (사이트 반영) ───────────────
  // 전부 "고정 키 표" 형태다. 키를 추가·삭제하지 않고 칸의 문장만 고친다 —
  // 키는 계산 엔진이 만들어 내는 값(십성 이름·27수 인덱스 등)이라 임의로 늘릴 수 없다.
  {
    ns: "saju-reading",
    label: "사주 해설",
    group: "fortune",
    channel: "build",
    editor: "record",
    listSource: "code",
    description: "십성·격국·신살 해설. 동물 사주와 사주 수호신 양쪽이 같은 원본을 쓰므로 한 번 고치면 두 화면에 반영됩니다.",
    fields: [
      { name: "record", label: "해설 표", kind: "record", max: 400000 },
    ],
  },
  {
    ns: "saju-animal",
    label: "십이운성 동물 해설",
    group: "fortune",
    channel: "build",
    editor: "record",
    listSource: "code",
    description: "십이운성 12단계별 동물 캐릭터 해설과 결과 카드 문구.",
    fields: [
      { name: "record", label: "해설 표", kind: "record", max: 400000 },
    ],
  },
  {
    ns: "saju-guardian",
    label: "사주 수호신 해설",
    group: "fortune",
    channel: "build",
    editor: "record",
    listSource: "code",
    description: "오행별 수호신 해설과 월지·시지 풀이.",
    fields: [
      { name: "record", label: "해설 표", kind: "record", max: 200000 },
    ],
  },
  {
    ns: "sukuyo-mansion",
    label: "숙요 27수 해설",
    group: "fortune",
    channel: "build",
    editor: "record",
    listSource: "code",
    description: "본명숙 27수의 성향·연애·재물·일 해설. 숙요 결과 화면의 본문입니다.",
    fields: [
      { name: "record", label: "해설 표", kind: "record", max: 400000 },
    ],
  },
  {
    ns: "sukuyo-day",
    label: "숙요 일진 조언",
    group: "fortune",
    // 워커가 요청 시점에 직접 읽는다. 빌드 채널로 두면 정적 사이트만 재빌드되고
    // 워커 번들은 그대로라 발행해도 값이 안 바뀜다.
    channel: "runtime",
    editor: "record",
    listSource: "code",
    description: "본명숙별 그날의 등급 조언. 비워 두면 등급 공통 조언으로 폴백합니다.",
    fields: [
      { name: "record", label: "해설 표", kind: "record", max: 200000 },
    ],
  },
  {
    ns: "sukuyo-calendar",
    label: "숙요 달력 해설",
    group: "fortune",
    channel: "build",
    editor: "record",
    listSource: "code",
    description: "숙요 달력의 27수 일진 풀이(핵심·활용·주의·연애·일과 돈·조언).",
    fields: [
      { name: "record", label: "해설 표", kind: "record", max: 400000 },
    ],
  },
  {
    ns: "ziwei-basic",
    label: "자미두수 기본 명반 해설",
    group: "fortune",
    channel: "build",
    editor: "record",
    listSource: "code",
    description: "기본 명반의 14주성 해설과 12궁 정의. 심화(/ziwei/chart)와는 별개 엔진입니다.",
    fields: [
      { name: "record", label: "해설 표", kind: "record", max: 400000 },
    ],
  },
  {
    ns: "ziwei-deep",
    label: "자미두수 심화 해설",
    group: "fortune",
    channel: "build",
    editor: "record",
    listSource: "code",
    description: "심화 명반(/ziwei/chart)의 12궁 정의와 주성 의미.",
    fields: [
      { name: "record", label: "해설 표", kind: "record", max: 200000 },
    ],
  },
  {
    ns: "vedic-nakshatra",
    label: "나크샤트라 해설",
    group: "fortune",
    channel: "build",
    editor: "record",
    listSource: "code",
    description: "27 나크샤트라의 동양·인도 관점 해설과 융합 리딩.",
    fields: [
      { name: "record", label: "해설 표", kind: "record", max: 400000 },
    ],
  },
  {
    ns: "vedic-reading",
    label: "베다 리포트 해설",
    group: "fortune",
    // 워커가 요청 시점에 직접 읽는다. 빌드 채널로 두면 정적 사이트만 재빌드되고
    // 워커 번들은 그대로라 발행해도 값이 안 바뀜다.
    channel: "runtime",
    editor: "record",
    listSource: "code",
    description: "베다 프리미엄 리포트의 사인·나크샤트라·다샤 해석 문구.",
    fields: [
      { name: "record", label: "해설 표", kind: "record", max: 200000 },
    ],
  },

  // ────────────────────────────── 문구 풀 (사이트 반영) ──────────────────────────────
  {
    ns: "phrase-pool",
    label: "문구 목록",
    group: "phrase",
    channel: "build",
    editor: "plain",
    listSource: "static",
    description: "잠금화면·홈에서 날짜 기준으로 하나씩 뽑아 보여주는 문구 묶음입니다. 한 줄에 하나씩 적습니다.",
    fields: [
      { name: "items", label: "목록 (한 줄에 하나)", kind: "lines", rows: 20, max: 120000 },
    ],
    entries: [
      { key: "affirmations", label: "긍정확언", hint: "잠금화면 메인 확언" },
      { key: "quotes", label: "명언", hint: "`문장|저자` 형식" },
      { key: "hopes", label: "소망 문구" },
      { key: "yeoni-greetings", label: "연이 인사말" },
      { key: "flowers", label: "오늘의 꽃", hint: "`꽃이름|꽃말` 형식" },
      { key: "knowledge", label: "운세 지식" },
      { key: "headers", label: "잠금화면 헤더" },
      { key: "core-energies", label: "핵심 기운" },
    ],
  },

  // ────────────────────────────── 페이지 (혼합) ──────────────────────────────
  {
    ns: "page-copy",
    label: "페이지 문구",
    group: "page",
    channel: "build",
    editor: "record",
    listSource: "code",
    description: "서비스 소개 페이지 본문. 검색엔진이 읽는 문서라 사이트 반영 후에 노출됩니다.",
    fields: [
      { name: "record", label: "문구 표", kind: "record", max: 200000 },
    ],
  },
  {
    ns: "faq",
    label: "자주 묻는 질문",
    group: "page",
    channel: "build",
    editor: "plain",
    listSource: "static",
    description: "페이지별 FAQ. 질문/답변 쌍으로 관리합니다.",
    fields: [
      { name: "intro", label: "도입 문구", kind: "textarea", rows: 3, max: 2000 },
      { name: "items", label: "질문/답변", kind: "qa-list", max: 120000 },
    ],
    // 실제 렌더되는 곳만 둔다. 소비 지점 없는 항목을 남기면 발행해도 사이트가 안 바뀌는
    // 유령 항목이 되고, verify:cms-registry 의 소비 지점 검사에도 걸린다.
    entries: [
      { key: "faq-page", label: "FAQ 페이지", hint: "/faq" },
    ],
  },

  // ────────────────────────────── 기능 화면 (사이트 반영) ──────────────────────────────
  {
    ns: "feature-copy",
    label: "기능 화면 문구",
    group: "feature",
    channel: "build",
    editor: "plain",
    listSource: "code",
    description: "운명 찻집·팩폭 운명 전략실 등 개별 기능의 프롤로그·안내 문구.",
    // 항목에 따라 한 덩어리 문구(text)이거나 문단 목록(lines)이다. 둘 중 값이 있는 쪽을 소비 지점이 읽는다.
    fields: [
      { name: "text", label: "문구", kind: "textarea", rows: 8, max: 20000 },
      { name: "lines", label: "문단 목록 (한 줄에 한 문단)", kind: "lines", rows: 20, max: 40000, optional: true },
    ],
  },

  // ────────────────────────────── SEO (사이트 반영) ──────────────────────────────
]);

const NAMESPACE_BY_ID = new Map(CMS_NAMESPACES.map((entry) => [entry.ns, entry]));

export function getCmsNamespace(ns) {
  return NAMESPACE_BY_ID.get(String(ns || "")) || null;
}

export function listCmsNamespaceIds() {
  return CMS_NAMESPACES.map((entry) => entry.ns);
}

export function isCmsNamespace(ns) {
  return NAMESPACE_BY_ID.has(String(ns || ""));
}

/** 채널이 runtime 인 네임스페이스 = 워커가 바로 서빙하는 것들. 공개 번들 대상. */
export function listRuntimeNamespaceIds() {
  return CMS_NAMESPACES.filter((entry) => entry.channel === "runtime").map((entry) => entry.ns);
}

/** 채널이 build 인 네임스페이스 = 빌드 시 generated json 으로 내려받는 것들. */
export function listBuildNamespaceIds() {
  return CMS_NAMESPACES.filter((entry) => entry.channel === "build").map((entry) => entry.ns);
}

export function getCmsFieldDef(ns, fieldName) {
  const namespace = getCmsNamespace(ns);
  if (!namespace) return null;
  return namespace.fields.find((field) => field.name === fieldName) || null;
}

/** 키 형식: 소문자/숫자/하이픈/점/슬래시/콜론만. 경로 파싱과 캐시 키에 안전한 범위로 제한한다. */
export function isValidCmsKey(key) {
  const value = String(key || "").trim();
  if (!value || value.length > 240) return false;
  return /^[a-z0-9][a-z0-9._:/-]*$/i.test(value);
}
