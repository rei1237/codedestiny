/**
 * 달빛 이용권 등급 정책 정합성 가드 (2026-08-24 개정 정책).
 *
 * 실행: npm run verify:pass-tier-policy
 *
 * 이 가드가 지키는 것 — 정책 한 줄이 여러 파일에 흩어져 있고, 그중 하나만 낡으면
 * "화면은 5천원까지라는데 서버는 3천원에서 막는" 조용한 어긋남이 생긴다.
 *
 *   ① 등급별 건당 적용 가격 범위 · 월 이용 한도 · 프로필 수의 절대값
 *   ② 가격 경계에서의 커버 판정(실제 판정 함수를 import 해 돌린다 — 문자열 검사 아님)
 *   ③ 같은 숫자를 든 하드코딩 사본들이 서버 정본과 일치하는가
 *   ④ 사용자에게 보이는 문구가 "한도 없음"을 뜻하는 표현을 쓰지 않는가
 *
 * fail-closed 설계: 사본에서 4등급을 **전부** 뽑아내지 못하면 통과가 아니라 실패다.
 * 정규식이 리팩터링에 빗나가면 "검사 대상이 없어서 통과"가 되는 게 이 종류 가드의 전형적인
 * 사고인데, 그때 조용히 초록불이 되면 안 된다.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  FAMILY_PASS_MAX_COVERED_COIN,
  HONEY_PASS_POLICY,
  KRW_PER_COIN,
  MONTHLY_PASS_LIMITS,
  MONTHLY_PASS_LIMITS_KRW,
  PASS_LIMITS,
  PASS_LIMITS_KRW,
  PREMIUM_QUOTA_INCLUDED_USES_BY_TIER,
} from "../worker/lib/profile-limits.js";
import { evaluatePassCoverage, describePassEligibility } from "../worker/payments/passes.js";
import { listAppPassProducts } from "../worker/lib/app-store-pricing.js";
import { PASS_MONTHLY_WON } from "../lib/payment/pass-pricing.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

const failures = [];
const check = (label, ok, detail = "") => {
  if (ok) return;
  failures.push(detail ? `${label} — ${detail}` : label);
};

const TIERS = ["standard", "premium", "vvip", "family"];

/* ── ① 절대값 ─────────────────────────────────────────────────────────────
   여기 숫자는 사용자와 합의된 정책 그 자체다. 코드를 바꿔 이 가드를 통과시키는 게
   아니라, 정책을 바꿀 때만 이 숫자를 바꾼다. */
const POLICY = {
  standard: { won: 9900, bandKRW: 5000, monthlyKRW: 30000, profiles: 3 },
  premium: { won: 29900, bandKRW: 10000, monthlyKRW: 100000, profiles: 7 },
  vvip: { won: 59000, bandKRW: 20000, monthlyKRW: 200000, profiles: 15 },
  // family: 건당 상한 없음(bandKRW: null), 프로필 무제한(profiles: 0)
  family: { won: 149000, bandKRW: null, monthlyKRW: 500000, profiles: 0 },
};

for (const tier of TIERS) {
  const want = POLICY[tier];
  check(`[${tier}] 판매가 ${want.won}원`, PASS_MONTHLY_WON[tier] === want.won, `실제=${PASS_MONTHLY_WON[tier]}`);
  check(`[${tier}] 월 이용 한도 ${want.monthlyKRW}원`, MONTHLY_PASS_LIMITS_KRW[tier] === want.monthlyKRW, `실제=${MONTHLY_PASS_LIMITS_KRW[tier]}`);
  check(`[${tier}] 프로필 ${want.profiles === 0 ? "무제한" : want.profiles + "개"}`, HONEY_PASS_POLICY[tier].maxProfiles === want.profiles, `실제=${HONEY_PASS_POLICY[tier].maxProfiles}`);
  if (want.bandKRW === null) {
    check(`[${tier}] 건당 상한 없음`, PASS_LIMITS[tier] === FAMILY_PASS_MAX_COVERED_COIN, `실제=${PASS_LIMITS[tier]}`);
  } else {
    check(`[${tier}] 건당 적용 가격 범위 ${want.bandKRW}원`, PASS_LIMITS_KRW[tier] === want.bandKRW, `실제=${PASS_LIMITS_KRW[tier]}`);
  }
}

