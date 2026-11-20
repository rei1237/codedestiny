"use client";

// /tarot/healing/ 태양 힐링 타로 4장 — 공통 스텝 플로우 판(3c-A1, 2026-11-20 승인). 롤백은 lib/guided-flow/flags.mjs.
// 랜딩 → 셔플(대기 1.2s, 그동안 카드 뽑기·엔진 미리 계산) → 펼치기(500ms 뒤 350ms 간격, 800ms 뒤집기) → 읽는 중(엔진 대기) → 결과.
// 🔴 원본(SunHealingTarot.tsx)과 같은 것: 뽑기(drawHealingCards), 브라우저 결정론 엔진(computeSunHealingReading),
// 결과 본문(SunHealingResultBody — AI 프롬프트 패널 마커 포함), 공유(shareSunHealingReading). 저장 기록은 원본처럼 없다.
// 결과 본문의 Tailwind 클래스는 SunHealingTarot.tsx 안에 그대로 둔다(apps/toss 가 그 파일 원문으로 CSS 를 만든다).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GuidedFlowShell, GuidedLanding } from "@/app/components/guided-flow/GuidedFlowShell";
import { type GuidedStep, useGuidedFlow } from "@/app/components/guided-flow/useGuidedFlow";
import { useGuidedT } from "@/app/components/guided-flow/useGuidedT";
import tarot from "@/app/components/guided-flow/guided-tarot.module.css";
import { historyStateFor, snapshotKey, urlWithStep } from "@/lib/guided-flow/step-controller.mjs";
import { SHELL_HOME_PATH } from "@/lib/navigation/shellHome";
import { useSunHealingTarotCopy } from "./_lib/sun-healing-tarot-copy";
import { computeSunHealingReading, loadSunHealingEngine } from "./_lib/sun-healing-local-reading";
import {
  type HealingReadingDto,
  type ReadingFetchResult,
  type TarotCardDto,
  SPREAD_CARD_COUNT,
  SunHealingResultBody,
  cardImageUrl,
  drawHealingCards,
  safeCardTitle,
  shareSunHealingReading,
} from "./SunHealingTarot";

const FLOW_ID = "sun-healing-four";
const STEPS: GuidedStep[] = [
  // 셔플·읽는 중은 URL 에 남기지 않는다. 새로고침하면 뽑은 카드가 없으므로 랜딩부터(원본도 저장하지 않는다).
  { id: "shuffle", kind: "wait", history: "none", transient: true, restoreTo: "reveal" },
  { id: "reveal", kind: "input" },
  { id: "reading", kind: "wait", history: "none", transient: true, restoreTo: "result", awaitWork: true },
  { id: "result", kind: "result" },
];
const AUTO_MS = 450, FIRST_FLIP_MS = 500, FLIP_GAP_MS = 350, FLIP_MS = 800;

async function requestReading(cards: TarotCardDto[]): Promise<ReadingFetchResult> {
  // 무료 기능: 원본과 같이 결정론 엔진을 브라우저에서 계산한다.
  const { reading, highlights } = await computeSunHealingReading<HealingReadingDto>(cards);
  if (reading) reading.consultingHighlights = highlights;
  return { reading, highlights };
}

export default function SunHealingTarotGuided() {
  const [ready, setReady] = useState(false);
  const initialized = useRef(false);
  // 뽑은 카드는 저장하지 않으므로 새로고침·외부 진입은 언제나 랜딩에서 시작한다.
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    try { window.sessionStorage.removeItem(snapshotKey(FLOW_ID)); } catch { /* 세션 저장 불가 */ }
    window.history.replaceState(historyStateFor(FLOW_ID, null, 0), "", urlWithStep(window.location.href, null));
    setReady(true);
  }, []);
  return ready ? <HealingFlow /> : null;
}

