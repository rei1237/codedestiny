/**
 * 결제 화면의 **법정 고지**가 정본과 어긋나지 않는지.
 *
 * 왜 이 가드가 생겼나 (2026-08-31 실측):
 *   사전 12벌에 **법적 구속력 있는 조건의 두 번째 정본**이 두 개 살아 있었다.
 *     - `footer.refundPolicy` — "구매 후 **14일** 이내 환불" (ko 제외 11벌)
 *     - `trust.badges[5]`     — "**30일** 전액 환불 보장" (ko 제외 11벌)
 *   정본은 `lib/legal/refund-policy-rows.js` 의 **7일 청약철회 + 제공 개시분 제한**이다.
 *   즉 한국어 화면과 해외 화면이 서로 다른 계약을 말하고 있었고, 30일 무조건 전액 환불은
 *   표시광고법 소지까지 있었다. 둘 다 `data-cd-trans` 소비자가 0이라 **화면에는 아무 증상이
 *   없었다** — 마커 한 줄이면 렌더링되는 상태로 사전에만 앉아 있었다(PR #1388 에서 삭제).
 *
 *   같은 자리에서 `provisionTiming`·`passShop.provisionNotice` 의 en·hi·ms 가 청약철회를
 *   "cancellation of **subscription**" 으로 옮겨 놨다. 이 서비스에는 구독이 없고
 *   `lib/market-policy/market-policy-registry.js` 가 `subscription_cancellation_right` 를
 *   **금지 주장**으로 등재해 둔 바로 그 표현이다 — 자기 레지스트리가 금지한 주장을 결제창이
 *   하고 있었다.
 *
 * 무엇을 강제하는가:
 *   ① `REFUND_POLICY_ROWS[0]` 에서 청약철회 기한(일수)을 **뽑아낸다**. 못 뽑으면 실패한다
 *      — 정본을 못 읽은 채로 "위반 없음"을 말하는 것이 이 가드의 유일한 실패 모드다
 *   ② 사전 12벌에서 **환불 어휘 + 기간 숫자**를 동시에 가진 키를 로케일별 어휘표로 찾는다
 *   ③ 그 집합이 allowlist 와 정확히 같아야 한다. 현재 목표 상태는 **빈 집합**
 *   ④ allowlist 에 등재하려면 그 일수가 ① 과 같아야 한다(정본과 다른 기한은 못 넣는다)
 *   ⑤ 청약철회 고지 2키가 로케일별 **승인 용어**를 쓰고 있고, "구독 해지" 주장을 하지 않는다
 *   ⑥ 미성년자 계약 취소권 고지(전자상거래법 §13②5)가 12벌 전부에 살아 있다
 *   ⑦ ⑤의 전제인 `prohibitedClaims` 가 레지스트리에 그대로 있다(전제가 뒤집히면 함께 깨진다)
 *   ⑧ `--self-test` — 삭제된 위반 문구 22개를 탐지기에 다시 먹여 **전부 잡는지** 확인한다
 *   ⑨ 이 검사기가 읽는 파일이 전부 paid-flow-gates 트리거 경로에 있다
 *
 * 🔴 화이트리스트이지 블랙리스트가 아니다 — 금지어 목록은 **새 언어의 새 오역**을 못 잡는다.
 *    "이 로케일에서 청약철회를 뜻하는 승인된 말"을 적어 두고 그것이 있는지를 본다.
 *
 * 범위: 루트 사전 원본만 본다. 미러(public/**)는 `verify:public-parity` 가 동일성을 따로 강제한다.
 *
 * 실행: npm run verify:payment-legal-copy
 *       npm run verify:payment-legal-copy -- --self-test
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { gateCovers as gateCoversAny, readGatePatterns } from "./lib/gate-trigger-coverage.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (rel) => readFileSync(resolve(root, rel), "utf8");
const SELF_TEST = process.argv.includes("--self-test");

const I18N_LOCALES = ["ko", "en", "ja", "zh-cn", "zh-tw", "es", "fr", "de", "nl", "vi", "ms", "hi"];
const REFUND_ROWS = "lib/legal/refund-policy-rows.js";
const MARKET_REGISTRY = "lib/market-policy/market-policy-registry.js";

// 사전 한 벌의 문자열 잎 개수 바닥. 사전이 비거나 구조가 바뀌면 "위반 0" 으로 통과한다.
const MINIMUM_LEAVES = 3000;

// ── 1) 정본에서 청약철회 기한을 뽑는다 ─────────────────────────────────────────────────
// 🔴 파일을 **텍스트로** 읽는다. import 하면 이 스크립트가 ESM/CJS 해석에 의존하게 되는데,
//    정본은 워커도 읽는 .js 라 그 해석이 바뀌는 날 가드가 조용히 죽는다.
const refundSource = read(REFUND_ROWS);
const firstRow = refundSource.match(/REFUND_POLICY_ROWS\s*=\s*\[\s*\r?\n\s*"([^"]+)"/)?.[1];
assert.ok(
  firstRow,
  `${REFUND_ROWS}: REFUND_POLICY_ROWS 의 첫 문안을 못 읽었습니다 — 배열 형태가 바뀌었다면 이 정규식을 함께 고치세요. `
    + `정본을 못 읽은 채로 "위반 없음" 을 말하지 않기 위해 여기서 멈춥니다.`,
);
const withdrawalDays = Number(firstRow.match(/(\d+)일 이내 청약철회/)?.[1]);
assert.ok(
  Number.isInteger(withdrawalDays) && withdrawalDays > 0,
  `${REFUND_ROWS}: 첫 문안에서 "N일 이내 청약철회" 를 못 뽑았습니다.\n  읽은 값: ${JSON.stringify(firstRow.slice(0, 120))}`,
);

// ── 2) 환불 어휘 + 기간 숫자 탐지기 ────────────────────────────────────────────────────
// 어휘표는 삭제된 위반 문구 22개(11로케일 × 2)로 교정했고, ⑧ 이 그 22개를 다시 먹여 확인한다.
const REFUND_VOCAB = {
  ko: ["환불", "환급", "청약철회", "반품"],
  en: ["refund", "money-back", "money back", "withdraw"],
  ja: ["返金", "払い戻し", "撤回", "返品"],
  "zh-cn": ["退款", "退货", "撤销", "退还"],
  "zh-tw": ["退款", "退貨", "撤銷", "退還"],
  es: ["reembols", "devolución", "desistimiento"],
  fr: ["rembours", "rétractation"],
  de: ["erstattung", "rückerstattung", "rückgabe", "widerruf", "geld-zurück", "geld zurück"],
  nl: ["terugbetaling", "terugbetaalbaar", "restitutie", "herroeping", "geld terug"],
  vi: ["hoàn tiền", "hoàn trả", "hoàn lại"],
  ms: ["bayaran balik", "pemulangan wang", "menarik balik", "dikembalikan"],
  hi: ["धनवापसी", "रिफ़ंड", "रिफंड", "वापसी"],
};
// 숫자 + 일수 단위. 로케일 공용으로 둔다 — 한 사전에 다른 언어의 단위가 섞여 들어오는 것도
// 잡아야 하고(실제로 그런 드리프트가 있었다), 단위를 로케일별로 좁히면 그때 놓친다.
const DAY_UNIT =
  /(\d+)\s*-?\s*(일|days?|daagse|daags|天|日間|日|días|día|jours|jour|Tagen|Tage|dagen|dag|ngày|hari|दिनों|दिन)/iu;

function stringLeaves(node, path, out) {
  if (typeof node === "string") {
    out.push([path, node]);
    return out;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) stringLeaves(value, path ? `${path}.${key}` : key, out);
  }
  return out;
}

/** 한 로케일의 (경로, 값) 목록에서 "환불 조건을 스스로 말하는" 키를 찾는다. */
function findRefundTermOffenders(locale, leaves) {
  const vocab = REFUND_VOCAB[locale];
  assert.ok(vocab && vocab.length, `REFUND_VOCAB 에 ${locale} 어휘가 없습니다.`);
  const offenders = [];
  for (const [path, value] of leaves) {
    const lowered = value.toLowerCase();
    if (!vocab.some((term) => lowered.includes(term.toLowerCase()))) continue;
    const matched = value.match(DAY_UNIT);
    if (!matched) continue;
    offenders.push({ path, days: Number(matched[1]), excerpt: value.slice(0, 100) });
  }
  return offenders;
}

