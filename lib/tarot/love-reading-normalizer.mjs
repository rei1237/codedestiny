const LOVE_READING_NORMALIZER_TEXT_TRANSLATIONS = {
  ko: {
    positionLabels: [
      "내가 바라보는 상대",
      "상대가 관계 전체를 보는 시각",
      "상대가 나를 바라보는 마음",
      "상대의 연애 의지와 열망",
      "관계를 가로막는 핵심 요인",
      "가까운 흐름과 선택 기준",
    ],
    positionLens: [
      { key: "self_view_of_other", title: "내가 바라보는 상대", detailFocus: "내가 상대에게 덧씌운 기대와 두려움, 투사 구조", adviceFocus: "확인 강요보다 해석 근거 정리" },
      { key: "other_view_of_relationship", title: "상대가 관계 전체를 보는 시각", detailFocus: "상대가 관계의 이름과 속도를 정의하는 방식", adviceFocus: "관계 이름보다 속도 합의" },
      { key: "other_feeling_toward_me", title: "상대가 나를 바라보는 마음", detailFocus: "상대가 나에게 느끼는 끌림·경계·혼란의 실제 온도", adviceFocus: "감정 추궁보다 오해 축소 대화" },
      { key: "other_romantic_will", title: "상대의 연애 의지와 열망", detailFocus: "상대의 마음이 실행 의지로 이동하는지 여부", adviceFocus: "감정 설득보다 실행 조건 정리" },
      { key: "core_block", title: "관계를 가로막는 핵심 요인", detailFocus: "오해/속도/타이밍/현실 변수의 병목", adviceFocus: "병목 신호 제거" },
      { key: "short_term_outcome", title: "가까운 흐름과 선택 기준", detailFocus: "가까운 흐름에서 드러날 관계 온도와 선택 기준", adviceFocus: "7일 안에 지킬 기준선 설정" },
    ],
    orientation: { upright: "정방향", reversed: "역방향" },
    unnamedCard: "이름이 확인되지 않은 카드",
    cardFallback: (order) => `${order}번 카드`,
    title: "우리 사이 타로",
    summary: "6장의 배열에는 내가 본 상대, 상대가 바라본 관계, 숨은 감정, 연애 의지, 막힌 매듭, 가까운 미래의 온도가 차례로 드러납니다.",
  },
  en: {
    positionLabels: [
      "How I See Them",
      "How They See the Relationship",
      "How They Feel About Me",
      "Their Willingness to Love",
      "The Core Block Between Us",
      "Near-Term Flow and Choice",
    ],
    positionLens: [
      { key: "self_view_of_other", title: "How I See Them", detailFocus: "the hopes, fears, and projections I place on them", adviceFocus: "separate what is confirmed from what is imagined" },
      { key: "other_view_of_relationship", title: "How They See the Relationship", detailFocus: "how they define the relationship's name and pace", adviceFocus: "align on pace before asking for a label" },
      { key: "other_feeling_toward_me", title: "How They Feel About Me", detailFocus: "the real warmth, caution, and confusion in their feelings", adviceFocus: "reduce misunderstanding before pressing for answers" },
      { key: "other_romantic_will", title: "Their Willingness to Love", detailFocus: "whether feeling can move into action", adviceFocus: "watch repeated choices more than sweet words" },
      { key: "core_block", title: "The Core Block Between Us", detailFocus: "the timing, pride, history, or circumstance that slows the bond", adviceFocus: "soften the block instead of forcing a verdict" },
      { key: "short_term_outcome", title: "Near-Term Flow and Choice", detailFocus: "the relationship temperature likely to form in the near future", adviceFocus: "keep one clear boundary for the next seven days" },
    ],
    orientation: { upright: "upright", reversed: "reversed" },
    unnamedCard: "Unnamed card",
    cardFallback: (order) => `card ${order}`,
    title: "Relationship Tarot",
    summary: "The six cards unfold how you see them, how they see the bond, the hidden feeling, the will to act, the knot between you, and the temperature of the near future.",
  },
  ja: {
    positionLabels: [
      "私が相手をどう見ているか",
      "相手が関係全体をどう見ているか",
      "相手が私に向ける気持ち",
      "相手の恋愛への意思",
      "二人を止めている核心",
      "近い流れと選択の目安",
    ],
    positionLens: [
      { key: "self_view_of_other", title: "私が相手をどう見ているか", detailFocus: "相手に重ねている期待、不安、投影の構造", adviceFocus: "確かめた事実と想像を分けて見る" },
      { key: "other_view_of_relationship", title: "相手が関係全体をどう見ているか", detailFocus: "相手がこの関係の名前と速度を定める方法", adviceFocus: "関係の名前より先に速度を合わせる" },
      { key: "other_feeling_toward_me", title: "相手が私に向ける気持ち", detailFocus: "相手の中にある惹かれ、警戒、迷いの温度", adviceFocus: "問い詰める前に誤解を小さくする" },
      { key: "other_romantic_will", title: "相手の恋愛への意思", detailFocus: "気持ちが行動へ移る力があるか", adviceFocus: "甘い言葉より繰り返される選択を見る" },
      { key: "core_block", title: "二人を止めている核心", detailFocus: "関係を遅らせるタイミング、プライド、過去、現実事情", adviceFocus: "結論を迫らず結び目を緩める" },
      { key: "short_term_outcome", title: "近い流れと選択の目安", detailFocus: "近い未来に形づくられる関係の温度", adviceFocus: "7日間守る基準線を一つ決める" },
    ],
    orientation: { upright: "正位置", reversed: "逆位置" },
    unnamedCard: "名前未確認のカード",
    cardFallback: (order) => `${order}番カード`,
    title: "二人の関係タロット",
    summary: "6枚のカードは、私が見ている相手、相手が見ている関係、隠れた気持ち、恋愛への意思、二人を止める結び目、近い未来の温度を順に映します。",
  },
};

LOVE_READING_NORMALIZER_TEXT_TRANSLATIONS["zh-CN"] = LOVE_READING_NORMALIZER_TEXT_TRANSLATIONS.en;
LOVE_READING_NORMALIZER_TEXT_TRANSLATIONS["zh-TW"] = LOVE_READING_NORMALIZER_TEXT_TRANSLATIONS.en;

const REL_POSITION_LABELS = LOVE_READING_NORMALIZER_TEXT_TRANSLATIONS.ko.positionLabels;
const POSITION_LENS = LOVE_READING_NORMALIZER_TEXT_TRANSLATIONS.ko.positionLens;

function normalizeLoveReadingLocale(locale) {
  const value = String(locale || "").trim().replace("_", "-").toLowerCase();
  if (value === "ja" || value.startsWith("ja-")) return "ja";
  if (value === "zh" || value === "zh-cn" || value === "zh-hans") return "zh-CN";
  if (value === "zh-tw" || value === "zh-hant" || value === "zh-hk") return "zh-TW";
  if (value === "en" || value.startsWith("en-")) return "en";
  return "ko";
}

function loveReadingCopy(locale) {
  const lang = normalizeLoveReadingLocale(locale);
  return LOVE_READING_NORMALIZER_TEXT_TRANSLATIONS[lang] || LOVE_READING_NORMALIZER_TEXT_TRANSLATIONS.ko;
}

