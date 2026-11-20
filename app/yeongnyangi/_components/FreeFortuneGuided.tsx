"use client";

// /yeongnyangi/room/ 영냥이 출석 운세 16종 — 공통 스텝 플로우 판(3c-A5). 롤백은 lib/guided-flow/flags.mjs 의 GUIDED_YN_FREE_FORTUNE_ENABLED.
// 랜딩 → 16종 중 하나 → 질문(선택, 분야 단서·출생 분야는 프로필 필요) → 읽는 중 → 결과.
// 🔴 출석·멸치·열기(출석 게이트)는 원본(FreeFortune)이 그대로 맡고, 이 판은 16종이 열린 로그인 사용자에게만 그려진다.
// 값의 정본은 원본 상태다: 고른 분야는 onCategory(원본 setCategory), 질문은 onDraft(원본 setDraft), 읽기는 원본 read(run) 1회.
// 결과 단계에서는 원본이 자기 상자 안에 원본 Reading(또는 시간 질문 상담)을 그대로 그리고, 여기에는 다음 행동만 둔다.
import { useEffect, useMemo, useRef } from "react";
import { GuidedChoiceList, GuidedFlowShell, GuidedLanding } from "@/app/components/guided-flow/GuidedFlowShell";
import { type GuidedStep, useGuidedFlow } from "@/app/components/guided-flow/useGuidedFlow";
import { useGuidedT } from "@/app/components/guided-flow/useGuidedT";
import gf from "@/app/components/guided-flow/guided-flow.module.css";
import tarot from "@/app/components/guided-flow/guided-tarot.module.css";
import { historyStateFor, readHistoryState, urlWithStep } from "@/lib/guided-flow/step-controller.mjs";
import css from "./FreeFortuneGuided.module.css";

const FLOW_ID = "yn-free-fortune";
const STEPS: GuidedStep[] = [
  { id: "category", kind: "choice" },
  { id: "question", kind: "input" },
  { id: "reading", kind: "wait", history: "none", transient: true, restoreTo: "question", awaitWork: true },
  { id: "result", kind: "result", history: "replace" },
];
/** 질문 단계 답: 질문 글은 선택이라 '읽을 수 있음' 표시만 둔다(출생 분야인데 프로필이 없으면 비운다). 글 자체는 원본 draft 가 정본. */
const QUESTION_READY = "ready";

type Field = { id: string; label: string; placeholder?: string };

type Props = {
  categories: { id: string; label: string }[];
  /** 원본이 지금 고른 분야. */
  category: string;
  onCategory: (id: string) => void;
  /** 원본 분야 이름·소개(원본 데이터 그대로). */
  label: string;
  description: string;
  /** 원본 '질문 단서 더하기' 칸(최대 4개). */
  extra: Field[];
  /** 출생 정보로 읽는 분야. */
  isBirth: boolean;
  /** 출생 분야인데 프로필을 고르지 않았다(원본 버튼 비활성 조건). */
  needsProfile: boolean;
  draft: Record<string, string>;
  onDraft: (next: Record<string, string>) => void;
  /** 고른 분야의 오늘 읽기가 원본 상태에 있다. */
  hasReading: boolean;
  /** 시간 질문(horary): 원본처럼 질문 폼 없이 원본 상담 화면으로 간다. */
  isHorary: boolean;
  error: string;
  /** 원본 read. 결과를 받으면 true. */
  run: () => Promise<boolean>;
  onStepChange: (stepId: string | null) => void;
};

