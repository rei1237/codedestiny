/** @jest-environment node */
// 2026-11-08 판 2 도입 뒤에도 판 1(값 없는 진행 중 상담)이 받는 프롬프트 바이트는 그대로여야 한다. 모킹 없이 실제 빌더를 해시한다.
// 계산 context 에 현재 계절이 들어가므로 날짜를 고정한다.
import { jest } from "@jest/globals";
import { __sukuyoCompatibilityAiTestUtils as utils } from "../../worker/routes/sukuyo-compatibility-ai.js";

const BODY = {
  consultationType: "compatibility",
  personA: { name: "나", gender: "female", birthDate: "1993-07-21", calendarType: "solar" },
  personB: { name: "상대", gender: "male", birthDate: "1990-03-08", calendarType: "solar" },
  relationshipType: "연인",
  topic: "전체 궁합",
  question: "이 관계를 오래 이어가려면 무엇을 조심해야 할까요?",
};

afterEach(() => jest.useRealTimers());

it("V1 prompt bytes stay identical for in-flight sessions", async () => {
  const { createHash } = await import("node:crypto");
  const sha = text => createHash("sha256").update(String(text)).digest("hex");
  const input = utils.normalizeInput(BODY);
  const calculation = await utils.calculateSukuyo(input);
  jest.useFakeTimers({ now: new Date("2026-11-08T03:00:00Z"), doNotFake: ["nextTick", "setImmediate"] });
  const groups = Object.fromEntries(utils.SUKUYO_SECTION_GROUPS.map(group => [group.id, sha(utils.buildSectionGroupPrompt(input, calculation, group))]));
  const personal = utils.normalizeInput({ ...BODY, consultationType: "personal", personB: undefined });
  const hashes = {
    ...groups,
    summary: sha(utils.buildSummaryPrompt(input, calculation)),
    first: sha(utils.buildFirstPrompt(input, calculation)),
    personal: personal.ok ? sha(utils.buildFirstPrompt(personal, await utils.calculateSukuyo(personal))) : "invalid",
    system: sha(utils.SYSTEM_PROMPT),
    jsonSystem: sha(utils.COMPATIBILITY_JSON_SYSTEM_PROMPT),
  };
  expect(hashes).toEqual({
    essence: "b038ce75d3e6e02087980f6687900cc070087a8bd8477f881eac37579fe9f399",
    attraction: "ab1fcb2830f5c42043214f7f28592084e9fe5be9374d76f6a7269b5b444b350f",
    flow: "90f0b36c8e2d432094bfde6179f2229da8ce2beb1d52715759e3940d4c703f76",
    karma: "6d549f294c45e71aa44dd4448d6ba49f2eb6122315c89b9bc55de4b07c9bb551",
    outlook: "5875c300a726ca6959bd2e9cb24cd0d9fb5101fc8f5bd1bb793f2544c4538bf1",
    summary: "4d411eb94a1535d5ca078286bc787a93426954e884257337e45c16bcf3ba5bb7",
    first: "2bbaa81fbce4a196ee1d4d219c91aedbe27bcf567dba0ab9512dc2d635a31b6a",
    personal: "b7bab124de7f15bc897c47a83e0f68d0a6761f6a62199c23f560f0418b9141c8",
    system: "2df0f0a5adf68fd28f3ca7237df5582073ad2d013af321dab8a43029fc009d8e",
    jsonSystem: "2813c609bc68dffab1503919ad6520968580eed14330a857ed4a54df8ac0b1f9",
  });
});