function lovePositionLens(idx, locale) {
  const copy = loveReadingCopy(locale);
  return copy.positionLens[idx] || copy.positionLens[copy.positionLens.length - 1] || POSITION_LENS[idx] || POSITION_LENS[POSITION_LENS.length - 1];
}

const POSITION_COPY = [
  {
    detail(row, { prev, next, suitLine, orientLine }) {
      return `${row.cardName} ${row.orientationLabel}은 내가 상대를 바라볼 때 마음속에서 먼저 켜지는 장면을 드러냅니다. ${suitLine}의 기운 때문에 한 번의 미소, 답장 간격, 말끝의 온도에 기대가 얹히기 쉽습니다. ${orientLine} 흐름이 함께 있으니 지금은 상대의 진심을 단정하기보다, 내가 어떤 부분에 끌리고 어떤 부분을 두려워하는지 먼저 가려 보아야 합니다. ${prev ? `앞선 ${prev.cardName}의 잔상은 이 시선에 오래 머무는 감정을 남깁니다.` : "이 첫 자리는 관계의 문을 여는 내 마음의 거울입니다."} ${next ? `다음 ${next.cardName}로 넘어가며 이 기대가 상대의 관계 인식과 부딪히는 지점이 드러납니다.` : ""}`;
    },
    insight(row, { suitLine }) {
      return `${row.positionTitle}에서 ${row.cardName} 카드는 사랑의 가능성보다 내가 이미 마음속에 그려 둔 상대의 모습, 그리고 ${suitLine}이 만든 기대의 색을 먼저 드러냅니다.`;
    },
    advice(row) {
      return `${row.cardName} ${row.orientationLabel}이 건네는 조언은 오늘 상대의 모든 반응에 의미를 붙이지 말라는 것입니다. 설렘이 올라와도 바로 결론으로 달려가지 말고, 내가 확인한 사실과 내가 바라는 상상을 조용히 분리해 보세요.`;
    },
    caution(row) {
      return `${row.cardName} ${row.orientationLabel}의 그림자는 내 마음이 먼저 답을 정해 버리는 순간에 커집니다. 하루의 답장 속도나 짧은 표정 하나로 ${row.positionTitle} 전체를 판결하면 관계의 실제 온도를 놓칠 수 있습니다.`;
    },
  },
  {
    detail(row, { prev, next, suitLine, orientLine }) {
      return `${row.cardName} ${row.orientationLabel}은 상대가 이 관계에 어떤 이름을 붙이려 하는지 드러냅니다. ${suitLine}의 결은 상대가 끌림을 느껴도 바로 약속이나 정의로 옮기지 않을 수 있음을 가리킵니다. ${orientLine} 기운이 섞여 있어 상대의 기준은 내 기대보다 느리거나 조심스러울 수 있습니다. ${prev ? `1번 ${prev.cardName}에서 생긴 내 시선과 비교하면, 여기서는 상대가 관계를 안전하게 다루려는 방식이 더 선명합니다.` : ""} ${next ? `다음 ${next.cardName}은 그 정의 뒤에 숨어 있는 실제 감정의 온도를 열어 줍니다.` : ""}`;
    },
    insight(row, { suitLine }) {
      return `${row.positionTitle}에서 ${row.cardName} 카드는 관계의 이름, 거리, 속도를 정하는 상대의 방식을 드러냅니다. ${suitLine}은 마음보다 기준이 먼저 움직일 수 있음을 암시합니다.`;
    },
    advice(row) {
      return `${row.cardName} ${row.orientationLabel}의 조언은 관계 이름을 서두르기보다 서로 편한 속도를 묻는 것입니다. "우리 지금 어떤 속도가 편할까?"처럼 가볍고 열린 질문이 긴장보다 진심을 더 잘 불러옵니다.`;
    },
    caution(row) {
      return `${row.cardName} ${row.orientationLabel}의 주의점은 이름을 요구하는 순간 상대가 방어적으로 물러날 수 있다는 것입니다. ${row.positionTitle}에서는 확답보다 상대가 반복해서 지키는 태도를 먼저 보아야 합니다.`;
    },
  },
  {
    detail(row, { prev, next, suitLine, orientLine }) {
      return `${row.cardName} ${row.orientationLabel}은 상대가 나에게 실제로 느끼는 감정의 온도를 드러냅니다. 여기서 중요한 것은 관계의 이름이 아니라 마음이 먼저 반응하는 방식입니다. ${suitLine}의 기운은 끌림, 호기심, 조심스러움이 한데 섞여 흐를 수 있음을 가리킵니다. ${orientLine} 흐름이 있으니 상대의 침묵이 곧 무관심은 아닐 수 있고, 다정한 말이 곧 확정도 아닐 수 있습니다. ${prev ? `앞의 ${prev.cardName}이 관계의 틀을 말했다면, 이 카드는 그 틀 안에서 실제 감정이 얼마나 따뜻한지 알려 줍니다.` : ""} ${next ? `다음 ${next.cardName}은 이 감정이 행동 의지로 이어질 수 있는지를 묻습니다.` : ""}`;
    },
    insight(row, { suitLine }) {
      return `${row.positionTitle}에서 ${row.cardName} 카드는 감정의 세기와 질감을 드러냅니다. ${suitLine}은 상대 마음이 완전히 닫힌 것보다 아직 말로 정리되지 않은 떨림에 가깝다고 속삭입니다.`;
    },
    advice(row) {
      return `${row.cardName} ${row.orientationLabel}이 전하는 조언은 감정을 캐묻지 말고 감정이 안전하게 드러날 틈을 주라는 것입니다. 짧은 다정함, 과하지 않은 관심, 부담 없는 확인이 지금은 더 깊게 닿습니다.`;
    },
    caution(row) {
      return `${row.cardName} ${row.orientationLabel}의 그림자는 상대의 감정을 내 불안으로 번역하는 데 있습니다. ${row.positionTitle}에서는 묻고 또 묻기보다, 상대가 편안할 때 자연스럽게 드러내는 온도를 믿어야 합니다.`;
    },
  },
  {
    detail(row, { prev, next, suitLine, orientLine }) {
      return `${row.cardName} ${row.orientationLabel}은 상대의 감정이 실제 행동 의지로 옮겨질 수 있는지를 드러냅니다. 이 자리는 마음의 고백보다 연락을 이어 가는 힘, 시간을 내는 태도, 작은 약속을 지키는 움직임을 봅니다. ${suitLine}의 흐름은 의지가 있어도 방식이 서툴거나 타이밍을 재고 있을 가능성을 남깁니다. ${orientLine} 기운 때문에 말과 행동 사이에 간격이 생길 수 있으니, 한마디의 달콤함보다 반복되는 선택을 살펴야 합니다. ${prev ? `3번 ${prev.cardName}의 감정 온도와 비교하면, 이 카드는 그 마음이 현실의 발걸음으로 내려오는지를 시험합니다.` : ""} ${next ? `다음 ${next.cardName}은 그 의지를 가로막는 실제 매듭을 드러냅니다.` : ""}`;
    },
    insight(row, { suitLine }) {
      return `${row.positionTitle}에서 ${row.cardName} 카드는 의지와 실행력의 카드입니다. ${suitLine}은 상대가 느끼는 마음이 어떤 행동, 약속, 시간 배분으로 옮겨질지 묻습니다.`;
    },
    advice(row) {
      return `${row.cardName} ${row.orientationLabel}의 조언은 큰 고백보다 작은 행동 제안을 확인하는 것입니다. 짧은 만남, 분명한 약속, 다시 연락하겠다는 말이 실제로 지켜지는지를 차분히 보세요.`;
    },
    caution(row) {
      return `${row.cardName} ${row.orientationLabel}의 주의점은 말만 믿거나 반대로 행동만 재촉하는 극단입니다. ${row.positionTitle}에서는 상대가 움직일 수 있는 현실 조건을 함께 보아야 합니다.`;
    },
  },
  {
    detail(row, { prev, next, suitLine, orientLine }) {
      return `${row.cardName} ${row.orientationLabel}은 두 사람 사이를 가로막는 매듭을 드러냅니다. 이 매듭은 마음 부족만이 아니라 타이밍, 자존심, 과거의 기억, 주변 상황처럼 말로 꺼내기 어려운 현실일 수 있습니다. ${suitLine}의 신호는 병목이 어디에서 반복되는지 알려 주고, ${orientLine} 흐름은 그 매듭을 서두르면 더 단단해질 수 있음을 가리킵니다. ${prev ? `앞의 ${prev.cardName}에서 보인 행동 의지가 이 자리에서 잠시 멈칫하는 이유가 드러납니다.` : ""} ${next ? `다음 ${next.cardName}은 이 매듭을 그대로 둘 때 가까운 미래가 어떤 모양으로 굳어지는지 드러냅니다.` : ""}`;
    },
    insight(row, { suitLine }) {
      return `${row.positionTitle}에서 ${row.cardName} 카드는 관계를 늦추는 현실의 매듭입니다. ${suitLine}은 감정보다 구조, 타이밍, 부담의 문제가 더 크게 작동할 수 있음을 드러냅니다.`;
    },
    advice(row) {
      return `${row.cardName} ${row.orientationLabel}의 조언은 원인을 캐내려 몰아붙이지 말고 부담을 줄이는 조건부터 정리하라는 것입니다. 연락 빈도, 만나는 방식, 기대 수준을 낮추면 막힌 흐름이 조금씩 풀립니다.`;
    },
    caution(row) {
      return `${row.cardName} ${row.orientationLabel}의 그림자는 문제를 당장 끝장내려는 조급함입니다. ${row.positionTitle}에서는 숨은 매듭을 공격하면 관계가 닫히고, 조용히 느슨하게 만들면 대화가 열립니다.`;
    },
  },
  {
    detail(row, { prev, next, suitLine, orientLine }) {
      return `${row.cardName} ${row.orientationLabel}은 가까운 미래에 이 관계가 어떤 온도로 굳어질지 드러냅니다. 이것은 영원한 결론이 아니라 지금의 말투, 거리, 선택이 2~6주 안에 만들 수 있는 장면입니다. ${suitLine}의 결은 앞으로 남을 감정의 형태를 알려 주고, ${orientLine} 흐름은 서두르지 않을 때 오히려 더 분명해지는 신호가 있음을 가리킵니다. ${prev ? `5번 ${prev.cardName}의 병목을 어떻게 다루느냐에 따라 이 카드의 미래는 더 부드럽게 바뀔 수 있습니다.` : ""} ${next ? `이어지는 ${next.cardName}의 기운도 함께 살펴야 합니다.` : "마지막 자리로서 전체 배열의 숨결을 하나의 관계 장면으로 모읍니다."}`;
    },
    insight(row, { suitLine }) {
      return `${row.positionTitle}에서 ${row.cardName} 카드는 지금의 흐름이 가까운 미래에 남길 인상입니다. ${suitLine}은 관계가 완전히 닫히기보다 어떤 형태로 기억되고 이어질지를 드러냅니다.`;
    },
    advice(row) {
      return `${row.cardName} ${row.orientationLabel}의 조언은 앞으로 7일 동안 결론을 밀어붙이지 말고 내 태도의 결을 일정하게 유지하라는 것입니다. 다정함은 작게, 기준은 분명하게, 해석은 천천히 두세요.`;
    },
    caution(row) {
      return `${row.cardName} ${row.orientationLabel}의 주의점은 이 결과를 운명처럼 굳혀 버리는 태도입니다. ${row.positionTitle}은 예언이 아니라 현재 선택이 만드는 가능성이므로, 오늘의 말 한마디가 미래의 온도를 바꿀 수 있습니다.`;
    },
  },
];

