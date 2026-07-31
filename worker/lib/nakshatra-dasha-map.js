// 나크샤트라 다샤 인생지도 (₩15,000) — 결정론 조립 엔진.
//
// 비쇼타리 다샤(120년)의 마하다샤 전 구간과 그 안의 안타르다샤 9구간을 모두 펼치고,
// 같은 연도 축에 동양 사주 대운(10년 주기)을 나란히 놓는다. LLM 을 쓰지 않는다 —
// 같은 생년월일이면 언제나 같은 지도가 나와야 하는 재열람 콘텐츠이기 때문이다.
//
// 계산은 하지 않는다. 호출부가 넘겨주는 값만 엮는다:
//   dasha     = worker/lib/vedic-derived-calculations.js buildVimshottariDasha() 결과
//   majorLuck = worker/lib/life-book-ai-saju.js calculateLifeBookAiSaju().majorLuck (절기 기반 대운)
//
// 🔴 buildSubDasha 는 "지금 구간" 하나만 돌려준다. 인생지도는 전 구간이 필요하므로
//    같은 비례식(안타르 길이 = 마하 길이 × 그라하 연수/120)을 여기서 전개한다.

import { DASHA_ORDER, DASHA_YEARS, GRAHA_KO } from "./vedic-derived-calculations.js";
import { getNakshatraAttributes } from "../../constants/nakshatra-attributes.js";

// 다샤 기간의 성격 — 출생 차트의 지배성 해석(nakshatra-lord-report.js)과는 다른 층이다.
// 저쪽이 "타고난 결"이라면 이쪽은 "그 몇 년 동안 삶이 무엇을 요구하는가"다.
const DASHA_FIELD = {
  Sun: {
    title: "자리를 정하는 시기",
    focus: "정체성 · 권위 · 인정",
    opens: "이름을 내걸 기회가 옵니다. 승진, 독립, 대표 자리, 내 것이라 말할 수 있는 결과물.",
    demands: "누구의 사람인지가 아니라 내가 누구인지를 답해야 합니다. 소속에 기대던 자존이 흔들립니다.",
    caution: "인정이 늦어질 때 관계를 밀어내는 방식으로 반응하기 쉽습니다. 아버지·상사·권위와의 관계가 표면으로 올라옵니다.",
  },
  Moon: {
    title: "마음을 돌보는 시기",
    focus: "정서 · 가정 · 돌봄",
    opens: "사람이 모입니다. 가정과 거주지, 돌봄과 관계의 밀도가 삶의 중심으로 들어옵니다.",
    demands: "성과보다 상태를 관리해야 합니다. 감정을 미뤄 둔 대가가 이 시기에 청구됩니다.",
    caution: "기복이 커집니다. 결정을 기분이 좋은 날에 몰아 하지 말고, 큰 선택은 며칠 재워 두는 편이 낫습니다.",
  },
  Mars: {
    title: "밀어붙이는 시기",
    focus: "실행 · 경쟁 · 개척",
    opens: "닫혀 있던 문을 힘으로 여는 시기입니다. 창업, 이직, 기술 습득, 몸을 쓰는 성취.",
    demands: "미루던 싸움을 하게 됩니다. 피하면 상황이 대신 밀고 들어옵니다.",
    caution: "속도와 마찰이 함께 올라갑니다. 사고·수술·분쟁·계약 갈등이 잦아지는 구간이라 서류와 안전을 두 번 확인할 것.",
  },
  Mercury: {
    title: "말과 거래의 시기",
    focus: "학습 · 소통 · 계약",
    opens: "배우고 연결하는 일이 잘 풀립니다. 시험, 자격, 협상, 글·콘텐츠, 새로운 인맥.",
    demands: "여러 갈래를 동시에 다루게 됩니다. 정리하는 능력이 곧 성과가 됩니다.",
    caution: "말이 많아지고 일이 흩어집니다. 벌인 것 중 무엇을 접을지 정하는 것이 이 시기의 핵심 결정입니다.",
  },
  Jupiter: {
    title: "넓히고 배우는 시기",
    focus: "성장 · 스승 · 의미",
    opens: "기회가 큰 단위로 옵니다. 진학·유학·이주, 결혼과 출산, 조직의 확대, 좋은 스승과의 만남.",
    demands: "규모가 커진 만큼 책임의 무게도 커집니다. 감당할 수 있는 크기를 스스로 정해야 합니다.",
    caution: "낙관이 검증을 건너뜁니다. 좋아 보이는 제안일수록 숫자를 직접 확인할 것.",
  },
  Venus: {
    title: "관계와 아름다움의 시기",
    focus: "애정 · 감각 · 풍요",
    opens: "사랑, 예술, 취향, 생활의 질이 좋아집니다. 결혼·동업·협업처럼 둘이 하는 일이 잘 맞습니다.",
    demands: "누구와 함께할 것인가를 고르게 됩니다. 미뤄 둔 관계의 결론이 이 시기에 납니다.",
    caution: "편안함에 오래 머물면 일의 긴장이 풀립니다. 즐거움과 나태의 경계를 스스로 그어야 합니다.",
  },
  Saturn: {
    title: "구조를 다지는 시기",
    focus: "책임 · 시간 · 정리",
    opens: "오래 갈 것이 만들어집니다. 자격, 자산, 직책, 시스템 — 느리지만 무너지지 않는 성과.",
    demands: "감당해야 할 것을 감당하게 됩니다. 미뤄 둔 의무와 건강, 정리하지 못한 관계가 차례로 옵니다.",
    caution: "속도가 눈에 띄게 느려집니다. 이 시기의 정체를 실패로 읽으면 가장 중요한 축적을 스스로 중단하게 됩니다.",
  },
  Rahu: {
    title: "낯선 곳으로 건너가는 시기",
    focus: "확장 · 이질 · 욕망",
    opens: "전례 없는 기회가 옵니다. 해외, 새로운 산업, 큰 판, 갑작스러운 도약.",
    demands: "익숙한 자리를 떠나야 합니다. 머물면 답답함이 성과를 갉아먹습니다.",
    caution: "진폭이 가장 큰 구간입니다. 과장된 약속과 급한 확대에 주의하고, 손실 한도를 숫자로 정해 둘 것.",
  },
  Ketu: {
    title: "덜어내는 시기",
    focus: "정리 · 내면 · 전환",
    opens: "군더더기가 떨어져 나갑니다. 깊이 파고드는 공부와 기술, 수행, 치유의 성취.",
    demands: "붙잡고 있던 것을 놓게 됩니다. 관계·직책·물건 중 무엇이 진짜 내 것인지 가려집니다.",
    caution: "동기가 낮아지고 세상일이 시들해집니다. 우울로 오해하기 쉬우나 방향 전환의 신호인 경우가 많습니다.",
  },
};

