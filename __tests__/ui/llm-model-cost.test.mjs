import test from "node:test";
import assert from "node:assert/strict";
import { costUsageByModel, costUsageByRequest } from "../../lib/payment/llm-cost-report.mjs";
import { logTarotTokenUsage } from "../../lib/tarot/token-usage.mjs";

test("model-specific tariffs include cached and thinking tokens; unknown models remain unknown", () => {
  const base = { serviceId: "reading", provider: "gemini", model: "fixture", inputTokens: 1000,
    cachedInputTokens: 200, outputTokens: 400, thinkingTokens: 100, estimated: false };
  const tariffs = { "gemini/fixture": { sourceRefs: ["mock tariff"], reviewedAt: "2026-09-21",
    inputUsdPerMillion: 2, cachedInputUsdPerMillion: 1, outputUsdPerMillion: 4, thinkingIncludedInOutput: false } };
  const result = costUsageByModel([base, { ...base, model: "unknown" }], tariffs);
  assert.equal(result[0].costUsd, 0.0038);
  assert.equal(result[1].costUsd, null);
  assert.equal(result[1].complete, false);
  assert.equal(costUsageByModel([{ ...base, estimated: true }], tariffs)[0].complete, false);
});
test("standalone tarot logs provider usage even before content parsing, without user input", () => {
  const previous = console.info; const rows = [];
  console.info = (marker, row) => rows.push({ marker, row });
  try {
    logTarotTokenUsage({ usageMetadata: { promptTokenCount: 800, candidatesTokenCount: 500 } }, { model: "fixture", serviceId: "tarot-mindscan", maxTokens: 1000 });
    logTarotTokenUsage({}, { model: "fixture", serviceId: "tarot-mindscan" });
  } finally { console.info = previous; }
  assert.equal(rows[0].row.inputTokens, 800);
  assert.equal(rows[0].row.estimated, false);
  assert.equal(rows[1].row.estimated, true);
  assert.equal("prompt" in rows[0].row, false);
});

test('request cost sums models and retries before percentiles, and missing tariffs stay unknown',()=>{
  const row={serviceId:'tuna',provider:'gemini',model:'fixture',requestId:'order-1',attempt:1,
    inputTokens:1000,cachedInputTokens:0,outputTokens:1000,thinkingTokens:0,estimated:false};
  const tariff={sourceRefs:['mock'],reviewedAt:'2026-09-27',inputUsdPerMillion:1,cachedInputUsdPerMillion:0,outputUsdPerMillion:1,thinkingIncludedInOutput:true};
  const rows=[row,{...row,model:'second',attempt:2,generationSource:'recovery'},{...row,requestId:'order-2'}];
  const report=costUsageByRequest(rows,{'gemini/fixture':tariff,'gemini/second':tariff})[0];
  assert.equal(report.observedRequests,2);
  assert.equal(report.meanCalls,1.5);
  assert.equal(report.p95Calls,2);
  assert.equal(report.meanCostUsd,.003);
  assert.equal(report.p95CostUsd,.004);
  assert.equal(report.retryCostUsd,.002);
  const missing=costUsageByRequest(rows,{'gemini/fixture':tariff})[0];
  assert.equal(missing.meanCostUsd,null);
  assert.equal(missing.p95CostUsd,null);
  assert.equal(missing.complete,false);
  const unattributed=costUsageByRequest([row,{...row,requestId:''}],{'gemini/fixture':tariff})[0];
  assert.equal(unattributed.meanCostUsd,null);
  assert.equal(unattributed.unattributedCalls,1);
  const unknownRetry=costUsageByRequest([{...row,attempt:undefined}],{'gemini/fixture':tariff})[0];
  assert.equal(unknownRetry.retryCostUsd,null);
});
