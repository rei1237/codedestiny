export type RawPlanetLike = {
  sign?: string | number;
  signKo?: string;
  signEmoji?: string;
  degree?: number;
  longitude?: number;
  house?: number;
  retrograde?: boolean;
  isRetrograde?: boolean;
};

export type RawAspectLike = {
  p1?: string;
  p2?: string;
  planet1?: string;
  planet2?: string;
  type?: string;
  typeKo?: string;
  orb?: number;
};

export type RawHouseLike = {
  house?: number;
  cuspLongitude?: number;
  degree?: number;
  absoluteDegree?: number;
  sign?: string | number;
  signKo?: string;
};

export type RawWesternChart = {
  planets?: Record<string, RawPlanetLike>;
  ascendant?: RawPlanetLike;
  midheaven?: RawPlanetLike;
  aspects?: RawAspectLike[];
  northNode?: RawPlanetLike;
  southNode?: RawPlanetLike;
  houseCusps?: number[];
  houses?: RawHouseLike[];
  source?: string;
};

export type ZodiacSign = {
  index: number;
  key: string;
  labelKo: string;
  glyph: string;
  baseDegree: number;
};

export type NormalizedPlanet = {
  id: string;
  label: string;
  glyph: string;
  sign: ZodiacSign;
  degreeInSign: number;
  absoluteDegree: number;
  house: number | null;
  retrograde: boolean;
};

export type NormalizedHouse = {
  house: number;
  absoluteDegree: number;
  sign: ZodiacSign;
};

export type AspectType = "conjunction" | "opposition" | "trine" | "square" | "sextile";

export type NormalizedAspect = {
  id: string;
  from: string;
  to: string;
  type: AspectType;
  orb: number | null;
  typeLabelKo: string;
};

export type ChartAnglePoint = {
  key: "ASC" | "MC";
  absoluteDegree: number;
  sign: ZodiacSign;
  degreeInSign: number;
};

export type NormalizedChartData = {
  source: string;
  planets: NormalizedPlanet[];
  houses: NormalizedHouse[];
  aspects: NormalizedAspect[];
  angles: {
    asc: ChartAnglePoint | null;
    mc: ChartAnglePoint | null;
  };
  warnings: string[];
};
