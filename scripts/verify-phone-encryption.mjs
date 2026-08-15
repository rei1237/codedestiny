/**
 * 휴대폰 번호 필드 암호화 회귀 검증 (DB·네트워크 없음).
 *
 * 이 가드가 지키는 것은 두 가지다.
 *  1) 암복호화 자체의 정확성 — 왕복 일치, IV 랜덤, 잘못된 키 거부, 평문 하위호환.
 *  2) 🔴 복호화 지점 누락 방지 — 저장값이 봉투가 되는 순간, PortOne customer.phoneNumber 를
 *     만드는 경로에서 복호화를 빠뜨리면 단건 결제가 통째로 막힌다. 소스 단언으로 고정한다.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
assertContains(authSource, "storedPhoneNumber = await encryptPhoneNumber(phoneNumber, env);",
  "email signup and payment-phone save must encrypt before writing");
assertContains(authSource, "phoneNumber: storedPhoneNumber,",
  "email signup User.create must store the encrypted value");
assertContains(authSource, "{ $set: { phoneNumber: storedPhoneNumber, phoneUpdatedAt: new Date() } }",
  "raw-driver payment-phone update must store the encrypted value (Mongoose setters do not run there)");
// 변수명이 아니라 성질을 고정한다 — 백필에 들어가는 값은 반드시 encryptBackfillPhoneNumber 를 통과한다.
// (예전에는 `profilePhoneNumber` 라는 이름까지 문자열로 박아 두어, 가입 입력값 우선 수정에서
//  이름만 바뀌었는데도 실패했다.)
assert.ok(
  /const backfill = await encryptBackfillPhoneNumber\(\w+, env\);/.test(authSource),
  "OAuth backfill must encrypt before writing",
);
assert.equal(
  (authSource.match(/const backfill = await encryptBackfillPhoneNumber\(/g) || []).length,
  3,
  "backfill must stay in all three write paths (social providerId / social email / email re-signup)",
);
// 이메일 재가입 백필도 raw driver 라 Mongoose setter 가 돌지 않는다 — 봉투를 직접 넣어야 한다.
assertContains(authSource, "{ $set: { phoneNumber: backfill, phoneUpdatedAt: new Date() } }",
  "email re-signup backfill must store the encrypted envelope, not the raw number");
assert.ok(
  !/\$set: \{ phoneNumber: phoneNumber\b/.test(authSource),
  "no write path may $set the raw phone number",
);
assertContains(authSource, "if (backfill) user.set(\"phoneNumber\", backfill);",
  "OAuth backfill must skip (never store plaintext) when encryption is unavailable");
assert.ok(
  !/user\.set\("phoneNumber", profilePhoneNumber\)/.test(authSource),
  "OAuth backfill must never write the raw phone number",
);
assertContains(authSource, "const storedPhoneNumber = profilePhoneNumber ? await encryptPhoneNumber(profilePhoneNumber, env) : \"\";",
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

// 12. 🔴 수집 지점이 하나뿐인지 — 가입 화면은 번호를 받지 않는다(2026-08-15 정책 전환).
//     예전에는 이 절이 "가입 화면이 암호화 보관을 안내하는지"를 봤다. 정책이 뒤집혔으므로
//     같은 자리에서 **반대 방향**을 고정한다: 가입 폼에 번호 입력이 되살아나면 실패한다.
//     번호는 ①소셜 공급자가 준 값 ②첫 단건결제의 입력 모달, 두 경로로만 들어온다.
const authShellSource = read("app/components/auth/AuthShell.tsx");
for (const forbidden of ["phoneNumber", "phoneHelp", 'type="tel"', "휴대폰 번호"]) {
  assert.ok(
    !authShellSource.includes(forbidden),
    `signup form must not collect a phone number any more (found: ${forbidden})`,
  );
}

// 수집을 실제로 하는 지점(결제 모달)이 서버 보관 사실을 알리는지. 가입 화면에서 뺀 고지를
// 아무 데서도 안 하게 되는 것이 이 전환의 유일한 퇴행 경로다.
assertContains(read("app/_lib/payment-phone-prompt.ts"), "서버에",
  "payment-phone prompt must tell the user the number is stored on the server");
assertContains(read("app/privacy-policy/PrivacyPolicyContent.jsx"), "AES-256 방식으로 암호화해 보관합니다",
  "privacy policy must state that the phone number is stored encrypted");
assertContains(read("app/privacy-policy/PrivacyPolicyContent.jsx"), "휴대폰 번호는 가입 시 받지 않으며",
  "privacy policy must state that the phone number is not collected at signup");

console.log("verify-phone-encryption: OK");
