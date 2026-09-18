"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../../../styles/fonts-serif.css";
import styles from "../../components/ziwei/ziwei-consultation.module.css";
import {
  calculateZiweiChart,
  normalizeZiweiForAdvancedReport,
  validateAdvancedZiweiResult,
} from "../../_lib/ziwei-engine";
import { normalizeZiweiInput } from "../../_lib/normalize-ziwei-input";
import type { ZiweiDeepChart, ZiweiGender } from "../../_lib/ziwei-types";
import { buildPalaceCounseling, buildPalaceEvidence } from "../../components/ziwei/_lib/advanced-ziwei-reading";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import type { AiPrefillSeed } from "@/app/_lib/ai-prefill-seed";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { getZiweiAnimalCopy, type ZiweiAnimalCopy } from "./_lib/ziwei-animal-copy";
import { getAnimalIdByMingGong, ANIMAL_EMOJI } from "./_lib/ziweiAnimalMapping";
import { buildZiweiAnimalContent } from "./_lib/ziweiAnimalContent";
import { ANIMAL_DESTINY_DATA } from "@/components/fortune/animal-twelve/animalTwelveData";
import type { AnimalId } from "@/app/saju/animal-destiny/lib/types";

type Step = "form" | "computing" | "result";

interface FormState {
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  birthHour: string;
  birthMinute: string;
  unknownHour: boolean;
  gender: ZiweiGender;
  calendarType: "solar" | "lunar";
  isLeapMonth: boolean;
}

const EMPTY_FORM: FormState = {
  birthYear: "",
  birthMonth: "",
  birthDay: "",
  birthHour: "",
  birthMinute: "0",
  unknownHour: false,
  gender: "F",
  calendarType: "solar",
  isLeapMonth: false,
};

interface AnimalResult {
  chart: ZiweiDeepChart;
  animalId: AnimalId;
}

function digitsOnly(value: string, max: number): string {
  return value.replace(/[^0-9]/g, "").slice(0, max);
}

/**
 * 미입력 폼에만 시드를 채운다 — SeoLandingBirthForm.tsx의 applySeed와 같은 계약.
 * touchedRef 가 켜진 뒤에는 이 함수가 아예 호출되지 않으므로(useEffect 가드),
 * 여기서는 "아직 아무것도 건드리지 않은 폼" 을 전제로 시드 값을 그대로 덮어써도 안전하다.
 */
function applySeed(prev: FormState, seed: AiPrefillSeed): FormState {
  const next = { ...prev };
  if (seed.birthDate) {
    const [y, m, d] = seed.birthDate.split("-");
    if (y && m && d) {
      next.birthYear = y;
      next.birthMonth = m;
      next.birthDay = d;
    }
  }
  if (seed.birthTimeUnknown !== undefined) {
    next.unknownHour = seed.birthTimeUnknown;
  }
  if (!next.unknownHour && seed.birthTime) {
    const [h, mi] = seed.birthTime.split(":");
    if (h && mi) {
      next.birthHour = h;
      next.birthMinute = mi;
    }
  }
  if (seed.gender === "male") next.gender = "M";
  else if (seed.gender === "female") next.gender = "F";
  if (seed.calendarType) next.calendarType = seed.calendarType;
  return next;
}

function useZiweiAnimalCopy(): ZiweiAnimalCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    return () => window.removeEventListener("cd:locale-ready", syncLocale);
  }, []);
  return useMemo(() => getZiweiAnimalCopy(locale), [locale]);
}

