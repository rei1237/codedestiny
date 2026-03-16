// ============================================================
// src/core/charts.ts
// Phase 2: 베다 점성술 차트 시스템 구축
//
// D-1 Rasi Chart, Nakshatra, Vimshottari Dasha,
// Varga Charts (D-2, D-9, D-10)를 계산합니다.
// ============================================================

import {
  PlanetName,
  PlanetPosition,
  SignName,
  NakshatraName,
  NakshatraInfo,
  RasiChart,
  HouseInfo,
  VargaChart,
  BirthChartData,
  BirthInput,
  Mahadasha,
  Antardasha,
} from "../types";
import {
  SIGN_NAMES,
  SIGN_LORDS,
  signFromLongitude,
  normalizeDegree,
  MockEphemerisEngine,
  EphemerisEngine,
} from "./ephemeris";

// ─── 상수: 낙샤트라 데이터 ─────────────────────────────────

/**
 * 27 낙샤트라 정의
 * - name: 낙샤트라 이름
 * - lord: 지배 행성 (Vimshottari Dasha 순서)
 * - startDeg: 시작 황경 (0°부터)
 */
export const NAKSHATRAS: Array<{
  name: NakshatraName;
  lord: PlanetName;
  startDeg: number;
}> = [
  { name: "Ashwini",           lord: "Ketu",    startDeg: 0      },
  { name: "Bharani",           lord: "Venus",   startDeg: 13.333 },
  { name: "Krittika",          lord: "Sun",     startDeg: 26.666 },
  { name: "Rohini",            lord: "Moon",    startDeg: 40.0   },
  { name: "Mrigashira",        lord: "Mars",    startDeg: 53.333 },
  { name: "Ardra",             lord: "Rahu",    startDeg: 66.666 },
  { name: "Punarvasu",         lord: "Jupiter", startDeg: 80.0   },
  { name: "Pushya",            lord: "Saturn",  startDeg: 93.333 },
  { name: "Ashlesha",          lord: "Mercury", startDeg: 106.666},
  { name: "Magha",             lord: "Ketu",    startDeg: 120.0  },
  { name: "Purva Phalguni",    lord: "Venus",   startDeg: 133.333},
  { name: "Uttara Phalguni",   lord: "Sun",     startDeg: 146.666},
  { name: "Hasta",             lord: "Moon",    startDeg: 160.0  },
  { name: "Chitra",            lord: "Mars",    startDeg: 173.333},
  { name: "Swati",             lord: "Rahu",    startDeg: 186.666},
  { name: "Vishakha",          lord: "Jupiter", startDeg: 200.0  },
  { name: "Anuradha",          lord: "Saturn",  startDeg: 213.333},
  { name: "Jyeshtha",          lord: "Mercury", startDeg: 226.666},
  { name: "Mula",              lord: "Ketu",    startDeg: 240.0  },
  { name: "Purva Ashadha",     lord: "Venus",   startDeg: 253.333},
  { name: "Uttara Ashadha",    lord: "Sun",     startDeg: 266.666},
  { name: "Shravana",          lord: "Moon",    startDeg: 280.0  },
  { name: "Dhanishtha",        lord: "Mars",    startDeg: 293.333},
  { name: "Shatabhisha",       lord: "Rahu",    startDeg: 306.666},
  { name: "Purva Bhadrapada",  lord: "Jupiter", startDeg: 320.0  },
  { name: "Uttara Bhadrapada", lord: "Saturn",  startDeg: 333.333},
  { name: "Revati",            lord: "Mercury", startDeg: 346.666},
];

/** Vimshottari Dasha 순서 및 기간 (년) */
export const DASHA_SEQUENCE: Array<{ planet: PlanetName; years: number }> = [
  { planet: "Ketu",    years: 7  },
  { planet: "Venus",   years: 20 },
  { planet: "Sun",     years: 6  },
  { planet: "Moon",    years: 10 },
  { planet: "Mars",    years: 7  },
  { planet: "Rahu",    years: 18 },
  { planet: "Jupiter", years: 16 },
  { planet: "Saturn",  years: 19 },
  { planet: "Mercury", years: 17 },
];

