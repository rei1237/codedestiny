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

/* ── 3. 홈 배치 섹션 ↔ 레지스트리 roles 전수 대조 ────────────────
 * 빠른 서비스·대표 상담 카드는 정적 마크업이다(CLS·SEO 때문). 그래서 레지스트리와 갈라질 수
 * 있으므로 **양방향**으로 본다: 카드는 반드시 레지스트리에 있어야 하고, roles 를 선언한
 * 레지스트리 항목은 반드시 그 섹션에 정확히 한 번 나와야 한다. */
function sectionOf(id) {
  const idAt = shell.indexOf(`id="${id}"`);
  if (idAt < 0) return null;
  const start = shell.lastIndexOf("<", idAt);
  const tag = /^<([a-z]+)/i.exec(shell.slice(start))[1];
  const re = new RegExp(`<${tag}\\b|</${tag}>`, "gi");
  re.lastIndex = start;
  let depth = 0;
  let m;
  while ((m = re.exec(shell))) {
    depth += m[0][1] === "/" ? -1 : 1;
    if (depth === 0) return shell.slice(start, m.index + m[0].length);
  }
  return null;
}

const byId = new Map(registry.map((item) => [item.id, item]));
const PLACEMENTS = [
  { role: "quick", sectionId: "cdQuickServices", label: "빠른 서비스" },
  { role: "recommended", sectionId: "cdSignatureConsult", label: "대표 상담" },
];

const placed = new Map();
for (const { role, sectionId, label } of PLACEMENTS) {
  const html = sectionOf(sectionId);
  if (!html) {
    fail(`${label}: index.html 에 #${sectionId} 가 없다`);
    continue;
  }
  const cardRe = /<a\b([^>]*\bdata-cd-service-id="([^"]+)"[^>]*)>/g;
  const found = [];
  let card;
  while ((card = cardRe.exec(html))) {
    const [, head, id] = card;
    found.push(id);
    const item = byId.get(id);
    if (!item) {
      fail(`${label} 카드 "${id}": 레지스트리에 없는 id`);
      continue;
    }
    if (!(item.roles || []).includes(role)) {
      fail(`${label} 카드 "${id}": 레지스트리 roles 에 "${role}" 이 없다 — 배치와 데이터가 어긋난다`);
    }
    const href = attrOf(head, "href");
    if (href && item.href && href !== item.href) {
      fail(`${label} 카드 "${id}": href "${href}" / 레지스트리 "${item.href}"`);
    }
    // 카드에 적힌 가격은 레지스트리와 같은 가격대여야 하고, 유료면 금액까지 같아야 한다.
    const body = html.slice(card.index, html.indexOf("</a>", card.index));
    const priceText = (body.match(/class="(?:cd-quick-card__price|cd-sig-card__price[^"]*)"[^>]*>([^<]{1,40})/) || [])[1];
    if (priceText) {
      const shownWon = priceText.replace(/,/g, "").match(/(\d{3,7})\s*원/);
      const wanted = readPrice(item.price);
      if (shownWon && wanted && wanted.krw !== null && Number(shownWon[1]) !== wanted.krw) {
        fail(`${label} 카드 "${id}": 표시 "${priceText.trim()}" / 레지스트리 ${item.price}`);
      }
      if (!shownWon && wanted && wanted.krw !== null) {
        fail(`${label} 카드 "${id}": 유료(${item.price})인데 카드에 금액이 없다 ("${priceText.trim()}")`);
      }
      if (shownWon && wanted && wanted.krw === null) {
        fail(`${label} 카드 "${id}": 무료 표기(${item.price})인데 카드가 금액을 보여 준다 ("${priceText.trim()}")`);
      }
    }
  }
  placed.set(role, found);
  if (found.length === 0) fail(`${label}: data-cd-service-id 카드를 하나도 못 찾았다 (fail-closed)`);
}

for (const { role, label } of PLACEMENTS) {
  const declared = registry.filter((item) => (item.roles || []).includes(role)).map((item) => item.id);
  const found = placed.get(role) || [];
  for (const id of declared) {
    const times = found.filter((f) => f === id).length;
    if (times !== 1) fail(`${label}: roles 에 "${role}" 을 선언한 "${id}" 가 섹션에 ${times}번 나온다 (1번이어야 한다)`);
  }
}
notes.push(`배치 대조 quick ${(placed.get("quick") || []).length}개 · recommended ${(placed.get("recommended") || []).length}개`);

/* ── 4. 레지스트리 항목 ↔ 상세 문안 전수 대조 (cd-registry-copy-coverage) ─────
 *
 * 왜 — #cdFinder 추천 카드는 진입 전에 상세 시트를 연다. 자기 문안이 없는 항목은
 * 카테고리 템플릿만으로 설명되어 그 상품 이야기가 아닌 문구가 뜬다(2026-09-01 홈 감사).
 * 🔴 fail-closed: 셸에서 FEATURE_MARKETING_COPY 최상위 키를 전수 추출하고, 키를 하나도
 * 못 읽으면 그 자체로 실패한다. 예외 목록은 두지 않는다 — 새 항목을 레지스트리에 넣으면
 * 문안도 같이 넣어야 통과한다.
 *
 * 조회 규칙은 셸의 _marketingKeys 와 같다: data-feature-key → data-action → href.
 * href 는 정규화 없이 리터럴로 찾으므로 슬래시 유무 두 벌을 모두 후보로 둔다.
 */
function extractCopyKeys(html) {
  const anchor = "var FEATURE_MARKETING_COPY={";
  const start = html.indexOf(anchor);
  if (start < 0) return null;
  const open = start + anchor.length - 1;
  let depth = 0;
  let quote = null;
  for (let i = open; i < html.length; i += 1) {
    const c = html[i];
    if (quote) {
      if (c === "\\") { i += 1; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") { quote = c; continue; }
    if (c === "{") depth += 1;
    else if (c === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return Object.keys(new Function(`return ${html.slice(open, i + 1)};`)());
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

const copyKeys = extractCopyKeys(shell);
if (!copyKeys || !copyKeys.length) {
  fail("FEATURE_MARKETING_COPY 를 셸에서 읽지 못했습니다 — 문안 대조를 통째로 건너뛸 수 없습니다.");
} else {
  const copySet = new Set(copyKeys);
  const missing = [];
  for (const item of registry) {
    const href = String(item.href || "");
    const candidates = [
      item.featureKey,
      item.action,
      href,
      href.endsWith("/") ? href.slice(0, -1) : href ? `${href}/` : "",
    ].filter(Boolean);
    if (!candidates.some((key) => copySet.has(key))) missing.push(`${item.id}(${candidates.join(" | ")})`);
  }
  if (missing.length) {
    fail(
      `상세 문안이 없는 레지스트리 항목 ${missing.length}건 — index.html 의 FEATURE_MARKETING_COPY 에 ` +
        `href/action/featureKey 중 하나를 키로 추가하세요: ${missing.join(", ")}`,
    );
  }
  notes.push(`상세 문안 대조 ${registry.length - missing.length}/${registry.length}`);
}
/* ── 결과 ──────────────────────────────────────────────────────── */
if (errors.length) {
  console.error(`[home-service-registry] 실패 ${errors.length}건 (${notes.join(" · ")})`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`[home-service-registry] OK — ${notes.join(" · ")}`);
