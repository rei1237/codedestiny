/**
 * @jest-environment node
 */

// fixture 골든 테스트 — 저장된 26 activation 황경을 순수 엔진에 먹여 기대값과 대조한다.
//
// 🔴 CI 는 실제 Swiss Ephemeris 를 돌리지 못한다(jest.config.cjs 가 .wasm 을 스텁으로 매핑).
//    그래서 천체 위치는 scripts/human-design-fixture-snapshot.mjs 가 실제 천체력으로 굳혀 둔
//    ephemeris-snapshot.json 을 쓰고, 여기서는 **그 위를 도는 규칙 엔진**을 검증한다.
//    천체 위치 자체의 신선도는 `node scripts/human-design-fixture-snapshot.mjs --check` 가 본다.
//
// 🔴 `expected` 는 외부 신뢰 계산기의 값이다. 아직 안 채워진 케이스는 값 대조를 건너뛰되,
//    구조 불변식은 그대로 검사한다. 미기입 자체는 `npm run verify:human-design` 이 실패시킨다.

import { readFileSync } from "node:fs";
import path from "node:path";

import { assembleChart } from "../../lib/human-design/chart.js";
import { CANONICAL_PROFILES } from "../../lib/human-design/profile.js";
import {
  authorityFromLabel,
  centerFromLabel,
  definitionFromLabel,
  normalizeChannelId,
  parseIncarnationCrossGates,
  typeFromLabel,
} from "../../lib/human-design/labels.js";

const FIXTURE_DIR = path.join(process.cwd(), "__tests__", "fixtures", "human-design");
const cases = JSON.parse(readFileSync(path.join(FIXTURE_DIR, "cases.json"), "utf8")).cases;
const snapshot = JSON.parse(readFileSync(path.join(FIXTURE_DIR, "ephemeris-snapshot.json"), "utf8"));
const snapshotById = new Map(snapshot.rows.map((row) => [row.id, row]));

function chartFor(id) {
  const row = snapshotById.get(id);
  if (!row) throw new Error(`스냅샷에 ${id} 가 없다. node scripts/human-design-fixture-snapshot.mjs 로 재생성할 것.`);
  return assembleChart({
    personalityLongitudes: row.personality,
    designLongitudes: row.design,
    moments: {
      birthUtc: row.birthUtc,
      designUtc: row.designUtc,
      designSearch: row.designSearch,
    },
  });
}

describe("fixture 세트 자체", () => {
  test("케이스가 30건 이상이고 id 가 유일하다", () => {
    expect(cases.length).toBeGreaterThanOrEqual(30);
    expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length);
  });

  test("모든 케이스에 스냅샷이 있고 그 반대도 성립한다", () => {
    expect([...snapshotById.keys()].sort()).toEqual(cases.map((c) => c.id).sort());
  });

  test("요구된 커버리지 축이 모두 들어 있다", () => {
    const ids = cases.map((c) => c.id).join(" ");
    const timezones = new Set(cases.map((c) => c.birth.timezone));
    expect(ids).toMatch(/gate-edge/);
    expect(ids).toMatch(/line-edge/);
    expect(ids).toMatch(/delta-/);
    expect(cases.some((c) => c.birth.calendar?.startsWith("lunar"))).toBe(true);
    expect(cases.some((c) => c.birth.birthTime === "00:00")).toBe(true);
    expect(cases.some((c) => c.birth.birthTime === "12:00")).toBe(true);
    expect(cases.some((c) => c.birth.birthTime === "23:59")).toBe(true);
    // 한국·미국·유럽 + 30분 오프셋 + DST 미시행 지역
    expect([...timezones]).toEqual(expect.arrayContaining([
      "Asia/Seoul", "America/New_York", "Europe/Berlin", "Asia/Kolkata", "Pacific/Honolulu",
    ]));
  });
});

describe("모든 케이스의 구조 불변식", () => {
  test.each(cases.map((c) => [c.id]))("%s", (id) => {
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
    for (const testCase of cases) {
      const first = chartFor(testCase.id);
      const second = chartFor(testCase.id);
      expect(JSON.stringify(second)).toBe(JSON.stringify(first));
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
});

const withExpected = cases.filter((testCase) => testCase.expected);

// 기대값이 하나도 안 채워졌으면 이 블록은 통째로 비어 있게 된다. 그 상태를 "통과"로 읽지 않도록
// verify:human-design 이 미기입을 실패시킨다(fail-closed).
(withExpected.length ? describe : describe.skip)("외부 계산기 기대값 대조", () => {
  test.each(withExpected.map((testCase) => [testCase.id, testCase]))("%s", (id, testCase) => {
    const chart = chartFor(id);
    const expected = testCase.expected;

    if (expected.designMomentUtc) {
      const actual = new Date(snapshotById.get(id).designUtc).getTime();
      const wanted = new Date(expected.designMomentUtc).getTime();
      expect(Number.isFinite(wanted)).toBe(true);
      // 외부 계산기는 보통 분 단위까지만 표기하므로 60초 이내면 같은 순간으로 본다.
      expect(Math.abs(actual - wanted)).toBeLessThanOrEqual(60000);
    }

    const byPlanet = (layer) => Object.fromEntries(chart.layers[layer].map((a) => [a.planet, a]));
    const personality = byPlanet("personality");
    const design = byPlanet("design");
    const pairs = [
      ["personalitySun", personality.Sun],
      ["personalityEarth", personality.Earth],
      ["personalityNorthNode", personality.NorthNode],
      ["designSun", design.Sun],
      ["designEarth", design.Earth],
      ["designNorthNode", design.NorthNode],
    ];
    for (const [key, activation] of pairs) {
      if (!expected[key]) continue;
      expect({ key, gate: activation.gate, line: activation.line })
        .toEqual({ key, gate: expected[key].gate, line: expected[key].line });
    }

    if (expected.profile) expect(chart.profile).toBe(expected.profile);
    if (expected.type) expect(chart.type).toBe(typeFromLabel(expected.type));
    if (expected.authority) expect(chart.authority).toBe(authorityFromLabel(expected.authority));
    if (expected.definition) expect(chart.definition).toBe(definitionFromLabel(expected.definition));

    if (expected.definedCenters) {
      const wanted = expected.definedCenters.map(centerFromLabel).sort();
      expect([...chart.definedCenters].sort()).toEqual(wanted);
    }
    if (expected.definedChannels) {
      const wanted = expected.definedChannels.map(normalizeChannelId).sort();
      expect(chart.channels.map((c) => c.channelId).sort()).toEqual(wanted);
    }
    if (expected.incarnationCross) {
      const gates = parseIncarnationCrossGates(expected.incarnationCross);
      expect(gates).not.toBeNull();
      expect(chart.incarnationCross.gates).toEqual(gates);
    }
  });
});
