// 작명 v2 화면 문구. ko 정본, en·ja·zh-CN·zh-TW 저작, 나머지 로케일은 en.
// 🔴 저작 로케일 블록은 스프레드(...EN) 없이 키를 전부 적는다 — paid-result-locale-copy 가드가 키 집합을 글자 그대로 비교한다.
// 🔴 엔진이 만드는 결정론 서술 문장(풀이·편지)은 한국어로만 나온다(Phase 4 결정 4) — 비-ko 화면은 koOnlyNotice 로 알린다.

import type { V2Element, V2Grade, V2Grid, V2Relation, V2ScoreKey, V2SchoolPreset } from "./namingV2Types";

export interface NamingV2Copy {
  elements: Record<V2Element, string>;
  grades: Record<V2Grade, string>;
  grids: Record<V2Grid, { name: string; han: string; period: string }>;
  relations: Record<V2Relation, string>;
  scores: Record<V2ScoreKey, string>;
  flags: Record<string, string>;
  notices: Record<string, string>;
  relaxedNotice: (stage: string) => string;
  mapping: Record<string, string>;
  method: Record<string, string>;
  schools: Record<V2SchoolPreset, { title: string; desc: string }>;
  // 입력
  surnameHanjaLabel: string;
  surnameHanjaHint: string;
  surnameNeedHangul: string;
  surnameLoading: string;
  surnameNotListed: string;
  surnameManualLabel: string;
  surnameManualPlaceholder: string;
  surnameNoHanja: string;
  surnamePopulation: (count: number) => string;
  strokesUnit: (n: number) => string;
  compoundBadge: string;
  schoolLabel: string;
  fixedLabel: string;
  fixedNone: string;
  fixedPosition: (k: number) => string;
  fixedHanjaPlaceholder: string;
  fixedHangulPlaceholder: string;
  avoidLabel: string;
  avoidPlaceholder: string;
  engineLengthNote: string;
  // 무료 미리보기
  basisTitle: string;
  basisLead: string;
  basisButton: string;
  basisLoading: string;
  basisNeedInput: string;
  basisError: string;
  basisPaidHint: string;
  // 사주 요약
  sajuTitle: string;
  usefulLabel: string;
  supportLabel: string;
  cautionLabel: string;
  nameAddsLabel: string;
  natalCountLabel: string;
  pentagonCaption: string;
  generateLegend: string;
  controlLegend: string;
  // 후보·상세
  candidatesTitle: string;
  candidatesLead: string;
  totalLabel: string;
  rankLabel: (rank: number) => string;
  detailTitle: string;
  strokesTitle: string;
  radicalLabel: string;
  jawonLabel: string;
  unclassified: string;
  noHun: string;
  soundTitle: string;
  soundCaption: string;
  gridsTitle: string;
  gridsCaption: string;
  suriElementLabel: string;
  samjaeTitle: string;
  samjaeTiers: { heaven: string; human: string; earth: string };
  samjaeReference: string;
  samjaeDisputed: string;
  radarTitle: string;
  narrationTitle: string;
  meaningLabel: string;
  sajuSupportLabel: string;
  soundFeelLabel: string;
  // 비교
  compareTitle: string;
  compareLead: string;
  compareAdd: string;
  compareRemove: string;
  compareFull: string;
  compareEmpty: string;
  // 작명서
  reportKicker: string;
  reportTitle: string;
  reportLead: (surname: string) => string;
  finalPickLabel: string;
  lettersTitle: string;
  saveImage: string;
  saving: string;
  saved: string;
  saveFailed: string;
  koOnlyNotice: string;
  sealNaming: string;
  sealBrand: string;
  sealDone: string;
  pillarLabels: Record<"y" | "m" | "d" | "h", string>;
  pentagonCaptionNoCounts: string;
  fillsUseful: (element: string) => string;
  detailOpen: string;
  hunEumLabel: string;
  noCandidates: string;
}

