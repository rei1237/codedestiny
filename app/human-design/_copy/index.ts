// 휴먼 디자인 표시 문구 — ko / en.
//
// 🔴 이 파일은 **표시 계층 전용**이다. 워커 번들에 들어가지 않는다(계산 엔진은 canonical
//    identifier 만 다루고, 서술 문구는 여기와 AI 해석이 나눠 갖는다).
//
// 🔴 게이트는 **주역 괘명**만 싣는다. 휴먼 디자인 고유의 게이트 키노트·채널 이름은 출처가
//    있어야 하는 서술 자료라 지어내지 않았다. 게이트/채널을 눌렀을 때 보여 주는 것은
//    계산으로 확인된 사실(번호·라인·활성 행성·계층·소속 센터·완성 여부)이고, 해석은
//    같은 결제로 열리는 AI 리딩이 맡는다.

export type Locale = "ko" | "en";

type Bilingual = { ko: string; en: string };

export const UI_TEXT = {
  title: { ko: "휴먼 디자인", en: "Human Design" },
  tagline: { ko: "나를 설계한 에너지 지도", en: "The energy map that designed you" },
  subtitle: {
    ko: "정확한 천문 계산 · 인터랙티브 바디그래프 · 무료",
    en: "Precise ephemeris · Interactive BodyGraph · free",
  },
  formHeading: { ko: "출생 정보", en: "Birth data" },
  birthDate: { ko: "생년월일", en: "Birth date" },
  birthTime: { ko: "태어난 시각", en: "Birth time" },
  timezone: { ko: "출생지 타임존", en: "Birth timezone" },
  calendar: { ko: "달력", en: "Calendar" },
  solar: { ko: "양력", en: "Solar" },
  lunar: { ko: "음력", en: "Lunar" },
  lunarLeap: { ko: "음력(윤달)", en: "Lunar (leap month)" },
  submit: { ko: "내 바디그래프 만들기", en: "Build my BodyGraph" },
  submitting: { ko: "계산 중…", en: "Calculating…" },
  timezoneHelp: {
    ko: "태어난 지역의 타임존입니다. 서머타임은 출생 날짜 기준으로 자동 반영됩니다.",
    en: "The birthplace timezone. Daylight saving is applied automatically for the birth date.",
  },
  timeHelp: {
    ko: "시각이 1분만 달라도 라인과 프로파일이 바뀔 수 있습니다. 아는 만큼 정확히 입력해 주세요.",
    en: "One minute can change a line and the profile. Enter it as precisely as you know it.",
  },
  reusedNotice: {
    ko: "같은 출생 정보로 이미 만든 차트를 그대로 열었습니다.",
    en: "Reopened from your saved chart for the same birth data.",
  },
  personality: { ko: "퍼스낼리티(의식)", en: "Personality (conscious)" },
  design: { ko: "디자인(무의식)", en: "Design (unconscious)" },
  definedCenters: { ko: "정의된 센터", en: "Defined centers" },
  undefinedCenters: { ko: "정의되지 않은 센터", en: "Undefined centers" },
  activeGates: { ko: "활성 게이트", en: "Active gates" },
  activeChannels: { ko: "활성 채널", en: "Active channels" },
  defined: { ko: "정의됨", en: "Defined" },
  undefined: { ko: "정의되지 않음", en: "Undefined" },
  complete: { ko: "완성", en: "Complete" },
  incomplete: { ko: "미완성", en: "Incomplete" },
  tapHint: {
    ko: "센터 · 게이트 · 채널을 눌러 상세를 확인하세요",
    en: "Tap a center, gate, or channel for details",
  },
  close: { ko: "닫기", en: "Close" },
  designMoment: { ko: "디자인 시각", en: "Design moment" },
  birthMoment: { ko: "출생 시각(UTC)", en: "Birth moment (UTC)" },
  solarArcNote: {
    ko: "출생 태양에서 정확히 88° 이전 — 날짜를 빼서 어림한 값이 아닙니다.",
    en: "Exactly 88° of solar arc before birth — not an 88-day approximation.",
  },
  gate: { ko: "게이트", en: "Gate" },
  line: { ko: "라인", en: "Line" },
  channel: { ko: "채널", en: "Channel" },
  center: { ko: "센터", en: "Center" },
  activatedBy: { ko: "활성시킨 행성", en: "Activated by" },
  belongsTo: { ko: "소속 센터", en: "Belongs to" },
  participatesIn: { ko: "참여 채널", en: "Channels" },
  ichingName: { ko: "주역 괘", en: "I Ching hexagram" },
  interpretationPending: {
    ko: "여기 보이는 값은 모두 계산으로 확인된 사실입니다. 개인 해석은 담고 있지 않습니다.",
    en: "Everything here is a computed fact. It does not include personal interpretation.",
  },
  interpretationHeading: { ko: "AI 개인 해석", en: "AI reading" },
  interpretationCta: { ko: "내 차트로 해석 받기", en: "Read my chart" },
  interpretationLoading: { ko: "해석을 쓰는 중…", en: "Writing your reading…" },
  interpretationRetry: { ko: "해석 다시 시도", en: "Retry reading" },
  interpretationIncluded: {
    ko: "이미 결제한 차트에 포함됩니다. 추가 결제가 없습니다.",
    en: "Included with the chart you already paid for. No extra charge.",
  },
  interpretationBasis: {
    ko: "이 해석은 위에서 계산된 값만 근거로 씁니다 — AI 에게 출생 정보는 전달되지 않습니다.",
    en: "This reading is written from the computed values above — your birth data is never sent to the AI.",
  },
  interpretationSummary: { ko: "요약", en: "Summary" },
  interpretationFailed: {
    ko: "해석을 만들지 못했습니다. 차트는 그대로 있으니 다시 시도해 주세요.",
    en: "Could not write the reading. Your chart is safe — please retry.",
  },

  // ── 몰입형 셸 · 단계별 정보 구조 ──────────────────────────────────────────
  // 🔴 프로파일의 라인 이름(1 조사자 … 6 롤모델)은 여기 넣지 않는다. 이 파일 맨 위 규칙대로
  //    출처가 필요한 서술 자료는 지어내지 않고 AI 리딩이 맡는다. 여기서는 숫자만 크게 보인다.
  exit: { ko: "홈으로", en: "Home" },
  restart: { ko: "다른 출생 정보로", en: "New birth data" },
  ghostCaption: {
    ko: "아직 비어 있는 설계도입니다. 출생 정보를 넣으면 당신의 26개 활성이 여기에 켜집니다.",
    en: "An empty blueprint. Enter your birth data and your 26 activations light it up.",
  },
  sectionNav: { ko: "차트 안에서 이동", en: "Jump inside the chart" },
  sectionMyDesign: { ko: "마이 디자인", en: "My Design" },
  sectionType: { ko: "타입", en: "Type" },
  sectionStrategy: { ko: "전략", en: "Strategy" },
  sectionAuthority: { ko: "내적 권위", en: "Authority" },
  sectionProfile: { ko: "프로파일", en: "Profile" },
  sectionCenters: { ko: "센터", en: "Centers" },
  sectionChannels: { ko: "채널", en: "Channels" },
  sectionGates: { ko: "게이트", en: "Gates" },
  sectionPlanets: { ko: "행성 활성", en: "Planetary Activations" },
  sectionReading: { ko: "더 깊은 해석", en: "Deeper Reading" },
  signature: { ko: "시그니처", en: "Signature" },
  notSelf: { ko: "낫셀프 테마", en: "Not-self theme" },
  definition: { ko: "정의 형태", en: "Definition" },
  incarnationCross: { ko: "인카네이션 크로스", en: "Incarnation Cross" },
  profileLines: { ko: "의식 라인 / 무의식 라인", en: "Conscious line / Unconscious line" },
  showInChart: { ko: "차트에서 보기", en: "Show in chart" },
  centersDefinedHint: {
    ko: "정의된 센터는 늘 같은 방식으로 작동하고, 정의되지 않은 센터는 주변을 받아들여 증폭합니다.",
    en: "Defined centers work the same way always; undefined centers take in and amplify what is around you.",
  },
  channelsHint: {
    ko: "채널은 양쪽 게이트가 모두 활성일 때만 완성됩니다. 완성된 채널이 두 센터를 정의합니다.",
    en: "A channel completes only when both gates are active — and a completed channel is what defines two centers.",
  },
  gatesHint: {
    ko: "활성 게이트는 26개 행성 활성이 만든 것입니다. 눌러 어느 행성이 켰는지 확인하세요.",
    en: "Active gates come from your 26 planetary activations. Tap one to see which planet lit it.",
  },
  noneYet: { ko: "없음", en: "None" },
  freeNote: {
    ko: "차트는 무료입니다. 로그인만 하면 몇 번이든 다시 볼 수 있습니다.",
    en: "The chart is free. Sign in and reopen it as often as you like.",
  },
  // 🔴 옛 해석은 생성이 은퇴했고 이미 결제한 사람에게만 보인다. 새 구매를 권하는 문구를
  //    여기 넣지 말 것 — 이 자리는 "예전에 산 것을 되살렸다"는 안내다.
  legacyReadingNote: {
    ko: "이전에 구매하신 AI 해석입니다. 지금은 새로 생성하지 않고 저장된 내용을 그대로 보여 드립니다.",
    en: "An AI reading you purchased earlier. It is shown as saved — nothing is generated now.",
  },
} satisfies Record<string, Bilingual>;

