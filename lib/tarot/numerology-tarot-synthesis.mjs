/**
 * 수비학 × 타로 결합 해석 엔진.
 *
 * 이 모듈은 "문장을 더 쓰는" 대신 해석 규칙을 세운다.
 * 타로 실무에서 실제로 쓰는 세 가지 장치를 코드화한다.
 *
 *  1) 카드 → 수 (메이저 아르카나 번호를 1~9로 축약)
 *  2) 카드의 수 ↔ 상담자의 수(생명수·오늘수·질문수) 관계 판정 — 공명 / 보완 / 긴장 / 중립
 *  3) 스프레드 총합수(Quintessence) — 5장의 번호를 합쳐 이번 상담을 총괄하는 한 장을 뽑는 기법
 *
 * 조합 축은 `카드수(10) × 관계(4) × 포지션역할(5) × 정·역(2) × 주제(9)`이므로
 * 같은 사람이라도 뽑은 카드가 달라지면 해석이 실제로 달라진다.
 *
 * 이 파일은 numerology-tarot.mjs 를 import 하지 않는다(단방향 의존).
 * 카드/주제 데이터는 전부 인자로 받는다.
 */

function toText(value) {
  return String(value || "").trim();
}

/** 한글 종성 유무. 판별 불가면 null. */
function hasFinalConsonant(word) {
  const ch = toText(word).slice(-1);
  if (!ch) return null;
  const code = ch.charCodeAt(0);
  if (!Number.isFinite(code) || code < 0xac00 || code > 0xd7a3) return null;
  return (code - 0xac00) % 28 !== 0;
}

/** 숫자를 한국어로 읽었을 때의 종성 유무(일·삼·육·칠·팔·십일·삼십삼 = 받침 있음). */
const NUMBER_HAS_FINAL = {
  0: false, 1: true, 2: false, 3: true, 4: false, 5: false,
  6: true, 7: true, 8: true, 9: false, 11: true, 22: false, 33: true,
};

function numberParticle(num, withFinal, withoutFinal) {
  const known = NUMBER_HAS_FINAL[Number(num)];
  if (typeof known !== "boolean") return withoutFinal;
  return known ? withFinal : withoutFinal;
}

function wordParticle(word, withFinal, withoutFinal) {
  const final = hasFinalConsonant(word);
  if (final === null) return withoutFinal;
  return final ? withFinal : withoutFinal;
}

/**
 * 수의 목소리 — 각 수가 상담에서 말하는 방식.
 * core(정방향 본질) / shadow(역방향·그림자) / light(살아날 때) / arena(작동 무대) / ask(스스로에게 던질 질문) / act(행동 지시)
 */
