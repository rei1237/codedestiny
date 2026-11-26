"use client";

// /saju/free/ 무료 명식 계산 — 공통 스텝 플로우 판(3c-A2, 2026-11-20 승인 "a2 진행"). 롤백은 lib/guided-flow/flags.mjs.
// 랜딩 → 생년월일 → 달력 → 출생시각(선택) → 계산(엔진 대기) → 결과.
// 🔴 원본(FreeSajuForm.tsx)과 같은 것: 엔진 입력(computeFreeSaju 인자 4개), 측정(free_saju_chart_started/completed,
// surface·time_known 만, 생년월일은 싣지 않는다), 결과 문구(기둥 한 줄 + elementBalanceLine, 신살 필드가 있을 때만 shinsalSummaryLine), 실패 문구. 저장 기록은 원본처럼 없다.
import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GuidedChoiceList, GuidedFlowShell, GuidedLanding } from "@/app/components/guided-flow/GuidedFlowShell";
import { type GuidedStep, useGuidedFlow } from "@/app/components/guided-flow/useGuidedFlow";
import { useGuidedT } from "@/app/components/guided-flow/useGuidedT";
import gf from "@/app/components/guided-flow/guided-flow.module.css";
import tarot from "@/app/components/guided-flow/guided-tarot.module.css";
import { computeFreeSaju, preloadFreeSajuEngine } from "@/lib/free-saju/engine";
import type { FreeSajuReading } from "@/lib/free-saju/compute";
import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import { normalizeBirthDateInput } from "@/lib/birthDateInput";
import { elementBalanceLine, shinsalSummaryLine } from "@/lib/free-saju/copy";
import { trackEvent } from "@/lib/analytics";
import YeoniSay from "@/components/fortune/YeoniSay";
import { GUIDED_BIRTH_FREE_SAJU_ENABLED, GUIDED_BIRTH_INPUT_V2_ENABLED } from "@/lib/guided-flow/flags.mjs";
import { GuidedBirthStep, type GuidedBirthOptions, guidedBirthCtaLabels, guidedBirthTitles } from "@/app/components/guided-flow/birth/GuidedBirthSteps";
import { BIRTH_CONFIRM, birthSteps, isBirthField } from "@/app/components/guided-flow/birth/birth-steps";

const FLOW_ID = "free-saju-chart";
const LEGACY_STEPS: GuidedStep[] = [
  { id: "date", kind: "input" },
  { id: "calendar", kind: "choice" },
  { id: "time", kind: "input", required: false },
  { id: "computing", kind: "wait", history: "none", transient: true, restoreTo: "time", awaitWork: true },
  { id: "result", kind: "result", history: "replace" },
];
// W1 공용 출생 입력: 생년월일(년·월·일 칸) → 달력 → 시각(시진 칩·직접·몰라요) → 확인 요약. 답 형식·엔진 입력은 위와 같다.
// 저장 프로필 고르기는 원본처럼 없다. 출생 입력 확대(GUIDED_BIRTH_INPUT_V2_ENABLED): 생년월일 한 칸 + 태어난 장소(선택, 기록만).
// 🔴 장소는 computeFreeSaju 에 넘기지 않는다(엔진 입력 4개 그대로, 계산은 서울 기준) — 확인 요약에만 보인다. 계산·측정 모두
// 브라우저 안에서 끝나고 출생 정보는 측정 이벤트에도 싣지 않으므로 확인 단계에 '브라우저에서만 계산' 안내를 둔다.
const BIRTH_OPTIONS: GuidedBirthOptions = GUIDED_BIRTH_INPUT_V2_ENABLED
  ? { idPrefix: "free-saju", fields: ["date", "calendar", "time", "place"], dateInput: "single", placeMode: "record", localNote: true }
  : { idPrefix: "free-saju", fields: ["date", "calendar", "time"] };
