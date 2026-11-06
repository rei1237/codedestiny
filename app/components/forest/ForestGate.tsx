"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { trackEvent } from "@/lib/analytics";
import { dailyLine, litLanternCount } from "./forest-progress.mjs";
import { useDailyJourney } from "./useDailyJourney";
import HomeDisclosure from "../HomeDisclosure";
import { ForestLines, GrowthCard } from "./ForestParts";
import styles from "./forest.module.css";

const ForestWalk = dynamic(() => import("./ForestWalk"), { ssr: false });

// 로그인 복귀(`/login/?next=/#daily-home-title`)만 숲길을 바로 연다. 페이지에 없는 해시는 `LegacyHomeEntry`가 앱으로 보낸다.
const LOGIN_RETURN_HASH = "#daily-home-title";
const RESUME_STEP_KEY = "cd.forest-walk.step";

function rememberResumeStep(step: number | null) {
  try {
    if (step === null) window.sessionStorage.removeItem(RESUME_STEP_KEY);
    else window.sessionStorage.setItem(RESUME_STEP_KEY, String(step));
  } catch { /* 저장소가 막혀도 숲길은 그대로 걷는다 */ }
}

/** 새로고침일 때만 걷던 걸음으로 돌아간다. 다른 경로로 다시 들어오면 입구부터 보여 준다. */
function readResumeStep() {
  try {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navigation?.type !== "reload") return null;
    const raw = window.sessionStorage.getItem(RESUME_STEP_KEY);
    const step = raw === null ? Number.NaN : Number(raw);
    return Number.isInteger(step) && step >= 0 && step <= 3 ? step : null;
  } catch {
    return null;
  }
}

/**
 * 공개 홈의 숲 입구. 전체 화면 숲길은 눌렀을 때 불러온다.
 * 🔴 뒤로가기는 `NavigationProvider`가 `dialog[open]`에 넣는 공용 가드가 처리한다. 여기서 기록을
 * 따로 쌓으면 가드가 그 상태를 복사해 닫아도 다시 열리므로, 들어온 해시는 지우기만 한다.
 */
export default function ForestGate() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [initialStep, setInitialStep] = useState(0);
  const journey = useDailyJourney({ surface: "home", enabled });
  const sectionRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === "undefined") { setEnabled(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setEnabled(true); observer.disconnect(); }
    }, { rootMargin: "200px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const showWalk = useCallback((step: number) => {
    setEnabled(true);
    setInitialStep(step);
    setOpen(true);
    rememberResumeStep(step);
  }, []);

  useEffect(() => {
    const openFromLink = () => {
      const { hash, pathname, search } = window.location;
      if (hash !== LOGIN_RETURN_HASH) return false;
      window.history.replaceState(window.history.state, "", `${pathname}${search}`);
      showWalk(0);
      return true;
    };
    if (!openFromLink()) {
      const resumeStep = readResumeStep();
      if (resumeStep !== null) showWalk(resumeStep);
    }
    window.addEventListener("hashchange", openFromLink);
    return () => {
      window.removeEventListener("hashchange", openFromLink);
      rememberResumeStep(null);
    };
  }, [showWalk]);

  useEffect(() => {
    if (wasOpen.current && !open) ctaRef.current?.focus({ preventScroll: true });
    wasOpen.current = open;
  }, [open]);

  const closeWalk = useCallback(() => {
    setOpen(false);
    rememberResumeStep(null);
  }, []);
  function enterForest() {
    trackEvent("daily_home_forest_opened", { surface: "home" });
    showWalk(0);
  }

  const { hydrated, honey, status, stepsDone, ymd } = journey;
  const lit = honey ? litLanternCount(honey.streak, honey.streakEvery, honey.attended) : 0;
  return <section id="homeForest" ref={sectionRef} className={styles.gate} aria-labelledby="daily-home-title">
    <div className={styles.gateScene}>
      <picture>
        <source media="(max-width: 600px)" type="image/avif" srcSet="/images/home/forest/gate-mobile.avif" />
        <source media="(max-width: 600px)" type="image/webp" srcSet="/images/home/forest/gate-mobile.webp" />
        <source type="image/avif" srcSet="/images/home/forest/gate-wide.avif" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/home/forest/gate-wide.webp" width="1536" height="1024" alt="거대한 고목 뿌리 아래로 이끼 길이 이어지고, 연이가 등불을 들고 돌아보며 영냥이가 길을 가리키는 숲 입구" loading="lazy" decoding="async" />
      </picture>
      <div className={styles.gateHead}>
        <p>연이와 영냥이가 기다리는 곳</p>
        <h2 id="daily-home-title">오늘의 숲길</h2>
      </div>
    </div>
    <div className={styles.gateBody}>
      <ForestLines line={dailyLine(ymd, stepsDone >= 3 ? "done" : "gate")} />
      <HomeDisclosure className={styles.progress} label="오늘의 걸음과 성장 기록">
      <ul className={styles.gateStats}>
        <li><span>오늘 걸음</span><strong>{hydrated ? `${stepsDone} / 3` : "세 걸음"}</strong></li>
        <li><span>켜진 등불</span><strong>{honey ? `${lit} / ${honey.streakEvery}` : status === "guest" ? "로그인 후 확인" : status === "error" ? "확인하지 못했어요" : "확인 중"}</strong></li>
      </ul>
      <GrowthCard journey={journey} />
      </HomeDisclosure>
      <button ref={ctaRef} type="button" className={styles.primary} aria-haspopup="dialog" onClick={enterForest}>{stepsDone >= 3 ? "오늘의 숲길 다시 보기" : stepsDone > 0 ? "숲길 이어 걷기" : "숲길 들어가기"}</button>
    </div>
    {open && <ForestWalk mode="dialog" journey={journey} initialStep={initialStep} onStepChange={rememberResumeStep} onClose={closeWalk} />}
  </section>;
}
