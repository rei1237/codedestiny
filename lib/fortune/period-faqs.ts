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
      (p.kind === "animal"
        ? `${p.nameKo}의 지지와 오늘 일진의 비화·충·삼합 그룹·육합 관계, 천간 오행의 생극을 살피고 달의 위상을 보조 지표로 사용합니다. `
        : `${withGwaWa(p.nameKo)} 오늘 태양·달이 위치한 별자리 및 원소 관계, 달의 위상을 살핍니다. 천체 위치는 한국시간 정오 기준이며 고정 생일표로 태양궁을 정하지 않습니다. `)
      + `총운·연애운·재물운·건강운·직장운 점수는 콘텐츠의 흐름 지표이며 사건의 발생 확률이나 개인 정밀 진단은 아닙니다.`,
  },
  tomorrow: {
    question: (name) => `${name} 내일 운세는 오늘 것과 어떻게 다른가요?`,
    answer: (p) =>
      `${p.nameKo} 내일 운세는 기준 날짜를 하루 뒤로 옮겨 `
      + (p.kind === "animal" ? `일진의 지지 관계와 천간 오행, 달의 위상을 다시 계산합니다. ` : `한국시간 정오의 태양·달 별자리와 달의 위상을 다시 계산합니다. `)
      + `그 결과로 약속·지출·업무의 우선순위를 미리 점검해 보세요. 지표가 같은 구간에서는 오늘과 내일의 점수가 같을 수도 있습니다.`,
  },
  weekly: {
    question: (name) => `${name} 주간 운세는 하루 운세를 일곱 번 더한 건가요?`,
    answer: (p) =>
      `주간 요약 점수는 월요일부터 일요일까지 7일의 계산값을 평균하고 반올림한 값입니다. `
      + (p.kind === "animal" ? `${withGwaWa(p.nameKo)} 매일 일진의 지지 관계·천간 오행을 비교합니다. ` : `${withGwaWa(p.nameKo)} 매일 정오의 태양·달 별자리 관계를 비교합니다. `)
      + `요일별 표와 달의 이동을 함께 보며 집중할 일과 여유를 둘 일을 나누세요. 점수가 같으면 특정 하루만 더 좋은 날이라고 단정하지 않습니다.`,
  },
  monthly: {
    question: (name) => `${name} 월간 운세는 어떤 자료로 만들어지나요?`,
    answer: (p) =>
      (p.kind === "animal"
        ? `${p.nameKo} 월간 운세는 기준 날짜에 해당하는 월건(月建)의 지지·천간을 사용합니다. 월건은 양력 1일이 아닌 절입을 기준으로 바뀝니다. `
        : `${p.nameKo} 월간 운세는 기준 날짜 정오의 태양·달 위치와 위상을 사용합니다. `)
      + `해당 달의 절기와 신월·보름 날짜도 함께 안내합니다. 한 달 전체의 일별 점수 평균이나 사건 예측이 아닌, 기준 시점의 월간 탐색 안내입니다.`,
  },
};

