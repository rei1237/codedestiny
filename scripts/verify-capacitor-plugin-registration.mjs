#!/usr/bin/env node
/**
 * Capacitor npm 플러그인이 MainActivity 에 **명시 등록**돼 있는지 검사한다.
 *
 * 왜 필요한가 (vc44 실사고, 2026-09-04):
 *   Capacitor 는 npm 플러그인을 `assets/capacitor.plugins.json` 을 읽어 자동 등록한다.
 *   그런데 그 파일은 `cap sync` 가 만드는 **.gitignore 대상**이라 리포에 없고,
 *   `cap sync` 를 건너뛴 빌드 경로(격리 워크트리 등)에서는 APK 에 아예 들어가지 않는다.
 *   더 나쁜 것은 BridgeActivity.onCreate 가 그 실패를 `Logger.error` 로만 삼킨다는 점이다(fail-open):
 *
 *       try { bridgeBuilder.addPlugins(loader.loadPluginClasses()); }
 *       catch (PluginLoadException ex) { Logger.error("Error loading plugins.", ex); }
 *
 *   그래서 앱은 멀쩡하게 부팅하고, 화면도 정상이고, 커스텀 플러그인(MainActivity 가 직접
 *   등록하는 것들)도 전부 살아 있는데 **npm 플러그인만 조용히 사라진다.**
 *   실제로 vc44 APK 는 assets 파일 수가 3→2 로 줄었고(정확히 193B = capacitor.plugins.json),
 *   `@capacitor/app` 과 `@capacitor/browser` 가 등록되지 않아
 *   소셜 로그인의 커스텀탭(Browser)과 딥링크 복귀(App.appUrlOpen)가 둘 다 죽었다.
 *   클래스는 dex 안에 멀쩡히 들어 있었으므로 gradle·프로가드로는 잡히지 않는다.
 *
 *   따라서 유일하게 믿을 수 있는 등록 지점은 MainActivity 의 `registerPlugin(...)` 이고,
 *   이 가드는 그것이 빠지는 것을 막는다.
 *
 * 🔴 fail-closed 다(CLAUDE.md 원칙 10). 손으로 쓴 대상 목록을 두지 않는다:
 *   · 검사 대상은 apps/mobile/package.json 의 `@capacitor/*` 의존성에서 전수 발견하고,
 *   · 각 패키지의 android 소스에서 `@CapacitorPlugin` 클래스를 전수 발견하며,
 *   · "MainActivity 가 등록할 필요가 없는 것"은 이름을 박지 않고 **Capacitor 런타임의
 *     Bridge.java 가 스스로 registerPlugin 하는 목록**을 읽어 판정한다.
 *   · 어느 쪽에도 속하지 않는 플러그인이 하나라도 있으면 **미분류로 실패**한다.
 *   · 발견 건수가 0이면 "통과"가 아니라 실패로 끝낸다.
 *
 * 사용법:
 *   node scripts/verify-capacitor-plugin-registration.mjs
 *   node scripts/verify-capacitor-plugin-registration.mjs --self-test   # 판정이 실제로 무는지
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

const MOBILE_PKG = "apps/mobile/package.json";
const MAIN_ACTIVITY = "apps/mobile/android/app/src/main/java/com/codedestiny/app/MainActivity.java";
const CAPACITOR_RUNTIME = "@capacitor/android";

const failures = [];
const notes = [];

function read(rel) {
  try {
    return readFileSync(path.join(ROOT, rel), "utf8");
  } catch (error) {
    failures.push(`${rel} 를 읽지 못했다 (${error.code || error.message}) — 등록 계약을 검증할 수 없다`);
    return "";
  }
}

/**
 * `@CapacitorPlugin public class X extends Plugin` 인 클래스만 뽑는다.
 * 🔴 인자 목록은 **없을 수도 있다** — `@CapacitorPlugin` 만 붙은 형태(CapacitorCookies·WebView·
 *    SystemBars)를 놓치면 등록이 필요한 플러그인도 같은 이유로 놓친다. 인자가 있는 경우
 *    한 단계 중첩(@Permission(...))까지 균형을 맞춰 먹는다.
 */
const PLUGIN_CLASS =
  /@CapacitorPlugin\b(?:\s*\((?:[^()]|\([^()]*\))*\))?\s*(?:public\s+|final\s+|abstract\s+)*class\s+(\w+)\s+extends\s+Plugin\b/g;
const PACKAGE_LINE = /^\s*package\s+([\w.]+)\s*;/m;

function walkJava(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) walkJava(full, out);
    else if (entry.endsWith(".java")) out.push(full);
  }
  return out;
}