export const TYPE_COPY = {
  TYPE_GENERATOR: {
    name: { ko: "제너레이터", en: "Generator" },
    summary: {
      ko: "천골이 정의된 삶의 에너지형. 스스로 시작하기보다 다가온 것에 반응할 때 힘이 제대로 쓰입니다.",
      en: "A defined Sacral makes you life force energy. Your power lands when you respond to what shows up.",
    },
  },
  TYPE_MANIFESTING_GENERATOR: {
    name: { ko: "매니페스팅 제너레이터", en: "Manifesting Generator" },
    summary: {
      ko: "천골이 정의되고 모터가 목까지 이어진 형. 반응한 뒤 곧바로 실행으로 넘어가며, 건너뛰고 되돌아오는 방식이 자연스럽습니다.",
      en: "A defined Sacral with a motor connected to the Throat. You respond and then move fast, skipping steps and circling back.",
    },
  },
  TYPE_PROJECTOR: {
    name: { ko: "프로젝터", en: "Projector" },
    summary: {
      ko: "천골이 정의되지 않은 안내자형. 초대와 인정을 받았을 때 통찰이 제대로 전달됩니다.",
      en: "An undefined Sacral guide. Your insight lands when it is recognized and invited.",
    },
  },
  TYPE_MANIFESTOR: {
    name: { ko: "매니페스터", en: "Manifestor" },
    summary: {
      ko: "모터가 목까지 이어진 개시형. 스스로 시작할 수 있고, 움직이기 전에 알리는 것이 저항을 줄입니다.",
      en: "A motor connected to the Throat. You can initiate, and informing before you move reduces resistance.",
    },
  },
  TYPE_REFLECTOR: {
    name: { ko: "리플렉터", en: "Reflector" },
    summary: {
      ko: "정의된 센터가 하나도 없는 형. 주변을 그대로 비추므로 환경 선택이 곧 삶의 질이며, 큰 결정에는 한 달의 시간이 필요합니다.",
      en: "No defined centers. You mirror your surroundings, so environment is everything — and big decisions need a lunar cycle.",
    },
  },
} as const;

