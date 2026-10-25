"use client";
import { useEffect, useRef, useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import { formatBirthTime, maskBirthTimeInput, normalizeBirthTime } from "@/lib/birthTimeInput";
import styles from "./BirthTimeInput.module.css";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;
const labels = {
  ko: "태어난 시간",
  en: "Birth time",
  ja: "出生時刻",
  zh: "出生时间",
};
/** 24시간제 숫자 직접 입력("0830", "8:30", "14:30"). callers and FormData receive HH:mm. */
export default function BirthTimeInput({ value, defaultValue, onChange, id, name, form, required, disabled, readOnly,
  className = "", "aria-label": ariaLabel, "aria-describedby": describedBy, onBlur, ...rest }: Props) {
  const initial = String(value ?? defaultValue ?? "");
  const [text, setText] = useState(() => formatBirthTime(initial));
  const [locale, setLocale] = useState<keyof typeof labels>("ko");
  const canonical = useRef<HTMLInputElement>(null);
  const visible = useRef<HTMLInputElement>(null);
  const lastEmitted = useRef(initial);
  const lastValid = useRef(formatBirthTime(initial));
  useEffect(() => {
    if (value === undefined || String(value) === lastEmitted.current) return;
    /* 입력 중에는 부모가 되돌려 준 값으로 덮어쓰지 않는다 — "08:3" 처럼 미완성 값을 치는 도중에 칸이 바뀌면 이어 칠 수 없다. */
    if (visible.current && document.activeElement === visible.current) return;
    lastEmitted.current = String(value);
    lastValid.current = formatBirthTime(String(value));
    setText(formatBirthTime(String(value)));
  }, [value]);
  useEffect(() => {
    const language = canonical.current?.closest("[lang]")?.getAttribute("lang") || document.documentElement.lang || "ko";
    const key = language.split("-")[0];
    setLocale(key in labels ? key as keyof typeof labels : "en");
  }, []);
  function change(next: string, event: ChangeEvent<HTMLInputElement>) {
    setText(next);
    const output = normalizeBirthTime(next);
    lastEmitted.current = output;
    if (output) lastValid.current = output;
    if (canonical.current) {
      canonical.current.value = output;
      onChange?.({ ...event, target: canonical.current, currentTarget: canonical.current } as ChangeEvent<HTMLInputElement>);
    }
  }
  return <span className={styles.clock} data-cd-birth-time="">
    <input ref={canonical} type="hidden" name={name} form={form} value={value === undefined ? normalizeBirthTime(text) : value} disabled={disabled} readOnly />
    <input {...rest} ref={visible} id={id} form={form} className={styles.number + " " + className} type="text" inputMode="numeric"
      autoComplete="off" maxLength={5} pattern="(?:[01]?[0-9]|2[0-3]):?[0-5][0-9]|[01]?[0-9]|2[0-3]" placeholder="08:35" value={text}
      required={required} disabled={disabled} readOnly={readOnly} aria-label={ariaLabel || labels[locale]} aria-describedby={describedBy}
      onChange={event => {
        const raw = event.target.value;
        const caretAtEnd = event.target.selectionStart == null || event.target.selectionStart === raw.length;
        change(caretAtEnd ? maskBirthTimeInput(raw) : raw, event);
      }}
      onBlur={event => {
        const normalized = normalizeBirthTime(text);
        if (normalized) { if (normalized !== text) setText(normalized); }
        else if (text) setText(value !== undefined ? formatBirthTime(String(value)) : lastValid.current); /* 해석 못 하면 마지막 정상 값으로 되돌린다(홈 셸과 같은 규칙) */
        if (canonical.current) onBlur?.({ ...event, target: canonical.current, currentTarget: canonical.current });
      }} />
  </span>;
}
