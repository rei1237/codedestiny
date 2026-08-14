/**
 * 인생의 책 · 인생 총운 — 섹션 병렬 생성의 계약 테스트.
 *
 * 이 파일이 지키는 것은 하나다: **섹션이 각자의 목표 분량만 채우면, 조립본이 품질 게이트를 통과한다.**
 * 이게 깨지면 섹션을 아무리 잘 생성해도 세션이 영원히 완료되지 않는다(2026-08-01 이전의 장애 형태).
 * 순수 함수만 검증하므로 모킹이 필요 없다.
 */
import { __lifeBookAiTestUtils } from "../../worker/routes/life-book-ai.js";

const {
  buildSectionPlan,
  buildSectionPrompt,
  pickSajuSlice,
  assembleReport,
  mapIssuesToSections,
  reportTotalContentChars,
  getLifeBookReportQualityIssues,
} = __lifeBookAiTestUtils;

const birthInfo = {
  name: "테스트",
  gender: "male",
  birthDate: "1990-05-15",
  birthTime: "08:30",
  birthTimeUnknown: false,
  calendarType: "solar",
};
const lifeFortuneInput = { consultationType: "lifeFortune", topic: "전체 인생 총운", birthInfo };
const lifeBookInput = { consultationType: "lifeBook", topic: "전체 인생 흐름", birthInfo };

/** 목표 분량을 채운 본문. 같은 문장이 장을 넘나들면 duplicate_narrative 에 걸리므로 장마다 다르게 만든다. */
function filler(seed, length) {
  const unit = `${seed} 일간과 월지, 오행과 조후, 십성의 작동을 함께 살피며 삶에서 드러나는 선택의 리듬을 차분히 짚습니다. `
    + `${seed} 대운과 세운이 열어 주는 때를 근거로 삼고, 관계와 일과 재물의 흐름을 조정할 방향을 남깁니다. `;
  return unit.repeat(Math.ceil(length / unit.length) + 1).slice(0, length);
}

/** 각 섹션이 targetChars 를 채웠을 때의 sections 맵. */
function buildSectionsAtTarget(plan, { scale = 1 } = {}) {
  const sections = {};
  for (const section of plan) {
    if (section.kind === "frame") {
      sections[section.id] = {
        id: section.id,
        kind: "frame",
        ok: true,
        attempts: 1,
        chars: 40,
        body: {
          title: section.title,
          subtitle: "타고난 명식과 시간의 흐름으로 읽는 삶의 큰 방향",
          profileSummary: {},
          coreSummary: { oneLine: "삶의 큰 줄기가 조용히 드러납니다.", lifeTheme: "균형과 전환", strongestElement: "계산 기반", neededBalance: "생활 리듬" },
          finalMessage: "당신의 다음 장은 조용하지만 분명하게 열립니다.",
        },
      };
      continue;
    }
    const content = filler(`${section.id}`, Math.round(section.targetChars * scale));
    const body = section.kind === "expert"
      ? {
        title: section.title,
        content,
        guidance: ["강한 기운은 쓰임을 분명히 하세요.", "부족한 기운은 생활의 순서로 보완하세요."],
        evidenceRefs: [...section.evidenceRefs],
      }
      : {
        chapterNumber: section.index + 1,
        title: section.title,
        summary: `${section.index + 1}장의 핵심 흐름이 한 문장으로 머무릅니다.`,
        content,
        advice: ["오늘 붙잡을 선택을 작게 정리하세요.", "관계와 생활의 리듬을 서두르지 마세요.", "우선순위를 다시 세우세요."],
        evidenceRefs: [...section.evidenceRefs],
      };
    sections[section.id] = { id: section.id, kind: section.kind, ok: true, attempts: 1, chars: content.length, body };
  }
  return sections;
}

describe("섹션 계획", () => {
  test("두 상품 모두 15섹션(장 10 + 깊은 판독 4 + 프레임 1)이다", () => {
    for (const input of [lifeFortuneInput, lifeBookInput]) {
      const plan = buildSectionPlan(input);
      expect(plan).toHaveLength(15);
      expect(plan.filter((s) => s.kind === "chapter")).toHaveLength(10);
      expect(plan.filter((s) => s.kind === "expert")).toHaveLength(4);
      expect(plan.filter((s) => s.kind === "frame")).toHaveLength(1);
    }
  });

  test("한 웨이브(동시성 4)가 엣지 예산 안에 들어오도록 섹션 토큰 상한이 잡혀 있다", () => {
    // gemini-2.5-flash 비스트리밍 ≈200 tok/s. 섹션 상한이 45초(=9,000토큰)를 넘으면
    // 섹션 타임아웃이 상시 발생해 웨이브가 영원히 끝나지 않는다.
    for (const section of buildSectionPlan(lifeFortuneInput)) {
      expect(section.maxOutputTokens).toBeLessThanOrEqual(10000);
    }
  });

  test("총운 섹션 목표 합계가 요구 분량(30,000~60,000자) 안에 있다", () => {
    const plan = buildSectionPlan(lifeFortuneInput);
    const total = plan.reduce((sum, s) => sum + s.targetChars, 0);
    expect(total).toBeGreaterThanOrEqual(30000);
    expect(total).toBeLessThanOrEqual(60000);
  });

  test("인생의 책 섹션 목표 합계가 요구 분량(15,000~26,000자) 안에 있다", () => {
    const plan = buildSectionPlan(lifeBookInput);
    const total = plan.reduce((sum, s) => sum + s.targetChars, 0);
    expect(total).toBeGreaterThanOrEqual(15000);
    expect(total).toBeLessThanOrEqual(26000);
  });
});

