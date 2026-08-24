/**
 * 회원가입 휴대폰 번호 필수 정책 가드 (DB·네트워크 없음).
 *
 * 🔴 이 정책은 **두 번 뒤집혔다.** 되돌리기 전에 이 이력을 먼저 읽을 것.
 *   2026-08-15 — 번호는 첫 카드결제 때만 1회 수집(가입에서 안 받음)
 *   2026-08-19 — 전 경로 가입 필수. 카카오 동의항목 심사가 "자체 회원가입 프로세스에서도
 *                전화번호를 수집할 것"을 요구했기 때문
 *   2026-08-25 — **자체(이메일) 가입만 필수**로 좁힘. 소셜은 공급자가 주면 쓰고(카카오·네이버),
 *                주지 않으면(구글) 번호 없이 가입시킨 뒤 첫 결제 화면에서 받는다.
 *
 * 왜 좁혔나: 심사가 보는 것은 **자체** 회원가입이고 그쪽은 그대로 필수다. 소셜 가입에서까지
 * 번호를 다시 묻는 것은 공급자가 이미 넘겨 준 값을 한 번 더 입력시키는 일이었고, 구글은 번호를
 * 아예 주지 않아 "소셜로 시작했는데 폼을 채워야 하는" 화면이 남았다.
 *
 * 이 가드가 지키는 것:
 *  1) 🔴 **평문 저장 방지** — User.phoneNumber 에 들어가는 값은 preparePhoneForStorage 가 만든
 *     암호화 봉투이거나 빈 문자열뿐이어야 한다. **손으로 쓴 목록을 두지 않고 소스에서 전수
 *     발견해, 분류되지 않는 쓰기가 나타나면 실패**시킨다(CLAUDE.md 코딩 원칙 10).
 *  2) 필수화 자체 — **이메일 가입**에서 프론트·서버 양쪽이 번호 없는 가입을 거절하는지.
 *     소셜 가입은 반대로 **번호 없이도 끝나는지**를 본다(위 2026-08-25 항).
 *  3) 중복 허용 유지 — 번호로 계정을 막는 로직이 되살아나면 방침 문구와 다시 어긋난다.
 *  4) 고지 일치 — 실제 수집 행위와 개인정보처리방침·동의 요약 문구가 어긋나지 않는지.
 *
 * 실행: npm run verify:signup-phone-required
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFileSync(join(repoRoot, relativePath), "utf8");

function assertContains(source, needle, label) {
  assert.ok(source.includes(needle), `${label}\n  expected to find: ${needle}`);
}

const AUTH_ROUTE = "worker/routes/auth.js";
const authSource = read(AUTH_ROUTE);
const authLines = authSource.split("\n");

// ─────────────────────────────────────────────────────────────────────────────
// 1. 🔴 평문 저장 방지 — phoneNumber 를 다루는 모든 지점을 전수 발견해 분류한다.
//    분류 규칙은 "값의 모양"이다. User 문서에 실제로 들어가는 값은 암호화 봉투(storedPhoneNumber
//    계열)나 빈 문자열뿐이므로, 그 둘이 아닌 값이 저장 자리에 오면 평문 유출이다.
//    어느 규칙에도 걸리지 않으면 **실패**시킨다 — 새 쓰기가 조용히 추가되는 것이 이 가드가
//    막으려는 사고이므로, 모르는 모양을 통과시키면 가드가 아니다.
// ─────────────────────────────────────────────────────────────────────────────
const PHONE_WRITE_VALUES = /^(storedPhoneNumber|backfill\.storedPhoneNumber|"")$/;
const PHONE_PROJECTION_VALUE = /^[01]$/;
// DB 를 거치지 않고 메모리 안에서만 도는 값들 — 소셜 프로필 매핑, 가입 티켓 payload,
// 가입 마무리 화면이 넘긴 signupProfile. 이 값들은 findOrCreateSocialUser 가 다시
// preparePhoneForStorage 에 통과시킨 뒤에야 저장된다.
const PHONE_IN_MEMORY_VALUE = /^(normalizeKoreanPhoneNumber\(|bodyPhoneNumber\b)/;
// CAS(compare-and-set) 필터에서 **이미 저장돼 있는 값**을 조건으로 그대로 쓰는 자리.
// 새 값을 만들지 않으므로 쓰기가 아니다 — Mongo 연산자 객체이거나, 방금 읽은 문서의 필드다.
const PHONE_FILTER_VALUE = /^(\{\s*\$|existing\.phoneNumber$|user\.phoneNumber$)/;
// preparePhoneForStorage 의 반환값을 받는 구조 분해 대입(`{ phoneNumber: x } = await …`).
// 왼쪽의 phoneNumber 는 저장 대상이 아니라 그 함수가 돌려주는 정규화 평문의 이름이다.
const PHONE_DESTRUCTURE_LINE = /=\s*await preparePhoneForStorage\(/;

const unclassified = [];
const writeSites = [];

authLines.forEach((line, index) => {
  // 🔴 줄 첫머리로 한정하지 않는다 — 한 줄짜리 객체 리터럴(`{ phoneNumber: x }`)로 쓰면
  // 그대로 빠져나가던 구멍이 있었다(2026-08-19 음성 테스트에서 발견).
  const keyMatch = line.match(/phoneNumber:\s*([^,}\n]+)/);
  const setMatch = line.match(/\.set\("phoneNumber",\s*([^)]+)\)/);
  if (!keyMatch && !setMatch) return;

  const value = String((keyMatch || setMatch)[1]).trim().replace(/[,;]$/, "");
  const where = `${AUTH_ROUTE}:${index + 1}`;

  if (PHONE_PROJECTION_VALUE.test(value)) return;      // Mongo projection — 읽기다.
  if (PHONE_IN_MEMORY_VALUE.test(value)) return;       // DB 에 닿지 않는 중간 값이다.
  if (PHONE_FILTER_VALUE.test(value)) return;         // CAS 필터 조건이다.
  if (PHONE_DESTRUCTURE_LINE.test(line)) return;      // 구조 분해 대입이다.

  if (PHONE_WRITE_VALUES.test(value)) {
    writeSites.push({ where, index, value });
    return;
  }
  unclassified.push(`${where}  ->  phoneNumber: ${value}`);
});

assert.equal(
  unclassified.length,
  0,
  "휴대폰 번호를 다루는 새 지점이 분류되지 않았다. 저장이라면 preparePhoneForStorage 를 거쳐\n"
  + "저장이 아니라면 이 스크립트의 분류 규칙에 근거와 함께 추가할 것:\n  "
  + unclassified.join("\n  "),
);

// 쓰기가 하나도 안 잡히면 가드가 아무것도 안 지키고 있는 것이다(검사 대상 0 = 실패).
assert.ok(
  writeSites.length >= 6,
  `expected at least 6 phoneNumber write sites in ${AUTH_ROUTE}, found ${writeSites.length} — `
  + "정규식이 소스와 어긋났을 가능성이 크다",
);

/**
 * 값이 아니라 **구조**로 한 번 더 본다 — `{ phoneNumber }` 축약형은 위 값 분류에 걸리지 않고
 * 그대로 지나가는데, 그 축약형이 담는 값은 십중팔구 정규화된 평문이다.
 * `$set: {` · `User.create({` 뒤를 중괄호 균형으로 잘라 축약형을 금지한다
 * (CLAUDE.md 코딩 원칙 6의 "이름 grep 말고 본문을 잘라 본다").
 */
