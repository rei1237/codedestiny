/**
 * 홈 서비스 레지스트리 ↔ 결제 정본 대조 가드 (cd-home-service-registry-v20260819)
 *
 * 왜 — 홈이 보여 주는 가격은 오랫동안 한글 문자열 리터럴이었고(`'20,000원~'`), 결제 정본인
 * worker/lib/paid-feature-registry.js 와 대조하는 장치가 없었다. 실제로 IFÀ 오라클 타일이
 * 30코인(=3,000원)짜리를 "1회 5,000원"으로 표시하고 있었다(2026-08-19 실측).
 *
 * 🔴 fail-closed 다 (CLAUDE.md 원칙 10).
 *   - 레지스트리가 비어 있거나 못 읽으면 실패한다. 검사 대상이 없을 때 통과시키는 가드는 가드가 아니다.
 *   - 손으로 쓴 대상 목록을 두지 않는다. index.html 에서 결제 속성을 가진 타일을 **전수 발견**해
 *     분류할 수 없는 것을 실패시킨다.
 *   - 유료 표기인데 featureKey 가 없으면 실패한다(미분류 실패).
 *
 * 실행: npm run verify:home-service-registry
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import vm from "node:vm";

const ROOT = process.cwd();
const REGISTRY_FILE = resolve(ROOT, "js/core/service-registry.js");
const SHELL_FILE = resolve(ROOT, "index.html");

const errors = [];
const notes = [];
const fail = (msg) => errors.push(msg);

/* ── 결제 정본 ─────────────────────────────────────────────────── */
const paid = await import(pathToFileURL(resolve(ROOT, "worker/lib/paid-feature-registry.js")).href);
const PRICE_TABLE = paid.FEATURE_KEY_PRICE_TABLE || {};
const ALIASES = paid.PAID_FEATURE_KEY_ALIASES || {};
/* 영구 해금 상품은 per-use 가격표가 아니라 여기에 있다(예: flower-fc 200코인, olympus-fc 100코인).
   한쪽만 보면 정상인 타일을 드리프트로 오인한다 — 2026-08-19 에 실제로 그랬다. */
const UNLOCK_BY_KEY = paid.UNLOCK_PRODUCT_BY_FEATURE_KEY || {};
if (!Object.keys(PRICE_TABLE).length) {
  console.error("[home-service-registry] 결제 정본 가격표가 비어 있다 — 대조 불가");
  process.exit(1);
}

/** featureKey → { key, cost, krw } | null */
const resolveFeature = (raw) => {
  if (!raw) return null;
  const candidates = [raw, ALIASES[raw]].filter(Boolean);
  for (const key of candidates) {
    const perUse = PRICE_TABLE[key];
    if (perUse) return { key, cost: Number(perUse.cost), krw: Number(perUse.amountKRW ?? perUse.cost * 100) };
    const unlock = UNLOCK_BY_KEY[key];
    if (unlock) return { key, cost: Number(unlock.cost), krw: Number(unlock.amountKRW ?? unlock.cost * 100) };
  }
  return null;
};

/* ── 가격 문자열 해석 ───────────────────────────────────────────
 * 반환: { bucket, krw|null }  ·  해석 불가면 null (= 실패)
 * 버킷 경계는 홈 가격 필터 6단계와 같다. */
function readPrice(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  if (/^무료(\s*시작)?$/.test(text)) return { bucket: "free", krw: null };
  if (text === "이용권") return { bucket: "vvip", krw: null };
  const m = text.replace(/,/g, "").match(/^(\d{3,7})원(~)?$/);
  if (!m) return null;
  const won = Number(m[1]);
  let bucket = "vvip";
  if (won < 2000) bucket = "low";
  else if (won < 4000) bucket = "mid";
  else if (won < 8000) bucket = "high";
  else if (won < 20000) bucket = "premium";
  return { bucket, krw: won };
}

/* ── 레지스트리 로드 (브라우저 전역 스크립트를 sandbox 에서 평가) ── */
let registry = [];
let meta = null;
try {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync(REGISTRY_FILE, "utf8"), sandbox, { filename: REGISTRY_FILE });
  registry = sandbox.window.__cdServiceRegistry;
  meta = sandbox.window.__cdServiceRegistryMeta;
} catch (err) {
  console.error(`[home-service-registry] ${REGISTRY_FILE} 평가 실패 — ${err.message}`);
  process.exit(1);
}
if (!Array.isArray(registry) || registry.length === 0) {
  console.error("[home-service-registry] window.__cdServiceRegistry 가 비어 있다 (fail-closed)");
  process.exit(1);
}
if (!meta || !Array.isArray(meta.purposes) || !Array.isArray(meta.methods)) {
  console.error("[home-service-registry] window.__cdServiceRegistryMeta 의 purposes/methods 선언이 없다");
  process.exit(1);
}

const PURPOSES = new Set(meta.purposes);
const METHODS = new Set(meta.methods);
const ROLES = new Set(["quick", "recommended"]);

