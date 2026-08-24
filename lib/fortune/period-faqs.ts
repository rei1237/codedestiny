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

/** 이 기간 페이지가 실제로 무엇을 계산하는지 설명하는 문답 하나. */
export function buildPeriodBasisFaq(profile: SignProfile, period: FortunePeriodId): SignFaq {
  const copy = PERIOD_BASIS[period];
  return { question: copy.question(profile.nameKo), answer: copy.answer(profile) };
}

/** 화면과 FAQPage 스키마가 함께 쓰는 목록. 기간 문답이 맨 앞에 온다. */
export function buildPeriodFaqs(profile: SignProfile, period: FortunePeriodId): SignFaq[] {
  return [buildPeriodBasisFaq(profile, period), ...profile.faqs];
}
