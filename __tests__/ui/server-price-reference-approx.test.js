// 가격 배지의 **표시 전용** 참고 개산가.
//
// 왜 이 축이 따로 필요한가:
//   해외카드 특약상 승인·정산은 언제나 KRW 다. 화면의 외화는 참고 개산가일 뿐이고,
//   그 값이 결제 금액으로 새면 화면 금액 ≠ 승인 금액이 된다(정적 누출 검사는
//   scripts/verify-overseas-payment-notice.mjs 가 맡는다). 여기서는 그 반대편 —
//   **개산가가 붙어야 할 때 실제로 붙고, 붙으면 안 될 때 안 붙는지** 를 실행해서 본다.
//
//   한국어 화면에서 formatReferenceAmount 는 "" 를 돌려주므로 라벨이 한 글자도 바뀌지 않는다.
//   이 불변식이 깨지면 국내 화면의 가격 표기가 통째로 달라지므로 첫 케이스로 고정한다.
//
// 🔴 jest 가 아니라 node:test 다 — 이 레포의 jest 에는 TS 프리셋이 없어서 .ts 를 못 읽는다.
//    `npm run test:node` 의 __tests__/ui/*.test.js 글롭이 자동으로 집어 간다.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const url = require("node:url");

const root = path.resolve(__dirname, "../..");
const HOOK_REL = "app/hooks/useServerPrice.ts";
const hookSource = fs.readFileSync(path.join(root, HOOK_REL), "utf8");

let cached = null;
async function loadHook() {
  if (cached) return cached;
  const loaderPath = path.join(root, "scripts/lib/load-ts-module.mjs");
  const { loadTsModule } = await import(url.pathToFileURL(loaderPath).href);
  cached = loadTsModule(HOOK_REL);
  return cached;
}

/** 한국어 화면의 실제 동작: formatReferenceAmount 가 빈 문자열을 돌려준다. */
const koRuntime = { formatReferenceAmount: () => "" };

function fakeRuntime(amount) {
  return { formatReferenceAmount: () => amount };
}

// 실제 사전값(public/i18n/en.json 의 payment.overseas.approx).
const EN_TEMPLATE = "approx. {amount}";

test("ko 화면에서는 라벨이 한 글자도 바뀌지 않는다", async () => {
  const { appendReferenceApprox } = await loadHook();
  assert.equal(appendReferenceApprox("30,000원", 30000, koRuntime, "약 {amount} 상당"), "30,000원");
});

test("해외 화면에서는 원화 라벨 뒤에 개산가가 붙는다", async () => {
  const { appendReferenceApprox } = await loadHook();
  assert.equal(
    appendReferenceApprox("KRW 30,000", 30000, fakeRuntime("$22"), EN_TEMPLATE),
    "KRW 30,000 (approx. $22)",
  );
});

test("금액이 없거나 라벨이 비면 환산을 시도하지 않는다", async () => {
  const { appendReferenceApprox } = await loadHook();
  const explode = {
    formatReferenceAmount: () => {
      throw new Error("불려서는 안 된다");
    },
  };
  assert.equal(appendReferenceApprox("", 30000, explode, EN_TEMPLATE), "");
  assert.equal(appendReferenceApprox("KRW 0", 0, explode, EN_TEMPLATE), "KRW 0");
  assert.equal(appendReferenceApprox("KRW 0", Number.NaN, explode, EN_TEMPLATE), "KRW 0");
});

