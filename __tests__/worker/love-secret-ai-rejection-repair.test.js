/**
 * 연애 비책 1-2 보정(2026-11-08 실호출 샘플 후속) — 반려 판정과 수리 지시.
 *
 * 첫 샘플에서 risk 그룹이 두 번 모두 반려돼 비었고, 사유는 어디에도 남지 않았다.
 * 이 파일은 그 원인 후보(부정형 조언 오판·/g lastIndex)와 사유 기록·표적 수리를 묶어 지킨다.
 */
import { createHash } from "node:crypto";
import {
  LOVE_SECRET_AI_GROUPS,
  LOVE_SECRET_AI_GROUPS_V1,
  buildLoveSecretGroupPrompt,
  buildLoveSecretGroupSystemPrompt,
  buildLoveSecretRejectionRepairLines,
  explainLoveSecretTextIssues,
  parseLoveSecretGroupResponse,
  scanConsultationTextIssues,
  __loveSecretAiPromptTestUtils,
} from "../../worker/lib/love-secret-ai-prompt.js";
import { hanbiLoveRegisterDrift, yeoniLoveRegisterDrift } from "../../worker/lib/expert-character-personas.js";

const { hasUnsafeAdvice, hasForbiddenResultText } = __loveSecretAiPromptTestUtils;
const risk = LOVE_SECRET_AI_GROUPS.find((group) => group.key === "risk");

function groupJson(group, bodyOf) {
  return JSON.stringify({ sections: group.sections.map((section, index) => ({ title: section.title, body: bodyOf(index) })) });
}

let seq = 0;
function prose(length) {
  let text = "";
  while (text.length < length) {
    seq += 1;
    text += `장면 ${seq}에서는 일간의 결이 관계의 속도를 정해요. `;
  }
  return text;
}

describe("부정형 조언은 위험 조언으로 반려하지 않는다", () => {
  test.each([
    "상대의 일상을 감시하지 마세요.",
    "감시하듯 확인하는 습관은 관계를 망쳐요.",
    "무조건 연락하기보다 하루를 두고 기다려 보세요.",
    "반드시 연락하려 들면 오히려 역효과가 나요.",
    "무조건 기다릴 필요는 없어요.",
  ])("%s", (sentence) => {
    expect(hasUnsafeAdvice(sentence)).toBe(false);
    expect(scanConsultationTextIssues(sentence)).toEqual([]);
  });

  test.each([
    "그 사람의 동선을 감시하면서 마음을 확인해 보세요.",
    "반드시 연락이 와요.",
    "무조건 붙잡으세요.",
  ])("단정·감시 권유는 그대로 걸린다: %s", (sentence) => {
    expect(hasUnsafeAdvice(sentence)).toBe(true);
  });
});

describe("금지·위험 패턴은 호출을 거듭해도 같은 판정을 낸다(/g lastIndex 회귀)", () => {
  test("같은 본문을 여러 번 검사해도 결과가 바뀌지 않는다", () => {
    const unsafe = "앞 문장이 길어요. 그 사람을 감시하면서 기다리세요.";
    const forbidden = "앞 문장이 길어요. 이 결과는 시스템이 만든 것이에요.";
    const verdicts = Array.from({ length: 5 }, () => [hasUnsafeAdvice(unsafe), hasForbiddenResultText(forbidden)]);
    expect(verdicts).toEqual(Array.from({ length: 5 }, () => [true, true]));
  });
});

