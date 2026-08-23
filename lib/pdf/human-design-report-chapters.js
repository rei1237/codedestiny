// 휴먼 디자인 리포트 플랜 → **조판 엔진이 먹는 장 목록**. 🔴 순수 .js (jsPDF·DOM 0).
//
// 🔴 이 파일은 문서를 다시 구성하지 않는다. 순서·제목·문장은 전부
//    lib/human-design/report-plan.js 가 이미 정했고, 여기서 하는 일은 **도표 블록을 실제
//    이미지 크기로 바꾸는 것** 하나다. 웹은 SVG 를 마운트하고 PDF 는 캡처본을 붙이므로 그
//    한 지점만 다르고, 나머지가 같아야 요구 3(웹과 PDF 가 다른 내용을 만들지 않는다)이 선다.
//
// 🔴 캡처에 실패한 슬롯은 **캡션까지 통째로** 뺀다. 그림 없이 "정의된 센터 강조" 캡션만 남으면
//    독자는 없는 그림을 찾게 된다.

import { CONTENT_BOTTOM_MM, CONTENT_WIDTH_MM, MARGIN_TOP_MM } from "./typeset-metrics.js";

/** 도표 한 장이 쓸 수 있는 최대 높이. 한 페이지를 넘으면 잘리므로 여기서 묶는다. */
const MAX_IMAGE_HEIGHT_MM = CONTENT_BOTTOM_MM - MARGIN_TOP_MM - 16;
/** 바디그래프는 세로로 길어 본문 폭을 다 쓰면 한 페이지를 넘는다. 폭을 줄여 세운다. */
const IMAGE_WIDTH_MM = Math.min(CONTENT_WIDTH_MM, 96);

/**
 * @param {object} plan buildHumanDesignReportPlan 의 출력
 * @param {Map<string, {dataUrl: string, ratio: number}>} [images] slotId → 캡처본(세로/가로 비)
 * @returns {{key: string, kicker: string, title: string, blocks: object[]}[]}
 */
export function buildHumanDesignPdfChapters(plan, images = new Map()) {
  const chapters = [];
  for (const chapter of plan?.chapters || []) {
    const blocks = [];
    for (const block of chapter.blocks || []) {
      if (block.kind !== "chart") {
        blocks.push(block);
        continue;
      }
      const captured = images.get(block.slotId);
      if (!captured?.dataUrl) continue;
      const heightMm = Math.min(IMAGE_WIDTH_MM * Number(captured.ratio || 1), MAX_IMAGE_HEIGHT_MM);
      const widthMm = heightMm / Number(captured.ratio || 1);
      blocks.push({
        kind: "image",
        dataUrl: captured.dataUrl,
        widthMm,
        heightMm,
        caption: block.caption,
        slotId: block.slotId,
      });
    }
    // 빈 장은 만들지 않는다 — 제목만 있는 페이지가 곧 "빈 페이지"다.
    if (!blocks.length) continue;
    chapters.push({
      key: chapter.key,
      kicker: String(chapter.order).padStart(2, "0"),
      title: chapter.title,
      blocks,
    });
  }
  return chapters;
}

/** 캡처해야 할 슬롯 목록. 호출부가 이 순서대로 **순차** 캡처한다. */
export function pdfChartSlots(plan) {
  return (plan?.chartSlots || []).map((slot) => ({
    slotId: slot.slotId,
    chapterKey: slot.chapterKey,
    selection: slot.selection,
    caption: slot.caption,
  }));
}

export const HD_PDF_IMAGE_WIDTH_MM = IMAGE_WIDTH_MM;
export const HD_PDF_MAX_IMAGE_HEIGHT_MM = MAX_IMAGE_HEIGHT_MM;