export const STRATEGY_COPY = {
  STRATEGY_RESPOND: { ko: "반응하기", en: "Respond" },
  STRATEGY_WAIT_FOR_INVITATION: { ko: "초대를 기다리기", en: "Wait for the invitation" },
  STRATEGY_INFORM: { ko: "알리기", en: "Inform" },
  STRATEGY_WAIT_A_LUNAR_CYCLE: { ko: "한 달의 주기를 기다리기", en: "Wait a lunar cycle" },
} as const;

export const AUTHORITY_COPY = {
  AUTHORITY_EMOTIONAL: {
    name: { ko: "감정 권위", en: "Emotional" },
    summary: {
      ko: "감정에는 파동이 있어 즉답에 진실이 없습니다. 시간을 두고 파동을 지나 보낸 뒤 결정합니다.",
      en: "Emotions move in a wave, so there is no truth in the moment. Decide after the wave has passed.",
    },
  },
  AUTHORITY_SACRAL: {
    name: { ko: "천골 권위", en: "Sacral" },
    summary: {
      ko: "머리가 아니라 몸이 먼저 답합니다. 그 자리에서 올라오는 끌림과 밀어냄이 판단의 기준입니다.",
      en: "The body answers before the mind. The in-the-moment yes or no is your compass.",
    },
  },
  AUTHORITY_SPLENIC: {
    name: { ko: "비장 권위", en: "Splenic" },
    summary: {
      ko: "한 번만 조용히 오는 직감입니다. 반복되지 않으므로 지나가면 다시 오지 않습니다.",
      en: "A quiet instant knowing that speaks once. It does not repeat itself.",
    },
  },
  AUTHORITY_EGO: {
    name: { ko: "에고(하트) 권위", en: "Ego" },
    summary: {
      ko: "내가 정말 원하는가, 그리고 그것을 감당할 의지가 있는가가 기준입니다.",
      en: "What do I actually want, and do I have the will to back it?",
    },
  },
  AUTHORITY_SELF_PROJECTED: {
    name: { ko: "자기투사 권위", en: "Self-Projected" },
    summary: {
      ko: "소리 내어 말할 때 방향이 드러납니다. 신뢰하는 사람에게 말하되 조언이 아니라 내 목소리를 듣습니다.",
      en: "Direction shows up when you speak. Talk it out with someone you trust — and listen to your own voice, not their advice.",
    },
  },
  AUTHORITY_MENTAL: {
    name: { ko: "환경 권위", en: "Mental / Environmental" },
    summary: {
      ko: "내면의 확답이 아니라 어디에서 누구와 있느냐가 판단을 바꿉니다. 여러 환경에서 말해 보며 정합니다.",
      en: "There is no inner authority to consult — where you are and who you are with changes the answer. Talk it through in different environments.",
    },
  },
  AUTHORITY_LUNAR: {
    name: { ko: "달 주기 권위", en: "Lunar" },
    summary: {
      ko: "약 29일의 달 주기를 한 바퀴 지나며 같은 사안을 여러 환경에서 겪은 뒤 결정합니다.",
      en: "Let a full lunar cycle (about 29 days) pass, meeting the same question in different environments.",
    },
  },
} as const;

