"use client";

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import { useEffect, useRef, useState } from "react";
import { validateBirthDateWithAge } from "@/lib/birthDateInput";
import { readCurrentDestinyProfile, publishDestinyProfileBridge, type DestinyProfileCard } from "@/app/_lib/profile-card-storage";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

interface SeoLandingBirthFormCopy {
  birthDateLabel: string;
  birthTimeLabel: string;
  birthTimeUnknownLabel: string;
  genderLabel: string;
  genderNotSelected: string;
  genderMale: string;
  genderFemale: string;
  calendarTypeLabel: string;
  calendarSolar: string;
  calendarLunar: string;
  invalidBirthDate: string;
  loadFromProfileCardAria: string;
  loadFromProfileCardLabel: string;
}

const SEO_LANDING_BIRTH_FORM_COPY_KO: SeoLandingBirthFormCopy = {
  birthDateLabel: "생년월일",
  birthTimeLabel: "태어난 시각",
  birthTimeUnknownLabel: "시각을 모릅니다",
  genderLabel: "성별",
  genderNotSelected: "선택 안 함",
  genderMale: "남성",
  genderFemale: "여성",
  calendarTypeLabel: "양력 / 음력",
  calendarSolar: "양력",
  calendarLunar: "음력",
  invalidBirthDate: "올바른 생년월일을 입력해주세요.",
  loadFromProfileCardAria: "저장된 프로필 카드에서 생년 정보 불러오기",
  loadFromProfileCardLabel: "프로필 카드에서 불러오기",
};

const SEO_LANDING_BIRTH_FORM_COPY_EN: SeoLandingBirthFormCopy = {
  birthDateLabel: "Date of birth",
  birthTimeLabel: "Birth time",
  birthTimeUnknownLabel: "I don't know the time",
  genderLabel: "Gender",
  genderNotSelected: "Not selected",
  genderMale: "Male",
  genderFemale: "Female",
  calendarTypeLabel: "Solar / Lunar",
  calendarSolar: "Solar",
  calendarLunar: "Lunar",
  invalidBirthDate: "Please enter a valid date of birth.",
  loadFromProfileCardAria: "Load birth details from your saved profile card",
  loadFromProfileCardLabel: "Load from profile card",
};

const SEO_LANDING_BIRTH_FORM_COPY: Partial<Record<LoadingLocale, SeoLandingBirthFormCopy>> = {
  ko: SEO_LANDING_BIRTH_FORM_COPY_KO,
  en: SEO_LANDING_BIRTH_FORM_COPY_EN,
};

function getSeoLandingBirthFormCopy(locale: LoadingLocale): SeoLandingBirthFormCopy {
  return SEO_LANDING_BIRTH_FORM_COPY[locale] || SEO_LANDING_BIRTH_FORM_COPY_EN;
}

function useSeoLandingBirthFormCopy(): SeoLandingBirthFormCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    window.addEventListener("cd:locale-change", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
      window.removeEventListener("cd:locale-change", syncLocale);
    };
  }, []);

  return getSeoLandingBirthFormCopy(locale);
}

type FieldToggles = { time?: boolean; gender?: boolean; calendar?: boolean };

type Props = {
  /** 라우트마다 다르게 둔다 — 사이트맵 전 URL 간 제목·설명 유일성 가드와 별개로, 검색 의도가 다르다. */
  heading: string;
  submitLabel: string;
  /** 이동 목적지. 셸 액션(`/?action=…`)이든 Next 라우트든 문서 이동으로 보낸다. */
  submitHref: string;
  fields?: FieldToggles;
};

type FormState = {
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  gender: string;
  calendarType: string;
};

const EMPTY_FORM: FormState = {
  birthDate: "",
  birthTime: "",
  birthTimeUnknown: false,
  gender: "",
  calendarType: "solar",
};