// ── 3) 위반 집합 == allowlist ─────────────────────────────────────────────────────────
// 🔴 목표 상태는 **빈 집합**이다. 사전은 환불 조건을 요약해서는 안 된다 — 요약본은 곧 두 번째
//    정본이 되고, 한쪽만 고쳐졌을 때 어느 쪽이 계약인지 다투게 된다
//    (`lib/legal/refund-policy-rows.js` 머리주석이 같은 이유로 "여기 한 벌만 둔다"고 적었다).
//    부득이 넣어야 하면 여기에 `"<locale>:<키 경로>"` 로 등재하되, ④ 가 일수를 정본과 대조한다.
const ALLOWLIST = new Set([]);

const dictionaries = Object.fromEntries(
  I18N_LOCALES.map((locale) => [locale, JSON.parse(read(`public/i18n/${locale}.json`))]),
);

const found = [];
for (const locale of I18N_LOCALES) {
  const leaves = stringLeaves(dictionaries[locale], "", []);
  assert.ok(
    leaves.length >= MINIMUM_LEAVES,
    `public/i18n/${locale}.json: 문자열이 ${leaves.length}개뿐입니다(최소 ${MINIMUM_LEAVES}). `
      + `사전이 비면 이 검사는 대상 0개로 통과합니다.`,
  );
  for (const hit of findRefundTermOffenders(locale, leaves)) found.push({ locale, ...hit });
}