export const SIGNATURE_COPY = {
  SIGNATURE_SATISFACTION: { ko: "만족", en: "Satisfaction" },
  SIGNATURE_SUCCESS: { ko: "성공", en: "Success" },
  SIGNATURE_PEACE: { ko: "평화", en: "Peace" },
  SIGNATURE_SURPRISE: { ko: "놀라움", en: "Surprise" },
} as const;

export const NOT_SELF_COPY = {
  NOT_SELF_FRUSTRATION: { ko: "좌절", en: "Frustration" },
  NOT_SELF_BITTERNESS: { ko: "쓴맛", en: "Bitterness" },
  NOT_SELF_ANGER: { ko: "분노", en: "Anger" },
  NOT_SELF_DISAPPOINTMENT: { ko: "실망", en: "Disappointment" },
} as const;

export const DEFINITION_COPY = {
  DEFINITION_NONE: { ko: "정의 없음", en: "No Definition" },
  DEFINITION_SINGLE: { ko: "단일 정의", en: "Single Definition" },
  DEFINITION_SPLIT: { ko: "분할 정의", en: "Split Definition" },
  DEFINITION_TRIPLE_SPLIT: { ko: "삼중 분할 정의", en: "Triple Split Definition" },
  DEFINITION_QUADRUPLE_SPLIT: { ko: "사중 분할 정의", en: "Quadruple Split Definition" },
} as const;

export const CROSS_ANGLE_COPY = {
  CROSS_ANGLE_RIGHT: { ko: "라이트 앵글 크로스", en: "Right Angle Cross" },
  CROSS_ANGLE_LEFT: { ko: "레프트 앵글 크로스", en: "Left Angle Cross" },
  CROSS_ANGLE_JUXTAPOSITION: { ko: "저스크타포지션 크로스", en: "Juxtaposition Cross" },
} as const;