// 상담 포함횟수 제도는 폐지됐다 — 되살아나면 건당 상한 우회가 함께 돌아와 문구와 어긋난다.
check(
  "상담 포함횟수 표는 비어 있어야 한다",
  Object.keys(PREMIUM_QUOTA_INCLUDED_USES_BY_TIER).length === 0,
  `실제 키=${Object.keys(PREMIUM_QUOTA_INCLUDED_USES_BY_TIER).join(",")}`,
);

/* ── ② 실제 판정 함수로 경계를 돌린다 ───────────────────────────────────── */
const futureIso = () => new Date(Date.now() + 20 * 86400000).toISOString();

function coverageAt(tier, priceKRW, { usedKRW = 0 } = {}) {
  const expiresAt = futureIso();
  const entitlement = { isActive: true, passTier: tier, tier, expiresAt };
  const user = {
    profileSubscription: {
      premiumUseCycleKey: expiresAt,
      monthlySpendCoin: Math.floor(usedKRW / KRW_PER_COIN),
    },
  };
  return evaluatePassCoverage({ user, entitlement, coinCost: Math.floor(priceKRW / KRW_PER_COIN) });
}

// 요청 27항의 가격 경계 매트릭스. 각 가격에서 어느 등급이 열려야 하는가.
const PRICE_MATRIX = [
  { priceKRW: 5000, covered: ["standard", "premium", "vvip", "family"] },
  { priceKRW: 5100, covered: ["premium", "vvip", "family"] },
  { priceKRW: 10000, covered: ["premium", "vvip", "family"] },
  { priceKRW: 10100, covered: ["vvip", "family"] },
  { priceKRW: 20000, covered: ["vvip", "family"] },
  { priceKRW: 20100, covered: ["family"] },
  // 초융합 심층 리딩(30,000원) — family 만 커버한다.
  { priceKRW: 30000, covered: ["family"] },
];

for (const row of PRICE_MATRIX) {
  for (const tier of TIERS) {
    const want = row.covered.includes(tier);
    const got = coverageAt(tier, row.priceKRW).covered === true;
    check(
      `[${tier}] ${row.priceKRW.toLocaleString("ko-KR")}원 → ${want ? "커버" : "미커버"}`,
      got === want,
      `실제=${got ? "커버" : "미커버"}`,
    );
  }
}

// 월 이용 한도 경계: 정확히 한도까지 통과, 1코인이라도 넘으면 미커버.
for (const tier of TIERS) {
  const limit = MONTHLY_PASS_LIMITS_KRW[tier];
  // 이 등급이 실제로 커버할 수 있는 가격으로 재야 건당 상한이 결과를 오염시키지 않는다.
  const itemKRW = POLICY[tier].bandKRW === null ? 5000 : POLICY[tier].bandKRW;
  check(
    `[${tier}] 월 한도 ${limit.toLocaleString("ko-KR")}원을 정확히 채우는 마지막 건은 통과`,
    coverageAt(tier, itemKRW, { usedKRW: limit - itemKRW }).covered === true,
  );
  const over = coverageAt(tier, itemKRW, { usedKRW: limit - itemKRW + KRW_PER_COIN });
  check(
    `[${tier}] 월 한도를 넘기는 건은 미커버`,
    over.covered === false && over.reason === "monthly_pass_limit_exceeded",
    `실제=${over.covered}/${over.reason}`,
  );
}

