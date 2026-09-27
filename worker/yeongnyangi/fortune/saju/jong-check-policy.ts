// Tiers that receive 종격·용신 evidence. Same set as chapter-facts.ts selectedFacts and
// ask/packet.ts buildEvidencePacket — lower tiers strip `jong`/`usefulGod`, so asking there
// would change nothing the reading can see. Dependency-free: the input screen imports it too.
export const JONG_CHECK_TIERS=['tuna','assorted','omakase'] as const;

export function jongCheckApplies(product:{systems:readonly string[];fishId:string}) {
 return product.systems.includes('saju')&&(JONG_CHECK_TIERS as readonly string[]).includes(product.fishId);
}
