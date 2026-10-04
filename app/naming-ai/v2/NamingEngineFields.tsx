"use client";

// 작명 v2 입력 — 성씨 한자·학파·돌림자·피할 한자. 성씨 한자를 고를 때만 v2 엔진 키가 서버로 간다(toRawInput).
// 🔴 성씨 한자는 자동으로 고르지 않는다 — 틀린 성 한자는 획수·수리 전체를 틀리게 만들므로 사용자가 직접 고른다.
// 🔴 문구는 namingV2Copy 에서만 가져온다(주석 밖 한글 금지 — 결과 화면과 같은 규칙).

import { useEffect, useMemo, useState } from "react";
import styles from "./naming-v2.module.css";
import { getNamingV2Copy } from "./namingV2Copy";
import { V2_SCHOOL_PRESETS, type V2SchoolPreset } from "./namingV2Types";
import { cx } from "./NamingArt";

export interface EngineFieldsValue {
  surnameHanja: string;
  schoolPreset: V2SchoolPreset;
  fixedPosition: "" | "0" | "1";
  fixedHanja: string;
  fixedHangul: string;
  avoidCharsText: string;
}

export const INITIAL_ENGINE_FIELDS: EngineFieldsValue = {
  surnameHanja: "",
  schoolPreset: "kr-modern",
  fixedPosition: "",
  fixedHanja: "",
  fixedHangul: "",
  avoidCharsText: "",
};

/** 한자만 남긴다(NFC). */
export function hanOnly(text: string, max = Infinity): string {
  return Array.from(String(text || "").normalize("NFC")).filter((ch) => /\p{Script=Han}/u.test(ch)).slice(0, max).join("");
}

/** 서버 normalizeEngineFields 가 읽는 v2 키. 성씨 한자가 없거나 이름이 3자 이상이면 빈 객체(v1 inputHash 유지). */
export function engineRawInput(value: EngineFieldsValue, nameLength: number): Record<string, unknown> {
  const surnameHanja = hanOnly(value.surnameHanja, 2);
  if (!surnameHanja || nameLength > 2) return {};
  const fixedCh = hanOnly(value.fixedHanja, 1);
  const position = value.fixedPosition === "1" && nameLength > 1 ? 1 : 0;
  return {
    surnameHanja,
    schoolPreset: value.schoolPreset,
    fixedChar: value.fixedPosition !== "" && fixedCh ? { position, ch: fixedCh, ...(value.fixedHangul.trim() ? { hangul: value.fixedHangul.trim().slice(0, 2) } : {}) } : null,
    avoidChars: Array.from(new Set(Array.from(hanOnly(value.avoidCharsText)))),
  };
}

// surnames.v1.json rows: [hangul, hanja, population, won[], pil[], compound]
type SurnameRow = [string, string, number, number[], number[], boolean];
let surnamesPromise: Promise<SurnameRow[]> | null = null;
function loadSurnames(): Promise<SurnameRow[]> {
  surnamesPromise ||= import("@/worker/naming-engine/data/surnames.v1.json")
    .then((mod) => (mod.default as unknown as { rows: SurnameRow[] }).rows)
    .catch((error) => {
      surnamesPromise = null;
      throw error;
    });
  return surnamesPromise;
}

interface NamingEngineFieldsProps {
  locale: string;
  familyName: string;
  nameLength: number;
  value: EngineFieldsValue;
  disabled?: boolean;
  onChange: (patch: Partial<EngineFieldsValue>) => void;
}