/** 총 Vimshottari 주기: 120년 */
const TOTAL_DASHA_YEARS = 120;

// ─── 낙샤트라 계산 ─────────────────────────────────────────

/**
 * 달의 황경을 기반으로 낙샤트라와 Pada를 계산합니다.
 *
 * - 각 낙샤트라 = 360° / 27 ≈ 13°20'
 * - 각 Pada = 13°20' / 4 = 3°20'
 *
 * @param moonLongitude - 달의 Sidereal 황경 (0–360°)
 */
export function calcNakshatra(moonLongitude: number): NakshatraInfo {
  const NAKSHATRA_SPAN = 360 / 27; // ≈ 13.3333°
  const PADA_SPAN = NAKSHATRA_SPAN / 4; // ≈ 3.3333°

  const lon = normalizeDegree(moonLongitude);
  const index = Math.floor(lon / NAKSHATRA_SPAN);
  const degreeInNakshatra = lon - index * NAKSHATRA_SPAN;
  const pada = (Math.floor(degreeInNakshatra / PADA_SPAN) + 1) as 1 | 2 | 3 | 4;

  const nakshatra = NAKSHATRAS[index];
  return {
    index,
    name: nakshatra.name,
    lord: nakshatra.lord,
    pada,
    degreeInNakshatra,
  };
}

// ─── Vimshottari Dasha 계산 ────────────────────────────────

/**
 * 밀리초를 날짜에 더하는 헬퍼 함수
 */
function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  // 소수점 연도를 날짜로 변환 (1년 = 365.25일)
  const days = years * 365.25;
  result.setTime(result.getTime() + days * 24 * 3600 * 1000);
  return result;
}

/**
 * Vimshottari Dasha의 대운(Mahadasha)과 세운(Antardasha)을 계산합니다.
 *
 * 알고리즘:
 * 1. 달이 위치한 낙샤트라의 지배 행성 = 첫 번째 대운
 * 2. 낙샤트라 내에서 달의 위치 비율 → 첫 번째 대운의 잔여 기간 계산
 * 3. 이후 9개 행성 순서로 120년 사이클 반복
 *
 * 세운 기간:
 *   antardasha_years = (mahadasha_years × antardasha_planet_years) / 120
 *
 * @param nakshatra    - 달의 낙샤트라 정보
 * @param birthDate    - 출생 날짜
 * @param yearsToCalc  - 계산할 총 기간 (기본 120년)
 */
export function calcVimshottariDasha(
  nakshatra: NakshatraInfo,
  birthDate: Date,
  yearsToCalc = 120
): Mahadasha[] {
  const NAKSHATRA_SPAN = 360 / 27;

  // 첫 번째 대운: 낙샤트라 지배 행성
  const firstLordIndex = DASHA_SEQUENCE.findIndex(
    (d) => d.planet === nakshatra.lord
  );

  // 낙샤트라 내에서 달이 경과한 비율 → 첫 번째 대운의 잔여 기간
  const elapsedFraction = nakshatra.degreeInNakshatra / NAKSHATRA_SPAN;
  const firstDashaYears = DASHA_SEQUENCE[firstLordIndex].years;
  const balanceYears = firstDashaYears * (1 - elapsedFraction);

  const mahadashas: Mahadasha[] = [];
  let currentDate = birthDate;
  let totalYearsAdded = 0;
  let sequenceIndex = firstLordIndex;

  while (totalYearsAdded < yearsToCalc) {
    const dashaInfo = DASHA_SEQUENCE[sequenceIndex % 9];
    const duration =
      sequenceIndex === firstLordIndex ? balanceYears : dashaInfo.years;

    const startDate = new Date(currentDate);
    const endDate = addYears(currentDate, duration);

    // 세운(Antardasha) 계산
    const antardashas = calcAntardashas(
      dashaInfo.planet,
      duration,
      startDate,
      sequenceIndex
    );

    mahadashas.push({
      planet: dashaInfo.planet,
      startDate,
      endDate,
      durationYears: duration,
      antardashas,
    });

    currentDate = endDate;
    totalYearsAdded += duration;
    sequenceIndex = (sequenceIndex + 1) % 9;
  }

  return mahadashas;
}

