"use client";
import { useEffect, useRef, useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import { joinBirthTime, splitBirthTime, type BirthTimeParts } from "@/lib/birthTimeInput";
import styles from "./BirthTimeInput.module.css";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;
const labels = {
  ko: ["오전", "오후", "시", "분", "태어난 시간"],
  en: ["AM", "PM", "Hour", "Minute", "Birth time"],
  ja: ["午前", "午後", "時", "分", "出生時刻"],
  zh: ["上午", "下午", "时", "分", "出生时间"],
};
/** Presentation only: callers and FormData continue receiving HH:mm. */
export default function BirthTimeInput({ value, defaultValue, onChange, id, name, form, required, disabled, readOnly,
  className = "", "aria-label": ariaLabel, "aria-describedby": describedBy, onBlur, ...rest }: Props) {
  const initial = String(value ?? defaultValue ?? "");
  const [parts, setParts] = useState<BirthTimeParts>(() => splitBirthTime(initial));
  const [locale, setLocale] = useState<keyof typeof labels>("ko");
  const canonical = useRef<HTMLInputElement>(null);
  const lastEmitted = useRef(initial);
  const text = labels[locale];
  useEffect(() => {
    if (value === undefined || String(value) === lastEmitted.current) return;
    lastEmitted.current = String(value);
    setParts(splitBirthTime(String(value)));
  }, [value]);
  useEffect(() => {
    const language = canonical.current?.closest("[lang]")?.getAttribute("lang") || document.documentElement.lang || "ko";
    const key = language.split("-")[0];
    setLocale(key in labels ? key as keyof typeof labels : "en");
  }, []);
  function change(next: BirthTimeParts, event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setParts(next);
    const output = joinBirthTime(next);
    lastEmitted.current = output;
    if (canonical.current) {
      canonical.current.value = output;
      onChange?.({ ...event, target: canonical.current, currentTarget: canonical.current } as ChangeEvent<HTMLInputElement>);
    }
  }
  return <span className={styles.clock} role="group" aria-label={ariaLabel || text[4]} aria-describedby={describedBy} data-cd-birth-time="">
    <input ref={canonical} type="hidden" name={name} form={form} value={value === undefined ? joinBirthTime(parts) : value} disabled={disabled} readOnly />
    <select className={styles.period} value={parts.period} disabled={disabled || readOnly} aria-label={text[0] + " / " + text[1]}
      onChange={event => change({ ...parts, period: event.target.value as "am" | "pm" }, event)}>
      <option value="am">{text[0]}</option><option value="pm">{text[1]}</option>
    </select>
    <input {...rest} id={id} form={form} className={styles.number + " " + className} type="text" inputMode="numeric"
      autoComplete="off" maxLength={2} pattern="(0?[1-9]|1[0-2])" placeholder="12" value={parts.hour}
      required={required} disabled={disabled} readOnly={readOnly} aria-label={(ariaLabel || text[4]) + " · " + text[2]} aria-describedby={describedBy}
      onChange={event => change({ ...parts, hour: event.target.value.replace(/\D/g, "").slice(0, 2) }, event)}
      onBlur={event => { if (canonical.current) onBlur?.({ ...event, target: canonical.current, currentTarget: canonical.current }); }} />
    <span className={styles.separator} aria-hidden>:</span>
    <input form={form} className={styles.number + " " + className} type="text" inputMode="numeric" autoComplete="off" maxLength={2}
      pattern="[0-5]?[0-9]" placeholder="00" value={parts.minute} required={required || Boolean(parts.hour)} disabled={disabled} readOnly={readOnly}
      aria-label={(ariaLabel || text[4]) + " · " + text[3]} aria-describedby={describedBy}
      onChange={event => change({ ...parts, minute: event.target.value.replace(/\D/g, "").slice(0, 2) }, event)}
      onBlur={() => { if (parts.minute) setParts(current => ({ ...current, minute: current.minute.padStart(2, "0") })); }} />
  </span>;
}
