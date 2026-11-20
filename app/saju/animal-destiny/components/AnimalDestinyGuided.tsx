"use client";

// /saju/animal-destiny/ 십이운성 동물점 입력 — 공통 스텝 플로우 판(3c-A3). 롤백은 lib/guided-flow/flags.mjs 의 GUIDED_ANIMAL_DESTINY_ENABLED.
// 랜딩 → 생년월일(저장 프로필 선택 포함) → 달력 → 출생시각(선택) → 성별 → 부를 이름(선택) → 계산 → 결과.
// 🔴 원본(TwelveAnimalInputCard + AnimalDestinyPage)과 같은 것: 스토어 입력 필드 6개(name·birthDate·birthTime·gender·calendarType·lunarLeap),
// 계산은 스토어 calculate() 그대로(그 안의 유료 풀이 확인 loadPaid·로그인/잠금 안내 포함), 결과 화면·다시 하기·공유는 AnimalDestinyPage 가 원본 그대로 그린다.
// 이 컴포넌트는 결과가 나오면 아무것도 그리지 않는다(상태는 유지해 뒤로가기·다시 하기와 맞춘다).
import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef } from "react";
import SavedBirthProfilePicker from "@/app/components/SavedBirthProfilePicker";
import { GuidedChoiceList, GuidedFlowShell, GuidedLanding } from "@/app/components/guided-flow/GuidedFlowShell";
import { type GuidedStep, useGuidedFlow } from "@/app/components/guided-flow/useGuidedFlow";
import { useGuidedT } from "@/app/components/guided-flow/useGuidedT";
import gf from "@/app/components/guided-flow/guided-flow.module.css";
import tarot from "@/app/components/guided-flow/guided-tarot.module.css";
import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import { normalizeBirthDateInput } from "@/lib/birthDateInput";
import type { AnimalDestinyInput } from "../lib/types";
import { useAnimalDestinyStore } from "../store/useAnimalDestinyStore";
import { GUIDED_BIRTH_ANIMAL_DESTINY_ENABLED } from "@/lib/guided-flow/flags.mjs";
import { GuidedBirthStep, type GuidedBirthOptions, guidedBirthCtaLabels, guidedBirthTitles } from "@/app/components/guided-flow/birth/GuidedBirthSteps";
import { BIRTH_CONFIRM, type BirthProfileSeed, birthSteps, isBirthField } from "@/app/components/guided-flow/birth/birth-steps";

const FLOW_ID = "animal-destiny-twelve";
const LEGACY_STEPS: GuidedStep[] = [
  { id: "date", kind: "input" },
  { id: "calendar", kind: "choice" },
  { id: "time", kind: "input", required: false },
  { id: "gender", kind: "choice" },
  { id: "name", kind: "input", required: false },
  { id: "computing", kind: "wait", history: "none", transient: true, restoreTo: "name", awaitWork: true },
  { id: "result", kind: "result", history: "replace" },
];
// W1 공용 출생 입력: 이름(선택) → 성별 → 생년월일 → 달력 → 시각 → 확인 요약. 단계 id·답 형식·스토어 입력(animalInputFromAnswers)은 같다.
// 태어난 장소는 12운성 계산이 받지 않아 묻지 않는다.
const BIRTH_FIELDS = ["name", "gender", "date", "calendar", "time"] as const;
const BIRTH_STEPS: GuidedStep[] = [
  ...birthSteps({ fields: BIRTH_FIELDS }),
  { id: "computing", kind: "wait", history: "none", transient: true, restoreTo: BIRTH_CONFIRM, awaitWork: true },
  { id: "result", kind: "result", history: "replace" },
];
const BIRTH = GUIDED_BIRTH_ANIMAL_DESTINY_ENABLED;
const STEPS = BIRTH ? BIRTH_STEPS : LEGACY_STEPS;

type Answers = Record<string, string | undefined>;

/** 단계 답 → 원본 입력 카드와 같은 스토어 입력. */
export function animalInputFromAnswers(answers: Answers): AnimalDestinyInput {
  const calendar = answers.calendar;
  const gender = answers.gender;
  return {
    name: String(answers.name || "").slice(0, 20),
    birthDate: String(answers.date || ""),
    birthTime: String(answers.time || ""),
    gender: gender === "male" || gender === "female" ? gender : "unknown",
    calendarType: calendar === "lunar" || calendar === "leap" ? "lunar" : "solar",
    lunarLeap: calendar === "leap",
  };
}