/**
 * 특정 대운 내의 세운(Antardasha) 목록을 계산합니다.
 *
 * @param mahaLord      - 대운 지배 행성
 * @param mahaYears     - 대운 기간 (년)
 * @param mahaStart     - 대운 시작일
 * @param startIdx      - 세운 시작 순서 인덱스 (대운과 동일한 행성부터 시작)
 */
function calcAntardashas(
  mahaLord: PlanetName,
  mahaYears: number,
  mahaStart: Date,
  startIdx: number
): Antardasha[] {
  const antardashas: Antardasha[] = [];
  let currentDate = new Date(mahaStart);

  for (let i = 0; i < 9; i++) {
    const antarIdx = (startIdx + i) % 9;
    const antarPlanet = DASHA_SEQUENCE[antarIdx].planet;
    const antarPlanetYears = DASHA_SEQUENCE[antarIdx].years;

    // 세운 기간 = (대운 기간 × 세운 행성 기간) / 120
    const antarYears = (mahaYears * antarPlanetYears) / TOTAL_DASHA_YEARS;
    const antarDays = Math.round(antarYears * 365.25);

    const startDate = new Date(currentDate);
    const endDate = new Date(
      currentDate.getTime() + antarDays * 24 * 3600 * 1000
    );

    antardashas.push({
      planet: antarPlanet,
      startDate,
      endDate,
      durationDays: antarDays,
    });

    currentDate = endDate;
    void mahaLord; // 참조 경고 방지
  }

  return antardashas;
}

/**
 * 특정 날짜에 해당하는 현재 대운·세운을 반환합니다.
 */
export function getCurrentDasha(
  dashas: Mahadasha[],
  targetDate: Date = new Date()
): { mahadasha: Mahadasha; antardasha: Antardasha } {
  const maha = dashas.find(
    (d) => targetDate >= d.startDate && targetDate <= d.endDate
  );
  if (!maha) {
    return {
      mahadasha: dashas[dashas.length - 1],
      antardasha: dashas[dashas.length - 1].antardashas[0],
    };
  }

  const anta = maha.antardashas.find(
    (a) => targetDate >= a.startDate && targetDate <= a.endDate
  );

  return {
    mahadasha: maha,
    antardasha: anta ?? maha.antardashas[0],
  };
}

// ─── D-1 Rasi Chart (Whole Sign House) ────────────────────

/**
 * Whole Sign House 시스템으로 D-1 Rasi Chart를 구성합니다.
 *
 * Whole Sign: Lagna가 속한 별자리 전체가 1하우스,
 * 다음 별자리가 2하우스, ... 순서로 배치됩니다.
 *
 * @param ascendant - Lagna 황경 (Sidereal)
 * @param planets   - 9개 행성의 위치
 */
export function buildRasiChart(
  ascendant: number,
  planets: Record<PlanetName, PlanetPosition>
): RasiChart {
  const lagnaSign = signFromLongitude(ascendant);
  const lagnaSignName = SIGN_NAMES[lagnaSign] as SignName;

  // 12개 하우스 구성 (Whole Sign)
  const houses: HouseInfo[] = [];
  for (let h = 0; h < 12; h++) {
    const signIdx = (lagnaSign + h) % 12;
    const signName = SIGN_NAMES[signIdx] as SignName;
    const planetsInHouse: PlanetName[] = [];

    // 해당 하우스(별자리)에 위치한 행성 찾기
    for (const [planet, pos] of Object.entries(planets) as [PlanetName, PlanetPosition][]) {
      if (pos.sign === signIdx) {
        planetsInHouse.push(planet);
      }
    }

    houses.push({
      number: h + 1,
      sign: signName,
      signIndex: signIdx,
      planets: planetsInHouse,
      lord: SIGN_LORDS[signIdx],
    });
  }

  return {
    ascendant,
    ascendantSign: lagnaSignName,
    planets,
    houses,
  };
}

