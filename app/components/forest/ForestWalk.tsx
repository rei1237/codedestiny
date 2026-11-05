"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
import Link from "next/link";
import DiaryMoodPicker from "@/app/diary/_components/DiaryMoodPicker";
import DiaryRecordCard from "@/app/diary/_components/DiaryRecordCard";
import { trackEvent } from "@/lib/analytics";
import { nextCardPageIndex } from "../home-card-swipe.mjs";
import { dailyLine } from "./forest-progress.mjs";
import type { DailyJourney } from "./useDailyJourney";
import { ForestLines, GrowthCard, LanternRow } from "./ForestParts";
import styles from "./forest.module.css";

const STEPS = [
  { id: "lantern", label: "등불", scene: "step-lantern", alt: "연이가 작은 등불에 불을 옮기는 숲길" },
  { id: "path", label: "오솔길", scene: "step-path", alt: "영냥이가 앞장서는 이끼 낀 오솔길" },
  { id: "spring", label: "샘터", scene: "step-spring", alt: "반딧불이 내려앉은 고요한 샘터" },
  { id: "map", label: "숲 지도", scene: "walk-done", alt: "등불이 이어진 숲길 끝에서 쉬고 있는 연이와 영냥이" },
] as const;
const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

export interface ForestWalkProps {
  mode: "dialog" | "inline";
  journey: DailyJourney;
  initialStep?: number;
  onStepChange?: (step: number) => void;
  onClose?: () => void;
}