export default function ZiweiAnimalDestinyClient() {
  const copy = useZiweiAnimalCopy();
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnimalResult | null>(null);

  const { seed, seedVersion } = useAiProfileSeed();
  const touchedRef = useRef(false);

  useEffect(() => {
    if (!seed) return;
    setForm((prev) => (touchedRef.current ? prev : applySeed(prev, seed)));
    // seedVersion 만 의존한다 — seed 객체는 매 렌더 새 참조라 넣으면 루프가 된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedVersion]);

  const update = useCallback((patch: Partial<FormState>) => {
    touchedRef.current = true;
    setError("");
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleCompute = useCallback(() => {
    setError("");
    if (!form.unknownHour && String(form.birthHour).trim() === "") {
      setError(copy.errorFallback);
      return;
    }

    const normalized = normalizeZiweiInput({
      birthYear: form.birthYear,
      birthMonth: form.birthMonth,
      birthDay: form.birthDay,
      birthHour: form.birthHour,
      birthMinute: form.birthMinute,
      unknownHour: form.unknownHour,
      gender: form.gender,
      calendarType: form.calendarType,
      isLeapMonth: form.isLeapMonth,
    });

    if (normalized.errors.length || !normalized.input) {
      setError(normalized.errors.map((item) => item.message).join("\n") || copy.errorFallback);
      return;
    }

    setStep("computing");
    try {
      const nextChart = normalizeZiweiForAdvancedReport(calculateZiweiChart(normalized.input));
      const validation = validateAdvancedZiweiResult(nextChart);
      if (!validation.valid) {
        setError(copy.errorFallback);
        setStep("form");
        return;
      }
      const animalId = getAnimalIdByMingGong(nextChart.mingGong);
      setResult({ chart: nextChart, animalId });
      setStep("result");
    } catch (err) {
      console.error("[ZiweiAnimalDestiny] compute error:", err);
      setError(copy.errorFallback);
      setStep("form");
    }
  }, [form, copy]);

  const handleReset = useCallback(() => {
    setResult(null);
    setError("");
    setStep("form");
  }, []);

  if (step === "result" && result) {
    return <ZiweiAnimalResultView result={result} copy={copy} onReset={handleReset} />;
  }

  return (
    <section className={`${styles.surface} font-body relative min-h-[100dvh] overflow-hidden px-4 py-6 sm:px-6 lg:px-8`}>
      <div className="relative mx-auto flex min-h-[100dvh] max-w-3xl items-center py-[calc(1rem+env(safe-area-inset-top))]">
        <div className="relative z-10 w-full rounded-xl border border-[var(--zw-rule)] bg-[var(--zw-surface)] p-5 sm:p-7 lg:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--zw-gold)]">{copy.heroEyebrow}</p>
          <h2 className="mt-3 text-2xl font-black text-[var(--zw-text)] md:text-3xl">{copy.heroTitle}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--zw-muted)]">{copy.heroSubtitle}</p>

          {error ? (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-[var(--zw-muted)]">{copy.fieldGenderLabel}</span>
              <select
                value={form.gender}
                onChange={(event) => update({ gender: event.target.value as ZiweiGender })}
                className="w-full rounded-2xl border border-[var(--zw-rule)] bg-black/20 px-4 py-3 text-base text-[var(--zw-text)] outline-none"
              >
                <option value="F">{copy.genderLabels.female}</option>
                <option value="M">{copy.genderLabels.male}</option>
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-[var(--zw-muted)]">{copy.fieldCalendarLabel}</span>
              <select
                value={form.calendarType}
                onChange={(event) => update({ calendarType: event.target.value as "solar" | "lunar" })}
                className="w-full rounded-2xl border border-[var(--zw-rule)] bg-black/20 px-4 py-3 text-base text-[var(--zw-text)] outline-none"
              >
                <option value="solar">{copy.calendarLabels.solar}</option>
                <option value="lunar">{copy.calendarLabels.lunar}</option>
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-[var(--zw-muted)]">{copy.fieldBirthYearLabel}</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="YYYY"
                value={form.birthYear}
                onChange={(event) => update({ birthYear: digitsOnly(event.target.value, 4) })}
                className="w-full rounded-2xl border border-[var(--zw-rule)] bg-black/20 px-4 py-3 text-base text-[var(--zw-text)] outline-none placeholder:text-slate-500"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-[var(--zw-muted)]">{copy.fieldBirthMonthLabel}</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                placeholder="MM"
                value={form.birthMonth}
                onChange={(event) => update({ birthMonth: digitsOnly(event.target.value, 2) })}
                className="w-full rounded-2xl border border-[var(--zw-rule)] bg-black/20 px-4 py-3 text-base text-[var(--zw-text)] outline-none placeholder:text-slate-500"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-[var(--zw-muted)]">{copy.fieldBirthDayLabel}</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                placeholder="DD"
                value={form.birthDay}
                onChange={(event) => update({ birthDay: digitsOnly(event.target.value, 2) })}
                className="w-full rounded-2xl border border-[var(--zw-rule)] bg-black/20 px-4 py-3 text-base text-[var(--zw-text)] outline-none placeholder:text-slate-500"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-[var(--zw-muted)]">{copy.fieldBirthHourLabel}</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                placeholder="HH"
                value={form.birthHour}
                disabled={form.unknownHour}
                onChange={(event) => update({ birthHour: digitsOnly(event.target.value, 2) })}
                className="w-full rounded-2xl border border-[var(--zw-rule)] bg-black/20 px-4 py-3 text-base text-[var(--zw-text)] outline-none placeholder:text-slate-500 disabled:opacity-40"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-[var(--zw-muted)]">{copy.fieldBirthMinuteLabel}</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                placeholder="MM"
                value={form.birthMinute}
                disabled={form.unknownHour}
                onChange={(event) => update({ birthMinute: digitsOnly(event.target.value, 2) })}
                className="w-full rounded-2xl border border-[var(--zw-rule)] bg-black/20 px-4 py-3 text-base text-[var(--zw-text)] outline-none placeholder:text-slate-500 disabled:opacity-40"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--zw-muted)]">
            <label className="inline-flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={form.unknownHour}
                onChange={(event) => update({ unknownHour: event.target.checked })}
                className="h-4 w-4"
              />
              {copy.unknownHourCheckboxLabel}
            </label>
            <label className="inline-flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={form.isLeapMonth}
                onChange={(event) => update({ isLeapMonth: event.target.checked })}
                className="h-4 w-4"
              />
              {copy.leapMonthCheckboxLabel}
            </label>
          </div>

          <button
            type="button"
            onClick={handleCompute}
            disabled={step === "computing"}
            className="mt-6 w-full rounded-2xl bg-[var(--zw-gold)] px-5 py-4 text-sm font-black text-[var(--zw-bg)] disabled:opacity-60"
          >
            {step === "computing" ? copy.computingLabel : copy.submitLabel}
          </button>
        </div>
      </div>
    </section>
  );
}

function ZiweiAnimalResultView({
  result,
  copy,
  onReset,
}: {
  result: AnimalResult;
  copy: ZiweiAnimalCopy;
  onReset: () => void;
}) {
  const { chart, animalId } = result;
  const data = ANIMAL_DESTINY_DATA[animalId];
  const emoji = ANIMAL_EMOJI[animalId];
  const content = useMemo(() => buildZiweiAnimalContent(animalId), [animalId]);

  const evidenceLines = useMemo(() => {
    const counseling = buildPalaceCounseling(chart);
    const mingItem = counseling.find((item) => item.palace.id === "ming");
    return mingItem ? buildPalaceEvidence(mingItem).lines : [];
  }, [chart]);

  return (
    <section className={`${styles.surface} font-body relative min-h-[100dvh] overflow-hidden`}>
      <div className={styles.content}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <p className={styles.profile}>{copy.resultEyebrow}</p>
            <h2>
              {emoji} {data.animalName}
            </h2>
            <p className={styles.selectedQuestion}>{data.title}</p>
            <p className={styles.lead}>{data.subtitleLine}</p>
            <ul className={styles.keywords}>
              {data.keywords.map((word) => (
                <li key={word}>{word}</li>
              ))}
            </ul>
            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={onReset}>
                {copy.resetLabel}
              </button>
            </div>
            <dl className={styles.metadata}>
              <div>
                <dt>{copy.statMingLabel}</dt>
                <dd>{chart.mingGong}</dd>
              </div>
              <div>
                <dt>{copy.statShenLabel}</dt>
                <dd>{chart.shenGong}</dd>
              </div>
              <div>
                <dt>{copy.statJuLabel}</dt>
                <dd>{chart.juInfo}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className={styles.foundation}>
          <header className={styles.foundationHeader}>
            <h2>{copy.foundationTitle}</h2>
            <p className={styles.foundationHeadline}>{content.headline}</p>
            <p>{content.introduction}</p>
          </header>
          <div className={styles.foundationGrid}>
            {content.sections.map((section) => {
              const [lead, ...rest] = section.paragraphs;
              return (
                <article key={section.key} className={styles.foundationSection}>
                  <h3>{section.title}</h3>
                  <p className={styles.foundationSectionLead}>{lead}</p>
                  {rest.map((paragraph, index) => (
                    <p key={`${section.key}-${index}`}>{paragraph}</p>
                  ))}
                </article>
              );
            })}
          </div>
          <details className={styles.foundationEvidence}>
            <summary>{copy.evidenceSummary}</summary>
            {evidenceLines.length ? (
              <ul>
                {evidenceLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p>{copy.evidenceEmptyLabel}</p>
            )}
          </details>
          <section className={styles.foundationActions}>
            <h3>{copy.actionsTitle}</h3>
            <ul>
              {content.actions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </section>
        </section>
      </div>
    </section>
  );
}
