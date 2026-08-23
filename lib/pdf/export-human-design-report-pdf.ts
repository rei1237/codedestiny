import type { jsPDF as JsPDFInstance } from "jspdf";

import { registerPdfFontsSafely } from "./export-result-pdf";
import { buildHumanDesignPdfChapters } from "./human-design-report-chapters";
import {
  CONTENT_WIDTH_MM,
  INK,
  MARGIN_X_MM,
  PAGE_HEIGHT_MM,
  HEADING_LOOKAHEAD_MM,
  cleanReportText,
  lineHeightMm,
} from "./typeset-metrics";
import {
  PdfFontError,
  createTypesetWriter,
  drawContentsPage,
  drawFooters,
  paintPaper,
} from "./typeset-writer";

/**
 * 휴먼 디자인 프리미엄 리포트 PDF — **텍스트 조판**.
 *
 * 🔴 화면 캡처가 아니다. 웹 리더와 **같은 플랜**(lib/human-design/report-plan.js)을 받아 글자를
 *    글자로 조판한다. 그래서 검색·선택·복사가 되고, 25,000자가 수십 MB 가 되지 않는다.
 *    도표 6장만 그림이며, 그것도 호출부가 미리 캡처해 넘긴다.
 *
 * 🔴 폰트 실패에 캡처 폴백을 두지 않는다 — 초융합과 **반대** 결정이다. 리포트 본문은
 *    content-visibility 로 접혀 있어 화면을 캡처하면 상당수 장이 빈 페이지로 찍힌다. 읽을 수
 *    없는 문서를 주느니 "지금은 못 만든다" 가 낫고, **웹 리포트는 그대로 남으므로 결과 유실이
 *    아니다.**
 *
 * 🔴 표지에 생년월일·생시·이름을 싣지 않는다. 파일명도 마찬가지다 — 리포트는 공유되기 쉬운
 *    물건이고, 초융합 PDF 와 같은 프라이버시 경계를 쓴다.
 */

export { PdfFontError as HumanDesignPdfFontError };

export type HumanDesignPdfPlan = {
  planVersion: string;
  locale: string;
  cover: {
    title: string;
    subtitle: string;
    facts: Array<{ label: string; value: string }>;
    planVersion: string;
    chapterCount: number;
  };
  chapters: Array<{ key: string; order: number; title: string; blocks: Array<Record<string, unknown>> }>;
  chartSlots: Array<{ slotId: string; chapterKey: string; caption: string }>;
  stats: { chapters: number; blocks: number; chars: number; chartSlots: number };
};

export type ExportHumanDesignReportPdfOptions = {
  plan: HumanDesignPdfPlan;
  /** slotId → 미리 캡처한 도표. 빠진 슬롯은 그 장에서 도표 블록이 캡션까지 통째로 빠진다. */
  images?: Map<string, { dataUrl: string; ratio: number }>;
  fileName: string;
  /** 표지에 적을 생성일. 출생일이 아니다. */
  date?: string;
  watermarkText?: string;
};

const CONTENTS_LABEL: Record<string, string> = { ko: "차례", en: "Contents" };
const KICKER: Record<string, string> = { ko: "CODE DESTINY · 휴먼 디자인", en: "CODE DESTINY · HUMAN DESIGN" };

