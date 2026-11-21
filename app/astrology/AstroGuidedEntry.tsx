"use client";

// /astrology/ 서양 점성술 출생 입력 — 공통 스텝 플로우판(R5, 2026-11-21 승인 "서양 점성술만 먼저"). 롤백은 lib/guided-flow/flags.mjs GUIDED_ASTRO_ENABLED.
// 같은 컴포넌트를 kind="sukuyo"(/sukuyo/, GUIDED_SUKUYO_ENABLED)·kind="vedic"(/vedic/, GUIDED_VEDIC_ENABLED)·kind="ziwei"(/ziwei/, GUIDED_ZIWEI_ENABLED)로도 쓴다(2026-11-21 "권장안으로 진행").
// 랜딩 → 이름 → 성별 → 생년월일 → 달력 → 시각(선택) → 장소(선택) → 확인 → 셸로 넘김.
// 🔴 결과(출생 차트·유료 심화 패널·이용권 판정)는 지금처럼 정적 셸 점성술 모달이 그린다. 이 화면은 입력만 받는다.
// 확인 뒤 입력을 셸 프로필 폼 초안으로 넘기고(lib/guided-flow/astro-draft.mjs) /ggulggul/?action=cdHomeAstroEntry 로 간다.
// 저장·동의·로그인은 셸의 기존 dpSaveProfile 그대로다. 여기서는 저장 프로필을 고르지 않는다(셸의 현재 프로필과 어긋나지 않게).
import { useCallback, useEffect, useMemo, useState } from "react";
import { GuidedFlowShell, GuidedLanding } from "@/app/components/guided-flow/GuidedFlowShell";
import { type GuidedStep, useGuidedFlow } from "@/app/components/guided-flow/useGuidedFlow";
import { useGuidedT } from "@/app/components/guided-flow/useGuidedT";
import gf from "@/app/components/guided-flow/guided-flow.module.css";
import tarot from "@/app/components/guided-flow/guided-tarot.module.css";
import { GuidedBirthStep, type GuidedBirthOptions, guidedBirthCtaLabels, guidedBirthTitles } from "@/app/components/guided-flow/birth/GuidedBirthSteps";
import { BIRTH_CONFIRM, birthSteps, isBirthField, readBirthAnswers } from "@/app/components/guided-flow/birth/birth-steps";
import { BIRTH_DRAFT_TARGETS, astroDraftProfile, writeBirthDraft } from "@/lib/guided-flow/astro-draft.mjs";

type GuidedBirthKind = "astro" | "sukuyo" | "vedic" | "ziwei";
// 셸 프로필 폼은 이름과 성별(여·남)을 받아야 저장된다 — 이름 필수, '밝히지 않을래요' 없음.
// 숙요점은 생년월일(달의 자리)만 쓰므로 장소를 묻지 않는다. 시각은 프로필용 선택 단계로 남긴다.
const KINDS: Record<GuidedBirthKind, { flowId: string; featureId: string; surface: string; fields: GuidedBirthOptions["fields"] }> = {
  astro: { flowId: "astro-birth-chart", featureId: "astrology", surface: "astrology_landing", fields: ["name", "gender", "date", "calendar", "time", "place"] },
  sukuyo: { flowId: "sukuyo-birth-entry", featureId: "sukuyo", surface: "sukuyo_landing", fields: ["name", "gender", "date", "calendar", "time"] },
  vedic: { flowId: "vedic-birth-entry", featureId: "vedic", surface: "vedic_landing", fields: ["name", "gender", "date", "calendar", "time", "place"] },
  // 자미두수 명반은 생년월일·시각만 쓴다(셸 자미 모달 입력과 같음). 장소 단계 없음.
  ziwei: { flowId: "ziwei-birth-entry", featureId: "ziwei", surface: "ziwei_landing", fields: ["name", "gender", "date", "calendar", "time"] },
};
function kindSetup(kind: GuidedBirthKind) {
  const options: GuidedBirthOptions = { idPrefix: kind, fields: KINDS[kind].fields, required: { name: true }, genderUnknown: false, profile: false };
  const steps: GuidedStep[] = [...birthSteps(options), { id: "open", kind: "result", history: "replace" }];
  return { options, steps };
}
const SETUPS = { astro: kindSetup("astro"), sukuyo: kindSetup("sukuyo"), vedic: kindSetup("vedic"), ziwei: kindSetup("ziwei") };

