"use client";

import { useCallback, useEffect, useState } from "react";

export type ReaderTheme = "dark" | "light" | "starlight";
export type ReaderBodyFont = "pretendard" | "noto-serif" | "gowun" | "system";
export type ReaderContentWidth = "narrow" | "normal" | "wide";
export type ReadingPreset = "relaxed" | "immersive" | "compact";

export interface ReaderSettings {
  theme: ReaderTheme;
  fontSize: number;
  lineHeight: number;
  bodyFont: ReaderBodyFont;
  contentWidth: ReaderContentWidth;
  readingPreset: ReadingPreset;
}

const STORAGE_KEY = "cd-reader-settings";

export const READER_BODY_FONT_OPTIONS = [
  {
    id: "pretendard" as const,
    label: "Pretendard",
    preview: "선명하고 안정적인 문장 흐름",
    family: "var(--font-body), Pretendard, \"Noto Sans KR\", system-ui, sans-serif",
  },
  {
    id: "noto-serif" as const,
    label: "Noto Serif KR",
    preview: "고전적인 결을 살린 서정적인 읽기",
    family: "\"Noto Serif KR\", serif",
  },
  {
    id: "gowun" as const,
    label: "고운바탕",
    preview: "부드럽고 잔잔한 장문 읽기",
    family: "\"Gowun Batang\", \"Noto Serif KR\", serif",
  },
  {
    id: "system" as const,
    label: "시스템",
    preview: "가볍고 익숙한 화면 중심 읽기",
    family: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },
] satisfies ReadonlyArray<{ id: ReaderBodyFont; label: string; preview: string; family: string }>;

export const READER_DISPLAY_FONT_STACK = "\"CodeDestinyDisplay\", \"Noto Serif KR\", serif";
export const READER_CONTENT_WIDTHS: Record<ReaderContentWidth, string> = {
  narrow: "560px",
  normal: "640px",
  wide: "720px",
};

export const READING_PRESET_OPTIONS = [
  {
    id: "relaxed" as const,
    label: "편안하게",
    description: "18px · 1.95 · 640px",
    settings: { fontSize: 18, lineHeight: 1.95, contentWidth: "normal" as const },
  },
  {
    id: "immersive" as const,
    label: "몰입",
    description: "19px · 2.05 · 720px",
    settings: { fontSize: 19, lineHeight: 2.05, contentWidth: "wide" as const },
  },
  {
    id: "compact" as const,
    label: "콤팩트",
    description: "17px · 1.8 · 560px",
    settings: { fontSize: 17, lineHeight: 1.8, contentWidth: "narrow" as const },
  },
] satisfies ReadonlyArray<{
  id: ReadingPreset;
  label: string;
  description: string;
  settings: { fontSize: number; lineHeight: number; contentWidth: ReaderContentWidth };
}>;

export const defaultReaderSettings: ReaderSettings = {
  theme: "starlight",
  fontSize: 18,
  lineHeight: 1.95,
  bodyFont: "pretendard",
  contentWidth: "normal",
  readingPreset: "relaxed",
};

function clampFontSize(value: number) {
  return Math.min(24, Math.max(14, Number(value) || defaultReaderSettings.fontSize));
}

function clampLineHeight(value: number) {
  return Math.min(2.2, Math.max(1.6, Number(value) || defaultReaderSettings.lineHeight));
}

function normalizePresetCandidate(
  fontSize: number,
  lineHeight: number,
  contentWidth: ReaderContentWidth,
  readingPreset: ReadingPreset,
): ReadingPreset {
  const matchedPreset = READING_PRESET_OPTIONS.find(
    (preset) =>
      preset.settings.fontSize === fontSize &&
      preset.settings.lineHeight === lineHeight &&
      preset.settings.contentWidth === contentWidth,
  );
  if (matchedPreset) return matchedPreset.id;
  if (fontSize >= 19 || lineHeight >= 2 || contentWidth === "wide") return "immersive";
  if (fontSize <= 17 || lineHeight <= 1.8 || contentWidth === "narrow") return "compact";
  return readingPreset;
}

function normalizeSettings(value: Partial<ReaderSettings> | null): ReaderSettings {
  const next = { ...defaultReaderSettings, ...(value || {}) };
  const fontSize = clampFontSize(next.fontSize);
  const lineHeight = clampLineHeight(next.lineHeight);
  const bodyFont = READER_BODY_FONT_OPTIONS.some((option) => option.id === next.bodyFont)
    ? next.bodyFont
    : defaultReaderSettings.bodyFont;
  const contentWidth = ["narrow", "normal", "wide"].includes(next.contentWidth)
    ? next.contentWidth
    : defaultReaderSettings.contentWidth;
  const readingPreset = ["relaxed", "immersive", "compact"].includes(next.readingPreset)
    ? next.readingPreset
    : defaultReaderSettings.readingPreset;

  return {
    theme: ["dark", "light", "starlight"].includes(next.theme) ? next.theme : defaultReaderSettings.theme,
    fontSize,
    lineHeight,
    bodyFont,
    contentWidth,
    readingPreset: normalizePresetCandidate(fontSize, lineHeight, contentWidth, readingPreset),
  };
}

export function useReaderSettings() {
  const [settings, setSettings] = useState<ReaderSettings>(defaultReaderSettings);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      setSettings(normalizeSettings(JSON.parse(stored) as Partial<ReaderSettings>));
    } catch (_) {}
  }, []);

  const persist = useCallback((next: ReaderSettings) => {
    setSettings(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (_) {}
  }, []);

  const updateSetting = useCallback(
    <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => {
      persist(normalizeSettings({ ...settings, [key]: value }));
    },
    [persist, settings],
  );

  const applyPreset = useCallback(
    (presetId: ReadingPreset) => {
      const preset = READING_PRESET_OPTIONS.find((item) => item.id === presetId);
      if (!preset) return;
      persist(
        normalizeSettings({
          ...settings,
          readingPreset: preset.id,
          fontSize: preset.settings.fontSize,
          lineHeight: preset.settings.lineHeight,
          contentWidth: preset.settings.contentWidth,
        }),
      );
    },
    [persist, settings],
  );

  const resetSettings = useCallback(() => {
    persist(defaultReaderSettings);
  }, [persist]);

  return { settings, updateSetting, resetSettings, applyPreset };
}
