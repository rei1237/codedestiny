import crypto from "node:crypto";
import {
  deleteBillingEvidenceClaims,
  findBillingEvidenceClaim,
  insertBillingEvidenceClaim,
} from "./billing-evidence-claim-store.js";

/**
 * 결제·차감 증빙 1건 = 유료 요청 1건.
 *
 * 왜 있는가 — 여러 유료 라우트가 본문의 결제·차감 ID 를 userId+featureKey 로만 대조해, 한 번 결제한
 * 증빙으로 요청 키만 바꿔 몇 번이든 새 상담을 열 수 있었다(2026-10-16 감사, 찻집 사건 후속).
 * 증빙을 처음 쓴 요청(userId·requestId)에 묶어 두고, 다른 요청이 같은 증빙을 내밀면 409 다.
 * 같은 요청의 재시도·재조회는 그대로 통과한다(멱등).
 *
 * 증빙 ID 는 컬렉션과 무관하게 한 이름공간이다(`sha256("evidence:<id>")`) — 같은 차감 행을 토큰 경로와
 * 본문 경로로 번갈아 내밀어도 같은 claim 에 걸린다. ObjectId·결제 merchantUid·원장 ID 는 서로 겹치지 않는다.
 *
 * 🔴 claim 은 최종 생성·시작 지점에서만 잡는다(ensure-access·preflight 에서 잡으면 한 구매가 여러
 * 엔드포인트를 지나며 스스로 409 에 걸린다). 생성이 최종 실패하면 releaseBillingEvidenceClaim 으로 푼다.
 * 이용권 차감(consumePassForFeature)은 이미 requestId 별이라 claim 대상이 아니다.
 * 일시적 DB 오류는 삼키지 않고 던진다 — 호출부가 503 으로 돌린다(402·409 로 바꾸면 결제한 사람이 막힌다).
 * 남는 위험: 배포 전에 이미 쓰인 증빙은 claim 이 없어, 배포 뒤 한 번은 더 쓰일 수 있다(소급 차단 안 함).
 */
export const EVIDENCE_ALREADY_USED = "EVIDENCE_ALREADY_USED";
export const EVIDENCE_ALREADY_USED_MESSAGE = "이미 다른 상담에 사용된 결제입니다. 새 상담은 새로 결제해 주세요.";

const clean = (value, max = 200) => String(value ?? "").trim().slice(0, max);
export const billingEvidenceClaimId = (id) => crypto.createHash("sha256").update(`evidence:${clean(id, 300)}`).digest("hex");

function claimIds(evidenceIds) {
  const list = (Array.isArray(evidenceIds) ? evidenceIds : [evidenceIds]).map((id) => clean(id, 300)).filter(Boolean);
  return [...new Set(list.map(billingEvidenceClaimId))];
}

export function evidenceAlreadyUsedResult() {
  return { ok: false, status: 409, code: EVIDENCE_ALREADY_USED, message: EVIDENCE_ALREADY_USED_MESSAGE };
}

/**
 * @param {{userId:string, featureKey?:string, requestId:string, evidenceIds:string[]|string, kind?:string}} input
 * @returns {Promise<{ok:true, claimed:number, replayed:number} | {ok:false, status:number, code:string, message:string}>}
 */
export async function claimBillingEvidence(env, { userId, featureKey = "", requestId, evidenceIds, kind = "" } = {}) {
  const ids = claimIds(evidenceIds);
  const owner = { userId: clean(userId, 64), requestId: clean(requestId, 200) };
  if (!ids.length) return { ok: false, status: 402, code: "NO_EVIDENCE", message: "결제 확인이 필요해요." };
  if (!owner.userId || !owner.requestId) return { ok: false, status: 402, code: "NO_REQUEST_ID", message: "결제 확인이 필요해요." };
  const inserted = [];
  let replayed = 0;
  try {
    for (const _id of ids) {
      if (await insertBillingEvidenceClaim(env, { _id, ...owner, featureKey: clean(featureKey, 120), kind: clean(kind, 60), claimedAt: new Date() })) {
        inserted.push(_id);
        continue;
      }
      const existing = await findBillingEvidenceClaim(env, _id);
      if (!existing || existing.userId !== owner.userId || existing.requestId !== owner.requestId) {
        await rollback(env, inserted, owner);
        return evidenceAlreadyUsedResult();
      }
      replayed += 1;
    }
  } catch (error) {
    await rollback(env, inserted, owner).catch(() => {});
    throw error;
  }
  return { ok: true, claimed: inserted.length, replayed };
}

async function rollback(env, ids, owner) {
  if (ids.length) await deleteBillingEvidenceClaims(env, ids, owner);
}

/**
 * 생성이 최종 실패해 본문을 하나도 주지 않았을 때만 부른다 — 결제한 사람이 새 시도로 다시 받을 수 있게.
 * 이 요청이 잡은 claim 만 푼다. 실패는 삼킨다(정리 실패가 오류 응답을 바꾸면 안 된다).
 */
export async function releaseBillingEvidenceClaim(env, { userId, requestId, evidenceIds } = {}) {
  const ids = claimIds(evidenceIds);
  const owner = { userId: clean(userId, 64), requestId: clean(requestId, 200) };
  if (!ids.length || !owner.userId || !owner.requestId) return { released: 0 };
  try {
    return { released: await deleteBillingEvidenceClaims(env, ids, owner) };
  } catch {
    return { released: 0 };
  }
}