// 중앙 설명자가 같은 답을 내는가 — 판정이 두 벌이 되면 막다른 길이 생긴다.
for (const tier of TIERS) {
  const expiresAt = futureIso();
  const entitlement = { isActive: true, passTier: tier, tier, expiresAt };
  const user = { profileSubscription: { premiumUseCycleKey: expiresAt, monthlySpendCoin: 0 } };
  for (const row of PRICE_MATRIX) {
    const product = { featureKey: "guard-probe", priceCoins: row.priceKRW / KRW_PER_COIN, priceKRW: row.priceKRW };
    const described = describePassEligibility({ user, entitlement, product });
    const direct = evaluatePassCoverage({ user, entitlement, coinCost: product.priceCoins }).covered === true;
    check(
      `[${tier}] describePassEligibility 가 판정 정본과 같은 답(${row.priceKRW}원)`,
      described.eligible === direct,
      `설명자=${described.eligible} 정본=${direct}`,
    );
    // 차감액은 정상 판매가 기준이어야 한다(할인가·PG 실결제액이 아니라 canonical price).
    check(
      `[${tier}] 커버 시 차감액은 정상 판매가(${row.priceKRW}원)`,
      described.eligible ? described.deductKRW === row.priceKRW : described.deductKRW === 0,
      `실제=${described.deductKRW}`,
    );
  }
  const probe = describePassEligibility({
    user, entitlement, product: { featureKey: "guard-probe", priceCoins: 50, priceKRW: 5000 },
  });
  check(`[${tier}] 설명자의 프로필 한도가 정본과 일치`, probe.profileLimit === POLICY[tier].profiles, `실제=${probe.profileLimit}`);
  check(
    `[${tier}] 설명자의 건당 상한 표기`,
    POLICY[tier].bandKRW === null ? probe.perItemLimitKRW === null : probe.perItemLimitKRW === POLICY[tier].bandKRW,
    `실제=${probe.perItemLimitKRW}`,
  );
  check(`[${tier}] 설명자의 월 한도 표기`, probe.monthlyLimitKRW === POLICY[tier].monthlyKRW, `실제=${probe.monthlyLimitKRW}`);
}

// 이용권 제외 상품(프로필 카드 관리)은 어떤 등급으로도 커버되지 않는다.
{
  const expiresAt = futureIso();
  const described = describePassEligibility({
    user: { profileSubscription: { premiumUseCycleKey: expiresAt, monthlySpendCoin: 0 } },
    entitlement: { isActive: true, passTier: "family", tier: "family", expiresAt },
    product: { featureKey: "profile-card-manage", priceCoins: 50, priceKRW: 5000, passExcluded: true },
  });
  check("이용권 제외 상품은 family 로도 미커버", described.eligible === false && described.reason === "pass_excluded", `실제=${described.reason}`);
}

// 이용권 미보유는 어떤 가격도 커버되지 않는다.
check(
  "이용권 미보유는 미커버",
  evaluatePassCoverage({ user: {}, entitlement: null, coinCost: 10 }).covered === false,
);
check("이용권 미보유 프로필 한도는 1개", HONEY_PASS_POLICY.none.maxProfiles === 1);

/* ── ③ 하드코딩 사본 대조 ────────────────────────────────────────────────
   fail-closed: 각 사본에서 4등급을 전부 뽑지 못하면 실패한다. */
function extractAll(label, source, patternFor) {
  const found = {};
  for (const tier of TIERS) {
    const match = source.match(patternFor(tier));
    if (!match) {
      failures.push(`${label}: '${tier}' 값을 찾지 못했다 — 사본이 사라졌거나 모양이 바뀌었다(가드를 함께 고칠 것)`);
      continue;
    }
    found[tier] = match[1] === "null" ? null : Number(match[1]);
  }
  return found;
}

// 사본 1 — 앱 SKU 테이블(모듈이라 직접 읽는다)
const appPasses = listAppPassProducts();
check("앱 이용권 SKU 4개", appPasses.length === 4, `실제=${appPasses.length}`);
for (const pass of appPasses) {
  const webLimit = PASS_LIMITS[pass.passTier];
  const expected = webLimit >= FAMILY_PASS_MAX_COVERED_COIN ? null : webLimit;
  check(`앱 SKU ${pass.productId}: coinLimit`, pass.coinLimit === expected, `실제=${pass.coinLimit} 기대=${expected}`);
  check(`앱 SKU ${pass.productId}: 앱가 = 웹가`, pass.amountKRW === pass.webAmountKRW, `앱=${pass.amountKRW} 웹=${pass.webAmountKRW}`);
  check(`앱 SKU ${pass.productId}: 웹가 정본 일치`, pass.webAmountKRW === PASS_MONTHLY_WON[pass.passTier]);
}

