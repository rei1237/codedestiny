import type { jsPDF as JsPDFInstance } from "jspdf";

import {
  BLOCK_STYLE,
  CONTENT_BOTTOM_MM,
  CONTENT_WIDTH_MM,
  FOOTER_BASELINE_MM,
  INK,
  MARGIN_TOP_MM,
  MARGIN_X_MM,
  PAGE_HEIGHT_MM,
  PAGE_WIDTH_MM,
  cleanReportText,
  lineHeightMm,
} from "./typeset-metrics";

/**
 * PDF **조판기**. jsPDF 에 의존하는 부분만 여기 있고, 여백·활자·행간 같은 숫자는 한 줄도 갖지
 * 않는다 — 전부 typeset-metrics.js 에서 온다.
 *
 * 🔴 상수를 여기 다시 적지 않는다. 그 순간부터 verify 의 시뮬레이션(paginate)은 실물과 다른
 *    문서를 검사하게 되고, "가드는 초록불인데 PDF 는 깨져 있다" 가 된다.
 *
 * 🔴 jsPDF 는 텍스트를 그린 뒤 높이를 알려 주지 않는다. 그래서 splitTextToSize 결과를 통째로
 *    넘기지 않고 **줄 단위로** 그리며 페이지 경계를 직접 판단한다. 통째로 넘기면 페이지 끝을
 *    말없이 넘어가 잘린다.
 */

type Rgb = readonly [number, number, number] | readonly number[];
export type PdfFonts = { title: string; body: string };

/** 폰트를 못 실었을 때 호출자가 다른 경로로 되돌아갈 수 있게 구분되는 에러를 던진다. */
export class PdfFontError extends Error {
  constructor(message = "typeset pdf: Korean font embedding failed") {
    super(message);
    this.name = "PdfFontError";
  }
}

/**
 * 지금 페이지의 바탕을 칠한다.
 * 🔴 반드시 **그 페이지에 아무것도 그리기 전에** 부른다 — jsPDF 는 그린 순서대로 쌓으므로
 *    나중에 칠하면 본문을 통째로 덮는다.
 */
export function paintPaper(pdf: JsPDFInstance): void {
  pdf.setFillColor(INK.paper[0], INK.paper[1], INK.paper[2]);
  pdf.rect(0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, "F");
}

export type TypesetBlock = {
  kind: string;
  text?: string;
  title?: string;
  items?: Array<string | { index?: number; text?: string; label?: string; value?: number; max?: number; display?: string }>;
  rows?: Array<{ label?: string; value?: string }>;
  dataUrl?: string;
  widthMm?: number;
  heightMm?: number;
  caption?: string;
};