const INPUT_CLASS =
  "min-h-12 w-full rounded-xl border border-[rgba(232,213,163,0.28)] bg-[#13102a] px-4 text-[1rem] text-[#f4eeff] placeholder:text-[rgba(244,238,255,0.4)] focus:border-[rgba(196,181,253,0.7)] focus:outline-none focus:ring-2 focus:ring-[rgba(196,181,253,0.35)]";
const LABEL_CLASS = "block text-[0.82rem] font-semibold text-[rgba(232,213,163,0.9)]";

/** 빈 칸만 채운다. 사용자가 이미 넣은 값은 건드리지 않는다. */
function applySeed(prev: FormState, seed: ReturnType<typeof useAiProfileSeed>["seed"]): FormState {
  if (!seed) return prev;
  return {
    birthDate: prev.birthDate || seed.birthDate || "",
    birthTime: prev.birthTime || seed.birthTime || "",
    birthTimeUnknown: prev.birthTime ? prev.birthTimeUnknown : Boolean(seed.birthTimeUnknown),
    gender: prev.gender || seed.gender || "",
    calendarType: prev.calendarType !== "solar" ? prev.calendarType : seed.calendarType || "solar",
  };
}

/**
 * SEO 랜딩 히어로의 생년 입력 폼.
 *
 * 검색으로 들어온 사람이 산문과 링크만 만나던 자리를 도구 입력으로 바꾼다.
 * 프로필 카드 프리필은 공용 훅 `useAiProfileSeed` 하나만 쓴다(CLAUDE.md 필수 규칙) —
 * 훅이 `destinyProfileChanged`/`storage` 구독과 서버 hydrate 를 이미 내부에서 처리하므로
 * 여기서 다시 구독하지 않는다.
 *
 * 초기 상태는 반드시 비워 둔다. `output: "export"` 정적 빌드라 렌더 중 localStorage 를 읽으면
 * 하이드레이션 불일치가 난다. 시드는 마운트 후 `seedVersion` 기준 effect 에서만 적용한다.
 */
