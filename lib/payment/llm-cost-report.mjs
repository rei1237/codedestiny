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
    const group = groups.get(key) || {
      serviceId: row.serviceId,
      provider: row.provider,
      model: row.model,
      calls: 0,
      costUsd: 0,
      complete: true,
      sourceRefs: tariff?.sourceRefs || [],
      requestIds: new Set(),
      billingAccesses: new Set(),
      unattributedCalls: 0,
    };
    group.calls += 1;
    if (row.requestId) group.requestIds.add(row.requestId);
    else group.unattributedCalls += 1;
    if (row.billingAccess) group.billingAccesses.add(row.billingAccess);
    if (!valid) { group.complete = false; group.costUsd = null; }
    else if (group.complete) {
      const cached = Math.min(row.inputTokens, row.cachedInputTokens);
      group.costUsd += ((row.inputTokens - cached) * tariff.inputUsdPerMillion + cached * tariff.cachedInputUsdPerMillion
        + (row.outputTokens + (tariff.thinkingIncludedInOutput ? 0 : row.thinkingTokens)) * tariff.outputUsdPerMillion) / 1_000_000;
    }
    groups.set(key, group);
  }
  return [...groups.values()].map(({ requestIds, billingAccesses, ...group }) => ({
    ...group,
    observedRequests: requestIds.size,
    billingAccesses: [...billingAccesses].sort(),
  }));
}

// Sum every model and attempt before taking request percentiles. Taking the
// percentile of individual calls understates long reports and recovery costs.
export function costUsageByRequest(rows, tariffs) {
  const groups = new Map();
  for (const row of rows) {
    if (!row.requestId) continue;
    const key = `${row.serviceId}|${row.requestId}`;
    const group = groups.get(key) || { serviceId: row.serviceId, calls: 0, costUsd: 0, retryCostUsd: 0, complete: true, stages: {} };
    const priced = costUsageByModel([row], tariffs)[0];
    const stage = row.generationSource || 'unknown';
    group.stages[stage] = (group.stages[stage] || 0) + 1;
    group.calls++;
    if (!priced?.complete) group.complete = false;
    else {
      group.costUsd += priced.costUsd;
      if (row.attempt > 1 || stage === 'repair' || stage === 'recovery') group.retryCostUsd += priced.costUsd;
    }
    groups.set(key, group);
  }
  const services = new Map();
  for (const group of groups.values()) {
    const values = services.get(group.serviceId) || [];
    values.push(group);
    services.set(group.serviceId, values);
  }
  const percentile = values => [...values].sort((a,b) => a-b)[Math.ceil(values.length * .95)-1];
  return [...services].map(([serviceId, orders]) => {
    const serviceRows = rows.filter(row => row.serviceId === serviceId);
    const unattributedCalls = serviceRows.filter(row => !row.requestId).length;
    const retryAttributionComplete = serviceRows.every(row => Number.isInteger(row.attempt) && row.attempt > 0);
    const complete = !unattributedCalls && orders.every(order => order.complete);
    return { serviceId, observedRequests: orders.length, complete,
      meanCalls: orders.reduce((sum, order) => sum + order.calls, 0) / orders.length,
      p95Calls: percentile(orders.map(order => order.calls)),
      meanCostUsd: complete ? orders.reduce((sum, order) => sum + order.costUsd, 0) / orders.length : null,
      p95CostUsd: complete ? percentile(orders.map(order => order.costUsd)) : null,
      retryCostUsd: complete && retryAttributionComplete ? orders.reduce((sum, order) => sum + order.retryCostUsd, 0) : null,
      unattributedCalls,
      retryAttributionComplete,
      costBasis: 'observed token logs and reviewed tariffs; reconcile with invoices; missing provider usage is not zero',
    };
  });
}