export function createTypesetWriter(pdf: JsPDFInstance, fonts: PdfFonts) {
  let cursorY = MARGIN_TOP_MM;

  const setStyle = (font: string, sizePt: number, color: Rgb) => {
    pdf.setFont(font, "normal");
    pdf.setFontSize(sizePt);
    pdf.setTextColor(color[0], color[1], color[2]);
  };

  const newPage = () => {
    pdf.addPage();
    paintPaper(pdf);
    cursorY = MARGIN_TOP_MM;
  };

  const space = (mm: number) => {
    cursorY = Math.min(cursorY + mm, CONTENT_BOTTOM_MM);
  };

  const need = (mm: number) => {
    if (cursorY + mm > CONTENT_BOTTOM_MM) newPage();
  };

  const wrap = (text: string, widthMm: number): string[] => pdf.splitTextToSize(text, widthMm) as string[];

  const lines = (text: string, sizePt: number, factor: number, indentMm = 0) => {
    const width = CONTENT_WIDTH_MM - indentMm;
    const height = lineHeightMm(sizePt, factor);
    for (const paragraph of text.split("\n")) {
      if (!paragraph.trim()) { space(height * 0.6); continue; }
      for (const line of wrap(paragraph, width)) {
        need(height);
        pdf.text(line, MARGIN_X_MM + indentMm, cursorY);
        cursorY += height;
      }
    }
  };

  const styleOf = (kind: keyof typeof BLOCK_STYLE) => BLOCK_STYLE[kind];
  const inkOf = (name: string): Rgb => (INK as Record<string, Rgb>)[name] || INK.body;
  const fontOf = (name: string) => (name === "title" ? fonts.title : fonts.body);

  /** 카드 배경. 높이를 미리 알 수 없어 그린 뒤 되짚지 않고, 얇은 좌우 여백만 잡는다. */
  const cardTitle = (title: string) => {
    if (!title) return;
    setStyle(fonts.body, 8.5, INK.gold);
    need(lineHeightMm(8.5, 1.5));
    pdf.text(title, MARGIN_X_MM, cursorY);
    cursorY += lineHeightMm(8.5, 1.5);
    space(1);
  };

  const textBlock = (kind: "lead" | "body" | "paragraph" | "heading" | "caption", text: string, lookaheadMm = 0) => {
    const style = styleOf(kind);
    if (kind === "heading") { need(style.keepMm + lookaheadMm); space(3); }
    setStyle(fontOf(style.font), style.sizePt, inkOf(style.color));
    lines(text, style.sizePt, style.factor, style.indentMm);
    space(style.spaceMm);
  };

  return {
    // 본문 조판 중에는 setPage 를 하지 않으므로 마지막 페이지가 곧 지금 페이지다.
    get page() { return pdf.getNumberOfPages(); },
    get y() { return cursorY; },
    newPage,
    space,

    /** 새 장을 연다. 🔴 장 제목이 페이지 맨 아래에 홀로 남지 않도록 **항상** 새 페이지에서 시작한다. */
    chapter(kicker: string, title: string) {
      newPage();
      if (kicker) {
        setStyle(fonts.body, 8.5, INK.gold);
        lines(kicker, 8.5, 1.4);
        space(1.5);
      }
      setStyle(fonts.title, 17, INK.title);
      lines(title, 17, 1.35);
      space(2.5);
      pdf.setDrawColor(INK.rule[0], INK.rule[1], INK.rule[2]);
      pdf.setLineWidth(0.3);
      pdf.line(MARGIN_X_MM, cursorY, MARGIN_X_MM + CONTENT_WIDTH_MM, cursorY);
      space(6);
    },

    lead(text: string) { textBlock("lead", text); },
    body(text: string) { textBlock("body", text); },
    paragraph(text: string) { textBlock("paragraph", text); },
    /**
     * @param lookaheadMm 뒤에 올 본문이 같은 페이지에 들어가야 할 최소 높이.
     *   🔴 0 이면 제목이 페이지 바닥에 홀로 남을 수 있다. 초융합은 추출 전과 같도록 0 을 쓰고,
     *      휴먼 디자인은 HEADING_LOOKAHEAD_MM 을 넘겨 그 자리를 함께 잡는다.
     */
    heading(text: string, lookaheadMm = 0) { textBlock("heading", text, lookaheadMm); },
    caption(text: string) { textBlock("caption", text); },

    /** 풀인용. 화면과 같은 취지로 카드가 아니라 **조판으로** 띄운다 — 큰 활자와 좌측 규칙선. */
    quote(text: string) {
      const style = styleOf("quote");
      need(style.keepMm);
      space(2);
      const top = cursorY - lineHeightMm(style.sizePt, style.factor) * 0.7;
      setStyle(fontOf(style.font), style.sizePt, inkOf(style.color));
      lines(text, style.sizePt, style.factor, style.indentMm);
      pdf.setDrawColor(INK.accent[0], INK.accent[1], INK.accent[2]);
      pdf.setLineWidth(0.8);
      // 같은 페이지 안에서만 규칙선을 긋는다 — 페이지를 넘어간 인용에 걸치면 엉뚱한 곳에 선이 남는다.
      if (cursorY > top) pdf.line(MARGIN_X_MM + 2, top, MARGIN_X_MM + 2, cursorY - 2);
      space(style.spaceMm);
    },

    bullets(items: string[], title = "") {
      const style = styleOf("bullets");
      cardTitle(title);
      setStyle(fontOf(style.font), style.sizePt, inkOf(style.color));
      const height = lineHeightMm(style.sizePt, style.factor);
      for (const item of items) {
        const text = cleanReportText(item, 600);
        if (!text) continue;
        const wrapped = wrap(text, CONTENT_WIDTH_MM - style.indentMm);
        // 🔴 항목 하나는 통째로 한 페이지에 넣는다. 추출 전 초융합 동작 그대로이며, 불릿 점만
        //    앞 페이지에 남고 글이 다음 장으로 넘어가는 꼴을 막는다.
        need(height * wrapped.length);
        pdf.setFillColor(INK.accent[0], INK.accent[1], INK.accent[2]);
        pdf.circle(MARGIN_X_MM + 1.4, cursorY - 1.1, 0.7, "F");
        for (const line of wrapped) {
          need(height);
          pdf.text(line, MARGIN_X_MM + style.indentMm, cursorY);
          cursorY += height;
        }
        space(1);
      }
      space(style.spaceMm);
    },

    /** 인사이트·마무리 카드. 항목마다 얇은 규칙선으로 끊어 본문과 구분한다. */
    insight(items: string[], title = "", kind: "insight" | "summary" = "insight") {
      const style = styleOf(kind);
      need(style.keepMm);
      cardTitle(title);
      setStyle(fontOf(style.font), style.sizePt, inkOf(style.color));
      const height = lineHeightMm(style.sizePt, style.factor);
      for (const item of items) {
        const text = cleanReportText(item, 800);
        if (!text) continue;
        const wrapped = wrap(text, CONTENT_WIDTH_MM - style.indentMm);
        need(height * Math.min(wrapped.length, 2));
        pdf.setFillColor(INK.accent[0], INK.accent[1], INK.accent[2]);
        pdf.rect(MARGIN_X_MM, cursorY - 2.6, 1.4, height * wrapped.length * 0.8, "F");
        for (const line of wrapped) {
          need(height);
          pdf.text(line, MARGIN_X_MM + style.indentMm, cursorY);
          cursorY += height;
        }
        space(1.5);
      }
      space(style.spaceMm);
    },

    steps(items: Array<{ index?: number; text?: string }>, title = "") {
      const style = styleOf("steps");
      need(style.keepMm);
      cardTitle(title);
      const height = lineHeightMm(style.sizePt, style.factor);
      let order = 1;
      for (const item of items) {
        const text = cleanReportText(item?.text, 800);
        if (!text) continue;
        const label = String(item?.index ?? order);
        order += 1;
        const wrapped = wrap(text, CONTENT_WIDTH_MM - style.indentMm);
        need(height * Math.min(wrapped.length, 2));
        setStyle(fonts.title, style.sizePt, INK.accent);
        pdf.text(label, MARGIN_X_MM + 1, cursorY);
        setStyle(fontOf(style.font), style.sizePt, inkOf(style.color));
        for (const line of wrapped) {
          need(height);
          pdf.text(line, MARGIN_X_MM + style.indentMm, cursorY);
          cursorY += height;
        }
        space(1.5);
      }
      space(style.spaceMm);
    },

    /**
     * 라벨/값 표.
     * 🔴 페이지를 넘어가면 제목을 다시 찍고, **꼬리에 1행만 남기지 않는다.** 표 한 줄만 있는
     *    페이지는 조판 사고처럼 보인다.
     */
    keyValueTable(rows: Array<{ label?: string; value?: string }>, title = "") {
      const style = styleOf("keyvalue");
      const height = lineHeightMm(style.sizePt, style.factor);
      const labelWidth = CONTENT_WIDTH_MM * 0.4;
      need(style.keepMm);
      cardTitle(title);

      const kept = rows.filter((row) => cleanReportText(row?.label, 120) || cleanReportText(row?.value, 400));
      for (let i = 0; i < kept.length; i += 1) {
        const remaining = kept.length - i;
        // 지금 줄과 마지막 줄이 갈라져 다음 페이지에 1행만 남게 되면 미리 넘긴다.
        if (cursorY + height * 2 > CONTENT_BOTTOM_MM && remaining === 2) {
          newPage();
          cardTitle(title);
        } else {
          need(height);
        }
        if (cursorY === MARGIN_TOP_MM && i > 0) cardTitle(title);

        setStyle(fontOf(style.font), style.sizePt, INK.muted);
        pdf.text(wrap(cleanReportText(kept[i]?.label, 120), labelWidth - 4)[0] || "", MARGIN_X_MM, cursorY);
        setStyle(fontOf(style.font), style.sizePt, inkOf(style.color));
        const valueLines = wrap(cleanReportText(kept[i]?.value, 400), CONTENT_WIDTH_MM - labelWidth);
        let lineY = cursorY;
        for (const line of valueLines) {
          pdf.text(line, MARGIN_X_MM + labelWidth, lineY);
          lineY += height;
        }
        pdf.setDrawColor(INK.rule[0], INK.rule[1], INK.rule[2]);
        pdf.setLineWidth(0.2);
        pdf.line(MARGIN_X_MM, lineY - height + 1.6, MARGIN_X_MM + CONTENT_WIDTH_MM, lineY - height + 1.6);
        cursorY = lineY;
      }
      space(style.spaceMm);
    },

    /** 막대. 🔴 숫자는 모델이 아니라 차트에서 계산된 값이라 그대로 그려도 된다. */
    meterBar(items: Array<{ label?: string; value?: number; max?: number; display?: string }>, title = "") {
      const style = styleOf("meter");
      const height = lineHeightMm(style.sizePt, style.factor);
      need(style.keepMm);
      cardTitle(title);
      const labelWidth = CONTENT_WIDTH_MM * 0.3;
      const trackWidth = CONTENT_WIDTH_MM * 0.42;
      for (const item of items) {
        const label = cleanReportText(item?.label, 80);
        if (!label) continue;
        need(height);
        setStyle(fontOf(style.font), style.sizePt, INK.muted);
        pdf.text(label, MARGIN_X_MM, cursorY);

        const max = Number(item?.max) > 0 ? Number(item.max) : 0;
        const value = Number(item?.value);
        if (max > 0 && Number.isFinite(value)) {
          const ratio = Math.max(0, Math.min(1, value / max));
          pdf.setFillColor(INK.rule[0], INK.rule[1], INK.rule[2]);
          pdf.rect(MARGIN_X_MM + labelWidth, cursorY - 2.4, trackWidth, 1.8, "F");
          if (ratio > 0) {
            pdf.setFillColor(INK.accent[0], INK.accent[1], INK.accent[2]);
            pdf.rect(MARGIN_X_MM + labelWidth, cursorY - 2.4, trackWidth * ratio, 1.8, "F");
          }
        }

        setStyle(fontOf(style.font), style.sizePt, inkOf(style.color));
        const display = cleanReportText(item?.display, 120);
        pdf.text(display, MARGIN_X_MM + CONTENT_WIDTH_MM, cursorY, { align: "right" });
        cursorY += height;
      }
      space(style.spaceMm);
    },

    image(dataUrl: string, widthMm: number, heightMm: number, caption = "") {
      const style = styleOf("image");
      need(heightMm + (caption ? lineHeightMm(8.5, 1.5) : 0));
      // 가운데 세운다 — 바디그래프는 세로로 길어 본문 폭보다 좁다.
      const x = MARGIN_X_MM + (CONTENT_WIDTH_MM - widthMm) / 2;
      pdf.addImage(dataUrl, "JPEG", x, cursorY, widthMm, heightMm, undefined, "MEDIUM");
      cursorY += heightMm;
      // 🔴 캡션이 없으면 여백을 더 벌리지 않는다 — 추출 전 초융합은 cursorY += h 뒤 space(3)
      //    하나뿐이었고, 여기서 2mm 를 더 넣으면 도표 아래 간격이 소리 없이 벌어진다.
      if (caption) {
        space(2);
        setStyle(fonts.body, 8.5, INK.muted);
        pdf.text(caption, MARGIN_X_MM + CONTENT_WIDTH_MM / 2, cursorY, { align: "center" });
        cursorY += lineHeightMm(8.5, 1.5);
      }
      space(style.spaceMm);
    },
  };
}

