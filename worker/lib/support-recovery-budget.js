import { createHash } from 'node:crypto';

export const supportRecoveryPartHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function supportRecoveryGenerationOptions(recovery) {
  if (!recovery) return {};
  if (!recovery.active || recovery.approvedProvider !== 'gemini' || recovery.approvedModel !== 'gemini-2.5-flash'
    || recovery.maxOutputTokens !== 12000) {
    throw Object.assign(new Error('승인된 지원 복구 제공자 설정을 확인하지 못했습니다.'), { code: 'SUPPORT_RECOVERY_SCOPE_INVALID' });
  }
  return { model: recovery.approvedModel, maxOutputTokens: recovery.maxOutputTokens, fallbackToWorkersAI: false, maxProviderAttempts: 1 };
}

export function assertSupportRecoveryPreserved(recovery, parts) {
  for (const [key, hash] of Object.entries(recovery?.preserved || {})) {
    const part = parts.find(row => row.key === key);
    if (!part || supportRecoveryPartHash(part.body) !== hash) {
      throw Object.assign(new Error('보존 대상으로 지정된 상담 원문이 변경되었습니다.'), { code: 'SUPPORT_RECOVERY_ORIGINAL_CHANGED' });
    }
  }
}

// A one-time operator recovery shares its limit with browser and cron requests.
// Ordinary generation keeps its existing attempt budget.
export async function reserveSupportRecoveryAttempt({ Model, id, userId, lockToken }) {
  const filter = { id, userId: String(userId), 'llmMeta.lockToken': lockToken };
  const current = await Model.findOne(filter).select('llmMeta.supportRecovery').lean();
  if (!current) throw Object.assign(new Error('상담 생성 잠금이 변경되었습니다.'), { code: 'SUPPORT_RECOVERY_LOCK_LOST' });
  const recovery = current?.llmMeta?.supportRecovery;
  if (!recovery) return;
  if (!recovery.active || !Number.isInteger(recovery.maxProviderCalls) || recovery.maxProviderCalls < 1) {
    throw Object.assign(new Error('지원 복구가 종료되었거나 호출 한도를 확인하지 못했습니다.'), { code: 'SUPPORT_RECOVERY_BUDGET_EXHAUSTED' });
  }
  const reserved = await Model.findOneAndUpdate({ ...filter,
    'llmMeta.supportRecovery.active': true,
    'llmMeta.supportRecovery.callsReserved': { $lt: recovery.maxProviderCalls },
  }, { $inc: { 'llmMeta.supportRecovery.callsReserved': 1 } }, { new: true }).lean();
  if (!reserved) throw Object.assign(new Error('승인된 지원 복구 호출 한도를 모두 사용했습니다.'), { code: 'SUPPORT_RECOVERY_BUDGET_EXHAUSTED' });
}
