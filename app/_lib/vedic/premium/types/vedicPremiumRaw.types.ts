export interface VedicRawPlanet {
  name: string;
  sign: string | null;
  house: number | null;
  degree: number | null;
  dignity: string | null;
  retrograde: boolean;
  nakshatra: string | null;
}

export interface VedicRawHouse {
  house: number;
  sign: string | null;
  lord: string | null;
  planets: string[];
}

export interface VedicRawYoga {
  code: string;
  detected: boolean;
  evidence?: string[];
}

export interface VedicRawDosha {
  code: string;
  detected: boolean;
  severity?: "low" | "mid" | "high";
}

export interface VedicRawDasha {
  maha: string | null;
  antar: string | null;
  next?: string | null;
}

export interface VedicRawDivisional {
  d9?: Record<string, string | null>;
  d10?: Record<string, string | null>;
}

export interface VedicRawTransit {
  jupiter?: string | null;
  saturn?: string | null;
  rahuKetu?: string | null;
}

export interface VedicPremiumRawData {
  lagna: { sign: string | null; degree: number | null };
  moon: { sign: string | null; nakshatra: string | null; pada: number | null; house: number | null };
  sun: { sign: string | null; house: number | null };
  planets: VedicRawPlanet[];
  houses: VedicRawHouse[];
  yogas: VedicRawYoga[];
  doshas: VedicRawDosha[];
  dasha: VedicRawDasha;
  divisional: VedicRawDivisional;
  transit: VedicRawTransit;
}
