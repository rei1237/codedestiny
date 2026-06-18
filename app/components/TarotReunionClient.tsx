"use client";

import { useEffect } from "react";
import Script from "next/script";

declare global {
  interface Window {
    openTarotReunionModal?: () => void;
  }
}

const REUNION_STYLE_HREF = "/styles/tarot-reunion-lighthouse.css";

function ensureReunionStyleSheet() {
  if (typeof document === "undefined") return;
  const existed = document.querySelector('link[data-tarot-reunion-style="1"]');
  if (existed) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = REUNION_STYLE_HREF;
  link.setAttribute("data-tarot-reunion-style", "1");
  document.head.appendChild(link);
}

function openReunionExperienceWhenReady() {
  if (typeof window === "undefined") return;
  if (typeof window.openTarotReunionModal === "function") {
    window.openTarotReunionModal();
  }
}

export default function TarotReunionClient() {
  useEffect(() => {
    ensureReunionStyleSheet();
    openReunionExperienceWhenReady();

    const timer = window.setInterval(() => {
      if (typeof window.openTarotReunionModal === "function") {
        window.openTarotReunionModal();
        window.clearInterval(timer);
      }
    }, 150);

    return () => {
      window.clearInterval(timer);
      try {
        document.body.style.overflow = "";
      } catch (e) {
        // no-op
      }
    };
  }, []);

  return (
    <>
      <Script src="/js/tarot-reunion-experience.js?v=build-285876508574" strategy="afterInteractive" onLoad={openReunionExperienceWhenReady} />

      <div
        id="tarotReunionOverlay"
        className="tarot-reunion-overlay"
        style={{ display: "none" }}
        data-action="closeTarotReunionModal"
        data-action-self-only="1"
      >
        <div className="tarot-reunion-stars" aria-hidden="true">
          <span className="star s1" />
          <span className="star s2" />
          <span className="star s3" />
          <span className="star s4" />
          <span className="star s5" />
          <span className="star s6" />
          <span className="star s7" />
          <span className="star s8" />
          <span className="star s9" />
          <span className="star s10" />
        </div>

        <div className="tarot-reunion-lighthouse" aria-hidden="true">
          <span className="tower" />
          <span className="lamp" />
          <span className="beam" />
          <span className="water-reflection" />
        </div>

        <div className="tarot-reunion-shell">
          <div className="tarot-reunion-panel">
            <button className="tarot-reunion-close" type="button" data-action="closeTarotReunionModal" aria-label="재회운 타로 닫기">
              ×
            </button>

            <section id="tarotReunionIntroStage" className="tarot-reunion-stage is-active">
              <div className="tarot-reunion-hero">
                <h1 className="tarot-reunion-title">그 사람과의 인연은 끝났을까?</h1>
                <p className="tarot-reunion-subtitle">
                  깊은 밤바다의 등대처럼, 당신의 그리움을 다정하게 비추는 재회운 5카드 스프레드입니다. 조급한 단정보다 따뜻한 통찰로 다음 길을 찾도록 도와드립니다.
                </p>

                <div className="tarot-reunion-meditation-wrap">
                  <button
                    id="tarotReunionMeditationBtn"
                    className="tarot-reunion-meditation-btn"
                    type="button"
                    data-action="toggleTarotReunionMeditation"
                    data-action-stop-propagation="1"
                    aria-label="밤바다 명상"
                  >
                    🧘 밤바다 명상 시작
                  </button>

                  <div id="tarotReunionMeditationGuide" className="tarot-reunion-meditation-guide" aria-live="polite" hidden>
                    <div className="tarot-reunion-breath-circle" aria-hidden="true" />
                    <p id="tarotReunionBreathText" className="tarot-reunion-breath-text" />
                    <span id="tarotReunionBreathCount" className="tarot-reunion-breath-count" />
                  </div>
                </div>

                <div className="tarot-reunion-invoke-wrap">
                  <button className="tarot-reunion-btn tarot-reunion-btn--invoke" type="button" data-action="startTarotReunionReading">
                    🕯️ 재회의 등대 카드 펼치기
                  </button>
                </div>
              </div>
            </section>

            <section id="tarotReunionDrawStage" className="tarot-reunion-stage">
              <h3 className="tarot-reunion-draw-header">카드를 1번부터 5번까지 순서대로 열어 감정의 흐름을 따라가세요</h3>
              <div className="tarot-reunion-spread-guide" id="tarotReunionSpreadGuide">
                첫 번째 카드를 뒤집어 주세요.
              </div>
              <div id="tarotReunionCardGrid" className="tarot-reunion-card-grid" />
              <div className="tarot-reunion-final-wrap">
                <button type="button" className="tarot-reunion-final-btn" id="tarotReunionFinalBtn" data-action="showTarotReunionFinalReading" disabled>
                  ✨ 등대의 해석 보기
                </button>
              </div>
            </section>

            <section id="tarotReunionResultStage" className="tarot-reunion-stage tarot-reunion-result-stage-shell">
              <header className="tarot-reunion-reading-header">
                <h2 className="tarot-reunion-reading-title">🌌 재회운 5카드 리딩 결과</h2>
                <div className="tarot-reunion-result-stars" aria-hidden="true">
                  <span className="result-star rs1" />
                  <span className="result-star rs2" />
                  <span className="result-star rs3" />
                  <span className="result-star rs4" />
                  <span className="result-star rs5" />
                  <span className="result-star rs6" />
                </div>
              </header>

              <div id="tarotReunionResultCards" className="tarot-reunion-result-cards" />

              <div className="tarot-reunion-result-divider">
                <span className="result-lighthouse-icon" aria-hidden="true" />
                <span className="result-lighthouse-glow" />
                <span className="result-star-line" />
              </div>

              <div id="tarotReunionReadingContent" className="tarot-reunion-reading-content" />

              <div className="tarot-reunion-result-actions">
                <button type="button" className="tarot-reunion-btn" data-action="shareTarotReunionResult">
                  💬 카카오톡 공유하기
                </button>
                <button type="button" className="tarot-reunion-btn tarot-reunion-btn--subtle" data-action="resetTarotReunionFlow">
                  🔄 다시 리딩하기
                </button>
                <button type="button" className="tarot-reunion-btn tarot-reunion-btn--subtle" data-action="closeTarotReunionModal">
                  🏠 홈화면 바로가기
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
