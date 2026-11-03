import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { appendInnateTemperamentPrompt, buildInnateTemperamentPromptLines } from "../worker/lib/innate-temperament-prompt.js";
import { expertSubchapterPromptLines } from "../worker/lib/expert-subchapter-prompt.js";
import { followupSolutionPromptLines } from "../worker/lib/followup-solution-prompt.js";
import { buildFortuneQuestionPromptPackage } from "../worker/lib/fortune-question-prompt.js";
import { buildFollowUpConsultationPrompt } from "../worker/lib/love-secret-ai-prompt.js";
import { buildNeoOperationRoomRefinedPrompt } from "../worker/lib/neo-operation-room-prompt.js";
import { __ziweiAiTestUtils } from "../worker/routes/ziwei-ai.js";

const fixtures = {
  saju: ["일간", "월지", "십성", "오행이 많다"],
  ziwei: ["명궁", "신궁", "삼방사정", "사화"],
  sukuyo: ["본명숙", "관계의 거리", "나크샤트라"],
  vedic: ["라그나", "달의 라시", "나크샤트라", "서양 점성술"],
  astrology: ["태양의 핵심 의지", "달의 감정적 안전 욕구", "상승점", "어스펙트"],
};

for (const [type, phrases] of Object.entries(fixtures)) {
  const text = buildInnateTemperamentPromptLines(type).join("\n");
  assert.ok(text.includes("[타고난 성향 정확도 계약]"), `${type}: 정확도 계약 마커 누락`);
  for (const phrase of phrases) assert.ok(text.includes(phrase), `${type}: ${phrase} 누락`);
  assert.ok(text.includes("생활 장면을 최소 하나"), `${type}: 생활 장면 계약 누락`);
  assert.ok(text.includes("실제 계산 근거 3개 이상"), `${type}: 내부 점검 계약 누락`);
  assert.ok(text.includes("뒤 장에서 반복 설명하지 말고"), `${type}: 중복 방지 계약 누락`);
}

const appended = appendInnateTemperamentPrompt("기본 프롬프트", "saju");
assert.equal((appended.match(/\[타고난 성향 정확도 계약\]/g) || []).length, 1);
assert.equal(appendInnateTemperamentPrompt(appended, "saju"), appended, "정확도 계약이 중복 삽입됨");

const packaged = buildFortuneQuestionPromptPackage({
  fortuneType: "vedic",
  fortuneLabel: "베다점",
  expertLabel: "베다 점성술사",
  userQuestion: "저의 타고난 성향과 반복되는 선택을 알려주세요.",
  analysisResult: { lagna: "테스트", moon: "테스트" },
  domainDataLines: ["라그나 테스트", "달 나크샤트라 테스트"],
});
assert.ok(packaged.generatedPrompt.includes("[타고난 성향 정확도 계약]"));
assert.ok(packaged.generatedPrompt.includes("1. 타고난 성향 총론"));
assert.ok(packaged.generatedPrompt.includes("9. 최종 조언"));
assert.ok(packaged.generatedPrompt.includes("[기본 운세 부가 상담 분량 규칙]"));
assert.ok(packaged.generatedPrompt.includes("챕터 수는 합치거나 빼거나 새로 만들지 말고 그대로 유지"));

const customPackaged = buildFortuneQuestionPromptPackage({
  fortuneType: "ziwei",
  fortuneLabel: "자미두수",
  expertLabel: "자미두수 상담가",
  userQuestion: "타고난 성향을 알려주세요.",
  analysisResult: {},
  customPrompt: "[답변 형식]\n1. 타고난 성향 총론\n2. 현재 질문에 대한 답\n3. 최종 조언",
});
assert.equal((customPackaged.generatedPrompt.match(/\[기본 운세 부가 상담 분량 규칙\]/g) || []).length, 1, "CMS 사용자 정의 프롬프트에 기본 운세 분량 계약 누락 또는 중복");
assert.equal((customPackaged.generatedPrompt.match(/\[타고난 성향 정확도 계약\]/g) || []).length, 1, "CMS 사용자 정의 프롬프트에 성향 계약 누락 또는 중복");

const { SECTION_GROUP_SPECS, buildSectionCharTargets, buildSectionGroupPrompt } = __ziweiAiTestUtils;
const flow = SECTION_GROUP_SPECS.find(group => group.id === "flow");
assert.ok(flow, "자미두수 flow 그룹 누락");
const targets = buildSectionCharTargets(flow);
assert.ok(targets.twelve_palaces > 0, "전문가 자미두수 12궁 챕터 분량이 제거됨");
assert.ok(Math.abs(Object.values(targets).reduce((sum, value) => sum + value, 0) - flow.targetChars) <= Object.keys(targets).length, "전문가 자미두수 목표 분량 배분 불일치");

const palaces = ["명궁", "형제궁", "부부궁", "자녀궁", "재백궁", "질액궁", "천이궁", "노복궁", "관록궁", "전택궁", "복덕궁", "부모궁"]
  .map((name, index) => ({ name, earthlyBranch: String(index), mainStars: name === "명궁" ? ["자미"] : [], assistantStars: [], maleficStars: [], brightness: name === "명궁" ? { 자미: "왕" } : {} }));
const prompt = buildSectionGroupPrompt({ birthInfo: {}, topic: "전체 명반 해석", userQuestion: "타고난 성향" }, {
  palaces,
  bodyPalace: "관록궁",
  fourTransformations: {},
  sanFangSiZheng: { byPalace: { 명궁: { palaceNames: ["명궁", "관록궁", "재백궁", "천이궁"] } } },
}, flow);
assert.ok(prompt.includes("앞 섹션이 이미 설명한 성향은 한 줄로만 연결"));

const expertContract = expertSubchapterPromptLines({ feature: "검증용 전문가 상담" }).join("\n");
assert.ok(expertContract.includes("상위 장 ID·제목·순서·개수와 기존 JSON 필드는 그대로 유지"));
assert.ok(expertContract.includes("2~6개의 소단락을 유동적으로 설계"));
assert.ok(expertContract.includes("같은 근거와 결론을 다른 소단락에서 다시 설명하지 않는다"));

const followupContract = followupSolutionPromptLines({ feature: "검증용 후속 상담" }).join("\n");
assert.ok(followupContract.includes("[추가 질문 해결 계약]"));
assert.ok(followupContract.includes("어떤 새 조건 때문에 수정되는지"));
assert.ok(followupContract.includes("가장 권하는 행동 하나"));
assert.ok(followupContract.includes("멈추거나 다시 판단할 관찰 신호"));

const loveFollowup = buildFollowUpConsultationPrompt({}, "지금 연락해도 될까요?");
assert.ok(loveFollowup.includes("[추가 질문 해결 계약]"));

const neoFollowup = buildNeoOperationRoomRefinedPrompt({ selectedMethod: "saju", question: "이직할까요?" }, { freeform: "제안이 들어왔습니다." });
assert.ok(neoFollowup.includes("[추가 질문 해결 계약]"));

const yeongnyangiFollowupSource = readFileSync(new URL("../worker/yeongnyangi/question-followup.ts", import.meta.url), "utf8");
assert.ok(yeongnyangiFollowupSource.includes("followupSolutionPromptText({feature:'영냥이 후속 상담'})"));

console.log("[verify:innate-temperament-prompts] PASS: 5개 체계 정확도, 전문가 소단락, 후속 질문 해결, 자미두수 분량 배분");
