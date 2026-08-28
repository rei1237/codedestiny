// 유료 서비스 페이지의 schema.org Offer 가 **실제 결제 금액과 같은지** 본다.
//
// 왜 필요한가:
//   구조화 데이터의 가격은 검색결과에 그대로 실린다. 그런데 그 값은 페이지가 렌더될 때
//   한 번 만들어지고 끝이라, 틀려도 화면 어디에도 증상이 없다 — 결제창은 서버 가격을 쓰고
//   검색결과만 옛 가격을 말한다. 아무도 안 본다.
//
//   드리프트가 나는 경로는 둘이다:
//     ① 가격표가 바뀌었는데 Offer 가 하드코딩이라 안 따라간다
//        → buildKrwOffer 가 서버 가격표를 타므로 구조적으로 막혀 있다. 이 가드는 그 성질을 고정한다.
//     ② 페이지의 결제 featureKey 가 바뀌었는데 Offer 의 featureKey 만 옛 값으로 남는다
//        → 이건 지금도 열려 있다. 여기서 **클라이언트 상수와 대조해** 잡는다.
//
// 무엇을 강제하는가:
//   ① buildKrwOffer 를 부르는 페이지를 소스에서 **전수 발견**한다(손으로 적은 목록 금지)
//   ② 각 featureKey 가 서버 가격표에서 0 보다 큰 금액으로 풀린다
//   ③ 각 featureKey 가 그 페이지 디렉터리의 클라이언트 결제 상수와 **같다**
//   ④ 통화가 KRW 로 고정돼 있다 — 이니시스 해외카드 특약은 승인·정산이 모두 원화다.
//      로케일별로 priceCurrency 를 바꾸면 검색결과와 결제창이 다른 통화를 말하게 된다.
//   ⑤ Offer 슬롯이 buildServiceJsonLd 에 살아 있다(있어야 offers 가 실제로 방출된다)
//   ⑥ 이 검사기가 읽는 파일이 paid-flow-gates 트리거 경로에 있다
//
// 🔴 fail-closed: 발견된 페이지가 바닥 아래면 실패한다. 배선이 통째로 사라졌는데 "검사 대상 0개"
//    라서 초록인 것이 이 가드의 유일한 실패 모드다.
//
// 실행: npm run verify:paid-service-offer
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, join, dirname } from "node:path";
import { getBillingFeaturePricing } from "../worker/lib/billing-feature-registry.js";
import { gateCovers as gateCoversAny, readGatePatterns } from "./lib/gate-trigger-coverage.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (rel) => readFileSync(resolve(root, rel), "utf8");

const OFFER_MODULE = "lib/seo/paid-offer.ts";
const SERVICE_JSONLD = "lib/structured-data.ts";
const APP_DIR = "app";

// ── 0) 정본 모듈이 KRW 로 고정돼 있다 ────────────────────────────────────────────
const offerSource = read(OFFER_MODULE);
assert.match(
  offerSource,
  /export const OFFER_PRICE_CURRENCY = "KRW";/,
  `${OFFER_MODULE}: 통화 상수가 "KRW" 가 아닙니다. KG이니시스 해외카드 특약은 승인·정산이 모두 원화입니다 `
    + `— 로케일별 통화로 바꾸면 검색결과가 결제창과 다른 통화를 말하게 됩니다.`,
);
assert.ok(
  offerSource.includes("priceCurrency: OFFER_PRICE_CURRENCY"),
  `${OFFER_MODULE}: priceCurrency 가 상수를 쓰지 않습니다.`,
);
assert.ok(
  offerSource.includes("resolveServerFeaturePricing"),
  `${OFFER_MODULE}: 가격을 서버 가격표에서 풀지 않습니다 — 숫자를 직접 적으면 가격 변경이 검색결과에 반영되지 않습니다.`,
);

// ── 0-b) buildServiceJsonLd 가 offers 를 실제로 방출한다 ─────────────────────────
const serviceSource = read(SERVICE_JSONLD);
assert.ok(
  /\.\.\.\(input\.offer \? \{ offers: input\.offer \} : \{\}\),/.test(serviceSource),
  `${SERVICE_JSONLD}: buildServiceJsonLd 가 offers 를 내보내지 않습니다 — offer 를 넘겨도 구조화 데이터에 안 실립니다.`,
);

// ── 1) buildKrwOffer 호출 페이지를 전수 발견한다 ─────────────────────────────────
function walk(dirRel, out = []) {
  for (const entry of readdirSync(resolve(root, dirRel), { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const childRel = `${dirRel}/${entry.name}`;
    if (entry.isDirectory()) walk(childRel, out);
    else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) out.push(childRel);
  }
  return out;
}

const CALL_PATTERN = /buildKrwOffer\(\s*"([^"]+)"/g;
const wired = [];
for (const rel of walk(APP_DIR)) {
  const source = readFileSync(resolve(root, rel), "utf8");
  if (!source.includes("buildKrwOffer(")) continue;
  const keys = [...source.matchAll(CALL_PATTERN)].map((match) => match[1]);
  assert.ok(
    keys.length > 0,
    `${rel}: buildKrwOffer 를 부르지만 featureKey 를 리터럴로 넘기지 않습니다 — `
      + `변수로 넘기면 이 가드가 값을 대조할 수 없습니다.`,
  );
  for (const featureKey of keys) wired.push({ rel, featureKey });
}

