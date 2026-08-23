// PDF 조판 **계산**. 🔴 순수 .js — jsPDF·DOM·네트워크·React 를 한 줄도 타지 않는다.
//
// 왜 떼어 냈는가: 조판 품질(글자 잘림·페이지 넘침·빈 페이지·제목 홀로 남기·쪽번호 불일치)은
// 눈으로 봐야만 아는 것처럼 보이지만, 사실 **전부 산술**이다. 계산을 여기 순수 모듈로 두면
// verify 스크립트가 브라우저 없이 문서 전체를 조판해 보고 그 항목들을 실제로 잰다.
//
// 🔴 상수는 여기 한 벌만 둔다. lib/pdf/typeset-writer.ts 가 이 파일을 import 하므로,
//    시뮬레이션(paginate)과 실물(writer)이 같은 여백·같은 활자 크기·같은 행간을 쓴다.
//    writer 안에 상수를 다시 적으면 그 순간부터 가드는 존재하지 않는 문서를 검사한다.
//
// 이 모듈이 .js 인 이유는 lib/pdf/fusion-report-plan.js 와 같다 — Jest 에 TS 프리셋이 없어
// verify 가 **실제로 실행해** 재려면 JS 여야 한다.

export const PAGE_WIDTH_MM = 210;
export const PAGE_HEIGHT_MM = 297;
export const MARGIN_X_MM = 22;
export const MARGIN_TOP_MM = 24;
export const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_X_MM * 2;
/** 본문이 침범하면 안 되는 하단선. 이 아래는 푸터(쪽번호·워터마크) 자리다. */
export const CONTENT_BOTTOM_MM = PAGE_HEIGHT_MM - 26;
export const FOOTER_BASELINE_MM = PAGE_HEIGHT_MM - 14;
export const PT_TO_MM = 0.352778;

/** 본문이 한 페이지에서 쓸 수 있는 최대 높이. 넘침 판정의 기준선이다. */
export const CONTENT_HEIGHT_MM = CONTENT_BOTTOM_MM - MARGIN_TOP_MM;

/** 인쇄를 전제한 팔레트. 화면의 다크 보라를 그대로 찍으면 잉크만 먹고 읽기도 나쁘다. */
export const INK = Object.freeze({
  paper: Object.freeze([252, 250, 246]),
  title: Object.freeze([38, 26, 52]),
  body: Object.freeze([46, 40, 58]),
  muted: Object.freeze([122, 112, 136]),
  accent: Object.freeze([124, 74, 168]),
  gold: Object.freeze([148, 116, 40]),
  rule: Object.freeze([222, 214, 232]),
  wash: Object.freeze([244, 240, 250]),
});

export function lineHeightMm(sizePt, factor) {
  return sizePt * PT_TO_MM * factor;
}

export function cleanReportText(value, max = 60000) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);
}

/**
 * 블록 종류별 조판 규격. **writer 와 paginate 가 이 표 하나를 함께 읽는다.**
 *
 * indentMm  본문 왼쪽 들여쓰기(불릿·단계 번호가 들어갈 자리)
 * spaceMm   블록을 그린 뒤 비우는 세로 여백
 * keepMm    이만큼도 안 남았으면 페이지를 넘긴다 — 제목만 페이지 바닥에 남는 것을 막는다
 */
