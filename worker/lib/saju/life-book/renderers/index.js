import { renderDefaultChapterBlock } from "./common.js";
import { renderSajuCh1Wonguk } from "./SajuCh1_Wonguk.js";
import { renderSajuCh2Design } from "./SajuCh2_Design.js";
import { renderSajuCh3Yongshin } from "./SajuCh3_Yongshin.js";
import { renderSajuCh4Daeun } from "./SajuCh4_Daeun.js";
import { renderSajuCh5Geokguk } from "./SajuCh5_Geokguk.js";
import { renderSajuCh6Relation } from "./SajuCh6_Relation.js";
import { renderSajuCh7Love } from "./SajuCh7_Love.js";
import { renderSajuCh8WealthCareer } from "./SajuCh8_WealthCareer.js";
import { renderSajuCh9Health } from "./SajuCh9_Health.js";
import { renderSajuCh10HiddenCode } from "./SajuCh10_HiddenCode.js";
import { renderSajuCh11Roadmap2026 } from "./SajuCh11_Roadmap2026.js";
import { renderSajuCh12MasterPlan } from "./SajuCh12_MasterPlan.js";
import { renderSajuCh13Final } from "./SajuCh13_Final.js";

const RENDERERS = {
  I: renderSajuCh1Wonguk,
  II: renderSajuCh2Design,
  III: renderSajuCh3Yongshin,
  IV: renderSajuCh4Daeun,
  V: renderSajuCh5Geokguk,
  VI: renderSajuCh6Relation,
  VII: renderSajuCh7Love,
  VIII: renderSajuCh8WealthCareer,
  IX: renderSajuCh9Health,
  X: renderSajuCh10HiddenCode,
  XI: renderSajuCh11Roadmap2026,
  XII: renderSajuCh12MasterPlan,
  XIII: renderSajuCh13Final,
};

export function renderSajuChapter(chapter, index) {
  const roman = String(chapter?.roman || "").trim().toUpperCase();
  const renderer = RENDERERS[roman];
  if (typeof renderer === "function") {
    return renderer(chapter, index);
  }
  return renderDefaultChapterBlock(chapter, index);
}