export default function FreeFortuneGuided({ categories, category, onCategory, label, description, extra, isBirth, needsProfile, draft, onDraft, hasReading, isHorary, error, run, onStepChange }: Props) {
  const t = useGuidedT();
  const flow = useGuidedFlow({ steps: STEPS, featureId: "yn_free_fortune", surface: "yeongnyangi_free", flowId: FLOW_ID });
  const { controller, state, step } = flow;
  const stepId = step?.id ?? null;
  const ran = useRef(false);
  const categoryAnswer = typeof state.answers.category === "string" ? state.answers.category : "";

  useEffect(() => { onStepChange(stepId); }, [stepId, onStepChange]);

  // 고른 분야 → 원본 분야(새로고침 복원 포함). 원본이 그 분야의 오늘 읽기를 불러온다.
  useEffect(() => { if (categoryAnswer && categoryAnswer !== category) onCategory(categoryAnswer); }, [categoryAnswer]); // eslint-disable-line react-hooks/exhaustive-deps

  // 질문 단계 진행 조건: 원본 버튼과 같다(출생 분야는 프로필 필요, 질문 글은 선택).
  useEffect(() => {
    if (stepId === "question") controller.setAnswer(needsProfile ? "" : QUESTION_READY);
  }, [stepId, needsProfile, controller]);

  // 앞으로 들어온 질문 단계: 오늘 이미 읽은 분야·시간 질문이면 원본처럼 질문 폼 없이 결과로.
  useEffect(() => {
    if (stepId !== "question" || state.direction !== "forward" || categoryAnswer !== category) return;
    if (isHorary || hasReading) controller.goTo("result");
  }, [stepId, state.direction, categoryAnswer, category, isHorary, hasReading, controller]);

  // 읽는 중: 원본 read 를 한 번 부른다. 실패하면(오류는 원본이 보여 준다) 질문으로 돌아간다.
  useEffect(() => {
    if (stepId !== "reading") { ran.current = false; return; }
    if (ran.current) return;
    ran.current = true;
    void run().then((ok) => {
      const now = controller.getState();
      if (now.index < 0 || STEPS[now.index].id !== "reading") return;
      if (ok) controller.workDone();
      else controller.goTo("question");
    });
  }, [stepId, run, controller]);

  const labels = useMemo(() => ({
    back: t("back"), next: t("next"), skip: t("skip"),
    progress: (current: number, total: number) => t("progress", { current, total }),
    slowLine: t("slowLine"),
  }), [t]);

  // 결과에서 앞 단계로: 셸은 뒤로 가는 이동을 URL 에 남기지 않으므로 지금 기록을 그 단계로 바꿔 둔다(새로고침해도 그 단계).
  const moveBackTo = (target: string) => {
    controller.goTo(target);
    const own = readHistoryState(window.history.state, FLOW_ID);
    window.history.replaceState(historyStateFor(FLOW_ID, target, own ? own.position : 0), "", urlWithStep(window.location.href, target));
  };
  // 다른 분야 고르기: 고른 답을 비우고 고르기 단계로(같은 칩을 눌러도 다시 고를 수 있게).
  const chooseAnother = () => {
    controller.mergeAnswers({ category: undefined });
    moveBackTo("category");
  };

  if (stepId === "result") {
    const empty = !hasReading && !isHorary;
    return <div className={css.slot}>
      <div className={css.after}>
        {empty ? <p>{t("ynFreeFortune.resultEmpty")}</p> : null}
        <div className={css.actions}>
          {empty ? <button type="button" className={css.action} onClick={() => moveBackTo("question")}>{t("ynFreeFortune.writeQuestion")}</button> : null}
          <button type="button" className={css.action} onClick={chooseAnother}>{t("ynFreeFortune.chooseAnother")}</button>
        </div>
      </div>
    </div>;
  }

  const titles = {
    category: t("ynFreeFortune.categoryTitle"), question: label,
    reading: t("ynFreeFortune.readingTitle"), result: label,
  };

  const landing = <GuidedLanding
    titleAs="h2"
    eyebrow={t("ynFreeFortune.eyebrow")}
    title={t("ynFreeFortune.title")}
    subtitle={t("ynFreeFortune.subtitle")}
    ctaLabel={t("ynFreeFortune.cta")}
    onStart={flow.start}
    freeHint={t("ynFreeFortune.freeHint")}
    aboutTitle={t("ynFreeFortune.aboutTitle")}
    aboutBody={t("ynFreeFortune.aboutBody")}
    guideTitle={t("ynFreeFortune.guideTitle")}
    guideSteps={[1, 2, 3].map((n) => ({ title: t(`ynFreeFortune.guide${n}Title`), body: t(`ynFreeFortune.guide${n}Body`) }))}
  />;

  const renderStep = (current: GuidedStep) => {
    if (current.id === "category") {
      return <div className={css.chips}>
        <GuidedChoiceList flow={flow} label={t("ynFreeFortune.categoryTitle")} options={categories.map((item) => ({ value: item.id, label: item.label }))} />
      </div>;
    }
    if (current.id === "question") return <>
      <p className={tarot.note}>{description}</p>
      {isBirth ? <p className={tarot.note}>{t("ynFreeFortune.birthPolicy")}</p> : null}
      <label className={tarot.note} htmlFor="yn-free-question">{t("ynFreeFortune.questionLabel")}</label>
      <textarea id="yn-free-question" name="question" className={gf.field} rows={3} maxLength={900} value={draft.question || ""}
        placeholder={t("ynFreeFortune.questionPlaceholder")} onChange={(event) => onDraft({ ...draft, question: event.target.value })} />
      {extra.length > 0 ? <details className={css.extra}>
        <summary>{t("ynFreeFortune.extraSummary")}</summary>
        {extra.map((field) => <div key={field.id} className={css.extra}>
          <label className={tarot.note} htmlFor={`yn-free-${field.id}`}>{field.label}</label>
          <input id={`yn-free-${field.id}`} className={gf.field} value={draft[field.id] || ""} maxLength={500} placeholder={field.placeholder}
            onChange={(event) => onDraft({ ...draft, [field.id]: event.target.value })} />
        </div>)}
      </details> : null}
      {needsProfile ? <p className={tarot.note} aria-live="polite">{t("ynFreeFortune.profileNeeded")}</p> : null}
      {error ? <p className={tarot.note}>{error}</p> : null}
      <p className={tarot.note}>{t("ynFreeFortune.keepNote")}</p>
    </>;
    return <p className={tarot.note} aria-live="polite">{t("ynFreeFortune.readingBody")}</p>;
  };

  return <div className={css.slot}>
    <GuidedFlowShell brand="yeongnyangi" className={tarot.embedded} flow={flow} labels={labels} titles={titles} landing={landing} renderStep={renderStep}
      ctaLabels={{ question: t("ynFreeFortune.readCta") }} />
  </div>;
}
