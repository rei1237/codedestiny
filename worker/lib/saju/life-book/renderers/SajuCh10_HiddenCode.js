import { renderDefaultChapterBlock, sanitizeChapterInput } from "./common.js";

export function renderSajuCh10HiddenCode(chapter, index) {
  const safe = sanitizeChapterInput(chapter, index);
  return renderDefaultChapterBlock({ ...safe }, index);
}