export const BLOCK_STYLE = Object.freeze({
  lead: { sizePt: 11.5, factor: 1.8, indentMm: 0, spaceMm: 3, keepMm: 14, color: "title", font: "body" },
  body: { sizePt: 10.5, factor: 1.78, indentMm: 0, spaceMm: 2.5, keepMm: 10, color: "body", font: "body" },
  paragraph: { sizePt: 10.5, factor: 1.78, indentMm: 0, spaceMm: 2.5, keepMm: 10, color: "body", font: "body" },
  // 🔴 keepMm 16 은 추출 전 초융합 writer 의 need(16) 그대로다. 이 숫자를 "더 낫다" 는 이유로
  //    올리면 살아 있는 상품의 페이지 나눔이 조용히 바뀐다. 바꾸려면 실물을 보고 바꾼다.
  heading: { sizePt: 11.5, factor: 1.4, indentMm: 0, spaceMm: 2, keepMm: 16, color: "accent", font: "title" },
  caption: { sizePt: 8.5, factor: 1.5, indentMm: 0, spaceMm: 2, keepMm: 8, color: "muted", font: "body" },
  bullets: { sizePt: 10, factor: 1.7, indentMm: 6, spaceMm: 1.5, keepMm: 12, color: "body", font: "body" },
  quote: { sizePt: 12, factor: 1.75, indentMm: 8, spaceMm: 4, keepMm: 18, color: "title", font: "title" },
  insight: { sizePt: 10, factor: 1.7, indentMm: 6, spaceMm: 3, keepMm: 20, color: "body", font: "body" },
  summary: { sizePt: 10, factor: 1.7, indentMm: 6, spaceMm: 3, keepMm: 20, color: "body", font: "body" },
  steps: { sizePt: 10, factor: 1.7, indentMm: 9, spaceMm: 3, keepMm: 20, color: "body", font: "body" },
  keyvalue: { sizePt: 9.5, factor: 1.9, indentMm: 0, spaceMm: 3, keepMm: 22, color: "body", font: "body" },
  meter: { sizePt: 9.5, factor: 2.0, indentMm: 0, spaceMm: 3, keepMm: 20, color: "body", font: "body" },
  image: { sizePt: 0, factor: 0, indentMm: 0, spaceMm: 3, keepMm: 0, color: "body", font: "body" },
});

export const TYPESET_BLOCK_KINDS = Object.freeze(Object.keys(BLOCK_STYLE));

/** 카드형 블록(제목 줄 + 테두리 여백)을 그리는 종류. 높이 계산에 머리·꼬리 여백이 더 붙는다. */
const CARD_KINDS = Object.freeze(["insight", "summary", "steps", "keyvalue", "meter"]);
const CARD_HEAD_MM = 7.5;
const CARD_PAD_MM = 4;

/**
 * 폭 대비 글자 수 어림. 🔴 **실물 줄바꿈이 아니다** — 헤드리스 시뮬레이션에서만 쓰는 근사다.
 *    실제 조판은 writer 가 jsPDF 의 splitTextToSize 를 넘겨 준다(같은 paginate 를 탄다).
 *    한글은 폭이 라틴의 약 2배라 그 비율로 셈한다. 근사가 틀려도 **구조 판정**(빈 페이지·
 *    제목 홀로 남기·글자 총량 보존)은 줄바꿈과 무관하게 성립하도록 설계했다.
 */
export function estimateLines(text, sizePt, widthMm) {
  const source = String(text ?? "");
  if (!source.trim()) return [];
  // 1pt 활자의 라틴 문자 평균 폭 ≈ 0.5em. mm 로 환산해 한 줄에 들어가는 "폭 단위" 를 구한다.
  const unitMm = sizePt * PT_TO_MM * 0.5;
  const perLine = Math.max(1, Math.floor(widthMm / unitMm));
  const out = [];
  for (const paragraph of source.split("\n")) {
    if (!paragraph.trim()) { out.push(""); continue; }
    let width = 0;
    let start = 0;
    for (let i = 0; i < paragraph.length; i += 1) {
      // 한글·한자·가나는 라틴의 2배 폭으로 센다.
      width += /[　-鿿가-힯＀-￯]/.test(paragraph[i]) ? 2 : 1;
      if (width < perLine) continue;
      out.push(paragraph.slice(start, i + 1));
      start = i + 1;
      width = 0;
    }
    if (start < paragraph.length) out.push(paragraph.slice(start));
  }
  return out;
}

/** paginate 에 넘길 기본 줄바꿈기. writer 는 jsPDF 의 것을 대신 넘긴다. */
export function defaultWrap(text, sizePt, widthMm) {
  return estimateLines(text, sizePt, widthMm);
}

