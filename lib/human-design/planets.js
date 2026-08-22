/**
 * 각 계산 순간마다 구하는 13 천체.
 *
 * Earth 와 South Node 는 독립 계산 대상이 아니라 각각 Sun / North Node 의 정확한 반대편이다
 * (요구사항 3). 그래서 "swe 로 직접 구하는 것"과 "반대편으로 유도하는 것"을 표에서 구분한다.
 */

export const PLANET = Object.freeze({
  SUN: "Sun",
  EARTH: "Earth",
  NORTH_NODE: "NorthNode",
  SOUTH_NODE: "SouthNode",
  MOON: "Moon",
  MERCURY: "Mercury",
  VENUS: "Venus",
  MARS: "Mars",
  JUPITER: "Jupiter",
  SATURN: "Saturn",
  URANUS: "Uranus",
  NEPTUNE: "Neptune",
  PLUTO: "Pluto",
});

/** HD 차트 표기 순서 (13개) */
export const PLANET_ORDER = Object.freeze([
  PLANET.SUN,
  PLANET.EARTH,
  PLANET.NORTH_NODE,
  PLANET.SOUTH_NODE,
  PLANET.MOON,
  PLANET.MERCURY,
  PLANET.VENUS,
  PLANET.MARS,
  PLANET.JUPITER,
  PLANET.SATURN,
  PLANET.URANUS,
  PLANET.NEPTUNE,
  PLANET.PLUTO,
]);

/** 천체력에서 직접 구하는 천체 */
export const DIRECT_PLANETS = Object.freeze([
  PLANET.SUN,
  PLANET.NORTH_NODE,
  PLANET.MOON,
  PLANET.MERCURY,
  PLANET.VENUS,
  PLANET.MARS,
  PLANET.JUPITER,
  PLANET.SATURN,
  PLANET.URANUS,
  PLANET.NEPTUNE,
  PLANET.PLUTO,
]);

/** 반대편(+180°)으로 유도하는 천체: 유도 대상 → 기준 천체 */
export const OPPOSITE_OF = Object.freeze({
  [PLANET.EARTH]: PLANET.SUN,
  [PLANET.SOUTH_NODE]: PLANET.NORTH_NODE,
});

/** 계산 계층 */
export const LAYER = Object.freeze({
  PERSONALITY: "personality",
  DESIGN: "design",
});

export const LAYER_ORDER = Object.freeze([LAYER.PERSONALITY, LAYER.DESIGN]);
