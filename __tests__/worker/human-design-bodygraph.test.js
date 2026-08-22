/**
 * @jest-environment node
 */

// BodyGraph 구조 계산 — 채널 완성 → 센터 정의 → Definition, 그리고 Type/Authority 규칙 엔진.
//
// 🔴 여기서 확인하는 계약은 "활성 게이트만으로 센터가 defined 되지 않는다"(요구사항 9)와
//    "Type/Authority 는 그래프에서 나오지 결과에서 역산되지 않는다"(요구사항 10·12)다.

import { CENTER, CENTER_GATES, CENTER_ORDER, centerOfGate } from "../../lib/human-design/centers.js";
import { CHANNELS, channelsOfGate } from "../../lib/human-design/channels.js";
import { DEFINITION, buildBodygraph, hasConnection } from "../../lib/human-design/bodygraph.js";
import {
  AUTHORITY,
  HD_TYPE,
  STRATEGY,
  calculateAuthority,
  calculateType,
  notSelfThemeForType,
  signatureForType,
  strategyForType,
} from "../../lib/human-design/type-authority.js";

/** 게이트 목록으로 최소 activation 배열을 만든다(계층은 기본 personality). */
function activationsFor(gates, layer = "personality") {
  return gates.map((gate, index) => ({
    planet: `Body${index}`,
    layer,
    longitude: 0,
    gate,
    line: 1,
  }));
}

function graphFor(gates, layer) {
  return buildBodygraph(activationsFor(gates, layer));
}

describe("데이터 무결성", () => {
  test("64 게이트가 각각 정확히 하나의 센터에 속한다", () => {
    const seen = new Map();
    for (const [center, gates] of Object.entries(CENTER_GATES)) {
      for (const gate of gates) {
        expect(seen.has(gate)).toBe(false);
        seen.set(gate, center);
      }
    }
    expect([...seen.keys()].sort((a, b) => a - b)).toEqual(Array.from({ length: 64 }, (_, i) => i + 1));
  });

  test("센터는 9개다", () => {
    expect(CENTER_ORDER).toHaveLength(9);
    expect(new Set(CENTER_ORDER).size).toBe(9);
    expect(Object.keys(CENTER_GATES).sort()).toEqual([...CENTER_ORDER].sort());
  });

  test("채널은 36개이고 중복이 없다", () => {
    expect(CHANNELS).toHaveLength(36);
    expect(new Set(CHANNELS.map((c) => c.channelId)).size).toBe(36);
  });

  test("모든 채널이 유효한 게이트와 서로 다른 센터를 잇는다", () => {
    for (const channel of CHANNELS) {
      for (const gate of [channel.gateA, channel.gateB]) {
        expect(Number.isInteger(gate)).toBe(true);
        expect(gate).toBeGreaterThanOrEqual(1);
        expect(gate).toBeLessThanOrEqual(64);
      }
      expect(channel.centerA).toBe(centerOfGate(channel.gateA));
      expect(channel.centerB).toBe(centerOfGate(channel.gateB));
      expect(channel.centerA).not.toBe(channel.centerB);
    }
  });

  test("64 게이트가 모두 최소 하나의 채널에 참여한다", () => {
    for (let gate = 1; gate <= 64; gate += 1) {
      expect(channelsOfGate(gate).length).toBeGreaterThan(0);
    }
  });
});

describe("채널 완성 규칙", () => {
  test("한쪽 게이트만 활성이면 채널이 완성되지 않고 센터도 정의되지 않는다", () => {
    const graph = graphFor([20]);
    expect(graph.activeGates).toEqual([20]);
    expect(graph.channels).toHaveLength(0);
    expect(graph.definedCenters).toHaveLength(0);
    expect(graph.definition).toBe(DEFINITION.NONE);
  });

  test("양쪽 게이트가 활성이면 채널이 완성되고 두 센터가 정의된다", () => {
    const graph = graphFor([20, 34]);
    expect(graph.channels.map((c) => c.channelId)).toEqual(["20-34"]);
    expect(graph.definedCenters).toEqual([CENTER.THROAT, CENTER.SACRAL]);
    expect(graph.undefinedCenters).toHaveLength(7);
  });

  test("게이트가 여럿 활성이어도 채널을 못 이루면 센터는 여전히 미정의다", () => {
    // 20(Throat) · 9(Sacral) · 61(Head) 은 서로 어떤 채널도 이루지 않는다.
    const graph = graphFor([20, 9, 61]);
    expect(graph.channels).toHaveLength(0);
    expect(graph.definedCenters).toHaveLength(0);
  });

  test("계층이 섞여도 채널은 완성되고 composition 으로 구분된다", () => {
    const graph = buildBodygraph([
      ...activationsFor([20], "personality"),
      ...activationsFor([34], "design"),
    ]);
    expect(graph.channels).toHaveLength(1);
    expect(graph.channels[0].composition).toBe("MIXED");
  });

  test("한 계층만으로 완성된 채널은 그 계층으로 표시된다", () => {
    expect(graphFor([20, 34], "personality").channels[0].composition).toBe("PERSONALITY_ONLY");
    expect(graphFor([20, 34], "design").channels[0].composition).toBe("DESIGN_ONLY");
  });
});

