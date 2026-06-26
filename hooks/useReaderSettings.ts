"use client";

import { useCallback, useEffect, useState } from "react";
import type { LoadingLocale } from "@/constants/loadingMessages";

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

const READER_SETTINGS_TEXT_TRANSLATIONS = {
  ko: {
    fontPretendard: "Pretendard",
    fontPretendardPreview: "선명하고 안정적인 문장 흐름",
    fontSerif: "Noto Serif KR",
    fontSerifPreview: "고전적인 결을 살린 서정적인 읽기",
    fontGowun: "고운바탕",
    fontGowunPreview: "부드럽고 잔잔한 장문 읽기",
    fontSystem: "시스템",
    fontSystemPreview: "가볍고 익숙한 화면 중심 읽기",
    presetRelaxed: "편안하게",
    presetImmersive: "몰입",
    presetCompact: "콤팩트",
  },
  en: {
    fontPretendard: "Pretendard",
    fontPretendardPreview: "Clear, steady sentence flow",
    fontSerif: "Noto Serif KR",
    fontSerifPreview: "A lyrical read with a classic texture",
    fontGowun: "Gowun Batang",
    fontGowunPreview: "Soft, calm long-form reading",
    fontSystem: "System",
    fontSystemPreview: "Light, familiar screen-focused reading",
    presetRelaxed: "Comfort",
    presetImmersive: "Immersive",
    presetCompact: "Compact",
  },
  ja: {
    fontPretendard: "Pretendard",
    fontPretendardPreview: "鮮明で安定した文章の流れ",
    fontSerif: "Noto Serif KR",
    fontSerifPreview: "古典的な質感を生かした叙情的な読書",
    fontGowun: "コウンバタン",
    fontGowunPreview: "やわらかく穏やかな長文読書",
    fontSystem: "システム",
    fontSystemPreview: "軽くて慣れた画面中心の読書",
    presetRelaxed: "心地よく",
    presetImmersive: "没入",
    presetCompact: "コンパクト",
  },
  "zh-CN": {
    fontPretendard: "Pretendard",
    fontPretendardPreview: "清晰稳定的句子流动",
    fontSerif: "Noto Serif KR",
    fontSerifPreview: "保留古典质感的抒情阅读",
    fontGowun: "Gowun Batang",
    fontGowunPreview: "柔和安静的长文阅读",
    fontSystem: "系统",
    fontSystemPreview: "轻盈熟悉的屏幕阅读",
    presetRelaxed: "舒适",
    presetImmersive: "沉浸",
    presetCompact: "紧凑",
  },
  "zh-TW": {
    fontPretendard: "Pretendard",
    fontPretendardPreview: "清晰穩定的句子流動",
    fontSerif: "Noto Serif KR",
    fontSerifPreview: "保留古典質感的抒情閱讀",
    fontGowun: "Gowun Batang",
    fontGowunPreview: "柔和安靜的長文閱讀",
    fontSystem: "系統",
    fontSystemPreview: "輕盈熟悉的螢幕閱讀",
    presetRelaxed: "舒適",
    presetImmersive: "沉浸",
    presetCompact: "緊湊",
  },
} as const;

function readerSettingsCopy(locale?: LoadingLocale | string | null) {
  const normalized = String(locale || "ko").trim().replace("_", "-").toLowerCase();
  if (normalized === "en" || normalized === "en-us") return READER_SETTINGS_TEXT_TRANSLATIONS.en;
  if (normalized === "ja" || normalized === "ja-jp") return READER_SETTINGS_TEXT_TRANSLATIONS.ja;
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-hans") return READER_SETTINGS_TEXT_TRANSLATIONS["zh-CN"];
  if (normalized === "zh-tw" || normalized === "zh-hant" || normalized === "zh-hk") return READER_SETTINGS_TEXT_TRANSLATIONS["zh-TW"];
  return READER_SETTINGS_TEXT_TRANSLATIONS.ko;
}

export function getReaderBodyFontOptions(locale?: LoadingLocale | string | null) {
  const copy = readerSettingsCopy(locale);
  return [
  {
    id: "pretendard" as const,
    label: copy.fontPretendard,
    preview: copy.fontPretendardPreview,
    family: "var(--font-body), Pretendard, \"Noto Sans KR\", system-ui, sans-serif",
  },
  {
    id: "noto-serif" as const,
    label: copy.fontSerif,
    preview: copy.fontSerifPreview,
    family: "\"Noto Serif KR\", serif",
  },
  {
    id: "gowun" as const,
    label: copy.fontGowun,
    preview: copy.fontGowunPreview,
    family: "\"Gowun Batang\", \"Noto Serif KR\", serif",
  },
  {
    id: "system" as const,
    label: copy.fontSystem,
    preview: copy.fontSystemPreview,
    family: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },
  ] satisfies ReadonlyArray<{ id: ReaderBodyFont; label: string; preview: string; family: string }>;
}

export const READER_BODY_FONT_OPTIONS = getReaderBodyFontOptions();

export const READER_DISPLAY_FONT_STACK = "\"CodeDestinyDisplay\", \"Noto Serif KR\", serif";
export const READER_CONTENT_WIDTHS: Record<ReaderContentWidth, string> = {
  narrow: "560px",
  normal: "640px",
  wide: "720px",
};

export function getReadingPresetOptions(locale?: LoadingLocale | string | null) {
  const copy = readerSettingsCopy(locale);
  return [
  {
    id: "relaxed" as const,
    label: copy.presetRelaxed,
    description: "18px · 1.95 · 640px",
    settings: { fontSize: 18, lineHeight: 1.95, contentWidth: "normal" as const },
  },
  {
    id: "immersive" as const,
    label: copy.presetImmersive,
    description: "19px · 2.05 · 720px",
    settings: { fontSize: 19, lineHeight: 2.05, contentWidth: "wide" as const },
  },
  {
    id: "compact" as const,
    label: copy.presetCompact,
    description: "17px · 1.8 · 560px",
    settings: { fontSize: 17, lineHeight: 1.8, contentWidth: "narrow" as const },
  },
  ] satisfies ReadonlyArray<{
  id: ReadingPreset;
  label: string;
  description: string;
  settings: { fontSize: number; lineHeight: number; contentWidth: ReaderContentWidth };
}>;
}

export const READING_PRESET_OPTIONS = getReadingPresetOptions();

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
