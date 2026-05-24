import { renderDefaultChapterBlock, sanitizeChapterInput } from "./common.js";

export function renderSajuCh8WealthCareer(chapter, index) {
  const safe = sanitizeChapterInput(chapter, index);
  return renderDefaultChapterBlock({ ...safe }, index);
}