// 안타르다샤(부주기)가 마하다샤에 입히는 색.
const ANTAR_TONE = {
  Sun: "주도권을 쥐려는 힘이 얹힙니다",
  Moon: "감정과 사람 문제가 앞으로 나옵니다",
  Mars: "속도가 붙고 마찰도 함께 올라갑니다",
  Mercury: "협상·계약·학습으로 국면이 풀립니다",
  Jupiter: "판이 커지고 도와주는 사람이 나타납니다",
  Venus: "관계와 즐거움이 중심으로 들어옵니다",
  Saturn: "속도가 느려지고 책임이 늘어납니다",
  Rahu: "예상 밖의 변수가 판을 흔듭니다",
  Ketu: "정리와 이탈의 압력이 커집니다",
};

const MS_PER_DAY = 86400000;

function toDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

function ko(lord) {
  return GRAHA_KO[lord] || lord || "";
}

function ageAt(date, birthUtc) {
  if (!date || !birthUtc) return null;
  return Math.floor((date.getTime() - birthUtc.getTime()) / MS_PER_DAY / 365.2425);
}

/**
 * 마하다샤 한 구간의 안타르다샤 9구간을 전부 전개한다.
 * buildSubDasha 와 같은 비례식이되, "현재" 하나가 아니라 전체를 돌려준다.
 */
