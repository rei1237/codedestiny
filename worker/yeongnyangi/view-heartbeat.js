// Result-page heartbeat: the completion mail goes only to buyers who were not looking when the reading finished.
//
// The result page polls its GET route every few seconds while generating. Writing on every poll would add a
// DB write per poll, so the conditional filter lets at most one write through per VIEW_HEARTBEAT_MS.
// 🔴 timestamps:false — recovery's abandonedRequestFilter reads updatedAt; a watching buyer must not look "active".
// 🔴 Never throws: a failed heartbeat must not fail the read of a paid result.
// Namespace import: route tests mock repository.js without this helper's needs and must keep linking.
import * as repository from './repository.js';

export const VIEW_HEARTBEAT_MS = 20_000;

export async function touchViewed(env, userId, requestId, now = new Date()) {
  try {
    const cutoff = new Date(now.getTime() - VIEW_HEARTBEAT_MS);
    const result = await repository.YeongnyangiRequest.updateOne(
      { _id: String(requestId), userId: repository.ownerId(userId), $or: [{ lastViewedAt: null }, { lastViewedAt: { $lt: cutoff } }] },
      { $set: { lastViewedAt: now } },
      { timestamps: false },
    );
    return Number(result?.modifiedCount || 0) > 0;
  } catch {
    return false;
  }
}
