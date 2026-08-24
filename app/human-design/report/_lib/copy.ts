// 프리미엄 리포트 화면의 **크롬 문구**. ko / en.
//
// 🔴 여기 있는 것은 버튼·상태·안내처럼 화면이 소유한 말뿐이다. 리포트 **본문**은 한 글자도
//    두지 않는다 — 본문은 저장된 report.locale 의 언어이고, 화면이 문장을 보태면 그 문장은
//    PDF 에 없으므로 웹과 PDF 가 갈린다(요구 3). 이 규칙은
//    __tests__/ui/human-design-report.static.test.js 가 렌더러 파일에 대고 단언한다.

import type { Locale as ViewerLocale } from "@/app/human-design/_copy";

/**
 * 🔴 화면 크롬의 언어다. 리포트 **본문** 언어(./types 의 ReportLocale)와 헷갈리지 말 것 —
 *    본문은 저장된 report.locale 이라 ko 리포트를 ja 화면에서 열어도 본문은 ko 여야 한다.
 *    이 축만 다섯으로 넓힌다.
 */
type Bilingual = Record<ViewerLocale, string>;

export const REPORT_TEXT = {
  pageTitle: { ko: "프리미엄 리포트", en: "Premium Report", ja: "プレミアムレポート", "zh-CN": "高级报告", "zh-TW": "進階報告" },
  back: { ko: "차트로", en: "Back to chart", ja: "チャートへ戻る", "zh-CN": "返回图表", "zh-TW": "返回圖表" },
  home: { ko: "홈으로", en: "Home", ja: "ホーム", "zh-CN": "首页", "zh-TW": "首頁" },

  loading: { ko: "차트를 불러오는 중…", en: "Loading your chart…", ja: "チャートを読み込んでいます…", "zh-CN": "正在载入你的图…", "zh-TW": "正在載入你的圖…" },
  needChart: {
    ko: "먼저 무료 바디그래프를 만들어 주세요. 리포트는 그 계산 결과를 그대로 씁니다.",
    en: "Build your free BodyGraph first — the report is written from that calculation.", ja: "先に無料のボディグラフを作ってください。レポートはその計算だけを根拠に書きます。", "zh-CN": "请先生成免费的身体图 — 报告只依据那份计算写成。", "zh-TW": "請先產生免費的身體圖 — 報告只依據那份計算寫成。",
  },
  goBuildChart: { ko: "무료 차트 만들기", en: "Build the free chart", ja: "無料でチャートを作る", "zh-CN": "生成免费的图", "zh-TW": "產生免費的圖" },

  lockedKicker: { ko: "유료", en: "Paid", ja: "有料", "zh-CN": "付费", "zh-TW": "付費" },
  lockedHeading: { ko: "전문 분석 리포트", en: "The professional analysis report", ja: "専門分析レポート", "zh-CN": "专业分析报告", "zh-TW": "專業分析報告" },
  lockedBody: {
    ko: "차트는 계속 무료입니다. 리포트는 이 계산 결과만 근거로 쓰는 개인 분석 문서이며, 웹에서 읽고 PDF 로 내려받을 수 있습니다.",
    en: "The chart stays free. The report is a personal analysis document written only from this calculation — read it on the web and download it as a PDF.", ja: "チャートはこれからも無料です。レポートはこの計算だけを根拠に書く個人分析の文書で、ウェブで読み、PDFでも保存できます。", "zh-CN": "图一直是免费的。报告是只依据这份计算写成的个人分析文件，可在网页阅读，也能下载 PDF。", "zh-TW": "圖一直是免費的。報告是只依據這份計算寫成的個人分析文件，可在網頁閱讀，也能下載 PDF。",
  },
  lockedContents: { ko: "리포트 목차", en: "Report contents", ja: "レポートの目次", "zh-CN": "报告目录", "zh-TW": "報告目錄" },
  buy: { ko: "리포트 만들기 · ₩10,000", en: "Create the report · ₩10,000", ja: "レポートを作る · ₩10,000", "zh-CN": "生成报告 · ₩10,000", "zh-TW": "產生報告 · ₩10,000" },
  buying: { ko: "결제창 여는 중…", en: "Opening checkout…", ja: "決済画面を開いています…", "zh-CN": "正在打开结账…", "zh-TW": "正在開啟結帳…" },

  generating: { ko: "리포트를 쓰는 중", en: "Writing your report", ja: "レポートを書いています", "zh-CN": "正在撰写你的报告", "zh-TW": "正在撰寫你的報告" },
  generatingNote: {
    ko: "완성된 장은 바로 아래에서 읽을 수 있습니다. 화면을 닫아도 진행 상태는 저장됩니다.",
    en: "Finished chapters open below as they land. Progress is saved even if you close this screen.", ja: "書き上がった章から下に開きます。この画面を閉じても進捗は保存されます。", "zh-CN": "写完的章节会依次在下方展开。就算关掉这个画面，进度也会保存。", "zh-TW": "寫完的章節會依序在下方展開。就算關掉這個畫面，進度也會保存。",
  },
  chapterProgress: { ko: "장 완료", en: "chapters done", ja: "章 完了", "zh-CN": "章已完成", "zh-TW": "章已完成" },
  elapsed: { ko: "경과", en: "Elapsed", ja: "経過", "zh-CN": "已用时", "zh-TW": "已用時" },
  resume: { ko: "이어서 만들기", en: "Resume generation", ja: "生成を再開", "zh-CN": "继续生成", "zh-TW": "繼續生成" },
  statusPending: { ko: "대기", en: "Pending", ja: "待機中", "zh-CN": "等待中", "zh-TW": "等待中" },
  statusWriting: { ko: "작성 중", en: "Writing", ja: "作成中", "zh-CN": "撰写中", "zh-TW": "撰寫中" },
  statusDone: { ko: "완료", en: "Done", ja: "完了", "zh-CN": "已完成", "zh-TW": "已完成" },

  contents: { ko: "목차", en: "Contents", ja: "目次", "zh-CN": "目录", "zh-TW": "目錄" },
  reportMeta: { ko: "리포트 정보", en: "Report details", ja: "レポート情報", "zh-CN": "报告信息", "zh-TW": "報告資訊" },
  metaChars: { ko: "분량", en: "Length", ja: "分量", "zh-CN": "篇幅", "zh-TW": "篇幅" },
  metaChapters: { ko: "장 수", en: "Chapters", ja: "章数", "zh-CN": "章数", "zh-TW": "章數" },
  metaLocale: { ko: "작성 언어", en: "Written in", ja: "記述言語", "zh-CN": "撰写语言", "zh-TW": "撰寫語言" },
  charsUnit: { ko: "자", en: "chars", ja: "文字", "zh-CN": "字", "zh-TW": "字" },
  chaptersUnit: { ko: "장", en: "chapters", ja: "章", "zh-CN": "章", "zh-TW": "章" },
  degradedNotice: {
    ko: "일부 장이 완성되지 못했습니다. 읽을 수 있는 분량은 전달되었고, 나머지는 다시 시도할 수 있습니다.",
    en: "Some chapters did not finish. What is readable has been delivered, and the rest can be retried.", ja: "一部の章が完成しませんでした。読める分はお渡ししてあり、残りは再試行できます。", "zh-CN": "有部分章节没有写完。可读的部分已经交付，其余可以重试。", "zh-TW": "有部分章節沒有寫完。可讀的部分已經交付，其餘可以重試。",
  },

  pdfDownload: { ko: "PDF 로 내려받기", en: "Download as PDF", ja: "PDFで保存", "zh-CN": "下载 PDF", "zh-TW": "下載 PDF" },
  pdfBuilding: { ko: "PDF 만드는 중…", en: "Building the PDF…", ja: "PDFを作成しています…", "zh-CN": "正在生成 PDF…", "zh-TW": "正在產生 PDF…" },
  pdfCharts: { ko: "도표", en: "Charts", ja: "チャート", "zh-CN": "图表", "zh-TW": "圖表" },
  pdfNote: {
    ko: "글자를 그대로 조판한 문서입니다. 검색과 복사가 됩니다.",
    en: "Typeset as real text — searchable and selectable.", ja: "本物のテキストとして組んでいます。検索も選択もできます。", "zh-CN": "以真实文字排版 — 可搜索、可选取。", "zh-TW": "以真實文字排版 — 可搜尋、可選取。",
  },
  pdfFontFailed: {
    ko: "글꼴을 불러오지 못해 PDF 를 만들지 못했습니다. 잠시 후 다시 시도해 주세요. 리포트는 이 화면에 그대로 있습니다.",
    en: "The font could not be loaded, so the PDF was not created. Please try again shortly — your report stays right here.", ja: "フォントを読み込めなかったためPDFを作成できませんでした。少し置いてもう一度お試しください。レポートはそのまま残っています。", "zh-CN": "字体载入失败，因此没有生成 PDF。请稍后再试 — 你的报告仍在这里。", "zh-TW": "字體載入失敗，因此沒有產生 PDF。請稍後再試 — 你的報告仍在這裡。",
  },
  pdfFailed: {
    ko: "PDF 를 만들지 못했습니다. 리포트는 이 화면에 그대로 있습니다.",
    en: "The PDF could not be created. Your report stays right here.", ja: "PDFを作成できませんでした。レポートはそのまま残っています。", "zh-CN": "无法生成 PDF。你的报告仍在这里。", "zh-TW": "無法產生 PDF。你的報告仍在這裡。",
  },

  loginRequired: { ko: "로그인이 필요합니다.", en: "Please sign in.", ja: "ログインしてください。", "zh-CN": "请先登录。", "zh-TW": "請先登入。" },
  paymentFailed: { ko: "결제를 완료하지 못했습니다.", en: "The payment did not go through.", ja: "決済が完了しませんでした。", "zh-CN": "付款没有完成。", "zh-TW": "付款沒有完成。" },
  notFound: { ko: "리포트를 찾을 수 없습니다.", en: "That report could not be found.", ja: "そのレポートが見つかりませんでした。", "zh-CN": "找不到那份报告。", "zh-TW": "找不到那份報告。" },
  stalled: {
    ko: "생성이 중단되어 결제를 되돌렸습니다. 다시 시도해 주세요.",
    en: "Generation stalled and the payment was reversed. Please try again.", ja: "生成が止まり、決済は取り消されました。もう一度お試しください。", "zh-CN": "生成中断，付款已退回。请再试一次。", "zh-TW": "生成中斷，付款已退回。請再試一次。",
  },
  serverError: { ko: "리포트를 불러오지 못했습니다.", en: "The report could not be loaded.", ja: "レポートを読み込めませんでした。", "zh-CN": "无法载入报告。", "zh-TW": "無法載入報告。" },
  networkError: { ko: "연결이 불안정합니다. 잠시 후 다시 시도해 주세요.", en: "The connection is unstable. Please try again shortly.", ja: "接続が不安定です。少し置いてもう一度お試しください。", "zh-CN": "连接不稳定，请稍后再试。", "zh-TW": "連線不穩定，請稍後再試。" },
  budgetExceeded: {
    ko: "생성이 예상보다 오래 걸립니다. [이어서 만들기] 를 눌러 남은 장을 마저 만들어 주세요.",
    en: "Generation is taking longer than expected. Use [Resume generation] to finish the remaining chapters.", ja: "生成に想定より時間がかかっています。［生成を再開］で残りの章を仕上げてください。", "zh-CN": "生成比预期久。请用［继续生成］把剩下的章节写完。", "zh-TW": "生成比預期久。請用［繼續生成］把剩下的章節寫完。",
  },
} as const satisfies Record<string, Bilingual>;

export function say(key: keyof typeof REPORT_TEXT, locale: ViewerLocale): string {
  const entry = REPORT_TEXT[key];
  // 🔴 폴백은 en 이다. 예전에는 `locale === "en" ? en : ko` 라 **ko 아닌 전부가 한국어**였다 —
  //    로케일이 둘일 때만 성립하던 식이고, 다섯이 된 지금은 저작이 빠진 자리만 영어로 접힌다.
  return entry[locale] || entry.en;
}