const NUMBER_VOICES = {
  1: {
    keyword: "시작",
    core: "스스로 방향을 정하고 먼저 한 걸음 내딛는 힘",
    light: "미루던 결정을 내 손으로 확정하는 흐름",
    shadow: "혼자 다 짊어지고 밀어붙이다 주변을 놓치는 흐름",
    arena: "결정과 출발",
    ask: "이건 내가 정말 원해서 고른 방향인가, 아니면 떠밀려 온 자리인가",
    act: "오늘 안에 결정할 것 하나만 골라 그 자리에서 끝내세요.",
  },
  2: {
    keyword: "관계",
    core: "상대의 속도에 맞추며 관계의 온도를 읽는 힘",
    light: "서두르지 않고 기다려 상대가 먼저 다가오게 하는 흐름",
    shadow: "맞춰 주다 내 기준까지 지워 버리는 흐름",
    arena: "기다림과 조율",
    ask: "지금 맞추고 있는 것이 배려인가, 아니면 거절이 두려워서인가",
    act: "상대의 말이 아니라 반복된 행동 하나를 기준으로 삼아 보세요.",
  },
  3: {
    keyword: "표현",
    core: "마음을 밖으로 꺼내 사람과 기회를 끌어오는 힘",
    light: "말과 표현이 살아나 흐름이 밝아지는 국면",
    shadow: "말은 많아지는데 남는 것은 흩어지는 흐름",
    arena: "표현과 확산",
    ask: "말하고 싶은 게 많은 건가, 확인받고 싶은 건가",
    act: "하고 싶은 말을 세 문장으로 줄여서 한 번만 전하세요.",
  },
  4: {
    keyword: "안정",
    core: "기반을 다지고 약속을 지켜 신뢰를 쌓는 힘",
    light: "흔들리던 조건이 문서와 일정으로 정리되는 흐름",
    shadow: "안전만 붙들다 기회의 시기를 놓치는 흐름",
    arena: "구조와 책임",
    ask: "이 안정은 나를 지켜 주는가, 나를 묶어 두는가",
    act: "지금 상태를 유지하는 데 드는 비용을 숫자로 적어 보세요.",
  },
  5: {
    keyword: "변화",
    core: "굳은 자리를 흔들어 새 경로를 여는 힘",
    light: "막혀 있던 국면에 움직임과 변수가 들어오는 흐름",
    shadow: "자극을 좇다 방금 쌓은 것을 스스로 흩는 흐름",
    arena: "이동과 전환",
    ask: "이 변화는 어디로 가려는 것인가, 여기서 벗어나려는 것인가",
    act: "바꾸고 싶은 것 중 되돌릴 수 있는 것부터 하나만 움직여 보세요.",
  },
  6: {
    keyword: "사랑",
    core: "책임지고 돌보며 관계를 실제로 유지하는 힘",
    light: "마음이 말이 아니라 돌봄의 행동으로 전해지는 흐름",
    shadow: "다 해 주면서 상대를 내 방식에 묶어 두는 흐름",
    arena: "돌봄과 헌신",
    ask: "내가 주는 것이 상대가 원한 것인가, 내가 주고 싶었던 것인가",
    act: "상대에게 무엇이 필요한지 추측하지 말고 한 번만 직접 물어보세요.",
  },
  7: {
    keyword: "내면",
    core: "거리를 두고 본질을 분석해 진짜를 가려내는 힘",
    light: "소음이 걷히고 판단의 기준이 선명해지는 흐름",
    shadow: "혼자 분석하다 확인할 기회 자체를 미루는 흐름",
    arena: "성찰과 분별",
    ask: "이건 신중한 것인가, 확인이 무서워 미루는 것인가",
    act: "머릿속 가정 하나를 골라 오늘 사실로 확인해 보세요.",
  },
  8: {
    keyword: "성취",
    core: "현실의 자원과 권한을 움직여 결과를 만드는 힘",
    light: "노력이 숫자와 성과로 실제 전환되는 흐름",
    shadow: "결과를 서두르다 관계와 조건을 깎아 내는 흐름",
    arena: "성과와 거래",
    ask: "얻으려는 것의 값을 나는 정확히 알고 있는가",
    act: "이번 선택의 비용과 회수 시점을 한 줄로 적어 두세요.",
  },
  9: {
    keyword: "완성",
    core: "한 흐름을 마무리하고 남은 것을 정리하는 힘",
    light: "붙들던 것을 놓으며 자리가 비워지는 흐름",
    shadow: "끝난 것을 붙들어 다음 자리를 못 여는 흐름",
    arena: "정리와 마무리",
    ask: "이미 끝난 것을 아직 끝나지 않았다고 믿고 있지는 않은가",
    act: "정리해야 할 것 하나를 오늘 목록에서 지우세요.",
  },
  11: {
    keyword: "직감",
    core: "설명되기 전에 먼저 알아차리는 예민한 감각",
    light: "우연처럼 보이던 신호가 방향을 알려 주는 흐름",
    shadow: "느낌을 사실로 확정해 스스로를 흔드는 흐름",
    arena: "직감과 신호",
    ask: "이건 알아차린 것인가, 불안이 만든 상상인가",
    act: "떠오른 직감을 적어 두고 사실로 확인될 때까지 판단은 보류하세요.",
  },
  22: {
    keyword: "현실화",
    core: "큰 그림을 실제 구조로 세워 오래 가게 만드는 힘",
    light: "흩어진 계획이 단계와 일정으로 조립되는 흐름",
    shadow: "규모를 키우다 오늘 할 한 칸을 비우는 흐름",
    arena: "설계와 축적",
    ask: "이 그림의 첫 칸을 나는 오늘 채울 수 있는가",
    act: "가장 큰 목표를 이번 주에 끝낼 수 있는 한 조각으로 잘라 보세요.",
  },
  33: {
    keyword: "치유",
    core: "상대의 아픔까지 품어 관계를 회복시키는 힘",
    light: "이해가 앞서면서 굳었던 사이가 풀리는 흐름",
    shadow: "다 감당하려다 내 회복을 뒤로 미루는 흐름",
    arena: "공감과 회복",
    ask: "품어 주는 동안 내 몫의 회복은 누가 챙기고 있는가",
    act: "남을 돕기 전에 오늘 내 회복 시간을 먼저 한 칸 확보하세요.",
  },
};

