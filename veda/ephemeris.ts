// ============================================================
// src/core/ephemeris.ts
// Phase 1: 천문학 코어 엔진 (The Ephemeris Core)
//
// swisseph 라이브러리를 사용하여 행성의 정확한 위치를 계산합니다.
// Lahiri Ayanamsa를 적용한 Sidereal 황경을 반환합니다.
//
// 설치: npm install swisseph
// ============================================================

import {
  PlanetName,
  PlanetPosition,
  SignName,
  BirthInput,
} from "../types";

// ─── swisseph 타입 선언 ────────────────────────────────────
// swisseph는 @types 패키지가 없으므로 핵심 타입만 선언합니다.
declare module "swisseph" {
  const SE_SUN: number;
  const SE_MOON: number;
  const SE_MERCURY: number;
  const SE_VENUS: number;
  const SE_MARS: number;
  const SE_JUPITER: number;
  const SE_SATURN: number;
  const SE_TRUE_NODE: number; // Rahu (True North Node)
  const SE_SIDM_LAHIRI: number;
  const SEFLG_SIDEREAL: number;
  const SEFLG_SPEED: number;
  const SEFLG_SWIEPH: number;
  function swe_set_sid_mode(mode: number, t0: number, ayan_t0: number): void;
  function swe_julday(
    year: number,
    month: number,
    day: number,
    hour: number,
    gregflag: number
  ): number;
  function swe_calc_ut(
    tjd_ut: number,
    ipl: number,
    iflag: number,
    callback: (body: { longitude: number; latitude: number; distance: number; longitudeSpeed: number; error: string }) => void
  ): void;
  function swe_houses(
    tjd_ut: number,
    geolat: number,
    geolon: number,
    hsys: string,
    callback: (result: { house: number[]; ascendant: number; mc: number; error: string }) => void
  ): void;
  function swe_get_ayanamsa_ut(tjd_ut: number): number;
}

// ─── 상수 정의 ────────────────────────────────────────────

