import { renderDefaultChapterBlock, sanitizeChapterInput } from "./common.js";

export function renderSajuCh6Relation(chapter, index) {
  const safe = sanitizeChapterInput(chapter, index);
  return renderDefaultChapterBlock({ ...safe }, index);
}