const DEFAULT_VOICE = NUMBER_VOICES[9];

function getNumberVoice(num) {
  return NUMBER_VOICES[Number(num)] || DEFAULT_VOICE;
}

/** 마스터수(11·22·33)는 보존, 그 외는 한 자리로 축약. */
function reduceNumber(value, allowMaster = true) {
  let num = Math.abs(Math.trunc(Number(value) || 0));
  if (allowMaster && (num === 11 || num === 22 || num === 33)) return num;
  while (num > 9) {
    num = String(num).split("").reduce((sum, digit) => sum + Number(digit), 0);
    if (allowMaster && (num === 11 || num === 22 || num === 33)) return num;
  }
  return num;
}

/**
 * 카드가 품은 수.
 * arcanaNumber 는 카드 고유 번호(0~21), reducedNumber 는 그 번호를 1~9로 축약한 값.
 * 0번(바보)은 축약하지 않고 "아직 정해지지 않은 수"로 따로 다룬다.
 */
function getCardNumerology(card) {
  const arcanaNumber = Number.isFinite(Number(card?.id)) ? Number(card.id) : null;
  const linked = Array.isArray(card?.numbers) ? card.numbers.map(Number).filter(Number.isFinite) : [];
  if (arcanaNumber === 0) {
    return { arcanaNumber: 0, reducedNumber: 0, isZero: true, linkedNumbers: linked, allNumbers: linked.slice() };
  }
  const reducedNumber = arcanaNumber === null ? 0 : reduceNumber(arcanaNumber, false);
  const allNumbers = Array.from(new Set([reducedNumber, ...linked].filter((n) => Number.isFinite(n) && n > 0)));
  return { arcanaNumber, reducedNumber, isZero: false, linkedNumbers: linked, allNumbers };
}

/** 같은 삼각군(1·4·7 / 2·5·8 / 3·6·9)은 서로를 받쳐 준다. */
function sameTriad(a, b) {
  const ra = reduceNumber(a, false);
  const rb = reduceNumber(b, false);
  if (!ra || !rb || ra === rb) return false;
  return ra % 3 === rb % 3;
}

/**
 * 결이 부딪치는 짝. 수비학에서 서로 반대 방향의 요구를 하는 조합이다.
 * 이 관계가 나오면 "나쁜 카드"가 아니라 이번 상담의 과제로 읽는다.
 */
const TENSION_PAIRS = [
  [1, 2, "혼자 정하려는 힘과 함께 맞추려는 힘"],
  [3, 4, "펼치려는 힘과 묶어 두려는 힘"],
  [4, 5, "머무르려는 힘과 움직이려는 힘"],
  [5, 6, "자유로워지려는 힘과 책임지려는 힘"],
  [7, 8, "거리를 두려는 힘과 손에 쥐려는 힘"],
  [8, 9, "더 얻으려는 힘과 놓아주려는 힘"],
  [2, 8, "배려하려는 힘과 관철하려는 힘"],
  [1, 7, "밀고 나가려는 힘과 멈춰 보려는 힘"],
];

function findTension(a, b) {
  const ra = reduceNumber(a, false);
  const rb = reduceNumber(b, false);
  return TENSION_PAIRS.find(([x, y]) => (x === ra && y === rb) || (x === rb && y === ra)) || null;
}

const USER_NUMBER_LABELS = {
  lifePathNumber: "생명수",
  personalDayNumber: "오늘수",
  questionNumber: "질문수",
};

/** 판정 우선순위 — 공명이 가장 강한 신호, 그다음 긴장(과제), 보완, 중립 순. */
const RELATION_RANK = { resonance: 3, tension: 2, complement: 1, neutral: 0 };

/**
 * 카드의 수와 상담자의 수 사이 관계를 판정한다.
 *
 * @param {{allNumbers:number[], reducedNumber:number, isZero:boolean}} cardNumerology
 * @param {{lifePathNumber:number, personalDayNumber:number, questionNumber:number}} userNumbers
 * @returns {{type:string, typeLabel:string, userKey:string, userLabel:string, userNumber:number,
 *            cardNumber:number, strength:number, note:string}}
 */
