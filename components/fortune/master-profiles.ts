import type { ProductMaster } from "@/app/components/ProductMasterStrip";
import type { MasterProfileData } from "./MasterProfile";

const base = "/images/master-profiles";

/** 대표 상담 전용 초상(600·360w)·시트(1536·1024w) — scripts/design/build-master-dedicated.mjs 가 만든다. */
const dedicated = (key: string) => ({
  portrait: `${base}/${key}-portrait.webp`,
  portraitSrcSet: `${base}/${key}-portrait-360.webp 360w, ${base}/${key}-portrait.webp 600w`,
  sheet: `${base}/${key}-profile.webp`,
  sheetSrcSet: `${base}/${key}-profile-1024.webp 1024w, ${base}/${key}-profile.webp 1536w`,
  sheetWidth: 1536,
  sheetHeight: 1024,
});

export const masterProfiles = {
  master: {
    name: "마스터", role: "인연의 서 · 사랑의 패턴을 읽는 안내자",
    description: "사주와 자미두수를 함께 읽어, 사랑에서 반복되는 패턴과 관계의 선택을 짚어주는 마스터입니다.",
    approach: "기질과 관계의 흐름을 차근차근 풀고, 지금의 인연에서 살펴볼 질문과 현실적인 행동을 함께 정리합니다.",
    portrait: `${base}/master-love-portrait.webp`, portraitAlt: "검은 머리와 버건디 장식의 인연의 서 마스터",
    sheet: `${base}/master-love-profile.webp`, sheetWidth: 1024, sheetHeight: 1536, theme: "master",
  },
  neo: {
    name: "네오", role: "백사자의 영혼을 가진 운명 마스터",
    description: "반복되는 선택을 짚고, 실행할 행동을 정리하는 운명 전략론. 네오는 막연한 위로보다 지금 바꿀 수 있는 지점을 먼저 찾습니다.",
    approach: "선택한 사주·자미두수·베다점·점성술의 근거를 바탕으로 판세를 읽습니다. 직설적으로 짚되, 당신을 깎아내리지 않고 다음 행동을 함께 정리합니다.",
    portrait: `${base}/neo-strategy-portrait.webp`, portraitAlt: "남색 제복과 흰 망토를 입은 백사자의 운명 마스터 네오",
    sheet: `${base}/neo-strategy-profile.webp`, sheetWidth: 1536, sheetHeight: 1024, theme: "neo",
  },
  yeoni: {
    name: "연이", role: "운명 찻집 마스터 · 따뜻한 공감으로 여는 상담",
    description: "마음을 먼저 듣고, 흐름의 근거와 작은 실천을 함께 전하는 운명 찻집 마스터예요. 쉽게 꺼내지 못했던 이야기도 천천히 들려주세요.",
    approach: "사주는 삶의 흐름을, 타로는 지금의 선택을, 숙요점은 관계의 거리감을 살펴봐요. 따뜻한 차 한 잔처럼 마음을 보듬으며, 오늘 할 수 있는 작은 행동을 함께 찾아요.",
    portrait: `${base}/yeoni-teahouse-portrait.webp`, portraitAlt: "분홍빛 한복을 입고 찻잔을 건네는 운명 찻집 마스터 연이",
    sheet: `${base}/yeoni-teahouse-profile.webp`, sheetWidth: 1536, sheetHeight: 1024, theme: "yeoni",
  },
  // 손금 — 소설 캐주얼 연이. 찻집 한복 연이(yeoni)와 다른 사람처럼 보이지 않게 이름은 같고 역할만 다르다.
  yeoniPalm: {
    name: "연이", role: "손바닥 선을 함께 들여다보는 손금 상담가 · 손금",
    description: "펼친 손바닥 사진에서 생명선·두뇌선·감정선·운명선을 하나씩 짚어 읽는 손금 상담가예요. 사진에 또렷이 보이는 선만 읽고, 보이지 않는 선은 보이지 않는다고 솔직하게 말씀드려요.",
    approach: "손금을 정해진 운명으로 단정하기보다, 지금의 습관과 흐름을 비춰 보는 거울로 읽어요. 선마다 근거를 함께 보여 드리고, 오늘 해 볼 수 있는 작은 행동을 같이 찾아요.",
    portrait: `${base}/yeoni-palm-portrait.webp`, portraitAlt: "꽃무늬 블라우스를 입고 펼친 손바닥을 들어 보이는 손금 상담가 연이",
    sheet: `${base}/yeoni-palm-profile.webp`, sheetWidth: 1536, sheetHeight: 1024, theme: "yeoniPalm",
  },
  yun: {
    name: "윤달", role: "생시부터 묻는 점성술사 · 서양 점성술·베다점",
    description: "누구에게나 태어난 시각부터 묻는 점성술사예요. 분까지 맞추면 상승궁과 열두 하우스가 또렷해지고, 태양·달과 함께 기질의 중심을 정확히 잡을 수 있어요.",
    approach: "서양 점성술은 행성·사인·하우스·애스펙트로, 베다점은 라시·나크샤트라·다샤로 읽어요. 두 체계의 근거를 구분하고, 비유는 쉽게 하나만 곁들여요. 생시를 모르면 상승궁 해석의 한계부터 말씀드리고, 읽을 수 있는 하늘부터 차근차근 풀어 드려요.",
    portrait: `${base}/yun-astrology-portrait.webp`, portraitAlt: "남색 두루마기에 은빛 초승달 귀걸이를 하고 접부채를 든 점성술사 윤달",
    sheet: `${base}/yun-astrology-profile.webp`, sheetWidth: 1536, sheetHeight: 1024, theme: "yun",
  },
  musung: {
    name: "무성", role: "막힌 별을 녹으로 바꾸는 판결 · 자미두수",
    description: "명반에서 막힌 자리(화기·化忌)를 먼저 짚고, 그 자리를 풀어 갈 길(화록·化祿)을 처방하는 자미두수 판결자입니다.",
    approach: "짧고 분명한 판결로 시작해, 처방은 오늘 해 볼 수 있는 구체적인 행동으로 이어 드려요. 명궁과 열두 궁, 대운의 근거를 함께 보여 드리고, 미래를 단정하지 않습니다.",
    portrait: `${base}/musung-ziwei-portrait.webp`, portraitAlt: "후드를 내리고 먹색 학자 도포를 입은 채 금빛 깃털을 든 자미두수 판결자 무성",
    sheet: `${base}/musung-ziwei-profile.webp`, sheetWidth: 1536, sheetHeight: 1024, theme: "musung",
  },
  hanbi: {
    name: "서한비", role: "두 달집 사이의 거리를 재는 사람 · 숙요점 궁합",
    description: "두 사람의 달이 머문 자리를 나란히 놓고, 서로 다가가는 속도와 거리를 재는 숙요점 상담가예요. 반복되는 엇갈림을 누구의 잘못으로 보기보다, 관계에 쌓이는 습관으로 읽어요.",
    approach: "쌓인 엇갈림을 장부처럼 하나씩 셈하고, 두 분이 함께 갚아 갈 수 있는 작은 약속을 찾아요. 서두르지 않고, 두 분 사이의 거리를 차분히 재어 드립니다.",
    portrait: `${base}/hanbi-sukuyo-portrait.webp`, portraitAlt: "빗빛 인디고 코트 드레스를 입고 덮인 장부를 든 숙요점 상담가 서한비",
    sheet: `${base}/hanbi-sukuyo-profile.webp`, sheetWidth: 1536, sheetHeight: 1024, theme: "hanbi",
  },
  // 대표 상담 마스터 — 정본 의상은 그대로, 장면·소품만 상품 전용으로 새로 그린 초상·시트(provenance.json).
  // 소개장의 "읽는 근거"와 "맡는 부분"은 실제 생성 프롬프트(worker/lib/love-secret-ai-prompt.js,
  // worker/routes/new-year-ai.js, worker/routes/life-book-ai.js)와 같아야 한다. 경력·건수 같은 꾸민 이력은 쓰지 않는다.
  yeoniLove: {
    name: "연이", epithet: "연애 비책 공동 마스터 · 마음의 장", role: "마음부터 듣는 연애 상담가",
    signature: "어떤 마음이든 먼저 들려주세요. 끝까지 듣고, 오늘 해 볼 한 걸음까지 같이 찾아 드릴게요.",
    description: "연애 비책의 첫 장과 마지막 장을 쓰는 상담가예요. 당신이 왜 그 사람에게 끌리는지, 어디서 마음이 서운해지는지를 명식에 비춰 읽고, 그 마음을 지키면서 다가가는 방법으로 상담을 맺어요.",
    dossier: [
      { label: "전문 영역", text: "당신이 사랑하는 방식 — 끌림과 애착, 마음을 표현하는 습관, 다가가는 순서" },
      { label: "읽는 근거", text: "일간과 오행 분포, 조후로 본 감정의 온도, 십성으로 본 애착과 표현 방식" },
      { label: "이 상담에서 맡는 부분", text: "핵심 연애운과 질문의 답 · 나의 연애 성향 — 장점·약점·심리 · 썸 전략·대화·매력·실천" },
    ],
    principles: ["마음을 먼저 듣고, 판단은 그다음에 해요", "누구를 탓하는 말로 위로하지 않아요", "그대로 보낼 수 있는 문장과 이번 주의 한 걸음으로 맺어요"],
    ...dedicated("yeoni-love"), portraitAlt: "분홍빛 한복을 입고 달빛 찻집의 연서 책상에서 찻잔을 건네는 연애 비책 공동 마스터 연이", theme: "yeoni",
  },
  hanbiLove: {
    name: "서한비", epithet: "연애 비책 공동 마스터 · 관계의 장", role: "두 사람 사이의 거리를 재는 사람",
    signature: "엇갈림은 누구의 잘못이 아니라 관계에 쌓인 빚입니다. 언제, 어떻게 갚을지 정확히 셈해 드리겠습니다.",
    description: "연애 비책의 가운데 장들을 맡습니다. 상대의 기운과 두 분 사이의 거리, 반복되는 다툼과 재회의 조건, 그리고 다가갈 때를 차례로 재어 드립니다. 서두르지 않되, 흐려 두지도 않겠습니다.",
    dossier: [
      { label: "전문 영역", text: "상대와 궁합, 갈등과 재회의 조건, 연락·고백·관계 진전의 시기" },
      { label: "읽는 근거", text: "일지 관계와 배우자궁, 실제로 성립한 합·충·형·파·해, 계산된 대운·세운·일진. 상대 명식이 있으면 두 분을 나란히 놓고 읽습니다." },
      { label: "이 상담에서 맡는 부분", text: "상대·궁합·이상형 · 갈등·바람기·재회·자기 보호 · 대운·올해·좋은 날짜·결혼운" },
    ],
    principles: ["상대의 마음을 단정하지 않고, 조건으로 말씀드립니다", "계산되지 않은 날짜는 쓰지 않습니다", "지켜야 할 선과 물러설 자리를 먼저 정해 드립니다"],
    ...dedicated("hanbi-love"), portraitAlt: "빗빛 인디고 코트 드레스 차림으로 비 내리는 달밤의 돌다리에서 관계 장부를 펼친 연애 비책 공동 마스터 서한비", theme: "hanbi",
  },
  neoNewYear: {
    name: "네오", epithet: "신년운세 마스터", role: "한 해의 판세를 짜는 운명 사령관",
    signature: "올해 판세, 내가 먼저 읽어 주지. 넌 움직이기만 하면 된다.",
    description: "새해 작전 회의는 내가 연다. 네 명식과 올해의 흐름을 맞대어 밀어붙일 달과 숨 고를 달을 가르고, 일·재물·관계·건강을 장마다 바로 쓸 수 있는 작전으로 정리해 넘긴다.",
    dossier: [
      { label: "전문 영역", text: "한 해의 총운과 열두 달의 판세, 일·재물·관계·건강의 작전" },
      { label: "읽는 근거", text: "네 명식의 격국·용신·조후, 대운 위에 올해 세운이 닿는 자리, 달마다 바뀌는 월별 흐름" },
      { label: "이 상담에서 맡는 부분", text: "질문과 타고난 성향 · 올해의 총운 · 재물과 직업 · 애정과 대인관계 · 1월~12월 월별 흐름 · 건강과 개운법 — 여섯 장 전부" },
    ],
    principles: ["듣기 좋은 말보다 쓸 수 있는 말", "단정 대신 조건으로 말한다", "깎아내리지 않는다"],
    ...dedicated("neo-new-year"), portraitAlt: "새해 첫 해가 드는 작전실에서 열두 달 작전 지도에 손을 얹은 신년운세 마스터 네오", theme: "neo",
  },
  yunLifeBook: {
    name: "윤달", epithet: "인생의 책 화자", role: "인생 소설을 읽어 주는 화자",
    signature: "어디 보자, 첫 장부터 이야깃거리가 많은 분이네요. 근거 하나하나 짚으면서 읽어 드릴게요.",
    description: "누구의 삶에나 한 권의 소설이 있어요. 타고난 원형이 적힌 첫 장부터 지금 펼쳐진 페이지까지, 사주에 적힌 근거를 짚어 가며 당신의 이야기를 차근차근 읽어 드려요.",
    dossier: [
      { label: "전문 영역", text: "한 사람의 삶을 한 권의 이야기로 읽는 일 — 성격과 재능, 사랑, 재물, 관계, 건강, 인생의 큰 장면" },
      { label: "읽는 근거", text: "일간과 월지·지장간, 오행 분포와 조후, 십성의 연결, 대운의 흐름과 가까운 세운" },
      { label: "이 상담에서 맡는 부분", text: "타고난 사주의 원형부터 대운으로 보는 인생의 큰 장면, 인생의 책 마지막 문장까지 열 개의 장 전부" },
    ],
    principles: ["근거 없는 문장은 쓰지 않아요", "결말을 단정하지 않아요", "다음 장의 첫 문장은 당신 몫으로 남겨요"],
    ...dedicated("yun-life-book"), portraitAlt: "달빛 서고에서 빛이 오르는 큰 책을 펼쳐 든 인생의 책 화자 윤달과 흰 고양이", theme: "yun",
  },
} satisfies Record<string, MasterProfileData>;

