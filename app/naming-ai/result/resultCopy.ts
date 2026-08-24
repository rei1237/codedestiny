// 작명 결과 화면의 로케일 카피.
//
// 배경: 입력 화면(NamingAiClient)은 12개 로케일 카피 표를 갖고 있는데, 결제가 끝나고
// 사용자가 실제로 결과를 받아 보는 이 화면은 한국어가 하드코딩돼 있었다. 워커 프롬프트가
// 로케일별 작명 전통으로 갈라진 뒤에도(worker/lib/naming-locale-profile.js) 이 화면이
// 한국어면, 일본어 작명첩이 한국어 껍데기 안에 담겨 나온다.
//
// 🔴 범위는 ko·en·ja·zh-CN·zh-TW 다섯 개다(사용자 결정, 2026-08-25). 나머지 일곱 개는
//    영어로 폴백한다 — 이 레포의 기존 관행과 같고, 나중에 일괄로 채운다.
//
// 🔴 이름 카드의 필드 라벨은 여기서 번역해도 안전하다. LLM 응답을 파싱할 때 쓰는 한국어
//    라벨(`보완오행:` 등)은 worker/lib/naming-result-cards.js 의 기계 계약이고, 여기 있는
//    것은 파싱이 끝난 값에 붙이는 **화면 표시용 라벨**이다. 둘을 헷갈리지 말 것.

import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

export type NamingResultCopy = {
  chapterTitles: string[];
  /**
   * 작명첩 8장을 응답 본문에서 집어내는 제목 패턴.
   * 🔴 chapterTitles 를 그대로 이어 붙이지 않는다 — 모델이 제목을 조금 줄이거나 늘여 쓰면
   *    통째 일치는 빗나가는 반면, 장마다 고유한 조각은 살아남는다. 조각이 안 맞을 때의
   *    다음 그물은 parseAssistantSections 의 numberedHeadings 폴백(## N.)이다.
   */
  chapterTitleKeywords: RegExp;
  genderM: string;
  genderF: string;
  genderOther: string;
  waitSteps: string[];
  notEntered: string;
  solar: string;
  lunar: string;
  leapSuffix: string;
  errLinkMissing: string;
  errDelayed: string;
  errGenerateFailed: string;
  errLoadFailed: string;
  errPdfFailed: string;
  pdfSave: string;
  pdfMaking: string;
  openingSaved: string;
  headingGenerateFailed: string;
  headingCannotOpen: string;
  retry: string;
  copyPrompt: string;
  copied: string;
  aiGenerated: string;
  deckLabel: string;
  chapterFallback: (index: number) => string;
  pdfTitle: (familyName: string) => string;
  pdfSubtitleSuffix: string;
  birthDateMissing: string;
  rowGender: string;
  rowBirthDate: string;
  rowNameLength: string;
  rowIssuedAt: string;
  nameLengthValue: (count: number) => string;
  rowYearPillar: string;
  rowMonthPillar: string;
  rowDayPillar: string;
  rowHourPillar: string;
  rowDayMaster: string;
  rowFiveElements: string;
  rowUsefulGod: string;
  rowUnfavorableGod: string;
  rowRecommendedElements: string;
  rowAvoidElements: string;
  rowDesiredType: string;
  rowPreference: string;
  rowDesiredSyllables: string;
  rowRequiredSyllables: string;
  rowBlockedSyllables: string;
  rowMemo: string;
  nameMissing: string;
  pillElements: string;
  pillSound: string;
  pillSuri: string;
  backToStudio: string;
  waitingBody: string;
  brandLine: string;
  coverBody: string;
  hourUnknownNote: string;
  finalPickLabel: string;
  cardsHeading: string;
  cardsSub: string;
  sajuHeading: string;
  requestHeading: string;
  preThoughtCandidates: string;
  promptHeading: string;
  promptSub: string;
  promptBody: string;
  /** {date} 자리에 발급일이 들어간다. */
  disclaimer: (generatedAt: string) => string;
};

