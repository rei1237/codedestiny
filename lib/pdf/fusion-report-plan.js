// 초융합 텍스트 PDF 의 **문서 구성**. 조판(jsPDF)·DOM·네트워크를 하나도 타지 않는 순수 모듈이다.
//
// 왜 .ts 가 아니라 .js 인가: 이 레포의 Jest 에는 TypeScript 프리셋이 없고(jest.config.cjs 주석 참고)
// package-lock.json 을 건드릴 수 없어 새로 넣을 수도 없다. 구성 로직을 여기 JS 로 두면
// verify 스크립트가 **실제로 실행해** "빠진 장·빈 장·개인정보 유출"을 잴 수 있다.
// export-fusion-report-pdf.ts 는 이 결과를 받아 그리기만 한다.

/** @typedef {{ title?: string, content?: string, keyPoints?: string[] }} FusionReportSection */

export const FUSION_REPORT_SECTIONS = Object.freeze([
  { key: "sajuSection", fallbackTitle: "사주" },
  { key: "ziweiSection", fallbackTitle: "자미두수" },
  { key: "vedicSection", fallbackTitle: "베다점" },
  { key: "sukuyoSection", fallbackTitle: "숙요점" },
  { key: "astrologySection", fallbackTitle: "점성술" },
  { key: "tarotSection", fallbackTitle: "타로" },
  { key: "integratedReading", fallbackTitle: "여섯 체계 통합 리딩" },
]);

export function cleanReportText(value, max = 60000) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);
}

/**
 * 결과 JSON 을 장(chapter) 목록으로 옮긴다.
 *
 * @param {object} result 배달된 초융합 결과
 * @param {{ includeVisual?: boolean }} [options] 도표 캡처에 성공했을 때만 그 장을 넣는다
 * @returns {{ kicker: string, title: string, blocks: object[] }[]}
 */
export function buildFusionReportPlan(result = {}, { includeVisual = false } = {}) {
  const chapters = [];
  const push = (kicker, title, blocks) => {
    const kept = blocks.filter(Boolean);
    // 빈 장은 만들지 않는다 — 제목만 있는 페이지가 곧 "빈 페이지"다.
    if (kept.length) chapters.push({ kicker, title, blocks: kept });
  };
  const list = (items, heading) => {
    const kept = (items || []).map((item) => cleanReportText(item, 600)).filter(Boolean);
    return kept.length ? [{ kind: "heading", text: heading }, { kind: "bullets", items: kept }] : [];
  };

  const opening = cleanReportText(result.openingMessage);
  const summary = cleanReportText(result.executiveSummary);
  push("여는 말", "이번 리딩이 답하려는 것", [
    opening ? { kind: "lead", text: opening } : null,
    summary ? { kind: "heading", text: "한 문단 요약" } : null,
    summary ? { kind: "body", text: summary } : null,
  ]);

  if (includeVisual) {
    push("한눈에", "여섯 체계가 가리키는 방향", [
      { kind: "visual" },
      { kind: "caption", text: "체계별 신호 강도 · 12개월 시기 라인 · 교차 검증. 사람을 평가하는 점수가 아닙니다." },
    ]);
  }

  for (const { key, fallbackTitle } of FUSION_REPORT_SECTIONS) {
    const section = result[key];
    const content = cleanReportText(section?.content);
    if (!content) continue;
    push(fallbackTitle, cleanReportText(section?.title, 200) || fallbackTitle, [
      { kind: "body", text: content },
      ...list(section?.keyPoints, "이 체계가 남긴 신호"),
    ]);
  }

  const verdict = result.finalVerdict;
  const rationale = cleanReportText(verdict?.rationale);
  if (rationale) {
    const headline = cleanReportText(verdict?.headline, 400);
    const confidence = Number(verdict?.confidence);
    const stances = (verdict?.systemVerdicts || [])
      .map((item) => `${cleanReportText(item?.label, 40)} — ${cleanReportText(item?.note, 400)}`)
      .filter((line) => line.replace(/[—\s]/g, "").length > 1);
    push("결론", "여섯 체계의 최종 교차 판정", [
      headline ? { kind: "lead", text: headline } : null,
      Number.isFinite(confidence) ? { kind: "caption", text: `체계 간 합의 ${Math.round(confidence)}%` } : null,
      ...(stances.length ? [{ kind: "heading", text: "체계별 입장" }, { kind: "bullets", items: stances }] : []),
      { kind: "heading", text: "이 결론이 남는 이유" },
      { kind: "body", text: rationale },
      ...list(verdict?.doNow, "지금 할 것"),
      ...list(verdict?.avoid, "피할 것"),
    ]);
  }

  const timing = result.timingAndAction;
  const timingContent = cleanReportText(timing?.content);
  if (timingContent) {
    push("시기와 행동", cleanReportText(timing?.title, 200) || "앞으로 12개월", [
      { kind: "body", text: timingContent },
      ...list(timing?.luckyActions, "이번 흐름에서 해볼 일"),
      ...list(timing?.cautionPatterns, "주의해서 볼 반복 패턴"),
    ]);
  }

  const closing = cleanReportText(result.closingMessage);
  push("맺음말", "마지막으로", [closing ? { kind: "lead", text: closing } : null]);

  return chapters;
}

/** 조판 없이 본문 글자 수만 센다 — 캡처 PDF 와 분량을 비교할 때 쓴다. */
export function countFusionReportChars(chapters = []) {
  return chapters.reduce((total, chapter) => total + chapter.blocks.reduce((sum, block) => {
    if (block.kind === "bullets") return sum + block.items.join("").length;
    return sum + String(block.text || "").length;
  }, chapter.title.length), 0);
}