export function expandAntardashas(period, now) {
  const start = toDate(period?.start);
  const end = toDate(period?.end);
  if (!start || !end) return [];
  const totalMs = end.getTime() - start.getTime();
  if (!(totalMs > 0)) return [];

  const parentIndex = DASHA_ORDER.indexOf(period.lord);
  if (parentIndex < 0) return [];

  const out = [];
  let cursor = new Date(start.getTime());
  for (let i = 0; i < DASHA_ORDER.length; i += 1) {
    const lord = DASHA_ORDER[(parentIndex + i) % DASHA_ORDER.length];
    const next = new Date(cursor.getTime() + totalMs * (DASHA_YEARS[lord] / 120));
    out.push({
      lord,
      lordKo: ko(lord),
      startDate: ymd(cursor),
      endDate: ymd(next),
      years: Math.round(((next.getTime() - cursor.getTime()) / MS_PER_DAY / 365.2425) * 100) / 100,
      tone: ANTAR_TONE[lord] || "",
      isCurrent: Boolean(now && cursor <= now && now < next),
    });
    cursor = next;
  }
  return out;
}

// 같은 연도 구간을 공유하는 사주 대운을 찾아 붙인다(겹치는 것 전부).
function overlappingLuckCycles(cycles, startYear, endYear) {
  if (!Array.isArray(cycles)) return [];
  return cycles
    .filter((cycle) => Number(cycle?.endYear) >= startYear && Number(cycle?.startYear) <= endYear)
    .map((cycle) => ({
      pillar: cycle.pillar || "",
      startYear: Number(cycle.startYear) || 0,
      endYear: Number(cycle.endYear) || 0,
      startAge: Number(cycle.startAge) || 0,
      endAge: Number(cycle.endAge) || 0,
      tenGod: cycle.stemTenGod || "",
      isCurrent: cycle.isCurrent === true,
    }));
}

function buildPeriods(dasha, majorLuck, birthUtc, now) {
  const timeline = Array.isArray(dasha?.timeline) ? dasha.timeline : [];
  const cycles = majorLuck?.available ? majorLuck.cycles : [];

  return timeline.map((period, index) => {
    const start = toDate(period.start);
    const end = toDate(period.end);
    const field = DASHA_FIELD[period.lord] || null;
    const startYear = start ? start.getUTCFullYear() : 0;
    const endYear = end ? end.getUTCFullYear() : 0;
    const antardashas = expandAntardashas(period, now);
    return {
      index,
      lord: period.lord,
      lordKo: ko(period.lord),
      title: field ? field.title : "",
      focus: field ? field.focus : "",
      opens: field ? field.opens : "",
      demands: field ? field.demands : "",
      caution: field ? field.caution : "",
      startDate: period.startDate,
      endDate: period.endDate,
      startYear,
      endYear,
      startAge: ageAt(start, birthUtc),
      endAge: ageAt(end, birthUtc),
      years: period.years,
      isCurrent: Boolean(start && end && now >= start && now < end),
      isPast: Boolean(end && now >= end),
      antardashas,
      easternCycles: overlappingLuckCycles(cycles, startYear, endYear),
    };
  });
}

function buildCurrentReading(periods, dasha) {
  const current = periods.find((period) => period.isCurrent) || null;
  if (!current) return null;
  const antar = current.antardashas.find((sub) => sub.isCurrent) || null;
  const eastern = current.easternCycles.find((cycle) => cycle.isCurrent) || null;

  const lines = [];
  lines.push(`지금 당신은 ${current.lordKo} 대주기 안에 있습니다 — ${current.title}. ${current.startDate}부터 ${current.endDate}까지, ${current.startAge}세에서 ${current.endAge}세에 걸치는 구간입니다.`);
  lines.push(`이 시기가 여는 것 — ${current.opens}`);
  lines.push(`이 시기가 요구하는 것 — ${current.demands}`);
  if (antar) {
    lines.push(`그 안의 부주기(안타르다샤)는 ${antar.lordKo}입니다(${antar.startDate} ~ ${antar.endDate}). ${current.lordKo}의 큰 흐름 위에 ${antar.tone}. 대주기가 무대라면 부주기는 그 무대에서 지금 벌어지는 장면입니다.`);
  }
  if (eastern) {
    lines.push(`같은 시기의 동양 대운은 ${eastern.pillar}${eastern.tenGod ? `(${eastern.tenGod})` : ""} — ${eastern.startAge}세부터 ${eastern.endAge}세까지입니다. 두 체계는 주기의 길이도 계산법도 다르지만, 지금 이 몇 년을 각자의 언어로 같은 자리에 표시하고 있습니다.`);
  }
  lines.push(`주의할 대목 — ${current.caution}`);
  return {
    mahadashaLord: current.lord,
    mahadashaLordKo: current.lordKo,
    antardashaLord: antar ? antar.lord : (dasha?.currentAntardasha || ""),
    antardashaLordKo: antar ? antar.lordKo : ko(dasha?.currentAntardasha),
    easternPillar: eastern ? eastern.pillar : "",
    paragraphs: lines,
  };
}