// 사본 2 — 클라이언트 스냅샷 판정기
const verdict = read("js/core/pass-verdict.js");
const verdictLimits = extractAll("js/core/pass-verdict.js PASS_LIMIT_BY_TIER", verdict, (tier) =>
  new RegExp(`PASS_LIMIT_BY_TIER\\s*=\\s*\\{[^}]*?\\b${tier}\\s*:\\s*(\\d+)`));
const verdictMonthly = extractAll("js/core/pass-verdict.js MONTHLY_PASS_LIMIT_BY_TIER", verdict, (tier) =>
  new RegExp(`MONTHLY_PASS_LIMIT_BY_TIER\\s*=\\s*\\{[^}]*?\\b${tier}\\s*:\\s*(\\d+)`));
for (const tier of TIERS) {
  if (verdictLimits[tier] !== undefined) {
    check(`pass-verdict PASS_LIMIT_BY_TIER[${tier}]`, verdictLimits[tier] === PASS_LIMITS[tier], `실제=${verdictLimits[tier]} 정본=${PASS_LIMITS[tier]}`);
  }
  if (verdictMonthly[tier] !== undefined) {
    check(`pass-verdict MONTHLY_PASS_LIMIT_BY_TIER[${tier}]`, verdictMonthly[tier] === MONTHLY_PASS_LIMITS[tier], `실제=${verdictMonthly[tier]} 정본=${MONTHLY_PASS_LIMITS[tier]}`);
  }
}

// 사본 3 — 정적 셸 goldenPackages (public/** 미러는 sync:public 산출물이라 원본만 본다)
const shell = read("index.html");
const goldenFor = (tier, field) => new RegExp(`id:\\s*'${tier}'[^}]*?${field}:\\s*(\\d+|null)`);
const goldenFree = extractAll("index.html goldenPackages freeLimit", shell, (tier) => goldenFor(tier, "freeLimit"));
const goldenMonthly = extractAll("index.html goldenPackages monthlyLimit", shell, (tier) => goldenFor(tier, "monthlyLimit"));
const goldenProfile = extractAll("index.html goldenPackages profileLimit", shell, (tier) => goldenFor(tier, "profileLimit"));
const goldenPrice = extractAll("index.html goldenPackages price", shell, (tier) => goldenFor(tier, "price"));
for (const tier of TIERS) {
  if (goldenFree[tier] !== undefined) check(`셸 goldenPackages[${tier}].freeLimit`, goldenFree[tier] === PASS_LIMITS[tier], `실제=${goldenFree[tier]} 정본=${PASS_LIMITS[tier]}`);
  if (goldenMonthly[tier] !== undefined) check(`셸 goldenPackages[${tier}].monthlyLimit`, goldenMonthly[tier] === MONTHLY_PASS_LIMITS[tier], `실제=${goldenMonthly[tier]}`);
  if (goldenPrice[tier] !== undefined) check(`셸 goldenPackages[${tier}].price`, goldenPrice[tier] === PASS_MONTHLY_WON[tier], `실제=${goldenPrice[tier]}`);
  if (goldenProfile[tier] !== undefined) {
    const want = HONEY_PASS_POLICY[tier].maxProfiles === 0 ? null : HONEY_PASS_POLICY[tier].maxProfiles;
    check(`셸 goldenPackages[${tier}].profileLimit`, goldenProfile[tier] === want, `실제=${goldenProfile[tier]} 정본=${want}`);
  }
}

// 사본 3-b — 셸에 남아 있던 낡은 등급 한도표(vvip 100 / premium 50 / standard 30) 0건.
// 2026-09-03 까지 4곳이 살아 있었고 전부 pass-verdict.passLimitForTier 위임으로 바뀌었다.
// 이 삼항 사다리가 하나라도 돌아오면 정본(200/100/50)과 다른 값이 결제창에 나간다.
const staleShellLadder = shell.match(/===\s*'vvip'\s*\?\s*\d+\s*:\s*\([^)]*===\s*'premium'\s*\?\s*\d+\s*:/g) || [];
check("셸 낡은 등급 한도 삼항표(vvip/premium/standard 리터럴) 0건", staleShellLadder.length === 0,
  `발견=${staleShellLadder.length} — passLimitForTier 로 위임할 것`);

