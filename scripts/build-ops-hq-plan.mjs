#!/usr/bin/env node
// 마케팅 캠페인 일정(CSV) → 워커가 import 하는 퀘스트 계획 모듈.
//
//   node scripts/build-ops-hq-plan.mjs          생성(덮어쓰기)
//   node scripts/build-ops-hq-plan.mjs --check  생성본이 원본과 같은지만 확인(다르면 exit 1)
//
// 왜 빌드 단계인가: 워커는 파일 시스템이 없고 KV 도 없다. 원본 CSV 를 번들에 넣어 두고, 관리자가
// "계획 동기화"를 누르면 이 모듈을 ops_quests 로 멱등 반영한다(worker/ops-hq/quests.js).
// JSON 이 아니라 .js 로 내는 이유: Jest 의 네이티브 ESM 은 import attributes 없이 JSON 을 못 읽는다.
//
// 🔴 회차 키(occurrenceKey)는 날짜를 넣지 않는다 — 일정이 하루 밀려도 같은 퀘스트로 남아 증빙과 XP 가
//    이어진다. campaign|contentId|channel|language 가 겹치면 날짜순 서수를 붙인다(현재 96행은 겹침 0).

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CAMPAIGN_ID = "growth-20261012";
const CAMPAIGN_DIR = "marketing/campaigns/2026-10-12-growth";
const OUTPUT = "worker/ops-hq/generated/growth-20261012.js";
const PERIOD = { start: "2026-10-12", end: "2026-11-08", timeZone: "Asia/Seoul" };
// README "바로 시작하기" 1번: 일요일 결산 20:00. CSV 에는 행이 없어 여기서 명시적으로 만든다.
const WEEKLY_REVIEW_DATES = ["2026-10-18", "2026-10-25", "2026-11-01", "2026-11-08"];

const sha256 = (text) => createHash("sha256").update(text).digest("hex");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field); field = "";
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows;
  return body.map((cells) => Object.fromEntries(header.map((key, index) => [key.trim(), String(cells[index] ?? "").trim()])));
}

/** week01.md 의 "## B01 · 10/12 월 12:30 · 네이버" 같은 머리말 → 원고 앵커. */
function scriptHeadings(markdown) {
  const map = new Map();
  for (const line of markdown.split(/\r?\n/)) {
    const match = /^##\s+([A-Z]\d{2})\s+·\s+(.+)$/.exec(line);
    if (match && !map.has(match[1])) map.set(match[1], line.replace(/^##\s+/, "").trim());
  }
  return map;
}

function stableRowHash(row) {
  const keys = ["date_kst", "time_kst", "channel", "language", "content_id", "topic", "status", "source", "owner", "note"];
  return sha256(keys.map((key) => `${key}=${row[key] ?? ""}`).join("\n")).slice(0, 24);
}

export function buildPlan() {
  // 줄끝은 LF 로 맞춘다 — .csv 는 eol 규칙이 없어 Windows 체크아웃(CRLF)과 CI(LF)의 sha256 이 달라진다.
  const readSource = (name) => readFileSync(resolve(ROOT, CAMPAIGN_DIR, name), "utf8").replace(/\r\n/g, "\n");
  const csvText = readSource("calendar.csv");
  const week01 = readSource("week01.md");
  const readme = readSource("README.md");
  const headings = scriptHeadings(week01);

  const csvRows = parseCsv(csvText)
    .filter((row) => row.date_kst >= PERIOD.start && row.date_kst <= PERIOD.end)
    .sort((a, b) => (a.date_kst + a.time_kst + a.channel + a.language + a.content_id)
      .localeCompare(b.date_kst + b.time_kst + b.channel + b.language + b.content_id));

  const seen = new Map();
  const rows = csvRows.map((row) => {
    const baseKey = `${CAMPAIGN_ID}|${row.content_id}|${row.channel}|${row.language}`;
    const ordinal = (seen.get(baseKey) || 0) + 1;
    seen.set(baseKey, ordinal);
    const heading = headings.get(row.content_id) || null;
    return {
      occurrenceKey: ordinal === 1 ? baseKey : `${baseKey}#${ordinal}`,
      date: row.date_kst,
      time: row.time_kst,
      channel: row.channel,
      language: row.language,
      contentId: row.content_id,
      topic: row.topic,
      sourceStatus: row.status,
      source: row.source,
      owner: row.owner,
      note: row.note,
      scriptRef: heading ? { file: `${CAMPAIGN_DIR}/week01.md`, heading } : null,
      rowHash: stableRowHash(row),
    };
  });

  for (const [index, date] of WEEKLY_REVIEW_DATES.entries()) {
    const contentId = `R0${index + 1}`;
    const synthetic = {
      date_kst: date, time_kst: "20:00", channel: "internal_review", language: "ko", content_id: contentId,
      topic: `${index + 1}주차 결산 — 공개 URL·지표 확인과 다음 주 조정`, status: "planned", source: "README.md",
      owner: "user", note: "README 바로 시작하기 1번(일요일 결산 20:00)",
    };
    rows.push({
      occurrenceKey: `${CAMPAIGN_ID}|${contentId}|internal_review|ko`,
      date, time: "20:00", channel: "internal_review", language: "ko", contentId,
      topic: synthetic.topic, sourceStatus: "planned", source: "README.md", owner: "user", note: synthetic.note,
      scriptRef: null, rowHash: stableRowHash(synthetic),
    });
  }

  return {
    campaignId: CAMPAIGN_ID,
    title: "Code Destiny 4주 마케팅 운영",
    period: PERIOD,
    sources: [
      { file: `${CAMPAIGN_DIR}/calendar.csv`, sha256: sha256(csvText) },
      { file: `${CAMPAIGN_DIR}/week01.md`, sha256: sha256(week01) },
      { file: `${CAMPAIGN_DIR}/README.md`, sha256: sha256(readme) },
    ],
    rows,
  };
}

function render(plan) {
  const planVersion = sha256(JSON.stringify(plan)).slice(0, 16);
  return [
    "// 🔴 자동 생성 파일 — 손으로 고치지 말 것. 원본: marketing/campaigns/2026-10-12-growth/",
    "// 재생성: node scripts/build-ops-hq-plan.mjs (원본과 어긋나면 __tests__/worker/ops-hq-plan.test.js 가 실패한다)",
    `const plan = ${JSON.stringify({ ...plan, planVersion }, null, 2)};`,
    "",
    "export default Object.freeze(plan);",
    "",
  ].join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const output = render(buildPlan());
  const target = resolve(ROOT, OUTPUT);
  if (process.argv.includes("--check")) {
    let current = "";
    try { current = readFileSync(target, "utf8"); } catch { /* 없음 */ }
    if (current.replace(/\r\n/g, "\n") !== output) {
      console.error(`${OUTPUT} 가 원본과 다릅니다. node scripts/build-ops-hq-plan.mjs 로 다시 생성하세요.`);
      process.exit(1);
    }
    console.log(`${OUTPUT} 최신`);
  } else {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, output);
    const plan = buildPlan();
    console.log(`${OUTPUT}: ${plan.rows.length}행 생성`);
  }
}

export { render };
