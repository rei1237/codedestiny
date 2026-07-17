// 나크샤트라 결정판 — 순수 조립·데이터 무결성 결정적 검증 (WASM/네트워크 불필요)
//
// worker/lib/nakshatra-codex.js(순수 조립)와 데이터 모듈을 직접 import해 고정 입력으로
// 3-뷰 조립, 크로스워크 전단사, 결정성 앵커, 경계일 병기, 타라 발라를 검증한다.
// Swiss WASM/음력 I/O는 라우트가 담당하므로 여기서는 우회한다.

const {
  assembleNatalCodex,
  assembleTodayMoon,
  buildUnifiedView,
  judgeTaraBala,
} = require("../../worker/lib/nakshatra-codex.js");
const {
  NAKSHATRA_ATTRIBUTES,
  getNakshatraAttributes,
} = require("../../constants/nakshatra-attributes.js");
const {
  NAKSHATRA_CROSSWALK,
  CROSSWALK_ANCHORS,
  CROSSWALK_OFFSET,
  crosswalkFromSukuyo,
  crosswalkFromNakshatra,
} = require("../../constants/nakshatra-crosswalk.js");
const { FUSION_ENTRIES } = require("../../constants/nakshatra-fusion.js");

const FIXED_BIRTH_UTC = new Date(Date.UTC(1990, 0, 1, 5, 0, 0));
const FIXED_NOW = new Date(Date.UTC(2026, 6, 16, 0, 0, 0));

describe("나크샤트라 속성 데이터", () => {
  test("27 엔트리 · 인덱스 0–26 유일 · 필수 필드 완비", () => {
    expect(NAKSHATRA_ATTRIBUTES).toHaveLength(27);
    const REQUIRED = ["index", "nameEn", "nameKo", "lord", "gana", "yoni", "nadi", "deity", "deityRole", "deityKw", "motive", "padaSigns"];
    const seen = new Set();
    NAKSHATRA_ATTRIBUTES.forEach((a, i) => {
      expect(a.index).toBe(i);
      seen.add(a.index);
      REQUIRED.forEach((f) => expect(a[f] == null).toBe(false));
      expect(a.padaSigns).toHaveLength(4);
    });
    expect(seen.size).toBe(27);
  });

  test("getNakshatraAttributes(13)=Chitra + 파생 라벨", () => {
    const c = getNakshatraAttributes(13);
    expect(c.nameEn).toBe("Chitra");
    expect(c.ganaKo).toBeTruthy();
    expect(c.padaSignsKo).toHaveLength(4);
  });
});

describe("크로스워크 (동양 27宿 ↔ 인도 27 Nakshatra)", () => {
  test("27쌍 전단사 + 오프셋 규칙", () => {
    expect(NAKSHATRA_CROSSWALK).toHaveLength(27);
    const nakSeen = new Set();
    const sukSeen = new Set();
    NAKSHATRA_CROSSWALK.forEach((e) => {
      nakSeen.add(e.nakshatraIdx);
      sukSeen.add(e.sukuyoIdx);
      expect((e.sukuyoIdx + CROSSWALK_OFFSET) % 27).toBe(e.nakshatraIdx);
    });
    expect(nakSeen.size).toBe(27);
    expect(sukSeen.size).toBe(27);
  });

  test("결정성 앵커(角=Chitra, 亢=Swati, 心=Jyeshtha, 昴=Krittika, 畢=Rohini)", () => {
    CROSSWALK_ANCHORS.forEach((anchor) => {
      const entry = NAKSHATRA_CROSSWALK.find((e) => e.sukuyoHan === anchor.sukuyoHan);
      expect(entry).toBeTruthy();
      expect(entry.nakshatraEn).toBe(anchor.nakshatraEn);
    });
  });

  test("정/역방향 조회 왕복", () => {
    const fwd = crosswalkFromSukuyo(0);
    expect(fwd.sukuyoHan).toBe("角");
    expect(fwd.nakshatraEn).toBe("Chitra");
    expect(crosswalkFromNakshatra(fwd.nakshatraIdx).sukuyoIdx).toBe(0);
  });
});

describe("융합 해석 레이어", () => {
  test("27 엔트리 · 필수 필드 최소 길이 충족", () => {
    expect(FUSION_ENTRIES).toHaveLength(27);
    const REQUIRED = ["fusionTitle", "convergence", "divergence", "fusionReading"];
    FUSION_ENTRIES.forEach((f, i) => {
      expect(f.sukuyoIdx).toBe(i);
      expect(Array.isArray(f.easternKeywords) && f.easternKeywords.length > 0).toBe(true);
      REQUIRED.forEach((k) => {
        expect(typeof f[k]).toBe("string");
        expect(f[k].trim().length).toBeGreaterThan(10);
      });
    });
  });
});

