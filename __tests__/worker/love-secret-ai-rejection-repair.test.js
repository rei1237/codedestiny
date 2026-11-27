/**
 * 연애 비책 1-2 보정(2026-11-08 실호출 샘플 후속) — 반려 판정과 수리 지시.
 *
 * 첫 샘플에서 risk 그룹이 두 번 모두 반려돼 비었고, 사유는 어디에도 남지 않았다.
 * 이 파일은 그 원인 후보(부정형 조언 오판·/g lastIndex)와 사유 기록·표적 수리를 묶어 지킨다.
 */
import { createHash } from "node:crypto";
import {
  LOVE_SECRET_AI_GROUP_MIN_CHARS,
  LOVE_SECRET_AI_GROUPS,
  LOVE_SECRET_AI_GROUPS_V1,
  buildLoveSecretGroupPrompt,
  buildLoveSecretGroupSystemPrompt,
  buildLoveSecretRejectionRepairLines,
  explainLoveSecretTextIssues,
  isLoveSecretComplete,
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

  // 2026-11-18 S3-F → S16(2026-11-19): 2회차부터 되풀이 문장을 덜어 내고 받는다. 단 필수 섹션이 하나라도 비면 받지 않는다
  // (완성 판정 isLoveSecretComplete 를 못 넘는 그룹은 전달하지 않고 다시 쓴다).
  const repeated = "같은 위로 문장이 두 번 나오면 반복 문장으로 걸리는 긴 문장이에요.";
  test("salvage 는 되풀이 문장을 덜어 내고 모든 섹션이 남은 그룹을 살린다", () => {
    const text = groupJson(risk, (index) => `${prose(index === 0 ? 2400 : 500)}${repeated} ${prose(100)}${repeated} `);
    const strict = parseLoveSecretGroupResponse(text, risk, { lengthRepair: true, scrubUnsafe: true });
    expect(strict.ok).toBe(false);
    expect(strict.issues).toEqual(expect.arrayContaining(["REPEATED_PASSAGE"]));
    const parsed = parseLoveSecretGroupResponse(text, risk, { lengthRepair: true, scrubUnsafe: true, salvage: true });
    expect(parsed.ok).toBe(true);
    expect(parsed.salvaged).toBe(true);
    const body = parsed.sections.map((section) => section.body).join(" ");
    expect(body.split(repeated).length - 1).toBe(1);
    expect(risk.sections.every((section) => parsed.sections.some((row) => row.title === section.title && row.body.trim()))).toBe(true);
    expect(isLoveSecretComplete([parsed], [risk])).toBe(true);
  });

  test("salvage 여도 필수 섹션이 비면 살리지 않는다(빈 섹션을 뺀 축소 그룹 없음)", () => {
    const text = groupJson(risk, (index) => (index === 1 ? "" : `${prose(index === 0 ? 2400 : 500)}${repeated} ${prose(100)}${repeated} `));
    const parsed = parseLoveSecretGroupResponse(text, risk, { lengthRepair: true, scrubUnsafe: true, salvage: true });
    expect(parsed.ok).toBe(false);
  });

  test("salvage 하한은 중간 시도 그룹 하한의 0.6배, 마지막 시도 0.3배다", () => {
    const text = groupJson(risk, () => `${prose(420)}${repeated} ${prose(80)}${repeated} `);
    const last = parseLoveSecretGroupResponse(text, risk, { lengthRepair: true, scrubUnsafe: true, salvage: true, salvageFloorRatio: 0.3 });
    expect(last.ok).toBe(true);
    expect(last.chars).toBeGreaterThanOrEqual(1500);
    expect(last.chars).toBeLessThan(3000);
    const middle = parseLoveSecretGroupResponse(text, risk, { lengthRepair: true, scrubUnsafe: true, salvage: true, salvageFloorRatio: 0.6 });
    expect(middle.ok).toBe(false);
  });

  test("salvage 여도 금지·위험 표현이 남거나 본문이 너무 적으면 살리지 않는다", () => {
    const unsafe = groupJson(risk, () => `${prose(900)}그 사람을 감시하면서 기다리세요. `);
    expect(parseLoveSecretGroupResponse(unsafe, risk, { lengthRepair: true, salvage: true }).ok).toBe(false);
    const thin = groupJson(risk, (index) => (index === 0 ? prose(300) : ""));
    expect(parseLoveSecretGroupResponse(thin, risk, { lengthRepair: true, scrubUnsafe: true, salvage: true }).ok).toBe(false);
  });
});