export type TypesetWriter = ReturnType<typeof createTypesetWriter>;

export function drawContentsPage(
  pdf: JsPDFInstance,
  fonts: PdfFonts,
  page: number,
  entries: { label: string; page: number }[],
  heading: string,
): void {
  pdf.setPage(page);
  pdf.setFont(fonts.title, "normal");
  pdf.setFontSize(15);
  pdf.setTextColor(INK.title[0], INK.title[1], INK.title[2]);
  pdf.text(heading, MARGIN_X_MM, MARGIN_TOP_MM + 6);

  let cursorY = MARGIN_TOP_MM + 20;
  pdf.setFont(fonts.body, "normal");
  pdf.setFontSize(10.5);
  for (const entry of entries) {
    // 차례가 한 페이지를 넘으면 나머지는 싣지 않는다 — 넘쳐서 겹쳐 찍히는 것보다 낫다.
    if (cursorY > CONTENT_BOTTOM_MM) break;
    pdf.setTextColor(INK.body[0], INK.body[1], INK.body[2]);
    const label = (pdf.splitTextToSize(entry.label, CONTENT_WIDTH_MM - 14) as string[])[0] || entry.label;
    pdf.text(label, MARGIN_X_MM, cursorY);
    pdf.setTextColor(INK.muted[0], INK.muted[1], INK.muted[2]);
    pdf.text(String(entry.page), MARGIN_X_MM + CONTENT_WIDTH_MM, cursorY, { align: "right" });
    cursorY += lineHeightMm(10.5, 2.1);
  }
}

