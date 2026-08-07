/**
 * 전역 Mongo 풀 리셋 호출자 가드.
 *
 * 🔴 resetMongooseConnection() 은 가드 없는 전역 mongoose.disconnect() 다. bufferCommands:false 이므로
 * 끊는 순간 **같은 아이솔레이트에서 살아서 실행 중인 동시 요청의 raw 드라이버 호출이 전부 즉시 throw**
 * 한다. 그래서 worker/lib/db.js 의 withMongoRetry 는 리셋 앞에 두 가지 가드를 둔다:
 *   · inFlightOps > 1 이면 지금 끊지 않고 예약만 한다(마지막 작업이 빠져나갈 때 처리)
 *   · MONGO_POOL_RESET_COOLDOWN_MS 쿨다운으로 리셋 폭주를 막는다
 *
 * 그런데 worker/routes/auth.js 3곳(social/login/oauth-complete)이 이 가드를 통째로 우회해
 * resetMongooseConnection() 을 직접 부르고 있었다. 한 사용자의 실패한 로그인이 그 아이솔레이트로
 * 들어온 모든 동시 요청(auth/me·balance·subscription)을 함께 죽일 수 있는 구조였다(2026-08-08 수정).
 *
 * 이제 라우트는 requestPoolRecovery() 만 쓴다 — 같은 상태기계를 재사용하는 가드된 진입점이다.
 * 이 스크립트는 db.js 밖에서 resetMongooseConnection 을 **호출**하는 코드가 다시 생기지 않게 고정한다.
 * (주석·문서에서 이름을 언급하는 것은 허용한다 — 금지 대상은 호출이다.)
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SCAN_ROOTS = ["worker", "server", "app", "lib", "scripts"];
const ALLOWED = new Set(["worker/lib/db.js"]);
const SELF = "scripts/verify-mongo-reset-callers.mjs";

/** 문자열·정규식은 건드리지 않고 주석만 지운다(호출 여부만 보면 되므로 이 정도로 충분하다). */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry === ".next" || entry === "dist" || entry === "out") continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (/\.(m?js|cjs|ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const offenders = [];
for (const scanRoot of SCAN_ROOTS) {
  for (const file of walk(join(ROOT, scanRoot))) {
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    if (ALLOWED.has(rel) || rel === SELF) continue;
    const source = stripComments(readFileSync(file, "utf8"));
    // 호출만 잡는다: `resetMongooseConnection(` — import 구문은 별도로 잡는다.
    if (/\bresetMongooseConnection\s*\(/.test(source)) {
      offenders.push(`${rel}: calls resetMongooseConnection() directly`);
      continue;
    }
    if (/\bimport\s*\{[^}]*\bresetMongooseConnection\b[^}]*\}/.test(source)) {
      offenders.push(`${rel}: imports resetMongooseConnection (use requestPoolRecovery instead)`);
    }
  }
}

// db.js 가 가드된 진입점을 실제로 export 하는지도 함께 고정한다.
const dbSource = readFileSync(join(ROOT, "worker/lib/db.js"), "utf8");
if (!/export\s+async\s+function\s+requestPoolRecovery\s*\(/.test(dbSource)) {
  offenders.push("worker/lib/db.js: requestPoolRecovery() is missing — routes have no guarded entry point");
}
for (const marker of ["pendingPoolReset = true", "lastPoolResetAt"]) {
  if (!dbSource.includes(marker)) {
    offenders.push(`worker/lib/db.js: requestPoolRecovery lost its guard (${marker} not found)`);
  }
}

if (offenders.length) {
  console.error("[verify-mongo-reset-callers] FAIL");
  for (const offender of offenders) console.error(`  - ${offender}`);
  console.error("\n  전역 리셋은 db.js 안에서만 한다. 라우트는 requestPoolRecovery(env) 를 쓸 것.");
  process.exit(1);
}

console.log("[verify-mongo-reset-callers] PASS (global pool reset stays inside worker/lib/db.js)");