// 2026-11-27: 하드 한도 마지막 시도(lastChance)는 다음 시도가 없으므로 비지 않은 본문을 분량·되풀이로 거부하지 않는다.
describe("🔴 하드 한도 마지막 시도(lastChance)는 비지 않은 본문을 전달한다", () => {
  const repeated = "같은 위로 문장이 두 번 나오면 반복 문장으로 걸리는 긴 문장이에요.";
  const lastChance = { lengthRepair: true, scrubUnsafe: true, salvage: true, salvageFloorRatio: 0.3, lastChance: true };

  test("salvage 하한(0.3배) 아래의 짧은 본문과 되풀이 본문도 받고 shortAccepted 를 남긴다", () => {
    const text = groupJson(risk, () => `${prose(120)}${repeated} ${prose(40)}${repeated} `);
    const salvage = parseLoveSecretGroupResponse(text, risk, { lengthRepair: true, scrubUnsafe: true, salvage: true, salvageFloorRatio: 0.3 });
    expect(salvage.ok).toBe(false);
    const parsed = parseLoveSecretGroupResponse(text, risk, lastChance);
    expect(parsed.ok).toBe(true);
    expect(parsed.shortAccepted).toBe(true);
    expect(parsed.chars).toBeLessThan(Math.round(LOVE_SECRET_AI_GROUP_MIN_CHARS * 0.3));
    const body = parsed.sections.map((section) => section.body).join(" ");
    expect(body.split(repeated).length - 1).toBe(1);
    expect(isLoveSecretComplete([parsed], [risk])).toBe(true);
  });

  test("문자열이 아닌 섹션 본문은 그 섹션만 버린다 — 필수 섹션이 다 남으면 받고, 빠지면 거부한다", () => {
    const sections = risk.sections.map((section) => ({ title: section.title, body: prose(300) }));
    const extraBad = JSON.stringify({ sections: [...sections, { title: "덤", body: { nested: true } }] });
    expect(parseLoveSecretGroupResponse(extraBad, risk, { lengthRepair: true, scrubUnsafe: true, salvage: true }).reason).toBe("INVALID_SECTION_BODY");
    const accepted = parseLoveSecretGroupResponse(extraBad, risk, lastChance);
    expect(accepted.ok).toBe(true);
    expect(accepted.sections.some((section) => section.title === "덤")).toBe(false);
    const requiredBad = JSON.stringify({ sections: sections.map((section, index) => (index === 1 ? { title: section.title, body: 42 } : section)) });
    expect(parseLoveSecretGroupResponse(requiredBad, risk, lastChance).ok).toBe(false);
  });

  test("lastChance 여도 필수 섹션이 비거나 금지·위험 표현이 남으면 거부한다", () => {
    const oneEmpty = groupJson(risk, (index) => (index === 1 ? "" : prose(300)));
    expect(parseLoveSecretGroupResponse(oneEmpty, risk, lastChance).ok).toBe(false);
    const unsafe = groupJson(risk, () => `${prose(300)}그 사람을 감시하면서 기다리세요. `);
    expect(parseLoveSecretGroupResponse(unsafe, risk, { ...lastChance, scrubUnsafe: false }).ok).toBe(false);
    expect(parseLoveSecretGroupResponse("", risk, lastChance).ok).toBe(false);
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

// HEAD(96282eecc) 모듈로 같은 입력을 돌려 얻은 값에서 2026-11-27 목표 분량 하향(분량 줄)만 반영했다.
const V1_HASH = "84172da8ce7c187a5b18758714c47d87e630e1ce3290af3ceb42839cd0d5baf8";
