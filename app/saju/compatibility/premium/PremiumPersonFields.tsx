"use client";
import BirthTimeInput from "@/app/components/BirthTimeInput";
import {birthDateTextInputProps} from "@/lib/birthDateInputProps";
import type {PremiumPerson} from "./_lib/premium-delivery";
import styles from "./premium.module.css";

export default function PersonFields({ legend, person, onChange }: { legend: string; person: PremiumPerson; onChange: (next: PremiumPerson) => void }) {
  const set = <K extends keyof PremiumPerson>(key: K, value: PremiumPerson[K]) => onChange({ ...person, [key]: value });
  return (
    <fieldset className={styles.person}>
      <legend>{legend}</legend>
      <label className={styles.field}>
        이름 또는 애칭 <span className={styles.optional}>(선택)</span>
        <input type="text" maxLength={20} value={person.name} onChange={(event) => set("name", event.target.value)} autoComplete="off" />
      </label>
      <div className={styles.row}>
        <label className={styles.field}>
          생년월일
          <input {...birthDateTextInputProps(person.birthDate, (next) => set("birthDate", next))} required />
        </label>
        <label className={styles.field}>
          양력/음력
          <select value={person.calendarType} onChange={(event) => set("calendarType", event.target.value === "lunar" ? "lunar" : "solar")}>
            <option value="solar">양력</option>
            <option value="lunar">음력</option>
          </select>
        </label>
      </div>
      {person.calendarType === "lunar" ? (
        <label className={styles.check}>
          <input type="checkbox" checked={person.isLeapMonth} onChange={(event) => set("isLeapMonth", event.target.checked)} />
          윤달이에요
        </label>
      ) : null}
      <div className={styles.row}>
        <label className={styles.field}>
          태어난 시간
          <BirthTimeInput value={person.birthTime} disabled={person.birthTimeUnknown} onChange={(event) => set("birthTime", event.target.value)} />
        </label>
        <fieldset className={styles.gender}>
          <legend>성별</legend>
          {(["female", "male"] as const).map((value) => (
            <label key={value} className={styles.choice}>
              <input type="radio" name={`${legend}-gender`} value={value} checked={person.gender === value} onChange={() => set("gender", value)} />
              {value === "female" ? "여성" : "남성"}
            </label>
          ))}
        </fieldset>
      </div>
      <label className={styles.check}>
        <input type="checkbox" checked={person.birthTimeUnknown} onChange={(event) => onChange({ ...person, birthTimeUnknown: event.target.checked, birthTime: event.target.checked ? "" : person.birthTime })} />
        태어난 시간을 몰라요 (시주 없이 계산하고 결과에 표시해 드려요)
      </label>
    </fieldset>
  );
}