const foundIds = found.map((hit) => `${hit.locale}:${hit.path}`).sort();
const unexpected = foundIds.filter((id) => !ALLOWLIST.has(id));
assert.deepEqual(
  unexpected,
  [],
  `사전이 환불 기한을 스스로 말하는 키가 ${unexpected.length}개 있습니다. 정본은 ${REFUND_ROWS} 한 벌뿐입니다 `
    + `— 사전에 요약본을 두면 한쪽만 고쳐졌을 때 어느 쪽이 계약인지 다투게 됩니다.\n`
    + found
      .filter((hit) => !ALLOWLIST.has(`${hit.locale}:${hit.path}`))
      .map((hit) => `    ${hit.locale}:${hit.path} (${hit.days}일) ${hit.excerpt}`)
      .join("\n"),
);
const staleAllowlist = [...ALLOWLIST].filter((id) => !foundIds.includes(id));
assert.deepEqual(
  staleAllowlist,
  [],
  `ALLOWLIST 에 더 이상 존재하지 않는 키가 있습니다: ${staleAllowlist.join(", ")} — 지우세요.`,
);

// ── 4) allowlist 의 일수는 정본과 같아야 한다 ───────────────────────────────────────────
for (const hit of found) {
  assert.equal(
    hit.days,
    withdrawalDays,
    `${hit.locale}:${hit.path} 이 ${hit.days}일이라고 말합니다. 정본(${REFUND_ROWS})은 ${withdrawalDays}일입니다.\n`
      + `    ${hit.excerpt}`,
  );
}

// ── 5) 청약철회 승인 용어 + 구독 해지 주장 금지 ─────────────────────────────────────────
// 두 키 모두 "결제 완료 즉시 제공 → 제공 개시분은 청약철회 제한" 을 말하는 자리다.
const WITHDRAWAL_KEYS = ["payment.directModal.legal.provisionTiming", "payment.passShop.provisionNotice"];
const WITHDRAWAL_TERMS = {
  ko: ["청약철회"],
  en: ["withdraw"],
  ja: ["撤回"],
  "zh-cn": ["撤销"],
  "zh-tw": ["撤銷"],
  es: ["desistimiento", "desistir"],
  fr: ["rétractation"],
  de: ["widerruf"],
  nl: ["herroeping", "herroepen"],
  vi: ["hủy"],
  hi: ["वापस"],
  ms: ["menarik balik"],
};
// 🔴 이 서비스에는 구독이 없다(⑦ 참조). 라틴 문자권 오역이 정확히 이 단어로 들어왔다.
const SUBSCRIPTION_CLAIM = /subscription|abonnement|suscripci|abonament|langganan/i;

const readKey = (data, key) =>
  key.split(".").reduce((node, part) => (node && typeof node === "object" ? node[part] : undefined), data);

