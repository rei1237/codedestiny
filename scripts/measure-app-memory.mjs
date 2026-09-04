/**
 * 앱 메모리 측정기 (판정용 아님 — 측정 도구다)
 *
 * Google Play 메모리 품질 기준(2027-02 집행)의 두 축 — 백그라운드 RSS 와 그래픽(비트맵) 메모리 —
 * 를 `adb shell dumpsys meminfo` 로 3 시나리오에서 뽑아 표로 찍는다.
 *
 *   1. foreground   : 앱을 띄우고 --settle 초 뒤
 *   2. background   : 홈키로 내리고 --settle 초 뒤 (UI_HIDDEN → BACKGROUND 트림이 오는 구간)
 *   3. trimmed      : `am send-trim-memory <pkg> RUNNING_CRITICAL` 뒤 10초 (MainActivity.onTrimMemory 효과)
 *
 * 사용:
 *   npm run measure:app-memory                          # 기본: com.codedestiny.app, settle 30s
 *   node scripts/measure-app-memory.mjs --settle 60     # 백그라운드 안정화 시간 변경
 *   node scripts/measure-app-memory.mjs --serial emulator-5554
 *   node scripts/measure-app-memory.mjs --json out.json # 표 + JSON 저장
 *
 * 전제: 앱이 설치돼 있고 adb 를 찾을 수 있다(ANDROID_HOME → ANDROID_SDK_ROOT → %LOCALAPPDATA%\Android\Sdk → PATH 순).
 * adb 가 없으면 "adb 를 찾지 못했다", 기기가 없으면 사용법을 찍고 둘 다 exit 2 로 끝난다
 * (가드가 아니라 측정기라 fail-closed 대상이 아니다 — CI 배선 금지).
 *
 * 열 해석(dumpsys meminfo):
 *   TOTAL PSS  — 공유 페이지를 비례 배분한 실사용. Play Vitals 의 "메모리" 는 RSS 기준이라 참고치.
 *   TOTAL RSS  — 상주 크기. Play 기준의 본 지표(swap 은 에뮬레이터에서 대개 0).
 *   Graphics   — GPU/그래픽 버퍼. WebView 비트맵·합성 레이어가 여기 잡힌다.
 *   Native Heap— WebView(chromium) 네이티브 힙. 리소스 캐시(clearCache) 효과가 여기서 보인다.
 */
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const argv = process.argv.slice(2);
function opt(name, fallback) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}
const PKG = opt("--package", "com.codedestiny.app");
const SETTLE_SEC = Number(opt("--settle", "30"));
const SERIAL = opt("--serial", "");
const JSON_OUT = opt("--json", "");

/**
 * adb 실행 파일. 2026-09-04 vc43 빌드기에서 adb 가 PATH 에 없어 ENOENT 가 allowFail 에 먹혀
 * "연결된 기기가 없다" 로 오진했다 — SDK 루트를 먼저 보고, 없으면 PATH 의 adb 에 맡긴다.
 */
export function resolveAdb(env = process.env, exists = existsSync) {
  const roots = [env.ANDROID_HOME, env.ANDROID_SDK_ROOT, env.LOCALAPPDATA ? join(env.LOCALAPPDATA, "Android", "Sdk") : ""].filter(Boolean);
  for (const root of roots) {
    for (const name of ["adb.exe", "adb"]) {
      const p = join(root, "platform-tools", name);
      if (exists(p)) return p;
    }
  }
  return "adb";
}
const ADB = resolveAdb();