function sliceBalanced(source, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex, i + 1);
    }
  }
  return source.slice(openIndex);
}

let writeBlocks = 0;
for (const marker of ["$set: {", "User.create({"]) {
  let from = 0;
  for (;;) {
    const at = authSource.indexOf(marker, from);
    if (at < 0) break;
    from = at + marker.length;
    const block = sliceBalanced(authSource, authSource.indexOf("{", at + marker.length - 2));
    if (!/\bphoneNumber\b/.test(block)) continue;
    writeBlocks += 1;
    const line = authSource.slice(0, at).split("\n").length;
    assert.ok(
      !/\bphoneNumber\b\s*[,}]/.test(block),
      `${AUTH_ROUTE}:${line} — this ${marker} block uses the { phoneNumber } shorthand.\n`
      + "  축약형은 정규화된 평문을 그대로 담게 된다. storedPhoneNumber 를 명시할 것.",
    );
  }
}
assert.ok(writeBlocks >= 4, `expected at least 4 phone-writing $set/create blocks, found ${writeBlocks}`);

// 암호화를 우회해 직접 부르는 곳이 생기면 위 분류가 무의미해진다 — 봉투 생성은 한 자리뿐이어야 한다.
{
  const calls = authSource.split("encryptPhoneNumber(").length - 1;
  assert.equal(
    calls,
    1,
    `${AUTH_ROUTE} must call encryptPhoneNumber in exactly one place (preparePhoneForStorage), found ${calls}`,
  );
}
assertContains(authSource, "async function preparePhoneForStorage(rawValue, env) {",
  "preparePhoneForStorage must stay the single place that builds the stored envelope");