describe("조립본이 품질 게이트를 통과한다", () => {
  test("총운: 각 섹션이 목표를 채우면 이슈가 0이다", () => {
    const plan = buildSectionPlan(lifeFortuneInput);
    const report = assembleReport(lifeFortuneInput, plan, buildSectionsAtTarget(plan));
    const issues = getLifeBookReportQualityIssues(JSON.stringify(report), lifeFortuneInput);
    expect(issues).toEqual([]);
  });

  test("인생의 책: 각 섹션이 목표를 채우면 이슈가 0이다", () => {
    const plan = buildSectionPlan(lifeBookInput);
    const report = assembleReport(lifeBookInput, plan, buildSectionsAtTarget(plan));
    const issues = getLifeBookReportQualityIssues(JSON.stringify(report), lifeBookInput);
    expect(issues).toEqual([]);
  });

  test("총운 조립본은 30,000자 하한을 실제로 넘는다", () => {
    const plan = buildSectionPlan(lifeFortuneInput);
    const report = assembleReport(lifeFortuneInput, plan, buildSectionsAtTarget(plan));
    expect(reportTotalContentChars(report)).toBeGreaterThanOrEqual(30000);
  });
});

describe("결손은 책임 섹션에만 매핑된다", () => {
  test("3장만 짧으면 chapter-3 만 다시 쓴다 (전체 재생성 금지)", () => {
    const plan = buildSectionPlan(lifeFortuneInput);
    const sections = buildSectionsAtTarget(plan);
    sections["chapter-3"] = { ...sections["chapter-3"], body: { ...sections["chapter-3"].body, content: filler("chapter-3", 300) }, chars: 300 };
    const report = assembleReport(lifeFortuneInput, plan, sections);
    const issues = getLifeBookReportQualityIssues(JSON.stringify(report), lifeFortuneInput);
    expect(issues).toContain("chapter_3_content_too_short");
    expect(mapIssuesToSections(issues, plan, sections).targets).toContain("chapter-3");
  });

  test("깊은 판독 2의 evidenceRefs 결손은 expert-2 로 매핑된다", () => {
    const plan = buildSectionPlan(lifeFortuneInput);
    const sections = buildSectionsAtTarget(plan);
    sections["expert-2"] = { ...sections["expert-2"], body: { ...sections["expert-2"].body, evidenceRefs: [] } };
    const report = assembleReport(lifeFortuneInput, plan, sections);
    const issues = getLifeBookReportQualityIssues(JSON.stringify(report), lifeFortuneInput);
    expect(issues).toContain("expert_reading_2_evidence_refs_missing");
    expect(mapIssuesToSections(issues, plan, sections).targets).toEqual(["expert-2"]);
  });

  test("분량 초과는 재생성 대상이 아니라 절단(trimOnly)으로 해소한다", () => {
    const plan = buildSectionPlan(lifeFortuneInput);
    const sections = buildSectionsAtTarget(plan, { scale: 2.4 });
    const report = assembleReport(lifeFortuneInput, plan, sections);
    const issues = getLifeBookReportQualityIssues(JSON.stringify(report), lifeFortuneInput);
    expect(issues).toContain("total_content_too_long");
    const mapped = mapIssuesToSections(issues, plan, sections);
    expect(mapped.trimOnly).toBe(true);
  });
});

describe("사주 슬라이스", () => {
  test("섹션이 참조하는 루트만 실어 보내 입력 토큰을 줄인다", () => {
    const saju = {
      dayMaster: "경",
      monthPillar: "신사",
      seasonalBalance: { monthBranch: "사" },
      majorLuck: { cycles: new Array(10).fill({ pillar: "무자" }) },
      yearlyLuck: new Array(5).fill({ year: 2026 }),
      fortuneFacts: { readingBase: { dayMaster: "경" } },
    };
    const slice = pickSajuSlice(saju, ["dayMaster", "monthPillar", "seasonalBalance"]);
    expect(slice.dayMaster).toBe("경");
    expect(slice.majorLuck).toBeUndefined();
    expect(JSON.stringify(slice).length).toBeLessThan(JSON.stringify(saju).length);
  });
});

describe("섹션 프롬프트", () => {
  test("한 조각만 요청하고 다른 장을 쓰지 말라고 명시한다", () => {
    const plan = buildSectionPlan(lifeFortuneInput);
    const prompt = buildSectionPrompt(lifeFortuneInput, {}, plan[0], "");
    expect(prompt).toContain("다른 장은 쓰지 마세요");
    expect(prompt).toContain(plan[0].title);
  });

  test("digest 가 있으면 중복 금지 지시를 함께 싣는다", () => {
    const plan = buildSectionPlan(lifeFortuneInput);
    const prompt = buildSectionPrompt(lifeFortuneInput, {}, plan[1], "- 1장: 앞 문장");
    expect(prompt).toContain("같은 문장·같은 결론을 반복하지 마세요");
  });
});
