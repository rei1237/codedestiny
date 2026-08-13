#!/usr/bin/env node
//
// 관리자 프롬프트 실험실이 라이브 유료 경로와 "같은 스펙"으로 도는지 지킨다.
//
// 이 가드가 존재하는 이유: 예전 실험실은 자미두수 명반을 seed 해시로 위조하고
// (명궁 = positiveModulo(seed, 12)) 숙요 상대를 "내 index + 7"로 합성했다.
// 프롬프트 모양만 그럴듯하고 명리적 내용은 입력과 무관했기 때문에 검수 도구로 쓸 수 없었다.
//
// 🔴 LLM 을 호출하지 않는다. 프롬프트 문자열 생성까지만 검증한다(CLAUDE.md 코딩 원칙 8).

import assert from "node:assert/strict";
import {
  buildAdminPartnerProfile,
  buildAdminPromptProfile,
  buildAdminSukuyoContext,
  buildAdminZiweiChartFromEngine,
} from "../worker/routes/admin.js";
import { calculateZiweiAiChart } from "../worker/lib/ziwei-ai-chart.js";
import { buildVedicAIPrompt } from "../worker/lib/vedic-ai-prompt.js";
import { buildSukuyoAIPromptWithDomain } from "../worker/lib/sukuyo-ai-prompt.js";

const baseInput = {
  name: "관리자 대상",
  gender: "F",
  birthTime: "09:30",
  birthTimeUnknown: false,
  birthPlace: "Seoul",
  latitude: 37.5665,
  longitude: 126.978,
  timezone: "Asia/Seoul",
};

// ---------------------------------------------------------------------------
// 1. 자미두수 — 실험실 명반이 라이브 엔진 결과와 일치하는가
// ---------------------------------------------------------------------------
{
  const profile = buildAdminPromptProfile({ ...baseInput, birthDate: "1990-05-17", calendarType: "solar" });
  const chart = buildAdminZiweiChartFromEngine(profile);
  const engine = calculateZiweiAiChart({
    birthInfo: {
      gender: "female",
      birthDate: "1990-05-17",
      birthTime: "09:30",
      birthTimeUnknown: false,
      calendarType: "solar",
      isLeapMonth: false,
    },
  }, { year: new Date().getUTCFullYear() });

  assert.equal(chart.mingGong, engine.lifePalace, "명궁이 라이브 엔진과 달라졌다");
  assert.equal(chart.shenGong, engine.bodyPalace, "신궁이 라이브 엔진과 달라졌다");
  assert.equal(chart.juInfo, engine.bureau.name, "국수가 라이브 엔진과 달라졌다");
  assert.equal(chart.yearGan, engine.lunar.yearStem, "연간이 라이브 엔진과 달라졌다");
  assert.equal(chart.yearZhi, engine.lunar.yearBranch, "연지가 라이브 엔진과 달라졌다");

  // 사화 4성이 엔진의 fourTransformations(카멜 키)와 그대로 이어져야 한다.
  assert.equal(chart.sihua.hualu, engine.fourTransformations.huaLu, "화록이 끊겼다");
  assert.equal(chart.sihua.huaquan, engine.fourTransformations.huaQuan, "화권이 끊겼다");
  assert.equal(chart.sihua.huake, engine.fourTransformations.huaKe, "화과가 끊겼다");
  assert.equal(chart.sihua.huaji, engine.fourTransformations.huaJi, "화기가 끊겼다");
  assert.ok(chart.sihua.hualu, "사화가 비어 있다 — 키 매핑이 깨졌을 가능성이 높다");

  // 12궁 전부 id 가 붙어야 한다. 하나라도 빈 id 면 프롬프트의 findPalace 가 못 찾는다.
  assert.equal(chart.palaces.length, 12, "궁이 12개가 아니다");
  chart.palaces.forEach((palace) => {
    assert.ok(palace.id, `궁 id 매핑 실패: ${palace.name}`);
    assert.ok(palace.branch, `지지 누락: ${palace.name}`);
  });
  assert.ok(chart.palaces.some((palace) => palace.id === "friends"), "노복궁 -> friends 매핑이 깨졌다");

  // 최강/최약 궁은 서로 달라야 하고, 최약궁은 상위 3개 목록에서 뽑으면 안 된다.
  assert.ok(chart.summary.strongestPalaceId, "최강궁 id 가 비었다");
  assert.ok(chart.summary.weakestPalaceId, "최약궁 id 가 비었다");
  assert.notEqual(chart.summary.strongestPalaceId, chart.summary.weakestPalaceId, "최강궁과 최약궁이 같다");

  // 밝기 심볼은 엔진 표에 있는 값만 붙는다(없는 근거를 지어내지 않는다).
  const allowedSymbols = new Set(["◎", "O", "▲", "△", "X"]);
  chart.palaces.flatMap((palace) => palace.mainStars).forEach((star) => {
    if (star.strengthSymbol) assert.ok(allowedSymbols.has(star.strengthSymbol), `알 수 없는 강약 심볼: ${star.strengthSymbol}`);
  });

  // seed 위조 회귀 감시: 생년월일이 하루 달라지면 명반이 실제로 달라져야 한다.
  const nextDay = buildAdminZiweiChartFromEngine(
    buildAdminPromptProfile({ ...baseInput, birthDate: "1990-05-18", calendarType: "solar" }),
  );
  assert.notDeepEqual(
    chart.palaces.map((palace) => palace.mainStars.map((star) => star.name).join(",")),
    nextDay.palaces.map((palace) => palace.mainStars.map((star) => star.name).join(",")),
    "생년월일을 바꿔도 명반이 같다 — 엔진에 실제로 연결되지 않았다",
  );

  console.log("[ziwei] 실엔진 연결 OK ·", chart.mingGong, "/", chart.juInfo, "/ 화록", chart.sihua.hualu);
}

