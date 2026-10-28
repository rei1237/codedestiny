// Tiers that offer the past-experience survey. Same set as chapter-facts.ts selectedFacts and
// ask/packet.ts buildEvidencePacket — lower tiers strip 대운·용신 evidence, so the survey would
// change nothing the reading can see. Dependency-free: the input screen imports it too.
export const EXPERIENCE_CHECK_TIERS=['tuna','assorted','omakase'] as const;

export function experienceCheckApplies(product:{systems:readonly string[];fishId:string}) {
 return product.systems.includes('saju')&&(EXPERIENCE_CHECK_TIERS as readonly string[]).includes(product.fishId);
}