// 사본 4 — 셸의 이용권 미니 배지가 쓰는 freeLimits
const miniLimits = extractAll("index.html freeLimits(미니 배지)", shell, (tier) =>
  new RegExp(`var freeLimits\\s*=\\s*\\{[^}]*?\\b${tier}\\s*:\\s*(\\d+)`));
for (const tier of TIERS) {
  if (miniLimits[tier] !== undefined) check(`셸 freeLimits[${tier}]`, miniLimits[tier] === PASS_LIMITS[tier], `실제=${miniLimits[tier]} 정본=${PASS_LIMITS[tier]}`);
}

// 사본 5 — /points 플랜 데이터
const points = read("app/points/PointsClient.tsx");
const pointsFreeUpTo = extractAll("app/points/PointsClient.tsx freeUpTo", points, (tier) =>
  new RegExp(`tier:\\s*"${tier}"[\\s\\S]{0,400}?freeUpTo:\\s*(\\d+|null)`));
const pointsProfile = extractAll("app/points/PointsClient.tsx profileLimit", points, (tier) =>
  new RegExp(`tier:\\s*"${tier}"[\\s\\S]{0,400}?profileLimit:\\s*(\\d+|null)`));
for (const tier of TIERS) {
  if (pointsFreeUpTo[tier] !== undefined) {
    const want = PASS_LIMITS[tier] >= FAMILY_PASS_MAX_COVERED_COIN ? null : PASS_LIMITS[tier];
    check(`/points freeUpTo[${tier}]`, pointsFreeUpTo[tier] === want, `실제=${pointsFreeUpTo[tier]} 정본=${want}`);
  }
  if (pointsProfile[tier] !== undefined) {
    const want = HONEY_PASS_POLICY[tier].maxProfiles === 0 ? null : HONEY_PASS_POLICY[tier].maxProfiles;
    check(`/points profileLimit[${tier}]`, pointsProfile[tier] === want, `실제=${pointsProfile[tier]} 정본=${want}`);
  }
}

/* ── ④ 문구: "한도 없음"을 뜻하는 표현 금지 ──────────────────────────────
   대상은 **사용자에게 보이는 문자열**뿐이다. 주석까지 잡으면 "왜 금지인지"를 설명한
   주석이 스스로 가드를 깨는 우스운 상황이 된다. 그래서 검사 범위를 등급 카드 문구로 좁힌다.
   '프로필 무제한'은 실제로 무제한이라 허용 — 금지 대상은 **금액/횟수** 무제한이다. */
const BANNED = [
  { re: /기능\s*무제한/, why: "'기능 무제한' — 모든 등급에 월 이용 한도가 있다" },
  { re: /콘텐츠\s*무제한/, why: "'콘텐츠 무제한' — 모든 등급에 월 이용 한도가 있다" },
  { re: /횟수\s*제한\s*없/, why: "'횟수 제한 없음' — 월 이용 한도가 곧 횟수 제한이다" },
  { re: /월\s*누적/, why: "'월 누적' — 표현은 '월 이용 한도' 또는 '월 최대 N원 상당'" },
  { re: /마음껏/, why: "'마음껏' — 한도가 없다는 인상을 준다" },
  { re: /Unlimited use/i, why: "'Unlimited use' — 월 이용 한도와 모순" },
];

// 셸 등급 카드 문구
const goldenDescs = [...shell.matchAll(/desc:\s*'([^']*)'/g)].map((m) => m[1])
  .filter((text) => /30일 ·/.test(text));
check("셸 goldenPackages desc 4개를 찾았다", goldenDescs.length === 4, `실제=${goldenDescs.length}`);

// /points 등급 카드 문구 (planFeatures 값 + 요약 줄)
const pointsCopy = [...points.matchAll(/^\s*(?:under\d+|over\d+Single|monthlyCap|allPaidPdf|allPaidPdfPolicy|profileUnlimited|pdfSingle|activeImmediately|notAutoBilling)\s*:\s*"([^"]*)"/gm)]
  .map((m) => m[1]);
check("/points 등급 카드 문구를 찾았다", pointsCopy.length >= 8, `실제=${pointsCopy.length}`);