/** 스토어 입력(저장 프로필 선택 등) → 아직 답이 없는 입력 단계의 미리 채움 값.
 *  선택 단계(달력·성별)는 controller.select 가 자동 진행을 걸어서 미리 채우지 않는다 — 사용자가 다시 고른다. */
function answerFromInput(stepId: string, input: AnimalDestinyInput): string {
  if (stepId === "time") return String(input.birthTime || "");
  if (stepId === "name") return String(input.name || "");
  return "";
}

export default function AnimalDestinyGuided() {
  const t = useGuidedT();
  const flow = useGuidedFlow({ steps: STEPS, featureId: "animal_destiny", surface: "saju_animal_destiny", flowId: FLOW_ID });
  const { controller, state, step } = flow;
  const answers = state.answers as Answers;
  const status = useAnimalDestinyStore((s) => s.status);
  const setInput = useAnimalDestinyStore((s) => s.setInput);
  const calculate = useAnimalDestinyStore((s) => s.calculate);
  const reset = useAnimalDestinyStore((s) => s.reset);
  const running = useRef(false);
  const prevStatus = useRef(status);
  const stepId = step?.id;

  // 저장 프로필로 채운 시각·이름은 그 단계에 들어올 때 미리 채워 둔다(자동 진행은 하지 않는다).
  useEffect(() => {
    if (BIRTH) return; // W1 은 프로필을 고를 때 답을 한꺼번에 채운다(mergeAnswers).
    if (stepId !== "time" && stepId !== "name") return;
    const current = controller.getState().answers as Answers;
    if (current[stepId]) return;
    const value = answerFromInput(stepId, useAnimalDestinyStore.getState().input);
    if (value) controller.setAnswer(value);
  }, [stepId, controller]);

  // 계산 단계: 원본 제출과 같이 스토어 입력을 맞춘 뒤 calculate() 를 부른다.
  useEffect(() => {
    if (stepId !== "computing" || running.current) return;
    running.current = true;
    setInput(animalInputFromAnswers(controller.getState().answers as Answers));
    void calculate().finally(() => { running.current = false; });
  }, [stepId, controller, setInput, calculate]);

  useEffect(() => {
    const before = prevStatus.current;
    prevStatus.current = status;
    if (stepId === "computing") {
      if (status === "result") controller.workDone();
      else if (status === "error" && before !== "error") controller.goTo("date");
      return;
    }
    if (stepId === "result") {
      // 원본 '다시 하기'·헤더 뒤로(reset) → 생년월일부터.
      if (before === "result" && status === "idle") { controller.goTo("date"); return; }
      // 새로고침 복원: 같은 답으로 다시 계산만 한다.
      if ((status === "idle" || status === "input") && !running.current) {
        running.current = true;
        setInput(animalInputFromAnswers(controller.getState().answers as Answers));
        void calculate().finally(() => { running.current = false; });
      }
      if (status === "error") controller.goTo("date");
      return;
    }
    // 결과에서 브라우저 뒤로로 입력 단계에 돌아오면 결과를 닫는다(원본 헤더 뒤로와 같은 reset).
    if (status === "result") reset();
  }, [status, stepId, controller, setInput, calculate, reset]);

  const labels = useMemo(() => ({
    back: t("back"), next: t("next"), skip: t("skip"),
    progress: (current: number, total: number) => t("progress", { current, total }),
    slowLine: t("slowLine"),
  }), [t]);
  const titles = {
    ...(BIRTH ? guidedBirthTitles(t) : {}),
    date: t("animalDestiny.dateTitle"), calendar: t("animalDestiny.calendarTitle"), time: t("animalDestiny.timeTitle"),
    gender: t("animalDestiny.genderTitle"), name: t("animalDestiny.nameTitle"),
    computing: t("animalDestiny.computingTitle"), result: t("animalDestiny.computingTitle"),
  };
  const advanceOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") { event.preventDefault(); controller.next("cta"); }
  };
  const pickProfile = useCallback((seed: { name?: string; birthDate?: string; birthTime?: string; birthTimeUnknown?: boolean; gender?: string; calendarType?: "solar" | "lunar"; isLeapMonth?: boolean }) => {
    // 원본 입력 카드의 onSelect 와 같은 매핑.
    const next: Partial<AnimalDestinyInput> = {
      name: seed.name || "",
      birthDate: seed.birthDate || "",
      birthTime: seed.birthTimeUnknown ? "" : seed.birthTime || "",
      gender: seed.gender === "male" || seed.gender === "female" ? seed.gender : "unknown",
      calendarType: seed.calendarType || "solar",
      lunarLeap: Boolean(seed.isLeapMonth),
    };
    setInput(next);
    controller.setAnswer(next.birthDate || "");
  }, [controller, setInput]);

  // W1: 저장 프로필을 고르면 원본 매핑으로 스토어를 채운다. 단계 답은 공용 묶음이 같은 프로필에서 채운다.
  const birthOptions = useMemo<GuidedBirthOptions>(() => ({
    idPrefix: "animal-destiny", fields: BIRTH_FIELDS, profile: true,
    onProfile: (seed: BirthProfileSeed) => {
      setInput({
        name: seed.name || "",
        birthDate: seed.birthDate || "",
        birthTime: seed.birthTimeUnknown ? "" : seed.birthTime || "",
        gender: seed.gender === "male" || seed.gender === "female" ? seed.gender : "unknown",
        calendarType: seed.calendarType || "solar",
        lunarLeap: Boolean(seed.isLeapMonth),
      });
    },
  }), [setInput]);

  if (status === "result" && stepId === "result") return null;

  const landing = <GuidedLanding
    titleAs="h2"
    eyebrow={t("animalDestiny.eyebrow")}
    title={t("animalDestiny.title")}
    subtitle={t("animalDestiny.subtitle")}
    ctaLabel={t("animalDestiny.cta")}
    onStart={flow.start}
    freeHint={t("animalDestiny.freeHint")}
    aboutTitle={t("animalDestiny.aboutTitle")}
    aboutBody={t("animalDestiny.aboutBody")}
    guideTitle={t("animalDestiny.guideTitle")}
    guideSteps={[1, 2, 3].map((n) => ({ title: t(`animalDestiny.guide${n}Title`), body: t(`animalDestiny.guide${n}Body`) }))}
  />;

  const renderStep = (current: GuidedStep) => {
    if (BIRTH && (isBirthField(current.id) || current.id === BIRTH_CONFIRM)) return <GuidedBirthStep flow={flow} step={current} options={birthOptions} />;
    if (current.id === "date") {
      const dateProps = birthDateTextInputProps(String(answers.date || ""), (next) => {
        controller.setAnswer(normalizeBirthDateInput(next));
      });
      return <>
        <SavedBirthProfilePicker onSelect={pickProfile} />
        <label className={tarot.note} htmlFor="animal-destiny-date">{t("animalDestiny.dateLabel")}</label>
        <input id="animal-destiny-date" name="date" className={gf.field} autoComplete="bday" {...dateProps} onKeyDown={advanceOnEnter} />
      </>;
    }
    if (current.id === "calendar") return <GuidedChoiceList flow={flow} label={t("animalDestiny.calendarTitle")} options={[
      { value: "solar", label: t("animalDestiny.solar") },
      { value: "lunar", label: t("animalDestiny.lunar") },
      { value: "leap", label: t("animalDestiny.leap") },
    ]} />;
    if (current.id === "time") return <>
      <label className={tarot.note} htmlFor="animal-destiny-time">{t("animalDestiny.timeLabel")}</label>
      <input id="animal-destiny-time" name="time" type="time" className={gf.field} value={String(answers.time || "")} onChange={(event) => controller.setAnswer(event.target.value)} onKeyDown={advanceOnEnter} />
      <p className={tarot.note}>{t("animalDestiny.timeHint")}</p>
    </>;
    if (current.id === "gender") return <GuidedChoiceList flow={flow} label={t("animalDestiny.genderTitle")} options={[
      { value: "female", label: t("animalDestiny.female") },
      { value: "male", label: t("animalDestiny.male") },
      { value: "unknown", label: t("animalDestiny.genderSkip") },
    ]} />;
    if (current.id === "name") return <>
      <label className={tarot.note} htmlFor="animal-destiny-name">{t("animalDestiny.nameLabel")}</label>
      <input id="animal-destiny-name" name="name" className={gf.field} maxLength={20} value={String(answers.name || "")} onChange={(event) => controller.setAnswer(event.target.value.slice(0, 20))} onKeyDown={advanceOnEnter} />
      <p className={tarot.note}>{t("animalDestiny.nameHint")}</p>
    </>;
    return <p className={tarot.note} aria-live="polite">{t("animalDestiny.computingBody")}</p>;
  };

  return <GuidedFlowShell className={tarot.embedded} flow={flow} labels={labels} titles={titles} landing={landing} renderStep={renderStep} ctaLabels={BIRTH ? guidedBirthCtaLabels(t) : undefined} />;
}