export function drawFooters(pdf: JsPDFInstance, fonts: PdfFonts, watermarkText: string, fromPage = 3): void {
  const total = pdf.getNumberOfPages();
  // 표지(1)와 차례(2)에는 쪽번호를 넣지 않는다 — 본문 쪽번호와 차례의 숫자가 어긋나면 안 된다.
  for (let page = fromPage; page <= total; page += 1) {
    pdf.setPage(page);
    pdf.setFont(fonts.body, "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(INK.muted[0], INK.muted[1], INK.muted[2]);
    pdf.text(watermarkText, MARGIN_X_MM, FOOTER_BASELINE_MM);
    pdf.text(String(page), MARGIN_X_MM + CONTENT_WIDTH_MM, FOOTER_BASELINE_MM, { align: "right" });
  }
}

export type CapturedImage = { dataUrl: string; ratio: number };

/**
 * 요소 하나를 캡처한다. 없거나 비면 null — 도표는 본문이 아니므로 조용히 건너뛴다.
 *
 * 🔴 scale 을 호출부가 정한다. 화면 캡처(초융합 도표)는 dpr 로 충분하지만 바디그래프는 게이트
 *    번호가 9px 라 그 배율로 찍으면 뭉갠다.
 */
export async function captureElementAsImage(
  target: string | HTMLElement,
  options: { backgroundColor?: string; scale?: number; quality?: number } = {},
): Promise<CapturedImage | null> {
  if (typeof document === "undefined") return null;
  const element = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (!element) return null;
  try {
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(element, {
      backgroundColor: options.backgroundColor ?? "#12102a",
      scale: options.scale ?? Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1.5),
      useCORS: true,
    });
    if (!canvas.width || !canvas.height) return null;
    return { dataUrl: canvas.toDataURL("image/jpeg", options.quality ?? 0.82), ratio: canvas.height / canvas.width };
  } catch {
    return null;
  }
}
