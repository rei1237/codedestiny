"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchVedicBirthChart, VEDIC_DEFAULT_ERROR_MESSAGE } from "../lib/vedicApi";

export type VedicPlanet = {
  id: string;
  labelKo: string;
  labelEn: string;
  sign: string | null;
  signLord: string | null;
  degree: number | null;
  house: number | null;
  nakshatra: string | null;
  nakshatraLord: string | null;
  pada: number | null;
  retrograde: boolean;
  combust: boolean;
  dignity: string | null;
};

export type VedicHouse = {
  house: number;
  sign: string | null;
  degree: number | null;
  lord: string | null;
};

export type VedicAscendant = {
  sign: string | null;
  degree: number | null;
  nakshatra: string | null;
  pada: number | null;
} | null;

export type VedicDashas = {
  current: {
    mahadasha: { planet: string | null; start: string | null; end: string | null } | null;
    antardasha: { planet: string | null; start: string | null; end: string | null } | null;
  } | null;
  mahadasha: { planet: string | null; start: string | null; end: string | null } | null;
  antardasha: { planet: string | null; start: string | null; end: string | null } | null;
};

export type VedicChart = {
  profileName: string | null;
  planets: VedicPlanet[];
  houses: VedicHouse[];
  ascendant: VedicAscendant;
  yogas: {
    name: string | null;
    description: string | null;
    strength: string | null;
    effects: string | null;
    category: string | null;
    planetsInvolved: string[];
    housesInvolved: number[];
  }[];
  dashas: VedicDashas;
  meta: {
    ayanamsa: string;
    language: string;
  };
};

type UseVedicChartOptions = {
  autoFetch?: boolean;
};

const SEOUL_DEFAULT = {
  name: "당신의 별자리",
  birthDate: "1990-06-15",
  birthTime: "14:30",
  latitude: 37.5665,
  longitude: 126.978,
  timezone: 9,
};

export function useVedicChart(options: UseVedicChartOptions = {}) {
  const { autoFetch = true } = options;
  const [chart, setChart] = useState<VedicChart | null>(null);
  const [normalizedParams, setNormalizedParams] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!autoFetch) return;

    let cancelled = false;
    setLoading(true);
    setErrorMessage(null);

    (async () => {
      const result = await fetchVedicBirthChart(SEOUL_DEFAULT);
      if (cancelled) return;

      if (!result.ok || !result.chart) {
        setErrorMessage(result.userMessage || VEDIC_DEFAULT_ERROR_MESSAGE);
        setChart(null);
        setNormalizedParams(null);
        setLoading(false);
        return;
      }

      setChart(result.chart as VedicChart);
      setNormalizedParams(result.normalizedParams);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [autoFetch]);

  const ascendantSign = useMemo(() => chart?.ascendant?.sign || null, [chart]);
  const moon = useMemo(
    () => chart?.planets.find((p) => p.id === "moon") || null,
    [chart],
  );

  return {
    chart,
    normalizedParams,
    loading,
    errorMessage,
    ascendantSign,
    moon,
  };
}