function buildNarrative(periods, dasha, attrs, majorLuck) {
  const sections = [];

  sections.push({
    id: "howToRead",
    title: "이 지도를 읽는 법",
    icon: "◎",
    keyInsight: "다샤는 예언이 아니라 과제의 시간표입니다",
    paragraphs: [
      `비쇼타리 다샤는 태어난 순간 달이 어느 나크샤트라의 어디쯤에 있었는지로 시작점을 정합니다. 당신의 달은 ${attrs ? attrs.nameKo : "본명 나크샤트라"}에 있었고, 그 별의 주인인 ${ko(dasha?.firstDashaLord)}부터 120년의 순환이 시작됩니다. 태어날 때 이미 그 구간의 일부가 지나 있었으므로 첫 주기는 ${dasha?.birthDashaBalanceYears ?? "-"}년이 남은 상태에서 출발했습니다.`,
      `아홉 그라하가 정해진 순서와 정해진 길이로 돌아갑니다 — 케투 7년, 금성 20년, 태양 6년, 달 10년, 화성 7년, 라후 18년, 목성 16년, 토성 19년, 수성 17년. 합이 120년이고, 순서는 누구에게나 같습니다. 사람마다 다른 것은 어디서 시작하느냐뿐입니다.`,
      `각 대주기는 다시 아홉 개의 부주기(안타르다샤)로 나뉘고, 그 비율도 같은 원리를 따릅니다. 아래 지도에서 대주기를 펼치면 그 안의 아홉 장면이 모두 보입니다.`,
      `한 가지만 분명히 해 두겠습니다. 다샤는 무슨 일이 일어날지를 정하지 않습니다. 어떤 종류의 과제가 표면으로 올라오는지를 말할 뿐입니다. 같은 토성 대주기가 누군가에게는 자격증과 집이 되고 누군가에게는 소모로 끝나는 이유가 여기 있습니다.`,
    ],
  });

  const past = periods.filter((period) => period.isPast);
  if (past.length) {
    const recent = past.slice(-3);
    sections.push({
      id: "lookingBack",
      title: "지나온 길",
      icon: "◐",
      keyInsight: `${past.length}개 대주기를 지나 여기까지 왔습니다`,
      paragraphs: [
        `지도를 읽는 가장 확실한 검증은 이미 지나온 구간을 되짚어 보는 것입니다. 맞는 것 같으면 앞으로의 구간도 같은 방식으로 읽으시면 됩니다.`,
        ...recent.map((period) => `${period.startAge}세 ~ ${period.endAge}세 · ${period.lordKo} 대주기 — ${period.title}. ${period.demands}`),
        `기억나는 전환점이 이 경계들 근처에 있다면, 그것이 우연이 아니라 주기의 마디였을 가능성이 있습니다. 특히 대주기가 바뀌는 해의 앞뒤 1~2년은 삶의 무대가 통째로 바뀌는 구간으로 봅니다.`,
      ],
    });
  }

  const upcoming = periods.filter((period) => !period.isPast && !period.isCurrent).slice(0, 3);
  if (upcoming.length) {
    sections.push({
      id: "lookingAhead",
      title: "다가오는 시기",
      icon: "◑",
      keyInsight: upcoming[0] ? `다음 무대는 ${upcoming[0].lordKo} — ${upcoming[0].startYear}년부터` : "",
      paragraphs: [
        `앞으로의 구간은 대비의 자료로 쓰시면 됩니다. 좋고 나쁨이 아니라, 그 시기에 무엇을 준비해 두면 덜 흔들리는가를 보는 눈으로 읽으십시오.`,
        ...upcoming.map((period) => `${period.startYear}년(${period.startAge}세)부터 ${period.endYear}년(${period.endAge}세)까지 · ${period.lordKo} 대주기 — ${period.title}. ${period.opens} 주의할 것은 ${period.caution}`),
      ],
    });
  }

  // 대주기 경계는 이 지도에서 가장 실용적인 정보다 — 언제 무대가 바뀌는지가 한눈에 보여야 한다.
  const boundaries = periods.slice(1).filter((period) => period.startAge != null && period.startAge <= 95);
  if (boundaries.length) {
    sections.push({
      id: "turningPoints",
      title: "무대가 바뀌는 해",
      icon: "⌖",
      keyInsight: `대주기 전환 ${boundaries.length}회 — 앞뒤 1~2년이 실제 전환 구간입니다`,
      paragraphs: [
        `대주기가 바뀌는 해는 삶의 무대 자체가 교체되는 시점입니다. 직업·거주지·관계의 구성이 이 마디를 전후로 크게 달라지는 경우가 많고, 변화는 보통 경계 연도 하나가 아니라 그 앞뒤 1~2년에 걸쳐 일어납니다.`,
        boundaries
          .map((period) => `${period.startYear}년(${period.startAge}세) — ${period.lordKo} 대주기 시작 · ${period.title}`)
          .join(" / "),
        `이 목록에서 이미 지나온 연도를 먼저 확인해 보십시오. 그 무렵에 실제로 큰 변화가 있었다면, 아직 오지 않은 연도도 같은 무게로 읽으시면 됩니다. 반대로 지나온 경계에서 아무 일도 없었다면 이 지도는 당신에게 느슨하게 작동하는 편이니, 참고 자료 정도로 두시는 편이 맞습니다.`,
        `한 가지 덧붙이면, 짧은 대주기(태양 6년, 케투 7년, 화성 7년)는 체감이 빠르고 강렬한 대신 금방 지나갑니다. 긴 대주기(금성 20년, 토성 19년, 라후 18년, 수성 17년, 목성 16년)는 그 안에서 부주기의 변화를 따로 보지 않으면 몇 년째 같은 자리에 있는 것처럼 느껴집니다. 긴 구간에 있다면 아래 지도에서 부주기를 펼쳐 보십시오.`,
      ],
    });
  }

  sections.push({
    id: "twoClocks",
    title: "두 개의 시계",
    icon: "⚖",
    keyInsight: majorLuck?.available
      ? `비쇼타리 120년 × 동양 대운 ${majorLuck.direction} 10년`
      : "동양 대운은 성별 정보가 있어야 순행·역행이 정해집니다",
    paragraphs: majorLuck?.available
      ? [
        `인도와 동양은 시간을 다르게 셉니다. 비쇼타리는 달의 위치에서 출발해 아홉 그라하가 6년에서 20년까지 서로 다른 길이로 도는 불균등한 시계이고, 사주 대운은 절기를 기준으로 열 살 단위로 균등하게 흐르는 시계입니다.`,
        `당신의 대운은 ${majorLuck.direction}이고 ${majorLuck.startSolarDate}부터 시작합니다. 태어난 절기까지의 거리로 정해지는 값이라 사람마다 다릅니다.`,
        `두 시계를 겹쳐 보는 이유는 예측을 두 배로 하기 위해서가 아닙니다. 두 체계가 같은 시기를 두고 비슷한 말을 할 때 그 대목은 무게를 더 실어 볼 만하고, 서로 다른 말을 할 때는 그 시기가 한 문장으로 요약되지 않는 복합적인 구간이라는 뜻입니다. 아래 지도에서 각 대주기에 겹치는 대운을 함께 표시해 두었습니다.`,
      ]
      : [
        `동양 대운은 절기를 기준으로 열 살 단위로 흐르며, 순행인지 역행인지가 성별과 연간(年干)의 음양으로 정해집니다.`,
        `이번 입력에는 성별이 없어 방향을 단정하지 않았습니다. 근거 없이 한쪽을 고르면 나머지 열 개 구간이 통째로 어긋나기 때문입니다. 성별을 포함해 다시 열면 비쇼타리 옆에 대운이 나란히 표시됩니다.`,
        `그때까지는 인도 축만으로도 지도는 온전히 읽힙니다 — 비쇼타리는 성별을 쓰지 않는 체계입니다.`,
      ],
  });

  sections.push({
    id: "practice",
    title: "지도를 쓰는 법",
    icon: "✧",
    keyInsight: "주기가 바뀌는 해 앞뒤 1~2년이 실제로 움직일 구간입니다",
    paragraphs: [
      `첫째, 대주기의 경계 연도를 달력에 표시해 두십시오. 큰 결정(이직·이주·결혼·창업)을 그 경계에 맞추면 흐름을 거스르지 않고 탈 수 있습니다.`,
      `둘째, 지금 부주기의 성격을 이번 분기의 운영 원칙으로 삼으십시오. 대주기는 몇 년짜리라 체감이 어렵지만 부주기는 몇 달에서 몇 년이라 실제로 계획에 반영됩니다.`,
      `셋째, 주의 항목은 금지가 아니라 점검표입니다. 화성 구간에 서류를 두 번 보고 라후 구간에 손실 한도를 정해 두는 정도면 대부분의 사고는 예방됩니다.`,
      `넷째, 나쁜 주기는 없습니다. 토성과 케투 구간처럼 느리고 덜어내는 시기가 인생에서 가장 단단한 것을 남기는 경우가 많습니다. 속도가 떨어졌다는 이유로 방향까지 바꾸지 마십시오.`,
      `다섯째, 이 지도는 출생 순간 달의 위치 하나로 계산됩니다. 태어난 시각이 정확할수록 경계 연도가 정확해지고, 시각이 몇 시간 어긋나면 경계가 한두 해 밀립니다. 지나온 구간이 잘 맞지 않는다면 먼저 출생 시각을 의심해 보시는 편이 순서입니다.`,
      `마지막으로, 주기가 무엇을 요구하는지 알았다고 해서 그것을 다 해야 하는 것은 아닙니다. 요구를 알고 있으면 언제 힘을 쓰고 언제 아껴야 하는지가 정해집니다. 이 지도가 실제로 쓰이는 지점은 거기입니다.`,
    ],
  });

  return sections;
}