const KO: NamingV2Copy = {
  elements: { wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)" },
  grades: { good: "길", half: "반길", bad: "흉" },
  grids: {
    won: { name: "원격", han: "元", period: "초년" },
    hyeong: { name: "형격", han: "亨", period: "청년" },
    i: { name: "이격", han: "利", period: "중년" },
    jeong: { name: "정격", han: "貞", period: "말년·총운" },
  },
  relations: { generate: "상생", same: "비화", control: "상극" },
  scores: { saju: "사주 보완", suri: "수리", sound: "소리오행", practical: "어감·실용", samjae: "삼재", yinyang: "음양" },
  flags: {
    "low-confidence": "자원오행 검수 전",
    disputed: "출처 간 이견",
    "court-code-variant": "법원 이체 코드",
    "no-hun": "훈 미수록",
    buryong: "불용 관행 주의",
    "rare-in-names": "이름에 드문 글자",
  },
  notices: {
    "saju.time-unknown": "출생 시간을 모르는 상태라 시주를 뺀 세 기둥으로 용신을 판단했습니다.",
    "saju.jong-conditional": "종격으로 볼 여지가 있는 명식이라 용신 판단에 조건이 붙습니다.",
    "surname.pool-strokes": "성씨 획수를 성씨 통계 대신 인명용 한자 자료에서 읽었습니다.",
    "sound.school-differs": "고른 학파에 따라 소리오행 배정이 달라질 수 있습니다.",
    "candidates.short": "조건을 모두 만족하는 후보가 적어 보여 드리는 수가 줄었습니다.",
  },
  relaxedNotice: (stage) => `후보가 부족해 조건을 ${stage}단계까지 완화해 골랐습니다.`,
  mapping: {
    modern: "현대 실무 배정(ㅇ·ㅎ 토, ㅁ·ㅂ·ㅍ 수)",
    hunminjeongeum: "훈민정음 해례 배정(ㅁ·ㅂ·ㅍ 토, ㅇ·ㅎ 수)",
  },
  method: { won: "원획", pil: "필획" },
  schools: {
    "kr-modern": { title: "현대 실무(기본)", desc: "국내 작명 실무에서 널리 쓰는 소리오행과 원획" },
    "kr-hunminjeongeum": { title: "훈민정음 해례", desc: "해례본 제자해의 소리오행(순음 토·후음 수)과 원획" },
    "kr-pil": { title: "필획 기준", desc: "현대 실무 소리오행에 실제 쓰는 획수(필획)" },
  },
  surnameHanjaLabel: "성씨 한자",
  surnameHanjaHint: "한자를 고르면 인명용 한자 전체에서 사주·수리·소리를 계산해 이름을 찾습니다.",
  surnameNeedHangul: "먼저 한글 성을 입력해 주세요.",
  surnameLoading: "성씨 한자를 불러오는 중…",
  surnameNotListed: "통계에 없는 성씨입니다. 한자를 직접 입력해 주세요.",
  surnameManualLabel: "목록에 없으면 직접 입력",
  surnameManualPlaceholder: "예: 金",
  surnameNoHanja: "한자 없이 진행",
  surnamePopulation: (count) => (count >= 10000 ? `약 ${Math.round(count / 10000).toLocaleString("ko-KR")}만 명` : `${count.toLocaleString("ko-KR")}명`),
  strokesUnit: (n) => `${n}획`,
  compoundBadge: "복성",
  schoolLabel: "작명 학파",
  fixedLabel: "꼭 넣을 글자(돌림자)",
  fixedNone: "없음",
  fixedPosition: (k) => (k === 0 ? "이름 첫째 자" : "이름 둘째 자"),
  fixedHanjaPlaceholder: "한자 1자",
  fixedHangulPlaceholder: "읽기(선택)",
  avoidLabel: "피할 한자",
  avoidPlaceholder: "예: 死 病 (띄어 쓰기)",
  engineLengthNote: "한자 계산 작명은 이름 1~2자까지 지원합니다.",
  basisTitle: "무료 한자 이름 미리보기",
  basisLead: "결제 전에 계산 엔진이 고른 상위 5개 이름과 사주 오행 요약을 먼저 보여 드립니다. AI 호출 없이 계산만으로 만듭니다.",
  basisButton: "무료로 5개 이름 보기",
  basisLoading: "인명용 한자를 계산하는 중…",
  basisNeedInput: "성별·생년월일·한글 성·성씨 한자를 입력하면 미리볼 수 있습니다.",
  basisError: "미리보기를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
  basisPaidHint: "유료 작명서에는 후보 12개, 2~3개 비교, 이름별 풀이와 8장 해설, 작명서 이미지·PDF 저장이 들어갑니다.",
  sajuTitle: "사주 오행 요약",
  usefulLabel: "채울 오행(용신)",
  supportLabel: "돕는 오행",
  cautionLabel: "주의 오행",
  nameAddsLabel: "이름이 보태는 기운",
  natalCountLabel: "원국",
  pentagonCaption: "원의 크기는 사주 원국의 오행 개수, 반짝이는 고리는 이름 글자가 보태는 오행입니다.",
  generateLegend: "상생(돕는 흐름)",
  controlLegend: "상극(누르는 관계)",
  candidatesTitle: "추천 이름",
  candidatesLead: "점수는 사주 보완 35 · 수리 25 · 소리 15 · 어감 15 · 삼재 5 · 음양 5 비중으로 합산했습니다.",
  totalLabel: "종합",
  rankLabel: (rank) => `${rank}순위`,
  detailTitle: "이름 상세",
  strokesTitle: "한자 획수",
  radicalLabel: "부수",
  jawonLabel: "자원오행",
  unclassified: "미분류",
  noHun: "훈 미수록",
  soundTitle: "소리오행 흐름",
  soundCaption: "초성의 오행이 이웃 소리와 상생으로 이어지면 금빛, 상극이면 끊긴 선으로 표시합니다.",
  gridsTitle: "원형이정 4격",
  gridsCaption: "성과 이름의 획수를 더해 네 격을 만들고 81수리로 길흉을 봅니다.",
  suriElementLabel: "수리오행",
  samjaeTitle: "삼재(천·인·지)",
  samjaeTiers: { heaven: "천격", human: "인격", earth: "지격" },
  samjaeReference: "학파마다 해석이 달라 참고 지표로만 반영했습니다(비중 5).",
  samjaeDisputed: "출처마다 길흉 판정이 갈리는 조합입니다.",
  radarTitle: "항목별 점수",
  narrationTitle: "이름 풀이",
  meaningLabel: "뜻",
  sajuSupportLabel: "사주와의 조화",
  soundFeelLabel: "부르는 소리",
  compareTitle: "이름 비교",
  compareLead: "마음에 드는 이름을 2~3개 골라 나란히 견주어 보세요.",
  compareAdd: "비교에 담기",
  compareRemove: "비교에서 빼기",
  compareFull: "비교는 3개까지입니다.",
  compareEmpty: "후보 카드의 '비교에 담기'를 눌러 2개 이상 골라 주세요.",
  reportKicker: "命名書",
  reportTitle: "작명서",
  reportLead: (surname) => `${surname}씨 성을 이을 이름을 사주와 획수, 소리로 계산해 골랐습니다.`,
  finalPickLabel: "첫 번째로 권하는 이름",
  lettersTitle: "이름에 붙이는 편지",
  saveImage: "작명서 이미지 저장",
  saving: "저장하는 중…",
  saved: "저장했습니다.",
  saveFailed: "이미지를 만들지 못했습니다. 다시 시도해 주세요.",
  koOnlyNotice: "",
  sealNaming: "命名",
  sealBrand: "運",
  sealDone: "완료",
  pillarLabels: { y: "년주", m: "월주", d: "일주", h: "시주" },
  pentagonCaptionNoCounts: "이전 기록이라 원국 개수 없이 그렸습니다. 반짝이는 고리는 이름 글자가 보태는 오행입니다.",
  fillsUseful: (element) => `용신 ${element} 보완`,
  detailOpen: "자세히 보기",
  hunEumLabel: "훈음",
  noCandidates: "조건에 맞는 이름을 찾지 못했습니다. 돌림자나 피할 한자 조건을 줄여 다시 시도해 주세요.",
};

