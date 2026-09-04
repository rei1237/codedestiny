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
 *   ⑥ 월 한도 소진 임계값이 레지스트리 최저가에서 파생됐는가(2026-09-04 조기 종료 정책)
 *   ⑦ 소진 경계와 종료 필드 — 만료일을 당기는 것만으로 활성 판정이 뒤집히는가
 *   ⑧ 사전이 "다음 달에 리셋된다"는 거짓 문구를 서빙하지 않는가
 *
 * fail-closed 설계: 사본에서 4등급을 **전부** 뽑아내지 못하면 통과가 아니라 실패다.
 * 정규식이 리팩터링에 빗나가면 "검사 대상이 없어서 통과"가 되는 게 이 종류 가드의 전형적인
 * 사고인데, 그때 조용히 초록불이 되면 안 된다.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildPassTerminationFields,
  FAMILY_PASS_MAX_COVERED_COIN,
  HONEY_PASS_POLICY,
  isPassBudgetExhausted,
  KRW_PER_COIN,
  MIN_PASS_COVERABLE_COIN,
  MONTHLY_PASS_LIMITS,
  MONTHLY_PASS_LIMITS_KRW,
  normalizeHoneyPassEntitlement,
  PASS_LIMITS,
  PASS_LIMITS_KRW,
  PREMIUM_QUOTA_INCLUDED_USES_BY_TIER,
} from "../worker/lib/profile-limits.js";
import { evaluatePassCoverage, describePassEligibility } from "../worker/payments/passes.js";
import { listAppPassProducts } from "../worker/lib/app-store-pricing.js";
import { listProducts } from "../worker/payments/catalog.js";
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


/* ── ⑥ 월 한도 소진 임계값이 레지스트리 최저가에서 파생됐는가 ────────────
   2026-09-04 부터 이용권은 30일 만료와 월 한도 소진 중 **먼저 오는 쪽**에서 끝난다.
   소진 판정은 "잔여로 열 수 있는 유료 항목이 하나도 없을 때"이므로 임계는 레지스트리의
   최저가여야 한다. 더 싼 상품이 생겼는데 상수가 그대로면 아직 열 수 있는 이용권을 끄고
   (환불 분쟁), 최저가가 올랐는데 그대로면 아무것도 못 여는 이용권이 남는다(원래 문제).

   fail-closed: 커버 대상을 하나도 못 뽑으면 통과가 아니라 실패다. */
const coverablePrices = listProducts()
  .filter((product) => product.passExcluded !== true && Number(product.priceCoins) > 0)
  .map((product) => Number(product.priceCoins));
check("이용권 커버 대상 상품을 레지스트리에서 뽑았다", coverablePrices.length >= 50, `실제=${coverablePrices.length}개`);
if (coverablePrices.length) {
  const registryMin = Math.min(...coverablePrices);
  check(
    `MIN_PASS_COVERABLE_COIN 이 레지스트리 최저가 ${registryMin}코인과 같다`,
    MIN_PASS_COVERABLE_COIN === registryMin,
    `상수=${MIN_PASS_COVERABLE_COIN} — 더 싼 상품이 생겼거나 최저가가 올랐다.`
    + " worker/lib/profile-limits.js 의 상수를 실측에 맞추고, 문구의 '3,000원' 표기도 함께 본다",
  );
}

/* ── ⑦ 소진 경계와 종료 필드 ─────────────────────────────────────────────
   임계는 등급별 건당 상한과 최저가 중 작은 쪽이다(건당 상한이 최저가보다 낮은 등급이
   생기면 그 등급은 잔여가 상한 미만일 때 이미 아무것도 못 연다). */
for (const tier of TIERS) {
  const budget = MONTHLY_PASS_LIMITS[tier];
  const threshold = Math.max(1, Math.min(MIN_PASS_COVERABLE_COIN, PASS_LIMITS[tier] || MIN_PASS_COVERABLE_COIN));
  check(`[${tier}] 안 쓴 이용권은 종료하지 않는다`, isPassBudgetExhausted(tier, 0) === false);
  check(
    `[${tier}] 잔여가 최저가와 같으면 아직 열 수 있다`,
    isPassBudgetExhausted(tier, budget - threshold) === false,
    `예산=${budget} 사용=${budget - threshold} 잔여=${threshold}코인`,
  );
  check(
    `[${tier}] 잔여가 최저가 미만이면 종료한다`,
    isPassBudgetExhausted(tier, budget - threshold + 1) === true,
    `예산=${budget} 사용=${budget - threshold + 1} 잔여=${threshold - 1}코인`,
  );
  check(`[${tier}] 예산을 다 쓰면 종료한다`, isPassBudgetExhausted(tier, budget) === true);
}

