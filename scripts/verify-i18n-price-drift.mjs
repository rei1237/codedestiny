// 사전 12벌에 **문자열로 구워진 금액**이 서로, 그리고 정본과 어긋나지 않는지 본다.
//
// 왜 필요한가:
//   홈 셸의 가격 문구는 정적 마크업이다 — `data-cd-trans="home.tiles.price10000"` 처럼 키를
//   달고, 실제 문구는 `public/i18n/*.json` 12벌에 금액까지 통째로 들어 있다. 런타임에 금액을
//   꽂아 넣는 통로는 **없다**(2026-08-28 실측: 유일한 후보 `_applyRegistryPricingToTiles` 는
//   `cd:feature-pricing-loaded` 가 어디서도 발화되지 않아 도달 불가였다).
//
//   그래서 가격이 바뀌면 사람이 12벌을 손으로 고쳐야 하는데, **개발도 리뷰도 한국어로 하므로
//   한국어만 고치고 나머지 11벌이 옛 금액으로 남아도 아무 증상이 없다.** 화면은 멀쩡히 뜨고
//   테스트도 통과한다. 해외 사용자만 옛 가격을 본다.
//
// 무엇을 강제하는가:
//   ① 한 키의 금액 집합이 로케일마다 같다 (ko 의 "3만원"·"5천원" 표기는 숫자로 정규화)
//   ② 금액을 담은 키는 12로케일 **전부**에 금액이 있다 (한 벌에서 금액만 빠지는 것도 드리프트)
//   ③ 셸 마크업(`data-cd-trans`)의 한국어 금액이 사전 12벌의 금액과 같다
//      — 셸 리터럴은 `__tests__/worker/payments.subscription-purchase.test.js` 가
//        `lib/payment/pass-pricing.js` 의 `PASS_MONTHLY_WON` 과 대조한다. 이 사슬로
//        사전이 코드 정본에 묶인다. 사전만 따로 검사하면 묶을 곳이 없다.
//   ④ `PASS_MONTHLY_WON` 네 값이 사전 금액 전수 집합에 전부 나타난다
//      — 레지스트리에서 이용권 가격을 바꾸고 사전을 안 고치면 새 값이 사전에 없어 여기서 걸린다
//   ⑤ 이 검사기가 읽는 파일이 전부 paid-flow-gates 트리거 경로에 있다
//
// 🔴 fail-closed: 사전이 12벌 미만이거나, 금액 보유 키가 바닥 아래거나, **비-ko 로케일 한 벌만
//    바닥 아래여도** 실패한다. 통화 표기가 바뀌거나 정규식이 깨져 "검사 대상 0개" 가 되면
//    조용히 통과하는 것이 이 가드의 유일한 실패 모드다. 로케일별 바닥을 따로 두는 이유는
//    합집합 바닥만으로는 한 벌을 통째로 비워도 나머지 11벌이 수를 채워 통과하기 때문이다.
//
// 범위: 루트 정본만 본다. 미러(public/**/index.html)는 `verify:public-parity` 가 원본과의
//    동일성을 따로 강제한다.
//
// 실행: npm run verify:i18n-price-drift
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { gateCovers as gateCoversAny, readGatePatterns } from "./lib/gate-trigger-coverage.mjs";
import { PASS_MONTHLY_WON } from "../lib/payment/pass-pricing.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (rel) => readFileSync(resolve(root, rel), "utf8");

const SHELL = "index.html";
const I18N_DIR = "public/i18n";

// 3자리 구분자는 로케일마다 다르다: en/ja/zh `,` · de/nl/vi/es `.` · fr 좁은 nbsp·공백.
// es 는 구분자 없이 "3000" 으로 쓰는 자리도 있어 4자리 이상 맨숫자도 받는다.
const SEP = "[.,\\u00a0\\u202f\\u2009 ]";
const NUM = `\\d{1,3}(?:${SEP}\\d{3})+|\\d{4,}`;
// 원화 단위: ko `원` · en `KRW/won/₩` · ja `ウォン` · zh `韩元/韓元` · hi `वॉन`
const UNIT = "원|KRW|won|₩|ウォン|韩元|韓元|वॉन";
const MONEY = new RegExp(`(?:${NUM})\\s*(?:${UNIT})|(?:${UNIT})\\s*(?:${NUM})`, "i");
const NUM_G = new RegExp(NUM, "g");