const EN: NamingV2Copy = {
  elements: { wood: "Wood (木)", fire: "Fire (火)", earth: "Earth (土)", metal: "Metal (金)", water: "Water (水)" },
  grades: { good: "Auspicious", half: "Mixed", bad: "Inauspicious" },
  grids: {
    won: { name: "Won", han: "元", period: "Early years" },
    hyeong: { name: "Hyeong", han: "亨", period: "Youth" },
    i: { name: "I", han: "利", period: "Midlife" },
    jeong: { name: "Jeong", han: "貞", period: "Later life · overall" },
  },
  relations: { generate: "Generating", same: "Same", control: "Controlling" },
  scores: { saju: "Saju balance", suri: "Stroke numbers", sound: "Sound elements", practical: "Ease of use", samjae: "Samjae", yinyang: "Yin-yang" },
  flags: {
    "low-confidence": "Element unreviewed",
    disputed: "Sources disagree",
    "court-code-variant": "Court variant code",
    "no-hun": "No gloss on file",
    buryong: "Customarily avoided",
    "rare-in-names": "Rare in names",
  },
  notices: {
    "saju.time-unknown": "Birth time is unknown, so the useful element was judged from three pillars.",
    "saju.jong-conditional": "This chart may follow a dominant pattern, so the useful element is conditional.",
    "surname.pool-strokes": "Surname strokes were read from the name-hanja data instead of surname statistics.",
    "sound.school-differs": "Sound elements can differ by the school you chose.",
    "candidates.short": "Few names met every condition, so fewer are shown.",
  },
  relaxedNotice: (stage) => `Too few names matched, so conditions were relaxed to stage ${stage}.`,
  mapping: {
    modern: "Modern practice (ㅇ·ㅎ Earth, ㅁ·ㅂ·ㅍ Water)",
    hunminjeongeum: "Hunminjeongeum Haerye (ㅁ·ㅂ·ㅍ Earth, ㅇ·ㅎ Water)",
  },
  method: { won: "Original strokes", pil: "Written strokes" },
  schools: {
    "kr-modern": { title: "Modern practice (default)", desc: "The sound elements and original strokes most Korean namers use" },
    "kr-hunminjeongeum": { title: "Hunminjeongeum Haerye", desc: "Sound elements from the 1446 Haerye with original strokes" },
    "kr-pil": { title: "Written strokes", desc: "Modern sound elements with the strokes as written today" },
  },
  surnameHanjaLabel: "Surname hanja",
  surnameHanjaHint: "Pick the hanja to search every name hanja by saju, stroke numbers and sound.",
  surnameNeedHangul: "Enter the surname in Hangul first.",
  surnameLoading: "Loading surname hanja…",
  surnameNotListed: "This surname is not in the statistics. Type its hanja below.",
  surnameManualLabel: "Not listed? Type it",
  surnameManualPlaceholder: "e.g. 金",
  surnameNoHanja: "Continue without hanja",
  surnamePopulation: (count) => `${count.toLocaleString("en-US")} people`,
  strokesUnit: (n) => `${n} strokes`,
  compoundBadge: "Two-syllable",
  schoolLabel: "Naming school",
  fixedLabel: "Required character (generation name)",
  fixedNone: "None",
  fixedPosition: (k) => (k === 0 ? "First name character" : "Second name character"),
  fixedHanjaPlaceholder: "One hanja",
  fixedHangulPlaceholder: "Reading (optional)",
  avoidLabel: "Hanja to avoid",
  avoidPlaceholder: "e.g. 死 病 (space-separated)",
  engineLengthNote: "Calculated hanja naming supports one- or two-character names.",
  basisTitle: "Free hanja name preview",
  basisLead: "Before you pay, see the engine's top five names and your saju element summary. Calculated only, no AI call.",
  basisButton: "See five names free",
  basisLoading: "Calculating name hanja…",
  basisNeedInput: "Enter gender, birth date, surname in Hangul and its hanja to preview.",
  basisError: "The preview could not load. Please try again shortly.",
  basisPaidHint: "The paid naming book adds 12 candidates, side-by-side comparison, per-name commentary, eight chapters and image/PDF saving.",
  sajuTitle: "Saju element summary",
  usefulLabel: "Element to add (useful)",
  supportLabel: "Supporting element",
  cautionLabel: "Element to watch",
  nameAddsLabel: "What the name adds",
  natalCountLabel: "Chart",
  pentagonCaption: "Circle size shows how often each element appears in the chart; glowing rings mark elements the name adds.",
  generateLegend: "Generating (supports)",
  controlLegend: "Controlling (restrains)",
  candidatesTitle: "Recommended names",
  candidatesLead: "Scores weigh saju 35 · strokes 25 · sound 15 · ease 15 · samjae 5 · yin-yang 5.",
  totalLabel: "Total",
  rankLabel: (rank) => `#${rank}`,
  detailTitle: "Name details",
  strokesTitle: "Hanja strokes",
  radicalLabel: "Radical",
  jawonLabel: "Character element",
  unclassified: "Unclassified",
  noHun: "No gloss",
  soundTitle: "Sound-element flow",
  soundCaption: "Gold lines join initial sounds that generate each other; broken lines mark controlling pairs.",
  gridsTitle: "Four grids (元亨利貞)",
  gridsCaption: "Surname and name strokes add up to four grids, each read against the 81 numbers.",
  suriElementLabel: "Number element",
  samjaeTitle: "Samjae (heaven · person · earth)",
  samjaeTiers: { heaven: "Heaven", human: "Person", earth: "Earth" },
  samjaeReference: "Schools disagree, so this counts only as a reference (weight 5).",
  samjaeDisputed: "Sources disagree on this combination.",
  radarTitle: "Scores by category",
  narrationTitle: "Name commentary",
  meaningLabel: "Meaning",
  sajuSupportLabel: "Fit with the chart",
  soundFeelLabel: "How it sounds",
  compareTitle: "Compare names",
  compareLead: "Pick two or three names you like and compare them side by side.",
  compareAdd: "Add to compare",
  compareRemove: "Remove",
  compareFull: "You can compare up to three.",
  compareEmpty: "Use “Add to compare” on two or more cards.",
  reportKicker: "命名書",
  reportTitle: "Naming book",
  reportLead: (surname) => `Names to carry the ${surname} family name, chosen by saju, strokes and sound.`,
  finalPickLabel: "Our first recommendation",
  lettersTitle: "A letter with the name",
  saveImage: "Save naming book image",
  saving: "Saving…",
  saved: "Saved.",
  saveFailed: "The image could not be made. Please try again.",
  koOnlyNotice: "Commentary sentences generated by the calculation engine are provided in Korean.",
  sealNaming: "命名",
  sealBrand: "運",
  sealDone: "DONE",
  pillarLabels: { y: "Year", m: "Month", d: "Day", h: "Hour" },
  pentagonCaptionNoCounts: "This earlier record has no chart counts, so circles are equal; glowing rings mark elements the name adds.",
  fillsUseful: (element) => `Adds useful ${element}`,
  detailOpen: "View details",
  hunEumLabel: "Gloss & reading",
  noCandidates: "No names met these conditions. Loosen the required or avoided hanja and try again.",
};