describe("Definition (그래프 연결요소)", () => {
  test("채널이 없으면 No Definition", () => {
    expect(graphFor([]).definition).toBe(DEFINITION.NONE);
    expect(graphFor([]).definitionComponents).toHaveLength(0);
  });

  test("연결된 채널 하나 = Single", () => {
    expect(graphFor([20, 34]).definition).toBe(DEFINITION.SINGLE);
  });

  test("이어진 채널 둘도 Single (같은 연결요소)", () => {
    // 20-34(Throat-Sacral) 와 7-31(G-Throat) 은 Throat 을 공유한다.
    const graph = graphFor([20, 34, 7, 31]);
    expect(graph.channels).toHaveLength(2);
    expect(graph.definitionComponents).toHaveLength(1);
    expect(graph.definition).toBe(DEFINITION.SINGLE);
  });

  test("서로 떨어진 채널 둘 = Split", () => {
    // 9-52(Sacral-Root) · 11-56(Ajna-Throat)
    const graph = graphFor([9, 52, 11, 56]);
    expect(graph.definitionComponents).toHaveLength(2);
    expect(graph.definition).toBe(DEFINITION.SPLIT);
  });

  test("서로 떨어진 채널 셋 = Triple Split", () => {
    const graph = graphFor([9, 52, 11, 56, 25, 51]);
    expect(graph.definitionComponents).toHaveLength(3);
    expect(graph.definition).toBe(DEFINITION.TRIPLE_SPLIT);
  });

  test("서로 떨어진 채널 넷 = Quadruple Split", () => {
    // 4-63(Ajna-Head) · 20-34(Throat-Sacral) · 25-51(G-Heart) · 19-49(Root-SolarPlexus)
    const graph = graphFor([4, 63, 20, 34, 25, 51, 19, 49]);
    expect(graph.definitionComponents).toHaveLength(4);
    expect(graph.definition).toBe(DEFINITION.QUADRUPLE_SPLIT);
    expect(graph.definedCenters).toHaveLength(8);
    expect(graph.undefinedCenters).toEqual([CENTER.SPLEEN]);
  });

  test("연결요소는 서로 겹치지 않고 정의된 센터를 빠짐없이 덮는다", () => {
    const graph = graphFor([9, 52, 11, 56, 25, 51]);
    const flat = graph.definitionComponents.flat();
    expect(new Set(flat).size).toBe(flat.length);
    expect([...flat].sort()).toEqual([...graph.definedCenters].sort());
  });
});

describe("Type", () => {
  test("정의된 센터가 없으면 Reflector", () => {
    expect(calculateType(graphFor([]))).toBe(HD_TYPE.REFLECTOR);
    expect(calculateType(graphFor([20]))).toBe(HD_TYPE.REFLECTOR);
  });

  test("Sacral 정의 + 모터→목 연결 없음 = Generator", () => {
    const graph = graphFor([9, 52]); // Sacral-Root
    expect(graph.definedCenters).toContain(CENTER.SACRAL);
    expect(hasConnection(graph.channels, [CENTER.SACRAL], CENTER.THROAT)).toBe(false);
    expect(calculateType(graph)).toBe(HD_TYPE.GENERATOR);
  });

  test("Sacral 정의 + 모터→목 연결 = Manifesting Generator", () => {
    const graph = graphFor([20, 34]); // Throat-Sacral 직결
    expect(calculateType(graph)).toBe(HD_TYPE.MANIFESTING_GENERATOR);
  });

  test("Sacral 이 목에 간접 연결돼도 Manifesting Generator", () => {
    // 27-50(Sacral-Spleen) + 16-48(Spleen-Throat) → Sacral 이 Spleen 을 거쳐 목에 닿는다.
    // 이 네 게이트 사이에는 Sacral-Throat 직결 채널이 없다.
    const graph = graphFor([27, 50, 16, 48]);
    expect(graph.channels.map((c) => c.channelId).sort()).toEqual(["16-48", "27-50"]);
    expect(calculateType(graph)).toBe(HD_TYPE.MANIFESTING_GENERATOR);
  });

  test("Sacral 미정의 + 모터→목 연결 = Manifestor", () => {
    const graph = graphFor([21, 45]); // Heart-Throat
    expect(graph.definedCenters).not.toContain(CENTER.SACRAL);
    expect(calculateType(graph)).toBe(HD_TYPE.MANIFESTOR);
  });

  test("Sacral 미정의 + 모터→목 연결 없음 = Projector", () => {
    const graph = graphFor([1, 8]); // G-Throat, 모터 아님
    expect(calculateType(graph)).toBe(HD_TYPE.PROJECTOR);
  });

  test("Sacral 이 정의돼도 목과 안 이어지면 Generator 다 (다른 모터가 목에 닿으면 MG)", () => {
    // Sacral-Root 만: Generator
    expect(calculateType(graphFor([9, 52]))).toBe(HD_TYPE.GENERATOR);
    // 거기에 Heart-Throat(21-45)을 더하면 다른 모터가 목에 닿아 MG 가 된다.
    expect(calculateType(graphFor([9, 52, 21, 45]))).toBe(HD_TYPE.MANIFESTING_GENERATOR);
  });
});

