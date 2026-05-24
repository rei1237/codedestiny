import { renderDefaultChapterBlock, sanitizeChapterInput } from "./common.js";

export function renderSajuCh11Roadmap2026(chapter, index) {
  const safe = sanitizeChapterInput(chapter, index);
  return renderDefaultChapterBlock({ ...safe }, index);
}
