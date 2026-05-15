export type VedicReportMode = "single" | "compatibility";

export interface VedicPdfChapterSection {
  title: string;
  body: string;
}

export interface VedicPdfChapterOutput {
  chapterNumber: number;
  chapterId: string;
  title: string;
  summary: string;
  sections: VedicPdfChapterSection[];
  actionItems: string[];
  cautions: string[];
  fallbackUsed: boolean;
  missingFields: string[];
  confidence: number;
}

export interface VedicPdfChapterDefinition {
  number: number;
  id: string;
  titleKo: string;
  subtitleKo: string;
  icon: string;
  objective: string;
}

export interface VedicPdfPlanet {
  name: string;
  sign: string | null;
  degree: number | null;
  house: number | null;
  nakshatra: string | null;
  retrograde: boolean;
  dignity: string | null;
  fallbackUsed: boolean;
}

export interface VedicPdfHouse {
  houseNumber: number;
  sign: string;
  lord: string;
  planets: string[];
  fallbackUsed: boolean;
}

export interface VedicPdfContext {
  reportMode: VedicReportMode;
  user: {
    name?: string | null;
    birth?: {
      year: number | null;
      month: number | null;
      day: number | null;
      hour: number | null;
      minute: number | null;
      timezone: number | null;
      lat: number | null;
      lon: number | null;
      birthPlace?: string | null;
    };
  };
  partner?: {
    name?: string | null;
    birth?: {
      year: number | null;
      month: number | null;
      day: number | null;
      hour: number | null;
      minute: number | null;
      timezone: number | null;
      lat: number | null;
      lon: number | null;
      birthPlace?: string | null;
    };
  };
  core: {
    lagna: {
      sign: string | null;
      degree: number | null;
      fallbackUsed: boolean;
    };
    moon: {
      sign: string | null;
      nakshatra: string | null;
      pada: number | null;
      fallbackUsed: boolean;
    };
    sun: {
      sign: string | null;
      house: number | null;
      fallbackUsed: boolean;
    };
    atmakaraka: {
      planet: string | null;
      sign: string | null;
      fallbackUsed: boolean;
    };
    dasha: {
      maha: {
        planet: string | null;
        startDate: string | null;
        endDate: string | null;
        fallbackUsed: boolean;
      };
      antar: {
        planet: string | null;
        startDate: string | null;
        endDate: string | null;
        fallbackUsed: boolean;
      };
      fallbackUsed: boolean;
    };
    yogas: Array<{
      name: string;
      planets: string[];
      fallbackUsed: boolean;
    }>;
  };
  charts: {
    d1: {
      houses: VedicPdfHouse[];
      planets: VedicPdfPlanet[];
    };
    d9: {
      planets: Array<{ planet: string; sign: string | null; fallbackUsed: boolean }>;
      fallbackUsed: boolean;
    };
    d10: {
      planets: Array<{ planet: string; sign: string | null; fallbackUsed: boolean }>;
      fallbackUsed: boolean;
    };
  };
  missingSummary: string[];
  sourceMeta: {
    ayanamsa: number | null;
    chartEngine: string;
    fallbackUsed: boolean;
  };
}
