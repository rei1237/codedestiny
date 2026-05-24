import { renderDefaultChapterBlock, sanitizeChapterInput } from "./common.js";

export function renderSajuCh4Daeun(chapter, index) {
  const safe = sanitizeChapterInput(chapter, index);
  return renderDefaultChapterBlock({ ...safe }, index);
}