/* 종료는 만료일을 당기는 것 하나로 끝난다 — 새 "소진 플래그"를 만들어 곳곳에서 검사하면
   원칙 6(중첩 사전검사) 위반이자 드리프트 원인이다. 그 전제가 실제로 성립하는지,
   즉 종료 필드만으로 활성 판정이 뒤집히는지를 판정 함수를 돌려 확인한다. */
{
  const now = new Date();
  const before = new Date(now.getTime() + 10 * 86400000);
  const activeSub = { tier: "vvip", passTier: "vvip", status: "active", expiresAt: before };
  const active = normalizeHoneyPassEntitlement({ profileSubscription: activeSub });
  check("종료 전 이용권은 활성이다", active.isActive === true, `실제=${JSON.stringify(active.isActive)}`);

  const fields = buildPassTerminationFields({ now, previousExpiresAt: before });
  check("종료 필드는 만료일을 now 로 당긴다", fields.expiresAt.getTime() === now.getTime(), `실제=${fields.expiresAt?.toISOString?.()}`);
  check("종료 필드는 등급을 free 로 내린다", fields.tier === "free" && fields.passTier === "" && fields.passLimit === 0, JSON.stringify(fields));
  check(
    "종료 필드는 원래 만료일을 증거로 남긴다",
    fields.passExhaustedFromExpiresAt instanceof Date && fields.passExhaustedFromExpiresAt.getTime() === before.getTime(),
    "CS·환불 문의에서 '왜 일찍 끝났나'의 유일한 증거다",
  );

  const terminated = normalizeHoneyPassEntitlement({ profileSubscription: { ...activeSub, ...fields } });
  check(
    "종료 필드를 적용하면 활성 판정이 뒤집힌다",
    terminated.isActive !== true,
    `실제=${JSON.stringify(terminated.isActive)} — 만료일을 당겨도 활성이면 조기 종료가 통째로 무력화된다`,
  );
}

/* ── ⑧ 사전이 "다음 달에 리셋된다"고 말하지 않는가 ───────────────────────
   한도 사이클 키가 이용권 자신의 만료일이라(profile-limits.js resolvePremiumQuotaCycleKey)
   기간 안에서 리셋되는 일이 **구조적으로 없다**. 2026-09-04 이전에는 12개 로케일이 모두
   "다음 달에 다시 열립니다"를 서빙했고, 그 문구를 믿고 기다린 사용자는 만료일까지 아무것도
   열지 못했다. 조기 종료 정책이 들어온 지금은 더 명확한 거짓이다.

   대상은 사전 JSON 의 값뿐이다 — 주석까지 잡으면 금지 이유를 적은 주석이 스스로 가드를
   깬다(④와 같은 이유). 코드 안의 한국어 폴백은 verify:payment-copy-dictionary ② 가
   ko.json 값과의 동일성을 이미 강제하므로 여기서 다시 훑지 않는다.

   fail-closed: 디렉터리에서 사전을 전수 발견하고, 훑은 문자열이 바닥 아래면 실패한다. */
const RESET_COPY = [
  { re: /다음\s*달에\s*다시\s*열/, why: "'다음 달에 다시 열림' — 이용권 기간 안에서 한도가 리셋되는 일은 없다" },
  { re: /resets?\s+next\s+month/i, why: "'resets next month' — 같은 이유" },
  { re: /이번\s*달\s*이용권\s*한도/, why: "'이번 달 이용권 한도' — 달이 아니라 이용권 한 벌의 총예산이다" },
  { re: /이번\s*달\s*남은\s*한도/, why: "'이번 달 남은 한도' — 같은 이유" },
  { re: /남은\s*이용권\s*기간\s*동안/, why: "'남은 이용권 기간 동안' — 한도를 다 쓰면 그 기간 자체가 사라진다" },
];

let scannedStrings = 0;
const resetHits = [];
function scanDictValue(node, file, keyPath) {
  if (typeof node === "string") {
    scannedStrings += 1;
    for (const banned of RESET_COPY) {
      if (banned.re.test(node)) resetHits.push(`${file} ${keyPath} — ${banned.why} / 문구="${node.slice(0, 90)}"`);
    }
    return;
  }
  if (!node || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("_")) continue; // 저작 파일의 _comment 는 사용자에게 안 보인다
    scanDictValue(value, file, keyPath ? `${keyPath}.${key}` : key);
  }
}
function scanDictDir(dir) {
  if (!existsSync(dir)) return; // 없는 디렉터리는 아래 바닥 검사가 실패로 잡는다(여기서 던지면 사유가 안 보인다).
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) scanDictDir(full);
    else if (entry.name.endsWith(".json")) scanDictValue(JSON.parse(readFileSync(full, "utf8")), path.relative(ROOT, full), "");
  }
}
for (const [rel, floor] of [[path.join("public", "i18n"), 200000], [path.join("i18n", "authored"), 70000]]) {
  const before = scannedStrings;
  scanDictDir(path.join(ROOT, rel));
  check(
    `${rel} 사전 문자열을 훑었다`,
    scannedStrings - before >= floor,
    `실제=${scannedStrings - before}개(바닥 ${floor}) — 사전 위치가 바뀌었는지 볼 것`,
  );
}
for (const hit of resetHits) failures.push(`리셋 문구: ${hit}`);

if (failures.length) {
  console.error(`\n[실패] 이용권 등급 정책 검증 ${failures.length}건`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log(
  "[통과] 이용권 등급 정책 검증 — 4등급 절대값 · 가격 경계 7종 × 4등급 · 월 한도 경계 ·"
  + ` 중앙 설명자 정합 · 하드코딩 사본 5곳 · 문구 금지 표현 · 로케일 사전 ${localeFiles.length}개 × 4등급 카드 문구 ·`
  + ` 소진 임계 ${MIN_PASS_COVERABLE_COIN}코인(레지스트리 최저가) · 소진 경계 4등급 × 4케이스 · 종료 필드 왕복 · 사전 2곳 ${scannedStrings}문자열 리셋 문구 0건\n`,
);
