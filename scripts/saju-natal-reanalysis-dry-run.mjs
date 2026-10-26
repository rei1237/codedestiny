#!/usr/bin/env node
// 저장된 사주 결과 재분석 dry-run. 내보낸 JSON 파일만 읽고 DB·네트워크에 접근하지 않으며 저장본을 바꾸지 않는다.
// 입력: 배열 또는 {rows:[...]}. 각 행은 영냥이 요청 문서(snapshot.analysis.contexts.saju), saju DomainContext,
//       본 화면 sajuResult, 또는 그것을 담은 {id, context|sajuResult} 중 하나.
// 출력: 바뀌는 항목 요약 JSON. 출생정보·메모는 쓰지 않는다.
// 사용: node scripts/saju-natal-reanalysis-dry-run.mjs --input <rows.json> [--out D:/.../report.json]
import fs from "node:fs";
import path from "node:path";
import { inspectNatalReanalysis, NATAL_REANALYSIS_VERSION } from "../worker/lib/saju-natal-reanalysis.js";

const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const input = arg("--input");
if (!input) { console.error("usage: --input <rows.json> [--out <report.json>]"); process.exit(2); }
const out = arg("--out") || `D:/Development/codedestiny-reports/saju-natal-reanalysis-${new Date().toISOString().slice(0, 10)}.json`;

const raw = JSON.parse(fs.readFileSync(input, "utf8"));
const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.rows) ? raw.rows : [];
const snapshotOf = (row) => row?.snapshot?.analysis?.contexts?.saju || row?.context || row?.sajuResult || row?.resumeBody?.sajuResult || row;

const results = rows.map((row, index) => ({ id: String(row?.id ?? row?._id ?? index), ...inspectNatalReanalysis(snapshotOf(row)) }));
const ok = results.filter((r) => r.status === "ok");
const byField = {};
for (const r of ok) for (const key of r.changes) byField[key] = (byField[key] || 0) + 1;
const report = {
  version: NATAL_REANALYSIS_VERSION,
  generatedAt: new Date().toISOString(),
  dryRun: true,
  input: path.basename(input),
  summary: {
    total: rows.length,
    unreadable: results.length - ok.length,
    surveyAffected: ok.filter((r) => r.surveyAffected).length,
    changed: ok.filter((r) => r.changes.length).length,
    changedSurveyAffected: ok.filter((r) => r.surveyAffected && r.changes.length).length,
    byField,
  },
  rows: results.filter((r) => r.status !== "ok" || r.surveyAffected || r.changes.length),
};
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ out, ...report.summary }));