let withdrawalChecks = 0;
for (const key of WITHDRAWAL_KEYS) {
  for (const locale of I18N_LOCALES) {
    const value = readKey(dictionaries[locale], key);
    assert.equal(
      typeof value,
      "string",
      `public/i18n/${locale}.json: ${key} 가 없습니다 — 청약철회 고지는 12벌 전부에 있어야 합니다.`,
    );
    const terms = WITHDRAWAL_TERMS[locale];
    assert.ok(
      terms.some((term) => value.toLowerCase().includes(term.toLowerCase())),
      `${locale} ${key}: 청약철회 승인 용어(${terms.join(" / ")})가 없습니다. 이 문장은 전자상거래법 §17 고지입니다.\n`
        + `    ${value.slice(0, 140)}`,
    );
    assert.ok(
      !SUBSCRIPTION_CLAIM.test(value),
      `${locale} ${key}: "구독 해지" 로 읽히는 표현이 있습니다. 이 서비스에는 자동갱신 구독이 없고 `
        + `${MARKET_REGISTRY} 가 subscription_cancellation_right 를 금지 주장으로 등재해 두었습니다(⑦).\n`
        + `    ${value.slice(0, 140)}`,
    );
    withdrawalChecks += 1;
  }
}

// ── 6) 미성년자 계약 취소권 (전자상거래법 §13②5) ────────────────────────────────────────
// "미성년자가 법정대리인 동의 없이 체결한 계약은 취소할 수 있다" 는 **계약 체결 전** 고지 대상이다.
// 서버 차단은 만 14세 미만만 겨냥하므로(worker/lib/validation.js 의 MIN_SELF_CONSENT_AGE), 만 14~18세는
// 이 고지로만 다뤄진다 — 즉 이 문장이 사라지면 대체 장치가 없다.
const GUARDIAN_KEY = "payment.directModal.legal.provisionTiming";
const GUARDIAN_TERMS = {
  ko: "법정대리인",
  en: "legal guardian",
  ja: "法定代理人",
  "zh-cn": "法定代理人",
  "zh-tw": "法定代理人",
  es: "representante legal",
  fr: "représentant légal",
  de: "gesetzlichen Vertretung",
  nl: "wettelijke vertegenwoordiger",
  vi: "người đại diện theo pháp luật",
  ms: "penjaga sah",
  hi: "विधिक संरक्षक",
};
for (const locale of I18N_LOCALES) {
  const value = readKey(dictionaries[locale], GUARDIAN_KEY);
  const term = GUARDIAN_TERMS[locale];
  assert.ok(
    value.toLowerCase().includes(term.toLowerCase()),
    `${locale} ${GUARDIAN_KEY}: 미성년자 법정대리인 고지(${term})가 없습니다 — 전자상거래법 제13조 제2항 제5호.\n`
      + `    ${value.slice(0, 140)}`,
  );
}

// ── 7) ⑤의 전제 고정 ──────────────────────────────────────────────────────────────────
// 레지스트리가 "구독 해지권 없음" 을 뒤집으면 ⑤의 금지가 근거를 잃는다. 사람이 두 파일을
// 같이 볼 거라 기대하지 말고 기계로 묶는다.
const registrySource = read(MARKET_REGISTRY);
for (const marker of ["\"subscription_cancellation_right\"", "currentServiceHasSubscriptionCancellationRight: false"]) {
  assert.ok(
    registrySource.includes(marker),
    `${MARKET_REGISTRY}: ${marker} 가 사라졌습니다. 이 서비스에 구독 해지권이 생겼다면 `
      + `이 가드의 ⑤(구독 표현 금지)를 함께 재검토해야 합니다.`,
  );
}