/** 12 별자리 이름 배열 (인덱스 0=Aries) */
export const SIGN_NAMES: SignName[] = [
  "Aries", "Taurus", "Gemini", "Cancer",
  "Leo", "Virgo", "Libra", "Scorpio",
  "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

/** 각 별자리의 지배 행성 */
export const SIGN_LORDS: Record<number, PlanetName> = {
  0:  "Mars",    // Aries
  1:  "Venus",   // Taurus
  2:  "Mercury", // Gemini
  3:  "Moon",    // Cancer
  4:  "Sun",     // Leo
  5:  "Mercury", // Virgo
  6:  "Venus",   // Libra
  7:  "Mars",    // Scorpio
  8:  "Jupiter", // Sagittarius
  9:  "Saturn",  // Capricorn
  10: "Saturn",  // Aquarius
  11: "Jupiter", // Pisces
};

/** 행성 항진(Exaltation) 위치 — { sign: number, degree: number } */
export const EXALTATION: Record<PlanetName, { sign: number; degree: number }> = {
  Sun:     { sign: 0,  degree: 10 }, // Aries 10°
  Moon:    { sign: 1,  degree: 3  }, // Taurus 3°
  Mars:    { sign: 9,  degree: 28 }, // Capricorn 28°
  Mercury: { sign: 5,  degree: 15 }, // Virgo 15°
  Jupiter: { sign: 3,  degree: 5  }, // Cancer 5°
  Venus:   { sign: 11, degree: 27 }, // Pisces 27°
  Saturn:  { sign: 6,  degree: 20 }, // Libra 20°
  Rahu:    { sign: 2,  degree: 0  }, // Gemini (traditional)
  Ketu:    { sign: 8,  degree: 0  }, // Sagittarius (traditional)
};

/** 행성 약화(Debilitation) 위치 */
export const DEBILITATION: Record<PlanetName, { sign: number; degree: number }> = {
  Sun:     { sign: 6,  degree: 10 }, // Libra
  Moon:    { sign: 7,  degree: 3  }, // Scorpio
  Mars:    { sign: 3,  degree: 28 }, // Cancer
  Mercury: { sign: 11, degree: 15 }, // Pisces
  Jupiter: { sign: 9,  degree: 5  }, // Capricorn
  Venus:   { sign: 5,  degree: 27 }, // Virgo
  Saturn:  { sign: 0,  degree: 20 }, // Aries
  Rahu:    { sign: 8,  degree: 0  }, // Sagittarius
  Ketu:    { sign: 2,  degree: 0  }, // Gemini
};

/** 행성 자기 별자리(Own Sign) */
export const OWN_SIGNS: Record<PlanetName, number[]> = {
  Sun:     [4],       // Leo
  Moon:    [3],       // Cancer
  Mars:    [0, 7],    // Aries, Scorpio
  Mercury: [2, 5],    // Gemini, Virgo
  Jupiter: [8, 11],   // Sagittarius, Pisces
  Venus:   [1, 6],    // Taurus, Libra
  Saturn:  [9, 10],   // Capricorn, Aquarius
  Rahu:    [],
  Ketu:    [],
};

/** swisseph 행성 ID 매핑 */
const PLANET_IDS = (sw: typeof import("swisseph")): Record<PlanetName, number> => ({
  Sun:     sw.SE_SUN,
  Moon:    sw.SE_MOON,
  Mars:    sw.SE_MARS,
  Mercury: sw.SE_MERCURY,
  Jupiter: sw.SE_JUPITER,
  Venus:   sw.SE_VENUS,
  Saturn:  sw.SE_SATURN,
  Rahu:    sw.SE_TRUE_NODE,
  Ketu:    -1, // Ketu = Rahu + 180°
});

// ─── 유틸리티 함수 ─────────────────────────────────────────

/**
 * 각도를 0~360 범위로 정규화합니다.
 */
export function normalizeDegree(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * 황경으로부터 별자리 인덱스(0~11)를 반환합니다.
 */
export function signFromLongitude(longitude: number): number {
  return Math.floor(normalizeDegree(longitude) / 30);
}

/**
 * 황경으로부터 별자리 내 각도(0~30)를 반환합니다.
 */
export function degreeInSign(longitude: number): number {
  return normalizeDegree(longitude) % 30;
}

/**
 * 행성의 품위(Dignity)를 판별합니다.
 */
export function getPlanetDignity(
  planet: PlanetName,
  signIndex: number
): PlanetPosition["dignity"] {
  if (EXALTATION[planet].sign === signIndex) return "Exalted";
  if (DEBILITATION[planet].sign === signIndex) return "Debilitated";
  if (OWN_SIGNS[planet]?.includes(signIndex)) return "Own";
  return "Neutral";
}

/**
 * Julian Day Number 계산 (UTC 기준)
 * swisseph 없이도 JD를 계산하기 위한 독립 구현.
 *
 * @param year  - 연도
 * @param month - 월 (1~12)
 * @param day   - 일
 * @param hour  - 소수 시간 (UTC)
 */
export function calcJulianDay(
  year: number,
  month: number,
  day: number,
  hour: number
): number {
  // Meeus Algorithm (Gregorian Calendar)
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    B -
    1524.5 +
    hour / 24
  );
}

// ─── 메인 Ephemeris 클래스 ─────────────────────────────────

/**
 * EphemerisEngine
 *
 * swisseph를 사용하여 Lahiri Ayanamsa 기반의 Sidereal 행성 위치를
 * 계산합니다. 인스턴스 생성 시 Lahiri 세차 보정 모드가 자동 설정됩니다.
 *
 * @example
 * ```typescript
 * const engine = new EphemerisEngine();
 * const jd = engine.getJulianDay(new Date('1990-01-01T03:00:00Z'));
 * const positions = await engine.getPlanetaryPositions(jd);
 * ```
 */
export class EphemerisEngine {
  private sw: typeof import("swisseph");

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    this.sw = require("swisseph");
    this.initializeLahiriAyanamsa();
  }

  /**
   * Lahiri Ayanamsa 세차 보정 모드를 설정합니다.
   * 베다 점성술 표준 세차 보정 방식입니다.
   *
   * 공식: L_sidereal = L_tropical - Ayanamsa
   */
  private initializeLahiriAyanamsa(): void {
    this.sw.swe_set_sid_mode(this.sw.SE_SIDM_LAHIRI, 0, 0);
  }

  /**
   * Date 객체를 Julian Day Number (UT)로 변환합니다.
   *
   * @param datetime - UTC 기준 Date 객체
   * @param timezoneOffset - 로컬 타임존 오프셋 (시간 단위, 예: KST=9)
   */
  getJulianDay(datetime: Date, timezoneOffset = 0): number {
    const utcDate = new Date(
      datetime.getTime() - timezoneOffset * 3600 * 1000
    );
    const year = utcDate.getUTCFullYear();
    const month = utcDate.getUTCMonth() + 1;
    const day = utcDate.getUTCDate();
    const hour =
      utcDate.getUTCHours() +
      utcDate.getUTCMinutes() / 60 +
      utcDate.getUTCSeconds() / 3600;

    return this.sw.swe_julday(year, month, day, hour, 1); // 1 = Gregorian
  }

  /**
   * 단일 행성의 Sidereal 황경·황위·속도를 계산합니다.
   *
   * @param julianDay - Julian Day Number
   * @param planet    - 행성 이름
   */
  private async calcSinglePlanet(
    julianDay: number,
    planet: PlanetName
  ): Promise<PlanetPosition> {
    const ids = PLANET_IDS(this.sw);
    const flags =
      this.sw.SEFLG_SIDEREAL |
      this.sw.SEFLG_SPEED |
      this.sw.SEFLG_SWIEPH;

    return new Promise((resolve, reject) => {
      let longitude: number;
      let latitude: number;
      let speed: number;

      if (planet === "Ketu") {
        // Ketu = Rahu의 반대 지점 (±180°)
        this.sw.swe_calc_ut(julianDay, this.sw.SE_TRUE_NODE, flags, (body) => {
          if (body.error) reject(new Error(`Rahu calc error: ${body.error}`));
          longitude = normalizeDegree(body.longitude + 180);
          latitude = -body.latitude;
          speed = body.longitudeSpeed;
        });
      } else {
        const planetId = ids[planet];
        this.sw.swe_calc_ut(julianDay, planetId, flags, (body) => {
          if (body.error)
            reject(new Error(`${planet} calc error: ${body.error}`));
          longitude = body.longitude;
          latitude = body.latitude;
          speed = body.longitudeSpeed;
        });
      }

      const signIdx = signFromLongitude(longitude!);
      resolve({
        longitude: longitude!,
        latitude: latitude!,
        speed: speed!,
        sign: signIdx,
        signName: SIGN_NAMES[signIdx],
        degreeInSign: degreeInSign(longitude!),
        isRetrograde: speed! < 0,
        dignity: getPlanetDignity(planet, signIdx),
      });
    });
  }

  /**
   * 9개 행성 전체의 Sidereal 위치를 계산합니다.
   *
   * @param julianDay - Julian Day Number
   * @returns Record<PlanetName, PlanetPosition>
   */
  async getPlanetaryPositions(
    julianDay: number
  ): Promise<Record<PlanetName, PlanetPosition>> {
    const planets: PlanetName[] = [
      "Sun", "Moon", "Mars", "Mercury", "Jupiter",
      "Venus", "Saturn", "Rahu", "Ketu",
    ];

    const entries = await Promise.all(
      planets.map(async (p) => [p, await this.calcSinglePlanet(julianDay, p)])
    );

    return Object.fromEntries(entries) as Record<PlanetName, PlanetPosition>;
  }

  /**
   * 상승궁(Lagna/Ascendant)의 Sidereal 황경을 계산합니다.
   * Whole Sign House 시스템을 위한 기준점입니다.
   *
   * @param julianDay - Julian Day Number
   * @param latitude  - 출생지 위도
   * @param longitude - 출생지 경도
   */
  async getAscendant(
    julianDay: number,
    latitude: number,
    longitude: number
  ): Promise<number> {
    const ayanamsa = this.sw.swe_get_ayanamsa_ut(julianDay);

    return new Promise((resolve, reject) => {
      // Placidus 시스템으로 Ascendant를 구한 후 Ayanamsa를 빼서 Sidereal로 변환
      this.sw.swe_houses(
        julianDay,
        latitude,
        longitude,
        "P", // Placidus (Ascendant 계산에 사용)
        (result) => {
          if (result.error) reject(new Error(`Houses error: ${result.error}`));
          const tropicalAscendant = result.ascendant;
          const siderealAscendant = normalizeDegree(
            tropicalAscendant - ayanamsa
          );
          resolve(siderealAscendant);
        }
      );
    });
  }

  /**
   * 현재 Ayanamsa 값을 반환합니다.
   */
  getAyanamsa(julianDay: number): number {
    return this.sw.swe_get_ayanamsa_ut(julianDay);
  }
}