const RESULT_KO: NamingResultCopy = {
  chapterTitles: [
    "작명가의 총평",
    "사주 풀이와 용신 검증",
    "이 아이의 작명 원칙",
    "이름 후보 상세",
    "세 이름을 나란히 놓고",
    "최종 추천",
    "피해야 할 이름",
    "이름을 올리기 전에",
  ],
  chapterTitleKeywords: /작명가의 총평|사주 풀이|작명 원칙|이름 후보 상세|나란히 놓고|최종 추천|피해야 할 이름|올리기 전에/,
  genderM: "남성",
  genderF: "여성",
  genderOther: "기타/미지정",
  waitSteps: ["사주 명식을 세우는 중", "용신과 희신을 검증하는 중", "소리와 한자를 고르는 중", "작명첩을 엮는 중"],
  notEntered: "미입력",
  solar: "양력",
  lunar: "음력",
  leapSuffix: " · 윤달",
  errLinkMissing: "결과 링크를 확인하지 못했습니다.",
  errDelayed: "작명 결과 생성이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.",
  errGenerateFailed: "작명 결과 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  errLoadFailed: "작명 결과를 불러오지 못했습니다.",
  errPdfFailed: "작명 결과를 PDF로 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  pdfSave: "PDF로 소장하기",
  pdfMaking: "작명첩을 정리하는 중입니다",
  openingSaved: "저장된 작명첩을 펼치고 있습니다…",
  headingGenerateFailed: "작명 결과 생성에 실패했습니다",
  headingCannotOpen: "결과를 열 수 없습니다",
  retry: "다시 시도",
  copyPrompt: "프롬프트 복사",
  copied: "복사되었습니다",
  aiGenerated: "AI 생성",
  deckLabel: "작명첩 본문",
  chapterFallback: (index) => `${index}장`,
  pdfTitle: (familyName) => `${familyName}씨 아이의 작명첩`,
  pdfSubtitleSuffix: " 생 · 사주 맞춤 작명",
  birthDateMissing: "생년월일 미입력",
  rowGender: "성별",
  rowBirthDate: "생년월일",
  rowNameLength: "이름 글자 수",
  rowIssuedAt: "발급일",
  nameLengthValue: (count) => `성 제외 ${count}자`,
  rowYearPillar: "년주",
  rowMonthPillar: "월주",
  rowDayPillar: "일주",
  rowHourPillar: "시주",
  rowDayMaster: "일간",
  rowFiveElements: "오행 분포",
  rowUsefulGod: "용신 후보",
  rowUnfavorableGod: "기신 후보",
  rowRecommendedElements: "이름에 담으면 좋은 오행",
  rowAvoidElements: "피하면 좋은 오행",
  rowDesiredType: "원하는 방향",
  rowPreference: "분위기·이미지",
  rowDesiredSyllables: "사용하고 싶은 음절",
  rowRequiredSyllables: "반드시 넣고 싶은 글자",
  rowBlockedSyllables: "피하고 싶은 글자",
  rowMemo: "기타 요청",
  nameMissing: "한글 미입력",
  pillElements: "보완오행",
  pillSound: "소리",
  pillSuri: "수리",
  backToStudio: "작명소로 돌아가기",
  waitingBody: "사주와 성명학 원리를 함께 살펴 이름을 짓는 동안 이 창을 열어 두세요. 완성되면 이 자리에서 바로 펼쳐집니다.",
  brandLine: "훈민정음 작명소 · 사주 맞춤 작명첩",
  coverBody: "사주에서 검증한 용신과 희신을 바탕으로 소리오행·수리오행·자원오행을 함께 짚어, 이 아이에게 가장 어울리는 이름을 지었습니다.",
  hourUnknownNote: "출생시간 미상으로 시주(時柱)는 확정하지 않고, 년·월·일주를 중심으로 용신을 판단해 작명에 반영했습니다.",
  finalPickLabel: "작명가의 최종 추천",
  cardsHeading: "함께 살펴본 이름들",
  cardsSub: "각 이름의 결이 어떻게 다른지는 아래 작명첩 본문에서 자세히 풀었습니다.",
  sajuHeading: "이름의 근거가 된 사주",
  requestHeading: "부모님이 청한 조건",
  preThoughtCandidates: "미리 생각해 온 후보",
  promptHeading: "이 작명첩을 만든 프롬프트",
  promptSub: "결과와 함께 원문 그대로 드립니다",
  promptBody: "이 작명첩은 아래 프롬프트로 만들어졌습니다. 사주 계산 결과와 작명 원칙이 모두 담겨 있어, 다른 AI에 붙여넣으면 같은 기준으로 분석을 재현하거나 조건을 바꿔 변형해 볼 수 있습니다.",
  disclaimer: (generatedAt) =>
    `이 작명첩은 사주명리와 성명학 이론에 근거한 참고 자료입니다. 출생신고·개명 전에는 대법원 인명용 한자 여부와 가족관계등록부 표기를 반드시 직접 확인해 주세요. — Code Destiny 훈민정음 작명소 · ${generatedAt}`,
};

