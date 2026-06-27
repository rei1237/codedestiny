/**
 * @jest-environment node
 */

const { execFileSync } = require("child_process");

function runModuleCheck(expression) {
  const source = `
    import { normalizeDuplicatedSubjectParticles } from "./lib/tarot/myeongri-tarot-text-utils.mjs";
    import { getNumerologyTarotCardMeaning } from "./lib/tarot/numerology-tarot.mjs";
    const result = ${expression};
    process.stdout.write(JSON.stringify(result));
  `;
  return JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", source], {
    cwd: process.cwd(),
    encoding: "utf8",
  }));
}

describe("numerology and myeongri tarot text quality", () => {
  test("removes duplicated ten-god and card subjects with Korean particles", () => {
    const result = runModuleCheck(`[
      normalizeDuplicatedSubjectParticles("편인은 편인은 집중력 분산과 엉뚱한 해석을 경계하게 합니다."),
      normalizeDuplicatedSubjectParticles("정관은 정관은 책임과 규칙을 다시 세우라고 말합니다."),
      normalizeDuplicatedSubjectParticles("상관은 상관은 표현 방식을 다듬으라고 말합니다."),
      normalizeDuplicatedSubjectParticles("The Moon은 The Moon은 불안을 드러냅니다."),
      normalizeDuplicatedSubjectParticles("바보 카드는 바보 카드는 새로운 시작을 비춥니다.")
    ]`);

    expect(result).toEqual([
      "편인은 집중력 분산과 엉뚱한 해석을 경계하게 합니다.",
      "정관은 책임과 규칙을 다시 세우라고 말합니다.",
      "상관은 표현 방식을 다듬으라고 말합니다.",
      "The Moon은 불안을 드러냅니다.",
      "바보 카드는 새로운 시작을 비춥니다.",
    ]);
  });

  test("keeps meaningful non-identical repetition intact", () => {
    const result = runModuleCheck(`[
      normalizeDuplicatedSubjectParticles("마음은 마음이고 선택은 선택입니다."),
      normalizeDuplicatedSubjectParticles("믿음은 믿음대로, 현실은 현실대로 보아야 합니다.")
    ]`);

    expect(result).toEqual([
      "마음은 마음이고 선택은 선택입니다.",
      "믿음은 믿음대로, 현실은 현실대로 보아야 합니다.",
    ]);
  });

  test("uses only selected orientation keywords for The Fool", () => {
    const result = runModuleCheck(`({
      upright: getNumerologyTarotCardMeaning(0, "upright", "general"),
      reversed: getNumerologyTarotCardMeaning(0, "reversed", "general")
    })`);

    expect(result.upright.nameEn).toBe("The Fool");
    expect(result.upright.selectedKeywords).toContain("새 출발");
    expect(result.upright.selectedKeywords).not.toContain("무모함");
    expect(result.reversed.selectedKeywords).toContain("무모함");
    expect(result.reversed.selectedKeywords).not.toContain("새 출발");
  });

  test("does not mix The Sun meaning into The Moon", () => {
    const moon = runModuleCheck(`getNumerologyTarotCardMeaning(18, "upright", "general")`);
    const moonText = [moon.nameEn, moon.nameKo, moon.selectedKeywords.join(" "), moon.topicMeaning].join(" ");

    expect(moon.nameEn).toBe("The Moon");
    expect(moonText).toContain("불안");
    expect(moonText).not.toContain("태양");
    expect(moonText).not.toContain("성공");
    expect(moonText).not.toContain("활력");
  });

  test("prioritizes topic-specific meaning buckets", () => {
    const result = runModuleCheck(`({
      love: getNumerologyTarotCardMeaning(0, "upright", "love"),
      career: getNumerologyTarotCardMeaning(0, "upright", "career"),
      money: getNumerologyTarotCardMeaning(0, "upright", "money")
    })`);

    expect(result.love.topicKey).toBe("love");
    expect(result.love.topicMeaning).toContain("인연");
    expect(result.career.topicKey).toBe("career");
    expect(result.career.topicMeaning).toContain("도전");
    expect(result.money.topicKey).toBe("money");
    expect(result.money.topicMeaning).toContain("수입원");
  });
});