// 🔴 승인·정산 통화는 KRW 하나뿐이다(KG이니시스 해외카드 특약 — 화면 금액 ≠ 승인 금액은
//    PG 심사 탈락 사유다). 화면의 외화는 언제나 런타임이 그리는 참고 개산가이며
//    (js/core/checkout-entry.js `formatReferenceAmount`), 사전에 굽는 것이 아니다.
//    2026-08-28 실측: vi.json 이 `30.000đ`(동) 13건 + `20.000 VNĐ` 1건이었다 — 30,000원을
//    약 1,600원이라고 말하고 있었다. 그래서 "금액이 없다" 판정에 이 진단을 붙인다.
const FOREIGN_MONEY = /\d(?:[.,    ]?\d)*\s?(?:VNĐ|VND|đ|₫|€|£|₹|RM|Rp|円|元)|(?:US\$|NT\$|\$|€|£|₹|¥)\s?\d/i;

/** ko 전용 표기 "3만원"·"5천원급"·"1만원대" 를 숫자로 편다. 나머지 11벌은 전부 숫자 표기다. */
function expandKoreanUnits(text) {
  return text
    .replace(/(\d+)\s*만\s*(?=원)/g, (_, n) => String(Number(n) * 10000))
    .replace(/(\d+)\s*천\s*(?=원)/g, (_, n) => String(Number(n) * 1000));
}

/** 문자열에서 원화 금액만 뽑아 정렬된 배열로 준다. 금액이 없으면 null. */
function amountsIn(rawText) {
  const text = expandKoreanUnits(String(rawText));
  if (!MONEY.test(text)) return null;
  const found = (text.match(NUM_G) || [])
    .map((n) => Number(n.replace(new RegExp(SEP, "g"), "")))
    .filter((n) => Number.isFinite(n) && n >= 1000)
    .sort((a, b) => a - b);
  return found.length ? found : null;
}

const localeFiles = readdirSync(resolve(root, I18N_DIR)).filter((name) => name.endsWith(".json"));
assert.ok(
  localeFiles.length >= 12,
  `${I18N_DIR}: 사전이 ${localeFiles.length}벌 — 12벌 미만이면 로케일 간 대조가 성립하지 않습니다.`,
);
const locales = localeFiles.map((name) => name.replace(/\.json$/, ""));

// ── 1) 사전 12벌에서 금액을 담은 키를 전부 발견한다 ──────────────────────────────
// 🔴 "키가 없다" 와 "키는 있는데 금액이 빠졌다" 를 구분해서 담는다. ko.json 은 의도적으로
//    불완전하다 — cdTranslate 는 lang==='ko' 일 때 사전을 건너뛰고 코드 폴백을 쓰므로
//    (js/cd-lang-native.js) ko 에 없는 키는 드리프트가 아니다. 반대로 **키는 있는데 그 벌에서만
//    금액이 사라진 것**은 드리프트다.
/** @type {Map<string, Map<string, { amounts: number[] | null, text: string }>>} */
const byKey = new Map();
/** @type {Map<string, Map<string, string>>} 키가 문자열로 존재하는 로케일 -> 그 원문 */
const presentIn = new Map();
const textOf = (locale, key) => presentIn.get(key)?.get(locale);
for (const locale of locales) {
  const data = JSON.parse(read(`${I18N_DIR}/${locale}.json`));
  const walk = (node, prefix) => {
    for (const segment of Object.keys(node)) {
      const value = node[segment];
      const key = prefix ? `${prefix}.${segment}` : segment;
      if (typeof value === "string") {
        if (!presentIn.has(key)) presentIn.set(key, new Map());
        presentIn.get(key).set(locale, value);
        const amounts = amountsIn(value);
        if (!amounts) continue;
        if (!byKey.has(key)) byKey.set(key, new Map());
        byKey.get(key).set(locale, { amounts, text: value });
      } else if (value && typeof value === "object") walk(value, key);
    }
  };
  walk(data, "");
}