export const CENTER_COPY = {
  HEAD: {
    name: { ko: "헤드", en: "Head" },
    role: { ko: "영감과 의문의 압력", en: "Pressure of inspiration and questions" },
  },
  AJNA: {
    name: { ko: "아즈나", en: "Ajna" },
    role: { ko: "개념화와 사고의 방식", en: "Conceptualisation and mental processing" },
  },
  THROAT: {
    name: { ko: "목", en: "Throat" },
    role: { ko: "표현과 실행이 나가는 문", en: "Where expression and action come out" },
  },
  G: {
    name: { ko: "G(자아)", en: "G / Self" },
    role: { ko: "정체성과 방향, 사랑", en: "Identity, direction, and love" },
  },
  HEART: {
    name: { ko: "하트(에고)", en: "Heart / Ego" },
    role: { ko: "의지와 자기 가치", en: "Willpower and self-worth" },
  },
  SOLAR_PLEXUS: {
    name: { ko: "태양신경총", en: "Solar Plexus" },
    role: { ko: "감정의 파동과 정서적 인식", en: "Emotional wave and awareness" },
  },
  SACRAL: {
    name: { ko: "천골", en: "Sacral" },
    role: { ko: "삶의 에너지와 반응", en: "Life force and response" },
  },
  SPLEEN: {
    name: { ko: "비장", en: "Spleen" },
    role: { ko: "즉각적 직감과 생존 감각", en: "Instant intuition and survival instinct" },
  },
  ROOT: {
    name: { ko: "루트", en: "Root" },
    role: { ko: "추진과 스트레스의 압력", en: "Adrenal drive and stress pressure" },
  },
} as const;

export const PLANET_COPY = {
  Sun: { ko: "태양", en: "Sun", glyph: "☉" },
  Earth: { ko: "지구", en: "Earth", glyph: "⊕" },
  Moon: { ko: "달", en: "Moon", glyph: "☾" },
  NorthNode: { ko: "북교점", en: "North Node", glyph: "☊" },
  SouthNode: { ko: "남교점", en: "South Node", glyph: "☋" },
  Mercury: { ko: "수성", en: "Mercury", glyph: "☿" },
  Venus: { ko: "금성", en: "Venus", glyph: "♀" },
  Mars: { ko: "화성", en: "Mars", glyph: "♂" },
  Jupiter: { ko: "목성", en: "Jupiter", glyph: "♃" },
  Saturn: { ko: "토성", en: "Saturn", glyph: "♄" },
  Uranus: { ko: "천왕성", en: "Uranus", glyph: "♅" },
  Neptune: { ko: "해왕성", en: "Neptune", glyph: "♆" },
  Pluto: { ko: "명왕성", en: "Pluto", glyph: "♇" },
} as const;

/**
 * 64 게이트의 **주역 괘명**(빌헬름 역 기준).
 *
 * 🔴 휴먼 디자인 고유의 게이트 키노트가 아니다. 그쪽은 출처가 있어야 하는 서술 자료라
 *    지어내지 않았다 — 개인 해석은 같은 결제로 열리는 AI 리딩이 맡는다.
 */
