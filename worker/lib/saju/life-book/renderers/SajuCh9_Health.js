import { renderDefaultChapterBlock, sanitizeChapterInput } from "./common.js";

export function renderSajuCh9Health(chapter, index) {
  const safe = sanitizeChapterInput(chapter, index);
  return renderDefaultChapterBlock({ ...safe }, index);
}
