"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { trackEvent } from "@/lib/analytics";
import { dailyLine, litLanternCount } from "./forest-progress.mjs";
import { useDailyJourney } from "./useDailyJourney";
import { ForestLines, GrowthCard } from "./ForestParts";
import styles from "./forest.module.css";

const ForestWalk = dynamic(() => import("./ForestWalk"), { ssr: false });

const FOREST_HASH = "#forest-walk";
const LINK_HASH_STEPS: Record<string, number> = { "#daily-home-title": 0, "#diary-today-record": 2 };

/**
 * 공개 홈의 숲 입구. 전체 화면 숲길은 눌렀을 때 불러온다.
 * 🔴 전체 화면은 `#forest-walk` 기록을 하나 쌓아 뒤로가기로 닫힌다. 외부 링크로 들어온 해시는
 * 먼저 지운 뒤 쌓는다. 안 그러면 닫을 때 그 해시로 돌아가 숲길이 다시 열린다.
 */
export default function ForestGate() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [initialStep, setInitialStep] = useState(0);
  const journey = useDailyJourney({ surface: "home", enabled });
  const sectionRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const closing = useRef(false);

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
    closing.current = false;
    setEnabled(true);
    setInitialStep(step);
    setOpen(true);
  }, []);
  const pushWalk = useCallback((step: number) => {
    window.history.pushState({ forestWalk: { step } }, "", FOREST_HASH);
    showWalk(step);
  }, [showWalk]);

  useEffect(() => {
    const syncFromLocation = () => {
      const { hash, pathname, search } = window.location;
      if (hash === FOREST_HASH && window.history.state?.forestWalk) { showWalk(Number(window.history.state.forestWalk.step) || 0); return; }
      if (hash === FOREST_HASH || hash in LINK_HASH_STEPS) {
        window.history.replaceState(window.history.state, "", `${pathname}${search}`);
        pushWalk(LINK_HASH_STEPS[hash] ?? 0);
        return;
      }
      closing.current = false;
      setOpen(false);
    };
    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    window.addEventListener("hashchange", syncFromLocation);
    return () => {
      window.removeEventListener("popstate", syncFromLocation);
      window.removeEventListener("hashchange", syncFromLocation);
    };
  }, [pushWalk, showWalk]);

  useEffect(() => {
    if (wasOpen.current && !open) ctaRef.current?.focus({ preventScroll: true });
    wasOpen.current = open;
  }, [open]);

  const closeWalk = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setOpen(false);
    if (window.location.hash === FOREST_HASH) window.history.back();
  }, []);
  const rememberStep = useCallback((step: number) => {
    if (window.location.hash !== FOREST_HASH) return;
    window.history.replaceState({ ...window.history.state, forestWalk: { step } }, "", FOREST_HASH);
  }, []);
  function enterForest() {
    trackEvent("daily_home_forest_opened", { surface: "home" });
    pushWalk(0);
  }

  const { hydrated, honey, stepsDone, ymd } = journey;
  const lit = honey ? litLanternCount(honey.streak, honey.streakEvery, honey.attended) : 0;
  return <section ref={sectionRef} className={styles.gate} aria-labelledby="daily-home-title">
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
      <ul className={styles.gateStats}>
        <li><span>오늘 걸음</span><strong>{hydrated ? `${stepsDone} / 3` : "세 걸음"}</strong></li>
        <li><span>켜진 등불</span><strong>{honey ? `${lit} / ${honey.streakEvery}` : "로그인 후 확인"}</strong></li>
      </ul>
      <GrowthCard journey={journey} />
      <button ref={ctaRef} type="button" className={styles.primary} aria-haspopup="dialog" onClick={enterForest}>{stepsDone >= 3 ? "오늘의 숲길 다시 보기" : stepsDone > 0 ? "숲길 이어 걷기" : "숲길 들어가기"}</button>
    </div>
    {open && <ForestWalk mode="dialog" journey={journey} initialStep={initialStep} onStepChange={rememberStep} onClose={closeWalk} />}
  </section>;
}