function countChars(sections, current) {
  let total = 0;
  for (const section of sections) {
    total += String(section.title || "").length + String(section.keyInsight || "").length;
    for (const paragraph of section.paragraphs || []) total += String(paragraph || "").length;
  }
  for (const paragraph of current?.paragraphs || []) total += String(paragraph || "").length;
  return total;
}

/**
 * 다샤 인생지도 조립.
 *
 * @param {{ dasha:object, majorLuck:(object|null), nakIndex:(number|null), birthUtc:Date, now:Date }} input
 * @returns {object|null} 타임라인이 없으면 null
 */
export function buildNakshatraDashaMap({ dasha, majorLuck = null, nakIndex = null, birthUtc, now = new Date() }) {
  if (!dasha || !Array.isArray(dasha.timeline) || !dasha.timeline.length) return null;
  const birth = toDate(birthUtc);
  if (!birth) return null;

  const attrs = nakIndex == null ? null : getNakshatraAttributes(nakIndex);
  const periods = buildPeriods(dasha, majorLuck, birth, now);
  const current = buildCurrentReading(periods, dasha);
  const sections = buildNarrative(periods, dasha, attrs, majorLuck);

  return {
    meta: {
      nakshatraKo: attrs ? attrs.nameKo : "",
      nakshatraEn: attrs ? attrs.nameEn : "",
      firstDashaLord: dasha.firstDashaLord || "",
      firstDashaLordKo: ko(dasha.firstDashaLord),
      birthBalanceYears: dasha.birthDashaBalanceYears ?? null,
      periodCount: periods.length,
      antardashaCount: periods.reduce((sum, period) => sum + period.antardashas.length, 0),
      easternAvailable: majorLuck?.available === true,
      easternDirection: majorLuck?.available ? majorLuck.direction : "",
      easternStartDate: majorLuck?.available ? majorLuck.startSolarDate : "",
      easternUnavailableReason: majorLuck?.available ? "" : String(majorLuck?.reason || ""),
    },
    current,
    periods,
    sections,
    charCount: countChars(sections, current),
  };
}

export const __nakshatraDashaMapTestUtils = { DASHA_FIELD, ANTAR_TONE, expandAntardashas };
