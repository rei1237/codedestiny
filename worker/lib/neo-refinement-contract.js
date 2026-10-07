export const NEO_REFINEMENT_LIMIT=2;

export function neoRefinementHistory(doc){
 if(Array.isArray(doc?.llmMeta?.refinementHistory))return doc.llmMeta.refinementHistory;
 return doc?.refinedOrder?[{order:doc.refinedOrder,realityCheck:doc.realityCheck,createdAt:doc.llmMeta?.refinedAt}]:[];
}
export function neoRefinementAllowance(doc){
 const used=Math.max(neoRefinementHistory(doc).length,(doc?.versionHistory||[]).filter(entry=>entry.documentType==='refined_order').length);
 return {limit:NEO_REFINEMENT_LIMIT,used,remaining:Math.max(0,NEO_REFINEMENT_LIMIT-used)};
}
