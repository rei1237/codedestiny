/**
 * 기간별 "이 페이지는 무엇을 계산하는가" FAQ.
 *
 * 왜 필요한가 (2026-08-17 실측):
 *   `sign-profiles.ts` 의 `faqs` 는 sign 단위라 4개 기간 URL 에 **그대로 복제**됐다.
 *   보이는 본문만이 아니라 `page.tsx` 의 `buildFaqPageJsonLd` 가 내보내는 **FAQPage 구조화
 *   데이터까지 4벌이 동일**했다.
 *
 * 🔴 그런데 더 큰 문제는 중복이 아니라 **틀린 설명**이었다. 예를 들어 양자리 FAQ 는
 *   「그날의 일진(日辰) 간지와 달의 위상…」이라고 답하는데, 이 문장이 `/fortune/weekly/aries`
 *   와 `/fortune/monthly/aries` 에도 그대로 나갔다. 정작 그 페이지들은 7일치 일진 배치와
 *   월건·절기 구간을 계산한다(`lib/fortune/build-view.ts` 의 `buildWeekly`·`buildMonthly`).
 *   즉 화면과 설명이 어긋나 있었다.
 *
 * 여기서 만드는 FAQ 는 기존 sign FAQ 를 **대체하지 않고 앞에 덧붙인다** — 기존 문답은
 * sign 마다 내용이 달라(24개가 서로 다른 질문) 지울 이유가 없다.
 */

import type { FortunePeriodId } from "./periods";
import type { SignFaq, SignProfile } from "./sign-profiles";
import type { FortuneLocale } from "./localization";

/**
 * 받침 유무로 `와`/`과` 를 고른다.
 *
 * 왜 필요한가: `ruler` 값은 `화성`·`토성`·`달` 처럼 대부분 받침으로 끝나는데 템플릿이 `와` 를
 * 하드코딩해 `금성와`·`달와` 가 24개 sign x 4개 기간 FAQ 와 그 FAQPage 구조화 데이터에 그대로
 * 나갔다(2026-08-24 발견). 띠 쪽 값은 `신자진 수국(水局)` 처럼 **괄호로 끝나서** 마지막 문자만
 * 보면 받침이 없다고 잘못 판정하므로, 뒤쪽 괄호와 그 안을 떼고 본다.
 *
 * 같은 계산이 `lib/famous-saju/celebrity-saju-service.ts` 에도 모듈 내부 함수로 있다.
 * 이번 변경 범위가 아니라 합치지 않았다 — 공용 모듈로 뽑는 것은 별 작업으로 남긴다.
 */
function withGwaWa(value: string): string {
  const bare = String(value || "").replace(/\s*[([{][^)\]}]*[)\]}]\s*$/, "").trim();
  const code = bare.charCodeAt(bare.length - 1) - 0xac00;
  const hasFinal = code >= 0 && code <= 11171 && code % 28 !== 0;
  return `${value}${hasFinal ? "과" : "와"}`;
}

type BasisCopy = { question: (name: string) => string; answer: (p: SignProfile) => string };