// 2026-08-28 실측 110. 통화 표기가 바뀌거나 정규식이 깨지면 여기서 걸린다.
const MINIMUM_PRICE_KEYS = 100;
assert.ok(
  byKey.size >= MINIMUM_PRICE_KEYS,
  `금액을 담은 사전 키가 ${byKey.size}개 — 최소 ${MINIMUM_PRICE_KEYS}개여야 합니다. `
    + "통화 단위 표기가 바뀌었거나 금액 추출 정규식이 깨졌습니다(검사 대상 0개는 통과가 아닙니다).",
);

// 🔴 위 바닥은 **로케일 합집합**이라 한 벌이 통째로 비어도 통과한다. 로케일별로도 바닥을 둔다
//    — 그러지 않으면 en.json 에서 가격 네임스페이스를 지운 PR 이 조용히 초록으로 지나간다.
//    ko 는 제외한다: cdTranslate 가 ko 에서 사전을 건너뛰므로 ko.json 은 의도적으로 부분집합이다.
const perLocaleCount = Object.fromEntries(
  locales.map((locale) => [locale, [...byKey.values()].filter((m) => m.has(locale)).length]),
);
const MINIMUM_PER_LOCALE = 85; // 2026-08-28 실측: 비-ko 11벌 모두 110 (ko 는 제외 대상)
for (const locale of locales) {
  if (locale === "ko") continue;
  assert.ok(
    perLocaleCount[locale] >= MINIMUM_PER_LOCALE,
    `${I18N_DIR}/${locale}.json: 금액을 담은 키가 ${perLocaleCount[locale]}개 — 최소 ${MINIMUM_PER_LOCALE}개여야 합니다. `
      + `이 로케일에서 가격 문구가 통째로 사라졌습니다(다른 벌 기준 ${byKey.size}개).`,
  );
}

// 위반을 한 건씩 던지지 않고 모아서 한 번에 낸다 — 고치는 쪽은 12벌을 함께 손봐야 하므로
// "고치고 다시 돌리면 다음 한 건" 은 이 가드에서 특히 비싸다.
/** @type {string[]} */
const failures = [];

// ── 2) ① 로케일 간 금액 일치 · ② 12로케일 전부 보유 ──────────────────────────────
const sig = (amounts) => amounts.join("/");
for (const [key, perLocale] of byKey) {
  // 키가 있는데 금액만 사라진 로케일 (키 자체가 없는 로케일은 드리프트가 아니다 — 위 주석)
  const missing = [...(presentIn.get(key)?.keys() || [])].filter((locale) => !perLocale.has(locale)).sort();
  if (missing.length) {
    failures.push(
      `${key}: ${missing.join(",")} 는 이 키를 갖고 있는데 원화 금액이 없습니다 — 다른 로케일은 금액을 말합니다.\n`
        + `  기준(${[...perLocale.keys()][0]}): ${JSON.stringify([...perLocale.values()][0].text)}\n`
        + missing
          .map((locale) => {
            const text = textOf(locale, key);
            const foreign = FOREIGN_MONEY.test(String(text));
            return `  ${locale}: ${JSON.stringify(text)}`
              + (foreign ? "  🔴 다른 통화로 적혀 있습니다 — 승인은 KRW 하나뿐이라 화면 금액도 KRW 여야 합니다" : "");
          })
          .join("\n"),
    );
    continue;
  }

  const groups = new Map();
  for (const [locale, { amounts }] of perLocale) {
    const id = sig(amounts);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(locale);
  }
  if (groups.size > 1) {
    failures.push(
      `${key}: 로케일마다 금액이 다릅니다 — 가격을 고치면서 일부 사전만 갱신한 흔적입니다.\n`
        + [...groups.entries()]
          .map(([id, locs]) => `  [${id}] ${locs.join(",")}  예: ${JSON.stringify(perLocale.get(locs[0]).text)}`)
          .join("\n"),
    );
  }
}

