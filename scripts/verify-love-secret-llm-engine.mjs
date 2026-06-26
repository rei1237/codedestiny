import assert from "node:assert/strict";

import {
  LOVE_SECRET_COMPATIBILITY_CHAPTERS,
  LOVE_SECRET_SOLO_CHAPTERS,
  resolveLoveSecretPremiumChapterPlan,
} from "../worker/lib/pdf-v2/love-secret/love-secret-premium.chapter-plan.js";
import { buildLoveSecretPremiumChapterCacheKey } from "../worker/lib/pdf-v2/love-secret/generate-love-secret-premium-report.js";
import { assembleLoveSecretPremiumHtml } from "../worker/lib/pdf-v2/love-secret/love-secret-premium-html-builder.js";
import { validateLoveSecretPremiumChapterHtml } from "../worker/lib/pdf-v2/love-secret/love-secret-premium.validator.js";
import { __loveSecretTestUtils } from "../worker/routes/saju-love-secret.js";

function longSentence(seed) {
  return `${seed} 사주 원국의 흐름은 사랑을 시작할 때 마음의 속도와 현실의 기준을 함께 보라고 가리킵니다. 감정이 먼저 움직이더라도 관계가 오래 머무르려면 표현의 온도, 상대의 반응, 생활 리듬을 함께 살피는 편이 좋습니다. 상담형 해석은 불안을 키우기보다 지금 확인 가능한 신호 안에서 선택의 기준을 세우는 데 초점을 둡니다. `;
}

function chapterHtml(chapter, mode) {
  const perspectives = mode === "compatibility"
    ? "두 사람의 차이와 관계 리스크를 함께 살피며 실전 조언으로 정리합니다."
    : "상담형 해석과 주의점을 함께 살피며 실전 조언으로 정리합니다.";
  const body = Array.from({ length: 5 }, (_, index) => {
    const seed = `${chapter.id}-${index + 1}`;
    return `<p>${perspectives} ${longSentence(seed).repeat(3)}</p>`;
  }).join("\n");
  return `<section class="love-secret-chapter" data-chapter-id="${chapter.id}">
  <h2>${chapter.title}</h2>
  <div class="chapter-summary">
    <p>${chapter.id}의 핵심은 감정의 흐름을 단정하지 않고 현실의 행동으로 옮기는 데 있습니다. ${perspectives}</p>
  </div>
  <div class="chapter-body">
    ${body}
  </div>
  <div class="chapter-advice">
    <h3>연애 비책</h3>
    <ul>
      <li>${chapter.id} 조언 1은 감정이 올라오는 순간 바로 결론을 내리지 않는 것입니다.</li>
      <li>${chapter.id} 조언 2는 상대의 반응을 확인하고 표현의 속도를 조율하는 것입니다.</li>
      <li>${chapter.id} 조언 3은 관계를 살리는 행동을 작게 정해 반복하는 것입니다.</li>
    </ul>
  </div>
</section>`;
}

function normalizedInput(mode) {
  const base = {
    mode,
    userProfile: { name: "의뢰인", birthDate: "1994-08-16", birthTime: "12:00", calendarType: "solar" },
    saju: { dayMaster: "갑목", pillars: { year: "갑술", month: "임신", day: "갑자", hour: "경오" } },
    love: { currentConcern: "나에게 맞는 사랑의 방향", relationshipStatus: mode === "compatibility" ? "관계 확인 중" : "솔로" },
    luck: { yearLuck: "병오년", loveWindow: "봄부터 여름" },
  };
  if (mode === "compatibility") {
    base.partnerProfile = { name: "상대", birthDate: "1993-04-22", birthTime: "09:30", calendarType: "solar" };
    base.compatibility = {
      partnerSaju: { dayMaster: "정화", pillars: { year: "계유", month: "병진", day: "정묘", hour: "을사" } },
      emotionalMatch: "감정 속도 차이가 있으나 조율 가능",
    };
  }
  return base;
}