const BIRTH_STEPS: GuidedStep[] = [
  ...birthSteps(BIRTH_OPTIONS),
  { id: "computing", kind: "wait", history: "none", transient: true, restoreTo: BIRTH_CONFIRM, awaitWork: true },
  { id: "result", kind: "result", history: "replace" },
];
const BIRTH = GUIDED_BIRTH_FREE_SAJU_ENABLED;
const STEPS = BIRTH ? BIRTH_STEPS : LEGACY_STEPS;

type Answers = Record<string, string | undefined>;

function engineInput(answers: Answers) {
  const calendar = answers.calendar;
  return {
    birthDate: String(answers.date || ""),
    birthTime: String(answers.time || "") || null,
    calendarType: calendar === "solar" ? "solar" as const : "lunar" as const,
    leapMonth: calendar === "leap",
  };
}

export default function FreeSajuGuided() {
  const t = useGuidedT();
  const flow = useGuidedFlow({ steps: STEPS, featureId: "free_saju", surface: "saju_free", flowId: FLOW_ID });
  const { controller, state, step } = flow;
  const answers = state.answers as Answers;
  const [birthDate, setBirthDate] = useState(() => String(answers.date || ""));
  const [reading, setReading] = useState<FreeSajuReading | null>(null);
  const [error, setError] = useState("");
  const running = useRef(false);
  const computed = useRef<FreeSajuReading | null>(null); // 결과 단계 진입이 setReading 커밋보다 먼저 올 수 있다
  const stepId = step?.id;
  const currentId = useCallback(() => {
    const index = controller.getState().index;
    return index >= 0 ? controller.steps[index].id : null;
  }, [controller]);

  // 계산 단계에 들어오면 원본 submit() 과 같은 순서로 측정·계산한다. 실패하면 생년월일 단계로 돌아가 원본 문구를 보인다.
  useEffect(() => {
    if (stepId !== "computing" || running.current) return;
    running.current = true;
    const input = engineInput(controller.getState().answers as Answers);
    const measure = { surface: "saju_free", time_known: Boolean(input.birthTime) };
    computed.current = null; setReading(null); setError("");
    trackEvent("free_saju_chart_started", measure);
    computeFreeSaju(input).then((next) => {
      running.current = false;
      computed.current = next;
      setReading(next);
      trackEvent("free_saju_chart_completed", measure);
      if (currentId() === "computing") controller.workDone();
    }).catch(() => {
      running.current = false;
      setError("입력한 날짜와 달력 구분을 확인해 주세요.");
      if (currentId() === "computing") controller.goTo("date");
    });
  }, [stepId, controller, currentId]);

  // 새로고침으로 결과 단계가 복원되면 같은 입력으로 다시 계산만 한다(측정은 다시 보내지 않는다).
  useEffect(() => {
    if (stepId !== "result" || reading || computed.current || running.current) return;
    running.current = true;
    computeFreeSaju(engineInput(controller.getState().answers as Answers)).then((next) => {
      running.current = false; computed.current = next; setReading(next);
    }).catch(() => {
      running.current = false;
      setError("입력한 날짜와 달력 구분을 확인해 주세요.");
      controller.goTo("date");
    });
  }, [stepId, reading, controller]);

  // 날짜를 고치기 시작하면 지난 계산의 오류 문구를 거둔다.
  useEffect(() => { setError(""); }, [answers.date, birthDate]);

  const begin = useCallback(() => {
    void preloadFreeSajuEngine().catch(() => {});
    flow.start();
  }, [flow]);

  const restart = useCallback(() => {
    computed.current = null; setReading(null); setError("");
    controller.goTo("date");
  }, [controller]);

  // 새로고침 복원 땐 입력란 상태가 비어 있으니 저장된 답을 보인다.
  const dateProps = birthDateTextInputProps(birthDate || String(answers.date || ""), (next) => {
    setBirthDate(next);
    controller.setAnswer(normalizeBirthDateInput(next));
  });

  const labels = useMemo(() => ({
    back: t("back"), next: t("next"), skip: t("skip"),
    progress: (current: number, total: number) => t("progress", { current, total }),
    slowLine: t("slowLine"),
  }), [t]);
  const titles = {
    ...(BIRTH ? guidedBirthTitles(t) : {}),
    date: t("freeSaju.dateTitle"), calendar: t("freeSaju.calendarTitle"), time: t("freeSaju.timeTitle"),
    computing: t("freeSaju.computingTitle"), result: t("freeSaju.resultTitle"),
  };
  const advanceOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") { event.preventDefault(); controller.next("cta"); }
  };

  const landing = <GuidedLanding
    titleAs="h2"
    eyebrow={t("freeSaju.eyebrow")}
    title={t("freeSaju.title")}
    subtitle={t("freeSaju.subtitle")}
    ctaLabel={t("freeSaju.cta")}
    onStart={begin}
    freeHint={t("freeSaju.freeHint")}
    aboutTitle={t("freeSaju.aboutTitle")}
    aboutBody={t("freeSaju.aboutBody")}
    guideTitle={t("freeSaju.guideTitle")}
    guideSteps={[1, 2, 3].map((n) => ({ title: t(`freeSaju.guide${n}Title`), body: t(`freeSaju.guide${n}Body`) }))}
  />;

  const renderStep = (current: GuidedStep) => {
    if (BIRTH && (isBirthField(current.id) || current.id === BIRTH_CONFIRM)) return <>
      {current.id === "date" && error ? <p className={tarot.note} role="alert">{error}</p> : null}
      <GuidedBirthStep flow={flow} step={current} options={BIRTH_OPTIONS} />
    </>;
    if (current.id === "date") return <>
      <label className={tarot.note} htmlFor="free-saju-date">{t("freeSaju.dateLabel")}</label>
      <input id="free-saju-date" name="date" className={gf.field} autoComplete="bday" {...dateProps} onKeyDown={advanceOnEnter} onFocus={() => { void preloadFreeSajuEngine().catch(() => {}); }} />
      {error ? <p className={tarot.note} role="alert">{error}</p> : null}
    </>;
    if (current.id === "calendar") return <GuidedChoiceList flow={flow} label={t("freeSaju.calendarTitle")} options={[
      { value: "solar", label: t("freeSaju.solar") },
      { value: "lunar", label: t("freeSaju.lunar") },
      { value: "leap", label: t("freeSaju.leap") },
    ]} />;
    if (current.id === "time") return <>
      <label className={tarot.note} htmlFor="free-saju-time">{t("freeSaju.timeLabel")}</label>
      <input id="free-saju-time" name="time" type="time" className={gf.field} value={String(answers.time || "")} onChange={(event) => controller.setAnswer(event.target.value)} onKeyDown={advanceOnEnter} />
      <p className={tarot.note}>{t("freeSaju.timeHint")}</p>
    </>;
    if (current.id === "computing") return <p className={tarot.note} aria-live="polite">{t("freeSaju.computingBody")}</p>;
    return <div aria-live="polite">
      {reading ? <>
        <YeoniSay domain="saju" sectionKey="pillars" />
        <p className={gf.reading}><b>년주 {reading.pillars.year} · 월주 {reading.pillars.month} · 일주 {reading.pillars.day} · 시주 {reading.pillars.hour || "미상"}</b></p>
        <YeoniSay domain="saju" sectionKey="elements" />
        <p className={gf.reading}>{elementBalanceLine(reading.elements)}</p>
        {reading.shinsal ? <p className={gf.reading}>{shinsalSummaryLine(reading.shinsal)}</p> : null}
        <YeoniSay domain="saju" sectionKey="close" />
      </> : null}
      <button type="button" className="cd-btn cd-btn--secondary" onClick={restart}>{t("freeSaju.restart")}</button>
    </div>;
  };

  return <GuidedFlowShell className={tarot.embedded} flow={flow} labels={labels} titles={titles} landing={landing} renderStep={renderStep} ctaLabels={BIRTH ? guidedBirthCtaLabels(t) : undefined} />;
}