for (const [label, texts] of [["셸 이용권 카드", goldenDescs], ["/points 이용권 카드", pointsCopy]]) {
  for (const text of texts) {
    for (const banned of BANNED) {
      check(`${label} 문구: ${banned.why}`, !banned.re.test(text), `문구="${text}"`);
    }
  }
}

/* ── ⑤ 12개 로케일 사전의 등급 카드 요약 문구 ────────────────────────────
   ④는 한국어 원문(셸·/points)만 봤다. 비-ko 화면은 사전의
   payment.passShop.packages.<tier>.desc 를 렌더링하므로, ④가 초록불인 채로
   11개 로케일이 "KRW 30,000 이하 무제한 · 상담 10회"를 계속 서빙했다(2026-08-24 실측).

   금지어 목록을 12개 언어로 다시 쓰는 대신, **같은 사전 안의 조각과 대조**한다 —
   home.passMini.<tier>Line(가격대) · Benefit1(월 한도) · Benefit2(프로필). 이 세 조각은
   ②③이 지키는 숫자에서 나온 문구이고 로케일마다 이미 번역돼 있다. desc 가 그 조합이
   아니게 되는 순간(무제한이 끼어들든, 밴드가 낡든) 실패한다.

   fail-closed: 사전 파일을 손으로 열거하지 않고 디렉터리에서 전수 발견하며,
   조각이나 desc 가 없으면 통과가 아니라 실패다. */
const I18N_DIR = path.join(ROOT, "public", "i18n");
const localeFiles = readdirSync(I18N_DIR).filter((name) => name.endsWith(".json")).sort();
check("로케일 사전을 찾았다", localeFiles.length >= 12, `실제=${localeFiles.length}개`);

const dictValue = (dict, dotted) => dotted.split(".").reduce((node, key) => (node == null ? node : node[key]), dict);

for (const file of localeFiles) {
  const locale = file.replace(/\.json$/, "");
  const dict = JSON.parse(readFileSync(path.join(I18N_DIR, file), "utf8"));
  for (const tier of TIERS) {
    const desc = dictValue(dict, `payment.passShop.packages.${tier}.desc`);
    const fragments = ["Line", "Benefit1", "Benefit2"].map((suffix) => dictValue(dict, `home.passMini.${tier}${suffix}`));
    if (typeof desc !== "string" || !desc.trim()) {
      failures.push(`[${locale}] payment.passShop.packages.${tier}.desc 가 없다 — 사전이 이 등급 카드를 번역하지 못한다`);
      continue;
    }
    if (fragments.some((fragment) => typeof fragment !== "string" || !fragment.trim())) {
      failures.push(`[${locale}] home.passMini.${tier}{Line,Benefit1,Benefit2} 조각이 비어 있다 — desc 를 대조할 기준이 없다`);
      continue;
    }
    const segments = desc.split(" · ").map((part) => part.trim());
    check(
      `[${locale}] ${tier} 카드는 '기간 · 가격대 · 월 한도 · 프로필' 4토막`,
      segments.length === 4,
      `실제 ${segments.length}토막 문구="${desc}"`,
    );
    check(
      `[${locale}] ${tier} 카드 문구가 사전 조각과 일치`,
      segments.slice(1).join(" · ") === fragments.join(" · "),
      `문구="${desc}" 기대="… · ${fragments.join(" · ")}"`
      + ` / desc 와 home.passMini.${tier}{Line,Benefit1,Benefit2} 는 같은 정책 한 줄이라 함께 고쳐야 한다`
      + " (문안을 바꿀 때는 i18n/authored/passShopPackages-01.json 을 고치고 i18n-merge-authored.mjs --core 로 다시 병합)",
    );
  }
}

if (failures.length) {
  console.error(`\n[실패] 이용권 등급 정책 검증 ${failures.length}건`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log(
  "[통과] 이용권 등급 정책 검증 — 4등급 절대값 · 가격 경계 7종 × 4등급 · 월 한도 경계 ·"
  + ` 중앙 설명자 정합 · 하드코딩 사본 5곳 · 문구 금지 표현 · 로케일 사전 ${localeFiles.length}개 × 4등급 카드 문구\n`,
);