function adb(args, { allowFail = false } = {}) {
  const full = SERIAL ? ["-s", SERIAL, ...args] : args;
  try {
    // dumpsys package com.google.android.gms 는 1 MB 기본 maxBuffer 를 넘어 조용히 실패한다.
    return execFileSync(ADB, full, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    if (e && e.code === "ENOENT") {
      console.error(`[measure-app-memory] adb 를 찾지 못했다 (${ADB}). platform-tools 를 PATH 에 넣거나 ANDROID_HOME 을 설정할 것.`);
      process.exit(2);
    }
    if (allowFail) return "";
    throw e;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function parseMeminfo(text) {
  // "TOTAL PSS:   123456            TOTAL RSS:   234567      TOTAL SWAP PSS:  0"
  const totals = /TOTAL PSS:\s+(\d+)\s+TOTAL RSS:\s+(\d+)\s+TOTAL SWAP(?: PSS)?:\s+(\d+)/.exec(text);
  const row = (label) => {
    // 첫 숫자 열이 Pss Total(KB). 예: "  Native Heap    45678    45600 ..."
    // Graphics 는 표에 없고 App Summary 에만 "Graphics:  8980" 꼴(콜론)로 나온다 — 콜론을 허용한다.
    const m = new RegExp(`^\\s*${label}:?\\s+(\\d+)`, "m").exec(text);
    return m ? Number(m[1]) : null;
  };
  return {
    totalPssKb: totals ? Number(totals[1]) : null,
    totalRssKb: totals ? Number(totals[2]) : null,
    totalSwapKb: totals ? Number(totals[3]) : null,
    graphicsPssKb: row("Graphics"),
    nativeHeapPssKb: row("Native Heap"),
    dalvikHeapPssKb: row("Dalvik Heap"),
    glMtrackPssKb: row("Gfx dev"),
  };
}

function snapshot(label) {
  const raw = adb(["shell", "dumpsys", "meminfo", PKG]);
  if (/No process found/i.test(raw)) {
    return { label, alive: false };
  }
  return { label, alive: true, ...parseMeminfo(raw) };
}

const mb = (kb) => (kb == null ? "—" : (kb / 1024).toFixed(1));

function printTable(rows) {
  const head = ["scenario", "RSS MB", "PSS MB", "Swap MB", "Graphics MB", "Native Heap MB", "Dalvik MB"];
  const lines = rows.map((r) =>
    r.alive
      ? [r.label, mb(r.totalRssKb), mb(r.totalPssKb), mb(r.totalSwapKb), mb(r.graphicsPssKb), mb(r.nativeHeapPssKb), mb(r.dalvikHeapPssKb)]
      : [r.label, "(process gone)", "", "", "", "", ""],
  );
  const widths = head.map((h, i) => Math.max(h.length, ...lines.map((l) => String(l[i]).length)));
  const fmt = (cols) => cols.map((c, i) => String(c).padEnd(widths[i])).join("  ");
  console.log(fmt(head));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  for (const l of lines) console.log(fmt(l));
}

async function main() {
  const devices = adb(["devices"], { allowFail: true })
    .split(/\r?\n/)
    .slice(1)
    .filter((l) => /\tdevice$/.test(l));
  if (devices.length === 0) {
    console.error("[measure-app-memory] 연결된 adb 기기가 없다. 에뮬레이터를 띄우거나 --serial 로 지정할 것.");
    console.error("  예: emulator -avd cdtest -gpu auto  →  adb install -r app-release.apk  →  npm run measure:app-memory");
    process.exit(2);
  }
  const installed = adb(["shell", "pm", "path", PKG], { allowFail: true }).trim();
  if (!installed) {
    console.error(`[measure-app-memory] ${PKG} 가 설치돼 있지 않다.`);
    process.exit(2);
  }

  const gms = adb(["shell", "dumpsys", "package", "com.google.android.gms"], { allowFail: true });
  const gmsVc = /versionCode=(\d+)/.exec(gms);
  const webview = adb(["shell", "dumpsys", "webviewupdate"], { allowFail: true });
  const wvVer = /Current WebView package[^:]*:\s*\(([^)]*)\)/.exec(webview) || /versionName=([\d.]+)/.exec(webview);
  console.log(`package=${PKG}  settle=${SETTLE_SEC}s  gmsVersionCode=${gmsVc ? gmsVc[1] : "?"}  webview=${wvVer ? wvVer[1] : "?"}`);

  // 1. 콜드 포그라운드
  adb(["shell", "am", "force-stop", PKG]);
  adb(["shell", "monkey", "-p", PKG, "-c", "android.intent.category.LAUNCHER", "1"], { allowFail: true });
  await sleep(SETTLE_SEC * 1000);
  const rows = [snapshot("foreground")];

  // 2. 홈키 → 백그라운드
  adb(["shell", "input", "keyevent", "KEYCODE_HOME"]);
  await sleep(SETTLE_SEC * 1000);
  rows.push(snapshot("background"));

  // 3. 강제 트림(onTrimMemory 경로). RUNNING_CRITICAL 은 레벨 15 라 UI_HIDDEN(20) 미만 → clearCache 안 탐.
  //    BACKGROUND(40) 도 함께 보내 clearCache 경로까지 확인한다.
  adb(["shell", "am", "send-trim-memory", PKG, "RUNNING_CRITICAL"], { allowFail: true });
  await sleep(10 * 1000);
  rows.push(snapshot("trimmed:RUNNING_CRITICAL"));
  adb(["shell", "am", "send-trim-memory", PKG, "BACKGROUND"], { allowFail: true });
  await sleep(10 * 1000);
  rows.push(snapshot("trimmed:BACKGROUND"));

  printTable(rows);
  const fg = rows[0];
  const bg = rows[1];
  if (fg.alive && bg.alive && fg.totalRssKb && bg.totalRssKb) {
    console.log(`\nbackground/foreground RSS = ${((bg.totalRssKb / fg.totalRssKb) * 100).toFixed(0)}%`);
  }

  if (JSON_OUT) {
    writeFileSync(JSON_OUT, JSON.stringify({ package: PKG, settleSec: SETTLE_SEC, measuredAt: new Date().toISOString(), rows }, null, 2));
    console.log(`saved ${JSON_OUT}`);
  }
}

// 직접 실행일 때만 측정한다 — 테스트가 parseMeminfo/resolveAdb 를 import 해도 adb 를 부르지 않는다.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("[measure-app-memory] 실패:", e && e.message ? e.message : e);
    process.exit(1);
  });
}