const MIN_WIRED_PAGES = 9; // 2026-08-28 실측 9. 줄어들면 배선이 사라진 것이다.
assert.ok(
  wired.length >= MIN_WIRED_PAGES,
  `Offer 가 붙은 유료 페이지가 ${wired.length}개입니다(최소 ${MIN_WIRED_PAGES}). `
    + `배선이 사라졌거나 이 검사기의 발견 로직이 깨졌습니다.`,
);

// ── 2) 각 featureKey 가 서버 가격표에서 풀린다 ───────────────────────────────────
for (const { rel, featureKey } of wired) {
  let pricing = null;
  try {
    pricing = getBillingFeaturePricing({ featureKey })?.pricing ?? null;
  } catch (error) {
    assert.fail(`${rel}: featureKey "${featureKey}" 가격 조회가 throw 했습니다 — ${error.message}`);
  }
  const amount = Number(pricing?.amountKRW || 0);
  assert.ok(
    amount > 0,
    `${rel}: featureKey "${featureKey}" 가 서버 가격표에서 풀리지 않습니다(amountKRW=${amount}). `
      + `buildKrwOffer 는 null 을 돌려 offers 를 조용히 생략하므로, 검색결과에 가격이 사라진 채 배포됩니다.`,
  );
}

// ── 3) 페이지의 결제 상수와 Offer 의 featureKey 가 같다 ──────────────────────────
// 결제에 쓰는 상수는 페이지 디렉터리의 클라이언트 파일에 있다(FEATURE_KEY / PAID_FEATURE_KEY / SERVICE_TYPE).
const CLIENT_KEY_PATTERN = /^const (?:FEATURE_KEY|PAID_FEATURE_KEY|SERVICE_TYPE) = "([^"]+)";$/gm;
// 🔴 몰입형 페이지는 상수를 app/ 이 아니라 src/features/<이름>/constants.ts 에 둔다
//    (예: master-love-codex). 페이지 디렉터리만 뒤지면 그런 페이지는 declared 가 비어 대조가
//    조용히 건너뛰어지고, Offer 의 featureKey 가 틀려도 아무도 못 잡는다 — fail-open 이다.
const FEATURE_MODULE_KEY_PATTERN = /^export const [A-Z0-9_]*FEATURE_KEY = "([^"]+)";$/gm;
const FEATURE_MODULE_ROOT = "src/features";
let comparedPages = 0;
const featureModuleReads = new Set();
for (const { rel, featureKey } of wired) {
  const dirRel = dirname(rel);
  const siblings = readdirSync(resolve(root, dirRel), { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(tsx|ts|jsx|js)$/.test(entry.name) && entry.name !== "page.tsx")
    .map((entry) => join(dirRel, entry.name).replaceAll("\\", "/"));

  const declared = new Set();
  for (const sibling of siblings) {
    const source = readFileSync(resolve(root, sibling), "utf8");
    for (const match of source.matchAll(CLIENT_KEY_PATTERN)) declared.add(match[1]);
  }

  const featureModuleRel = `${FEATURE_MODULE_ROOT}/${dirRel.split("/").pop()}/constants.ts`;
  let featureModuleSource = null;
  try {
    featureModuleSource = readFileSync(resolve(root, featureModuleRel), "utf8");
  } catch {
    featureModuleSource = null; // 그런 모듈이 없는 페이지가 정상이다.
  }
  if (featureModuleSource) {
    for (const match of featureModuleSource.matchAll(FEATURE_MODULE_KEY_PATTERN)) declared.add(match[1]);
    featureModuleReads.add(featureModuleRel);
  }
  if (declared.size === 0) continue; // 클라이언트 상수가 없는 페이지는 대조할 대상이 없다.
  comparedPages += 1;
  assert.ok(
    declared.has(featureKey),
    `${rel}: Offer 의 featureKey "${featureKey}" 가 이 페이지의 결제 상수와 다릅니다 `
      + `(클라이언트 선언: ${[...declared].join(", ")}). 검색결과가 실제 결제와 다른 상품 가격을 말하게 됩니다.`,
  );
}

const MIN_COMPARED = 8; // 2026-08-28 실측 9. 정규식이 깨져 대조가 0 이 되면 여기서 걸린다.
assert.ok(
  comparedPages >= MIN_COMPARED,
  `클라이언트 결제 상수와 대조된 페이지가 ${comparedPages}개입니다(최소 ${MIN_COMPARED}). `
    + `상수 선언 형태가 바뀌어 대조가 조용히 사라졌을 수 있습니다.`,
);

// ── 6) CI 트리거 커버리지 ────────────────────────────────────────────────────────
const GATE_WORKFLOW = ".github/workflows/paid-flow-gates.yml";
const gatePatterns = readGatePatterns(resolve(root, GATE_WORKFLOW));
const READ_PATHS = [OFFER_MODULE, SERVICE_JSONLD, ...new Set(wired.map((entry) => entry.rel)), ...featureModuleReads];
const uncovered = READ_PATHS.filter((rel) => !gateCoversAny(gatePatterns, rel));
assert.equal(
  uncovered.length,
  0,
  `${GATE_WORKFLOW}: 트리거 경로에 다음이 없습니다 — 이 파일만 바뀐 PR 에서는 Offer 검증이 돌지 않습니다.\n`
    + uncovered.map((rel) => `  - ${rel}`).join("\n"),
);

console.log(
  `[verify-paid-service-offer] PASS `
    + `(${wired.length} paid pages, ${comparedPages} cross-checked against client keys, `
    + `currency=KRW, ${READ_PATHS.length} gate-triggered paths)`,
);
