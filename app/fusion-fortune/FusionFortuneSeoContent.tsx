import { ExpertGuide } from "./ExpertGuide";
import { getFusionExpertCopy } from "./_lib/expert-labels";
const copy = getFusionExpertCopy("ko");
export const FUSION_FORTUNE_FAQS = [
  { question: copy.guide, answer: copy.guideBody },
  { question: copy.valueTitle, answer: copy.valueIntro },
];
export function FusionFortuneSeoContent() { return <ExpertGuide />; }
