/**
 * 네오 팩폭 작전실 — 자미두수 궁합(상대 명반 동반) 모드.
 *
 * 이 스위트가 지키는 것은 두 가지다.
 *  1) 상대가 없으면 기존 1인 경로가 **글자 하나 다르지 않게** 그대로 돈다.
 *  2) 상대가 있으면 궁합이 실제로 계산되고, 그 값이 프롬프트가 보는 확정값 표까지 흘러간다.
 *
 * 계산 엔진은 순수 함수라 모킹이 필요 없다.
 */
import { calculateZiweiAiChart } from "../../worker/lib/ziwei-ai-chart.js";
import {
  buildNeoCompatScores,
  buildNeoZiweiCompat,
  NEO_RELATIONSHIP_STATUSES,
  neoRelationshipStatusFocus,
  neoRelationshipStatusLabel,
} from "../../worker/lib/neo-operation-room-compat.js";
import { buildNeoBasisPayload } from "../../worker/lib/neo-operation-room-basis.js";
import {
  NEO_COMPAT_INITIAL_SECTIONS,
  NEO_INITIAL_SECTIONS,
  buildNeoInitialSectionPrompt,
  mergeNeoInitialSections,
} from "../../worker/lib/neo-operation-room-prompt.js";
import { buildMasterLoveCodexCompatibility, buildZiweiLoveCompatibility } from "../../worker/lib/master-love-codex-compat.js";
import { calculateLifeBookAiSaju } from "../../worker/lib/life-book-ai-saju.js";

const ME = { birthDate: "1990-03-15", birthTime: "08:30", gender: "female", calendarType: "solar" };
const PARTNER = { birthDate: "1988-11-02", birthTime: "21:10", gender: "male", calendarType: "solar" };
const PARTNER_NO_TIME = { birthDate: "1988-11-02", birthTimeUnknown: true, gender: "male", calendarType: "solar" };

const chartOf = (birthInfo) => calculateZiweiAiChart({ birthInfo }, { year: 2026 });

function compatOf(partner = PARTNER, relationshipStatus = "reconciling") {
  return buildNeoZiweiCompat({
    selfChart: chartOf(ME),
    partnerChart: chartOf(partner),
    relationshipStatus,
    partnerGender: partner.gender,
  });
}

describe("궁합 계산", () => {
  test("두 명반에서 점수 4종이 나오고 전부 0~100 범위다", () => {
    const { scores } = compatOf();
    for (const key of ["overall", "resonance", "friction", "growth"]) {
      expect(Number.isInteger(scores[key])).toBe(true);
      expect(scores[key]).toBeGreaterThanOrEqual(0);
      expect(scores[key]).toBeLessThanOrEqual(100);
    }
  });

  test("종합 점수는 3축 평균이고 마찰만 뒤집는다", () => {
    // 🔴 이 공식이 화면 고지 문구("공명·마찰·성장 3축의 평균")와 같은 것이어야 한다.
    expect(buildNeoCompatScores({ resonance: 80, friction: 20, growth: 60 })).toEqual({
      overall: 73, // (80 + 80 + 60) / 3
      resonance: 80,
      friction: 20,
      growth: 60,
    });
  });

  test("같은 입력이면 같은 결과다(결정론)", () => {
    expect(JSON.stringify(compatOf())).toBe(JSON.stringify(compatOf()));
  });

  test("교차 판독은 label/value 쌍으로 나온다 — 한 문자열로 합치면 표에서 잘린다", () => {
    const { highlights } = compatOf();
    expect(highlights.length).toBeGreaterThan(0);
    for (const entry of highlights) {
      expect(typeof entry.label).toBe("string");
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.value.length).toBeGreaterThan(0);
      // basisItem 의 값 상한(300자)에 걸리지 않아야 한다.
      expect(entry.value.length).toBeLessThanOrEqual(300);
    }
  });

  test("상대 명궁은 지지까지 표기한다 — 궁 이름만이면 항상 '명궁'이라 근거가 못 된다", () => {
    expect(compatOf().partnerDigest.mingGong).toMatch(/^명궁\(.+궁\)$/);
  });

  test("상대 출생시간 미상이면 플래그가 서고 계산은 정오 기준으로 진행된다", () => {
    const compat = compatOf(PARTNER_NO_TIME);
    expect(compat.uncertainty.partnerBirthTimeUnknown).toBe(true);
    expect(compat.uncertainty.selfBirthTimeUnknown).toBe(false);
    expect(compat.scores.overall).toBeGreaterThan(0);
  });

  test("원시 교차 구조를 페이로드에 싣지 않는다(키 누출·문서 비대 방지)", () => {
    const compat = compatOf();
    for (const key of ["palaceOverlay", "spouseCross", "maleficImpact", "sihuaExchange", "axisScores"]) {
      expect(compat).not.toHaveProperty(key);
    }
  });

  test("관계 상태는 화이트리스트 7종이고 각각 라벨과 지침을 갖는다", () => {
    expect(NEO_RELATIONSHIP_STATUSES).toHaveLength(7);
    for (const status of NEO_RELATIONSHIP_STATUSES) {
      expect(neoRelationshipStatusLabel(status)).not.toBe("");
      expect(neoRelationshipStatusFocus(status)).not.toBe("");
    }
    expect(neoRelationshipStatusLabel("나쁜값")).toBe("");
    expect(neoRelationshipStatusFocus("나쁜값")).toBe("");
  });
});

