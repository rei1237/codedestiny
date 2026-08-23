// 프리미엄 리포트 화면의 **크롬 문구**. ko / en.
//
// 🔴 여기 있는 것은 버튼·상태·안내처럼 화면이 소유한 말뿐이다. 리포트 **본문**은 한 글자도
//    두지 않는다 — 본문은 저장된 report.locale 의 언어이고, 화면이 문장을 보태면 그 문장은
//    PDF 에 없으므로 웹과 PDF 가 갈린다(요구 3). 이 규칙은
//    __tests__/ui/human-design-report.static.test.js 가 렌더러 파일에 대고 단언한다.

import type { ReportLocale } from "./types";

type Bilingual = { ko: string; en: string };

export const REPORT_TEXT = {
  pageTitle: { ko: "프리미엄 리포트", en: "Premium Report" },
  back: { ko: "차트로", en: "Back to chart" },
  home: { ko: "홈으로", en: "Home" },

  loading: { ko: "차트를 불러오는 중…", en: "Loading your chart…" },
  needChart: {
    ko: "먼저 무료 바디그래프를 만들어 주세요. 리포트는 그 계산 결과를 그대로 씁니다.",
    en: "Build your free BodyGraph first — the report is written from that calculation.",
  },
  goBuildChart: { ko: "무료 차트 만들기", en: "Build the free chart" },

  lockedKicker: { ko: "유료", en: "Paid" },
  lockedHeading: { ko: "전문 분석 리포트", en: "The professional analysis report" },
  lockedBody: {
    ko: "차트는 계속 무료입니다. 리포트는 이 계산 결과만 근거로 쓰는 개인 분석 문서이며, 웹에서 읽고 PDF 로 내려받을 수 있습니다.",
    en: "The chart stays free. The report is a personal analysis document written only from this calculation — read it on the web and download it as a PDF.",
  },
  lockedContents: { ko: "리포트 목차", en: "Report contents" },
  buy: { ko: "리포트 만들기 · ₩10,000", en: "Create the report · ₩10,000" },
  buying: { ko: "결제창 여는 중…", en: "Opening checkout…" },

  generating: { ko: "리포트를 쓰는 중", en: "Writing your report" },
  generatingNote: {
    ko: "완성된 장은 바로 아래에서 읽을 수 있습니다. 화면을 닫아도 진행 상태는 저장됩니다.",
    en: "Finished chapters open below as they land. Progress is saved even if you close this screen.",
  },
  chapterProgress: { ko: "장 완료", en: "chapters done" },
  elapsed: { ko: "경과", en: "Elapsed" },
  resume: { ko: "이어서 만들기", en: "Resume generation" },
  statusPending: { ko: "대기", en: "Pending" },
  statusWriting: { ko: "작성 중", en: "Writing" },
  statusDone: { ko: "완료", en: "Done" },

  contents: { ko: "목차", en: "Contents" },
  reportMeta: { ko: "리포트 정보", en: "Report details" },
  metaChars: { ko: "분량", en: "Length" },
  metaChapters: { ko: "장 수", en: "Chapters" },
  metaLocale: { ko: "작성 언어", en: "Written in" },
  charsUnit: { ko: "자", en: "chars" },
  chaptersUnit: { ko: "장", en: "chapters" },
  degradedNotice: {
    ko: "일부 장이 완성되지 못했습니다. 읽을 수 있는 분량은 전달되었고, 나머지는 다시 시도할 수 있습니다.",
    en: "Some chapters did not finish. What is readable has been delivered, and the rest can be retried.",
  },

  loginRequired: { ko: "로그인이 필요합니다.", en: "Please sign in." },
  paymentFailed: { ko: "결제를 완료하지 못했습니다.", en: "The payment did not go through." },
  notFound: { ko: "리포트를 찾을 수 없습니다.", en: "That report could not be found." },
  stalled: {
    ko: "생성이 중단되어 결제를 되돌렸습니다. 다시 시도해 주세요.",
    en: "Generation stalled and the payment was reversed. Please try again.",
  },
  serverError: { ko: "리포트를 불러오지 못했습니다.", en: "The report could not be loaded." },
  networkError: { ko: "연결이 불안정합니다. 잠시 후 다시 시도해 주세요.", en: "The connection is unstable. Please try again shortly." },
  budgetExceeded: {
    ko: "생성이 예상보다 오래 걸립니다. [이어서 만들기] 를 눌러 남은 장을 마저 만들어 주세요.",
    en: "Generation is taking longer than expected. Use [Resume generation] to finish the remaining chapters.",
  },
} as const satisfies Record<string, Bilingual>;

export function say(key: keyof typeof REPORT_TEXT, locale: ReportLocale): string {
  const entry = REPORT_TEXT[key];
  return locale === "en" ? entry.en : entry.ko;
}