// ─── Mock 모드 (swisseph 없이 테스트용) ─────────────────────

/**
 * MockEphemerisEngine
 *
 * swisseph 없이 동작하는 근사치 계산 엔진입니다.
 * 개발·테스트 환경에서 사용하며, 실제 프로덕션에서는
 * EphemerisEngine으로 교체해야 합니다.
 *
 * 행성 위치는 1990-01-01 기준 근사값을 사용하며,
 * 실제 정밀 계산과 약 ±1~2° 오차가 있을 수 있습니다.
 */
export class MockEphemerisEngine {
  /**
   * Julian Day Number 계산 (Meeus 알고리즘)
   */
  getJulianDay(datetime: Date, timezoneOffset = 0): number {
    const utcDate = new Date(
      datetime.getTime() - timezoneOffset * 3600 * 1000
    );
    return calcJulianDay(
      utcDate.getUTCFullYear(),
      utcDate.getUTCMonth() + 1,
      utcDate.getUTCDate(),
      utcDate.getUTCHours() +
        utcDate.getUTCMinutes() / 60 +
        utcDate.getUTCSeconds() / 3600
    );
  }

  /**
   * Mock 행성 위치 — 1990-01-01 12:00 UTC 기준 근사 데이터
   * (Lahiri Ayanamsa ≈ 23.67° 적용)
   */
  getPlanetaryPositions(
    _julianDay: number
  ): Record<PlanetName, PlanetPosition> {
    // 1990-01-01 UTC 기준 Tropical 황경 → Lahiri Sidereal 변환값
    // Ayanamsa(1990) ≈ 23.67°
    const rawPositions: Record<PlanetName, [number, number, number]> = {
      // [longitude(sidereal), latitude, speed]
      Sun:     [256.34,  0.00,  1.02],  // Sagittarius
      Moon:    [108.72,  4.12, 13.18],  // Cancer
      Mars:    [22.10,   0.41,  0.64],  // Aries
      Mercury: [245.89, -1.20,  1.45],  // Sagittarius
      Jupiter: [62.55,   0.98,  0.11],  // Taurus
      Venus:   [271.33,  1.02,  1.21],  // Sagittarius
      Saturn:  [271.10,  1.22,  0.02],  // Sagittarius
      Rahu:    [96.81,   0.00, -0.05],  // Cancer
      Ketu:    [276.81,  0.00, -0.05],  // Sagittarius
    };

    const result = {} as Record<PlanetName, PlanetPosition>;
    for (const [planet, [lon, lat, spd]] of Object.entries(rawPositions)) {
      const p = planet as PlanetName;
      const signIdx = signFromLongitude(lon);
      result[p] = {
        longitude: lon,
        latitude: lat,
        speed: spd,
        sign: signIdx,
        signName: SIGN_NAMES[signIdx],
        degreeInSign: degreeInSign(lon),
        isRetrograde: spd < 0,
        dignity: getPlanetDignity(p, signIdx),
      };
    }
    return result;
  }

  /**
   * Mock 상승궁 — 서울(37.57°N, 126.98°E), 1990-01-01 12:00 KST 기준
   * 근사값: Lagna ≈ Pisces (~333°)
   */
  getAscendant(
    _julianDay: number,
    _latitude: number,
    _longitude: number
  ): number {
    return 333.5; // Pisces ~3.5°
  }

  getAyanamsa(_julianDay: number): number {
    return 23.67;
  }
}