function HealingFlow() {
  const t = useGuidedT();
  const copy = useSunHealingTarotCopy();
  const flow = useGuidedFlow({ steps: STEPS, featureId: "healing_tarot", surface: "tarot_healing", flowId: FLOW_ID });
  const { controller, state, step } = flow;
  const reduced = state.reducedMotion;
  const [cards, setCards] = useState<TarotCardDto[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [result, setResult] = useState<ReadingFetchResult | null>(null);
  const [failed, setFailed] = useState(false);
  const pending = useRef<Promise<ReadingFetchResult> | null>(null);

  const draw = useCallback(() => {
    loadSunHealingEngine().catch(() => {});
    const drawn = drawHealingCards();
    setCards(drawn); setRevealed(0); setResult(null); setFailed(false);
    const prefetch = requestReading(drawn);
    prefetch.catch(() => {});
    pending.current = prefetch;
    return drawn;
  }, []);

  const loadReading = useCallback(async (drawn: TarotCardDto[]) => {
    setFailed(false);
    const prefetch = pending.current;
    pending.current = null;
    try {
      let next: ReadingFetchResult;
      try { next = prefetch ? await prefetch : await requestReading(drawn); } catch { next = await requestReading(drawn); }
      if (!next.reading) throw new Error("empty healing reading");
      setResult(next);
    } catch (error) {
      console.error(error);
      setFailed(true);
    }
  }, []);

  const stepId = step?.id;
  // 읽는 중: 미리 계산한 결과를 기다렸다가 결과로. 실패하면 대기를 끝내지 않고 다시 시도를 보여 준다.
  useEffect(() => {
    if (stepId !== "reading" || cards.length !== SPREAD_CARD_COUNT) return;
    if (result) { controller.workDone(); return; }
    if (!failed) void loadReading(cards);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId, result]);

  // 결과가 없는데 결과·펼치기 단계에 있으면(뒤로/앞으로 등) 랜딩으로 돌린다.
  useEffect(() => {
    if ((stepId === "result" && !result) || (stepId === "reveal" && cards.length !== SPREAD_CARD_COUNT)) controller.goTo(null);
  }, [stepId, result, cards.length, controller]);

  const begin = useCallback(() => { draw(); flow.start(); }, [draw, flow]);
  const reread = useCallback(() => { draw(); controller.goTo("shuffle"); }, [draw, controller]);
  const share = useCallback(
    () => shareSunHealingReading({ reading: result?.reading ?? null, highlights: result?.highlights ?? [], copy }),
    [copy, result],
  );

  const labels = useMemo(() => ({
    back: t("back"), next: t("next"), skip: t("skip"),
    progress: (current: number, total: number) => t("progress", { current, total }),
    slowLine: t("slowLine"),
  }), [t]);
  const titles = {
    shuffle: t("healingTarot.shuffleTitle"), reveal: t("healingTarot.revealTitle"),
    reading: t("healingTarot.readingTitle"), result: t("healingTarot.resultTitle"),
  };

  const landing = (
    <GuidedLanding
      titleAs="h2"
      eyebrow={t("healingTarot.eyebrow")}
      title={t("healingTarot.title")}
      subtitle={t("healingTarot.subtitle")}
      ctaLabel={t("healingTarot.cta")}
      onStart={begin}
      freeHint={t("healingTarot.freeHint")}
      aboutTitle={t("healingTarot.aboutTitle")}
      aboutBody={t("healingTarot.aboutBody")}
      guideTitle={t("healingTarot.guideTitle")}
      guideSteps={[1, 2, 3].map((n) => ({ title: t(`healingTarot.guide${n}Title`), body: t(`healingTarot.guide${n}Body`) }))}
    />
  );

  return (
    <GuidedFlowShell
      className={tarot.embedded}
      flow={flow}
      labels={labels}
      titles={titles}
      landing={landing}
      renderStep={(current) => {
        if (current.id === "shuffle") {
          return <div className={tarot.deck} aria-hidden="true"><span className={tarot.deckCard} /><span className={tarot.deckCard} /><span className={tarot.deckCard} /></div>;
        }
        if (current.id === "reveal") {
          return <RevealStep cards={cards} revealed={revealed} setRevealed={setRevealed} reduced={reduced} positions={copy.positionLabels} copy={copy}
            answer={(value) => controller.setAnswer(value)} next={() => controller.next("auto")} hint={t("healingTarot.revealHint")} />;
        }
        if (current.id === "reading") {
          return failed ? (
            <div className={tarot.actions}>
              <p className={tarot.error} role="alert">{copy.fetchErrorAlert}</p>
              <button type="button" className={tarot.actionButton} onClick={() => void loadReading(cards)}>{t("healingTarot.retry")}</button>
            </div>
          ) : <Spread cards={cards} open={SPREAD_CARD_COUNT} positions={copy.positionLabels} copy={copy} />;
        }
        if (current.id === "result" && result?.reading) {
          const reading = result.reading;
          const sunLine = String(reading.oneLineMessage || reading.sunLine || reading.summary || "").trim();
          return (
            <div className={tarot.result}>
              <div className={tarot.verdict}><small>{copy.todayLineLabel}</small><p>{sunLine}</p></div>
              <p className={tarot.note}>{reading.subtitle || copy.resultSubtitleFallback}</p>
              <div className={tarot.paperBody}><SunHealingResultBody reading={reading} cards={cards} copy={copy} /></div>
              <div className={tarot.actions}>
                <button type="button" className={tarot.actionButton} onClick={() => void share()}>{copy.shareButton}</button>
                <button type="button" className={tarot.actionButton} onClick={reread}>{copy.rereadButton}</button>
                <a className={tarot.paidLink} href={SHELL_HOME_PATH}>{copy.otherFortuneButton}</a>
              </div>
            </div>
          );
        }
        return null;
      }}
    />
  );
}

type Copy = ReturnType<typeof useSunHealingTarotCopy>;

function Spread({ cards, open, positions, copy, onTap }: { cards: TarotCardDto[]; open: number; positions: readonly string[]; copy: Copy; onTap?: () => void }) {
  return (
    <div className={tarot.spread} data-count={SPREAD_CARD_COUNT}>
      {positions.map((position, index) => {
        const card = cards[index];
        const isOpen = index < open;
        const name = card ? safeCardTitle(copy, card, index) : "";
        return (
          <figure key={position} className={tarot.slot}>
            <figcaption className={tarot.slotLabel}>{index + 1}. {position}</figcaption>
            <button type="button" className={tarot.flip} data-open={isOpen} aria-label={isOpen ? `${index + 1}. ${position}: ${name}` : `${index + 1}. ${position}`} onClick={onTap} disabled={!onTap}>
              <span className={tarot.flipInner}>
                <span className={tarot.flipBack} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <span className={tarot.flipFace}>{card?.cardId ? <img src={cardImageUrl(card)} alt="" width={240} height={320} decoding="async" /> : null}</span>
              </span>
            </button>
            <strong className={tarot.slotName}>{isOpen ? name : ""}</strong>
          </figure>
        );
      })}
    </div>
  );
}

function RevealStep({ cards, revealed, setRevealed, reduced, positions, copy, answer, next, hint }: {
  cards: TarotCardDto[]; revealed: number; setRevealed: (value: number | ((v: number) => number)) => void; reduced: boolean;
  positions: readonly string[]; copy: Copy; answer: (value: string) => void; next: () => void; hint: string;
}) {
  const timers = useRef<number[]>([]);
  const clear = () => { timers.current.forEach(window.clearTimeout); timers.current = []; };
  const all = String(SPREAD_CARD_COUNT);
  const revealAll = (withAuto: boolean) => {
    clear();
    setRevealed(SPREAD_CARD_COUNT);
    answer(all);
    if (withAuto) timers.current.push(window.setTimeout(next, FLIP_MS + AUTO_MS));
  };
  // 들어오면 남은 카드를 자리 순서대로 뒤집는다(첫 장 500ms, 350ms 간격, 800ms 뒤집기). 다 열리면 잠깐 보여 준 뒤 넘어간다.
  useEffect(() => {
    if (revealed >= SPREAD_CARD_COUNT) { answer(all); return; }
    answer("");
    if (reduced) { revealAll(false); return clear; }
    const remaining = SPREAD_CARD_COUNT - revealed;
    for (let i = 0; i < remaining; i += 1) {
      timers.current.push(window.setTimeout(() => {
        setRevealed((v) => Math.min(SPREAD_CARD_COUNT, v + 1));
        if (i === remaining - 1) answer(all);
      }, FIRST_FLIP_MS + i * FLIP_GAP_MS));
    }
    timers.current.push(window.setTimeout(next, FIRST_FLIP_MS + (remaining - 1) * FLIP_GAP_MS + FLIP_MS + AUTO_MS));
    return clear;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <Spread cards={cards} open={revealed} positions={positions} copy={copy} onTap={revealed < SPREAD_CARD_COUNT ? () => revealAll(!reduced) : undefined} />
      {revealed < SPREAD_CARD_COUNT ? <p className={tarot.hint}>{hint}</p> : null}
    </>
  );
}