const RESULT_EN: NamingResultCopy = {
  chapterTitles: [
    "The namer's overall reading",
    "Your chart, and the favourable element verified",
    "The naming principles for this child",
    "The candidate names in detail",
    "Three names side by side",
    "The final recommendation",
    "Names to avoid",
    "Before you register the name",
  ],
  chapterTitleKeywords: /overall reading|favou?rable element|naming principles|candidate names|side by side|final recommendation|names to avoid|before you register/i,
  genderM: "Male",
  genderF: "Female",
  genderOther: "Other / unspecified",
  waitSteps: [
    "Casting the chart",
    "Verifying the favourable and supporting elements",
    "Choosing the sounds and characters",
    "Binding the naming booklet",
  ],
  notEntered: "Not entered",
  solar: "Solar",
  lunar: "Lunar",
  leapSuffix: " · leap month",
  errLinkMissing: "We couldn't verify the result link.",
  errDelayed: "The naming result is taking longer than expected. Please try again in a moment.",
  errGenerateFailed: "We couldn't generate the naming result. Please try again in a moment.",
  errLoadFailed: "We couldn't load the naming result.",
  errPdfFailed: "We couldn't save the naming result as a PDF. Please try again in a moment.",
  pdfSave: "Keep it as a PDF",
  pdfMaking: "Putting the booklet together",
  openingSaved: "Opening your saved booklet…",
  headingGenerateFailed: "We couldn't generate the naming result",
  headingCannotOpen: "We can't open the result",
  retry: "Try again",
  copyPrompt: "Copy the prompt",
  copied: "Copied",
  aiGenerated: "AI generated",
  deckLabel: "Booklet text",
  chapterFallback: (index) => `Chapter ${index}`,
  pdfTitle: (familyName) => `A naming booklet for the ${familyName} family`,
  pdfSubtitleSuffix: " · a name matched to the chart",
  birthDateMissing: "Date of birth not entered",
  rowGender: "Sex",
  rowBirthDate: "Date of birth",
  rowNameLength: "Name length",
  rowIssuedAt: "Issued",
  nameLengthValue: (count) => `${count} characters, family name excluded`,
  rowYearPillar: "Year pillar",
  rowMonthPillar: "Month pillar",
  rowDayPillar: "Day pillar",
  rowHourPillar: "Hour pillar",
  rowDayMaster: "Day master",
  rowFiveElements: "Five-element balance",
  rowUsefulGod: "Favourable element",
  rowUnfavorableGod: "Adverse element",
  rowRecommendedElements: "Elements the name should carry",
  rowAvoidElements: "Elements the name should avoid",
  rowDesiredType: "Direction you want",
  rowPreference: "Mood and image",
  rowDesiredSyllables: "Syllables you'd like to use",
  rowRequiredSyllables: "Characters that must appear",
  rowBlockedSyllables: "Characters to avoid",
  rowMemo: "Other requests",
  nameMissing: "Name not entered",
  pillElements: "Elements",
  pillSound: "Sound",
  pillSuri: "Numerology",
  backToStudio: "Back to the naming house",
  waitingBody: "Keep this window open while we read the chart and the naming principles together. It will open right here the moment it is done.",
  brandLine: "Hunminjeongeum Naming House · a booklet matched to the chart",
  coverBody: "Working from the favourable and supporting elements verified in the chart, we weighed sound, numerology and character meaning together to arrive at the name that suits this child best.",
  hourUnknownNote: "The birth time was unknown, so the hour pillar was left unfixed; the favourable element was judged from the year, month and day pillars and applied to the naming.",
  finalPickLabel: "The namer's final recommendation",
  cardsHeading: "The other names we weighed",
  cardsSub: "How each name differs in grain is unpacked in the booklet below.",
  sajuHeading: "The chart the name rests on",
  requestHeading: "What the parents asked for",
  preThoughtCandidates: "Names you had in mind",
  promptHeading: "The prompt that produced this booklet",
  promptSub: "Handed to you verbatim, along with the result",
  promptBody: "This booklet was produced from the prompt below. It carries the full chart calculation and the naming principles, so pasting it into another AI lets you reproduce the same reading or vary the conditions.",
  disclaimer: (generatedAt) =>
    `This booklet is reference material grounded in Saju and name-study theory. Before registering a birth or changing a name, please confirm the permitted characters and the official register entry yourself. — Code Destiny, Hunminjeongeum Naming House · ${generatedAt}`,
};

