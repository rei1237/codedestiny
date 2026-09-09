import { ExpertGuide } from "./ExpertGuide";

// The report order is separate from home marketing copy and localized in ExpertGuide.
const RESULT_BLOCKS = ["saju", "ziwei", "vedic", "sukuyo", "astrology", "tarot"] as const;
export function FusionValuePreview() { return <ExpertGuide mode="value" systems={RESULT_BLOCKS} />; }