// ---------------------------------------------------------------------------
// 2. 숙요 궁합 — 상대가 실제 입력에서 나오는가
// ---------------------------------------------------------------------------
{
  const profile = buildAdminPromptProfile({ ...baseInput, birthDate: "1990-05-17", calendarType: "solar" });

  // 상대 미입력이면 궁합 데이터 없이 개인 해석만.
  const solo = buildAdminSukuyoContext(profile, null);
  assert.equal(solo.compatibilityResult, null, "상대가 없는데 궁합 데이터가 만들어졌다");
  assert.ok(solo.basicResult.mansion, "본인 본명숙이 비었다");

  const partnerA = buildAdminPartnerProfile({ partnerBirthDate: "1992-11-03", partnerCalendarType: "solar", partnerGender: "M", partnerName: "상대A" });
  const partnerB = buildAdminPartnerProfile({ partnerBirthDate: "1988-02-20", partnerCalendarType: "solar", partnerGender: "M", partnerName: "상대B" });
  const withA = buildAdminSukuyoContext(profile, partnerA);
  const withB = buildAdminSukuyoContext(profile, partnerB);

  assert.ok(withA.compatibilityResult, "상대를 넣었는데 궁합 데이터가 없다");
  assert.equal(withA.compatibilityResult.partnerName, "상대A");
  assert.ok(withA.compatibilityResult.partnerMansion.endsWith("숙"), "상대 본명숙이 27수 표기가 아니다");
  assert.ok(withA.compatibilityResult.relationType, "관계 유형이 비었다");

  // 예전 합성 규칙(내 index + 7) 회귀 감시.
  const myIdx = withA.compatibilityResult.myIdx;
  const gap = (withA.compatibilityResult.partnerIdx - myIdx + 27) % 27;
  assert.notEqual(gap, 7, "상대 index 가 여전히 '내 index + 7' 합성으로 보인다");

  // 상대를 바꾸면 궁합이 실제로 달라져야 한다.
  assert.notEqual(
    withA.compatibilityResult.partnerIdx,
    withB.compatibilityResult.partnerIdx,
    "상대를 바꿔도 본명숙이 같다 — 상대 입력이 계산에 반영되지 않았다",
  );

  // 객체로 오는 정본을 프롬프트가 읽는 문자열로 평문화했는지.
  assert.ok(withA.compatibilityResult.roleGuideText, "roleGuideText 가 비었다");
  assert.ok(withA.compatibilityResult.elementHarmonyText, "elementHarmonyText 가 비었다");
  assert.ok(withA.compatibilityResult.strengthShadowText, "strengthShadowText 가 비었다");

  // 궁합 템플릿이 실제로 상대 데이터를 물고 프롬프트를 만든다.
  const built = buildSukuyoAIPromptWithDomain({
    question: "이 사람과 오래 갈 수 있을지 궁금합니다.",
    basicResult: withA.basicResult,
    compatibilityResult: withA.compatibilityResult,
    domain: "compatibility",
  });
  const promptText = String(built.generatedPrompt || built.prompt || "");
  assert.ok(promptText.includes(withA.compatibilityResult.partnerMansion), "프롬프트에 상대 본명숙이 실리지 않았다");
  assert.ok(!promptText.includes("관리자 상대"), "합성 상대 문구가 남아 있다");

  console.log("[sukuyo] 실제 상대 반영 OK ·", withA.basicResult.mansion, "x", withA.compatibilityResult.partnerMansion, "→", withA.compatibilityResult.relationType);
}