/* ── 1. 레지스트리 항목 검사 ───────────────────────────────────── */
const seenIds = new Set();
for (const item of registry) {
  const at = `레지스트리 "${item.id || item.name || "(id 없음)"}"`;
  if (!item.id) fail(`${at}: id 가 없다`);
  else if (seenIds.has(item.id)) fail(`${at}: id 중복`);
  else seenIds.add(item.id);

  if (!item.name) fail(`${at}: name 이 없다`);
  if (!item.desc) fail(`${at}: desc 가 없다`);
  if (!item.href && !item.action) fail(`${at}: href 와 action 이 둘 다 없다 — 열 수 없는 항목`);
  if (item.href && !item.href.startsWith("/")) fail(`${at}: href 가 절대경로가 아니다 (${item.href})`);

  if (!Array.isArray(item.purposes) || item.purposes.length === 0) fail(`${at}: purposes 가 비었다`);
  else for (const p of item.purposes) if (!PURPOSES.has(p)) fail(`${at}: 알 수 없는 purpose "${p}"`);

  if (!Array.isArray(item.methods) || item.methods.length === 0) fail(`${at}: methods 가 비었다`);
  else for (const m of item.methods) if (!METHODS.has(m)) fail(`${at}: 알 수 없는 method "${m}"`);

  if (item.roles) {
    if (!Array.isArray(item.roles)) fail(`${at}: roles 가 배열이 아니다`);
    else for (const r of item.roles) if (!ROLES.has(r)) fail(`${at}: 알 수 없는 role "${r}"`);
  }

  const price = readPrice(item.price);
  if (!price) {
    fail(`${at}: price "${item.price}" 를 해석할 수 없다 — '무료' | '무료 시작' | '이용권' | 'N,NNN원' | 'N,NNN원~' 만 허용`);
    continue;
  }

  if (price.krw === null) {
    if (item.featureKey && !resolveFeature(item.featureKey)) {
      fail(`${at}: featureKey "${item.featureKey}" 가 결제 정본에 없다`);
    }
    continue;
  }

  // 유료 표기 = featureKey 필수 (미분류 실패)
  if (!item.featureKey) {
    fail(`${at}: 유료 표기(${item.price})인데 featureKey 가 없다 — 가격 대조가 불가능하다`);
    continue;
  }
  const feature = resolveFeature(item.featureKey);
  if (!feature) {
    fail(`${at}: featureKey "${item.featureKey}" 가 결제 정본에 없다`);
    continue;
  }
  if (price.krw !== feature.krw) {
    fail(`${at}: 표시 ${price.krw.toLocaleString()}원 / 결제 정본 ${feature.krw.toLocaleString()}원 (${feature.key}, cost=${feature.cost})`);
  }
}

/* ── 2. 셸 마크업 타일 전수 대조 ────────────────────────────────
 * js/core/feature-pricing-store.js 의 seedFromMarkup() 이 data-feature-key/data-coin-cost 를
 * 읽어 클라이언트 가격 캐시를 채운다. 마크업이 정본과 어긋나면 그 캐시가 틀린 값을 퍼뜨린다. */
const shell = readFileSync(SHELL_FILE, "utf8");
const TILE_OPEN = /<(?:a|button)\b([^>]*\bdata-feature-key="[^"]+"[^>]*)>/g;
const attrOf = (head, name) => {
  const m = head.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : "";
};

let tileCount = 0;
const freeMarkerKeys = new Set();
let match;
while ((match = TILE_OPEN.exec(shell))) {
  tileCount += 1;
  const head = match[1];
  const featureKey = attrOf(head, "data-feature-key");
  const coin = attrOf(head, "data-coin-cost") || attrOf(head, "data-tile-lock-cost");
  const label = attrOf(head, "aria-label") || featureKey;
  const chunk = shell.slice(match.index, match.index + 3000);
  const badge = (chunk.match(/class="(?:tarot-tile__coin-badge|cd-sig-card__price[^"]*)"[^>]*>([^<]{1,40})/) || [])[1] || "";

  const shown = badge.replace(/,/g, "").match(/(\d{3,7})\s*원/);
  const feature = resolveFeature(featureKey);
  if (!feature) {
    /* 값이 걸린 타일만 정본 등재를 강제한다. 코인·가격이 전혀 없는 타일의 data-feature-key 는
       과금 키가 아니라 단순 마커다(예: fortune-prompt-hub — 무료 진입). 돈 냄새가 나면 실패. */
    if (coin || shown) {
      fail(`셸 타일 "${label}": data-feature-key "${featureKey}" 가 결제 정본에 없는데 가격이 걸려 있다 (coin=${coin || "-"}, 배지="${badge.trim() || "-"}")`);
    } else {
      freeMarkerKeys.add(featureKey);
    }
    continue;
  }

  if (coin && Number(coin) !== feature.cost) {
    fail(`셸 타일 "${label}": data-coin-cost=${coin} / 결제 정본 cost=${feature.cost} (${feature.key})`);
  }
  if (shown && Number(shown[1]) !== feature.krw) {
    fail(`셸 타일 "${label}": 가격 배지 "${badge.trim()}" / 결제 정본 ${feature.krw.toLocaleString()}원 (${feature.key})`);
  }
}
if (tileCount === 0) {
  console.error("[home-service-registry] index.html 에서 data-feature-key 타일을 하나도 못 찾았다 — 선택자가 썩었다 (fail-closed)");
  process.exit(1);
}
notes.push(`레지스트리 ${registry.length}개 · 셸 결제 타일 ${tileCount}개 대조`);
if (freeMarkerKeys.size) notes.push(`무료 마커 키 ${freeMarkerKeys.size}개 통과(${[...freeMarkerKeys].join(", ")})`);

/* ── 결과 ──────────────────────────────────────────────────────── */
if (errors.length) {
  console.error(`[home-service-registry] 실패 ${errors.length}건 (${notes.join(" · ")})`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`[home-service-registry] OK — ${notes.join(" · ")}`);