describe("natal 3-뷰 조립", () => {
  test("일치 케이스: 시데리얼 181.42° → Chitra 파다3, 음력1월17일 → 각(角)", () => {
    const codex = assembleNatalCodex({
      moonLon: 181.42,
      birthUtc: FIXED_BIRTH_UTC,
      lunar: { month: 1, day: 17, isLeap: false },
      timeUnknown: false,
      now: FIXED_NOW,
    });
    // 인도 뷰
    expect(codex.india.index).toBe(13);
    expect(codex.india.nameEn).toBe("Chitra");
    expect(codex.india.pada).toBe(3); // 스펙 예시값
    expect(codex.india.padaDetail.navamsaSign).toBeTruthy();
    expect(typeof codex.india.dasha.currentMahadasha).toBe("string");
    expect(codex.india.dasha.currentMahadasha.length).toBeGreaterThan(0);
    // 동양 뷰
    expect(codex.dongyang.index).toBe(0);
    expect(codex.dongyang.nameHan).toBe("角");
    expect(codex.dongyang.fourSymbol).toBe("청룡");
    expect(codex.dongyang.sevenLuminary).toBeTruthy();
    // 통합 뷰 — 각↔Chitra 정합
    expect(codex.unified.crosswalk.match).toBe(true);
    expect(codex.unified.boundaryNote).toBeNull();
    expect(codex.unified.fusionReading.length).toBeGreaterThan(10);
    // 투명성
    expect(codex.transparency.ayanamsa).toBe("Lahiri");
    expect(codex.transparency.siderealMoonLongitude).toBe(181.42);
  });

  test("경계일: 음력 각(→기대 Chitra) + moonLon 190°(→실제 Swati) 불일치 병기", () => {
    const codex = assembleNatalCodex({
      moonLon: 190,
      birthUtc: FIXED_BIRTH_UTC,
      lunar: { month: 1, day: 17, isLeap: false },
      timeUnknown: false,
      now: FIXED_NOW,
    });
    expect(codex.india.index).toBe(14); // Swati
    expect(codex.unified.crosswalk.match).toBe(false);
    expect(codex.unified.crosswalk.boundary).toBe(true);
    expect(codex.unified.crosswalk.deltaSteps).toBe(1);
    expect(codex.unified.boundaryNote).toContain("치트라");
    expect(codex.unified.boundaryNote).toContain("스와티");
  });

  test("시각 미상 → 파다 산출 금지(나크샤트라는 정오 산출)", () => {
    const codex = assembleNatalCodex({
      moonLon: 181.42,
      birthUtc: FIXED_BIRTH_UTC,
      lunar: { month: 1, day: 17, isLeap: false },
      timeUnknown: true,
      now: FIXED_NOW,
    });
    expect(codex.india.pada).toBeNull();
    expect(codex.india.padaDetail).toBeNull();
    expect(codex.transparency.timeUnknown).toBe(true);
    expect(codex.india.index).toBe(13);
  });

  test("전 27수: 정합 조합은 융합 서술 존재 + match=true", () => {
    for (let s = 0; s < 27; s += 1) {
      const n = (s + CROSSWALK_OFFSET) % 27;
      const u = buildUnifiedView(s, n);
      expect(u.crosswalk.match).toBe(true);
      expect(typeof u.fusionReading).toBe("string");
      expect(u.fusionReading.length).toBeGreaterThan(10);
    }
  });
});

describe("타라 발라 · 오늘의 달", () => {
  test("타라 발라 9구간", () => {
    expect(judgeTaraBala(5, 5)).toMatchObject({ count: 1, key: "Janma" });
    expect(judgeTaraBala(5, 6)).toMatchObject({ key: "Sampat" });
  });

  test("오늘의 달 + 개인 격각·타라발라", () => {
    const today = assembleTodayMoon({
      moonLon: 181.42,
      lunar: { month: 1, day: 17, isLeap: false },
      myMansionIndex: 0,
    });
    expect(today.todayNakshatra.index).toBe(13);
    expect(today.todaySukuyo.index).toBe(0);
    expect(today.personal.dayFortune.relationType).toBe("명"); // 본명수와 오늘 숙 동일
    expect(today.personal.taraBala).toBeTruthy();
  });

  test("본명수 없으면 개인 파트 생략", () => {
    const today = assembleTodayMoon({ moonLon: 181.42, lunar: { month: 1, day: 17, isLeap: false } });
    expect(today.personal).toBeNull();
  });
});
