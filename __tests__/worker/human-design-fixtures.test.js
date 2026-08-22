/**
 * @jest-environment node
 */

// fixture 골든 테스트 — 저장된 26 activation 황경을 순수 엔진에 먹여 외부 계산기 값과 대조한다.
//
// 🔴 CI 는 실제 Swiss Ephemeris 를 돌리지 못한다(jest.config.cjs 가 .wasm 을 스텁으로 매핑).
//    그래서 천체 위치는 scripts/human-design-fixture-snapshot.mjs 가 실제 천체력으로 굳혀 둔
//    ephemeris-snapshot.json 을 쓰고, 여기서는 **그 위를 도는 규칙 엔진**을 검증한다.
//    천체 위치 자체의 신선도는 `node scripts/human-design-fixture-snapshot.mjs --check` 가 본다.
//
// `cases` 의 expected 는 외부 Human Design 계산기 차트에서 옮긴 값이다(cases.json 의 note 참고).
// `structuralCases` 는 외부 차트가 없어 구조 불변식만 본다.

import { readFileSync } from "node:fs";
import path from "node:path";

import { assembleChart } from "../../lib/human-design/chart.js";
import { CANONICAL_PROFILES } from "../../lib/human-design/profile.js";
import {
  authorityFromLabel,
  definitionFromLabel,
  parseIncarnationCrossGates,
  typeFromLabel,
} from "../../lib/human-design/labels.js";

const FIXTURE_DIR = path.join(process.cwd(), "__tests__", "fixtures", "human-design");
const doc = JSON.parse(readFileSync(path.join(FIXTURE_DIR, "cases.json"), "utf8"));
const verifiedCases = doc.cases;
const structuralCases = doc.structuralCases;
const allCases = [...verifiedCases, ...structuralCases];

const snapshot = JSON.parse(readFileSync(path.join(FIXTURE_DIR, "ephemeris-snapshot.json"), "utf8"));
const snapshotById = new Map(snapshot.rows.map((row) => [row.id, row]));

function snapshotFor(id) {
  const row = snapshotById.get(id);
  if (!row) throw new Error(`스냅샷에 ${id} 가 없다. node scripts/human-design-fixture-snapshot.mjs 로 재생성할 것.`);
  return row;
}

function chartFor(id) {
  const row = snapshotFor(id);
  return assembleChart({
    personalityLongitudes: row.personality,
    designLongitudes: row.design,
    moments: { birthUtc: row.birthUtc, designUtc: row.designUtc, designSearch: row.designSearch },
  });
}

function cellsOf(chart, layer) {
  return Object.fromEntries(chart.layers[layer].map((a) => [a.planet, { gate: a.gate, line: a.line }]));
}

describe("fixture 세트 자체", () => {
  test("외부 검증 케이스가 20건 이상이고 id 가 유일하다", () => {
    expect(verifiedCases.length).toBeGreaterThanOrEqual(20);
    expect(new Set(allCases.map((c) => c.id)).size).toBe(allCases.length);
  });

  test("외부 검증 케이스는 전부 expected 가 채워져 있다", () => {
    const unfilled = verifiedCases.filter((c) => !c.expected).map((c) => c.id);
    expect(unfilled).toEqual([]);
    for (const testCase of verifiedCases) {
      for (const field of doc.expectedFieldsRequired) {
        expect({ id: testCase.id, field, present: testCase.expected[field] != null })
          .toEqual({ id: testCase.id, field, present: true });
      }
    }
  });

  test("모든 케이스에 스냅샷이 있고 그 반대도 성립한다", () => {
    expect([...snapshotById.keys()].sort()).toEqual(allCases.map((c) => c.id).sort());
  });

  test("요구된 커버리지 축이 모두 들어 있다", () => {
    const timezones = new Set(allCases.map((c) => c.birth.timezone));
    const ids = allCases.map((c) => c.id).join(" ");
    expect(ids).toMatch(/gate-edge/);
    expect(ids).toMatch(/line-edge/);
    expect(ids).toMatch(/delta-/);
    expect(allCases.some((c) => c.birth.calendar?.startsWith("lunar"))).toBe(true);
    expect(allCases.some((c) => c.birth.birthTime === "12:00")).toBe(true);
    expect(allCases.some((c) => c.birth.birthTime === "22:00")).toBe(true);
    // 한국·미국·유럽·아프리카·태평양 + 30분 오프셋 + UTC+0
    expect([...timezones]).toEqual(expect.arrayContaining([
      "Asia/Seoul", "America/Los_Angeles", "Europe/London", "Europe/Paris",
      "Asia/Kabul", "Africa/Dakar", "Pacific/Guam", "America/Havana",
    ]));
  });

  test("타입 5종·권위 6종·정의 4종이 외부 검증 케이스에 나온다", () => {
    const pick = (field) => new Set(verifiedCases.map((c) => c.expected[field]));
    expect(pick("type")).toEqual(new Set([
      "Generator", "Manifesting Generator", "Projector", "Manifestor", "Reflector",
    ]));
    expect([...pick("authority")].sort()).toEqual([
      "Ego Manifested", "Lunar Cycle", "Sacral", "Self Projected", "Solar Plexus", "Splenic",
    ]);
    expect([...pick("definition")].sort()).toEqual(["None", "Single", "Split", "Triple Split"]);
  });
});