const JA: NamingV2Copy = {
  elements: { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" },
  grades: { good: "吉", half: "半吉", bad: "凶" },
  grids: {
    won: { name: "元格", han: "元", period: "初年" },
    hyeong: { name: "亨格", han: "亨", period: "青年" },
    i: { name: "利格", han: "利", period: "中年" },
    jeong: { name: "貞格", han: "貞", period: "晩年・総運" },
  },
  relations: { generate: "相生", same: "比和", control: "相剋" },
  scores: { saju: "四柱の補完", suri: "数理", sound: "音の五行", practical: "響き・実用", samjae: "三才", yinyang: "陰陽" },
  flags: { "low-confidence": "字源五行は検証前", disputed: "出典間で異同", "court-code-variant": "法院の異体コード", "no-hun": "訓の収録なし", buryong: "不用の慣行に注意", "rare-in-names": "人名での使用が稀" },
  notices: {
    "saju.time-unknown": "出生時刻が不明のため、時柱を除く三柱で用神を判断しました。",
    "saju.jong-conditional": "従格と見る余地がある命式のため、用神の判断には条件が付きます。",
    "surname.pool-strokes": "姓の画数を姓氏統計ではなく人名用漢字データから読みました。",
    "sound.school-differs": "選んだ流派によって音の五行の配当が変わることがあります。",
    "candidates.short": "全条件を満たす候補が少ないため、表示数が減りました。",
  },
  relaxedNotice: (stage) => `候補が足りず、条件を第${stage}段階まで緩めました。`,
  mapping: { modern: "現代実務の配当(ㅇ・ㅎ 土、ㅁ・ㅂ・ㅍ 水)", hunminjeongeum: "訓民正音解例の配当(ㅁ・ㅂ・ㅍ 土、ㅇ・ㅎ 水)" },
  method: { won: "原画", pil: "筆画" },
  schools: {
    "kr-modern": { title: "現代実務(標準)", desc: "韓国の命名実務で広く使う音の五行と原画" },
    "kr-hunminjeongeum": { title: "訓民正音解例", desc: "解例本制字解の音の五行(唇音 土・喉音 水)と原画" },
    "kr-pil": { title: "筆画基準", desc: "現代実務の音の五行に実際の筆画" },
  },
  surnameHanjaLabel: "姓の漢字",
  surnameHanjaHint: "漢字を選ぶと、人名用漢字全体から四柱・数理・音で名前を探します。",
  surnameNeedHangul: "先にハングルで姓を入力してください。",
  surnameLoading: "姓の漢字を読み込み中…",
  surnameNotListed: "統計にない姓です。漢字を直接入力してください。",
  surnameManualLabel: "一覧にない場合は直接入力",
  surnameManualPlaceholder: "例: 金",
  surnameNoHanja: "漢字なしで進む",
  surnamePopulation: (count) => `${count.toLocaleString("ja-JP")}人`,
  strokesUnit: (n) => `${n}画`,
  compoundBadge: "複姓",
  schoolLabel: "命名の流派",
  fixedLabel: "必ず入れる字(行列字)",
  fixedNone: "なし",
  fixedPosition: (k) => (k === 0 ? "名の一字目" : "名の二字目"),
  fixedHanjaPlaceholder: "漢字1字",
  fixedHangulPlaceholder: "読み(任意)",
  avoidLabel: "避ける漢字",
  avoidPlaceholder: "例: 死 病(空白区切り)",
  engineLengthNote: "漢字計算による命名は名1〜2字に対応します。",
  basisTitle: "無料・漢字名プレビュー",
  basisLead: "お支払い前に、計算エンジンが選んだ上位5つの名前と四柱の五行要約をお見せします。AIは使わず計算のみです。",
  basisButton: "無料で5つの名前を見る",
  basisLoading: "人名用漢字を計算中…",
  basisNeedInput: "性別・生年月日・ハングルの姓・姓の漢字を入れるとプレビューできます。",
  basisError: "プレビューを読み込めませんでした。少し後でもう一度お試しください。",
  basisPaidHint: "有料の命名書には候補12件、2〜3件の比較、名前ごとの解説と全8章、画像・PDF保存が含まれます。",
  sajuTitle: "四柱の五行要約",
  usefulLabel: "補う五行(用神)",
  supportLabel: "助ける五行",
  cautionLabel: "注意する五行",
  nameAddsLabel: "名前が加える気",
  natalCountLabel: "原局",
  pentagonCaption: "円の大きさは原局の五行の数、光る輪は名前の字が加える五行です。",
  generateLegend: "相生(助ける流れ)",
  controlLegend: "相剋(抑える関係)",
  candidatesTitle: "おすすめの名前",
  candidatesLead: "点数は四柱35・数理25・音15・響き15・三才5・陰陽5の比重で合算しました。",
  totalLabel: "総合",
  rankLabel: (rank) => `${rank}位`,
  detailTitle: "名前の詳細",
  strokesTitle: "漢字の画数",
  radicalLabel: "部首",
  jawonLabel: "字源五行",
  unclassified: "未分類",
  noHun: "訓なし",
  soundTitle: "音の五行の流れ",
  soundCaption: "初声の五行が隣と相生なら金色、相剋なら途切れた線で示します。",
  gridsTitle: "元亨利貞の四格",
  gridsCaption: "姓と名の画数を足して四つの格を作り、81数理で吉凶を見ます。",
  suriElementLabel: "数理五行",
  samjaeTitle: "三才(天・人・地)",
  samjaeTiers: { heaven: "天格", human: "人格", earth: "地格" },
  samjaeReference: "流派で解釈が分かれるため参考指標としてのみ反映しました(比重5)。",
  samjaeDisputed: "出典によって吉凶の判定が分かれる組み合わせです。",
  radarTitle: "項目別の点数",
  narrationTitle: "名前の解説",
  meaningLabel: "意味",
  sajuSupportLabel: "四柱との調和",
  soundFeelLabel: "呼んだ響き",
  compareTitle: "名前の比較",
  compareLead: "気に入った名前を2〜3つ選んで並べて比べてみましょう。",
  compareAdd: "比較に入れる",
  compareRemove: "比較から外す",
  compareFull: "比較は3つまでです。",
  compareEmpty: "候補カードの「比較に入れる」で2つ以上選んでください。",
  reportTitle: "命名書",
  reportLead: (surname) => `${surname}の姓を継ぐ名前を、四柱・画数・音で計算して選びました。`,
  finalPickLabel: "第一におすすめする名前",
  lettersTitle: "名前に添える手紙",
  saveImage: "命名書を画像で保存",
  saving: "保存中…",
  saved: "保存しました。",
  saveFailed: "画像を作れませんでした。もう一度お試しください。",
  koOnlyNotice: "計算エンジンが作る解説文は韓国語で提供されます。",
  reportKicker: "命名書",
  sealNaming: "命名",
  sealBrand: "運",
  sealDone: "完了",
  pillarLabels: { y: "年柱", m: "月柱", d: "日柱", h: "時柱" },
  pentagonCaptionNoCounts: "以前の記録のため原局の数なしで描きました。光る輪は名前の字が加える五行です。",
  fillsUseful: (element) => `用神${element}を補う`,
  detailOpen: "詳しく見る",
  hunEumLabel: "訓と音",
  noCandidates: "条件に合う名前が見つかりませんでした。行列字や避ける漢字の条件を減らしてお試しください。",
};

const ZH_CN: NamingV2Copy = {
  elements: { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" },
  grades: { good: "吉", half: "半吉", bad: "凶" },
  grids: {
    won: { name: "元格", han: "元", period: "初年" },
    hyeong: { name: "亨格", han: "亨", period: "青年" },
    i: { name: "利格", han: "利", period: "中年" },
    jeong: { name: "贞格", han: "貞", period: "晚年·总运" },
  },
  relations: { generate: "相生", same: "比和", control: "相克" },
  scores: { saju: "八字补益", suri: "数理", sound: "音五行", practical: "音感·实用", samjae: "三才", yinyang: "阴阳" },
  flags: { "low-confidence": "字源五行待审", disputed: "出处有分歧", "court-code-variant": "法院异体编码", "no-hun": "未收录字义", buryong: "注意忌用惯例", "rare-in-names": "人名中少见" },
  notices: {
    "saju.time-unknown": "出生时辰不详，因此以去掉时柱的三柱判断用神。",
    "saju.jong-conditional": "此命式有从格的可能，用神判断附带条件。",
    "surname.pool-strokes": "姓氏笔画取自人名用汉字资料，而非姓氏统计。",
    "sound.school-differs": "所选流派不同，音五行的配属可能不同。",
    "candidates.short": "满足全部条件的候选较少，显示数量随之减少。",
  },
  relaxedNotice: (stage) => `候选不足，已将条件放宽至第${stage}级。`,
  mapping: { modern: "现代实务配属(ㅇ·ㅎ 土，ㅁ·ㅂ·ㅍ 水)", hunminjeongeum: "训民正音解例配属(ㅁ·ㅂ·ㅍ 土，ㅇ·ㅎ 水)" },
  method: { won: "原笔画", pil: "书写笔画" },
  schools: {
    "kr-modern": { title: "现代实务(默认)", desc: "韩国起名实务通用的音五行与原笔画" },
    "kr-hunminjeongeum": { title: "训民正音解例", desc: "解例本制字解的音五行(唇音 土、喉音 水)与原笔画" },
    "kr-pil": { title: "书写笔画", desc: "现代实务音五行配合实际书写笔画" },
  },
  surnameHanjaLabel: "姓氏汉字",
  surnameHanjaHint: "选定汉字后，将在全部人名用汉字中按八字、数理、读音计算并寻找名字。",
  surnameNeedHangul: "请先输入韩文姓氏。",
  surnameLoading: "正在载入姓氏汉字…",
  surnameNotListed: "统计中没有此姓氏，请直接输入汉字。",
  surnameManualLabel: "列表中没有时直接输入",
  surnameManualPlaceholder: "例：金",
  surnameNoHanja: "不使用汉字",
  surnamePopulation: (count) => `${count.toLocaleString("zh-CN")}人`,
  strokesUnit: (n) => `${n}画`,
  compoundBadge: "复姓",
  schoolLabel: "起名流派",
  fixedLabel: "必用字(辈分字)",
  fixedNone: "无",
  fixedPosition: (k) => (k === 0 ? "名字第一字" : "名字第二字"),
  fixedHanjaPlaceholder: "汉字1个",
  fixedHangulPlaceholder: "读音(可选)",
  avoidLabel: "避用汉字",
  avoidPlaceholder: "例：死 病(空格分隔)",
  engineLengthNote: "汉字计算起名支持1~2字的名字。",
  basisTitle: "免费汉字名预览",
  basisLead: "付款前先展示计算引擎选出的前5个名字和八字五行摘要。仅靠计算，不调用AI。",
  basisButton: "免费查看5个名字",
  basisLoading: "正在计算人名用汉字…",
  basisNeedInput: "填写性别、出生日期、韩文姓氏与姓氏汉字后即可预览。",
  basisError: "预览载入失败，请稍后再试。",
  basisPaidHint: "付费命名书包含12个候选、2~3个对比、逐名解说与8章内容，以及图片·PDF保存。",
  sajuTitle: "八字五行摘要",
  usefulLabel: "宜补五行(用神)",
  supportLabel: "相助五行",
  cautionLabel: "需注意五行",
  nameAddsLabel: "名字补入的气",
  natalCountLabel: "原局",
  pentagonCaption: "圆的大小表示原局五行数量，发光的环表示名字所补的五行。",
  generateLegend: "相生(相助)",
  controlLegend: "相克(制约)",
  candidatesTitle: "推荐名字",
  candidatesLead: "得分按八字35·数理25·读音15·音感15·三才5·阴阳5加权合计。",
  totalLabel: "综合",
  rankLabel: (rank) => `第${rank}名`,
  detailTitle: "名字详情",
  strokesTitle: "汉字笔画",
  radicalLabel: "部首",
  jawonLabel: "字源五行",
  unclassified: "未分类",
  noHun: "未收录字义",
  soundTitle: "音五行流向",
  soundCaption: "声母五行与相邻读音相生时显示金线，相克时显示断线。",
  gridsTitle: "元亨利贞四格",
  gridsCaption: "姓与名的笔画相加构成四格，以81数理看吉凶。",
  suriElementLabel: "数理五行",
  samjaeTitle: "三才(天·人·地)",
  samjaeTiers: { heaven: "天格", human: "人格", earth: "地格" },
  samjaeReference: "各派解释不一，仅作参考指标(权重5)。",
  samjaeDisputed: "此组合的吉凶判定因出处而异。",
  radarTitle: "分项得分",
  narrationTitle: "名字解说",
  meaningLabel: "含义",
  sajuSupportLabel: "与八字的协调",
  soundFeelLabel: "读音感受",
  compareTitle: "名字对比",
  compareLead: "选出2~3个喜欢的名字并排比较。",
  compareAdd: "加入对比",
  compareRemove: "移出对比",
  compareFull: "最多对比3个。",
  compareEmpty: "请在候选卡片上点“加入对比”，选择2个以上。",
  reportTitle: "命名书",
  reportLead: (surname) => `为承继${surname}姓的孩子，按八字、笔画与读音计算选名。`,
  finalPickLabel: "首推名字",
  lettersTitle: "随名附上的信",
  saveImage: "保存命名书图片",
  saving: "正在保存…",
  saved: "已保存。",
  saveFailed: "图片生成失败，请重试。",
  koOnlyNotice: "计算引擎生成的解说文字以韩语提供。",
  reportKicker: "命名书",
  sealNaming: "命名",
  sealBrand: "運",
  sealDone: "完成",
  pillarLabels: { y: "年柱", m: "月柱", d: "日柱", h: "时柱" },
  pentagonCaptionNoCounts: "此为早期记录，未含原局数量，圆大小相同；发光的环表示名字所补的五行。",
  fillsUseful: (element) => `补用神${element}`,
  detailOpen: "查看详情",
  hunEumLabel: "字义与读音",
  noCandidates: "没有找到符合条件的名字。请减少必用字或避用汉字的条件后重试。",
};

const ZH_TW: NamingV2Copy = {
  grids: {
    won: { name: "元格", han: "元", period: "初年" },
    hyeong: { name: "亨格", han: "亨", period: "青年" },
    i: { name: "利格", han: "利", period: "中年" },
    jeong: { name: "貞格", han: "貞", period: "晚年·總運" },
  },
  scores: { saju: "八字補益", suri: "數理", sound: "音五行", practical: "音感·實用", samjae: "三才", yinyang: "陰陽" },
  relations: { generate: "相生", same: "比和", control: "相剋" },
  flags: { "low-confidence": "字源五行待審", disputed: "出處有分歧", "court-code-variant": "法院異體編碼", "no-hun": "未收錄字義", buryong: "注意忌用慣例", "rare-in-names": "人名中少見" },
  notices: {
    "saju.time-unknown": "出生時辰不詳，因此以去掉時柱的三柱判斷用神。",
    "saju.jong-conditional": "此命式有從格的可能，用神判斷附帶條件。",
    "surname.pool-strokes": "姓氏筆畫取自人名用漢字資料，而非姓氏統計。",
    "sound.school-differs": "所選流派不同，音五行的配屬可能不同。",
    "candidates.short": "滿足全部條件的候選較少，顯示數量隨之減少。",
  },
  relaxedNotice: (stage) => `候選不足，已將條件放寬至第${stage}級。`,
  mapping: { modern: "現代實務配屬(ㅇ·ㅎ 土，ㅁ·ㅂ·ㅍ 水)", hunminjeongeum: "訓民正音解例配屬(ㅁ·ㅂ·ㅍ 土，ㅇ·ㅎ 水)" },
  method: { won: "原筆畫", pil: "書寫筆畫" },
  schools: {
    "kr-modern": { title: "現代實務(預設)", desc: "韓國命名實務通用的音五行與原筆畫" },
    "kr-hunminjeongeum": { title: "訓民正音解例", desc: "解例本制字解的音五行(唇音 土、喉音 水)與原筆畫" },
    "kr-pil": { title: "書寫筆畫", desc: "現代實務音五行配合實際書寫筆畫" },
  },
  surnameHanjaLabel: "姓氏漢字",
  surnameHanjaHint: "選定漢字後，將在全部人名用漢字中依八字、數理、讀音計算並尋找名字。",
  surnameNeedHangul: "請先輸入韓文姓氏。",
  surnameLoading: "正在載入姓氏漢字…",
  surnameNotListed: "統計中沒有此姓氏，請直接輸入漢字。",
  surnameManualLabel: "清單中沒有時直接輸入",
  surnameNoHanja: "不使用漢字",
  surnamePopulation: (count) => `${count.toLocaleString("zh-TW")}人`,
  strokesUnit: (n) => `${n}畫`,
  compoundBadge: "複姓",
  schoolLabel: "命名流派",
  fixedLabel: "必用字(輩分字)",
  fixedNone: "無",
  fixedHanjaPlaceholder: "漢字1個",
  fixedHangulPlaceholder: "讀音(選填)",
  avoidLabel: "避用漢字",
  avoidPlaceholder: "例：死 病(空格分隔)",
  engineLengthNote: "漢字計算命名支援1~2字的名字。",
  basisTitle: "免費漢字名預覽",
  basisLead: "付款前先呈現計算引擎選出的前5個名字與八字五行摘要。僅靠計算，不呼叫AI。",
  basisButton: "免費查看5個名字",
  basisLoading: "正在計算人名用漢字…",
  basisNeedInput: "填寫性別、出生日期、韓文姓氏與姓氏漢字後即可預覽。",
  basisError: "預覽載入失敗，請稍後再試。",
  basisPaidHint: "付費命名書包含12個候選、2~3個比較、逐名解說與8章內容，以及圖片·PDF保存。",
  sajuTitle: "八字五行摘要",
  usefulLabel: "宜補五行(用神)",
  supportLabel: "相助五行",
  cautionLabel: "需注意五行",
  nameAddsLabel: "名字補入的氣",
  pentagonCaption: "圓的大小表示原局五行數量，發光的環表示名字所補的五行。",
  generateLegend: "相生(相助)",
  controlLegend: "相剋(制約)",
  candidatesTitle: "推薦名字",
  candidatesLead: "得分依八字35·數理25·讀音15·音感15·三才5·陰陽5加權合計。",
  totalLabel: "綜合",
  detailTitle: "名字詳情",
  strokesTitle: "漢字筆畫",
  noHun: "未收錄字義",
  soundTitle: "音五行流向",
  soundCaption: "聲母五行與相鄰讀音相生時顯示金線，相剋時顯示斷線。",
  gridsTitle: "元亨利貞四格",
  gridsCaption: "姓與名的筆畫相加構成四格，以81數理看吉凶。",
  suriElementLabel: "數理五行",
  samjaeReference: "各派解釋不一，僅作參考指標(權重5)。",
  samjaeDisputed: "此組合的吉凶判定因出處而異。",
  radarTitle: "分項得分",
  narrationTitle: "名字解說",
  meaningLabel: "含義",
  sajuSupportLabel: "與八字的協調",
  soundFeelLabel: "讀音感受",
  compareTitle: "名字比較",
  compareLead: "選出2~3個喜歡的名字並排比較。",
  compareAdd: "加入比較",
  compareRemove: "移出比較",
  compareFull: "最多比較3個。",
  compareEmpty: "請在候選卡片上點「加入比較」，選擇2個以上。",
  reportTitle: "命名書",
  reportLead: (surname) => `為承繼${surname}姓的孩子，依八字、筆畫與讀音計算選名。`,
  lettersTitle: "隨名附上的信",
  saveImage: "保存命名書圖片",
  saving: "正在保存…",
  saved: "已保存。",
  saveFailed: "圖片生成失敗，請重試。",
  koOnlyNotice: "計算引擎產生的解說文字以韓語提供。",
  elements: { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" },
  grades: { good: "吉", half: "半吉", bad: "凶" },
  surnameManualPlaceholder: "例：金",
  fixedPosition: (k) => (k === 0 ? "名字第一字" : "名字第二字"),
  natalCountLabel: "原局",
  rankLabel: (rank) => `第${rank}名`,
  radicalLabel: "部首",
  jawonLabel: "字源五行",
  unclassified: "未分類",
  samjaeTitle: "三才(天·人·地)",
  samjaeTiers: { heaven: "天格", human: "人格", earth: "地格" },
  reportKicker: "命名書",
  finalPickLabel: "首推名字",
  sealNaming: "命名",
  sealBrand: "運",
  sealDone: "完成",
  pillarLabels: { y: "年柱", m: "月柱", d: "日柱", h: "時柱" },
  pentagonCaptionNoCounts: "此為早期紀錄，未含原局數量，圓大小相同；發光的環表示名字所補的五行。",
  fillsUseful: (element) => `補用神${element}`,
  detailOpen: "查看詳情",
  hunEumLabel: "字義與讀音",
  noCandidates: "沒有找到符合條件的名字。請減少必用字或避用漢字的條件後重試。",
};

export function getNamingV2Copy(locale: string): NamingV2Copy {
  if (locale === "ko") return KO;
  if (locale === "ja") return JA;
  if (locale === "zh-CN") return ZH_CN;
  if (locale === "zh-TW") return ZH_TW;
  return EN;
}
