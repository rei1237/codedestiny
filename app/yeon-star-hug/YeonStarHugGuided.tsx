"use client";

// /yeon-star-hug/ 연이의 마음 별자리 입력 — 공통 스텝 플로우 판(3c-A4). 롤백은 lib/guided-flow/flags.mjs 의 GUIDED_STAR_HUG_ENABLED.
// 랜딩 → 감정 하나 → 생년월일·시각·이름(선택, 저장 프로필 선택 포함) → 별자리 확인 → 고민 한 줄(선택) → 읽는 중 → 결과.
// 🔴 값의 정본은 원본(YeonStarHugClient)의 상태다. 이 컴포넌트는 원본 입력 패널과 같은 setter 만 부르고(onChange·onProfileSelect),
// 리딩은 원본 runConsultation(run)으로 만든다. 결과 단계에서는 아무것도 그리지 않고, 원본이 입력 패널+결과를 그대로 그린다.
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import SavedBirthProfilePicker from "@/app/components/SavedBirthProfilePicker";
import { GuidedChoiceList, GuidedFlowShell, GuidedLanding } from "@/app/components/guided-flow/GuidedFlowShell";
import { type GuidedStep, useGuidedFlow } from "@/app/components/guided-flow/useGuidedFlow";
import { useGuidedT } from "@/app/components/guided-flow/useGuidedT";
import gf from "@/app/components/guided-flow/guided-flow.module.css";
import tarot from "@/app/components/guided-flow/guided-tarot.module.css";
import { GUIDED_BIRTH_INPUT_V2_ENABLED, GUIDED_BIRTH_STAR_HUG_ENABLED } from "@/lib/guided-flow/flags.mjs";
import { GuidedBirthStep, type GuidedBirthOptions, guidedBirthCtaLabels, guidedBirthTitles } from "@/app/components/guided-flow/birth/GuidedBirthSteps";
import { BIRTH_CONFIRM, birthSteps, isBirthField } from "@/app/components/guided-flow/birth/birth-steps";

const FLOW_ID = "yeon-star-hug";
const LEGACY_STEPS: GuidedStep[] = [
  { id: "emotion", kind: "choice" },
  { id: "birth", kind: "input", required: false },
  { id: "sign", kind: "input" },
  { id: "concern", kind: "input", required: false },
  { id: "reading", kind: "wait", history: "none", transient: true, restoreTo: "concern" },
  { id: "result", kind: "result", history: "replace" },
];
// W1 공용 출생 입력: 감정 → 이름 → 생년월일(선택) → 시각 → 확인 요약 → 별자리 → 고민. 값의 정본은 여전히 원본 상태다:
// 단계 답(YYYY-MM-DD·HH:mm)과 원본 값(8자리·4자리)을 서로 비춘다.
// 출생 입력 확대(GUIDED_BIRTH_INPUT_V2_ENABLED): 생년월일 한 칸 + 시각 뒤 태어난 장소(선택, 기록만).
// 🔴 장소는 원본 상태·리딩(buildConsultation)에 넘기지 않는다. 저장 프로필을 고르면 원본이 정밀 차트를 서버(western-chart 조회)에서
// 계산하므로 '브라우저에서만 계산' 안내는 두지 않는다.
const BIRTH_V2 = GUIDED_BIRTH_INPUT_V2_ENABLED;
const BIRTH_FIELDS = BIRTH_V2 ? ["name", "date", "time", "place"] as const : ["name", "date", "time"] as const;
const BIRTH_STEPS: GuidedStep[] = [
  { id: "emotion", kind: "choice" },
  ...birthSteps({ fields: BIRTH_FIELDS, required: { date: false } }),
  { id: "sign", kind: "input" },
  { id: "concern", kind: "input", required: false },
  { id: "reading", kind: "wait", history: "none", transient: true, restoreTo: "concern" },
  { id: "result", kind: "result", history: "replace" },
];
const BIRTH = GUIDED_BIRTH_STAR_HUG_ENABLED;
const STEPS = BIRTH ? BIRTH_STEPS : LEGACY_STEPS;

