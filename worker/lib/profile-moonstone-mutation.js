import { MonthlyCreditLedger } from "./models.js";
import { findMoonstoneSpendEvidence, moonstoneSpendRefundFilter, isMoonstoneSpendRefunded } from "./moonstone-spend-proof.js";
import { restoreMonthlyCreditLot } from "./monthly-credit-store.js";
import { PROFILE_CARD_ACCEPTED_MONTHLY_STONE_COSTS, PROFILE_CARD_DELETE_COST_MONTHLY_STONES } from "./profile-card-mutation-policy.js";

import { profileMutationAction } from "./profile-mutation-context.js";

export async function findProfileMoonstoneEvidence({ userId, action, profileId, requestId }) {
  const proof = await findMoonstoneSpendEvidence(null, {
    userId, featureKeys: ["profile-card-manage"], tokens: [requestId], minimumAmount: PROFILE_CARD_DELETE_COST_MONTHLY_STONES,
  });
  if (!proof) return null;
  const row = await MonthlyCreditLedger.findOne({ _id: proof.ledgerId, userId, ...moonstoneSpendRefundFilter() }).lean();
  // 정확한 가격만 인정한다: 현행가(100) 또는 2026-10-10 인하 전 차감분(500). 그 밖의 금액은 증빙이 아니다.
  if (!row || row.sourceId !== requestId || row.profileId !== profileId || !PROFILE_CARD_ACCEPTED_MONTHLY_STONE_COSTS.includes(row.amount)) return null;
  const storedAction = profileMutationAction(row.metadata?.profileAction);
  if (storedAction ? storedAction !== action : !row.sourceId.startsWith(`profile-card:${action}:${profileId}:`)) return null;
  return { ...row, moonstoneLedger: true, metadata: { ...row.metadata, accessType: "membership_credit", membershipCreditCost: row.amount, profileId, profileAction: action } };
}

export async function refundProfileMoonstone(evidence, userId, reason) {
  const filter = { _id: evidence._id, userId, type: "MONTHLY_CREDIT_SPEND", serviceKey: "profile-card-manage" };
  let row = await MonthlyCreditLedger.findOne(filter).lean();
  if (!row || row.metadata?.profileMutationCompleted || row.metadata?.profileMutationRefundCompletedAt) return false;
  if (isMoonstoneSpendRefunded(row) && !row.metadata?.profileMutationRefundPending) return false;
  // Revoke proof before restoring the lot; a crash resumes the same lot ID, never a second grant.
  const reserved = await MonthlyCreditLedger.updateOne({ ...filter, "metadata.profileMutationCompleted": { $ne: true } }, { $set: {
    "metadata.refundedForUnlockFailure": true, "metadata.refundedForServiceExecution": true, "metadata.profileMutationRefundPending": true, "metadata.profileMutationRefundReason": reason,
  } });
  if (!reserved.matchedCount) return false;
  const restored = await restoreMonthlyCreditLot({ userId, lotId: `profile-mutation-refund:${row._id}`, amount: row.amount, pullRequestId: row.sourceId });
  if (!restored) throw new Error("PROFILE_MOONSTONE_RESTORE_PENDING");
  await MonthlyCreditLedger.updateOne(filter, { $set: {
    "metadata.profileMutationRefundPending": false, "metadata.profileMutationRefundCompletedAt": new Date(), "metadata.profileMutationInProgress": false,
  } });
  return true;
}
