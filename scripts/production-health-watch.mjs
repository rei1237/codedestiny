#!/usr/bin/env node
/**
 * 운영 외부 감시(2026-11-28 S8). production-health-watch.yml 이 30분마다 부른다. 읽기 전용 GET 3개뿐이다.
 *   - /api/health 가 200 + ok:true
 *   - Pages(/version.json)와 Worker(/api/version)가 같은 SHA (한쪽만 배포된 상태 = 계약 어긋남)
 * main HEAD 와는 비교하지 않는다 — 운영 승격은 수동이라 main 보다 뒤처지는 것이 정상이다.
 * 일시 오류로 울리지 않도록 한 실행 안에서 간격을 두고 두 번 검사하고, 두 번 모두 실패할 때만 실패로 본다.
 * 출력에 비밀값·고객 정보는 없다(공개 엔드포인트의 상태·SHA 앞 12자만).
 */
import { pathToFileURL } from "node:url";
import { readShaFromPayload, shaMatches } from "./verify-deployed-sha.mjs";

const DEFAULT_ORIGIN = "https://code-destiny.com";

/** 순수 판정. probe = { health: {status, body}|{error}, pages: {...}, worker: {...} } */
export function evaluateProbe(probe) {
  const problems = [];
  const health = probe?.health || {};
  if (health.error) problems.push(`health: ${health.error}`);
  else if (health.status !== 200 || health.body?.ok !== true) problems.push(`health: HTTP ${health.status} ok=${health.body?.ok === true}`);
  const pagesSha = probe?.pages?.error ? "" : readShaFromPayload(probe?.pages?.body);
  const workerSha = probe?.worker?.error ? "" : readShaFromPayload(probe?.worker?.body);
  if (!pagesSha) problems.push(`pages version: ${probe?.pages?.error || "sha missing"}`);
  if (!workerSha) problems.push(`worker version: ${probe?.worker?.error || "sha missing"}`);
  if (pagesSha && workerSha && !shaMatches(pagesSha, workerSha)) problems.push(`sha mismatch: pages ${pagesSha.slice(0, 12)} worker ${workerSha.slice(0, 12)}`);
  return { ok: problems.length === 0, problems, pagesSha: pagesSha.slice(0, 12), workerSha: workerSha.slice(0, 12) };
}

/** 두 번 모두 실패해야 실패다. 한 번이라도 통과하면 일시 오류로 본다. */
export function consecutiveVerdict(results) {
  const failed = results.filter(result => !result.ok);
  return { ok: failed.length < results.length, attempts: results.length, last: results.at(-1) };
}

async function get(url) {
  try {
    const response = await fetch(url, { headers: { Accept: "application/json", "Cache-Control": "no-store" }, signal: AbortSignal.timeout(15_000) });
    let body = null;
    try { body = await response.json(); } catch { body = null; }
    return { status: response.status, body };
  } catch (error) {
    return { error: String(error?.name === "TimeoutError" ? "timeout" : error?.message || error).slice(0, 80) };
  }
}

async function probeOnce(origin) {
  const bust = `t=${Date.now()}`;
  const [health, pages, worker] = await Promise.all([get(`${origin}/api/health?${bust}`), get(`${origin}/version.json?${bust}`), get(`${origin}/api/version?${bust}`)]);
  return evaluateProbe({ health, pages, worker });
}

async function main() {
  const origin = (process.env.CD_PRODUCTION_ORIGIN || DEFAULT_ORIGIN).replace(/\/+$/, "");
  const gapMs = Number(process.env.HEALTH_WATCH_GAP_MS || 120_000);
  const first = await probeOnce(origin);
  const results = [first];
  if (!first.ok) {
    await new Promise(done => setTimeout(done, gapMs));
    results.push(await probeOnce(origin));
  }
  const verdict = consecutiveVerdict(results);
  console.log(JSON.stringify({ origin, ...verdict }, null, 2));
  if (!verdict.ok) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
