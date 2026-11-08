import { isStoredChemiReport } from '../../lib/records/stored-bias-shape.js';

export const DESTINY_BIAS_DETAILS_FEATURE_KEY = "destiny-bias-analyze";
const failure = (status, code, message) => ({ status, body: { ok: false, error: { code, message } } });

/** Account-owned immutable snapshots. Lookup never consumes a pass or creates a result. */
export async function readOrSaveBiasDetails({ userId, input, save }, deps) {
  // An opaque lookup key is not payment evidence. Never receive or persist the raw birthday here.
  if (!/^[a-f0-9]{64}$/.test(input?.inputHash || '') || !['roster', 'preset'].includes(input?.partner?.kind) ||
      !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(input?.partner?.id || '')) {
    return failure(400, 'INVALID_INPUT', '최애와 생년월일 입력을 확인해 주세요.');
  }
  const identity = { hash: input.inputHash, requestId: `destiny-bias-analyze:${input.inputHash}` };
  const owner = String(userId);
  const query = { userId: owner, featureKey: DESTINY_BIAS_DETAILS_FEATURE_KEY, 'metadata.biasPaidDetailsVersion': 1, 'metadata.biasInputHash': identity.hash, status: 'success' };
  const existing = await deps.find(query);
  if (existing) {
    if (await deps.revoked(owner, DESTINY_BIAS_DETAILS_FEATURE_KEY, existing)) return failure(403, 'RESULT_REVOKED', '환불 또는 취소된 리포트예요. 결제 내역을 확인해 주세요.');
    const report = existing.metadata?.chemiReport;
    if (!isStoredChemiReport(report)) return failure(503, 'RESULT_UNAVAILABLE', '저장된 리포트를 확인하지 못했어요. 다시 시도해 주세요.');
    if (report.result.partner.kind !== input.partner.kind || report.result.partner.id !== input.partner.id) return failure(409, 'INPUT_MISMATCH', '저장된 리포트의 최애를 확인해 주세요.');
    return { status: 200, body: { ok: true, found: true, report } };
  }
  if (!save) return { status: 200, body: { ok: true, found: false } };
  if (!isStoredChemiReport(input.report) || input.report.result.partner.kind !== input.partner.kind || input.report.result.partner.id !== input.partner.id) {
    return failure(400, 'INVALID_REPORT', '저장할 상세 리포트를 확인해 주세요.');
  }
  const requestId = String(input.requestId || identity.requestId);
  if (!/^[\w:_.|-]{12,120}$/.test(requestId)) return failure(400, 'INVALID_RECEIPT', '결제 요청 번호를 확인해 주세요.');
  let proof = await deps.prove({ userId: owner, requestId, profileId: String(input.profileId || ''), requireExisting: true });
  if (proof?.proven === false && input.accessMethod === 'pass') {
    proof = await deps.prove({ userId: owner, requestId, profileId: String(input.profileId || ''), requireExisting: false });
  }
  if (proof?.proven === null) return failure(503, 'PAYMENT_CHECK_UNAVAILABLE', '구매 정보 확인이 지연되고 있어요. 다시 결제하지 말고 잠시 후 다시 확인해 주세요.');
  if (proof?.proven !== true) return failure(403, 'PAYMENT_NOT_VERIFIED', '구매 정보를 확인하지 못했어요. 결제 내역을 확인해 주세요.');
  // One receipt cannot be reused to save a different partner/birthday. The existing unique index makes races safe.
  const executionKey = `bias-details:${owner}:${await deps.signature(proof.transactionId || requestId)}`;
  const doc = await deps.save({ userId: owner, executionKey, featureKey: DESTINY_BIAS_DETAILS_FEATURE_KEY, reportType: DESTINY_BIAS_DETAILS_FEATURE_KEY,
    reportId: executionKey, requestId, transactionId: proof.transactionId || '', profileId: String(input.profileId || ''), preserveOriginal: true,
    metadata: { biasPaidDetailsVersion: 1, biasInputHash: identity.hash, chemiReport: input.report, accessType: proof.source,
      result: { canonical: { version: 'destiny-bias-record-v1', chemiReport: input.report } } },
    archive: { title: '최애운명 상세 케미 리포트', subtitle: input.report.result.partner.displayName,
      summary: input.report.copy.oneLiner,
      sections: input.report.vm.detailedTabs.flatMap(tab => tab.sections.map(section => ({ title: `${tab.title} · ${section.title}`, body: section.text }))) },
  });
  if (doc.metadata?.biasInputHash !== identity.hash) return failure(409, 'RECEIPT_ALREADY_USED', '이 결제는 다른 리포트에 연결되어 있어요. 결제 내역을 확인해 주세요.');
  if (await deps.revoked(owner, DESTINY_BIAS_DETAILS_FEATURE_KEY, doc)) return failure(403, 'RESULT_REVOKED', '환불 또는 취소된 리포트예요.');
  return { status: 200, body: { ok: true, found: true, report: doc.metadata.chemiReport } };
}