describe("외부 계산기 값 대조", () => {
  test.each(verifiedCases.map((c) => [c.id, c]))("%s", (id, testCase) => {
    const chart = chartFor(id);
    const expected = testCase.expected;

    // 출생 시각 — 벽시계 + IANA 타임존이 계산기와 같은 UTC 로 풀리는가(역사적 DST 포함)
    expect(snapshotFor(id).birthUtc).toBe(new Date(expected.birthUtc).toISOString());

    // 26 activation 전량. Design 쪽 13개는 88° 태양호 역탐색이 맞아야만 맞는다.
    expect(cellsOf(chart, "personality")).toEqual(expected.personality);
    expect(cellsOf(chart, "design")).toEqual(expected.design);

    expect(chart.profile).toBe(expected.profile);
    expect(chart.type).toBe(typeFromLabel(expected.type));
    expect(chart.authority).toBe(authorityFromLabel(expected.authority));
    expect(chart.definition).toBe(definitionFromLabel(expected.definition));

    const crossGates = parseIncarnationCrossGates(expected.incarnationCross);
    expect(crossGates).not.toBeNull();
    expect(chart.incarnationCross.gates).toEqual(crossGates);
  });
});

describe("모든 케이스의 구조 불변식", () => {
  test.each(allCases.map((c) => [c.id]))("%s", (id) => {
    const chart = chartFor(id);

    expect(chart.activations).toHaveLength(26);
    expect(chart.layers.personality).toHaveLength(13);
    expect(chart.layers.design).toHaveLength(13);

    // 🔴 12 조합 밖의 프로파일이 나오면 만다라 배열/앵커나 Design 순간이 틀린 것이다.
    expect(CANONICAL_PROFILES).toContain(chart.profile);
    expect(chart.warnings).toEqual([]);

    // Earth 는 Sun 의 정반대, South Node 는 North Node 의 정반대여야 한다.
    for (const layer of ["personality", "design"]) {
      const byPlanet = Object.fromEntries(chart.layers[layer].map((a) => [a.planet, a.longitude]));
      expect(((byPlanet.Earth - byPlanet.Sun) + 360) % 360).toBeCloseTo(180, 8);
      expect(((byPlanet.SouthNode - byPlanet.NorthNode) + 360) % 360).toBeCloseTo(180, 8);
    }

    // 정의된 센터는 완성 채널이 잇는 센터의 합집합과 정확히 같아야 한다.
    const fromChannels = new Set(chart.channels.flatMap((c) => [c.centerA, c.centerB]));
    expect(new Set(chart.definedCenters)).toEqual(fromChannels);
    expect(chart.definedCenters.length + chart.undefinedCenters.length).toBe(9);

    // Design Sun 은 Personality Sun 에서 정확히 88° 이전이어야 한다.
    const pSun = chart.layers.personality[0].longitude;
    const dSun = chart.layers.design[0].longitude;
    expect(((pSun - dSun) + 360) % 360).toBeCloseTo(88, 6);
  });
});

describe("같은 입력은 같은 결과 (결정론)", () => {
  test("두 번 조립해도 완전히 같다", () => {
    for (const testCase of allCases) {
      expect(JSON.stringify(chartFor(testCase.id))).toBe(JSON.stringify(chartFor(testCase.id)));
    }
  });
});

describe("경계 케이스가 실제로 경계를 넘는다", () => {
  test("게이트 경계 쌍(1분 차이)은 Personality Sun 게이트가 다르다", () => {
    const before = chartFor("gate-edge-kr-1994-03-19-1112").layers.personality[0];
    const after = chartFor("gate-edge-kr-1994-03-19-1113").layers.personality[0];
    expect(after.gate).not.toBe(before.gate);
  });

  test("라인 경계 쌍(1분 차이)은 같은 게이트 안에서 라인만 바뀐다", () => {
    const before = chartFor("line-edge-kr-1993-03-11-1646").layers.personality[0];
    const after = chartFor("line-edge-kr-1993-03-11-1647").layers.personality[0];
    expect(after.gate).toBe(before.gate);
    expect(after.line).toBe(before.line + 1);
  });

  test("±1분·±5분 탐침은 검증된 기준 케이스와 같은 차트를 준다", () => {
    const base = chartFor("kr-jeonju-1991-02-20-0830");
    for (const id of [
      "delta-kr-1991-02-20-0829",
      "delta-kr-1991-02-20-0831",
      "delta-kr-1991-02-20-0825",
      "delta-kr-1991-02-20-0835",
    ]) {
      const probe = chartFor(id);
      expect({ id, type: probe.type, profile: probe.profile, definition: probe.definition })
        .toEqual({ id, type: base.type, profile: base.profile, definition: base.definition });
    }
  });
});

describe("한국 서머타임(1987~1988)", () => {
  test("1988-05-08 서울은 +10 으로 풀린다", () => {
    expect(snapshotFor("kr-seoul-1988-05-08-0900").utcOffsetHours).toBe(10);
  });

  test("음력 윤달 케이스도 1987 서머타임(+10)을 탄다", () => {
    const row = snapshotFor("kr-lunar-leap-1987-06-15-0700");
    expect(row.utcOffsetHours).toBe(10);
    expect(row.solarDate).toEqual({ year: 1987, month: 8, day: 9 });
  });
});
