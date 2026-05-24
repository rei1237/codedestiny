import { renderDefaultChapterBlock, sanitizeChapterInput } from "./common.js";

export function renderSajuCh12MasterPlan(chapter, index) {
  const safe = sanitizeChapterInput(chapter, index);
  return renderDefaultChapterBlock({ ...safe }, index);
}