const LOCALIZED_PERIOD_BASIS: Record<Exclude<FortuneLocale, "ko">, Record<FortunePeriodId, BasisCopy>> = {
  en: {
    today: {
      question: (name) => `How is today's fortune for ${name} calculated?`,
      answer: (p) => (p.kind === "animal" ? "The animal reading compares the birth-year branch with today’s branch, stem element and Moon phase." : "The zodiac reading compares the sign with the Sun and Moon signs and phase calculated at noon Korea time.") + " Scores are reflective content indicators, not event probabilities or individual diagnoses. The monthly view is a reference-date overview, not an average of the whole month.",
    },
    tomorrow: {
      question: (name) => `How is tomorrow's fortune for ${name} different from today's?`,
      answer: (p) => (p.kind === "animal" ? "Tomorrow’s reading recalculates branch relationships, stem elements and Moon phase for the next date." : "Tomorrow’s reading recalculates Sun and Moon positions and phase at noon Korea time on the next date.") + " Scores are reflective content indicators, not event probabilities or individual diagnoses. The monthly view is a reference-date overview, not an average of the whole month.",
    },
    weekly: {
      question: (name) => `Is the weekly fortune for ${name} just seven daily readings added together?`,
      answer: (p) => (p.kind === "animal" ? "The weekly score is the rounded average of seven daily scores from Monday to Sunday, using branch relationships and stem elements." : "The weekly score is the rounded average of seven daily scores from Monday to Sunday, using the Sun and Moon signs and phase.") + " Scores are reflective content indicators, not event probabilities or individual diagnoses. The monthly view is a reference-date overview, not an average of the whole month.",
    },
    monthly: {
      question: (name) => `What data is used for the monthly fortune for ${name}?`,
      answer: (p) => (p.kind === "animal" ? "The monthly reading uses the month pillar at the reference date; it changes at the solar-term boundary, not the first calendar day." : "The monthly reading uses the Sun and Moon positions and phase at noon Korea time on the reference date.") + " Scores are reflective content indicators, not event probabilities or individual diagnoses. The monthly view is a reference-date overview, not an average of the whole month.",
    },
  },
  ja: {
    today: {
      question: (name) => `${name}の今日の運勢は、何を基準に計算しますか？`,
      answer: (p) => (p.kind === "animal" ? "干支の運勢は、生年の地支と今日の地支の関係、天干の五行、月相を比較します。" : "星座の運勢は、韓国時間正午の太陽・月の星座と月相を計算し、対象の星座と比較します。") + " スコアは振り返りのための指標であり、出来事の確率や個人の診断ではありません。月間表示は基準日時点の案内で、一か月全体の平均ではありません。",
    },
    tomorrow: {
      question: (name) => `${name}の明日の運勢は、今日と何が違いますか？`,
      answer: (p) => (p.kind === "animal" ? "明日の日付で地支の関係、天干の五行、月相を計算し直します。" : "明日の韓国時間正午を基準に、太陽・月の星座と月相を計算し直します。") + " スコアは振り返りのための指標であり、出来事の確率や個人の診断ではありません。月間表示は基準日時点の案内で、一か月全体の平均ではありません。",
    },
    weekly: {
      question: (name) => `${name}の週間運勢は、一日運勢を七つ足したものですか？`,
      answer: (p) => (p.kind === "animal" ? "週間スコアは月曜から日曜の地支の関係と天干の五行などから算出した七日分の平均を四捨五入した値です。" : "週間スコアは月曜から日曜の太陽・月の星座と月相から算出した七日分の平均を四捨五入した値です。") + " スコアは振り返りのための指標であり、出来事の確率や個人の診断ではありません。月間表示は基準日時点の案内で、一か月全体の平均ではありません。",
    },
    monthly: {
      question: (name) => `${name}の月間運勢は、どの資料から作られますか？`,
      answer: (p) => (p.kind === "animal" ? "月間運勢は基準日時点の月柱を使います。月柱は暦の一日ではなく節入りで変わります。" : "月間運勢は基準日の韓国時間正午における太陽・月の位置と月相を使います。") + " スコアは振り返りのための指標であり、出来事の確率や個人の診断ではありません。月間表示は基準日時点の案内で、一か月全体の平均ではありません。",
    },
  },
  "zh-CN": {
    today: {
      question: (name) => `${name}今日运势依据什么计算？`,
      answer: (p) => (p.kind === "animal" ? "生肖运势比较出生年地支与今日日支的关系、天干五行及月相。" : "星座运势以韩国时间正午的太阳、月亮星座及月相，与所选星座比较。") + "评分是用于自我观察的内容指标，不是事件发生概率或个人诊断。月运是基准时点的提示，不是整月日评分的平均。",
    },
    tomorrow: {
      question: (name) => `${name}明日运势与今日有什么不同？`,
      answer: (p) => (p.kind === "animal" ? "明日运势按下一天的日期重新计算地支关系、天干五行与月相。" : "明日运势按下一天韩国时间正午重新计算太阳、月亮位置与月相。") + "评分是用于自我观察的内容指标，不是事件发生概率或个人诊断。月运是基准时点的提示，不是整月日评分的平均。",
    },
    weekly: {
      question: (name) => `${name}周运是把七天日运相加吗？`,
      answer: (p) => (p.kind === "animal" ? "周评分是周一至周日七天评分的四舍五入平均值，参考地支关系、天干五行与月相。" : "周评分是周一至周日七天评分的四舍五入平均值，参考太阳、月亮星座与月相。") + "评分是用于自我观察的内容指标，不是事件发生概率或个人诊断。月运是基准时点的提示，不是整月日评分的平均。",
    },
    monthly: {
      question: (name) => `${name}月运使用哪些资料？`,
      answer: (p) => (p.kind === "animal" ? "月运使用基准日期对应的月柱。月柱在节令交接时变化，并非每月一日变化。" : "月运使用基准日期韩国时间正午的太阳、月亮位置与月相。") + "评分是用于自我观察的内容指标，不是事件发生概率或个人诊断。月运是基准时点的提示，不是整月日评分的平均。",
    },
  },
  "zh-TW": {
    today: {
      question: (name) => `${name}今日運勢依據什麼計算？`,
      answer: (p) => (p.kind === "animal" ? "生肖運勢比較出生年地支與今日日支的關係、天干五行及月相。" : "星座運勢以韓國時間正午的太陽、月亮星座及月相，與所選星座比較。") + "評分是用於自我觀察的內容指標，不是事件發生機率或個人診斷。月運是基準時點的提示，不是整月日評分的平均。",
    },
    tomorrow: {
      question: (name) => `${name}明日運勢與今日有什麼不同？`,
      answer: (p) => (p.kind === "animal" ? "明日運勢按下一天的日期重新計算地支關係、天干五行與月相。" : "明日運勢按下一天韓國時間正午重新計算太陽、月亮位置與月相。") + "評分是用於自我觀察的內容指標，不是事件發生機率或個人診斷。月運是基準時點的提示，不是整月日評分的平均。",
    },
    weekly: {
      question: (name) => `${name}週運是把七天日運相加嗎？`,
      answer: (p) => (p.kind === "animal" ? "週評分是週一至週日七天評分的四捨五入平均值，參考地支關係、天干五行與月相。" : "週評分是週一至週日七天評分的四捨五入平均值，參考太陽、月亮星座與月相。") + "評分是用於自我觀察的內容指標，不是事件發生機率或個人診斷。月運是基準時點的提示，不是整月日評分的平均。",
    },
    monthly: {
      question: (name) => `${name}月運使用哪些資料？`,
      answer: (p) => (p.kind === "animal" ? "月運使用基準日期對應的月柱。月柱在節令交接時變化，並非每月一日變化。" : "月運使用基準日期韓國時間正午的太陽、月亮位置與月相。") + "評分是用於自我觀察的內容指標，不是事件發生機率或個人診斷。月運是基準時點的提示，不是整月日評分的平均。",
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
  const topics: SignFaq[] = locale === "ko" ? [{
    question: `${profile.nameKo} ${withGwaWa("연애운")} 재물운·직장운은 어떻게 활용하나요?`,
    answer: `연애운은 대화의 속도와 기대를, 재물운은 소비 계획과 지출 습관을, 직장운은 협업과 업무 우선순위를 점검하는 질문으로 읽어보세요. 건강운은 생활 리듬을 돌아보는 참고이며 의학적 판단에 사용하지 않습니다. 같은 ${profile.kind === "animal" ? "띠" : "별자리"}라도 실제 성향과 상황은 다릅니다.`,
  }] : [];
  if (locale === "ko" && profile.id === "tiger") topics.push({ question: "범띠 운세와 호랑이띠 운세는 다른가요?", answer: "범띠와 호랑이띠는 같은 인(寅)의 띠입니다. 두 검색어 모두 이 페이지의 동일한 일진 계산과 기간별 해석을 가리킵니다." });
  if (locale === "ko" && profile.id === "sagittarius") topics.push({ question: "사수자리 운세와 궁수자리 운세는 같은가요?", answer: "사수자리와 궁수자리는 모두 Sagittarius를 가리킵니다. 이 페이지에서는 궁수자리라는 이름으로 오늘·내일·주간·월간 흐름을 안내합니다." });
  return [buildPeriodBasisFaq(profile, period, locale), ...topics, ...profile.faqs];
}