/** 한 패키지 디렉터리의 android 소스에서 플러그인 클래스 FQCN 을 전수 발견한다. */
function discoverPluginClasses(pkgDir) {
  const found = [];
  for (const file of walkJava(path.join(pkgDir, "android"), []).concat(
    walkJava(path.join(pkgDir, "capacitor"), []),
  )) {
    const source = readFileSync(file, "utf8");
    const pkg = source.match(PACKAGE_LINE);
    if (!pkg) continue;
    PLUGIN_CLASS.lastIndex = 0;
    let m;
    while ((m = PLUGIN_CLASS.exec(source)) !== null) {
      found.push({ fqcn: `${pkg[1]}.${m[1]}`, simple: m[1], file });
    }
  }
  return found;
}

function resolvePkgDir(name) {
  try {
    return path.dirname(require.resolve(`${name}/package.json`));
  } catch (error) {
    failures.push(
      `${name} 을 해석하지 못했다 (${error.code || error.message}) — ` +
        `node_modules 없이 이 가드를 돌리면 등록 누락을 못 본다. npm ci 후 다시 돌린다`,
    );
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 판정 본체. --self-test 가 합성 입력으로 직접 찌를 수 있도록 순수 함수로 뺀다.
// ─────────────────────────────────────────────────────────────────────────
/**
 * @param {{fqcn:string, simple:string, pkg:string}[]} mustRegister
 * @param {string} mainActivity MainActivity.java 원문
 * @returns {string[]} 실패 사유
 */
export function checkRegistration(mustRegister, mainActivity) {
  const problems = [];
  const superOnCreate = mainActivity.indexOf("super.onCreate(");

  for (const plugin of mustRegister) {
    const importRe = new RegExp(`^\\s*import\\s+${plugin.fqcn.replace(/\./g, "\\.")}\\s*;`, "m");
    const registerRe = new RegExp(`registerPlugin\\s*\\(\\s*${plugin.simple}\\.class\\s*\\)`);

    if (!importRe.test(mainActivity)) {
      problems.push(`${plugin.pkg}: MainActivity 에 \`import ${plugin.fqcn};\` 가 없다`);
    }
    const match = registerRe.exec(mainActivity);
    if (!match) {
      problems.push(
        `${plugin.pkg}: MainActivity 에 \`registerPlugin(${plugin.simple}.class)\` 가 없다 — ` +
          `capacitor.plugins.json 자동 등록에만 의존하면 cap sync 를 건너뛴 빌드에서 조용히 사라진다`,
      );
      continue;
    }
    if (superOnCreate >= 0 && match.index > superOnCreate) {
      problems.push(
        `${plugin.pkg}: \`registerPlugin(${plugin.simple}.class)\` 가 super.onCreate 뒤에 있다 — ` +
          `BridgeActivity.onCreate 가 이미 브리지를 만들어 버려서 등록이 반영되지 않는다`,
      );
    }
  }
  return problems;
}

// ─────────────────────────────────────────────────────────────────────────
if (process.argv.includes("--self-test")) {
  const sample = [{ fqcn: "com.example.FooPlugin", simple: "FooPlugin", pkg: "@example/foo" }];
  const ok = `import com.example.FooPlugin;\nregisterPlugin(FooPlugin.class);\nsuper.onCreate(s);\n`;
  const missing = `super.onCreate(s);\n`;
  const late = `import com.example.FooPlugin;\nsuper.onCreate(s);\nregisterPlugin(FooPlugin.class);\n`;

  const cases = [
    ["정상 등록은 통과해야 한다", checkRegistration(sample, ok).length === 0],
    ["등록 누락은 실패해야 한다", checkRegistration(sample, missing).length > 0],
    ["super.onCreate 뒤 등록은 실패해야 한다", checkRegistration(sample, late).some((p) => /super\.onCreate 뒤/.test(p))],
  ];
  let bad = 0;
  for (const [label, pass] of cases) {
    console.log(`  ${pass ? "✓" : "✗"} ${label}`);
    if (!pass) bad += 1;
  }
  if (bad > 0) {
    console.error(`\n[verify-capacitor-plugin-registration] 자기검사 실패 ${bad}건 — 판정이 죽어 있다`);
    process.exit(1);
  }
  console.log("\n[verify-capacitor-plugin-registration] 자기검사 OK");
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────────────────
// [1] 검사 대상을 소스에서 전수 발견한다.
// ─────────────────────────────────────────────────────────────────────────
const mobilePkgRaw = read(MOBILE_PKG);
let capacitorDeps = [];
if (mobilePkgRaw) {
  const parsed = JSON.parse(mobilePkgRaw);
  capacitorDeps = Object.keys({ ...(parsed.dependencies || {}), ...(parsed.devDependencies || {}) })
    .filter((name) => name.startsWith("@capacitor/"))
    .sort();
}
if (capacitorDeps.length === 0) {
  failures.push(`${MOBILE_PKG} 에서 @capacitor/* 의존성을 하나도 못 찾았다 — 파서가 소스와 어긋났다`);
}

// Capacitor 런타임이 스스로 등록하는 목록. 이름을 박지 않고 Bridge.java 에서 읽는다.
const runtimeDir = resolvePkgDir(CAPACITOR_RUNTIME);
const runtimeRegistered = new Set();
if (runtimeDir) {
  const bridgeFile = path.join(
    runtimeDir,
    "capacitor/src/main/java/com/getcapacitor/Bridge.java",
  );
  let bridgeSource = "";
  try {
    bridgeSource = readFileSync(bridgeFile, "utf8");
  } catch (error) {
    failures.push(
      `${CAPACITOR_RUNTIME} 의 Bridge.java 를 읽지 못했다 (${error.code || error.message}) — ` +
        `"런타임이 스스로 등록하는 플러그인"을 판정할 수 없어 전부 미분류가 된다`,
    );
  }
  for (const m of bridgeSource.matchAll(/registerPlugin\s*\(\s*([\w.]+)\.class\s*\)/g)) {
    if (m[1].includes(".")) runtimeRegistered.add(m[1]);
  }
  if (bridgeSource && runtimeRegistered.size === 0) {
    failures.push(
      `Bridge.java 에서 자동 등록 목록을 하나도 못 읽었다 — 패턴이 어긋났다(Capacitor 업그레이드 의심)`,
    );
  }
}

const mustRegister = [];
const runtimeOwned = [];
let discovered = 0;
for (const name of capacitorDeps) {
  const dir = resolvePkgDir(name);
  if (!dir) continue;
  const classes = discoverPluginClasses(dir);
  discovered += classes.length;
  if (classes.length === 0) {
    notes.push(`${name}: 안드로이드 플러그인 클래스 없음(런타임/도구 패키지) — 등록 대상 아님`);
    continue;
  }
  for (const cls of classes) {
    if (runtimeRegistered.has(cls.fqcn)) {
      runtimeOwned.push(`${name}: ${cls.fqcn} (Bridge.registerAllPlugins 가 등록)`);
      continue;
    }
    mustRegister.push({ ...cls, pkg: name });
  }
}

// 🔴 탐지기 자체의 누락을 잡는다. Bridge.java 가 등록한다고 이름을 댄 클래스는 반드시
//    소스에서도 발견돼야 한다 — 하나라도 못 찾았다면 어노테이션 패턴이 어긋난 것이고,
//    그렇다면 **등록이 필요한** 플러그인도 같은 이유로 놓치고 있다(초록불 위양성).
const discoveredFqcns = new Set([
  ...mustRegister.map((p) => p.fqcn),
  ...runtimeOwned.map((line) => line.split(": ")[1].split(" ")[0]),
]);
const missedByDetector = [...runtimeRegistered].filter((fqcn) => !discoveredFqcns.has(fqcn));
if (missedByDetector.length > 0) {
  failures.push(
    `탐지기가 런타임 등록 목록 ${runtimeRegistered.size}개 중 ${missedByDetector.length}개를 소스에서 못 찾았다 ` +
      `(${missedByDetector.join(", ")}) — @CapacitorPlugin 패턴이 어긋났다. ` +
      `이 상태면 등록이 필요한 플러그인도 놓치므로 초록불을 믿을 수 없다`,
  );
}

if (discovered === 0 && failures.length === 0) {
  failures.push(
    `@capacitor/* 패키지 ${capacitorDeps.length}개에서 플러그인 클래스를 하나도 못 찾았다 — ` +
      `발견이 0이면 통과가 아니라 실패다(fail-closed)`,
  );
}
if (mustRegister.length === 0 && failures.length === 0) {
  failures.push(
    `명시 등록이 필요한 플러그인을 하나도 못 찾았다 — @capacitor/app·browser 가 있는 한 0일 수 없다`,
  );
}

console.log(
  `  ✓ @capacitor/* 의존성 ${capacitorDeps.length}개에서 플러그인 클래스 ${discovered}개 발견 ` +
    `(런타임 자동 등록 ${runtimeOwned.length}개, 명시 등록 필요 ${mustRegister.length}개)`,
);

// ─────────────────────────────────────────────────────────────────────────
// [2] MainActivity 가 그 전부를 명시 등록하는가.
// ─────────────────────────────────────────────────────────────────────────
const mainActivity = read(MAIN_ACTIVITY);
if (mainActivity) {
  for (const problem of checkRegistration(mustRegister, mainActivity)) failures.push(problem);
  console.log(`  ✓ MainActivity 명시 등록 ${mustRegister.length}건 검사`);
}

// ─────────────────────────────────────────────────────────────────────────
if (runtimeOwned.length > 0) {
  console.log("\n런타임이 등록하므로 제외:");
  for (const line of runtimeOwned) console.log(`  · ${line}`);
}
if (notes.length > 0) {
  console.log("\n등록 대상 아님:");
  for (const note of notes) console.log(`  · ${note}`);
}
if (failures.length > 0) {
  console.error(`\n[verify-capacitor-plugin-registration] 실패 ${failures.length}건`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log("\n[verify-capacitor-plugin-registration] OK");
