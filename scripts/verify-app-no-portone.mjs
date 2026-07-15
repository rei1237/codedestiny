// 앱 빌드에 외부 결제(PortOne/이니시스) 경로가 남아있지 않은지 검증 — 배포 게이트.
//
// 정적 문자열 검사만으로는 부족하다(destiny-profile.js는 웹·앱 공용이라 PortOne 코드가
// 파일 안에 남아 있다). 그래서 가드를 jsdom에서 실제로 실행해 "정말 막히는가"를 확인한다.
//
// 실행:
//   node scripts/verify-app-no-portone.mjs             # 가드 동작만 검증(빌드 불필요)
//   node scripts/verify-app-no-portone.mjs --dist dist # dist 산출물까지 검증

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distArgIndex = process.argv.indexOf("--dist");
const DIST = distArgIndex > -1 ? path.resolve(ROOT, process.argv[distArgIndex + 1]) : "";
const GUARD_PUBLIC_PATH = "/js/app-payment-guard.js";

const failures = [];

function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${label}`);
    return;
  }
  failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
}

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir, filter, out = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, filter, out);
    else if (filter(full)) out.push(full);
  }
  return out;
}

// --- 1) 가드 동작 검증 (jsdom 실제 실행) ---------------------------------
console.log("\n[1] 결제 가드가 실제로 PortOne 경로를 막는가 (jsdom 실행)");

const guardSource = await fs.readFile(path.join(ROOT, "scripts", "app-payment-guard.js"), "utf8");
const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
  url: "https://code-destiny.com/saju/basic/",
  runScripts: "outside-only",
});
const { window } = dom;
window.fetch = async () => ({ ok: true, json: async () => ({ ok: true, data: {} }) });
window.eval(guardSource);

check("가드 설치됨", window.__cdAppPaymentGuard?.installed === true);

// PortOne SDK가 자리잡지 못하는가 — SDK 로드 자체를 흉내낸다.
window.eval("window.PortOne = { requestPayment: function(){ return Promise.resolve({ code: null }); } };");
check(
  "PortOne SDK 대입이 무력화됨 (window.PortOne === undefined)",
  window.PortOne === undefined,
  `실제값=${typeof window.PortOne}`,
);

// destiny-profile.js가 나중에 PortOne 구현을 대입하는 상황을 흉내낸다.
window.eval("window.__cdPortOneImplInstalled = false; window._cdRunDirectKrwCheckout = function(){ window.__cdPortOneImplInstalled = true; return Promise.resolve({}); };");
check(
  "_cdRunDirectKrwCheckout에 PortOne 구현이 대입되지 않음",
  window._cdRunDirectKrwCheckout === window.__cdAppPaymentGuard.runPlayBillingCheckout,
  "가드 구현이 유지되어야 한다",
);

window.eval("window.__cdOpenChargeModal = function(){ window.__cdChargeModalOpened = true; };");
check(
  "__cdOpenChargeModal이 앱 스토어로 고정됨",
  window.__cdOpenChargeModal === window.__cdAppPaymentGuard.openAppStore,
);

// /points 링크 클릭이 차단되는가
let navigatedTo = "";
window.__cdAppPaymentGuard.openAppStore = () => { navigatedTo = "/app/store/"; };
window.eval(`
  var a = document.createElement('a');
  a.href = '/points?source=test';
  a.textContent = 'x';
  document.body.appendChild(a);
  window.__cdTestAnchor = a;
`);
const clickEvent = new window.MouseEvent("click", { bubbles: true, cancelable: true });
window.__cdTestAnchor.dispatchEvent(clickEvent);
check("/points 링크 클릭이 차단됨 (preventDefault)", clickEvent.defaultPrevented === true);

// --- 2) 가드가 PortOne을 호출하지 않는가 (소스 검사) ---------------------
console.log("\n[2] 가드 자체가 외부 결제를 호출하지 않는가");
check("가드에 cdn.portone.io 참조 없음", !guardSource.includes("cdn.portone.io"));
check("가드에 requestPayment 호출 없음", !/\.requestPayment\s*\(/.test(guardSource));
check("가드가 Play Billing(app-store) API만 사용", guardSource.includes("/api/app-store"));

// --- 3) dist 산출물 검증 (선택) -----------------------------------------
if (DIST) {
  console.log(`\n[3] 앱 빌드 산출물 검증: ${path.relative(ROOT, DIST) || DIST}`);
  if (!(await exists(DIST))) {
    failures.push(`dist를 찾을 수 없습니다: ${DIST}`);
    console.log(`  ✗ dist 없음 — 먼저 build:mobile:app 실행`);
  } else {
    check("가드 자산이 배치됨", await exists(path.join(DIST, "js", "app-payment-guard.js")));

    for (const prefix of ["", "en", "ja", "zh"]) {
      const label = prefix ? `/${prefix}/points` : "/points";
      check(`${label} 라우트 제거됨`, !(await exists(path.join(DIST, prefix, "points"))));
    }

    const htmlFiles = await walk(DIST, (file) => file.toLowerCase().endsWith(".html"));
    const missingGuard = [];
    const directSdkTag = [];
    for (const file of htmlFiles) {
      const html = await fs.readFile(file, "utf8");
      if (!html.includes(GUARD_PUBLIC_PATH)) missingGuard.push(path.relative(DIST, file).replace(/\\/g, "/"));
      // <script src="https://cdn.portone.io/...">를 HTML이 직접 걸고 있으면 가드보다 먼저 뜰 수 있다.
      if (/<script[^>]+src=["'][^"']*cdn\.portone\.io/i.test(html)) {
        directSdkTag.push(path.relative(DIST, file).replace(/\\/g, "/"));
      }
    }
    check(
      `모든 HTML에 가드 주입됨 (${htmlFiles.length - missingGuard.length}/${htmlFiles.length})`,
      missingGuard.length === 0,
      missingGuard.slice(0, 5).join(", "),
    );
    check(
      "PortOne SDK를 직접 거는 <script> 태그 없음",
      directSdkTag.length === 0,
      directSdkTag.slice(0, 5).join(", "),
    );
  }
} else {
  console.log("\n[3] dist 검증 생략 (--dist 미지정)");
}

if (failures.length) {
  console.error(`\n[실패] 앱 PortOne 차단 검증 ${failures.length}건`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log("\n[통과] 앱 PortOne 차단 검증 — SDK 무력화·단건결제 Play 전환·/points 차단 확인\n");