function Panel({ index, step, line, children, panelRef }: { index: number; step: number; line: { yeoni: string; yeongnyangi: string }; children: ReactNode; panelRef?: (node: HTMLDivElement | null) => void }) {
  const info = STEPS[index];
  return <div ref={panelRef} tabIndex={-1} className={styles.panel} hidden={step !== index}>
    <picture className={styles.scene}>
      <source type="image/avif" srcSet={`/images/home/forest/${info.scene}.avif`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/images/home/forest/${info.scene}.webp`} width="1536" height="1024" alt={info.alt} loading="lazy" decoding="async" />
    </picture>
    <ForestLines line={line} />
    {children}
  </div>;
}

/** 세 걸음(등불·오솔길·샘터)과 숲 지도. 걸음은 잠그지 않고 패널은 초안 보존을 위해 항상 마운트해 둔다. */
export default function ForestWalk({ mode, journey, initialStep = 0, onStepChange, onClose }: ForestWalkProps) {
  const { surface, hydrated, ymd, entry, status, honey, products, busy, message, quest, picked, savedAction, attended, questDone, hasRecord, stepsDone, weekMap } = journey;
  const [step, setStep] = useState(initialStep);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const firstRender = useRef(true);

  useEffect(() => { setStep(initialStep); }, [initialStep]);
  useEffect(() => {
    if (mode !== "dialog") return;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => { root.style.overflow = previous; };
  }, [mode]);
  useEffect(() => {
    if (mode !== "inline") return;
    const openLinked = () => {
      if (window.location.hash === "#diary-today-record") setStep(2);
      else if (window.location.hash === "#daily-home-title") setStep(0);
    };
    openLinked();
    window.addEventListener("hashchange", openLinked);
    return () => window.removeEventListener("hashchange", openLinked);
  }, [mode]);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    onStepChange?.(step);
    if (bodyRef.current && mode === "dialog") bodyRef.current.scrollTop = 0;
    panelRefs.current[step]?.focus({ preventScroll: mode === "dialog" });
  }, [mode, onStepChange, step]);

  const setPanelRef = useCallback((index: number) => (node: HTMLDivElement | null) => { panelRefs.current[index] = node; }, []);

  function startSwipe(event: TouchEvent<HTMLElement>) {
    const target = event.target;
    if (target instanceof Element && target.closest("button, a, input, textarea, select, summary")) { swipeStart.current = null; return; }
    const touch = event.touches[0];
    swipeStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }
  function endSwipe(event: TouchEvent<HTMLElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch) return;
    setStep(current => nextCardPageIndex(current, STEPS.length, touch.clientX - start.x, touch.clientY - start.y));
  }

  const stepDone = [attended, questDone, hasRecord, stepsDone >= 3];
  const loginHref = surface === "home" ? "/login/?next=%2F%23daily-home-title" : "/login/?next=%2Fdiary%2F%23daily-home-title";
  const nextButton = (label: string, target: number) => <button type="button" className={styles.secondary} onClick={() => setStep(target)}>{label}</button>;

  const content = <div className={styles.walk} data-mode={mode}>
    <header className={styles.walkHead}>
      {mode === "inline" ? <h2 id="daily-home-title">오늘의 숲길</h2> : <h2 id="forest-walk-title">오늘의 숲길</h2>}
      {mode === "dialog" && <button type="button" className={styles.close} onClick={onClose}>닫기</button>}
      <nav className={styles.steps} aria-label="숲길 걸음">
        {STEPS.map((item, index) => <button key={item.id} type="button" aria-current={step === index ? "step" : undefined} data-done={stepDone[index] || undefined} onClick={() => setStep(index)}><span>{item.label}</span>{stepDone[index] && <small>완료</small>}</button>)}
      </nav>
    </header>
    <div ref={bodyRef} className={styles.walkBody} onTouchStart={startSwipe} onTouchEnd={endSwipe} onTouchCancel={() => { swipeStart.current = null; }}>
      <Panel index={0} step={step} line={dailyLine(ymd, "lantern")} panelRef={setPanelRef(0)}>
        <div className={styles.block}>
          <h3>첫 걸음, 등불 켜기</h3>
          {honey && <LanternRow honey={honey} />}
          {honey && <p className={styles.note}>{honey.streakEvery}일 연속이면 꿀단지에서 추가 {honey.streakBonus}방울을 받아요. 다음 보너스까지 {honey.nextBonusIn}일 남았어요.</p>}
          <div className={styles.wallet}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/fortune-tea-house/honey-drop-jewel-96-v1.webp" width="96" height="96" alt="" loading="lazy" decoding="async" />
            <span>나의 꿀방울<strong>{status === "ready" && honey ? `${honey.balance}방울` : "확인해 주세요"}</strong></span>
          </div>
          {status === "ready" && honey
            ? <button type="button" className={styles.primary} disabled={busy || honey.attended} onClick={journey.attend}>{busy ? "등불 켜는 중" : honey.attended ? "오늘의 등불을 켰어요" : "오늘 등불 켜기"}</button>
            : status === "guest"
              ? <Link className={styles.primary} href={loginHref}>로그인하고 등불 켜기</Link>
              : status === "error"
                ? <button type="button" className={styles.primary} onClick={journey.retry}>다시 확인하기</button>
                : <p className={styles.note}>출석 정보 확인 중</p>}
          <p className={styles.note}>{honey?.attendanceEvery === 1 ? "하루 한 번 출석하면 1방울을 받아요." : "출석으로 꿀방울을 모아보세요."}</p>
          {status === "guest" && <p className={styles.note}>로그인하지 않아도 오솔길과 샘터는 걸을 수 있어요.</p>}
          {message && <p className={styles.notice} role="status">{message}</p>}
          <details className={styles.rewards}>
            <summary>꿀방울은 어디에 쓰나요?</summary>
            <p>출석해 꿀방울을 모아요. 하루를 놓치면 연속 출석은 다시 시작해요.</p>
            {products.length > 0 && <><strong>이런 곳에서 사용할 수 있어요</strong><ul>{products.map(item => <li key={item.productId}>{item.title} <b>{item.honeyCost}방울</b></li>)}</ul></>}
            <p>{honey && <>운세 프롬프트 1회에는 {honey.promptCost}방울이 필요해요. </>}사용 가능한 상품과 필요 방울 수는 각 상품에서 확인해 주세요.</p>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/ggulggul/?action=cdOpenAllFortunes">꿀꿀 운세 살펴보기</a>
          </details>
        </div>
        <GrowthCard journey={journey} />
        {nextButton("오솔길로 가기", 1)}
      </Panel>

      <Panel index={1} step={step} line={dailyLine(ymd, "path")} panelRef={setPanelRef(1)}>
        <div className={styles.block}>
          <h3>둘째 걸음, 작은 실천</h3>
          <p className={styles.questName}>{quest ? quest.text : picked?.action.name || "오늘의 행동을 고르고 있어요"}</p>
          <p className={styles.note}>{quest ? savedAction?.tip || "오늘 고른 작은 행동을 실천해 보세요." : picked?.action.tip || "잠시만 기다려 주세요."}</p>
          {quest
            ? <button type="button" className={styles.primary} aria-pressed={Boolean(quest.done)} onClick={journey.toggleQuest}>{quest.done ? "완료 · 되돌리기" : "실천 완료하기"}</button>
            : <div className={styles.row}>
                <button type="button" className={styles.primary} disabled={!picked} onClick={journey.selectQuest}>실천으로 담기</button>
                <button type="button" className={styles.secondary} disabled={!picked} onClick={journey.rerollQuest}>다른 행동</button>
              </div>}
          <p className={styles.note}>일상을 돌보는 작은 제안이에요. 꿀방울은 지급되지 않으며, 로그인 시 기존 성장 규칙에 따라 경험치를 쌓을 수 있어요.</p>
        </div>
        <GrowthCard journey={journey} />
        {nextButton("샘터로 가기", 2)}
      </Panel>

      <Panel index={2} step={step} line={dailyLine(ymd, "spring")} panelRef={setPanelRef(2)}>
        <div className={styles.paper}>
          <h3>셋째 걸음, 오늘의 마음</h3>
          <DiaryMoodPicker ymd={ymd} mood={entry?.moodEmoji || ""} label="오늘의 기분" />
          <DiaryRecordCard embedded />
          <p className={styles.paperNote}>기록은 이 기기의 브라우저에 저장돼요.</p>
          {surface === "home" && <Link href="/diary/" className={styles.paperLink} onClick={() => trackEvent("daily_home_diary_opened", { surface })}>다이어리 더 보기 <span aria-hidden="true">→</span></Link>}
        </div>
        {nextButton("숲 지도 보기", 3)}
      </Panel>

      <Panel index={3} step={step} line={dailyLine(ymd, stepsDone >= 3 ? "done" : "map")} panelRef={setPanelRef(3)}>
        <div className={styles.block}>
          <h3>{stepsDone >= 3 ? "오늘의 숲길을 다 걸었어요" : `오늘 ${hydrated ? stepsDone : 0}걸음 걸었어요`}</h3>
          <ol className={styles.map} aria-label="이번 주 숲 지도">
            {weekMap.map((day: { ymd: string; piece: { id: string; name: string }; isToday: boolean; filled: boolean }, index: number) => <li key={day.ymd} data-filled={day.filled || undefined} data-today={day.isToday || undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/images/home/forest/piece-${day.piece.id}.webp`} width="128" height="128" alt={`${day.piece.name} ${day.filled ? "모음" : "아직 없음"}`} loading="lazy" decoding="async" />
              <small>{WEEKDAYS[index]}</small>
            </li>)}
          </ol>
          <p className={styles.note}>작은 실천과 기록을 함께 남긴 날, 그 요일의 숲 조각이 채워져요. 숲 조각은 간직하는 기념품이라 꿀방울이나 상품으로 바꿀 수 없어요.</p>
        </div>
        {mode === "dialog" && <button type="button" className={styles.primary} onClick={onClose}>숲길 나오기</button>}
      </Panel>
    </div>
  </div>;

  if (mode === "inline") return <section className={styles.inlineRoot} aria-labelledby="daily-home-title">{content}</section>;
  return <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="forest-walk-title" onClose={onClose}>{content}</dialog>;
}