function resolveNumberRelation(cardNumerology, userNumbers = {}) {
  const cardNumbers = cardNumerology?.allNumbers?.length
    ? cardNumerology.allNumbers
    : [Number(cardNumerology?.reducedNumber) || 0];

  const candidates = [];
  for (const [key, label] of Object.entries(USER_NUMBER_LABELS)) {
    const userNumber = Number(userNumbers?.[key]);
    if (!Number.isFinite(userNumber) || userNumber <= 0) continue;
    for (const cardNumber of cardNumbers) {
      if (!cardNumber) continue;
      if (reduceNumber(cardNumber, false) === reduceNumber(userNumber, false)) {
        candidates.push({ type: "resonance", key, label, userNumber, cardNumber, note: "" });
        continue;
      }
      const tension = findTension(cardNumber, userNumber);
      if (tension) {
        candidates.push({ type: "tension", key, label, userNumber, cardNumber, note: tension[2] });
        continue;
      }
      const sum = reduceNumber(cardNumber, false) + reduceNumber(userNumber, false);
      if (sum === 10 || sameTriad(cardNumber, userNumber)) {
        candidates.push({
          type: "complement",
          key,
          label,
          userNumber,
          cardNumber,
          note: sum === 10 ? "합이 10이 되어 서로의 빈자리를 메웁니다" : "같은 결의 수라 서로를 밀어 줍니다",
        });
      }
    }
  }

  // 0번(바보)은 어떤 수도 확정되지 않은 자리라 관계 판정 자체를 하지 않는다.
  // (예전에는 카드가 함께 품은 수로 "긴장"이 잡혀, 본문의 "아직 정해지지 않았다"와 배지가 어긋났다.)
  if (cardNumerology?.isZero) {
    return {
      type: "open",
      typeLabel: "열림",
      userKey: "",
      userLabel: "",
      userNumber: 0,
      cardNumber: 0,
      strength: 0,
      note: "",
    };
  }

  if (!candidates.length) {
    return {
      type: "neutral",
      typeLabel: "중립",
      userKey: "",
      userLabel: "",
      userNumber: 0,
      cardNumber: Number(cardNumerology?.reducedNumber) || 0,
      strength: 0,
      note: "",
    };
  }

  candidates.sort((a, b) => RELATION_RANK[b.type] - RELATION_RANK[a.type]);
  const best = candidates[0];
  const typeLabel = { resonance: "공명", tension: "긴장", complement: "보완" }[best.type] || "중립";
  return {
    type: best.type,
    typeLabel,
    userKey: best.key,
    userLabel: best.label,
    userNumber: best.userNumber,
    cardNumber: best.cardNumber,
    strength: candidates.filter((item) => item.type === best.type).length,
    note: best.note,
  };
}

/**
 * 스프레드 총합수(Quintessence).
 * 5장의 카드 번호를 모두 더한 뒤 21 이하가 될 때까지 각 자리 수를 더한다.
 * 결과 번호에 해당하는 메이저 아르카나가 이번 상담 전체를 총괄하는 한 장이다.
 */
function buildQuintessence(cards = [], deck = []) {
  const numbers = cards
    .map((entry) => Number(entry?.card?.id ?? entry?.id))
    .filter((num) => Number.isFinite(num) && num >= 0);
  if (!numbers.length) return null;

  const rawSum = numbers.reduce((sum, num) => sum + num, 0);
  let total = rawSum;
  while (total > 21) {
    total = String(total).split("").reduce((sum, digit) => sum + Number(digit), 0);
  }
  const card = deck.find((item) => Number(item?.id) === total) || null;
  const reduced = total === 0 ? 0 : reduceNumber(total, false);
  return {
    rawSum,
    arcanaNumber: total,
    reducedNumber: reduced,
    card,
    cardName: toText(card?.nameKr || card?.name),
    voice: getNumberVoice(reduced || 9),
  };
}

/**
 * 포지션의 역할. 9개 주제의 5자리 스프레드가 공통으로 따르는 서사 축이다.
 * 실제 자리 이름(SPREAD_POSITIONS[topic][index])을 문장에 그대로 끼워 넣으므로
 * 주제별로 다른 문구를 따로 쓰지 않아도 금전·건강 상담에서 연애 문구가 나오지 않는다.
 */