const RESULT_JA: NamingResultCopy = {
  chapterTitles: [
    "命名家の総評",
    "四柱の読み解きと用神の検証",
    "この子のための命名原則",
    "名前候補の詳細",
    "三つの名前を並べて",
    "最終のおすすめ",
    "避けたい名前",
    "名前を届け出る前に",
  ],
  chapterTitleKeywords: /命名家の総評|用神の検証|命名原則|名前候補の詳細|並べて|最終のおすすめ|避けたい名前|届け出る前に/,
  genderM: "男性",
  genderF: "女性",
  genderOther: "その他・未指定",
  waitSteps: ["命式を立てています", "用神と喜神を検証しています", "響きと漢字を選んでいます", "作名帖を編んでいます"],
  notEntered: "未入力",
  solar: "新暦",
  lunar: "旧暦",
  leapSuffix: " · 閏月",
  errLinkMissing: "結果リンクを確認できませんでした。",
  errDelayed: "命名結果の生成に時間がかかっています。しばらくしてからもう一度お試しください。",
  errGenerateFailed: "命名結果を生成できませんでした。しばらくしてからもう一度お試しください。",
  errLoadFailed: "命名結果を読み込めませんでした。",
  errPdfFailed: "命名結果をPDFとして保存できませんでした。しばらくしてからもう一度お試しください。",
  pdfSave: "PDFで保存する",
  pdfMaking: "作名帖を整えています",
  openingSaved: "保存された作名帖を開いています…",
  headingGenerateFailed: "命名結果を生成できませんでした",
  headingCannotOpen: "結果を開けません",
  retry: "もう一度試す",
  copyPrompt: "プロンプトをコピー",
  copied: "コピーしました",
  aiGenerated: "AI生成",
  deckLabel: "作名帖の本文",
  chapterFallback: (index) => `第${index}章`,
  pdfTitle: (familyName) => `${familyName}さんのお子さまの作名帖`,
  pdfSubtitleSuffix: " 生まれ · 四柱に合わせた命名",
  birthDateMissing: "生年月日 未入力",
  rowGender: "性別",
  rowBirthDate: "生年月日",
  rowNameLength: "名前の字数",
  rowIssuedAt: "発行日",
  nameLengthValue: (count) => `姓を除いて${count}字`,
  rowYearPillar: "年柱",
  rowMonthPillar: "月柱",
  rowDayPillar: "日柱",
  rowHourPillar: "時柱",
  rowDayMaster: "日干",
  rowFiveElements: "五行の分布",
  rowUsefulGod: "用神の候補",
  rowUnfavorableGod: "忌神の候補",
  rowRecommendedElements: "名前に入れたい五行",
  rowAvoidElements: "避けたい五行",
  rowDesiredType: "希望する方向",
  rowPreference: "雰囲気・イメージ",
  rowDesiredSyllables: "使いたい音",
  rowRequiredSyllables: "必ず入れたい字",
  rowBlockedSyllables: "避けたい字",
  rowMemo: "その他のご要望",
  nameMissing: "名前 未入力",
  pillElements: "補う五行",
  pillSound: "響き",
  pillSuri: "五格",
  backToStudio: "作名所に戻る",
  waitingBody: "四柱と姓名判断の原理をあわせて読みながら名前をお選びしています。この画面を開いたままお待ちください。仕上がり次第、ここにそのまま開きます。",
  brandLine: "訓民正音作名所 · 四柱に合わせた作名帖",
  coverBody: "四柱で検証した用神と喜神をもとに、響き・五格・字源五行をあわせて押さえ、このお子さまにいちばん似合う名前をお選びしました。",
  hourUnknownNote: "出生時刻が不明のため時柱は確定せず、年柱・月柱・日柱を中心に用神を判断して命名に反映しました。",
  finalPickLabel: "命名家の最終のおすすめ",
  cardsHeading: "あわせて検討した名前",
  cardsSub: "それぞれの名前の質感の違いは、下の作名帖の本文で詳しく解いています。",
  sajuHeading: "名前の根拠となった四柱",
  requestHeading: "ご両親が望まれた条件",
  preThoughtCandidates: "あらかじめ考えていた候補",
  promptHeading: "この作名帖をつくったプロンプト",
  promptSub: "結果とあわせて原文のままお渡しします",
  promptBody: "この作名帖は下のプロンプトから生まれました。四柱の計算結果と命名の原則がすべて入っているので、他のAIに貼り付ければ同じ基準で分析を再現したり、条件を変えて試したりできます。",
  disclaimer: (generatedAt) =>
    `この作名帖は四柱推命と姓名判断の理論にもとづく参考資料です。出生届・改名の前には、人名用漢字にあたるかどうかと戸籍の表記をご自身で必ずご確認ください。 — Code Destiny 訓民正音作名所 · ${generatedAt}`,
};