// 🔴 2026-09-03 스테이징에서 실제로 나간 결함의 회귀 가드.
//    /naming-ai/?lang=en 이 `KRW 30,000 (약 $22 상당)`, /vedic-ai/?lang=ja 가
//    `… (약 ¥3,300 상당)` 을 그렸다. 숫자·통화기호는 맞는데 감싸는 문구만 한국어였다.
//    원인은 checkoutEntry.text → cdTranslate 이고, 그 함수는 사전이 아직 없으면
//    **호출부의 한국어 폴백**을 돌려준다(LocaleRuntimeBridge.tsx 의 activeDictionary 분기).
//    브리지가 cd:locale-ready 를 사전 로드 **전에** 쏘므로 로케일 구독으로는 못 막는다.
test("사전이 오기 전에는 접미를 아예 붙이지 않는다 — 한국어 문구가 해외 화면에 새지 않게", async () => {
  const { appendReferenceApprox } = await loadHook();
  assert.equal(
    appendReferenceApprox("KRW 30,000", 30000, fakeRuntime("$22"), ""),
    "KRW 30,000",
    "사전 미도착 상태에서 접미가 붙었습니다 — 그 문구는 한국어 폴백일 수 있습니다.",
  );

  // 런타임 계약에 문구 조회가 남아 있으면 같은 결함이 되살아난다.
  assert.doesNotMatch(
    hookSource,
    /runtime\.text\(/,
    `${HOOK_REL}: 런타임에서 문구를 다시 읽고 있습니다 — 문구는 React 사전에서만 읽어야 합니다.`,
  );
  assert.doesNotMatch(
    hookSource,
    /text\(key: string/,
    `${HOOK_REL}: ReferenceApproxRuntime 에 text 계약이 되살아났습니다.`,
  );
  // 사전이 도착하면 effect 가 다시 돌아야 접미가 붙는다.
  assert.match(
    hookSource,
    /const approxTemplate = /,
    `${HOOK_REL}: approxTemplate 계산이 사라졌습니다.`,
  );
  const deps = hookSource.match(/\}, \[([^\]]*)\]\);/g) || [];
  assert.ok(
    deps.some((entry) => entry.includes("approxTemplate")),
    `${HOOK_REL}: effect 의존성에서 approxTemplate 이 빠졌습니다 — 사전이 와도 접미가 안 붙습니다.`,
  );
});

test("12벌 사전 전부에 payment.overseas.approx 가 있다 — 없으면 그 로케일만 접미가 사라진다", () => {
  const dir = path.join(root, "public/i18n");
  const locales = fs.readdirSync(dir).filter((name) => name.endsWith(".json"));
  assert.ok(locales.length >= 12, `public/i18n: 사전이 ${locales.length}벌입니다.`);
  for (const name of locales) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
    const value = data?.payment?.overseas?.approx;
    assert.equal(typeof value, "string", `public/i18n/${name}: payment.overseas.approx 가 없습니다.`);
    assert.match(value, /\{amount\}/, `public/i18n/${name}: {amount} 자리표시자가 없습니다.`);
  }
});