// ── 8) --self-test — 삭제된 위반 문구를 다시 먹여 탐지기가 살아 있는지 ────────────────────
// 🔴 "검사가 죽어서 대상 0개로 통과" 가 이 가드의 유일한 실패 모드다. 아래 22개는 2026-08-31 에
//    사전에서 실제로 지운 값이고(11로케일 × {trust.badges[5], footer.refundPolicy}), 로케일 어휘표를
//    한 벌씩 전부 찌른다. 하나라도 안 잡히면 그 로케일의 어휘표가 죽은 것이다.
const REMOVED_VIOLATIONS = {
  ko: ["구매일로부터 14일 이내에 환불이 가능합니다.", "30일 전액 환급 보장"],
  en: ["30-day money-back promise", "Paid digital content purchases are refundable within 14 days of purchase."],
  ja: ["30日間返金保証", "有料デジタルコンテンツは購入後14日以内かつ未使用の場合、返金対応いたします。"],
  "zh-cn": ["30天退款承诺", "付费数字内容购买后14天内未使用可申请退款。"],
  "zh-tw": ["30天退款承諾", "付費數位內容購買後14天內未使用可申請退款。"],
  es: ["Devolución en 30 días", "Las compras de contenido digital son reembolsables dentro de los 14 días."],
  fr: ["Remboursement sous 30 jours", "Les achats de contenu numérique sont remboursables dans les 14 jours."],
  de: ["30-Tage-Rückgabe", "Käufe digitaler Inhalte sind innerhalb von 14 Tagen erstattungsfähig."],
  nl: ["30-Daagse Terugbetaling", "Aankopen van digitale content zijn terugbetaalbaar binnen 14 dagen."],
  vi: ["Lời hứa hoàn tiền trong 30 ngày", "Nội dung số trả phí được hoàn lại trong vòng 14 ngày."],
  ms: ["Bayaran balik 30 hari", "Pembelian kandungan digital boleh dikembalikan dalam masa 14 hari."],
  hi: ["30-दिन रिफंड वादा", "सशुल्क डिजिटल सामग्री की खरीद 14 दिनों के भीतर वापसी योग्य है।"],
};
// 반대로 **잡히면 안 되는 것** — 환불 어휘만 있고 기한이 없는 정상 고지, 기한만 있고 환불이
// 아닌 상품 설명. 둘 중 하나라도 걸리면 탐지기가 너무 넓어 allowlist 를 부풀리게 된다.
const MUST_NOT_MATCH = {
  ko: ["제공이 개시된 콘텐츠는 청약철회가 제한될 수 있습니다.", "30일 이용권"],
  en: ["Your right to withdraw the purchase may be restricted.", "30-day Pass"],
};

if (SELF_TEST) {
  let positives = 0;
  for (const [locale, samples] of Object.entries(REMOVED_VIOLATIONS)) {
    for (const [index, sample] of samples.entries()) {
      const hits = findRefundTermOffenders(locale, [[`selftest.${index}`, sample]]);
      assert.equal(
        hits.length,
        1,
        `[self-test] ${locale} 어휘표가 죽었습니다 — 삭제된 위반 문구를 못 잡습니다: ${JSON.stringify(sample)}`,
      );
      positives += 1;
    }
  }
  let negatives = 0;
  for (const [locale, samples] of Object.entries(MUST_NOT_MATCH)) {
    for (const [index, sample] of samples.entries()) {
      const hits = findRefundTermOffenders(locale, [[`selftest.${index}`, sample]]);
      assert.deepEqual(
        hits,
        [],
        `[self-test] ${locale} 탐지기가 정상 문구를 위반으로 잡습니다: ${JSON.stringify(sample)}`,
      );
      negatives += 1;
    }
  }
  console.log(`[verify-payment-legal-copy] SELF-TEST PASS (양성 ${positives}건 · 음성 ${negatives}건)`);
  process.exit(0);
}

// ── 9) CI 트리거 커버리지 ──────────────────────────────────────────────────────────────
// 검사기가 멀쩡한 것과 검사기가 **실행되는** 것은 다른 문제다(CLAUDE.md 원칙 10).
const GATE_WORKFLOW = ".github/workflows/paid-flow-gates.yml";
const gatePatterns = readGatePatterns(resolve(root, GATE_WORKFLOW));
const READ_PATHS = [REFUND_ROWS, MARKET_REGISTRY, ...I18N_LOCALES.map((locale) => `public/i18n/${locale}.json`)];
for (const rel of READ_PATHS) {
  assert.ok(
    gateCoversAny(gatePatterns, rel),
    `${GATE_WORKFLOW}: 트리거 경로에 ${rel} 이(가) 없습니다 — 이 파일만 바뀐 PR 에서는 결제 법정 고지 검증이 아예 돌지 않습니다. paths 에 추가하세요.`,
  );
}

console.log(
  `[verify-payment-legal-copy] PASS `
    + `(청약철회 ${withdrawalDays}일 정본 · 사전 ${I18N_LOCALES.length}벌에서 기한 요약 ${found.length}건 · `
    + `고지 ${withdrawalChecks}건 + 미성년자 ${I18N_LOCALES.length}건 · ${READ_PATHS.length} gate-triggered paths)`,
);