export default function SeoLandingBirthForm({ heading, submitLabel, submitHref, fields = {} }: Props) {
  const showTime = fields.time !== false;
  const showGender = Boolean(fields.gender);
  const showCalendar = Boolean(fields.calendar);

  const copy = useSeoLandingBirthFormCopy();
  const { seed, seedVersion, reload } = useAiProfileSeed();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const touchedRef = useRef(false);

  useEffect(() => {
    if (!seed) return;
    setForm((prev) => (touchedRef.current ? prev : applySeed(prev, seed)));
    // seedVersion 만 본다 — seed 객체는 매번 새 참조라 의존성에 넣으면 루프가 된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedVersion]);

  function update(patch: Partial<FormState>) {
    touchedRef.current = true;
    setError("");
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function loadFromProfileCard() {
    void reload().then((next) => {
      if (!next) return;
      touchedRef.current = false;
      setForm((prev) => applySeed(prev, next));
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const check = validateBirthDateWithAge(form.birthDate);
    if (!check.isValid) {
      setError(check.error || copy.invalidBirthDate);
      return;
    }

    // 기존 카드 위에 덮어쓴다 — 카드가 있으면 그 id 가 보존되므로
    // publishDestinyProfileBridge 가 활성 카드 id 를 빈 값으로 지우지 않는다.
    const existing = readCurrentDestinyProfile() || {};
    const card: DestinyProfileCard = {
      ...existing,
      birthDate: check.isValid ? form.birthDate : existing.birthDate,
      ...(showTime && !form.birthTimeUnknown && form.birthTime ? { birthTime: form.birthTime } : {}),
      ...(showTime ? { timeUnknown: form.birthTimeUnknown, birthTimeUnknown: form.birthTimeUnknown } : {}),
      ...(showGender && form.gender ? { gender: form.gender } : {}),
      ...(showCalendar ? { calType: form.calendarType, calendarType: form.calendarType } : {}),
    };
    publishDestinyProfileBridge(card);

    // 문서 이동으로 보낸다. 목적지가 정적 셸이면 `?action=` 을 셸 런타임이 해석해야 하고,
    // Next 라우트면 마운트 시 프로필 카드를 다시 읽는다. 어느 쪽이든 방금 쓴 값이 보인다.
    window.location.assign(submitHref);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-9 rounded-2xl border border-[rgba(232,213,163,0.22)] bg-[rgba(19,16,42,0.6)] p-5 sm:p-6"
    >
      <p className="text-[0.95rem] font-semibold text-[#f4eeff]">{heading}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cd-landing-birthdate" className={LABEL_CLASS}>
            {copy.birthDateLabel}
          </label>
          <input
            id="cd-landing-birthdate"
            name="birthDate"
            autoComplete="bday"
            {...birthDateTextInputProps(form.birthDate, (nextBirthDate) => update({ birthDate: nextBirthDate }))}
            className={`mt-1.5 ${INPUT_CLASS}`}
          />
        </div>

        {showTime && (
          <div>
            <label htmlFor="cd-landing-birthtime" className={LABEL_CLASS}>
              {copy.birthTimeLabel}
            </label>
            <input
              id="cd-landing-birthtime"
              name="birthTime"
              type="time"
              value={form.birthTime}
              disabled={form.birthTimeUnknown}
              onChange={(event) => update({ birthTime: event.target.value })}
              className={`mt-1.5 ${INPUT_CLASS} disabled:opacity-50`}
            />
            <label className="mt-2 flex min-h-11 items-center gap-2 text-[0.82rem] text-[rgba(244,238,255,0.75)]">
              <input
                type="checkbox"
                checked={form.birthTimeUnknown}
                onChange={(event) => update({ birthTimeUnknown: event.target.checked, birthTime: "" })}
                className="h-4 w-4 rounded border-[rgba(232,213,163,0.4)] bg-[#13102a]"
              />
              {copy.birthTimeUnknownLabel}
            </label>
          </div>
        )}

        {showGender && (
          <div>
            <label htmlFor="cd-landing-gender" className={LABEL_CLASS}>
              {copy.genderLabel}
            </label>
            <select
              id="cd-landing-gender"
              name="gender"
              value={form.gender}
              onChange={(event) => update({ gender: event.target.value })}
              className={`mt-1.5 ${INPUT_CLASS}`}
            >
              <option value="">{copy.genderNotSelected}</option>
              <option value="male">{copy.genderMale}</option>
              <option value="female">{copy.genderFemale}</option>
            </select>
          </div>
        )}

        {showCalendar && (
          <div>
            <label htmlFor="cd-landing-caltype" className={LABEL_CLASS}>
              {copy.calendarTypeLabel}
            </label>
            <select
              id="cd-landing-caltype"
              name="calendarType"
              value={form.calendarType}
              onChange={(event) => update({ calendarType: event.target.value })}
              className={`mt-1.5 ${INPUT_CLASS}`}
            >
              <option value="solar">{copy.calendarSolar}</option>
              <option value="lunar">{copy.calendarLunar}</option>
            </select>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 break-keep text-[0.85rem] leading-6 text-[#f6b8c8]">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <button
          type="submit"
          aria-label={submitLabel}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#c4b5fd] px-7 text-[0.94rem] font-semibold text-[#0a0818] transition-colors duration-200 ease-out hover:bg-[#d6cbff]"
        >
          {submitLabel}
        </button>
        {seed && (
          <button
            type="button"
            onClick={loadFromProfileCard}
            aria-label={copy.loadFromProfileCardAria}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-[rgba(232,213,163,0.45)] px-5 text-[0.88rem] font-semibold text-[#e8d5a3] transition-colors duration-200 ease-out hover:bg-[rgba(232,213,163,0.08)]"
          >
            {copy.loadFromProfileCardLabel}
          </button>
        )}
      </div>
    </form>
  );
}