describe("마스터 인연의 서 회귀", () => {
  test("자미두수 절반을 떼어내도 통합 궁합의 signature 가 그대로다", () => {
    // 🔴 hashSignature 는 키 순서에 민감하다. buildZiweiLoveCompatibility 의 반환 키 순서가
    //    통합 함수의 `ziwei` 와 어긋나면 마스터 인연의 서 결과가 통째로 바뀐다.
    const result = buildMasterLoveCodexCompatibility({
      selfSaju: calculateLifeBookAiSaju(ME),
      selfZiwei: chartOf(ME),
      partnerSaju: calculateLifeBookAiSaju(PARTNER),
      partnerZiwei: chartOf(PARTNER),
    });
    expect(Object.keys(result.ziwei)).toEqual([
      "palaceOverlay", "spouseCross", "maleficImpact", "sihuaExchange", "axisScores",
    ]);
    expect(result.ziwei).toEqual(buildZiweiLoveCompatibility({ selfZiwei: chartOf(ME), partnerZiwei: chartOf(PARTNER) }));
  });
});

describe("확정값 표", () => {
  const baseSummary = { method: "ziwei", mingGong: "명궁", palaces: chartOf(ME).palaces };

  test("궁합이 있으면 두 사람 교차 그룹이 생긴다", () => {
    const groups = buildNeoBasisPayload({ ...baseSummary, compat: compatOf() }).groups.map((g) => g.key);
    expect(groups).toContain("compat");
  });

  test("1인 모드에는 두 사람 교차 그룹이 없다", () => {
    const groups = buildNeoBasisPayload(baseSummary).groups.map((g) => g.key);
    expect(groups).not.toContain("compat");
  });
});

describe("챕터 레지스트리", () => {
  test("궁합 레지스트리는 1인과 챕터 수가 같다 — 늘리면 LLM 예산을 넘긴다", () => {
    expect(NEO_COMPAT_INITIAL_SECTIONS).toHaveLength(NEO_INITIAL_SECTIONS.length);
  });

  test("궁합 챕터 4개가 1인 챕터 4개 자리를 대신한다", () => {
    const compatIds = NEO_COMPAT_INITIAL_SECTIONS.map((s) => s.id);
    expect(compatIds).toEqual(expect.arrayContaining([
      "compatMutualRead", "compatPalaceCross", "compatConflictPattern", "compatRelationStrategy",
    ]));
    for (const replaced of ["topicStyle", "topicAreaBreakdown", "repeatedChoice", "misalignedFlow"]) {
      expect(compatIds).not.toContain(replaced);
    }
    // 나머지는 그대로 살아 있어야 한다.
    for (const kept of ["opening", "innateCore", "topicTiming", "methodEvidence", "meta"]) {
      expect(compatIds).toContain(kept);
    }
  });

  test("1인 레지스트리는 손대지 않았다", () => {
    const soloIds = NEO_INITIAL_SECTIONS.map((s) => s.id);
    expect(soloIds).toEqual(expect.arrayContaining(["topicStyle", "topicAreaBreakdown", "repeatedChoice", "misalignedFlow"]));
    expect(soloIds.filter((id) => id.startsWith("compat"))).toHaveLength(0);
  });
});