function itemsOf(block) {
  if (block.kind === "bullets" || block.kind === "insight" || block.kind === "summary") {
    return (block.items || []).map((item) => String(item ?? ""));
  }
  if (block.kind === "steps") {
    return (block.items || []).map((item) => (typeof item === "string" ? item : String(item?.text ?? "")));
  }
  if (block.kind === "keyvalue") {
    return (block.rows || []).map((row) => `${row?.label ?? ""} ${row?.value ?? ""}`);
  }
  if (block.kind === "meter") {
    return (block.items || []).map((item) => `${item?.label ?? ""} ${item?.display ?? ""}`);
  }
  return [];
}

/** 블록이 담고 있는 글자 전부. 조판 전후 글자 수 보존(=잘림 없음) 판정의 재료다. */
export function blockText(block) {
  if (!block || typeof block !== "object") return "";
  if (block.kind === "image") return String(block.caption ?? "");
  const parts = [];
  if (block.title) parts.push(String(block.title));
  if (block.text) parts.push(String(block.text));
  parts.push(...itemsOf(block));
  return parts.join("\n");
}

/**
 * 블록 하나가 차지하는 세로 높이(mm). 여백까지 포함한다.
 * @param {object} block
 * @param {(text: string, sizePt: number, widthMm: number) => string[]} wrap
 */
export function measureBlockHeightMm(block, wrap = defaultWrap) {
  const style = BLOCK_STYLE[block?.kind];
  if (!style) return 0;

  if (block.kind === "image") {
    return Number(block.heightMm || 0) + style.spaceMm;
  }

  const width = CONTENT_WIDTH_MM - style.indentMm - (CARD_KINDS.includes(block.kind) ? CARD_PAD_MM * 2 : 0);
  const height = lineHeightMm(style.sizePt, style.factor);
  let total = 0;

  if (CARD_KINDS.includes(block.kind) || block.kind === "bullets") {
    if (block.title) total += CARD_HEAD_MM;
    for (const item of itemsOf(block)) {
      total += Math.max(1, wrap(item, style.sizePt, width).length) * height;
      total += 1;
    }
    if (CARD_KINDS.includes(block.kind)) total += CARD_PAD_MM * 2;
  } else {
    for (const paragraph of String(block.text ?? "").split("\n")) {
      if (!paragraph.trim()) { total += height * 0.6; continue; }
      total += Math.max(1, wrap(paragraph, style.sizePt, width).length) * height;
    }
  }

  return total + style.spaceMm;
}

/**
 * 🔴 소제목 뒤에 **최소 이만큼의 본문**이 같은 페이지에 들어가야 한다. 본문 두 줄이다.
 *
 *    keepMm 만으로는 못 막는다 — 그건 제목 자기 자리만 잡고 뒤따르는 본문은 보지 않아서,
 *    제목이 페이지 바닥에 딱 들어가면 본문만 다음 장으로 넘어간다(실측: ko/en 각 1쪽).
 *    keepMm 을 올려 해결하지 않는 이유는 그 값이 초융합 조판과 공유되기 때문이다 — 살아 있는
 *    상품의 페이지 나눔을 이 문제 때문에 바꿀 수는 없다. 그래서 **내다보기**를 따로 둔다.
 */
export const HEADING_LOOKAHEAD_MM = lineHeightMm(BLOCK_STYLE.body.sizePt, BLOCK_STYLE.body.factor) * 2;

/** 장 제목 블록(kicker + 제목 + 밑줄)이 쓰는 높이. 장은 항상 새 페이지에서 시작한다. */
export const CHAPTER_HEAD_MM = lineHeightMm(8.5, 1.4) + 1.5 + lineHeightMm(17, 1.35) + 2.5 + 6;