// 다른 워커 파일이 몰래 쓰기 시작하면 위 전수 검사 밖으로 새어 나간다.
for (const path of [
  "worker/routes/payments.js",
  "worker/routes/billing.js",
  "worker/routes/profile.js",
  "worker/routes/user.js",
  "worker/payments/index.js",
]) {
  const source = read(path);
  assert.ok(
    !/\.set\("phoneNumber"/.test(source) && !/\$set: \{[^}]*phoneNumber/.test(source),
    `${path} must not write User.phoneNumber — all writes go through worker/routes/auth.js`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. 필수화 — 프론트와 서버가 **둘 다** 번호 없는 가입을 거절하는지.
//    프론트만 막으면 API 를 직접 부르는 쪽으로 그대로 빠져나간다.
// ─────────────────────────────────────────────────────────────────────────────
const authShell = read("app/components/auth/AuthShell.tsx");
assertContains(authShell, 'id="auth-phone"', "signup screen must render a phone field");
assertContains(authShell, 'type="tel"', "the phone field must use the tel input type");
assertContains(authShell, "phoneNumber: normalizedPhone",
  "the signup request must carry the normalized number");
assertContains(authShell, 'from "../../_lib/korean-phone"',
  "AuthShell must reuse the shared normalizer instead of a private copy");
// 🔴 번호 칸은 **이메일 가입 전용**이다(2026-08-25). 소셜 티켓 화면에는 없어야 한다 —
// 있으면 공급자가 넘긴 번호를 한 번 더 입력시키는 화면이 되살아난다.
assertContains(authShell, 'isSignup && !ticket && <Field id="auth-phone"',
  "the phone field must render only for email signup, never on the social ticket screen");

const validation = read("worker/lib/validation.js");
assertContains(validation, 'errors.push("Phone number is invalid.")',
  "validateRegisterPayload must reject a missing or malformed number");
assertContains(validation, "phoneNumber,",
  "validateRegisterPayload must return the normalized number in sanitized");
assertContains(authSource, "const phoneNumber = validated.sanitized.phoneNumber;",
  "handleRegister must take the number from the validated payload, not straight from the body");

// 🔴 소셜 가입은 **번호 없이도 끝난다**(2026-08-25). 되살리면 구글 사용자가 소셜로 시작하고도
// 폼을 채워야 하는 화면으로 돌아간다. 그 계정의 번호는 첫 카드 결제 화면이 받는다.
assert.ok(
  !authSource.includes("if (!ticketPhoneNumber && !bodyPhoneNumber) {"),
  `${AUTH_ROUTE}: 소셜 가입에 번호 필수화를 되살리지 말 것 — 2026-08-25 정책.\n`
  + "  자체(이메일) 가입의 필수화는 validateRegisterPayload 가 계속 지킨다.",
);
// 그 대신 번호 없는 계정을 결제 화면이 받는 경로가 살아 있어야 한다.
assertContains(authSource, "handlePaymentPhoneStatus",
  "the payment screen must still be able to collect a number for accounts that have none");
// 이메일 가입의 필수화는 그대로다 — 심사가 보는 것이 이쪽이다.
assertContains(authSource, '"phone_required"',
  "email signup must still answer with a phone_required code the client can branch on");

// ─────────────────────────────────────────────────────────────────────────────
// 3. 🔴 중복 허용 유지 (2026-08-19 결정).
//    한 번호로 계정을 여러 개 만드는 것을 허용한다. 가입 시 지급되는 재화가 없어서
//    (전수 검색: worker/ 에 $inc moonstone·grant 계열 0건) 번호는 계정 수 제한 장치가 아니었고,
//    가족 공용 번호를 막는 부작용만 남았다.
//    🔴 차단을 되살리면 개인정보처리방침의 이용 목적("회원 식별 및 계정 관리, 결제 진행")과
//    다시 어긋난다 — 되살릴 때는 방침 4개 로케일을 같은 커밋에서 고칠 것.
// ─────────────────────────────────────────────────────────────────────────────
for (const banned of ["isPhoneNumberTaken", "duplicate_phone", "phoneHash"]) {
  assert.ok(
    !authSource.includes(banned),
    `${AUTH_ROUTE} must not reintroduce ${banned} — 번호 중복은 허용 정책이다.\n`
    + "  정말 막아야 한다면 이 가드와 개인정보처리방침(ko/en/ja/zh/zh-TW)을 같은 커밋에서 함께 고칠 것.",
  );
}

// 탈퇴 시 번호가 지워지는지 — 방침 6항이 "탈퇴 시 지체 없이 파기"라고 고지한다.
const withdrawSet = authSource.match(/name: "\[탈퇴한 회원\]"[\s\S]{0,900}/)?.[0] || "";
assertContains(withdrawSet, 'phoneNumber: ""',
  'withdrawal must clear the number — the privacy policy promises destruction at withdrawal');

// ─────────────────────────────────────────────────────────────────────────────
// 4. 고지 일치 — 실제 수집 행위와 방침·동의 요약이 어긋나지 않는지.
//    회원가입 화면은 방침 본문을 임베드하지 않고 한 줄 요약만 보여주므로, 둘이 따로 논다.
// ─────────────────────────────────────────────────────────────────────────────
const policy = read("app/privacy-policy/PrivacyPolicyContent.jsx");
// 🔴 2026-08-25: "회원가입 시 필수" 에서 "**이메일로 가입하시는 경우** 필수" 로 좁혔다.
// 소셜 가입은 공급자가 주거나(카카오·네이버) 첫 결제에서 받으므로(구글), 옛 문장을 그대로 두면
// 방침이 하지 않는 일을 고지하는 셈이 된다.
assertContains(policy, "휴대폰 번호는 이메일로 가입하시는 경우 회원가입 시 필수로 수집하며",
  "privacy policy must scope the required-at-signup claim to email signup");
assertContains(policy, "구글 로그인으로 가입하신 경우",
  "privacy policy must name the social path whose number is collected at first payment");
assertContains(policy, "필수 항목(이름, 이메일, 휴대폰 번호)",
  "privacy policy must list the phone number among the required items");
// 🔴 실제로 하지 않는 목적을 적으면 그 자체가 허위 고지다 — 이 서비스에는 SMS 발송 기능이 없다
// (2026-08-19 전수 검색: worker/ lib/ scripts/ app/ 에 SMS·OTP 공급자 연동 0건).
assertContains(policy, "광고성 문자나 전화를 보내지 않습니다",
  "privacy policy must not imply a messaging purpose the service does not have");
// 정정 수단이 방침과 코드 양쪽에 있어야 한다(개인정보 보호법 제36조).
assertContains(policy, "/account/phone",
  "privacy policy must point at the page where the number can be corrected");
assertContains(authSource, "async function handleChangePhoneNumber(request, env) {",
  "a change endpoint must exist — a required field with no correction path is not lawful");

// 가입 화면 요약이 방침과 같은 항목·목적을 말하는지.
assertContains(authShell, "수집: 이름·이메일·휴대폰 번호",
  "the signup consent summary must list the phone number as collected");
assertContains(authShell, "목적: 계정 관리·결제 진행",
  "the signup consent summary must match the purposes stated in the privacy policy");

console.log("verify-signup-phone-required: OK");