const RESULT_ZH_CN: NamingResultCopy = {
  chapterTitles: [
    "起名师总评",
    "八字解读与用神验证",
    "为这个孩子定的取名原则",
    "名字候选详解",
    "三个名字并排来看",
    "最终推荐",
    "该避开的名字",
    "上户口之前",
  ],
  chapterTitleKeywords: /起名师总评|用神验证|取名原则|名字候选详解|并排来看|最终推荐|该避开的名字|上户口之前/,
  genderM: "男",
  genderF: "女",
  genderOther: "其他／未指定",
  waitSteps: ["正在排八字命式", "正在验证用神与喜神", "正在挑选音律与用字", "正在编纂取名册"],
  notEntered: "未填写",
  solar: "阳历",
  lunar: "阴历",
  leapSuffix: " · 闰月",
  errLinkMissing: "无法确认结果链接。",
  errDelayed: "取名结果生成较慢，请稍后再试。",
  errGenerateFailed: "取名结果生成失败，请稍后再试。",
  errLoadFailed: "无法载入取名结果。",
  errPdfFailed: "无法将取名结果保存为 PDF，请稍后再试。",
  pdfSave: "保存为 PDF",
  pdfMaking: "正在整理取名册",
  openingSaved: "正在打开已保存的取名册…",
  headingGenerateFailed: "取名结果生成失败",
  headingCannotOpen: "无法打开结果",
  retry: "重试",
  copyPrompt: "复制提示词",
  copied: "已复制",
  aiGenerated: "AI 生成",
  deckLabel: "取名册正文",
  chapterFallback: (index) => `第 ${index} 章`,
  pdfTitle: (familyName) => `${familyName}家孩子的取名册`,
  pdfSubtitleSuffix: " 出生 · 依八字定制的名字",
  birthDateMissing: "未填写出生日期",
  rowGender: "性别",
  rowBirthDate: "出生日期",
  rowNameLength: "名字字数",
  rowIssuedAt: "出具日期",
  nameLengthValue: (count) => `不含姓 ${count} 字`,
  rowYearPillar: "年柱",
  rowMonthPillar: "月柱",
  rowDayPillar: "日柱",
  rowHourPillar: "时柱",
  rowDayMaster: "日干",
  rowFiveElements: "五行分布",
  rowUsefulGod: "用神候选",
  rowUnfavorableGod: "忌神候选",
  rowRecommendedElements: "名字宜补的五行",
  rowAvoidElements: "名字宜避的五行",
  rowDesiredType: "期望的方向",
  rowPreference: "氛围·意象",
  rowDesiredSyllables: "想使用的音",
  rowRequiredSyllables: "必须包含的字",
  rowBlockedSyllables: "想避开的字",
  rowMemo: "其他要求",
  nameMissing: "未填写名字",
  pillElements: "补益五行",
  pillSound: "音律",
  pillSuri: "五格",
  backToStudio: "返回起名所",
  waitingBody: "我们正一并对照八字与姓名学的原理为你选名，请让这个窗口开着。完成后会直接在这里展开。",
  brandLine: "训民正音起名所 · 依八字定制的取名册",
  coverBody: "以八字中验证过的用神与喜神为本，兼顾音律、五格与字义五行，为这个孩子挑出最相称的名字。",
  hourUnknownNote: "因出生时辰不详，时柱未予确定；用神以年柱·月柱·日柱为主判断，并据此反映到取名中。",
  finalPickLabel: "起名师的最终推荐",
  cardsHeading: "一并斟酌过的名字",
  cardsSub: "每个名字的质感有何不同，已在下方取名册正文中详述。",
  sajuHeading: "名字所依据的八字",
  requestHeading: "父母提出的条件",
  preThoughtCandidates: "事先想好的候选",
  promptHeading: "生成这本取名册的提示词",
  promptSub: "连同结果一并原文奉上",
  promptBody: "这本取名册由下面的提示词生成。其中包含完整的八字计算结果与取名原则，贴到其他 AI 上即可按同一标准复现分析，或更改条件加以变化。",
  disclaimer: (generatedAt) =>
    `本取名册是依八字命理与姓名学理论所作的参考资料。上户口或改名之前，请务必自行确认用字是否合乎规范以及户籍上的写法。 — Code Destiny 训民正音起名所 · ${generatedAt}`,
};