export default function NamingEngineFields({ locale, familyName, nameLength, value, disabled = false, onChange }: NamingEngineFieldsProps) {
  const copy = useMemo(() => getNamingV2Copy(locale), [locale]);
  const [rows, setRows] = useState<SurnameRow[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // 한글 IME 는 음절을 조합한 뒤 한자로 바꾼다 — 입력 중에 거르면 조합이 끊기므로 원문을 따로 들고 요청 때만 거른다.
  const [manualText, setManualText] = useState("");
  const family = familyName.trim().normalize("NFC");

  useEffect(() => {
    let alive = true;
    loadSurnames().then((data) => alive && setRows(data)).catch(() => alive && setLoadFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const matches = useMemo(() => (rows && family ? rows.filter((row) => row[0] === family).sort((a, b) => b[2] - a[2]) : []), [rows, family]);
  const strokeIndex = value.schoolPreset === "kr-pil" ? 4 : 3;
  const selected = Boolean(value.surnameHanja);

  return (
    <div className={cx(styles.scope, styles.fields)}>
      <div className={styles.field}>
        <span className={styles.fieldLabel} id="nv2-surname-label">{copy.surnameHanjaLabel}</span>
        <span className={styles.fieldHint}>{copy.surnameHanjaHint}</span>
        {!family ? (
          <span className={styles.fieldHint}>{copy.surnameNeedHangul}</span>
        ) : !rows && !loadFailed ? (
          <span className={styles.fieldHint} role="status">{copy.surnameLoading}</span>
        ) : (
          <>
            {matches.length ? (
              <div className={styles.surnameChips} role="group" aria-labelledby="nv2-surname-label">
                {matches.map((row) => {
                  const strokes = row[strokeIndex].reduce((a, b) => a + b, 0);
                  return (
                    <button
                      key={row[1]}
                      type="button"
                      className={styles.surnameChip}
                      aria-pressed={value.surnameHanja === row[1]}
                      disabled={disabled}
                      onClick={() => {
                        setManualText("");
                        onChange({ surnameHanja: row[1] });
                      }}
                    >
                      <span className={cx(styles.han, styles.surnameChipHan)} lang="ko">{row[1]}</span>
                      <span className={styles.surnameChipMeta}>
                        {copy.strokesUnit(strokes)} · {copy.surnamePopulation(row[2])}
                        {row[5] ? <> · {copy.compoundBadge}</> : null}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={styles.surnameChip}
                  aria-pressed={!selected}
                  disabled={disabled}
                  onClick={() => {
                    setManualText("");
                    onChange({ surnameHanja: "" });
                  }}
                >
                  <span className={styles.surnameChipMeta}>{copy.surnameNoHanja}</span>
                </button>
              </div>
            ) : (
              <span className={styles.fieldHint}>{copy.surnameNotListed}</span>
            )}
            <label className={styles.field}>
              <span className={styles.fieldSub}>{copy.surnameManualLabel}</span>
              <input
                type="text"
                className={cx(styles.input, styles.han)}
                lang="ko"
                inputMode="text"
                maxLength={6}
                placeholder={copy.surnameManualPlaceholder}
                value={manualText}
                disabled={disabled}
                onChange={(event) => {
                  setManualText(event.target.value);
                  onChange({ surnameHanja: hanOnly(event.target.value, 2) });
                }}
              />
            </label>
          </>
        )}
      </div>

      {selected ? (
        <>
          {nameLength > 2 ? <p className={styles.fieldWarn}>{copy.engineLengthNote}</p> : null}

          <fieldset className={styles.fieldset} disabled={disabled}>
            <legend className={styles.fieldLabel}>{copy.schoolLabel}</legend>
            <div className={styles.schoolList}>
              {V2_SCHOOL_PRESETS.map((preset) => (
                <label key={preset} className={styles.schoolOption}>
                  <input
                    type="radio"
                    name="nv2-school"
                    value={preset}
                    checked={value.schoolPreset === preset}
                    onChange={() => onChange({ schoolPreset: preset })}
                  />
                  <span>
                    <b>{copy.schools[preset].title}</b>
                    <span className={styles.fieldHint}>{copy.schools[preset].desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.fieldset} disabled={disabled}>
            <legend className={styles.fieldLabel}>{copy.fixedLabel}</legend>
            <div className={styles.fixedRow}>
              <select
                className={styles.input}
                aria-label={copy.fixedLabel}
                value={value.fixedPosition}
                onChange={(event) => onChange({ fixedPosition: event.target.value as EngineFieldsValue["fixedPosition"] })}
              >
                <option value="">{copy.fixedNone}</option>
                <option value="0">{copy.fixedPosition(0)}</option>
                {nameLength > 1 ? <option value="1">{copy.fixedPosition(1)}</option> : null}
              </select>
              {value.fixedPosition !== "" ? (
                <>
                  <input
                    type="text"
                    className={cx(styles.input, styles.han)}
                    lang="ko"
                    maxLength={4}
                    aria-label={copy.fixedHanjaPlaceholder}
                    placeholder={copy.fixedHanjaPlaceholder}
                    value={value.fixedHanja}
                    onChange={(event) => onChange({ fixedHanja: event.target.value })}
                  />
                  <input
                    type="text"
                    className={styles.input}
                    lang="ko"
                    maxLength={2}
                    aria-label={copy.fixedHangulPlaceholder}
                    placeholder={copy.fixedHangulPlaceholder}
                    value={value.fixedHangul}
                    onChange={(event) => onChange({ fixedHangul: event.target.value.slice(0, 2) })}
                  />
                </>
              ) : null}
            </div>
          </fieldset>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{copy.avoidLabel}</span>
            <input
              type="text"
              className={cx(styles.input, styles.han)}
              lang="ko"
              maxLength={60}
              placeholder={copy.avoidPlaceholder}
              value={value.avoidCharsText}
              disabled={disabled}
              onChange={(event) => onChange({ avoidCharsText: event.target.value })}
            />
          </label>
        </>
      ) : null}
    </div>
  );
}