describe("반려 사유와 걸린 문맥을 남기고 표적 수리 지시로 잇는다", () => {
  test("파서는 걸린 표현과 문맥을 flagged 로 돌려준다", () => {
    const text = groupJson(risk, (index) => `${prose(400)}${index === 1 ? "그 사람을 감시하면서 기다리세요. " : ""}${prose(200)}`);
    const parsed = parseLoveSecretGroupResponse(text, risk, { lengthRepair: true });
    expect(parsed.ok).toBe(false);
    expect(parsed.issues).toContain("UNSAFE_RELATIONSHIP_ADVICE");
    expect(parsed.flagged[0]).toMatchObject({ issue: "UNSAFE_RELATIONSHIP_ADVICE", phrase: "감시하" });
    expect(parsed.flagged[0].excerpt).toContain("감시하면서 기다리세요");
  });

  test("수리 지시는 걸린 표현을 이름으로 짚는다", () => {
    const flagged = explainLoveSecretTextIssues("그 사람을 감시하면서 기다리세요.");
    const lines = buildLoveSecretRejectionRepairLines({ reason: "UNSAFE_RELATIONSHIP_ADVICE", issues: ["UNSAFE_RELATIONSHIP_ADVICE"], flagged });
    expect(lines.join("\n")).toContain("'감시하'");
    expect(buildLoveSecretRejectionRepairLines(null)).toEqual([]);
  });

  test("마지막 시도(scrubUnsafe)는 걸린 문장만 덜어 내고 그룹을 살린다", () => {
    const text = groupJson(risk, (index) => `${prose(400)}${index === 0 ? "그 사람을 감시하면서 기다리세요. " : ""}${prose(200)}`);
    const parsed = parseLoveSecretGroupResponse(text, risk, { lengthRepair: true, scrubUnsafe: true });
    expect(parsed.ok).toBe(true);
    expect(parsed.scrubbed).toBe(1);
    expect(parsed.sections.map((section) => section.body).join("\n")).not.toContain("감시하면서");
  });
});

describe("V2 프롬프트 보정과 V1 보존", () => {
  const input = { myInfo: { name: "테스트" }, relationshipStatus: "썸", topic: "연락", userQuestion: "연락이 뜸해졌어요" };
  const saju = { facts: ["일간: 병화"] };

  test("V2 그룹은 섹션 최소 분량·해요체·숫자 금지·용어 풀이 규칙을 싣고, core 밖에서는 상황 반복을 막는다", () => {
    const prompts = Object.fromEntries(LOVE_SECRET_AI_GROUPS.map((group) => [group.key, buildLoveSecretGroupPrompt(input, saju, group)]));
    Object.values(prompts).forEach((prompt) => {
      expect(prompt).toMatch(/각 섹션의 body는 최소 \d+자/);
      expect(prompt).toContain("해요체");
      expect(prompt).toContain("'4.7점', '토 기운 4개' 금지");
      expect(prompt).toContain("귀문관살");
    });
    expect(prompts.core).not.toContain("상황(예: 연락이 뜸해졌다는 사정)을 다시 요약");
    ["nature", "self", "partner", "risk", "timing", "action"].forEach((key) => expect(prompts[key]).toContain("상황(예: 연락이 뜸해졌다는 사정)을 다시 요약"));
    expect(prompts.risk).not.toContain("감시·압박·집착은 어떤 경우에도 조언하지 않는다");
  });

  test("V1 그룹 프롬프트는 바이트 단위로 그대로다", () => {
    const joined = LOVE_SECRET_AI_GROUPS_V1.map((group) => buildLoveSecretGroupPrompt(input, saju, group)
      + "\n#SYS\n" + buildLoveSecretGroupSystemPrompt("BASE", group, "P")).join("\n=====\n");
    LOVE_SECRET_AI_GROUPS_V1.forEach((group) => expect(buildLoveSecretGroupPrompt(input, saju, group)).not.toContain("해요체"));
    // 게이트 테스트와 같은 입력이 아니므로 해시는 이 파일 고유값이다. V1 경로에 줄이 새면 바뀐다.
    expect(createHash("sha256").update(joined).digest("hex")).toBe(V1_HASH);
  });
});

describe("연애 비책 말투 점검은 합니다체 비율을 본다(로그·수리용)", () => {
  test("해요체는 통과, 합니다체가 많으면 hapnida", () => {
    expect(yeoniLoveRegisterDrift("답장이 늦어 마음이 쓰였죠. 정화라 감정이 먼저 달아올라요. 오늘은 안부 한 줄만 보내 보세요.")).toEqual([]);
    const formal = "두 분 사이에는 거리가 있습니다. 그 거리는 습관에서 생깁니다. 서운함은 말로 풀어야 합니다. 오늘은 한 줄만 보내 보세요.";
    expect(yeoniLoveRegisterDrift(formal)).toContain("hapnida");
    expect(hanbiLoveRegisterDrift(formal)).toContain("hapnida");
  });
});

// HEAD(96282eecc) 모듈로 같은 입력을 돌려 얻은 값과 같다.
const V1_HASH = "e7fb167d41de2ca131e5d1d8494c671d2a879e5a37a7da26520806a60039bbca";