const POSITION_ROLES = [
  {
    slot: "출발",
    reads: (label) => `지금 ${label}${wordParticle(label, "이", "가")} 어디에 있는지`,
    lens: "여기서 나온 수는 이번 흐름이 시작된 지점의 성격을 말합니다.",
    focus: "출발점",
  },
  {
    slot: "반응",
    reads: (label) => `${label}${wordParticle(label, "이", "가")} 실제로 어떻게 돌아오는지`,
    lens: "여기서 나온 수는 내가 보낸 것에 상황이 어떤 방식으로 답하는지를 말합니다.",
    focus: "돌아오는 반응",
  },
  {
    slot: "장애물",
    reads: (label) => `${label}${wordParticle(label, "이", "가")} 어디서 반복해 걸리는지`,
    lens: "여기서 나온 수는 같은 자리에서 되풀이되는 걸림돌의 정체를 말합니다.",
    focus: "반복되는 걸림",
  },
  {
    slot: "방법",
    reads: (label) => `${label}${wordParticle(label, "을", "를")} 어떻게 다루면 좋은지`,
    lens: "여기서 나온 수는 이번 국면에서 실제로 통하는 태도와 방법을 말합니다.",
    focus: "통하는 방법",
  },
  {
    slot: "결과",
    reads: (label) => `${label}${wordParticle(label, "이", "가")} 어디로 향하는지`,
    lens: "여기서 나온 수는 지금 태도를 유지했을 때 도착하는 방향을 말합니다.",
    focus: "향하는 방향",
  },
];

function getPositionRole(index) {
  return POSITION_ROLES[index] || POSITION_ROLES[POSITION_ROLES.length - 1];
}

/**
 * 카드의 수와 상담자의 수를 잇는 다리 문장 — 이 엔진의 핵심 산출물.
 * 관계 유형(공명/보완/긴장/중립)마다 완전히 다른 이야기를 한다.
 */
