#!/usr/bin/env node
/**
 * Workers AI 무료 할당의 **오늘 실제 소비량**을 Cloudflare 에서 읽어 온다.
 *
 * 왜 필요한가: `i18n/.translate-cache/neuron-ledger.json` 은 **이 스크립트가 쓴 것만** 센다.
 * 같은 계정의 프로덕션 폴백(`lib/llm-client.ts` → `env.AI.run`)이 쓴 양은 원장에 안 잡히므로,
 * 원장이 5,000 이어도 계정 총량은 이미 10,000 을 넘겼을 수 있다. 그 상태에서 배치를 더 돌리면
 * Workers **Paid** 플랜에서는 초과분이 그대로 청구된다($0.011 / 1,000 Neuron).
 *
 * 🔴 이 스크립트는 **조회 전용**이다. 모델을 부르지 않으므로 Neuron 을 쓰지 않는다.
 *
 * 사용법: node scripts/check-workers-ai-quota.mjs
 */
import { loadLocalEnvFiles, WORKERS_AI_DAILY_FREE_NEURONS } from "./lib/workers-ai-rest.mjs";

loadLocalEnvFiles();

const clean = (v) => String(v || "").trim().replace(/^Bearer\s+/i, "");
const accountId = [
  process.env.CLOUDFLARE_WORKERS_AI_ACCOUNT_ID,
  process.env.WORKERS_AI_ACCOUNT_ID,
  process.env.CLOUDFLARE_ACCOUNT_ID,
  process.env.Account_ID,
  process.env.ACCOUNT_ID,
  process.env.CF_ACCOUNT_ID,
].map(clean).find(Boolean);
const tokens = [...new Set([
  process.env.WorkerAi,
  process.env.WORKERAI,
  process.env.WORKERS_AI_API_TOKEN,
  process.env.CLOUDFLARE_API_TOKEN,
  process.env.CF_API_TOKEN,
  process.env.CLOUDFLARE_APITOKEN,
].map(clean).filter(Boolean))];

if (!accountId || !tokens.length) {
  console.error("[quota] 계정 ID 또는 토큰을 찾지 못했습니다.");
  process.exit(1);
}

/** 오늘(UTC) 00:00 부터. Cloudflare 의 할당 리셋 기준과 같다. */
const since = `${new Date().toISOString().slice(0, 10)}T00:00:00Z`;
const query = `query Usage($accountTag: String!, $since: Time!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      aiInferenceAdaptiveGroups(limit: 1000, filter: { datetime_geq: $since }) {
        sum { totalNeurons }
        dimensions { modelId }
      }
    }
  }
}`;

let reported = false;
for (const token of tokens) {
  let response;
  try {
    response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ query, variables: { accountTag: accountId, since } }),
      signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    console.log(`[quota] 조회 실패: ${error?.name || error?.message}`);
    continue;
  }
  const body = await response.json().catch(() => ({}));
  const groups = body?.data?.viewer?.accounts?.[0]?.aiInferenceAdaptiveGroups;
  if (!groups) {
    const message = body?.errors?.[0]?.message || `HTTP ${response.status}`;
    console.log(`[quota] 이 토큰으로는 못 읽었습니다: ${String(message).slice(0, 160)}`);
    continue;
  }

  const total = groups.reduce((sum, g) => sum + Number(g?.sum?.totalNeurons || 0), 0);
  console.log(`[quota] 오늘(UTC ${since.slice(0, 10)}) 계정 전체 소비: ${total.toFixed(0)} / 무료 ${WORKERS_AI_DAILY_FREE_NEURONS} Neuron`);
  for (const g of groups) {
    const n = Number(g?.sum?.totalNeurons || 0);
    if (n > 0) console.log(`[quota]   ${String(g?.dimensions?.modelId || "?").padEnd(44)} ${n.toFixed(0)}`);
  }
  const remaining = WORKERS_AI_DAILY_FREE_NEURONS - total;
  console.log(
    remaining > 0
      ? `[quota] 남은 무료분 ${remaining.toFixed(0)} Neuron`
      : `[quota] 🔴 무료 할당을 ${(-remaining).toFixed(0)} Neuron 초과했습니다 — Paid 플랜이면 초과분이 청구됩니다.`,
  );
  reported = true;
  break;
}

if (!reported) {
  console.log("[quota] 🔴 어떤 토큰으로도 사용량을 못 읽었습니다.");
  console.log("[quota]    GraphQL Analytics 읽기 권한(Account Analytics: Read)이 붙은 토큰이 필요합니다.");
  console.log("[quota]    권한을 못 얻으면 대시보드(Workers AI → Analytics)에서 눈으로 확인할 것.");
  process.exit(2);
}