const FORBIDDEN_MIXED_PHRASES = [/자존감/g, /작은\s*실천/g, /오늘\s*가능한\s*실행\s*단위/g, /힐링/g, /꿈\s*타로/g];

function asText(value) {
  return String(value || "").trim();
}

function cleanText(text) {
  let out = asText(text).replace(/\s{2,}/g, " ");
  FORBIDDEN_MIXED_PHRASES.forEach((pattern) => {
    out = out.replace(pattern, "");
  });
  return out.replace(/\s{2,}/g, " ").trim();
}

function parseCardMeta(card, idx, locale = "ko") {
  const code = asText(card?.cardId || card?.cardCode || card?.id).toUpperCase();
  const suitCode = code.slice(0, 1);
  const rankNumber = Number(code.slice(1));
  const isMajor = suitCode === "M";
  const suit = isMajor
    ? "major"
    : ({ C: "cups", W: "wands", S: "swords", P: "pentacles" }[suitCode] || "minor");
  const rank = isMajor
    ? "Major"
    : ({
      1: "Ace",
      2: "Two",
      3: "Three",
      4: "Four",
      5: "Five",
      6: "Six",
      7: "Seven",
      8: "Eight",
      9: "Nine",
      10: "Ten",
      11: "Page",
      12: "Knight",
      13: "Queen",
      14: "King",
    }[rankNumber] || "Unknown");
  const orientation = asText(card?.orientation).toLowerCase() === "reversed" ? "reversed" : "upright";
  const copy = loveReadingCopy(locale);
  const orientationLabel = orientation === "reversed" ? copy.orientation.reversed : copy.orientation.upright;
  const isCourt = !isMajor && rankNumber >= 11 && rankNumber <= 14;
  const lens = lovePositionLens(idx, locale);

  const nameKo = asText(card?.nameKo || card?.nameKr || card?.cardName || card?.name);
  const nameEn = asText(card?.nameEn);
  const cardName = normalizeLoveReadingLocale(locale) === "ko" ? (nameKo || nameEn) : (nameEn || nameKo);

  return {
    positionOrder: idx + 1,
    positionKey: lens.key,
    positionTitle: lens.title,
    cardName: cardName || copy.unnamedCard,
    cardNameEn: nameEn,
    cardId: code,
    suit,
    rank,
    isMajor,
    isCourt,
    orientation,
    orientationLabel,
    lens,
    keywords: Array.isArray(card?.keywords)
      ? card.keywords.map((k) => asText(k)).filter(Boolean).slice(0, 6)
      : [],
  };
}

