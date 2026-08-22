#!/usr/bin/env node
// 휴먼 디자인 fixture 의 천체 위치 스냅샷 생성/대조 도구.
//
// 왜 스냅샷이 필요한가:
//   CI 의 jest 는 `.wasm` 을 스텁으로 매핑한다(jest.config.cjs 의 moduleNameMapper). 그래서
//   테스트 안에서 진짜 Swiss Ephemeris 를 돌릴 수 없다. 대신 여기서 **실제 천체력으로 한 번
//   계산해 파일로 굳혀 두고**, 테스트는 그 황경을 입력으로 순수 엔진만 돌린다.
//
// 왜 verify:* 가 아닌가:
//   이 스크립트는 판정이 아니라 **생성**이 주 용도다. 판정(fail-closed)은
//   scripts/verify-human-design.mjs 가 맡는다. `--check` 는 스냅샷이 낡았는지 보는 보조 모드다.
//
// 🔴 네트워크를 쓰지 않는다. Swiss 는 `.se1` 천체력 파일을 HTTP 로 읽도록 만들어져 있어서
//    (worker/lib/swiss-ephemeris.js 의 resolveEpheBaseUrl), 여기서는 로컬 루프백에 임시
//    정적 서버를 띄워 레포의 public/ephe/ 를 그대로 먹인다. 외부 CDN 폴백으로 새지 않는다.
//
//   실행: node scripts/human-design-fixture-snapshot.mjs          (생성/갱신)
//         node scripts/human-design-fixture-snapshot.mjs --check   (드리프트 검사)

import http from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_DIR = path.join(repoRoot, "__tests__", "fixtures", "human-design");
const CASES_PATH = path.join(FIXTURE_DIR, "cases.json");
const SNAPSHOT_PATH = path.join(FIXTURE_DIR, "ephemeris-snapshot.json");
const EPHE_DIR = path.join(repoRoot, "public", "ephe");

const CHECK_ONLY = process.argv.includes("--check");

/** 대조 허용 오차(도). 같은 WASM·같은 입력이면 0 이어야 한다. */
const DRIFT_TOLERANCE_DEG = 1e-9;

async function startEphemerisServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const name = path.basename(new URL(req.url, "http://localhost").pathname);
      const bytes = await readFile(path.join(EPHE_DIR, name));
      res.writeHead(200, { "Content-Type": "application/octet-stream", "Content-Length": bytes.length });
      res.end(bytes);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}/ephe/` };
}

function toSnapshotRow(id, chart) {
  const longitudesOf = (layer) => Object.fromEntries(
    chart.layers[layer].map((activation) => [activation.planet, activation.longitude]),
  );
  return {
    id,
    ephemerisVersion: chart.ephemerisVersion,
    nodeMode: chart.nodeMode,
    utcOffsetHours: chart.birthInput.utcOffsetHours,
    solarDate: chart.birthInput.solarDate,
    birthUtc: chart.moments.birthUtc,
    designUtc: chart.moments.designUtc,
    designSearch: chart.moments.designSearch,
    personality: longitudesOf("personality"),
    design: longitudesOf("design"),
  };
}

function diffRows(previous, next) {
  const problems = [];
  if (!previous) return ["신규 케이스 — 스냅샷에 없다"];
  for (const key of ["birthUtc", "designUtc", "nodeMode", "ephemerisVersion"]) {
    if (previous[key] !== next[key]) problems.push(`${key}: ${previous[key]} → ${next[key]}`);
  }
  for (const layer of ["personality", "design"]) {
    for (const [planet, longitude] of Object.entries(next[layer])) {
      const before = previous[layer]?.[planet];
      if (!Number.isFinite(before)) {
        problems.push(`${layer}.${planet}: 이전 값 없음`);
        continue;
      }
      if (Math.abs(before - longitude) > DRIFT_TOLERANCE_DEG) {
        problems.push(`${layer}.${planet}: ${before} → ${longitude}`);
      }
    }
  }
  return problems;
}

/** cases(외부 검증값 있음) + structuralCases(구조만 검사) 를 한 줄로 세운다. */
function collectCases(doc) {
  return [...(doc.cases || []), ...(doc.structuralCases || [])];
}

async function main() {
  const cases = collectCases(JSON.parse(await readFile(CASES_PATH, "utf8")));
  if (!cases.length) {
    console.error("❌ cases.json 에 케이스가 없다.");
    process.exit(1);
  }

  const { server, baseUrl } = await startEphemerisServer();
  const env = { SWISS_EPHE_BASE_URL: baseUrl };

  let previousSnapshot = null;
  try {
    previousSnapshot = JSON.parse(await readFile(SNAPSHOT_PATH, "utf8"));
  } catch {
    previousSnapshot = null;
  }
  const previousById = new Map((previousSnapshot?.rows || []).map((row) => [row.id, row]));

  const { calculateHumanDesignChart } = await import(
    new URL("../worker/lib/human-design-ephemeris.js", import.meta.url).href
  );

  const rows = [];
  const failures = [];
  try {
    for (const testCase of cases) {
      let chart;
      try {
        chart = await calculateHumanDesignChart(env, testCase.birth, {});
      } catch (error) {
        failures.push(`${testCase.id}: 계산 실패 — ${error?.message || error}`);
        continue;
      }
      const row = toSnapshotRow(testCase.id, chart);
      rows.push(row);

      if (!chart.moments.designSearch.converged) {
        failures.push(`${testCase.id}: Design 순간 탐색이 수렴 표시를 못 받았다`);
      }
      if (chart.warnings.length) {
        failures.push(`${testCase.id}: 경고 ${chart.warnings.join(", ")}`);
      }
      if (CHECK_ONLY) {
        const problems = diffRows(previousById.get(testCase.id), row);
        if (problems.length) failures.push(`${testCase.id}: ${problems.join(" / ")}`);
      }
    }
  } finally {
    server.close();
  }

  if (CHECK_ONLY) {
    const removed = [...previousById.keys()].filter((id) => !rows.some((row) => row.id === id));
    if (removed.length) failures.push(`스냅샷에만 있고 cases.json 에 없는 케이스: ${removed.join(", ")}`);
    if (failures.length) {
      console.error(`\n❌ 스냅샷 드리프트 ${failures.length}건`);
      failures.forEach((line) => console.error(`   - ${line}`));
      console.error("\n   재생성: node scripts/human-design-fixture-snapshot.mjs");
      process.exit(1);
    }
    console.log(`✅ 스냅샷이 ${rows.length}개 케이스에서 최신이다.`);
    return;
  }

  if (failures.length) {
    console.error(`\n❌ 계산 단계에서 ${failures.length}건 실패 — 스냅샷을 쓰지 않는다.`);
    failures.forEach((line) => console.error(`   - ${line}`));
    process.exit(1);
  }

  const payload = {
    note: [
      "생성물이다. 손으로 고치지 말 것 — node scripts/human-design-fixture-snapshot.mjs 로 재생성한다.",
      "실제 Swiss Ephemeris(sweph-wasm, tropical)로 계산한 26 activation 의 황경이다.",
      "CI 의 jest 는 .wasm 을 스텁으로 매핑해 실제 천체력을 못 돌리므로, 테스트는 이 값을 입력으로 순수 엔진만 돌린다.",
    ],
    generatedBy: "scripts/human-design-fixture-snapshot.mjs",
    rows,
  };
  await writeFile(SNAPSHOT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`✅ ${rows.length}개 케이스 스냅샷을 기록했다 → ${path.relative(repoRoot, SNAPSHOT_PATH)}`);
}

await main();