export default function AstroGuidedEntry({ kind = "astro" }: { kind?: GuidedBirthKind }) {
  const t = useGuidedT();
  const { options: BIRTH_OPTIONS, steps: STEPS } = SETUPS[kind];
  const target = BIRTH_DRAFT_TARGETS[kind];
  const meta = KINDS[kind];
  const flow = useGuidedFlow({ steps: STEPS, featureId: meta.featureId, surface: meta.surface, flowId: meta.flowId });
  const { controller, state, step } = flow;
  const [blocked, setBlocked] = useState(false);
  const stepId = step?.id;

  const handOff = useCallback(() => {
    const profile = astroDraftProfile(readBirthAnswers(controller.getState().answers as Record<string, unknown>));
    if (!profile) { controller.goTo("name"); return; }
    let storage: Storage | null = null;
    try { storage = window.sessionStorage; } catch { storage = null; }
    if (!writeBirthDraft(storage, target.key, profile)) { setBlocked(true); return; }
    window.location.assign(target.entry);
  }, [controller, target]);

  // 확인을 누르고 들어온 때만 바로 넘긴다. 새로고침·뒤로 가기로 돌아온 때는 버튼만 보인다(되돌이 방지).
  useEffect(() => {
    if (stepId !== "open" || (state.source !== "user" && state.source !== "auto")) return;
    handOff();
  }, [stepId, state.source, handOff]);

  const labels = useMemo(() => ({
    back: t("back"), next: t("next"), skip: t("skip"),
    progress: (current: number, total: number) => t("progress", { current, total }),
    slowLine: t("slowLine"),
  }), [t]);
  const titles = { ...guidedBirthTitles(t), open: t(`${kind}.openTitle`) };

  const landing = <GuidedLanding
    titleAs="h2"
    eyebrow={t(`${kind}.eyebrow`)}
    title={t(`${kind}.title`)}
    subtitle={t(`${kind}.subtitle`)}
    ctaLabel={t(`${kind}.cta`)}
    onStart={flow.start}
    freeHint={t(`${kind}.freeHint`)}
    aboutTitle={t(`${kind}.aboutTitle`)}
    aboutBody={t(`${kind}.aboutBody`)}
    guideTitle={t(`${kind}.guideTitle`)}
    guideSteps={[1, 2, 3].map((n) => ({ title: t(`${kind}.guide${n}Title`), body: t(`${kind}.guide${n}Body`) }))}
  />;

  const renderStep = (current: GuidedStep) => {
    if (isBirthField(current.id) || current.id === BIRTH_CONFIRM) return <GuidedBirthStep flow={flow} step={current} options={BIRTH_OPTIONS} />;
    return <div aria-live="polite">
      <p className={gf.reading}>{t(`${kind}.openBody`)}</p>
      {blocked ? <p className={tarot.note} role="alert">{t(`${kind}.storageBlocked`)}</p> : null}
      {blocked
        ? <a className="cd-btn cd-btn--secondary" href={target.entry}>{t(`${kind}.openFallback`)}</a>
        : <button type="button" className="cd-yehwa-button cd-yehwa-button--primary" onClick={handOff}>{t(`${kind}.openCta`)}</button>}
    </div>;
  };

  return <GuidedFlowShell className={tarot.embedded} flow={flow} labels={labels} titles={titles} landing={landing} renderStep={renderStep} ctaLabels={guidedBirthCtaLabels(t)} />;
}