describe("Strategy · Signature · Not-Self", () => {
  test.each([
    [HD_TYPE.GENERATOR, STRATEGY.RESPOND],
    [HD_TYPE.MANIFESTING_GENERATOR, STRATEGY.RESPOND],
    [HD_TYPE.PROJECTOR, STRATEGY.WAIT_FOR_INVITATION],
    [HD_TYPE.MANIFESTOR, STRATEGY.INFORM],
    [HD_TYPE.REFLECTOR, STRATEGY.WAIT_A_LUNAR_CYCLE],
  ])("%s → %s", (type, strategy) => {
    expect(strategyForType(type)).toBe(strategy);
  });

  test("모든 타입에 시그니처와 낫셀프 테마가 있다", () => {
    for (const type of Object.values(HD_TYPE)) {
      expect(signatureForType(type)).toMatch(/^SIGNATURE_/);
      expect(notSelfThemeForType(type)).toMatch(/^NOT_SELF_/);
    }
  });

  test("알 수 없는 타입은 던진다", () => {
    expect(() => strategyForType("TYPE_UNKNOWN")).toThrow(RangeError);
    expect(() => signatureForType("TYPE_UNKNOWN")).toThrow(RangeError);
    expect(() => notSelfThemeForType("TYPE_UNKNOWN")).toThrow(RangeError);
  });
});

describe("Authority (센터 정의 우선순위)", () => {
  test("Solar Plexus 가 정의되면 무조건 Emotional", () => {
    // 12-22(Throat-SolarPlexus) 만
    expect(calculateAuthority(graphFor([12, 22]))).toBe(AUTHORITY.EMOTIONAL);
    // Sacral·Spleen·Heart 가 함께 정의돼도 Emotional 이 이긴다.
    const rich = graphFor([12, 22, 20, 34, 16, 48, 21, 45]);
    expect(rich.definedCenters).toEqual(expect.arrayContaining([CENTER.SOLAR_PLEXUS, CENTER.SACRAL, CENTER.SPLEEN, CENTER.HEART]));
    expect(calculateAuthority(rich)).toBe(AUTHORITY.EMOTIONAL);
  });

  test("Solar Plexus 없고 Sacral 이 있으면 Sacral", () => {
    expect(calculateAuthority(graphFor([9, 52]))).toBe(AUTHORITY.SACRAL);
    // Spleen·Heart 가 함께 있어도 Sacral 이 이긴다.
    expect(calculateAuthority(graphFor([9, 52, 16, 48, 21, 45]))).toBe(AUTHORITY.SACRAL);
  });

  test("Solar Plexus·Sacral 없고 Spleen 이 있으면 Splenic", () => {
    expect(calculateAuthority(graphFor([16, 48]))).toBe(AUTHORITY.SPLENIC);
    expect(calculateAuthority(graphFor([16, 48, 21, 45]))).toBe(AUTHORITY.SPLENIC);
  });

  test("그 위가 다 없고 Heart 가 있으면 Ego", () => {
    expect(calculateAuthority(graphFor([21, 45]))).toBe(AUTHORITY.EGO);
  });

  test("그 위가 다 없고 G 가 있으면 Self-Projected", () => {
    expect(calculateAuthority(graphFor([1, 8]))).toBe(AUTHORITY.SELF_PROJECTED);
  });

  test("Ajna/Head 만 있으면 Mental", () => {
    expect(calculateAuthority(graphFor([11, 56]))).toBe(AUTHORITY.MENTAL);
    expect(calculateAuthority(graphFor([11, 56, 4, 63]))).toBe(AUTHORITY.MENTAL);
  });

  test("정의된 센터가 없으면 Lunar", () => {
    expect(calculateAuthority(graphFor([]))).toBe(AUTHORITY.LUNAR);
  });

  test("36 채널 각각 하나만 완성된 차트에서 권위 판정이 전부 성립한다", () => {
    const seen = new Set();
    for (const channel of CHANNELS) {
      const graph = graphFor([channel.gateA, channel.gateB]);
      const authority = calculateAuthority(graph);
      expect(Object.values(AUTHORITY)).toContain(authority);
      expect(Object.values(HD_TYPE)).toContain(calculateType(graph));
      seen.add(authority);
    }
    // 36 채널 단독 차트만으로도 Lunar 를 뺀 모든 권위가 한 번씩은 나온다.
    expect(seen.has(AUTHORITY.LUNAR)).toBe(false);
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });
});