const PERIOD_BASIS: Record<FortunePeriodId, BasisCopy> = {
  today: {
    question: (name) => `${name} 오늘 운세는 무엇을 기준으로 계산되나요?`,
    answer: (p) =>
      `오늘 날짜의 일진(日辰) 간지와 달의 위상, 그리고 현재 절기 구간을 먼저 계산한 뒤 `
      + `${p.nameKo}의 ${p.element} 기운과 ${p.ruler}의 성향에 대입해 총운·애정·재물·건강·직장 다섯 축으로 나눕니다. `
      + `사람이 그날그날 손으로 쓰는 글이 아니라 날짜에서 결정되는 값이라, 같은 날이면 누가 언제 열어도 같은 결과가 나옵니다.`,
  },
  tomorrow: {
    question: (name) => `${name} 내일 운세는 오늘 것과 어떻게 다른가요?`,
    answer: (p) =>
      `기준 날짜가 하루 뒤로 넘어가면 일진 간지가 바뀌고 달의 위상도 한 칸 이동하므로, `
      + `${p.nameKo}의 ${p.element} 기운과 만나는 조합 자체가 달라집니다. `
      + `그래서 내일 페이지는 오늘의 복사본이 아니라 내일 간지로 다시 계산한 결과이고, `
      + `읽는 목적도 다릅니다 — 오늘 것은 지금 무엇을 할지, 내일 것은 미리 무엇을 준비할지에 씁니다.`,
  },
  weekly: {
    question: (name) => `${name} 주간 운세는 하루 운세를 일곱 번 더한 건가요?`,
    answer: (p) =>
      `아닙니다. 주간 페이지는 이번 주 7일의 일진을 한 줄로 늘어놓고, `
      + `${p.nameKo}의 ${withGwaWa(p.ruler)} 삼합(三合)·충(沖) 관계를 따져 기운이 붙는 날과 부딪히는 날을 먼저 가려냅니다. `
      + `그래서 결과가 "며칠에 무엇을 하라"는 배치 조언으로 나오고, 하루 단위 총운 점수와는 축이 다릅니다.`,
  },
  monthly: {
    question: (name) => `${name} 월간 운세는 어떤 자료로 만들어지나요?`,
    answer: (p) =>
      `이번 달의 월건(月建) 간지와 그 안에 걸리는 절기 구간, 그리고 삭(그믐)과 망(보름) 날짜를 먼저 잡습니다. `
      + `거기에 ${p.nameKo}의 ${p.element} 기운을 대입해 달의 전반과 후반을 나누고, 흐름이 바뀌는 분기점을 표시합니다. `
      + `하루치 일진은 여기서 쓰지 않습니다 — 한 달은 날이 아니라 구간으로 읽어야 맞기 때문입니다.`,
  },
};