function buildNumerologyBridge({ cardNumerology, relation, cardName, orientation, positionLabel, index }) {
  const role = getPositionRole(index);
  const reversed = orientation === "reversed";
  // 🔴 "수로 줄이면 N" 은 반드시 산술 축약값이어야 한다.
  // relation.cardNumber 는 카드가 함께 품은 수(card.numbers)일 수 있어, 그대로 쓰면
  // "17번 카드, 수로 줄이면 11" 같은 계산이 틀린 문장이 나온다(17 → 8).
  const reduced = Number(cardNumerology.reducedNumber) || 0;
  const matched = Number(relation.cardNumber) || 0;
  const cardVoice = getNumberVoice(matched || reduced || 9);
  const userVoice = getNumberVoice(relation.userNumber);
  const shade = reversed ? cardVoice.shadow : cardVoice.core;
  const subject = `'${cardName}'${wordParticle(cardName, "은", "는")}`;

  const head = cardNumerology.isZero
    ? `${subject} 0번, 아직 어떤 수도 확정되지 않은 자리입니다.`
    : [
      `${subject} ${cardNumerology.arcanaNumber}번 카드, 수로 줄이면 ${reduced}입니다.`,
      matched && matched !== reduced
        ? `이 카드가 함께 품은 수로는 ${matched}${numberParticle(matched, "이", "가")} 있습니다.`
        : "",
    ].filter(Boolean).join(" ");

  if (cardNumerology.isZero) {
    return [
      head,
      `그래서 ${positionLabel} 자리에서는 정해진 답을 확인하는 것이 아니라, 아직 열려 있는 선택지를 세는 편이 맞습니다.`,
      reversed
        ? "역방향이라 시작하고 싶은 마음은 있는데 첫 조건이 아직 갖춰지지 않은 상태로 봅니다."
        : "정방향이라 준비가 덜 되었더라도 먼저 발을 딛는 쪽이 흐름을 엽니다.",
    ].join(" ");
  }

  const matchedPhrase = matched && matched !== reduced ? `그중 ${matched}${numberParticle(matched, "은", "는")}` : "이 수는";

  if (relation.type === "resonance") {
    return [
      head,
      `${matchedPhrase} ${sitterNumberPhrase(relation)} 같습니다 — 이 자리는 남의 사정이 아니라 ${sitterOwnPhrase(relation)} 그대로 드러난 자리입니다.`,
      `${shade}${wordParticle(shade, "이", "가")} ${role.reads(positionLabel)}를 결정합니다.`,
      reversed
        ? `내 결이 그대로 나온 만큼 잘 쓰면 가장 강한 자리지만, 지금은 '${cardVoice.keyword}'의 그림자 쪽이 먼저 나와 있습니다.`
        : `자기 결과 맞물린 자리라 억지로 다른 방식을 흉내 내지 않는 편이 결과가 좋습니다.`,
    ].join(" ");
  }

  if (relation.type === "complement") {
    return [
      head,
      `${matchedPhrase} ${sitterNumberPhrase(relation)} ${relation.note}.`,
      `${cardVoice.arena}의 힘이 ${userVoice.arena}의 자리를 받쳐 주는 구조라, ${role.reads(positionLabel)}에서 혼자 애쓰지 않아도 되는 지점이 생깁니다.`,
      reversed
        ? `다만 역방향이라 도움이 들어오는 속도가 늦습니다. ${cardVoice.shadow}${wordParticle(cardVoice.shadow, "으로", "로")} 기울지 않게만 지키면 됩니다.`
        : `받쳐 주는 힘이 이미 와 있으니 이 자리에서는 기다리기보다 손을 내미는 쪽이 빠릅니다.`,
    ].join(" ");
  }

  if (relation.type === "tension") {
    return [
      head,
      `그런데 ${matchedPhrase} ${sitterNumberPhrase(relation, "과는", "와는")} 결이 부딪칩니다 — ${relation.note}이 같은 자리를 두고 다투는 구간입니다.`,
      `${role.lens} 그래서 ${positionLabel}${wordParticle(positionLabel, "은", "는")} 잘 풀리지 않는 자리가 아니라, 이번 질문이 진짜로 묻고 있는 자리입니다.`,
      reversed
        ? `역방향이라 그 다툼이 밖으로 드러나지 않고 안에서 눌려 있습니다. ${cardVoice.shadow}${wordParticle(cardVoice.shadow, "이", "가")} 먼저 나오기 쉬우니 미루지 마세요.`
        : `"${cardVoice.ask}" — 이 질문에 답이 나오면 이 자리는 풀립니다.`,
    ].join(" ");
  }

  return [
    head,
    `이 수는 당신의 생명수·오늘수·질문수 어느 쪽과도 직접 겹치지 않습니다.`,
    `그래서 ${positionLabel}${wordParticle(positionLabel, "은", "는")} 익숙한 습관 안쪽이 아니라 바깥에서 들어온 조언으로 읽어야 정확합니다. ${shade}${wordParticle(shade, "이", "가")} 새 각도를 만듭니다.`,
    reversed
      ? "역방향이라 그 조언이 아직 낯설게 느껴질 수 있습니다. 판단은 뒤로 미루고 관찰만 해 두세요."
      : "낯설다고 흘려보내지 말고, 평소 방식과 어떻게 다른지부터 비교해 보세요.",
  ].join(" ");
}

function sitterNumberPhrase(relation, withFinal = "과", withoutFinal = "와") {
  if (!relation.userLabel) return `당신의 수${withoutFinal}`;
  return `당신의 ${relation.userLabel} ${relation.userNumber}${numberParticle(relation.userNumber, withFinal, withoutFinal)}`;
}

function sitterOwnPhrase(relation) {
  if (relation.userKey === "personalDayNumber") return "오늘 당신의 상태가";
  if (relation.userKey === "questionNumber") return "이번 질문 자체의 결이";
  return "당신의 타고난 결이";
}