/** 128px 원형 아바타 — scripts/design/build-master-avatars.mjs 가 초상에서 잘라 만든다. */
export const masterAvatars = {
  yeoni: `${base}/avatars/yeoni.webp`,
  hanbi: `${base}/avatars/hanbi.webp`,
  neo: `${base}/avatars/neo.webp`,
  yun: `${base}/avatars/yun.webp`,
  musung: `${base}/avatars/musung.webp`,
  master: `${base}/avatars/master.webp`,
  // 대표 상담 전용 초상에서 자른 아바타 — 홈 대표 카드·제품 마스터 띠·연애 결과 화자 칩이 같은 얼굴을 쓴다.
  yeoniLove: `${base}/avatars/yeoni-love.webp`,
  hanbiLove: `${base}/avatars/hanbi-love.webp`,
  neoNewYear: `${base}/avatars/neo-new-year.webp`,
  yunLifeBook: `${base}/avatars/yun-life-book.webp`,
} as const;

/** 대표 상담 히어로 마스터 띠 — 짧은 역할과 캐릭터 말투 한 줄. 긴 소개는 위 masterProfiles 가 맡는다. */
export const productMasters = {
  karma: [
    { name: "네오", role: "반복되는 선택과 행동의 방향", avatar: masterAvatars.neo, line: "같은 매듭이라면, 이번에는 다른 선택을 찾아보자." },
    { name: "서한비", role: "관계의 거리와 마음의 매듭", avatar: masterAvatars.hanbi, line: "이어진 마음과 놓아도 되는 마음을 천천히 살펴드릴게요." },
  ],
  vedic: [
    { name: "윤달", role: "베다점 · 별의 자리와 시기의 흐름", avatar: masterAvatars.yun, line: "지금 지나가는 별의 계절을, 당신의 일상과 함께 읽어볼게요." },
  ],
  love: [
    { name: "연이", role: "마음을 먼저 듣는 연애 상담가", avatar: masterAvatars.yeoniLove, line: "설레는 마음도, 서운한 마음도 먼저 들려주세요. 끝까지 들을게요." },
    { name: "서한비", role: "두 사람 사이의 거리를 재는 사람", avatar: masterAvatars.hanbiLove, line: "두 분 사이의 거리는 제가 재어 드릴게요. 서두르지 않되, 흐려 두지도 않겠습니다." },
  ],
  newYear: [
    { name: "네오", role: "한 해의 판세를 짜는 운명 사령관", avatar: masterAvatars.neoNewYear, line: "올해 판세는 내가 먼저 읽는다. 너는 밀 때와 멈출 때만 기억하면 된다." },
  ],
  lifeBook: [
    { name: "윤달", role: "인생 소설을 읽어 주는 화자", avatar: masterAvatars.yunLifeBook, line: "당신의 인생, 첫 장부터 읽어 드릴게요. 다음 장은 같이 써 보고요." },
  ],
  // 초융합 v2 — 체계 장과 영역별 장을 나눠 맡는 다섯 화자(lib/fusion-premium-report.js FUSION_NARRATOR_BY_KEY).
  fusion: [
    { name: "네오", role: "사주 · 재물 · 일", avatar: masterAvatars.neo, line: "판은 내가 읽는다. 너는 밀 때와 멈출 때만 정하면 돼." },
    { name: "연이", role: "타로 · 연애", avatar: masterAvatars.yeoni, line: "마음이 먼저 움직이는 자리부터 같이 볼게요." },
    { name: "서한비", role: "숙요 · 결혼 · 인간관계", avatar: masterAvatars.hanbi, line: "사람 사이에 쌓이는 것과 갚는 법을 차분히 짚어 드리겠습니다." },
    { name: "윤달", role: "베다 · 점성술 · 시기 · 생활 리듬", avatar: masterAvatars.yun, line: "별길이 바뀌는 계절을 같이 짚어 볼게요." },
    { name: "무성", role: "자미두수 · 타고난 성향", avatar: masterAvatars.musung, line: "명반이 말하는 대로 판결합니다. 꾸미지 않을게요." },
  ],
} satisfies Record<string, ProductMaster[]>;

/** 초융합 결과의 화자 이름표 — FUSION_NARRATOR_BY_KEY 의 값(neo·yeoni…)을 이름·아바타로 바꾼다. */
export const fusionNarrators = {
  neo: { name: "네오", avatar: masterAvatars.neo },
  yeoni: { name: "연이", avatar: masterAvatars.yeoni },
  hanbi: { name: "서한비", avatar: masterAvatars.hanbi },
  yun: { name: "윤달", avatar: masterAvatars.yun },
  musung: { name: "무성", avatar: masterAvatars.musung },
} as const;
