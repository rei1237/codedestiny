#!/usr/bin/env node

/**
 * 방금 실행한 배포의 결과를 GitHub Actions 출력으로 넘긴다.
 *
 * deploy-safe 는 프리뷰와 프로덕션 결과를 .deploy-state/state.json 에 기록한다. 로그를
 * 정규식으로 긁으면 로그 문구가 바뀔 때마다 조용히 빈 값이 되므로, 기록된 상태 파일을 읽는다.
 *
 * `--require=preview` / `--require=production` 로 어느 단계의 기록을 기대하는지 알려 주면,
 * 그 기록이 없을 때 조용히 빈 값을 내보내는 대신 실패한다.
 */
import { readFileSync, appendFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function argValue(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((item) => item.startsWith(prefix));
  return inline ? inline.slice(prefix.length).trim() : "";
}

const require_ = argValue("require");
const statePath = resolve(process.cwd(), ".deploy-state", "state.json");

if (!existsSync(statePath)) {
  console.error(`[print-deploy-state] ${statePath} 가 없습니다. 배포가 아무 기록도 남기지 않았습니다.`);
  process.exit(1);
}

const state = JSON.parse(readFileSync(statePath, "utf8"));

const outputs = {
  commit: String(state?.git?.commit || "").trim(),
  pages_url: String(state?.preview?.pages?.url || "").trim(),
  worker_url: String(state?.preview?.worker?.previewUrl || "").trim(),
  // preview 단계가 Worker 버전을 올렸다면 이번 릴리스는 Worker 를 포함한다. 승격 판단과
  // 같은 기준을 쓴다(deploy-safe.mjs promote(): state.worker?.versionId).
  worker_promoted: state?.worker?.versionId ? "true" : "false",
  worker_version_id: String(state?.worker?.versionId || "").trim(),
  production_url: String(state?.production?.pagesUrl || "").trim(),
  pages_deployment_id: String(state?.production?.pagesDeploymentId || "").trim(),
  rollback_pages_deployment_id: String(state?.rollback?.pagesDeploymentId || "").trim(),
  rollback_worker_version_id: String(state?.rollback?.workerVersionId || "").trim(),
};

if (require_ === "preview" && !outputs.pages_url) {
  console.error("[print-deploy-state] 상태 파일에 Pages 프리뷰 URL 이 없습니다.");
  process.exit(1);
}
if (require_ === "production" && !outputs.pages_deployment_id) {
  console.error("[print-deploy-state] 상태 파일에 프로덕션 Pages 배포 ID 가 없습니다.");
  process.exit(1);
}

for (const [key, value] of Object.entries(outputs)) {
  console.log(`[print-deploy-state] ${key}=${value || "(없음)"}`);
}

if (process.env.GITHUB_OUTPUT) {
  const body = Object.entries(outputs).map(([key, value]) => `${key}=${value}`).join("\n");
  appendFileSync(process.env.GITHUB_OUTPUT, `${body}\n`);
}