/**
 * 문서를 페이지로 나눈다. **요구 26의 판정 대부분이 이 함수의 출력으로 결정된다.**
 *
 * 🔴 장은 언제나 새 페이지에서 시작한다. 제목이 앞 페이지 바닥에 홀로 남는 것을 구조적으로
 *    없애는 가장 단순한 방법이고, 30페이지짜리 문서에서 낭비도 크지 않다.
 * 🔴 heading 은 뒤에 본문 두 줄이 같은 페이지에 못 들어가면 통째로 넘긴다(keepMm).
 *
 * @param {{key?: string, kicker?: string, title: string, blocks: object[]}[]} chapters
 * @param {{wrap?: Function, startPage?: number}} [options] startPage 는 본문 첫 페이지 번호(표지·차례 다음)
 * @returns {{pages: object[], contents: {label: string, page: number}[]}}
 */
export function paginate(chapters, options = {}) {
  const wrap = options.wrap || defaultWrap;
  const startPage = Number.isFinite(options.startPage) ? options.startPage : 3;

  const pages = [];
  const contents = [];
  let current = null;
  let used = 0;

  const openPage = (chapterKey) => {
    current = { index: startPage + pages.length, chapterKey, blocks: [], usedMm: 0 };
    pages.push(current);
    used = 0;
  };

  for (const chapter of chapters || []) {
    openPage(chapter.key || chapter.title || "");
    contents.push({ label: chapter.title, page: current.index });
    current.blocks.push({ kind: "chapterHead", title: chapter.title, kicker: chapter.kicker || "" });
    used = CHAPTER_HEAD_MM;
    current.usedMm = used;

    const blocks = chapter.blocks || [];
    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index];
      const style = BLOCK_STYLE[block.kind];
      if (!style) continue;
      const height = measureBlockHeightMm(block, wrap);

      // 🔴 남은 자리가 keepMm 도 안 되면 넘긴다. 블록 자체가 한 페이지보다 크면(긴 문단·큰 표)
      //    넘겨도 소용없으므로 그때는 그 자리에 두고 writer 의 줄 단위 분할에 맡긴다.
      const remaining = CONTENT_HEIGHT_MM - used;
      // 소제목은 뒤에 올 본문 두 줄까지 함께 자리를 잡는다 — 제목만 바닥에 남지 않게.
      const lookahead = block.kind === "heading" && index < blocks.length - 1 ? HEADING_LOOKAHEAD_MM : 0;
      const needs = Math.min(height, style.keepMm || height) + lookahead;
      if (needs > remaining && height <= CONTENT_HEIGHT_MM) {
        openPage(chapter.key || chapter.title || "");
      }

      current.blocks.push(block);
      used += height;
      // 한 페이지를 넘는 블록은 writer 가 줄 단위로 쪼개 여러 페이지에 걸쳐 그린다.
      while (used > CONTENT_HEIGHT_MM) {
        current.usedMm = CONTENT_HEIGHT_MM;
        used -= CONTENT_HEIGHT_MM;
        openPage(chapter.key || chapter.title || "");
        current.blocks.push({ kind: "continuation", of: block.kind });
      }
      current.usedMm = used;
    }
  }

  return { pages, contents };
}

/** 조판 전 원문 글자 수(공백 제외). paginate 출력과 비교해 잘림을 잡는다. */
export function countPlanChars(chapters) {
  let total = 0;
  for (const chapter of chapters || []) {
    total += String(chapter.title || "").replace(/\s+/g, "").length;
    for (const block of chapter.blocks || []) total += blockText(block).replace(/\s+/g, "").length;
  }
  return total;
}

/** 페이지에 실제로 배치된 글자 수(공백 제외). */
export function countPaginatedChars(pages) {
  let total = 0;
  for (const page of pages || []) {
    for (const block of page.blocks || []) {
      if (block.kind === "chapterHead") { total += String(block.title || "").replace(/\s+/g, "").length; continue; }
      if (block.kind === "continuation") continue;
      total += blockText(block).replace(/\s+/g, "").length;
    }
  }
  return total;
}