const LOCALIZED_PERIOD_BASIS: Record<Exclude<FortuneLocale, "ko">, Record<FortunePeriodId, BasisCopy>> = {
  en: {
    today: {
      question: (name) => `How is today's fortune for ${name} calculated?`,
      answer: (p) => `We first calculate today's sexagenary day pillar, Moon phase and current solar-term interval. Those values are read against ${p.nameKo}'s ${p.element} element and ${p.ruler} traits across five axes: overall, love, money, health and work. Because the result comes from the date rather than a text written by hand each day, it remains the same whenever it is opened on that date.`,
    },
    tomorrow: {
      question: (name) => `How is tomorrow's fortune for ${name} different from today's?`,
      answer: (p) => `Moving the reference date forward changes the day pillar and advances the Moon phase, so the combination meeting ${p.nameKo}'s ${p.element} element also changes. Tomorrow's page is recalculated from tomorrow's values rather than copied from today. Use today's reading for a current choice and tomorrow's reading to prepare ahead.`,
    },
    weekly: {
      question: (name) => `Is the weekly fortune for ${name} just seven daily readings added together?`,
      answer: (p) => `No. The weekly page compares all seven day pillars with ${p.nameKo}'s ${p.ruler} traits and separates days of harmony from days of friction. The result is scheduling guidance about which day suits which action, so its axis differs from a single day's overall score.`,
    },
    monthly: {
      question: (name) => `What data is used for the monthly fortune for ${name}?`,
      answer: (p) => `It begins with the month's pillar, the solar-term interval, and the new- and full-moon dates. ${p.nameKo}'s ${p.element} element is then applied to divide the month into earlier and later stretches and mark turning points. A single day's pillar is not used here because a month is read as a sequence of intervals.`,
    },
  },
  ja: {
    today: {
      question: (name) => `${name}の今日の運勢は、何を基準に計算しますか？`,
      answer: (p) => `今日の日柱の干支、月相、現在の節気区間を先に計算し、${p.nameKo}の${p.element}の気と${p.ruler}の性質に当てはめます。そのうえで総合運・恋愛運・金運・健康運・仕事運の五つに分けます。毎日手書きする文章ではなく日付から決まる値なので、同じ日なら開く時刻が違っても結果は同じです。`,
    },
    tomorrow: {
      question: (name) => `${name}の明日の運勢は、今日と何が違いますか？`,
      answer: (p) => `基準日が一日進むと日柱が変わり、月相も動くため、${p.nameKo}の${p.element}の気と出会う組み合わせ自体が変わります。明日のページは今日の複製ではなく、明日の値で計算し直した結果です。今日は今の選択に、明日は事前の準備に使ってください。`,
    },
    weekly: {
      question: (name) => `${name}の週間運勢は、一日運勢を七つ足したものですか？`,
      answer: (p) => `いいえ。週間ページは七日分の日柱を並べ、${p.nameKo}の${p.ruler}の性質と照らして、調和しやすい日と摩擦が生じやすい日を分けます。そのため結果は「何を何曜日に置くか」という予定の助言になり、一日単位の総合スコアとは軸が異なります。`,
    },
    monthly: {
      question: (name) => `${name}の月間運勢は、どの資料から作られますか？`,
      answer: (p) => `今月の月柱、節気の区間、新月と満月の日付を先に確認します。そこへ${p.nameKo}の${p.element}の気を当てはめ、前半と後半を分けて流れの転換点を示します。一日分の日柱ではなく、一か月を複数の区間として読むための計算です。`,
    },
  },
  "zh-CN": {
    today: {
      question: (name) => `${name}今日运势依据什么计算？`,
      answer: (p) => `先计算今日的日柱干支、月相与当前节气区间，再结合${p.nameKo}的${p.element}元素和${p.ruler}特质，分别得出综合、感情、财运、健康与事业五项评分。结果来自日期数据，并非每天手写，因此在同一天的不同时刻打开，结果也保持一致。`,
    },
    tomorrow: {
      question: (name) => `${name}明日运势与今日有什么不同？`,
      answer: (p) => `基准日期向后一天，日柱会改变，月相也会继续运行，因此与${p.nameKo}的${p.element}元素形成的组合随之变化。明日页面不是今日内容的复制，而是按明日数据重新计算；今日适合判断当下，明日适合提前准备。`,
    },
    weekly: {
      question: (name) => `${name}周运是把七天日运相加吗？`,
      answer: (p) => `不是。周运会排列本周七天的日柱，并与${p.nameKo}的${p.ruler}特质比较，区分较易协调与较易产生摩擦的日期。因此结果侧重“哪一天安排什么”的节奏建议，与单日综合评分采用不同的观察轴。`,
    },
    monthly: {
      question: (name) => `${name}月运使用哪些资料？`,
      answer: (p) => `先确定本月月柱、节气区间以及新月与满月日期，再结合${p.nameKo}的${p.element}元素，划分前后阶段并标出转折点。这里不使用某一天的日柱，因为月运需要按区间观察整个月的变化。`,
    },
  },
  "zh-TW": {
    today: {
      question: (name) => `${name}今日運勢依據什麼計算？`,
      answer: (p) => `先計算今日的日柱干支、月相與目前節氣區間，再結合${p.nameKo}的${p.element}元素和${p.ruler}特質，分別得出綜合、感情、財運、健康與事業五項評分。結果來自日期資料，並非每天手寫，因此在同一天的不同時刻開啟，結果也保持一致。`,
    },
    tomorrow: {
      question: (name) => `${name}明日運勢與今日有什麼不同？`,
      answer: (p) => `基準日期往後一天，日柱會改變，月相也會繼續運行，因此與${p.nameKo}的${p.element}元素形成的組合隨之變化。明日頁面不是今日內容的複製，而是按明日資料重新計算；今日適合判斷當下，明日適合提前準備。`,
    },
    weekly: {
      question: (name) => `${name}週運是把七天日運相加嗎？`,
      answer: (p) => `不是。週運會排列本週七天的日柱，並與${p.nameKo}的${p.ruler}特質比較，區分較易協調與較易產生摩擦的日期。因此結果側重「哪一天安排什麼」的節奏建議，與單日綜合評分採用不同的觀察軸。`,
    },
    monthly: {
      question: (name) => `${name}月運使用哪些資料？`,
      answer: (p) => `先確定本月月柱、節氣區間以及新月與滿月日期，再結合${p.nameKo}的${p.element}元素，劃分前後階段並標出轉折點。這裡不使用某一天的日柱，因為月運需要按區間觀察整個月的變化。`,
    },
  },
};

/** 이 기간 페이지가 실제로 무엇을 계산하는지 설명하는 문답 하나. */
export function buildPeriodBasisFaq(profile: SignProfile, period: FortunePeriodId, locale: FortuneLocale = "ko"): SignFaq {
  const copy = locale === "ko" ? PERIOD_BASIS[period] : LOCALIZED_PERIOD_BASIS[locale][period];
  return { question: copy.question(profile.nameKo), answer: copy.answer(profile) };
}

/** 화면과 FAQPage 스키마가 함께 쓰는 목록. 기간 문답이 맨 앞에 온다. */
export function buildPeriodFaqs(profile: SignProfile, period: FortunePeriodId, locale: FortuneLocale = "ko"): SignFaq[] {
  return [buildPeriodBasisFaq(profile, period, locale), ...profile.faqs];
}