function tokenize(text) {
  return cleanText(text)
    .toLowerCase()
    .replace(/[“”"'`.,!?;:()\[\]{}]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

function similarity(a, b) {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  ta.forEach((token) => {
    if (tb.has(token)) inter += 1;
  });
  return inter / new Set([...ta, ...tb]).size;
}

function suitCue(suit) {
  if (suit === "cups") return "감정과 정서 교류";
  if (suit === "wands") return "끌림, 속도, 추진력";
  if (suit === "swords") return "판단, 말, 오해 관리";
  if (suit === "pentacles") return "현실, 책임, 안정성";
  return "관계 구조의 전환";
}

function orientationCue(orientation) {
  return orientation === "reversed"
    ? "지연, 왜곡, 회피, 내면화"
    : "직접적 표현, 가시적 실행, 빠른 반응";
}

function buildLocalizedLoveFallback(field, row, idx, cards, locale) {
  const lang = normalizeLoveReadingLocale(locale);
  if (lang === "ko") return "";
  const safeCards = Array.isArray(cards) ? cards : [];
  const copy = loveReadingCopy(lang);
  const lens = row?.lens || lovePositionLens(idx, lang);
  const prev = idx > 0 ? parseCardMeta(safeCards[idx - 1], idx - 1, lang) : null;
  const next = idx < safeCards.length - 1 ? parseCardMeta(safeCards[idx + 1], idx + 1, lang) : null;
  const cardName = row.cardNameEn || row.cardName || copy.cardFallback(idx + 1);
  const orientation = row.orientationLabel || copy.orientation.upright;

  if (lang === "ja") {
    if (field === "headline") return `${cardName} ${orientation} が「${row.positionTitle}」に置かれ、${lens.detailFocus}が静かに浮かび上がります。`;
    if (field === "summary") return `${row.positionTitle}では、${cardName} ${orientation} が二人の間に流れる気持ちの温度と、まだ言葉になっていない迷いを映します。`;
    if (field === "detail") return `${cardName} ${orientation} は、この関係を急いで決めつけるより、相手の反応がどの速度で繰り返されるかを見てほしいと告げています。${prev ? `前の ${prev.cardNameEn || prev.cardName} の余韻がここに重なり、` : ""}${next ? `次の ${next.cardNameEn || next.cardName} へ進むほど、` : ""}期待と現実の距離が少しずつ整理されます。今は強い答えを迫るより、安心して本音が出る余白を作ることが大切です。`;
    if (field === "relationshipInsight") return `${row.positionTitle}の ${cardName} は、関係の可能性を一つに固定せず、相手の心と行動の速度差を丁寧に見るよう促しています。`;
    if (field === "advice") return `${cardName} ${orientation} の助言は、答えを急がず、今日できる小さな確認だけを残すことです。優しさは短く、基準は静かに保ってください。`;
    if (field === "caution") return `${cardName} ${orientation} の影は、ひとつの反応だけで全体を決めてしまうことです。${row.positionTitle}では繰り返される態度を見守りましょう。`;
    if (field === "orderConnection") return next ? `${idx + 1}枚目は次の ${next.cardNameEn || next.cardName} へ流れ、関係の温度がどこで近づき、どこで立ち止まるかをつなぎます。` : "最後のカードは、ここまでの流れを近い未来の関係温度としてまとめます。";
  }

  if (field === "headline") return `${cardName} ${orientation} lands in “${row.positionTitle},” revealing ${lens.detailFocus}.`;
  if (field === "summary") return `In ${row.positionTitle}, ${cardName} ${orientation} reflects the emotional temperature between you and the hesitation that has not yet found words.`;
  if (field === "detail") return `${cardName} ${orientation} asks you to avoid forcing a final definition and instead notice what kind of response repeats over time. ${prev ? `The echo of ${prev.cardNameEn || prev.cardName} still colors this position, ` : ""}${next ? `and the movement toward ${next.cardNameEn || next.cardName} shows how ` : ""}hope and reality begin to separate. What helps now is not pressure, but a calmer space where sincerity can surface safely.`;
  if (field === "relationshipInsight") return `${cardName} in ${row.positionTitle} invites you to read the gap between feeling and action without turning one moment into a fixed answer.`;
  if (field === "advice") return `${cardName} ${orientation} advises one small, gentle check-in instead of demanding certainty today. Keep your warmth simple and your boundary clear.`;
  if (field === "caution") return `The shadow of ${cardName} ${orientation} is deciding the whole relationship from one reply or one pause. In ${row.positionTitle}, repeated behavior matters more than a single sign.`;
  if (field === "orderConnection") return next ? `Card ${idx + 1} flows toward ${next.cardNameEn || next.cardName}, connecting where the bond draws closer and where it hesitates.` : "The final card gathers the spread into the relationship temperature likely to form next.";
  return "";
}

function buildDiversifiedFallback(field, row, idx, cards, locale = "ko") {
  const localized = buildLocalizedLoveFallback(field, row, idx, cards, locale);
  if (localized) return localized;
  const safeCards = Array.isArray(cards) ? cards : [];
  const lens = row?.lens || lovePositionLens(idx, locale);
  const copy = POSITION_COPY[idx] || POSITION_COPY[POSITION_COPY.length - 1];
  const prev = idx > 0 ? parseCardMeta(safeCards[idx - 1], idx - 1, locale) : null;
  const next = idx < safeCards.length - 1 ? parseCardMeta(safeCards[idx + 1], idx + 1, locale) : null;
  const suitLine = suitCue(row.suit);
  const orientLine = orientationCue(row.orientation);
  const ctx = { lens, prev, next, suitLine, orientLine };

  if (field === "headline") {
    return `${row.cardName} ${row.orientationLabel}이 ${row.positionOrder}번 '${row.positionTitle}'에 놓이며, ${lens.detailFocus}가 ${suitLine}의 결로 드러납니다.`;
  }
  if (field === "summary") {
    return `${row.positionTitle}에서 ${row.cardName} ${row.orientationLabel}은 두 사람 사이에 흐르는 ${suitLine}의 온도를 드러냅니다. 특히 ${orientLine} 기운이 함께 움직여, 같은 말과 침묵도 서로 다른 마음의 무늬로 남기 쉽습니다.`;
  }
  if (field === "detail") {
    return copy.detail(row, ctx);
  }
  if (field === "relationshipInsight") {
    return copy.insight(row, ctx);
  }
  if (field === "advice") {
    return copy.advice(row, ctx);
  }
  if (field === "caution") {
    return copy.caution(row, ctx);
  }
  if (field === "orderConnection") {
    if (idx === 0 && next) return `1번 카드는 2번 ${next.cardName} ${next.orientationLabel}로 이어지며, 첫 시선이 관계의 이름을 어떻게 흔드는지 드러냅니다.`;
    if (idx === 1 && prev && next) return `2번 카드는 1번 ${prev.cardName}의 기대와 3번 ${next.cardName}의 실제 감정 사이에 놓인 다리입니다.`;
    if (idx === 2 && next) return `3번 카드는 4번 ${next.cardName} ${next.orientationLabel}과 나란히 읽을 때, 마음의 온도와 움직일 의지를 분리해 줍니다.`;
    if (idx === 3 && next) return `4번 카드는 5번 ${next.cardName}에서 멈칫하는 이유를 가리키며, 감정이 행동으로 옮겨질 수 있는지를 살핍니다.`;
    if (idx === 4 && next) return `5번 카드는 6번 ${next.cardName} ${next.orientationLabel}의 가까운 미래를 만드는 숨은 매듭입니다.`;
    return "6번 카드는 전체 배열의 마지막 문장으로, 처음의 시선이 가까운 미래의 관계 온도로 굳어지는 모습을 드러냅니다.";
  }
  return "";
}

function ensureMinLength(text, minLength, appendix) {
  const base = cleanText(text);
  if (base.length >= minLength) return base;
  const extra = cleanText(appendix);
  const merged = cleanText(`${base} ${extra}`);
  return merged.length >= minLength ? merged : `${merged} ${extra}`.trim();
}

function enforcePositionTextDiversity(rows, cards, locale = "ko") {
  const fields = ["summary", "detail", "advice", "orderConnection"];

  fields.forEach((field) => {
    rows.forEach((row, idx) => {
      let value = cleanText(row[field]);
      if (!value) value = cleanText(buildDiversifiedFallback(field, row, idx, cards, locale));

      for (let i = 0; i < idx; i += 1) {
        const prev = cleanText(rows[i]?.[field]);
        if (!prev) continue;
        if (value === prev || similarity(value, prev) >= 0.65) {
          value = cleanText(buildDiversifiedFallback(field, row, idx, cards, locale));
          break;
        }
      }

      if (field === "detail" && normalizeLoveReadingLocale(locale) === "ko") {
        value = ensureMinLength(
          value,
          180,
          `${row.cardName} ${row.orientationLabel}의 메시지는 ${row.positionTitle} 자리에서만 완성됩니다. 앞뒤 카드와 이어 보면, 두 사람의 마음이 어디서 가까워지고 어디서 망설이는지 더 섬세하게 드러납니다.`,
        );
      }
      if (field === "advice" && normalizeLoveReadingLocale(locale) === "ko") {
        value = ensureMinLength(
          value,
          70,
          `${row.positionTitle}에서 오늘 필요한 태도는 서두른 확인보다 차분한 거리 조절입니다. 상대의 한 번의 반응보다 반복되는 온도를 기준으로 다음 말을 정하세요.`,
        );
      }

      row[field] = value;
    });
  });

  rows.forEach((row) => {
    delete row.lens;
  });

  return rows;
}

function buildPositionReading(cards, basePosition = [], locale = "ko") {
  const safeCards = Array.isArray(cards) ? cards : [];
  const baseRows = Array.isArray(basePosition) ? basePosition : [];

  const rows = safeCards.map((card, idx) => {
    const source = baseRows[idx] || {};
    const meta = parseCardMeta(card, idx, locale);

    const headline = cleanText(source.headline || "");
    const summary = cleanText(source.summary || buildDiversifiedFallback("summary", meta, idx, safeCards, locale));
    const detail = cleanText(source.detail || buildDiversifiedFallback("detail", meta, idx, safeCards, locale));
    const relationshipInsight = cleanText(source.relationshipInsight || "");
    const advice = cleanText(source.advice || buildDiversifiedFallback("advice", meta, idx, safeCards, locale));
    const caution = cleanText(source.caution || "");
    const orderConnection = cleanText(source.orderConnection || buildDiversifiedFallback("orderConnection", meta, idx, safeCards, locale));

    return {
      lens: meta.lens,
      positionTitle: source.positionTitle || meta.positionTitle,
      positionKey: source.positionKey || meta.positionKey,
      positionOrder: Number(source.positionOrder || meta.positionOrder || idx + 1),
      cardName: source.cardName || meta.cardName,
      cardNameEn: source.cardNameEn || meta.cardNameEn,
      cardId: source.cardId || meta.cardId,
      suit: source.suit || meta.suit,
      rank: source.rank || meta.rank,
      isMajor: typeof source.isMajor === "boolean" ? source.isMajor : meta.isMajor,
      isCourt: typeof source.isCourt === "boolean" ? source.isCourt : meta.isCourt,
      orientation: source.orientation || meta.orientation,
      orientationLabel: source.orientationLabel || meta.orientationLabel,
      keywords: Array.isArray(source.keywords) && source.keywords.length
        ? source.keywords.map((k) => asText(k)).filter(Boolean).slice(0, 6)
        : meta.keywords,
      headline,
      summary,
      detail,
      relationshipInsight,
      advice,
      caution,
      rawCardMeaning: cleanText(source.rawCardMeaning || source.summary || ""),
      orderConnection,
      title: source.title || source.positionTitle || meta.positionTitle,
      card: source.card || `${source.cardName || meta.cardName} · ${source.orientationLabel || meta.orientationLabel}`,
    };
  });

  return enforcePositionTextDiversity(rows, safeCards, locale);
}

function sentenceSplit(text) {
  return asText(text)
    .split(/(?<=[.!?。！？]|다\.|니다\.|요\.)\s+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function hasForbiddenMix(text) {
  const source = asText(text);
  return FORBIDDEN_MIXED_PHRASES.some((pattern) => pattern.test(source));
}

function buildDefaultSections(rows, matrix, locale = "ko") {
  const first = rows[0];
  const last = rows[rows.length - 1];
  const lang = normalizeLoveReadingLocale(locale);
  if (lang === "ja") {
    return {
      counselorTone: "二人の気持ちの温度と行動に移る力を分けて見ながら、カードの順番に宿る関係の速度を静かに読み解きます。",
      overallVibe: `${first.cardNameEn || first.cardName} ${first.orientationLabel} から ${last.cardNameEn || last.cardName} ${last.orientationLabel} へ続く流れには、最初の視線と近い未来の温度差が映っています。今は心の大きさだけでなく、二人が許している速度、言えなかった期待、関係に名前をつける方法が大切です。`,
      deepReading: `${rows[1].cardNameEn || rows[1].cardName} ${rows[1].orientationLabel} は相手がこの関係をどう捉えているかを示し、${rows[2].cardNameEn || rows[2].cardName} ${rows[2].orientationLabel} は相手があなたへ向ける気持ちの温度を映します。二つのカードは、関係を考える頭の言葉と、先に反応する心の言葉を分けて見せています。`,
      realityAndFuture: `${rows[4].cardNameEn || rows[4].cardName} ${rows[4].orientationLabel} が示す結び目をほどかないまま進むと、${rows[5].cardNameEn || rows[5].cardName} ${rows[5].orientationLabel} の近い未来へ流れやすくなります。これからは短く優しい会話、過度な解釈を止める習慣、自分が守る基準線を一緒に置くとよいでしょう。`,
    };
  }
  if (lang !== "ko") {
    return {
      counselorTone: "This reading separates emotional temperature from willingness to act, then traces the hidden pace carried by the card order.",
      overallVibe: `From ${first.cardNameEn || first.cardName} ${first.orientationLabel} to ${last.cardNameEn || last.cardName} ${last.orientationLabel}, this spread shows the distance between the first impression and the near-future temperature. The key is not only how strong the feeling is, but what pace both people can safely allow.`,
      deepReading: `${rows[1].cardNameEn || rows[1].cardName} ${rows[1].orientationLabel} shows how they define the relationship, while ${rows[2].cardNameEn || rows[2].cardName} ${rows[2].orientationLabel} reveals the warmth they feel toward you. One card speaks in the language of definition; the other speaks in the language of feeling.`,
      realityAndFuture: `If the knot shown by ${rows[4].cardNameEn || rows[4].cardName} ${rows[4].orientationLabel} remains untouched, the bond may flow toward the near-term scene of ${rows[5].cardNameEn || rows[5].cardName} ${rows[5].orientationLabel}. Small, kind conversations and clear personal boundaries will help the relationship breathe.`,
    };
  }
  return {
    counselorTone: "두 사람의 감정 온도와 행동 의지를 따로 살피고, 카드 순서에 담긴 관계의 숨은 속도를 부드럽게 풀어냅니다.",
    overallVibe: `${first.cardName} ${first.orientationLabel}에서 ${last.cardName} ${last.orientationLabel}로 이어지는 이번 배열에는 첫 시선과 가까운 미래의 온도 차이가 드러납니다. 마음의 크기보다 두 사람이 서로에게 허락한 속도, 말하지 못한 기대, 관계의 이름을 붙이는 방식이 더 크게 떠오릅니다. 시작 구간에는 끌림이나 해석이 먼저 생겼고, 마지막 구간에는 아직 고르지 못한 기준과 망설임이 남아 있습니다. 지금 필요한 것은 확답을 끌어내는 압박이 아니라, 서로가 편안하게 진심을 드러낼 수 있는 대화의 공간입니다. ${matrix.dominantSuit} 신호가 전체 공기를 이끌며 이 관계의 가장 깊은 흔들림을 가리킵니다.`,
    deepReading: `${rows[1].cardName} ${rows[1].orientationLabel}은 상대가 이 관계를 어떤 이름으로 바라보는지 드러내고, ${rows[2].cardName} ${rows[2].orientationLabel}은 상대가 나에게 실제로 느끼는 감정의 온도를 드러냅니다. 두 카드는 비슷해 보여도 결이 다릅니다. 하나는 관계를 정의하려는 머리의 언어이고, 다른 하나는 마음이 먼저 반응하는 감정의 언어입니다. 이어서 ${rows[3].cardName} ${rows[3].orientationLabel}은 그 감정이 실제 행동으로 옮겨질 힘이 있는지를 묻습니다. 상대가 모순적으로 보인다면 마음이 없는 것이 아니라, 감정과 실행의 속도가 아직 맞지 않는 것일 수 있습니다. 그러므로 대화는 추궁보다 확인, 결론보다 리듬 조율에 가까워야 합니다.`,
    realityAndFuture: `${rows[4].cardName} ${rows[4].orientationLabel}이 가리키는 병목은 지금 관계를 늦추는 매듭입니다. 이 매듭을 풀지 않으면 ${rows[5].cardName} ${rows[5].orientationLabel}의 가까운 미래로 자연스럽게 이어질 수 있습니다. 바꿀 수 있는 것은 내 연락 리듬, 질문의 온도, 결론을 요구하는 강도입니다. 반대로 상대가 마음을 정리하는 속도와 최종 결심의 시점은 억지로 당길 수 없습니다. 앞으로 2~6주 동안은 짧고 다정한 대화, 과한 해석을 멈추는 습관, 내가 지킬 기준선을 함께 두는 편이 좋습니다. 이 관계의 답은 한 번의 말보다 반복되는 태도 속에서 천천히 또렷해집니다.`,
  };
}

function validateRelationshipTarotQuality(reading) {
  const issues = [];
  const safe = reading && typeof reading === "object" ? reading : {};
  const sections = [safe.overallVibe, safe.deepReading, safe.realityAndFuture].map((v) => cleanText(v));

  const sentenceOwner = new Map();
  sections.forEach((section, idx) => {
    sentenceSplit(section).forEach((line) => {
      const normalized = line.toLowerCase().replace(/\s+/g, " ").trim();
      if (!normalized) return;
      const prev = sentenceOwner.get(normalized);
      if (prev !== undefined && prev !== idx) {
        issues.push("repeated_section_sentence");
      }
      sentenceOwner.set(normalized, idx);
    });
  });

  const rows = Array.isArray(safe.positionBreakdown) ? safe.positionBreakdown : [];
  if (rows.length !== 6) issues.push("position_count_invalid");

  rows.forEach((row, idx) => {
    const detail = cleanText(row?.detail);
    const advice = cleanText(row?.advice);
    const caution = cleanText(row?.caution);
    const cardName = asText(row?.cardName);
    const orientationLabel = asText(row?.orientationLabel);

    if (detail.length < 180) issues.push(`position_${idx + 1}_detail_too_short`);
    if (advice.length < 70) issues.push(`position_${idx + 1}_advice_too_short`);
    if (!detail.includes(cardName) || !detail.includes(orientationLabel)) issues.push(`position_${idx + 1}_card_or_orientation_missing`);
    if (hasForbiddenMix(`${detail} ${advice} ${caution}`)) issues.push(`position_${idx + 1}_mixed_phrase`);
  });

  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      ["detail", "advice", "caution"].forEach((field) => {
        const a = cleanText(rows[i]?.[field]);
        const b = cleanText(rows[j]?.[field]);
        if (!a || !b) return;
        if (a === b || similarity(a, b) >= 0.7) {
          issues.push(`position_${i + 1}_${j + 1}_${field}_too_similar`);
        }
      });
    }
  }

  const p3 = rows[2];
  const p4 = rows[3];
  if (p3 && p4) {
    const t3 = cleanText(`${p3.detail} ${p3.relationshipInsight}`);
    const t4 = cleanText(`${p4.detail} ${p4.relationshipInsight}`);
    if (similarity(t3, t4) >= 0.68 || (!t3.includes("감정") && !t4.includes("의지"))) {
      issues.push("position3_position4_not_distinct");
    }
  }

  const blockToOutcome = cleanText(safe?.relationshipMatrix?.blockToOutcome || "");
  if (!blockToOutcome) issues.push("missing_block_to_outcome");

  const finalAdviceText = cleanText(
    `${safe?.finalAdvice?.instantMission || ""} ${safe?.finalAdvice?.conversationTip || ""} ${safe?.finalAdvice?.relationshipBoundary || ""}`,
  );
  if (finalAdviceText.length < 80) issues.push("final_advice_too_generic");
  if (hasForbiddenMix(finalAdviceText)) issues.push("final_advice_mixed_phrase");

  if (!cleanText(safe?.relationshipMatrix?.wholeStory || "")) {
    issues.push("relationship_matrix_whole_story_missing");
  }

  return {
    ok: issues.length === 0,
    issues: Array.from(new Set(issues)),
  };
}

export function normalizeLoveReadingPayload(reading, cards, locale = "ko") {
  const activeLocale = normalizeLoveReadingLocale(locale);
  const useSourceText = activeLocale === "ko";
  const copy = loveReadingCopy(activeLocale);
  const src = reading && typeof reading === "object" ? reading : {};
  const safeCards = Array.isArray(cards) ? cards : [];

  let positionBreakdown = buildPositionReading(safeCards, useSourceText && Array.isArray(src.positionBreakdown) ? src.positionBreakdown : [], activeLocale);

  const first = positionBreakdown[0] || {};
  const last = positionBreakdown[positionBreakdown.length - 1] || {};
  const cardRef = (index, fallbackOrder) => positionBreakdown[index]?.cardNameEn || positionBreakdown[index]?.cardName || copy.cardFallback(fallbackOrder);
  const relationshipMatrix = useSourceText && src.relationshipMatrix && typeof src.relationshipMatrix === "object"
    ? src.relationshipMatrix
    : activeLocale === "ja"
      ? {
        projectionGap: `${cardRef(0, 1)} と ${cardRef(2, 3)} の差を見ながら、あなたが見ている相手像と相手の実際の気持ちの温度差を確かめます。`,
        relationshipFrame: `${cardRef(1, 2)} と ${cardRef(3, 4)} を合わせて読み、関係への考えと行動する意思が同じ方向を向いているかを見ます。`,
        blockToOutcome: `${cardRef(4, 5)} の結び目が、${cardRef(5, 6)} の近い未来を形づくる連結点です。`,
        wholeStory: `${cardRef(0, 1)} から ${cardRef(5, 6)} へ流れる6枚の物語には、気持ちの温度と関係を定義する速度の差が映っています。`,
        dominantSuit: asText(src?.relationshipMatrix?.dominantSuit || "主導するスートは、この関係の中心軸を示します。"),
        majorArcanaSignal: asText(src?.relationshipMatrix?.majorArcanaSignal || "大アルカナは、関係が変化へ向かう圧力を映します。"),
        reversedSignal: asText(src?.relationshipMatrix?.reversedSignal || "逆位置のカードには、遅れ、ゆがみ、内側へ向いた感情が宿ります。"),
        courtCardSignal: asText(src?.relationshipMatrix?.courtCardSignal || "コートカードは、関わる人たちの態度の違いを見せます。"),
        sequenceFlow: asText(src?.relationshipMatrix?.sequenceFlow || positionBreakdown.map((r) => `${r.cardNameEn || r.cardName}(${r.orientationLabel})`).join(" → ")),
      }
      : activeLocale !== "ko"
        ? {
          projectionGap: `Compare ${cardRef(0, 1)} with ${cardRef(2, 3)} to see the difference between the person you imagine and the feeling they actually show.`,
          relationshipFrame: `Read ${cardRef(1, 2)} with ${cardRef(3, 4)} to see whether their idea of the relationship can move into action.`,
          blockToOutcome: `The knot shown by ${cardRef(4, 5)} becomes the link that shapes the short-term outcome of ${cardRef(5, 6)}.`,
          wholeStory: `Across the six-card story from ${cardRef(0, 1)} to ${cardRef(5, 6)}, the spread reveals the gap between emotional warmth and the pace of defining the bond.`,
          dominantSuit: asText(src?.relationshipMatrix?.dominantSuit || "The dominant suit points to the central axis of the relationship."),
          majorArcanaSignal: asText(src?.relationshipMatrix?.majorArcanaSignal || "Major Arcana cards show pressure for meaningful change."),
          reversedSignal: asText(src?.relationshipMatrix?.reversedSignal || "Reversed cards hold delay, distortion, or emotion turned inward."),
          courtCardSignal: asText(src?.relationshipMatrix?.courtCardSignal || "Court cards reveal differences in attitude between the people involved."),
          sequenceFlow: asText(src?.relationshipMatrix?.sequenceFlow || positionBreakdown.map((r) => `${r.cardNameEn || r.cardName}(${r.orientationLabel})`).join(" → ")),
        }
        : {
      projectionGap: `${positionBreakdown[0]?.cardName || "1번 카드"}와 ${positionBreakdown[2]?.cardName || "3번 카드"}의 간극을 비교해, 내가 본 상대와 상대의 실제 감정 온도 차이를 확인해야 합니다.`,
      relationshipFrame: `${positionBreakdown[1]?.cardName || "2번 카드"}와 ${positionBreakdown[3]?.cardName || "4번 카드"}를 함께 읽어 생각과 행동 의지가 일치하는지 점검해야 합니다.`,
      blockToOutcome: `${positionBreakdown[4]?.cardName || "5번 카드"}의 병목이 ${positionBreakdown[5]?.cardName || "6번 카드"} 단기 결말을 만드는 연결 고리입니다.`,
      wholeStory: `${first.cardName || "첫 카드"} ${first.orientationLabel || ""}에서 ${last.cardName || "마지막 카드"} ${last.orientationLabel || ""}로 흐르는 6장 서사에는 감정 온도와 관계 정의 속도의 간극이 드러납니다.`,
      dominantSuit: asText(src?.relationshipMatrix?.dominantSuit || "주도 슈트 신호가 관계의 핵심 축을 가리킵니다."),
      majorArcanaSignal: asText(src?.relationshipMatrix?.majorArcanaSignal || "메이저 카드 비중에는 관계 전환 압력이 담깁니다."),
      reversedSignal: asText(src?.relationshipMatrix?.reversedSignal || "역방향의 그늘에는 지연과 왜곡 가능성이 머무릅니다."),
      courtCardSignal: asText(src?.relationshipMatrix?.courtCardSignal || "궁정카드 비중은 인물 간 태도 차이를 드러냅니다."),
      sequenceFlow: asText(src?.relationshipMatrix?.sequenceFlow || positionBreakdown.map((r) => `${r.cardName}(${r.orientationLabel})`).join(" → ")),
    };

  const defaults = buildDefaultSections(positionBreakdown, relationshipMatrix, activeLocale);

  let normalized = {
    title: asText((useSourceText && src.title) || copy.title),
    summary: cleanText((useSourceText && src.summary) || copy.summary),
    counselorTone: cleanText((useSourceText && src.counselorTone) || defaults.counselorTone),
    overallVibe: cleanText((useSourceText && src.overallVibe) || defaults.overallVibe),
    deepReading: cleanText((useSourceText && src.deepReading) || defaults.deepReading),
    realityAndFuture: cleanText((useSourceText && src.realityAndFuture) || defaults.realityAndFuture),
    relationshipMatrix,
    positionBreakdown,
    finalAdvice: {
      instantMission: cleanText((useSourceText && src?.finalAdvice?.instantMission) || (activeLocale === "ja" ? `${cardRef(4, 5)} と ${cardRef(5, 6)} が示すように、今日は結論を求めるより、誤解を小さくする短い問いを一つだけ残してみてください。` : activeLocale !== "ko" ? `As ${cardRef(4, 5)} and ${cardRef(5, 6)} suggest, leave one short question that reduces misunderstanding instead of demanding a conclusion today.` : `${positionBreakdown[4]?.cardName || "5번 카드"}, ${positionBreakdown[5]?.cardName || "6번 카드"} 두 카드가 말하듯, 오늘은 결론을 요구하기보다 오해를 줄이는 짧은 질문 하나만 남겨 보세요.`)),
      conversationTip: cleanText((useSourceText && src?.finalAdvice?.conversationTip) || (activeLocale === "ja" ? `${cardRef(2, 3)} の気持ちの温度と ${cardRef(3, 4)} の行動する意思を分けて見ながら、「私はゆっくり知っていきたい。あなたにはどんな速度が心地いい？」とやわらかく尋ねてみてください。` : activeLocale !== "ko" ? `Separate the emotional warmth of ${cardRef(2, 3)} from the willingness to act shown by ${cardRef(3, 4)}, and ask gently: “I want to understand this slowly. What pace feels comfortable for you?”` : `${positionBreakdown[2]?.cardName || "3번 카드"}의 마음 온도와 ${positionBreakdown[3]?.cardName || "4번 카드"}의 행동 의지를 나누어 보며, "나는 천천히 알고 싶어. 너에게 편한 속도는 어때?"처럼 부드럽게 물어보세요.`)),
      relationshipBoundary: cleanText((useSourceText && src?.finalAdvice?.relationshipBoundary) || (activeLocale === "ja" ? `${cardRef(5, 6)} の流れでは曖昧さが長引くほど、連絡の頻度、約束の基準、会話の礼儀を先に決めておくことが心を守ります。` : activeLocale !== "ko" ? `With the flow of ${cardRef(5, 6)}, the longer things stay vague, the more your heart needs clear standards for contact, promises, and respectful conversation.` : `${positionBreakdown[5]?.cardName || "6번 카드"} 흐름상 애매함이 길어질수록, 내가 지킬 연락 주기와 약속 기준, 대화의 예의를 먼저 정해 두는 것이 마음을 보호합니다.`)),
      nextSevenDays: cleanText((useSourceText && src?.finalAdvice?.nextSevenDays) || (activeLocale === "ja" ? `${cardRef(0, 1)} から ${cardRef(5, 6)} へ続く流れに沿って、7日間は確認を急がず、小さな優しさと静かな観察を一緒に置いてください。` : activeLocale !== "ko" ? `For the next seven days, follow the flow from ${cardRef(0, 1)} to ${cardRef(5, 6)} by keeping a small kindness and calm observation beside each other, without rushing for proof.` : `${positionBreakdown[0]?.cardName || "첫 카드"}에서 ${positionBreakdown[5]?.cardName || "마지막 카드"}로 이어지는 흐름을 따라, 7일 동안은 확인을 재촉하지 말고 작은 다정함과 차분한 관찰을 함께 두세요.`)),
      checklist: useSourceText && Array.isArray(src?.finalAdvice?.checklist) && src.finalAdvice.checklist.length
        ? src.finalAdvice.checklist.map((line) => cleanText(line)).filter(Boolean)
        : activeLocale === "ja"
          ? [
            `${cardRef(4, 5)} が示す結び目を刺激する、急ぎすぎた確認メッセージを止める`,
            `${cardRef(2, 3)} の感情サインを決めつけず、実際の言葉と行動で確かめる`,
            `${cardRef(3, 4)} の意思は言葉より小さな提案と約束で見る`,
            `${cardRef(1, 2)} の流れでは、関係の名前より心地よい速度を合わせる`,
            `${cardRef(5, 6)} のように曖昧さが続くなら、自分が守る線を静かに実行する`,
          ]
          : activeLocale !== "ko"
            ? [
              `Pause urgent check-in messages that may press the knot shown by ${cardRef(4, 5)}`,
              `Do not fix the emotional signal of ${cardRef(2, 3)} too quickly; confirm it through words and actions`,
              `Read the will of ${cardRef(3, 4)} through small offers and kept promises more than words`,
              `In the flow of ${cardRef(1, 2)}, align on a comfortable pace before naming the relationship`,
              `If the ambiguity of ${cardRef(5, 6)} lingers, quietly practice the boundary you need to keep`,
            ]
            : [
          `${positionBreakdown[4]?.cardName || "5번 카드"}가 가리키는 매듭을 자극하는 급한 확인 메시지 멈추기`,
          `${positionBreakdown[2]?.cardName || "3번 카드"}의 감정 신호는 단정하지 말고 실제 말과 행동으로 확인하기`,
          `${positionBreakdown[3]?.cardName || "4번 카드"}의 의지는 말보다 작은 제안과 약속으로 살피기`,
          `${positionBreakdown[1]?.cardName || "2번 카드"} 흐름에서는 관계 이름보다 서로 편한 속도부터 맞추기`,
          `${positionBreakdown[5]?.cardName || "6번 카드"}처럼 애매함이 길어지면 내가 지킬 선을 조용히 실행하기`,
        ],
    },
    advice: useSourceText && Array.isArray(src.advice)
      ? src.advice.map((line) => cleanText(line)).filter(Boolean)
      : [],
    cardSections: useSourceText ? src.cardSections : undefined,
    combinations: useSourceText ? src.combinations : undefined,
    combinationReading: cleanText(useSourceText ? src.combinationReading : ""),
    finalAdviceText: cleanText(useSourceText ? (src.finalAdviceText || src?.finalAdvice?.instantMission || "") : ""),
  };

  normalized.advice = [
    normalized.finalAdvice.instantMission,
    normalized.finalAdvice.conversationTip,
    normalized.finalAdvice.relationshipBoundary,
    normalized.finalAdvice.nextSevenDays,
  ].filter(Boolean);

  let quality = activeLocale === "ko" ? validateRelationshipTarotQuality(normalized) : { ok: true, issues: [] };
  if (activeLocale === "ko" && !quality.ok) {
    for (let attempt = 1; attempt <= 2 && !quality.ok; attempt += 1) {
      positionBreakdown = buildPositionReading(safeCards, [], activeLocale);
      const refreshedDefaults = buildDefaultSections(positionBreakdown, relationshipMatrix, activeLocale);
      normalized = {
        ...normalized,
        positionBreakdown,
        overallVibe: refreshedDefaults.overallVibe,
        deepReading: refreshedDefaults.deepReading,
        realityAndFuture: refreshedDefaults.realityAndFuture,
      };
      quality = validateRelationshipTarotQuality(normalized);
    }
    if (!quality.ok) {
      console.warn("[RelationshipTarot][QualityFail]", quality.issues);
    }
  }

  if (process.env.NODE_ENV !== "production") {
    const sequenceFlow = asText(normalized?.relationshipMatrix?.sequenceFlow || normalized.positionBreakdown.map((row) => `${row.cardName}(${row.orientationLabel})`).join(" → "));
    console.log("[RelationshipTarot] spreadId", "relationship_six_card");
    console.log("[RelationshipTarot] drawnCards", normalized.positionBreakdown.map((row) => `${row.positionOrder}:${row.cardName}(${row.orientationLabel})`));
    console.log("[RelationshipTarot] sequenceFlow", sequenceFlow);
    console.log("[RelationshipTarot] relationshipMatrix", normalized.relationshipMatrix);
    console.log("[RelationshipTarot] quality", quality);
  }

  normalized.quality = quality;
  return normalized;
}

export function buildLoveConsultingHighlights(reading) {
  const src = reading && typeof reading === "object" ? reading : {};
  return [
    src.overallVibe,
    src.deepReading,
    src.realityAndFuture,
    src?.relationshipMatrix?.wholeStory,
  ]
    .map((line) => cleanText(line))
    .filter(Boolean)
    .slice(0, 4);
}

export { validateRelationshipTarotQuality };
