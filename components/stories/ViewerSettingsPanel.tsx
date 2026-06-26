"use client";

import { READER_BODY_FONT_OPTIONS, READING_PRESET_OPTIONS, type ReaderSettings, type ReadingPreset } from "@/hooks/useReaderSettings";
import styles from "./viewer.module.css";

interface ViewerSettingsPanelProps {
  open: boolean;
  settings: ReaderSettings;
  onClose: () => void;
  onChange: <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => void;
  onApplyPreset: (preset: ReadingPreset) => void;
  onReset: () => void;
}

const VIEWER_SETTINGS_PANEL_TEXT_TRANSLATIONS = {
  ko: {
    closeSettingsAria: "읽기 설정 닫기",
    title: "읽기 설정",
    closeAria: "닫기",
  },
  en: {
    closeSettingsAria: "Close reading settings",
    title: "Reading Settings",
    closeAria: "Close",
  },
  ja: {
    closeSettingsAria: "読書設定を閉じる",
    title: "読書設定",
    closeAria: "閉じる",
  },
} as const;

export default function ViewerSettingsPanel({ open, settings, onClose, onChange, onApplyPreset, onReset }: ViewerSettingsPanelProps) {
  const copy = VIEWER_SETTINGS_PANEL_TEXT_TRANSLATIONS.ko;
  return (
    <>
      <button
        className={`${styles.drawerBackdrop} ${open ? styles.drawerBackdropOpen : ""}`}
        type="button"
        aria-label={copy.closeSettingsAria}
        onClick={onClose}
      />
      <aside className={`${styles.drawer} ${open ? styles.drawerOpen : ""}`} aria-hidden={!open}>
        <div className={styles.drawerHead}>
          <h2>{copy.title}</h2>
          <button className={styles.iconButton} type="button" onClick={onClose} aria-label={copy.closeAria}>
            ×
          </button>
        </div>

        <section className={styles.settingGroup}>
          <span className={styles.settingLabel}>읽기 프리셋</span>
          <div className={styles.presetList}>
            {READING_PRESET_OPTIONS.map((preset) => (
              <button
                className={`${styles.presetCard} ${settings.readingPreset === preset.id ? styles.segmentButtonActive : ""}`}
                key={preset.id}
                type="button"
                onClick={() => onApplyPreset(preset.id)}
              >
                <strong>{preset.label}</strong>
                <span>{preset.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.settingGroup}>
          <span className={styles.settingLabel}>테마</span>
          <div className={styles.segmented}>
            {[
              ["dark", "🌙 다크"],
              ["light", "☀️ 라이트"],
              ["starlight", "🌌 별빛"],
            ].map(([value, label]) => (
              <button
                className={`${styles.segmentButton} ${settings.theme === value ? styles.segmentButtonActive : ""}`}
                key={value}
                type="button"
                onClick={() => onChange("theme", value as ReaderSettings["theme"])}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.settingGroup}>
          <span className={styles.settingLabel}>폰트 선택</span>
          <p className={styles.settingHint}>본문을 읽을 때 적용되는 글꼴입니다.</p>
          <div className={styles.fontOptionList}>
            {READER_BODY_FONT_OPTIONS.map((option) => (
              <button
                className={`${styles.fontOptionCard} ${settings.bodyFont === option.id ? styles.segmentButtonActive : ""}`}
                key={option.id}
                type="button"
                onClick={() => onChange("bodyFont", option.id)}
              >
                <strong>{option.label}</strong>
                <span style={{ fontFamily: option.family }}>{option.preview}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.settingGroup}>
          <span className={styles.settingLabel}>글자 크기 · {settings.fontSize}px</span>
          <div className={styles.rangeRow}>
            <span>A-</span>
            <input
              className={styles.range}
              max={24}
              min={14}
              type="range"
              value={settings.fontSize}
              onChange={(event) => onChange("fontSize", Number(event.target.value))}
            />
            <span>A+</span>
          </div>
        </section>

        <section className={styles.settingGroup}>
          <span className={styles.settingLabel}>줄 간격 · {settings.lineHeight.toFixed(1)}</span>
          <div className={styles.rangeRow}>
            <span>1.6</span>
            <input
              className={styles.range}
              max={2.2}
              min={1.6}
              step={0.1}
              type="range"
              value={settings.lineHeight}
              onChange={(event) => onChange("lineHeight", Number(event.target.value))}
            />
            <span>2.2</span>
          </div>
        </section>

        <section className={styles.settingGroup}>
          <span className={styles.settingLabel}>문단 너비</span>
          <div className={styles.segmented}>
            {[
              ["narrow", "좁게"],
              ["normal", "보통"],
              ["wide", "넓게"],
            ].map(([value, label]) => (
              <button
                className={`${styles.widthButton} ${settings.contentWidth === value ? styles.segmentButtonActive : ""}`}
                key={value}
                type="button"
                onClick={() => onChange("contentWidth", value as ReaderSettings["contentWidth"])}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <button className={styles.resetButton} type="button" onClick={onReset}>
          기본값으로 돌리기
        </button>
      </aside>
    </>
  );
}