function drawCover(pdf: JsPDFInstance, fonts: { title: string; body: string }, options: ExportHumanDesignReportPdfOptions) {
  const { cover, locale } = options.plan;
  const lang = locale === "en" ? "en" : "ko";

  pdf.setFont(fonts.body, "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(INK.gold[0], INK.gold[1], INK.gold[2]);
  pdf.text(KICKER[lang], MARGIN_X_MM, 74);

  pdf.setFont(fonts.title, "normal");
  pdf.setFontSize(25);
  pdf.setTextColor(INK.title[0], INK.title[1], INK.title[2]);
  let cursorY = 92;
  for (const line of pdf.splitTextToSize(cleanReportText(cover.title, 200), CONTENT_WIDTH_MM) as string[]) {
    pdf.text(line, MARGIN_X_MM, cursorY);
    cursorY += lineHeightMm(25, 1.4);
  }

  pdf.setDrawColor(INK.gold[0], INK.gold[1], INK.gold[2]);
  pdf.setLineWidth(0.6);
  pdf.line(MARGIN_X_MM, cursorY + 4, MARGIN_X_MM + 34, cursorY + 4);

  pdf.setFont(fonts.body, "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(INK.muted[0], INK.muted[1], INK.muted[2]);
  cursorY += 16;
  pdf.text(cleanReportText(cover.subtitle, 120), MARGIN_X_MM, cursorY);
  cursorY += lineHeightMm(11, 2.2);

  // 확정값 — 차트 계산에서 나온 값만. 모델이 쓴 문장은 표지에 한 줄도 오르지 않는다.
  pdf.setFontSize(10.5);
  for (const fact of cover.facts) {
    pdf.setTextColor(INK.muted[0], INK.muted[1], INK.muted[2]);
    pdf.text(cleanReportText(fact.label, 40), MARGIN_X_MM, cursorY);
    pdf.setTextColor(INK.body[0], INK.body[1], INK.body[2]);
    pdf.text(cleanReportText(fact.value, 80), MARGIN_X_MM + 42, cursorY);
    cursorY += lineHeightMm(10.5, 1.9);
  }

  pdf.setFontSize(9);
  pdf.setTextColor(INK.muted[0], INK.muted[1], INK.muted[2]);
  let footY = PAGE_HEIGHT_MM - 46;
  const stamp = [cleanReportText(options.date, 40), `${cover.chapterCount}${lang === "en" ? " chapters" : "장"}`, cover.planVersion]
    .filter(Boolean)
    .join(" · ");
  pdf.text(stamp, MARGIN_X_MM, footY);
  footY += lineHeightMm(9, 1.8);
}

export async function exportHumanDesignReportPdf(options: ExportHumanDesignReportPdfOptions): Promise<void> {
  const { plan, images = new Map(), fileName } = options;
  const lang = plan.locale === "en" ? "en" : "ko";
  const watermarkText = options.watermarkText || (lang === "en" ? "Code Destiny · Human Design Report" : "Code Destiny · 휴먼 디자인 리포트");

  const chapters = buildHumanDesignPdfChapters(plan, images);
  if (!chapters.length) throw new Error("human design report pdf: nothing to typeset");

  const jsPdfModule = await import("jspdf");
  const JsPDF = jsPdfModule.default || (jsPdfModule as unknown as { jsPDF: typeof jsPdfModule.default }).jsPDF;
  const pdf: JsPDFInstance = new JsPDF("p", "mm", "a4");

  const fonts = await registerPdfFontsSafely(pdf);
  if (!fonts) throw new PdfFontError("human design report pdf: Korean font embedding failed");

  paintPaper(pdf);
  drawCover(pdf, fonts, options);

  pdf.addPage();
  paintPaper(pdf);
  const contentsPage = pdf.getNumberOfPages();

  const writer = createTypesetWriter(pdf, fonts);
  const entries: { label: string; page: number }[] = [];

  for (const chapter of chapters) {
    writer.chapter(chapter.kicker, chapter.title);
    entries.push({ label: chapter.title, page: writer.page });
    const blocks = chapter.blocks as Array<Record<string, never>>;
    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index];
      const kind = String((block as { kind?: string }).kind || "");
      const b = block as unknown as {
        text?: string;
        title?: string;
        items?: never[];
        rows?: never[];
        dataUrl?: string;
        widthMm?: number;
        heightMm?: number;
        caption?: string;
      };
      switch (kind) {
        case "lead": writer.lead(String(b.text || "")); break;
        case "paragraph": writer.paragraph(String(b.text || "")); break;
        // 🔴 마지막 블록이 아니면 뒤따르는 본문 두 줄까지 함께 자리를 잡는다 — 소제목만
        //    페이지 바닥에 남는 것을 막는다(가드가 실제로 잡은 결함이다).
        case "heading": writer.heading(String(b.text || ""), index < blocks.length - 1 ? HEADING_LOOKAHEAD_MM : 0); break;
        case "quote": writer.quote(String(b.text || "")); break;
        case "bullets": writer.bullets((b.items || []) as string[], String(b.title || "")); break;
        case "insight": writer.insight((b.items || []) as string[], String(b.title || ""), "insight"); break;
        case "summary": writer.insight((b.items || []) as string[], String(b.title || ""), "summary"); break;
        case "steps": writer.steps((b.items || []) as Array<{ index?: number; text?: string }>, String(b.title || "")); break;
        case "keyvalue": writer.keyValueTable((b.rows || []) as Array<{ label?: string; value?: string }>, String(b.title || "")); break;
        case "meter": writer.meterBar((b.items || []) as Array<{ label?: string; value?: number; max?: number; display?: string }>, String(b.title || "")); break;
        case "image": writer.image(String(b.dataUrl || ""), Number(b.widthMm || 0), Number(b.heightMm || 0), String(b.caption || "")); break;
        // 모르는 종류는 본문으로 떨어뜨린다 — 새 플랜 버전이 옛 조판기를 만나도 글이 사라지지 않는다.
        default: if (b.text) writer.paragraph(String(b.text));
      }
    }
  }

  drawContentsPage(pdf, fonts, contentsPage, entries, CONTENTS_LABEL[lang]);
  drawFooters(pdf, fonts, watermarkText);
  pdf.save(fileName);
}