// ─── Varga Chart 계산 ─────────────────────────────────────

/**
 * D-2 Hora Chart (재물 차트) 계산
 *
 * 규칙:
 * - 홀수 별자리 (Aries, Gemini, Leo...): 0–15° → 태양 Hora (Leo), 15–30° → 달 Hora (Cancer)
 * - 짝수 별자리 (Taurus, Cancer, Virgo...): 0–15° → 달 Hora (Cancer), 15–30° → 태양 Hora (Leo)
 */
export function calcD2Hora(
  planets: Record<PlanetName, PlanetPosition>
): VargaChart {
  const result = {} as VargaChart["planets"];

  for (const [planet, pos] of Object.entries(planets) as [PlanetName, PlanetPosition][]) {
    const isOddSign = pos.sign % 2 === 0; // 0-indexed: Aries=0(홀), Taurus=1(짝)
    const degInSign = pos.degreeInSign;
    let horaSign: number;

    if (isOddSign) {
      horaSign = degInSign < 15 ? 4 : 3; // Leo(4) or Cancer(3)
    } else {
      horaSign = degInSign < 15 ? 3 : 4; // Cancer(3) or Leo(4)
    }

    result[planet] = { sign: horaSign, signName: SIGN_NAMES[horaSign] };
  }

  return { type: "D2", planets: result };
}

/**
 * D-9 Navamsa Chart (영혼·배우자 차트) 계산
 *
 * 각 별자리를 9등분 (각 3°20' = 3.333°).
 * 시작 별자리는 원소(Element)에 따라 결정:
 * - Fire (Aries, Leo, Sag)      → Aries부터 시작
 * - Earth (Taurus, Virgo, Cap)  → Capricorn부터 시작
 * - Air (Gemini, Libra, Aqr)    → Libra부터 시작
 * - Water (Cancer, Scorpio, Pis)→ Cancer부터 시작
 */
export function calcD9Navamsa(
  planets: Record<PlanetName, PlanetPosition>
): VargaChart {
  const NAVAMSA_SPAN = 30 / 9; // 3.333°
  const START_SIGNS: Record<number, number> = {
    0: 0, 4: 0, 8: 0,   // Fire → Aries
    1: 9, 5: 9, 9: 9,   // Earth → Capricorn
    2: 6, 6: 6, 10: 6,  // Air → Libra
    3: 3, 7: 3, 11: 3,  // Water → Cancer
  };

  const result = {} as VargaChart["planets"];

  for (const [planet, pos] of Object.entries(planets) as [PlanetName, PlanetPosition][]) {
    const navamsaIndex = Math.floor(pos.degreeInSign / NAVAMSA_SPAN);
    const startSign = START_SIGNS[pos.sign];
    const navamsaSign = (startSign + navamsaIndex) % 12;

    result[planet] = { sign: navamsaSign, signName: SIGN_NAMES[navamsaSign] };
  }

  return { type: "D9", planets: result };
}

/**
 * D-10 Dasamsa Chart (직업 차트) 계산
 *
 * 각 별자리를 10등분 (각 3°).
 * - 홀수 별자리: 같은 별자리부터 시작 (e.g. Aries → Aries, Cap, Aqu, ...)
 * - 짝수 별자리: 9번째 별자리부터 시작 (e.g. Taurus → Capricorn, Aqu, ...)
 */
