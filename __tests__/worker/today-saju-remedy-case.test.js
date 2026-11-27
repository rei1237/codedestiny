/**
 * @jest-environment node
 */
// 오늘의 사주 상세의 액땜 섹션(remedyCase) 계약. 네트워크·DB·LLM 0.
// - 플래그 SAJU_REMEDY_FACTS_V1 의 today-saju 가 꺼져 있으면 응답이 예전과 바이트 단위로 같다.
// - 켜져 있으면 detail=1 개인 응답에만 한 번 붙고, 공개 응답·다른 로케일·영냥이 근거 경로에는 없다.
// - 액땜 계산이 던져도 섹션만 빠지고 나머지 상세는 그대로다.

import { jest } from "@jest/globals";

let throwRemedy = false;
let handleFortuneTodayRoutes;
let buildTodayFortunes;
let buildTodaySajuDetail;
let calculateLifeBookAiSaju;
let judgeSajuDayFortune;

beforeAll(async () => {
  const actualRemedy = await import("../../lib/saju/remedy/index.mjs");
  jest.unstable_mockModule("../../lib/saju/remedy/index.mjs", () => ({
    ...actualRemedy,
    computeRemedyCases: (...args) => {
      if (throwRemedy) throw new Error("remedy boom");
      return actualRemedy.computeRemedyCases(...args);
    },
  }));
  ({ handleFortuneTodayRoutes, buildTodayFortunes } = await import("../../worker/routes/fortune-today.js"));
  ({ buildTodaySajuDetail } = await import("../../worker/lib/today-saju-detail.js"));
  ({ calculateLifeBookAiSaju } = await import("../../worker/lib/life-book-ai-saju.js"));
  ({ judgeSajuDayFortune } = await import("../../worker/lib/saju-day-fortune.js"));
});

afterEach(() => {
  throwRemedy = false;
});

const PERSONAL = "?birth=1990-05-14&time=09:30&cal=solar&gender=female&detail=1";
const FLAG_ON = { SAJU_REMEDY_FACTS_V1: "today-saju" };

async function hubText(query, env) {
  const res = await handleFortuneTodayRoutes(new Request(`https://code-destiny.com/api/fortune/today-hub${query}`), env);
  expect(res.status).toBe(200);
  return res.text();
}

function sajuSections(text) {
  return JSON.parse(text).systems.saju.sections || [];
}

function withoutRemedyCase(text) {
  const body = JSON.parse(text);
  body.systems.saju.sections = body.systems.saju.sections.filter((section) => section.key !== "remedyCase");
  return JSON.stringify(body);
}

describe("buildTodaySajuDetail 액땜 섹션", () => {
  const NATAL = { birthDate: "1990-05-14", birthTime: "09:30", birthTimeUnknown: false, calendarType: "solar", gender: "female" };
  const TODAY_PILLAR = { stem: "辛", branch: "酉" };

  test("기준 해가 없으면 예전 상세와 같고, 있으면 처방 바로 뒤에 한 번 붙는다", () => {
    const natal = calculateLifeBookAiSaju(NATAL);
    const verdict = judgeSajuDayFortune(natal, TODAY_PILLAR);
    const before = buildTodaySajuDetail({ verdict, natal });
    const after = buildTodaySajuDetail({ verdict, natal, remedyYear: 2026 });

    expect(before.sections.some((section) => section.key === "remedyCase")).toBe(false);
    const keys = after.sections.map((section) => section.key);
    expect(keys.filter((key) => key === "remedyCase")).toHaveLength(1);
    expect(keys.indexOf("remedyCase")).toBe(keys.indexOf("remedy") + 1);
    const section = after.sections.find((item) => item.key === "remedyCase");
    expect(section.remedyCases.version).toBe("remedy-v1");
    expect(section.remedyCases.total).toBeGreaterThan(0);
    expect(JSON.stringify({ ...after, sections: after.sections.filter((item) => item.key !== "remedyCase") })).toBe(JSON.stringify(before));
  });
});

describe("today-hub 액땜 섹션 게이트", () => {
  test("플래그가 꺼져 있으면(다른 id 만 켜도) 응답이 바이트 단위로 같다", async () => {
    const off = await hubText(PERSONAL, {});
    const otherId = await hubText(PERSONAL, { SAJU_REMEDY_FACTS_V1: "new-year,heukwol" });
    expect(otherId).toBe(off);
    expect(sajuSections(off).some((section) => section.key === "remedyCase")).toBe(false);
  });

  test("켜면 detail=1 개인 응답에만 한 번 붙고, 그 섹션을 빼면 꺼진 응답과 같다", async () => {
    const off = await hubText(PERSONAL, {});
    const on = await hubText(PERSONAL, FLAG_ON);
    const remedyCases = sajuSections(on).filter((section) => section.key === "remedyCase");
    expect(remedyCases).toHaveLength(1);
    expect(remedyCases[0].remedyCases.valid).toBe(true);
    expect(withoutRemedyCase(on)).toBe(off);

    const summary = await hubText(PERSONAL.replace("&detail=1", ""), FLAG_ON);
    expect(summary).not.toContain("remedyCase");
  });

  test("켜도 공개 응답·다른 로케일·영냥이 근거 경로에는 없다", async () => {
    const publicDetail = await hubText("?detail=1", FLAG_ON);
    expect(publicDetail).not.toContain("remedyCase");

    const english = await hubText(`${PERSONAL}&locale=en`, FLAG_ON);
    expect(english).not.toContain("remedyCase");

    // 영냥이 자유질문 근거(worker/yeongnyangi/fortune/daily-cross.ts)는 remedy 옵션 없이 부른다.
    const now = new Date(Date.now() + 9 * 3600 * 1000);
    const today = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1, day: now.getUTCDate() };
    const input = { year: 1990, month: 5, day: 14, hour: 9, minute: 30, timeUnknown: false, birthDate: "1990-05-14", birthTime: "09:30", calendarType: "solar", gender: "female" };
    const cross = await buildTodayFortunes(FLAG_ON, input, today, { wantDetail: true });
    expect(JSON.stringify(cross.saju)).not.toContain("remedyCase");
  });

  test("액땜 계산이 던져도 섹션만 빠지고 나머지 상세는 그대로다", async () => {
    const off = await hubText(PERSONAL, {});
    throwRemedy = true;
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const broken = await hubText(PERSONAL, FLAG_ON);
      expect(broken).toBe(off);
      expect(warn.mock.calls.some(([tag]) => tag === "[today-saju-remedy-skip]")).toBe(true);
    } finally {
      warn.mockRestore();
    }
  });
});