export const GATE_ICHING: Readonly<Record<number, Bilingual>> = Object.freeze({
  1: { ko: "건(乾) · 창조", en: "The Creative" },
  2: { ko: "곤(坤) · 수용", en: "The Receptive" },
  3: { ko: "둔(屯) · 시작의 어려움", en: "Difficulty at the Beginning" },
  4: { ko: "몽(蒙) · 어리석음", en: "Youthful Folly" },
  5: { ko: "수(需) · 기다림", en: "Waiting" },
  6: { ko: "송(訟) · 다툼", en: "Conflict" },
  7: { ko: "사(師) · 군대", en: "The Army" },
  8: { ko: "비(比) · 결속", en: "Holding Together" },
  9: { ko: "소축(小畜) · 작은 것의 길들임", en: "The Taming Power of the Small" },
  10: { ko: "이(履) · 이행", en: "Treading" },
  11: { ko: "태(泰) · 평화", en: "Peace" },
  12: { ko: "비(否) · 막힘", en: "Standstill" },
  13: { ko: "동인(同人) · 함께하는 사람", en: "Fellowship with Men" },
  14: { ko: "대유(大有) · 큰 소유", en: "Possession in Great Measure" },
  15: { ko: "겸(謙) · 겸손", en: "Modesty" },
  16: { ko: "예(豫) · 열정", en: "Enthusiasm" },
  17: { ko: "수(隨) · 따름", en: "Following" },
  18: { ko: "고(蠱) · 바로잡음", en: "Work on What Has Been Spoiled" },
  19: { ko: "임(臨) · 다가감", en: "Approach" },
  20: { ko: "관(觀) · 바라봄", en: "Contemplation" },
  21: { ko: "서합(噬嗑) · 깨물어 뚫음", en: "Biting Through" },
  22: { ko: "비(賁) · 꾸밈", en: "Grace" },
  23: { ko: "박(剝) · 갈라짐", en: "Splitting Apart" },
  24: { ko: "복(復) · 돌아옴", en: "Return" },
  25: { ko: "무망(无妄) · 순수", en: "Innocence" },
  26: { ko: "대축(大畜) · 큰 것의 길들임", en: "The Taming Power of the Great" },
  27: { ko: "이(頤) · 기름", en: "The Corners of the Mouth" },
  28: { ko: "대과(大過) · 큰 지나침", en: "Preponderance of the Great" },
  29: { ko: "감(坎) · 거듭된 험난", en: "The Abysmal" },
  30: { ko: "이(離) · 붙음", en: "The Clinging" },
  31: { ko: "함(咸) · 감응", en: "Influence" },
  32: { ko: "항(恆) · 지속", en: "Duration" },
  33: { ko: "둔(遯) · 물러남", en: "Retreat" },
  34: { ko: "대장(大壯) · 큰 힘", en: "The Power of the Great" },
  35: { ko: "진(晉) · 나아감", en: "Progress" },
  36: { ko: "명이(明夷) · 빛의 가려짐", en: "Darkening of the Light" },
  37: { ko: "가인(家人) · 가족", en: "The Family" },
  38: { ko: "규(睽) · 어긋남", en: "Opposition" },
  39: { ko: "건(蹇) · 막힘", en: "Obstruction" },
  40: { ko: "해(解) · 풀림", en: "Deliverance" },
  41: { ko: "손(損) · 덜어냄", en: "Decrease" },
  42: { ko: "익(益) · 더함", en: "Increase" },
  43: { ko: "쾌(夬) · 터놓음", en: "Breakthrough" },
  44: { ko: "구(姤) · 만남", en: "Coming to Meet" },
  45: { ko: "췌(萃) · 모임", en: "Gathering Together" },
  46: { ko: "승(升) · 올라감", en: "Pushing Upward" },
  47: { ko: "곤(困) · 곤궁", en: "Oppression" },
  48: { ko: "정(井) · 우물", en: "The Well" },
  49: { ko: "혁(革) · 바꿈", en: "Revolution" },
  50: { ko: "정(鼎) · 솥", en: "The Cauldron" },
  51: { ko: "진(震) · 진동", en: "The Arousing" },
  52: { ko: "간(艮) · 그침", en: "Keeping Still" },
  53: { ko: "점(漸) · 점진", en: "Development" },
  54: { ko: "귀매(歸妹) · 시집가는 누이", en: "The Marrying Maiden" },
  55: { ko: "풍(豐) · 풍성", en: "Abundance" },
  56: { ko: "여(旅) · 나그네", en: "The Wanderer" },
  57: { ko: "손(巽) · 스며듦", en: "The Gentle" },
  58: { ko: "태(兌) · 기쁨", en: "The Joyous" },
  59: { ko: "환(渙) · 흩어짐", en: "Dispersion" },
  60: { ko: "절(節) · 절제", en: "Limitation" },
  61: { ko: "중부(中孚) · 내면의 진실", en: "Inner Truth" },
  62: { ko: "소과(小過) · 작은 지나침", en: "Preponderance of the Small" },
  63: { ko: "기제(既濟) · 이미 이룸", en: "After Completion" },
  64: { ko: "미제(未濟) · 아직 이루지 못함", en: "Before Completion" },
});

export function pick(entry: Bilingual | undefined, locale: Locale): string {
  if (!entry) return "";
  return entry[locale] || entry.ko;
}
