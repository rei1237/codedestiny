import { renderDefaultChapterBlock, sanitizeChapterInput } from "./common.js";

export function renderSajuCh7Love(chapter, index) {
  const safe = sanitizeChapterInput(chapter, index);
  return renderDefaultChapterBlock({ ...safe }, index);
}