/** 원본 값(8자리 날짜·4자리 시각) ↔ 단계 답(YYYY-MM-DD·HH:mm). */
export const dateAnswerFromValue = (value: string) => (/^\d{8}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}` : "");
export const timeAnswerFromValue = (value: string) => (/^\d{4}$/.test(value) ? `${value.slice(0, 2)}:${value.slice(2)}` : "");

export type StarHugValues = {
  emotion: string;
  birthDate: string;
  birthTime: string;
  name: string;
  sign: string;
  concern: string;
};

type Setters = { [K in keyof StarHugValues]: (value: string) => void };

type ProfileSelect = Parameters<NonNullable<Parameters<typeof SavedBirthProfilePicker>[0]["onSelect"]>>;

type Props = {
  flowScope?: string;
  emotions: { key: string; label: string }[];
  signs: { sign: string; period: string }[];
  samples: string[];
  values: StarHugValues;
  onChange: Setters;
  onProfileSelect: (...args: ProfileSelect) => void;
  /** 원본 프로필 연결 안내(별자리 자동 맞춤 문구). */
  profileNote: string;
  /** 원본 runConsultation. */
  run: () => void;
  /** 원본 결과(consultation·reading)가 있다. */
  ready: boolean;
  onStepChange: (stepId: string | null) => void;
};

type Answers = Record<string, unknown>;

const text = (value: unknown) => (typeof value === "string" ? value : "");

/** 생년월일 단계 답: [8자리 날짜, 4자리 시각, 이름]. 스냅숏(문자열 배열)으로 새로고침 뒤 원본 상태에 되돌린다. */
export function birthAnswer(values: Pick<StarHugValues, "birthDate" | "birthTime" | "name">): string[] {
  return [values.birthDate, values.birthTime, values.name];
}

export default function YeonStarHugGuided({ flowScope, emotions, signs, samples, values, onChange, onProfileSelect, profileNote, run, ready, onStepChange }: Props) {
  const t = useGuidedT();
  const flow = useGuidedFlow({ steps: STEPS, featureId: "yeon_star_hug", surface: "yeon_star_hug", flowId: flowScope || FLOW_ID });
  const { controller, state, step } = flow;
  const answers = state.answers as Answers;
  const stepId = step?.id ?? null;
  const [hydrated, setHydrated] = useState(false);
  const ran = useRef(false);

  useEffect(() => { onStepChange(stepId); }, [stepId, onStepChange]);

  // 새로고침 복원: 스냅숏 답을 원본 상태로 한 번 되돌린다(useGuidedFlow 의 복원 effect 가 먼저 돈다).
  useEffect(() => {
    const saved = controller.getState().answers as Answers;
    if (text(saved.emotion)) onChange.emotion(text(saved.emotion));
    if (BIRTH) {
      if (text(saved.date)) onChange.birthDate(text(saved.date).replace(/-/g, ""));
      if (text(saved.time)) onChange.birthTime(text(saved.time).replace(":", ""));
      if (text(saved.name)) onChange.name(text(saved.name));
    }
    if (Array.isArray(saved.birth)) {
      const [date, time, name] = saved.birth as string[];
      if (date) onChange.birthDate(date);
      if (time) onChange.birthTime(time);
      if (name) onChange.name(name);
    }
    if (text(saved.sign)) onChange.sign(text(saved.sign));
    if (text(saved.concern)) onChange.concern(text(saved.concern));
    setHydrated(true);
    // 첫 마운트 한 번만.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 감정 선택 → 원본 감정 상태.
  const emotionAnswer = text(answers.emotion);
  useEffect(() => { if (emotionAnswer) onChange.emotion(emotionAnswer); }, [emotionAnswer, onChange]);

  // 생년월일 단계: 원본 상태(직접 입력·저장 프로필·프로필 자동 연결)를 단계 답에 비춘다.
  useEffect(() => {
    if (stepId !== "birth") return;
    controller.setAnswer(birthAnswer(values));
  }, [stepId, values.birthDate, values.birthTime, values.name, controller]); // eslint-disable-line react-hooks/exhaustive-deps

  // W1: 원본 값(직접·저장 프로필·프로필 자동 연결·새로고침 복원) → 단계 답. 빈 값은 비추지 않는다(사용자가 지운 답을 되살리지 않게).
  useEffect(() => {
    if (!BIRTH) return;
    const patch: Record<string, string> = {};
    const date = dateAnswerFromValue(values.birthDate);
    const time = timeAnswerFromValue(values.birthTime);
    if (date) patch.date = date;
    if (time) patch.time = time;
    if (values.name) patch.name = values.name;
    controller.mergeAnswers(patch);
  }, [values.birthDate, values.birthTime, values.name, controller]);

  // W1: 단계 답이 바뀌면 원본 setter 로 보낸다(원본 입력 패널과 같은 setter). 처음 값은 보내지 않는다.
  const birthNow = { date: text(answers.date), time: text(answers.time), name: text(answers.name) };
  const birthPrev = useRef(birthNow);
  useEffect(() => {
    if (!BIRTH) return;
    const prev = birthPrev.current;
    birthPrev.current = birthNow;
    if (birthNow.date !== prev.date && birthNow.date.replace(/-/g, "") !== values.birthDate) onChange.birthDate(birthNow.date.replace(/-/g, ""));
    if (birthNow.time !== prev.time && birthNow.time.replace(":", "") !== values.birthTime) onChange.birthTime(birthNow.time.replace(":", ""));
    if (birthNow.name !== prev.name && birthNow.name !== values.name) onChange.name(birthNow.name);
  }, [birthNow.date, birthNow.time, birthNow.name]); // eslint-disable-line react-hooks/exhaustive-deps

  // W1: 저장 프로필은 원본 onProfileSelect 로만 담는다(음력 프로필 양력 변환·별자리 연결이 원본에 있다). 답은 위 effect 로 흘러온다.
  const birthOptions = useMemo<GuidedBirthOptions>(() => ({
    idPrefix: "star-hug", fields: BIRTH_FIELDS, required: { date: false }, nameMaxLength: 30, profile: true, profileFill: false,
    ...(BIRTH_V2 ? { dateInput: "single", placeMode: "record" } as const : {}),
    onProfile: (seed, profile) => { onProfileSelect(seed as ProfileSelect[0], profile as ProfileSelect[1]); },
  }), [onProfileSelect]);

  // 별자리 단계: 원본이 맞춰 둔 별자리(생년월일 자동 매칭·프로필 연결 포함)를 그대로 답으로 비춘다.
  useEffect(() => {
    if (stepId !== "sign" || !values.sign) return;
    if (controller.getState().answers.sign !== values.sign) controller.setAnswer(values.sign);
  }, [stepId, values.sign, controller]);

  // 읽는 중: 원본 runConsultation 을 그대로 부른다(260ms 결정적 계산, 최소 대기 안에 끝난다).
  useEffect(() => {
    if (stepId !== "reading") { if (stepId !== "result") ran.current = false; return; }
    if (ran.current) return;
    ran.current = true;
    run();
  }, [stepId, run]);

  // 새로고침으로 결과에 바로 온 경우: 원본 상태가 복원된 다음 렌더에서 한 번 다시 읽는다.
  useEffect(() => {
    if (stepId !== "result" || !hydrated || ready || ran.current) return;
    ran.current = true;
    run();
  }, [stepId, hydrated, ready, run]);

  const labels = useMemo(() => ({
    back: t("back"), next: t("next"), skip: t("skip"),
    progress: (current: number, total: number) => t("progress", { current, total }),
    slowLine: t("slowLine"),
  }), [t]);

  if (stepId === "result") return null;

  const titles = {
    ...(BIRTH ? guidedBirthTitles(t) : {}),
    emotion: t("starHug.emotionTitle"), birth: t("starHug.birthTitle"), sign: t("starHug.signTitle"),
    concern: t("starHug.concernTitle"), reading: t("starHug.readingTitle"), result: t("starHug.readingTitle"),
  };
  const advanceOnEnter = (event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (event.key === "Enter") { event.preventDefault(); controller.next("cta"); }
  };

  const landing = <GuidedLanding
    titleAs="h2"
    eyebrow={t("starHug.eyebrow")}
    title={t("starHug.title")}
    subtitle={t("starHug.subtitle")}
    ctaLabel={t("starHug.cta")}
    onStart={flow.start}
    freeHint={t("starHug.freeHint")}
    aboutTitle={t("starHug.aboutTitle")}
    aboutBody={t("starHug.aboutBody")}
    guideTitle={t("starHug.guideTitle")}
    guideSteps={[1, 2, 3, 4].map((n) => ({ title: t(`starHug.guide${n}Title`), body: t(`starHug.guide${n}Body`) }))}
  />;

  const renderStep = (current: GuidedStep) => {
    if (BIRTH && (isBirthField(current.id) || current.id === BIRTH_CONFIRM)) return <GuidedBirthStep flow={flow} step={current} options={birthOptions} />;
    if (current.id === "emotion") {
      return <GuidedChoiceList flow={flow} label={t("starHug.emotionTitle")} options={emotions.map((item) => ({ value: item.key, label: item.label }))} />;
    }
    if (current.id === "birth") return <>
      <SavedBirthProfilePicker onSelect={onProfileSelect} />
      <label className={tarot.note} htmlFor="star-hug-date">{t("starHug.dateLabel")}</label>
      <input id="star-hug-date" name="birthDate" className={gf.field} inputMode="numeric" maxLength={8} placeholder="19990125" autoComplete="bday"
        value={values.birthDate} onChange={(event) => onChange.birthDate(event.target.value)} onKeyDown={advanceOnEnter} />
      <label className={tarot.note} htmlFor="star-hug-time">{t("starHug.timeLabel")}</label>
      <input id="star-hug-time" name="birthTime" type="time" className={gf.field}
        value={values.birthTime.length === 4 ? `${values.birthTime.slice(0, 2)}:${values.birthTime.slice(2)}` : ""}
        onChange={(event) => onChange.birthTime(event.target.value.replace(":", ""))} onKeyDown={advanceOnEnter} />
      <label className={tarot.note} htmlFor="star-hug-name">{t("starHug.nameLabel")}</label>
      <input id="star-hug-name" name="name" className={gf.field} maxLength={30} value={values.name}
        onChange={(event) => onChange.name(event.target.value.slice(0, 30))} onKeyDown={advanceOnEnter} />
      <p className={tarot.note}>{t("starHug.birthHint")}</p>
    </>;
    if (current.id === "sign") return <>
      <label className={tarot.note} htmlFor="star-hug-sign">{t("starHug.signLabel")}</label>
      <select id="star-hug-sign" name="sign" className={gf.field} value={values.sign}
        onChange={(event) => { controller.setAnswer(event.target.value); onChange.sign(event.target.value); }} onKeyDown={advanceOnEnter}>
        {signs.map((item) => <option key={item.sign} value={item.sign}>{`${item.sign} (${item.period})`}</option>)}
      </select>
      <p className={tarot.note} aria-live="polite">{profileNote}</p>
    </>;
    if (current.id === "concern") {
      const setConcern = (next: string) => { controller.setAnswer(next); onChange.concern(next); };
      const concern = text(answers.concern);
      return <>
        <label className={tarot.note} htmlFor="star-hug-concern">{t("starHug.concernLabel")}</label>
        <textarea id="star-hug-concern" name="concern" className={gf.field} rows={4} maxLength={2000} value={concern}
          onChange={(event) => setConcern(event.target.value)} />
        <p className={tarot.note}>{t("starHug.concernHint")}</p>
        <div className={gf.choices} role="group" aria-label={t("starHug.samplesLabel")}>
          {samples.map((sample) => (
            <button key={sample} type="button" className={gf.choice} aria-pressed={concern === sample} onClick={() => setConcern(sample)}>
              <span className={gf.choiceHint}>{sample}</span>
            </button>
          ))}
        </div>
      </>;
    }
    return <p className={tarot.note} aria-live="polite">{t("starHug.readingBody")}</p>;
  };

  return <GuidedFlowShell className={tarot.embedded} flow={flow} labels={labels} titles={titles} landing={landing} renderStep={renderStep} ctaLabels={BIRTH ? guidedBirthCtaLabels(t) : undefined} />;
}