test("PriceBadge 의 aria-label 이 i18n 키를 탄다 — 한국어 고정이면 스크린리더가 전 로케일에서 한국어를 읽는다", () => {
  const badgeRel = "app/components/PriceBadge.tsx";
  const badge = fs.readFileSync(path.join(root, badgeRel), "utf8");
  assert.doesNotMatch(badge, /aria-label=\{`이용 가격/, `${badgeRel}: aria-label 이 한국어 리터럴로 되돌아갔습니다.`);
  assert.match(badge, /pick\("preview\.priceAriaLabel"/, `${badgeRel}: preview.priceAriaLabel 조회가 없습니다.`);
  const dir = path.join(root, "public/i18n");
  for (const name of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
    assert.equal(
      typeof data?.preview?.priceAriaLabel,
      "string",
      `public/i18n/${name}: preview.priceAriaLabel 이 없습니다.`,
    );
  }
});

test("런타임이 아직 없으면 예외가 호출부로 전파된다 — 그래서 호출부가 반드시 감싼다", async () => {
  const { appendReferenceApprox } = await loadHook();
  // checkoutEntryRuntime 은 SSR·레거시 코어 로드 전에 throw 하는 프록시다
  // (app/_lib/legacy-core-runtime.ts). 이 헬퍼는 삼키지 않는다.
  const notReady = new Proxy({}, {
    get() {
      throw new Error("Checkout entry runtime is not ready.");
    },
  });
  assert.throws(() => appendReferenceApprox("KRW 30,000", 30000, notReady, EN_TEMPLATE));

  // 🔴 그러므로 훅의 유일한 호출부는 try 안에 있어야 한다. 이게 "환율 실패 폴백" 의
  //    실제 실패 모드다(정적 참고표라 네트워크 실패는 구조적으로 존재하지 않는다).
  const callSite = hookSource.match(
    /try \{\s*\r?\n\s*display = appendReferenceApprox\([\s\S]*?\r?\n\s*\} catch \{/,
  );
  assert.ok(callSite, `${HOOK_REL}: appendReferenceApprox 호출이 try/catch 밖으로 나왔습니다.`);
  // 선언 1회를 뺀 나머지가 호출부다.
  const mentions = hookSource.split("appendReferenceApprox(").length - 1;
  const declarations = hookSource.split("function appendReferenceApprox(").length - 1;
  const calls = mentions - declarations;
  assert.equal(declarations, 1, `${HOOK_REL}: 선언이 ${declarations}개입니다.`);
  assert.equal(calls, 1, `${HOOK_REL}: 호출부가 ${calls}곳입니다 — 감싸지 않은 호출이 생겼는지 보세요.`);
});

// 순서 회귀 가드. LocaleRuntimeBridge 는 dynamic import 라(RuntimeClientGuards.tsx:11)
// 이 훅의 effect 가 대개 먼저 돌고, 그 시점의 window 에는 cdGetCurrentLanguage 가 없다.
// 그러면 formatReferenceAmount 가 한국어 화면으로 판정해 "" 를 돌려주고, effect 가
// 다시 돌지 않으면 개산가는 **영원히** 안 붙는다 — 화면은 멀쩡해 보이므로 눈으로 못 잡는다.
// useLocale 이 cd:locale-ready 를 구독하고, 브리지는 그 이벤트를 전역을 심은 뒤에 쏜다.
test("로케일 변경이 effect 를 다시 돌린다 — 구독이 빠지면 개산가가 영원히 안 붙는다", () => {
  assert.match(
    hookSource,
    /import \{ useLocale, useTPick \} from "@\/lib\/i18n\/useT";/,
    `${HOOK_REL}: useLocale 임포트가 사라졌습니다.`,
  );
  assert.match(
    hookSource,
    /const locale = useLocale\(\);/,
    `${HOOK_REL}: useLocale() 호출이 사라졌습니다.`,
  );
  const deps = hookSource.match(/\}, \[([^\]]*)\]\);/g) || [];
  assert.ok(
    deps.some((entry) => entry.includes("locale")),
    `${HOOK_REL}: effect 의존성에서 locale 이 빠졌습니다 — 개산가가 붙지 않습니다.`,
  );

  // 구독 대상이 실제로 그 이벤트인지까지 본다(useLocale 이 다른 신호로 갈아타면 계약이 깨진다).
  const useTSource = fs.readFileSync(path.join(root, "lib/i18n/useT.ts"), "utf8");
  assert.match(
    useTSource,
    /addEventListener\("cd:locale-ready"/,
    "lib/i18n/useT.ts: useLocale 이 cd:locale-ready 구독을 잃었습니다.",
  );
  // 브리지는 전역을 심은 **뒤에** 이벤트를 쏘아야 한다. 순서가 뒤집히면 구독해도 소용없다.
  const bridge = fs.readFileSync(path.join(root, "app/components/LocaleRuntimeBridge.tsx"), "utf8");
  const installsGlobal = bridge.indexOf("runtimeWindow.cdGetCurrentLanguage =");
  const emitsReady = bridge.indexOf("writeLocale(resolveRuntimeLang())");
  assert.ok(installsGlobal > 0, "LocaleRuntimeBridge: cdGetCurrentLanguage 설치 지점을 찾지 못했습니다.");
  assert.ok(emitsReady > 0, "LocaleRuntimeBridge: writeLocale 호출 지점을 찾지 못했습니다.");
  assert.ok(
    installsGlobal < emitsReady,
    "LocaleRuntimeBridge: cd:locale-ready 가 cdGetCurrentLanguage 설치보다 먼저 나갑니다.",
  );
});
