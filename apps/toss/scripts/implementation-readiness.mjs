// Reporting only: source audits do not authorize sales or certify a phone build.
export function implementationReadiness(inventory, audit) {
  const candidates = inventory?.canonicalCandidates;
  if (!Array.isArray(candidates) || !candidates.length || !Array.isArray(audit?.rows)
    || audit.scopeCount !== candidates.length || audit.rows.length !== candidates.length) {
    throw new Error('Implementation audit scope mismatch');
  }
  const ids = new Set(candidates.map(item => item.id));
  const rows = new Map(audit.rows.map(row => [row.id, row]));
  if (ids.size !== candidates.length || rows.size !== audit.rows.length
    || [...rows.keys()].some(id => !ids.has(id))) throw new Error('Implementation audit ID mismatch');
  const codeGaps = [], reconciled = [], evidencePending = [];
  for (const item of candidates) {
    const row = rows.get(item.id);
    if (!Array.isArray(row.codeGaps) || row.codeGaps.some(gap => typeof gap !== 'string' || !gap.trim())) {
      throw new Error('Invalid implementation audit gaps: ' + item.id);
    }
    if (row.codeGaps.length) codeGaps.push({id:item.id, route:item.tossRoute, gaps:row.codeGaps});
    else if (['original-modes-verified','original-contract-reviewed','prior-contract-evidence-reconciled'].includes(row.reviewState)) reconciled.push(item.id);
    else evidencePending.push({id:item.id, reviewState:row.reviewState || 'missing'});
  }
  return {
    auditSource:'docs/toss/original-mode-audit-20261114.json',
    total:candidates.length,
    codeGaps,
    noRecordedCodeGaps:reconciled,
    evidencePending,
    meaning:'원본 대조에서 확인된 코드 누락만 집계합니다. 코드 누락 없음은 실기기·상품 승인·운영 출시 완료를 뜻하지 않습니다.',
  };
}
