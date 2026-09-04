/**
 * scripts/measure-app-memory.mjs 의 순수 함수 둘을 지킨다 (측정기 본체는 adb 가 필요해 CI 에서 못 돈다).
 *
 * 2026-09-04 vc43 빌드에서 실제로 틀렸던 두 지점:
 *   · adb 가 PATH 에 없는데 ANDROID_HOME 만 있는 개발기에서 ENOENT 가 "연결된 기기가 없다" 로 오진됐다.
 *   · dumpsys meminfo 의 Graphics 는 App Summary 에 "Graphics:" (콜론) 로만 나와 늘 "—" 였다.
 *
 * 🔴 node:test 다 — scripts/** 는 jest critical 티어에 없고 test:node 가 PR CI 에서 항상 돈다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const modulePromise = import(
  pathToFileURL(path.join(__dirname, "..", "..", "scripts", "measure-app-memory.mjs")).href
);

test("parseMeminfo: 표의 Pss Total 과 App Summary 의 'Graphics:' 를 함께 읽는다", async () => {
  const { parseMeminfo } = await modulePromise;
  const sample = [
    "                   Pss  Private  Private  SwapPss      Rss     Heap     Heap     Heap",
    "  Native Heap    21600    21500        0        0    21700    40000    30000    10000",
    "  Dalvik Heap     2400     2300        0        0     2500     8000     6000     2000",
    " App Summary",
    "           Graphics:     8980",
    "        Native Heap:    21500",
    " TOTAL PSS:    90000            TOTAL RSS:   236000      TOTAL SWAP PSS:       0",
  ].join("\n");
  const r = parseMeminfo(sample);
  assert.equal(r.totalPssKb, 90000);
  assert.equal(r.totalRssKb, 236000);
  assert.equal(r.graphicsPssKb, 8980);
  assert.equal(r.nativeHeapPssKb, 21600, "표의 Pss Total 이 App Summary 값보다 먼저 잡혀야 한다");
  assert.equal(r.dalvikHeapPssKb, 2400);
});

test("resolveAdb: PATH 에 adb 가 없어도 ANDROID_HOME/platform-tools 를 찾고, 어디에도 없으면 'adb' 로 둔다", async () => {
  const { resolveAdb } = await modulePromise;
  const norm = (p) => p.replace(/\\/g, "/");
  const exists = (p) => norm(p) === "C:/sdk/platform-tools/adb.exe";
  assert.equal(norm(resolveAdb({ ANDROID_HOME: "C:\\sdk" }, exists)), "C:/sdk/platform-tools/adb.exe");
  assert.equal(norm(resolveAdb({ LOCALAPPDATA: "C:\\u\\AppData\\Local" }, (p) => norm(p).endsWith("Local/Android/Sdk/platform-tools/adb.exe"))),
    "C:/u/AppData/Local/Android/Sdk/platform-tools/adb.exe");
  assert.equal(resolveAdb({}, () => false), "adb");
});