export function calcD10Dasamsa(
  planets: Record<PlanetName, PlanetPosition>
): VargaChart {
  const DASAMSA_SPAN = 3; // 3°

  const result = {} as VargaChart["planets"];

  for (const [planet, pos] of Object.entries(planets) as [PlanetName, PlanetPosition][]) {
    const dasamsaIndex = Math.floor(pos.degreeInSign / DASAMSA_SPAN);
    const isOddSign = pos.sign % 2 === 0; // 0-indexed Aries=0

    // 홀수 별자리: 자기 별자리, 짝수 별자리: 9번째 별자리부터
    const startSign = isOddSign ? pos.sign : (pos.sign + 8) % 12;
    const dasamsaSign = (startSign + dasamsaIndex) % 12;

    result[planet] = { sign: dasamsaSign, signName: SIGN_NAMES[dasamsaSign] };
  }

  return { type: "D10", planets: result };
}

// ─── 메인 차트 빌더 ────────────────────────────────────────

/**
 * ChartBuilder
 *
 * BirthInput을 받아 완전한 BirthChartData를 생성합니다.
 * useMock=true이면 swisseph 없이 근사 데이터를 사용합니다.
 *
 * @example
 * ```typescript
 * const builder = new ChartBuilder({ useMock: true });
 * const chart = await builder.build({
 *   datetime: new Date('1990-01-01T03:00:00Z'),
 *   latitude: 37.5665,
 *   longitude: 126.9780,
 *   timezoneOffset: 9,
 *   gender: 'M',
 * });
 * ```
 */
export class ChartBuilder {
  private engine: EphemerisEngine | MockEphemerisEngine;

  constructor(options: { useMock?: boolean } = {}) {
    if (options.useMock) {
      this.engine = new MockEphemerisEngine();
    } else {
      this.engine = new EphemerisEngine();
    }
  }

  /**
   * 전체 BirthChartData를 계산합니다.
   */
  async build(input: BirthInput): Promise<BirthChartData> {
    const jd = this.engine.getJulianDay(input.datetime, input.timezoneOffset);

    // Phase 1: 행성 위치 및 상승궁 계산
    const [planets, ascendant] = await Promise.all([
      Promise.resolve(this.engine.getPlanetaryPositions(jd)),
      Promise.resolve(
        this.engine.getAscendant(jd, input.latitude, input.longitude)
      ),
    ]);

    // Phase 2-1: D-1 Rasi Chart
    const rasi = buildRasiChart(ascendant, planets);

    // Phase 2-2: 달의 낙샤트라
    const nakshatra = calcNakshatra(planets.Moon.longitude);

    // Phase 2-3: Vimshottari Dasha
    const dashas = calcVimshottariDasha(nakshatra, input.datetime);
    const currentDasha = getCurrentDasha(dashas, new Date());

    // Phase 2-4: Varga Charts
    const d2 = calcD2Hora(planets);
    const d9 = calcD9Navamsa(planets);
    const d10 = calcD10Dasamsa(planets);

    return {
      input,
      rasi,
      nakshatra,
      dashas,
      currentDasha,
      varga: { d2, d9, d10 },
    };
  }

  /**
   * 특정 하우스의 행성 목록을 반환합니다 (1-indexed).
   */
  static getPlanetsInHouse(
    chart: RasiChart,
    houseNumber: number
  ): PlanetName[] {
    return chart.houses[houseNumber - 1]?.planets ?? [];
  }

  /**
   * 특정 하우스의 지배 행성을 반환합니다 (1-indexed).
   */
  static getHouseLord(chart: RasiChart, houseNumber: number): PlanetName {
    return chart.houses[houseNumber - 1]?.lord;
  }

  /**
   * 특정 행성이 위치한 하우스 번호를 반환합니다.
   */
  static getPlanetHouse(
    chart: RasiChart,
    planet: PlanetName
  ): number {
    const idx = chart.houses.findIndex((h) => h.planets.includes(planet));
    return idx === -1 ? 0 : idx + 1;
  }
}