function verifyPlan() {
  const solo = resolveLoveSecretPremiumChapterPlan({ mode: "single" });
  const compatibility = resolveLoveSecretPremiumChapterPlan({ mode: "couple" });
  assert.equal(solo.chapters.length, 10);
  assert.deepEqual(solo.chapters.map((chapter) => chapter.id), LOVE_SECRET_SOLO_CHAPTERS.map((chapter) => chapter.id));
  assert.equal(compatibility.chapters.length, 13);
  assert.deepEqual(compatibility.chapters.map((chapter) => chapter.id), LOVE_SECRET_COMPATIBILITY_CHAPTERS.map((chapter) => chapter.id));
}

function verifyChapterHtml(mode) {
  const plan = resolveLoveSecretPremiumChapterPlan({ mode });
  const chapter = plan.chapters[0];
  const validation = validateLoveSecretPremiumChapterHtml(chapterHtml(chapter, mode), chapter);
  assert.equal(validation.ok, true, validation.errors.join(","));
}

function verifyFinalHtml(mode) {
  const plan = resolveLoveSecretPremiumChapterPlan({ mode });
  const chapters = plan.chapters.map((chapter) => ({
    ...chapter,
    html: chapterHtml(chapter, mode),
    text: `${chapter.title} ${chapter.purpose}`,
    status: "completed",
    source: "llm",
  }));
  const html = assembleLoveSecretPremiumHtml({ input: normalizedInput(mode), chapters, reportId: `verify-${mode}` });
  const ids = [...html.matchAll(/data-chapter-id="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, plan.chapters.length);
  assert.deepEqual(ids, plan.chapters.map((chapter) => chapter.id));
  assert.equal(html.includes("본 리포트는 사주 명리학과 연애 상담 관점을 결합한 엔터테인먼트·자기이해 목적의 콘텐츠입니다."), true);
}

function verifyCacheKeys() {
  const soloInput = normalizedInput("solo");
  const compatibilityInput = normalizedInput("compatibility");
  const soloKey = buildLoveSecretPremiumChapterCacheKey({
    normalizedInput: soloInput,
    chapterId: "solo-01",
    modelName: "verify-model",
    chapterPlanVersion: "verify-plan",
  });
  const soloSecondKey = buildLoveSecretPremiumChapterCacheKey({
    normalizedInput: soloInput,
    chapterId: "solo-02",
    modelName: "verify-model",
    chapterPlanVersion: "verify-plan",
  });
  const compatibilityKey = buildLoveSecretPremiumChapterCacheKey({
    normalizedInput: compatibilityInput,
    chapterId: "compat-01",
    modelName: "verify-model",
    chapterPlanVersion: "verify-plan",
  });
  assert.notEqual(soloKey, soloSecondKey);
  assert.notEqual(soloKey, compatibilityKey);
  assert.match(soloKey, /^love-secret:2026-06-love-secret-llm-v1:chapter:/);
}

function verifyProgress() {
  const { toPublicJobPayload } = __loveSecretTestUtils;
  assert.equal(toPublicJobPayload({ status: "pending", chapterCount: 10, completedChapters: 0 }).progress, 0);
  assert.equal(toPublicJobPayload({ status: "validating", chapterCount: 10, completedChapters: 0 }).progress, 5);
  assert.equal(toPublicJobPayload({ status: "generating", chapterCount: 10, completedChapters: 10 }).progress, 80);
  assert.equal(toPublicJobPayload({ status: "rendering", chapterCount: 13, completedChapters: 13 }).progress, 90);
  assert.equal(toPublicJobPayload({ status: "completed", chapterCount: 13, completedChapters: 13 }).progress, 100);
  assert.equal(toPublicJobPayload({ status: "failed", chapterCount: 13, completedChapters: 2, progress: 24 }).failed, true);
}

verifyPlan();
verifyChapterHtml("solo");
verifyChapterHtml("compatibility");
verifyFinalHtml("solo");
verifyFinalHtml("compatibility");
verifyCacheKeys();
verifyProgress();

console.log("love-secret llm engine contract ok");
