import { renderDefaultChapterBlock, sanitizeChapterInput } from "./common.js";

export function renderSajuCh13Final(chapter, index) {
  const safe = sanitizeChapterInput(chapter, index);
  return renderDefaultChapterBlock({ ...safe }, index);
}