/** 총합수와 생명수를 견줘 이번 상담 전체의 결론 축을 만든다. */
function buildQuintessenceReading(quintessence, numerology = {}, topicLabel = "이번 질문") {
  if (!quintessence) return null;
  const lifePath = Number(numerology?.lifePathNumber) || 0;
  const q = quintessence.reducedNumber || 0;
  const voice = quintessence.voice;
  const lifeVoice = getNumberVoice(lifePath);
  const relation = resolveNumberRelation(
    { allNumbers: [q], reducedNumber: q, isZero: q === 0 },
    { lifePathNumber: lifePath },
  );

  // 생명수가 마스터수(11·22·33)면 축약값으로 견주므로, 어떻게 같아졌는지를 문장에 밝힌다.
  const lifePathReduced = reduceNumber(lifePath, false);
  const lifePathNote = lifePathReduced !== lifePath ? `(${lifePath} → ${lifePathReduced})` : "";

  const verdict = (() => {
    if (relation.type === "resonance") {
      return `총괄 카드의 수 ${q}${numberParticle(q, "은", "는")} 생명수 ${lifePath}${lifePathNote}${numberParticle(lifePathReduced, "과", "와")} 같은 수입니다. 이번 국면은 새로운 과제가 아니라 당신이 원래 잘 다루던 주제가 다시 돌아온 자리입니다. 낯선 방법을 찾기보다 이미 통했던 방식을 다시 꺼내는 쪽이 빠릅니다.`;
    }
    if (relation.type === "tension") {
      return `총괄 카드의 수 ${q}${numberParticle(q, "은", "는")} 생명수 ${lifePath}${lifePathNote}${numberParticle(lifePathReduced, "과", "와")} 결이 부딪칩니다 — ${relation.note}이 맞물린 국면입니다. 이번 질문이 어려운 이유는 상황이 나빠서가 아니라, 평소 방식이 이번에는 잘 안 먹히기 때문입니다.`;
    }
    if (relation.type === "complement") {
      return `총괄 카드의 수 ${q}${numberParticle(q, "은", "는")} 생명수 ${lifePath}${numberParticle(lifePath, "을", "를")} 받쳐 줍니다. ${lifeVoice.arena}에서 부족했던 부분을 ${voice.arena}의 힘이 메우는 구조라, 지금은 혼자 밀어붙이기보다 흐름에 올라타는 편이 유리합니다.`;
    }
    return `총합수 ${q}${numberParticle(q, "은", "는")} 생명수 ${lifePath}${numberParticle(lifePath, "과", "와")} 직접 겹치지 않습니다. 이번 국면은 당신의 익숙한 영역 바깥에서 온 주제이므로, 평소 감각보다 확인된 사실을 앞세우는 편이 안전합니다.`;
  })();

  return {
    label: "스프레드 총합수",
    rawSum: quintessence.rawSum,
    arcanaNumber: quintessence.arcanaNumber,
    reducedNumber: q,
    cardName: quintessence.cardName,
    keyword: voice.keyword,
    headline: quintessence.cardName
      ? `다섯 장을 모두 더하면 ${quintessence.rawSum}, 줄이면 ${quintessence.arcanaNumber}번 '${quintessence.cardName}'입니다.`
      : `다섯 장을 모두 더하면 ${quintessence.rawSum}, 줄이면 ${quintessence.arcanaNumber}입니다.`,
    summary: [
      `이 한 장이 ${topicLabel} 상담 전체를 총괄하는 카드입니다.`,
      `${voice.core}${wordParticle(voice.core, "이", "가")} 이번 흐름의 중심축입니다.`,
      verdict,
    ].join(" "),
    advice: voice.act,
    relationType: relation.type,
  };
}

/** 다섯 자리에 나온 수의 분포를 읽어 이번 스프레드의 무게중심을 찾는다. */
function buildNumberPattern(cardNumerologies = []) {
  const counts = new Map();
  cardNumerologies.forEach((item) => {
    const num = item?.isZero ? 0 : Number(item?.reducedNumber);
    if (!Number.isFinite(num)) return;
    counts.set(num, (counts.get(num) || 0) + 1);
  });
  const repeated = [...counts.entries()].filter(([, count]) => count >= 2).sort((a, b) => b[1] - a[1]);
  if (!repeated.length) {
    return {
      repeatedNumbers: [],
      summary: "다섯 자리의 수가 서로 겹치지 않고 흩어져 있습니다. 한 가지 원인으로 좁히기보다, 자리마다 다른 이야기를 하고 있다고 보는 편이 맞습니다.",
    };
  }
  const [num, count] = repeated[0];
  const voice = getNumberVoice(num || 9);
  return {
    repeatedNumbers: repeated.map(([value, times]) => ({ number: value, times })),
    summary: `다섯 자리 중 ${count}자리에서 같은 수 ${num}${numberParticle(num, "이", "가")} 반복됩니다. ${voice.arena}${wordParticle(voice.arena, "이", "가")} 이번 스프레드의 무게중심이고, 다른 자리의 이야기도 결국 여기로 모입니다. ${voice.act}`,
  };
}

export {
  NUMBER_VOICES,
  POSITION_ROLES,
  TENSION_PAIRS,
  buildNumberPattern,
  buildNumerologyBridge,
  buildQuintessence,
  buildQuintessenceReading,
  getCardNumerology,
  getNumberVoice,
  getPositionRole,
  numberParticle,
  reduceNumber,
  resolveNumberRelation,
  wordParticle,
};
