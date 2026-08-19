/**
 * 휴대폰 번호 필드 암호화 회귀 검증 (DB·네트워크 없음).
 *
 * 이 가드가 지키는 것은 두 가지다.
 *  1) 암복호화 자체의 정확성 — 왕복 일치, IV 랜덤, 잘못된 키 거부, 평문 하위호환.
 *  2) 🔴 복호화 지점 누락 방지 — 저장값이 봉투가 되는 순간, PortOne customer.phoneNumber 를
 *     만드는 경로에서 복호화를 빠뜨리면 단건 결제가 통째로 막힌다. 소스 단언으로 고정한다.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  decryptPhoneNumber,
  encryptPhoneNumber,
  isEncryptedPiiValue,
  maskKoreanPhoneNumber,
  normalizeKoreanPhoneNumber,
} from "../worker/lib/pii-crypto.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFileSync(join(repoRoot, relativePath), "utf8");

function assertContains(source, needle, label) {
  assert.ok(source.includes(needle), `${label}\n  expected to find: ${needle}`);
}

const KEY_A = { PII_ENC_KEY: Buffer.alloc(32, 7).toString("base64") };
const KEY_B = { PII_ENC_KEY: Buffer.alloc(32, 9).toString("base64") };
const PHONE = "01012345678";

// 1. 봉투 포맷 — 원본 숫자열이 저장값에 남지 않는다.
const envelope = await encryptPhoneNumber(PHONE, KEY_A);
assert.ok(isEncryptedPiiValue(envelope), "encrypted value must carry the v1: prefix");
assert.equal(envelope.split(":").length, 3, "envelope must be v1:<iv>:<ciphertext>");
assert.ok(!envelope.includes(PHONE), "ciphertext must not contain the plaintext phone number");
assert.ok(!/\d{8,}/.test(envelope.replace(/^v1:/, "")), "envelope must not leak a long digit run");

// 2. 왕복 일치.
assert.equal(await decryptPhoneNumber(envelope, KEY_A), PHONE, "roundtrip must return the original number");

// 3. 같은 입력이라도 매번 다른 암호문(랜덤 IV). 같으면 IV 재사용이라 GCM 이 깨진다.
const envelopeAgain = await encryptPhoneNumber(PHONE, KEY_A);
assert.notEqual(envelope, envelopeAgain, "each encryption must use a fresh random IV");
assert.equal(await decryptPhoneNumber(envelopeAgain, KEY_A), PHONE, "second envelope must also roundtrip");

// 4. 잘못된 키 — throw 가 아니라 "" 여야 한다(호출자는 "번호 없음"과 같게 처리한다).
assert.equal(await decryptPhoneNumber(envelope, KEY_B), "", "wrong key must decrypt to an empty string");
assert.equal(await decryptPhoneNumber("v1:bm90:YmFzZTY0", KEY_A), "", "corrupted envelope must not throw");
assert.equal(await decryptPhoneNumber(envelope, {}), "", "missing key must not throw on read");

// 5. 🔴 하위호환 — 마이그레이션 전 평문 레코드가 그대로 통과해야 한다.
//    이게 깨지면 기존 회원 전원의 단건 결제가 막힌다.
assert.equal(await decryptPhoneNumber(PHONE, KEY_A), PHONE, "legacy plaintext must pass through unchanged");
assert.equal(await decryptPhoneNumber("+82 10-1234-5678", KEY_A), PHONE, "legacy plaintext must be normalized");
assert.equal(await decryptPhoneNumber("", KEY_A), "", "empty stored value stays empty");
assert.equal(await decryptPhoneNumber("garbage", KEY_A), "", "unusable plaintext yields an empty string");

// 6. fail-closed — 키가 없으면 평문으로 폴백하지 않고 throw 한다.
await assert.rejects(
  () => encryptPhoneNumber(PHONE, {}),
  /pii_encryption_key_missing/,
  "encrypt must fail closed when PII_ENC_KEY is absent",
);
await assert.rejects(
  () => encryptPhoneNumber(PHONE, { PII_ENC_KEY: "dG9vLXNob3J0" }),
  /pii_encryption_key_invalid/,
  "encrypt must reject a key that is not 32 bytes",
);
assert.equal(await encryptPhoneNumber("not-a-phone", KEY_A), "", "invalid input encrypts to an empty string");


// 6-b. 🔴 같은 번호를 알아보는 수단이 없어야 한다 — 한 번호로 계정을 여러 개 만드는 것을
// 허용하기로 한 이상(2026-08-19), 비교용 결정적 해시는 목적 없는 식별자가 되고 방침에 적을
// 수집 목적이 없어진다. 되살리려면 개인정보처리방침 4개 로케일을 같은 커밋에서 고칠 것.
{
  const cryptoSource = read("worker/lib/pii-crypto.js");
  assert.ok(!/export async function hashPhoneNumber/.test(cryptoSource),
    "pii-crypto.js must not export a deterministic phone hash");
  const modelsSource = read("worker/lib/models.js");
  assert.ok(!/\bphoneHash\b/.test(modelsSource), "models.js must not declare a phone hash column");
}

// 7. 하위 소비자 무해성 — 복호화 결과는 기존 정규화기를 그대로 통과한다.
const decrypted = await decryptPhoneNumber(envelope, KEY_A);
assert.equal(normalizeKoreanPhoneNumber(decrypted), PHONE, "decrypted value must survive re-normalization");
assert.equal(maskKoreanPhoneNumber(decrypted), "010-****-5678", "masking must stay unchanged");

// payments.js 의 정본 sanitizeCustomerPhone 과 같은 규칙을 복호화 결과에 적용해도 동일해야 한다.
const paymentsSource = read("worker/routes/payments.js");
const sanitizeCustomerPhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  const localDigits = digits.startsWith("82") && /^821\d{8,9}$/.test(digits) ? `0${digits.slice(2)}` : digits;
  return /^01\d{8,9}$/.test(localDigits) ? localDigits : "";
};
assert.equal(sanitizeCustomerPhone(decrypted), PHONE, "PortOne customer phone must survive sanitization");

// 8. 스키마가 두 형태를 모두 허용하는지.
const modelsSource = read("worker/lib/models.js");
const schemaMatch = modelsSource.match(/phoneNumber: \{ type: String, default: "", trim: true, match: (\/[^\n]+\/) \}/);
assert.ok(schemaMatch, "models.js must still declare phoneNumber with a match validator");
const schemaRegex = new RegExp(schemaMatch[1].slice(1, -1));
assert.ok(schemaRegex.test(PHONE), "schema must still accept legacy plaintext numbers");
assert.ok(schemaRegex.test(envelope), "schema must accept the AES-GCM envelope");
assert.ok(schemaRegex.test(""), "schema must accept the empty default");

// 9. 🔴 소스 가드 — 쓰기 경로가 암호화를 거치는지.
const authSource = read("worker/routes/auth.js");
assertContains(authSource, 'import { decryptPhoneNumber, encryptPhoneNumber } from "../lib/pii-crypto.js";',
  "auth.js must import the PII crypto helpers");
// 🔴 봉투 생성은 한 헬퍼에서만 나온다 — 직접 부르면 정규화를 건너뛴 값이 저장될 수 있다.
assertContains(authSource, "({ storedPhoneNumber } = await preparePhoneForStorage(phoneNumber, env));",
  "email signup and payment-phone save must go through preparePhoneForStorage");
assertContains(authSource, "phoneNumber: storedPhoneNumber,",
  "email signup User.create must store the encrypted value");
// $set 의 모양은 동의 기록이 붙으면서 바뀌었다 — 문장 전체가 아니라 **성질**을 고정한다.
assertContains(authSource, "          phoneNumber: storedPhoneNumber,",
  "raw-driver payment-phone update must store the encrypted value (Mongoose setters do not run there)");
// 변수명이 아니라 성질을 고정한다 — 백필에 들어가는 값은 반드시 preparePhoneBackfill 을 통과한다.
// (예전에는 `profilePhoneNumber` 라는 이름까지 문자열로 박아 두어, 가입 입력값 우선 수정에서
//  이름만 바뀌었는데도 실패했다.)
assert.ok(
  /const backfill = await preparePhoneBackfill\(\w+, env\);/.test(authSource),
  "OAuth backfill must encrypt before writing",
);
assert.equal(
  (authSource.match(/const backfill = await preparePhoneBackfill\(/g) || []).length,
  3,
  "backfill must stay in all three write paths (social providerId / social email / email re-signup)",
);
// 이메일 재가입 백필도 raw driver 라 Mongoose setter 가 돌지 않는다 — 봉투를 직접 넣어야 한다.
assertContains(authSource, "phoneNumber: backfill.storedPhoneNumber,",
  "email re-signup backfill must store the encrypted envelope, not the raw number");
assert.ok(
  !/\$set: \{ phoneNumber: phoneNumber\b/.test(authSource),
  "no write path may $set the raw phone number",
);
assertContains(authSource, 'user.set("phoneNumber", backfill.storedPhoneNumber);',
  "OAuth backfill must skip (never store plaintext) when encryption is unavailable");
assert.ok(
  !/user\.set\("phoneNumber", profilePhoneNumber\)/.test(authSource),
  "OAuth backfill must never write the raw phone number",
);
assertContains(authSource, "? await preparePhoneForStorage(profilePhoneNumber, env)",
  "OAuth new-user creation must encrypt before writing");
assert.ok(
  !/phoneNumber,\n\s+passwordHash,/.test(authSource),
  "email signup must not pass the raw phone number straight into User.create",
);

// 10. 🔴 소스 가드 — 읽기 경로가 복호화를 거치는지.
assertContains(authSource, "async function buildPaymentPhoneResponse(user, env, extra = {}) {",
  "buildPaymentPhoneResponse must be async so it can decrypt");
assertContains(authSource, "async function normalizeAuthUserResponse(user, env) {",
  "normalizeAuthUserResponse must be async so it can decrypt");
for (const call of ["...(await buildPaymentPhoneResponse(", "await normalizeAuthUserResponse("]) {
  assertContains(authSource, call, `auth.js callers must await the decrypting response builder: ${call}`);
}
assert.ok(
  !/\.\.\.normalizeAuthUserResponse\(|\.\.\.buildPaymentPhoneResponse\(|user: normalizeAuthUserResponse\(/.test(authSource),
  "no auth.js caller may spread the un-awaited (Promise) response builder",
);

assertContains(paymentsSource, 'import { decryptPhoneNumber } from "../lib/pii-crypto.js";',
  "payments.js must import decryptPhoneNumber");
assertContains(paymentsSource, "async function buildSinglePaymentCustomer(user, userId, env) {",
  "buildSinglePaymentCustomer must be async so it can decrypt");
assertContains(paymentsSource, "phoneNumber: sanitizeCustomerPhone(await decryptPhoneNumber(user?.phoneNumber || user?.phone, env)),",
  "PortOne customer.phoneNumber must be decrypted — otherwise every card checkout is blocked");
assert.ok(
  !/[^t] buildSinglePaymentCustomer\(/.test(paymentsSource.replace(/async function buildSinglePaymentCustomer\(/g, "")),
  "every buildSinglePaymentCustomer call site must be awaited",
);

for (const routePath of ["worker/routes/ziwei-ai.js", "worker/routes/ziwei-island-ai.js"]) {
  const source = read(routePath);
  assertContains(source, 'import { decryptPhoneNumber } from "../lib/pii-crypto.js";',
    `${routePath} must import decryptPhoneNumber`);
  assertContains(source, "async function loadBillingUser(userId, env) {",
    `${routePath} loadBillingUser must accept env`);
  assertContains(source, "if (user) user.phoneNumber = await decryptPhoneNumber(user.phoneNumber, env);",
    `${routePath} must decrypt at the load site (its customerFromUser stays synchronous)`);
  assertContains(source, "loadBillingUser(auth.userId, env)",
    `${routePath} call sites must pass env through`);
}

// 11. 환경변수 계약에 등록되어 있는지 — 미등록이면 배포 게이트가 시크릿 누락을 못 잡는다.
const envContract = JSON.parse(read("config/env.contract.json"));
const entry = (envContract.keys || []).find((item) => item?.name === "PII_ENC_KEY");
assert.ok(entry, "PII_ENC_KEY must be registered in config/env.contract.json");
assert.equal(entry.secret, true, "PII_ENC_KEY must be marked as a secret");
assert.ok(entry.required_in?.includes("production"), "PII_ENC_KEY must be required in production");
assert.ok(entry.targets?.includes("worker"), "PII_ENC_KEY must target the worker");

// 12. 🔴 수집 지점 — 2026-08-19 부터 **회원가입이 1차 수집 지점**이다.
//     이 절은 여러 번 방향이 바뀌었다. ①가입 화면이 암호화 보관을 안내 ②2026-08-15 "가입 폼에
//     번호 입력이 있으면 실패"(수집 지점을 첫 결제 모달 하나로 좁힘) ③2026-08-19 다시 가입 필수 —
//     카카오 개인정보 동의항목 심사가 "자체 회원가입에서도 전화번호를 수집할 것"을 요구한다.
//     지금 번호가 들어오는 경로는 셋이고, 방침 2항의 서술이 이 목록과 같아야 한다:
//     ①가입 화면 직접 입력 ②소셜 공급자가 자기 동의로 넘긴 값 ③기존 회원의 첫 카드결제 모달.
const authShellSource = read("app/components/auth/AuthShell.tsx");
assertContains(authShellSource, 'id="auth-phone"',
  "signup screen must collect a phone number (Kakao consent-item review requires it)");
assertContains(authShellSource, 'type="tel"',
  "the phone field must use the tel input type so mobile shows a numeric keypad");
assertContains(authShellSource, "socialPhoneProvided",
  "the field may only be hidden when the provider already supplied a number");
// 🔴 프론트 검증은 서버와 **같은 규칙**을 써야 한다 — 갈라지면 화면은 통과시키고 서버가 400 을 낸다.
assertContains(authShellSource, 'from "../../_lib/korean-phone"',
  "AuthShell must normalize with the shared front-end helper, not a private copy");
// 서버가 프론트 우회를 다시 막는지.
const validationSource = read("worker/lib/validation.js");
assertContains(validationSource, 'from "./pii-crypto.js"',
  "validateRegisterPayload must normalize with the same rule the storage path uses");
assertContains(validationSource, 'errors.push("Phone number is invalid.")',
  "server-side signup validation must reject a missing or malformed number");
// 소셜 가입은 공급자 값과 입력값이 **둘 다** 없을 때만 거절한다.
assertContains(authSource, "if (!ticketPhoneNumber && !bodyPhoneNumber) {",
  "social signup must require a number from either the provider ticket or the form");
assert.ok(
  !existsSync(join(repoRoot, "app/onboarding")),
  "/onboarding must stay removed — signup and checkout are the only collection surfaces",
);

// 13. 🔴 결제 모달 3벌의 고지·동의가 **글자 그대로 같은지** (제15조 제2항 · 제22조).
//     렌더러가 React·셸·독립 폴백 3벌이라, 한 곳만 고치면 사용자마다 다른 고지를 받는다
//     (결제수단 선택창이 같은 이유로 verify:payment-choice-parity 를 갖고 있다).
const CONSENT_LINES = [
  "수집 항목 · 휴대폰 번호",
  "이용 목적 · 결제 진행 및 구매자 확인 (결제대행사 포트원·KG이니시스에 전달)",
  "보유·이용 기간 · 회원 탈퇴 시까지 (법령상 보존 의무가 있는 거래기록은 그 기간)",
  "거부 권리 · 동의하지 않아도 됩니다. 다만 이용권 구매를 포함한 모든 카드 결제에 번호가 필요해 진행할 수 없고, 보유하신 월정석으로만 이용하실 수 있어요.",
];
const CONSENT_LABEL = "결제 진행 목적의 휴대폰 번호 수집·이용에 동의합니다. (필수)";
const CONSENT_REQUIRED = "휴대폰 번호 수집·이용에 동의해 주셔야 결제를 진행할 수 있어요.";

const promptRenderers = [
  ["react", read("app/_lib/payment-phone-prompt.ts")],
  ["shell", read("index.html")],
  ["standalone", read("js/destiny-profile.js")],
];
for (const [label, source] of promptRenderers) {
  for (const line of CONSENT_LINES) {
    assertContains(source, line, `${label} prompt must disclose: ${line.split(" · ")[0]} (제15조 제2항)`);
  }
  assertContains(source, CONSENT_LABEL, `${label} prompt must carry the consent checkbox label`);
  assertContains(source, CONSENT_REQUIRED, `${label} prompt must refuse to save without consent`);
  assertContains(source, "consentInput.checked", `${label} prompt must gate submit on the checkbox`);
  // 🔴 고지가 길어 카드가 스크롤될 수 있다. 방침 링크는 동의 근거를 확인할 유일한 경로라 3벌 모두에 있어야 한다.
  assertContains(source, "개인정보처리방침 전문", `${label} prompt must link the full privacy policy`);
  // 따옴표는 렌더러마다 다르다(셸·dp 는 홑따옴표) — 검사하려는 성질은 링크 대상이지 인용부호가 아니다.
  assert.ok(
    /policyLink\.href = ['"]\/privacy['"]/.test(source),
    `${label} prompt must point that link at the policy route`,
  );
  // 문구만 같고 겉모습이 갈라지면 사용자는 화면마다 다른 결제창을 본다(결제수단 선택창이 CSS 텍스트
  // 동일성을 강제하는 것과 같은 이유). 오버레이·카드·CTA 세 표면이 그 규격의 뼈대다.
  for (const chunk of [
    "width:min(420px,100%);max-height:calc(100vh - 36px)",
    "background:radial-gradient(130% 100% at 50% 0%,rgba(36,26,74,.78),rgba(6,4,16,.92))",
    "background:linear-gradient(135deg,#f0dcab,#d9bd7c)",
  ]) {
    assertContains(source, chunk, `${label} prompt must keep the shared modal skin: ${chunk.slice(0, 40)}...`);
  }
  // 접근성: 오버레이가 대화상자로 읽혀야 스크린리더가 제목과 함께 읽는다(예전에는 role="presentation" 이었다).
  assert.ok(
    /setAttribute\(['"]aria-modal['"], ['"]true['"]\)/.test(source),
    `${label} prompt must expose the overlay as a modal dialog`,
  );
}
// 저장 호출은 렌더러마다 주인이 다르다 — React 는 호출부(PointsClient)가, 나머지 둘은 자기 파일이 한다.
// 세 경로 모두 동의 플래그를 서버로 실어 보내야 기록이 남는다(제22조).
for (const [label, path] of [
  ["react", "app/points/PointsClient.tsx"],
  ["shell", "index.html"],
  ["standalone", "js/destiny-profile.js"],
]) {
  assertContains(read(path), "phoneConsent: consented === true",
    `${label} save call must forward the consent flag to the server`);
}
// 위탁 사실과 수탁자는 방침 본문에도 있어야 한다 — 화면에만 이름이 있던 역전 상태를 막는다.
for (const processor of ["포트원", "KG이니시스"]) {
  assertContains(read("app/privacy-policy/PrivacyPolicyContent.jsx"), processor,
    `privacy policy must name the payment processor ${processor} as a consignee`);
}

// 14. 🔴 서버가 동의를 기록하는지 (제22조 입증책임).
//     여기서 동의를 강제하지는 않는다 — 결제 시점은 계약 이행 근거가 함께 서고, 400 으로 막으면
//     스토어에 남은 구버전 앱이 결제를 통째로 못 한다. 다만 **기록은 반드시 남아야** 한다.
assertContains(authSource, "const consentedAt = body?.phoneConsent === true ? new Date() : null;",
  "payment-phone save must read the consent flag");
assertContains(authSource, '"legalConsents.phoneAcceptedAt": consentedAt',
  "payment-phone save must record when the consent was given");
const modelsConsentBlock = modelsSource.match(/legalConsents: \{[\s\S]*?\n {2}\},/);
assert.ok(modelsConsentBlock, "models.js must still declare a legalConsents block");
for (const field of ["phoneVersion", "phoneAcceptedAt"]) {
  assert.ok(
    modelsConsentBlock[0].includes(field),
    `legalConsents must carry ${field} — otherwise the consent write is silently dropped`,
  );
}

// 방침 시행일과 서버가 기록하는 동의 버전은 수동 동기화라 어긋나기 쉽다.
const policyDate = read("app/privacy-policy/PrivacyPolicyContent.jsx")
  .match(/PRIVACY_POLICY_EFFECTIVE_DATE = "([\d-]+)"/);
const workerPrivacyVersion = authSource.match(/AUTH_PRIVACY_VERSION = "([\d-]+)"/);
assert.ok(policyDate && workerPrivacyVersion, "both privacy version constants must be readable");
assert.equal(
  workerPrivacyVersion[1], policyDate[1],
  "AUTH_PRIVACY_VERSION must equal PRIVACY_POLICY_EFFECTIVE_DATE — otherwise the recorded consent version lies",
);

// 수집을 실제로 하는 지점이 서버 보관 사실을 알리는지.
assertContains(read("app/_lib/payment-phone-prompt.ts"), "서버에",
  "payment-phone prompt must tell the user the number is stored on the server");
assertContains(read("app/privacy-policy/PrivacyPolicyContent.jsx"), "AES-256 방식으로 암호화해 보관합니다",
  "privacy policy must state that the phone number is stored encrypted");
assertContains(read("app/privacy-policy/PrivacyPolicyContent.jsx"), "휴대폰 번호는 회원가입 시 필수로 수집하며",
  "privacy policy must state that the phone number is a required signup field");
// 실제로 하지 않는 목적을 방침에 적으면 그 자체가 허위 고지다 — 이 서비스에는 SMS 발송 기능이 없다.
assertContains(read("app/privacy-policy/PrivacyPolicyContent.jsx"), "광고성 문자나 전화를 보내지 않습니다",
  "privacy policy must not claim a messaging purpose the service does not have");

console.log("verify-phone-encryption: OK");