const RESULT_ZH_TW: NamingResultCopy = {
  chapterTitles: [
    "取名師總評",
    "八字解讀與用神驗證",
    "為這個孩子定的取名原則",
    "名字候選詳解",
    "三個名字並排來看",
    "最終推薦",
    "該避開的名字",
    "報戶口之前",
  ],
  chapterTitleKeywords: /取名師總評|用神驗證|取名原則|名字候選詳解|並排來看|最終推薦|該避開的名字|報戶口之前/,
  genderM: "男",
  genderF: "女",
  genderOther: "其他／未指定",
  waitSteps: ["正在排八字命式", "正在驗證用神與喜神", "正在挑選音律與用字", "正在編纂取名冊"],
  notEntered: "未填寫",
  solar: "陽曆",
  lunar: "陰曆",
  leapSuffix: " · 閏月",
  errLinkMissing: "無法確認結果連結。",
  errDelayed: "取名結果生成較慢，請稍後再試。",
  errGenerateFailed: "取名結果生成失敗，請稍後再試。",
  errLoadFailed: "無法載入取名結果。",
  errPdfFailed: "無法將取名結果儲存為 PDF，請稍後再試。",
  pdfSave: "儲存為 PDF",
  pdfMaking: "正在整理取名冊",
  openingSaved: "正在開啟已儲存的取名冊…",
  headingGenerateFailed: "取名結果生成失敗",
  headingCannotOpen: "無法開啟結果",
  retry: "重試",
  copyPrompt: "複製提示詞",
  copied: "已複製",
  aiGenerated: "AI 生成",
  deckLabel: "取名冊正文",
  chapterFallback: (index) => `第 ${index} 章`,
  pdfTitle: (familyName) => `${familyName}家孩子的取名冊`,
  pdfSubtitleSuffix: " 出生 · 依八字訂製的名字",
  birthDateMissing: "未填寫出生日期",
  rowGender: "性別",
  rowBirthDate: "出生日期",
  rowNameLength: "名字字數",
  rowIssuedAt: "出具日期",
  nameLengthValue: (count) => `不含姓 ${count} 字`,
  rowYearPillar: "年柱",
  rowMonthPillar: "月柱",
  rowDayPillar: "日柱",
  rowHourPillar: "時柱",
  rowDayMaster: "日干",
  rowFiveElements: "五行分布",
  rowUsefulGod: "用神候選",
  rowUnfavorableGod: "忌神候選",
  rowRecommendedElements: "名字宜補的五行",
  rowAvoidElements: "名字宜避的五行",
  rowDesiredType: "期望的方向",
  rowPreference: "氛圍·意象",
  rowDesiredSyllables: "想使用的音",
  rowRequiredSyllables: "必須包含的字",
  rowBlockedSyllables: "想避開的字",
  rowMemo: "其他要求",
  nameMissing: "未填寫名字",
  pillElements: "補益五行",
  pillSound: "音律",
  pillSuri: "五格",
  backToStudio: "返回取名所",
  waitingBody: "我們正一併對照八字與姓名學的原理為你選名，請讓這個視窗開著。完成後會直接在這裡展開。",
  brandLine: "訓民正音取名所 · 依八字訂製的取名冊",
  coverBody: "以八字中驗證過的用神與喜神為本，兼顧音律、五格與字義五行，為這個孩子挑出最相稱的名字。",
  hourUnknownNote: "因出生時辰不詳，時柱未予確定；用神以年柱·月柱·日柱為主判斷，並據此反映到取名中。",
  finalPickLabel: "取名師的最終推薦",
  cardsHeading: "一併斟酌過的名字",
  cardsSub: "每個名字的質感有何不同，已在下方取名冊正文中詳述。",
  sajuHeading: "名字所依據的八字",
  requestHeading: "父母提出的條件",
  preThoughtCandidates: "事先想好的候選",
  promptHeading: "生成這本取名冊的提示詞",
  promptSub: "連同結果一併原文奉上",
  promptBody: "這本取名冊由下面的提示詞生成。其中包含完整的八字計算結果與取名原則，貼到其他 AI 上即可按同一標準重現分析，或更改條件加以變化。",
  disclaimer: (generatedAt) =>
    `本取名冊是依八字命理與姓名學理論所作的參考資料。報戶口或改名之前，請務必自行確認用字是否合乎規範以及戶籍上的寫法。 — Code Destiny 訓民正音取名所 · ${generatedAt}`,
};

/** 🔴 ko·en·ja·zh-CN·zh-TW 만 채운다. 나머지 일곱 개는 영어로 폴백(사용자 결정, 2026-08-25). */
const NAMING_RESULT_COPY: Partial<Record<LoadingLocale, NamingResultCopy>> = {
  ko: RESULT_KO,
  en: RESULT_EN,
  ja: RESULT_JA,
  "zh-CN": RESULT_ZH_CN,
  "zh-TW": RESULT_ZH_TW,
};

export function getNamingResultCopy(locale: LoadingLocale): NamingResultCopy {
  return NAMING_RESULT_COPY[locale] || RESULT_EN;
}

/** 렌더 시점의 로케일을 그대로 읽는다 — 이 화면은 언어 전환 위젯이 없어 구독까지는 필요 없다. */
export function currentNamingResultCopy(): NamingResultCopy {
  return getNamingResultCopy(getCurrentLoadingLocale());
}

export { RESULT_EN as NAMING_RESULT_COPY_EN, RESULT_KO as NAMING_RESULT_COPY_KO, NAMING_RESULT_COPY };