// ── 3) ③ 셸 마크업의 금액 == 사전의 금액 ────────────────────────────────────────
// 셸 리터럴은 payments.subscription-purchase.test.js 가 PASS_MONTHLY_WON 과 대조하므로,
// 이 대조가 사전을 코드 정본까지 이어 준다.
const shell = read(SHELL);
const MARKUP = /data-cd-trans="([A-Za-z0-9_.]+)"[^>]*>([^<]*)</g;
let comparedWithShell = 0;
for (const match of shell.matchAll(MARKUP)) {
  const [, key, markupText] = match;
  const markupAmounts = amountsIn(markupText);
  if (!markupAmounts) continue;
  const perLocale = byKey.get(key);
  if (!perLocale) {
    failures.push(
      `${key}: 셸 마크업은 금액 ${sig(markupAmounts)} 을 말하는데 사전 어디에도 금액이 없습니다 `
        + `— 비한국어 화면에서 가격이 사라집니다.\n  마크업: ${JSON.stringify(markupText)}`,
    );
    continue;
  }
  const dictAmounts = [...perLocale.values()][0].amounts;
  if (sig(markupAmounts) !== sig(dictAmounts)) {
    failures.push(
      `${key}: 셸 마크업과 사전의 금액이 다릅니다 — 한국어 마크업만 고치고 사전 12벌을 두고 온 형태입니다.\n`
        + `  마크업(index.html): ${JSON.stringify(markupText)}  -> ${sig(markupAmounts)}\n`
        + `  사전(${[...perLocale.keys()][0]}): ${JSON.stringify([...perLocale.values()][0].text)}  -> ${sig(dictAmounts)}`,
    );
  }
  comparedWithShell += 1;
}
const MINIMUM_SHELL_COMPARED = 20; // 2026-08-28 실측 23
assert.ok(
  comparedWithShell >= MINIMUM_SHELL_COMPARED,
  `셸 마크업과 대조한 키가 ${comparedWithShell}개 — 최소 ${MINIMUM_SHELL_COMPARED}개여야 합니다. `
    + "data-cd-trans 마크업 추출 정규식이 깨졌습니다.",
);

// ── 4) ④ 이용권 가격 정본이 사전에 실제로 나타나는지 ─────────────────────────────
const allAmounts = new Set();
for (const perLocale of byKey.values()) {
  for (const amount of [...perLocale.values()][0].amounts) allAmounts.add(amount);
}
for (const [tier, won] of Object.entries(PASS_MONTHLY_WON)) {
  if (!allAmounts.has(won)) {
    failures.push(
      `이용권 ${tier} 가격 ${won.toLocaleString("ko-KR")}원(lib/payment/pass-pricing.js)이 사전 어디에도 없습니다 `
        + "— 정본만 바꾸고 public/i18n 12벌을 두고 왔습니다.",
    );
  }
}

assert.equal(
  failures.length,
  0,
  `가격 드리프트 ${failures.length}건:\n\n${failures.join("\n\n")}\n`,
);

// ── 5) ⑤ 게이트 트리거 커버리지 ────────────────────────────────────────────────
const GATE_WORKFLOW = ".github/workflows/paid-flow-gates.yml";
const gatePatterns = readGatePatterns(resolve(root, GATE_WORKFLOW));
const gateCovers = (rel) => gateCoversAny(gatePatterns, rel);
const READ_PATHS = [SHELL, "lib/payment/pass-pricing.js", ...locales.map((l) => `${I18N_DIR}/${l}.json`)];
for (const rel of READ_PATHS) {
  assert.ok(
    gateCovers(rel),
    `${GATE_WORKFLOW}: 트리거 경로에 ${rel} 이(가) 없습니다 — 이 파일만 바뀐 PR 에서는 가격 드리프트 검증이 아예 돌지 않습니다. paths 에 추가하세요.`,
  );
}

console.log(
  `[verify-i18n-price-drift] PASS `
    + `(${byKey.size} price keys x ${locales.length} locales, `
    + `${comparedWithShell} shell markup comparisons, `
    + `per-locale min ${Math.min(...locales.filter((l) => l !== "ko").map((l) => perLocaleCount[l]))}, `
    + `${Object.keys(PASS_MONTHLY_WON).length} pass tiers, ${READ_PATHS.length} gate-triggered paths)`,
);