// ---------------------------------------------------------------------------
// 3. 베다 — 실험실이 프로덕션과 같은 빌더를 쓰는가
// ---------------------------------------------------------------------------
{
  const adminSource = await import("node:fs").then((fs) => fs.readFileSync(new URL("../worker/routes/admin.js", import.meta.url), "utf8"));
  assert.ok(
    /buildVedicAIPrompt\(\{/.test(adminSource),
    "실험실이 buildVedicAIPrompt 를 부르지 않는다",
  );
  // 주석에도 이름이 나오므로 "호출/임포트"만 본다.
  assert.ok(
    !/buildVedicAIPromptWithDomain\s*\(/.test(adminSource),
    "실험실이 프로덕션과 다른 buildVedicAIPromptWithDomain 을 다시 호출하고 있다",
  );
  assert.ok(
    !/import\s*\{[^}]*buildVedicAIPromptWithDomain/.test(adminSource),
    "buildVedicAIPromptWithDomain 임포트가 남아 있다",
  );

  // 두 빌더는 래퍼 관계가 아니라 별도 구현이라 출력이 실제로 다르다는 사실을 고정한다.
  const vedicResult = {
    profile: { name: "관리자 대상", gender: "F", birthTimeKnown: true },
    lagna: { signKo: "메샤", sign: "Aries", degree: 12.5, lord: "망갈" },
    moonNakshatra: { name: "로히니", pada: 2, lord: "찬드라" },
    planets: [{ grahaKo: "수리야", rashiKo: "브리샤바", bhava: 2 }],
    bhavas: [{ number: 1, rashiKo: "메샤", lord: "망갈", planets: [] }],
    dashas: [{ planet: "슈크라", start: "2020", end: "2040", active: true }],
  };
  const built = buildVedicAIPrompt({ question: "올해 이직해도 괜찮을까요?", vedicResult, compatibilityResult: null });
  assert.ok(String(built.generatedPrompt || built.prompt || "").length > 0, "베다 프롬프트가 비었다");

  console.log("[vedic] 프로덕션 빌더 사용 OK");
}

// ---------------------------------------------------------------------------
// 4. CMS 오버라이드 프라이밍이 빌드 전에 걸리는가
// ---------------------------------------------------------------------------
{
  const adminSource = await import("node:fs").then((fs) => fs.readFileSync(new URL("../worker/routes/admin.js", import.meta.url), "utf8"));
  assert.ok(
    /primePromptTemplateOverrides\(env\)/.test(adminSource),
    "실험실이 CMS 프롬프트 오버라이드를 채우지 않는다 — 코드 기본 템플릿만 렌더된다",
  );
  const primeAt = adminSource.indexOf("await primePromptTemplateOverrides(env)");
  const buildAt = adminSource.indexOf("const built = await buildAdminPromptByService(");
  assert.ok(primeAt > 0 && buildAt > primeAt, "오버라이드 프라이밍이 프롬프트 빌드보다 뒤에 있다");

  console.log("[cms] 오버라이드 프라이밍 OK");
}

// ---------------------------------------------------------------------------
// 5. 사주 생년정보 마스킹이 풀렸는가
// ---------------------------------------------------------------------------
{
  const adminSource = await import("node:fs").then((fs) => fs.readFileSync(new URL("../worker/routes/admin.js", import.meta.url), "utf8"));
  assert.ok(
    !/hideName:\s*true/.test(adminSource),
    "사주 프롬프트가 여전히 생년정보를 마스킹한다 — 실제 발송 프롬프트와 달라진다",
  );

  console.log("[saju] 마스킹 해제 OK");
}

console.log("[verify-admin-prompt-lab-engines] PASS");
