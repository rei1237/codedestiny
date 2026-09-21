// Reviewed tariffs are supplied by the operator; model prices are never guessed.
export function costUsageByModel(rows, tariffs) {
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.serviceId}|${row.provider}/${row.model}`;
    const tariff = tariffs?.[`${row.provider}/${row.model}`];
    const valid = tariff && tariff.sourceRefs?.length && Number.isFinite(Date.parse(tariff.reviewedAt))
      && [tariff.inputUsdPerMillion, tariff.cachedInputUsdPerMillion, tariff.outputUsdPerMillion].every(n => Number.isFinite(n) && n >= 0)
      && typeof tariff.thinkingIncludedInOutput === "boolean" && !row.estimated
      && [row.inputTokens, row.cachedInputTokens, row.outputTokens, row.thinkingTokens].every(n => Number.isFinite(n) && n >= 0)
      && row.cachedInputTokens <= row.inputTokens;
    const group = groups.get(key) || { serviceId: row.serviceId, provider: row.provider, model: row.model, calls: 0, costUsd: 0, complete: true, sourceRefs: tariff?.sourceRefs || [] };
    group.calls += 1;
    if (!valid) { group.complete = false; group.costUsd = null; }
    else if (group.complete) {
      const cached = Math.min(row.inputTokens, row.cachedInputTokens);
      group.costUsd += ((row.inputTokens - cached) * tariff.inputUsdPerMillion + cached * tariff.cachedInputUsdPerMillion
        + (row.outputTokens + (tariff.thinkingIncludedInOutput ? 0 : row.thinkingTokens)) * tariff.outputUsdPerMillion) / 1_000_000;
    }
    groups.set(key, group);
  }
  return [...groups.values()];
}