describe("프롬프트", () => {
  const compat = compatOf();
  const ctx = (extra = {}) => ({
    selectedMethod: "ziwei",
    topic: "연애 / 재회",
    intensity: "roar",
    question: "재회하면 또 같은 문제로 싸울까",
    methodSummary: { method: "ziwei", mingGong: "명궁", palaces: chartOf(ME).palaces, ...extra },
  });

  test("궁합 모드 프롬프트에 교차 표와 궁합 지침이 함께 들어간다", () => {
    const section = NEO_COMPAT_INITIAL_SECTIONS.find((s) => s.id === "compatPalaceCross");
    const prompt = buildNeoInitialSectionPrompt(section, { ...ctx({ compat }), relationshipStatus: "reconciling" });
    expect(prompt).toContain("두 사람 교차");
    expect(prompt).toContain("[궁합 모드");
    expect(prompt).toContain("접근 금지"); // 재회 시도 지침
  });

  test("1인 모드 프롬프트에는 궁합 흔적이 없다", () => {
    const section = NEO_INITIAL_SECTIONS.find((s) => s.id === "topicAreaBreakdown");
    const prompt = buildNeoInitialSectionPrompt(section, ctx());
    expect(prompt).not.toContain("[궁합 모드");
    expect(prompt).not.toContain("두 사람 교차");
  });

  test("상대 시간 미상이면 단정하지 말라는 지침이 붙는다", () => {
    const section = NEO_COMPAT_INITIAL_SECTIONS.find((s) => s.id === "compatMutualRead");
    const prompt = buildNeoInitialSectionPrompt(section, ctx({ compat: compatOf(PARTNER_NO_TIME) }));
    expect(prompt).toContain("정오 기준");
  });
});

describe("병합", () => {
  test("궁합 챕터 응답이 결과 문서에 실린다", () => {
    const merged = mergeNeoInitialSections(
      [
        { id: "compatMutualRead", ok: true, parsed: { mutualRead: {
          towardPartner: { title: "내가 느끼는 것", description: "끌린다.", signals: ["신호"] },
          towardMe: { title: "상대가 느낄 것", description: "부담이다.", signals: ["신호2"] },
          coreKeyword: "말이 문제다.",
        } } },
        { id: "compatPalaceCross", ok: true, parsed: { palaceCross: [{ palace: "부부궁", reading: "맞물린다." }] } },
        { id: "compatConflictPattern", ok: true, parsed: { conflictPattern: {
          title: "위험 패턴", trigger: "말투.", escalation: "커진다.",
          dialogue: [{ speaker: "나", line: "왜 그렇게 말했어?" }], resolution: "공감부터.",
        } } },
        { id: "compatRelationStrategy", ok: true, parsed: { relationStrategy: {
          title: "작전", situationRead: "지금은 이렇다.",
          steps: [{ stage: "1단계", doThis: "기다린다.", avoidThis: "매달리지 않는다." }],
        } } },
      ],
      { selectedMethod: "ziwei" },
      {},
    );
    expect(merged.mutualRead.coreKeyword).toBe("말이 문제다.");
    expect(merged.palaceCross[0]).toEqual({ palace: "부부궁", reading: "맞물린다." });
    expect(merged.conflictPattern.dialogue[0]).toEqual({ speaker: "나", line: "왜 그렇게 말했어?" });
    expect(merged.relationStrategy.steps[0].stage).toBe("1단계");
  });

  test("1인 모드 병합은 궁합 필드를 빈 값으로 남긴다(화면이 그 페이지를 건너뛴다)", () => {
    const merged = mergeNeoInitialSections(
      [{ id: "bluntTruth", ok: true, parsed: { bluntTruth: "정신 차려라." } }],
      { selectedMethod: "ziwei" },
      {},
    );
    expect(merged.bluntTruth).toBe("정신 차려라.");
    expect(merged.palaceCross).toEqual([]);
    expect(merged.conflictPattern.dialogue).toEqual([]);
    expect(merged.relationStrategy.steps).toEqual([]);
    expect(merged.mutualRead.coreKeyword).toBe("");
  });
});
