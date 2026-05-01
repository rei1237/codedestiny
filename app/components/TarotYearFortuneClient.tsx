"use client";

import { useEffect } from "react";
import Script from "next/script";

declare global {
  interface Window {
    openTarotYearFortuneModal?: () => void;
  }
}

const YEAR_STYLE_HREF = "/styles/tarot-year-fortune.css";

function ensureYearStyleSheet() {
  if (typeof document === "undefined") return;
  const existed = document.querySelector('link[data-tarot-year-style="1"]');
  if (existed) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = YEAR_STYLE_HREF;
  link.setAttribute("data-tarot-year-style", "1");
  document.head.appendChild(link);
}

function openYearExperienceWhenReady() {
  if (typeof window === "undefined") return;
  if (typeof window.openTarotYearFortuneModal === "function") {
    window.openTarotYearFortuneModal();
  }
}

export default function TarotYearFortuneClient() {
  useEffect(() => {
    ensureYearStyleSheet();
    openYearExperienceWhenReady();

    const timer = window.setInterval(() => {
      if (typeof window.openTarotYearFortuneModal === "function") {
        window.openTarotYearFortuneModal();
        window.clearInterval(timer);
      }
    }, 150);

    return () => {
      window.clearInterval(timer);
      try {
        document.body.style.overflow = "";
      } catch {
        // no-op
      }
    };
  }, []);

  return (
    <>
      <Script src="/js/tarot-year-fortune-experience.js" strategy="afterInteractive" onLoad={openYearExperienceWhenReady} />

      <div
        id="tarotYearFortuneOverlay"
        className="tarot-year-overlay"
        style={{ display: "none" }}
        data-action="closeTarotYearFortuneModal"
        data-action-self-only="1"
      >
        <div className="ty-eastern-pattern" aria-hidden="true" />
        <div className="ty-zodiac-silhouettes" aria-hidden="true">
          <span className="ty-zodiac-sil ty-zodiac-sil--1" title="쥐">🐭</span>
          <span className="ty-zodiac-sil ty-zodiac-sil--2" title="소">🐮</span>
          <span className="ty-zodiac-sil ty-zodiac-sil--3" title="호랑이">🐅</span>
          <span className="ty-zodiac-sil ty-zodiac-sil--4" title="토끼">🐇</span>
          <span className="ty-zodiac-sil ty-zodiac-sil--5" title="용">🐉</span>
          <span className="ty-zodiac-sil ty-zodiac-sil--6" title="뱀">🐍</span>
          <span className="ty-zodiac-sil ty-zodiac-sil--7" title="말">🐴</span>
          <span className="ty-zodiac-sil ty-zodiac-sil--8" title="양">🐐</span>
          <span className="ty-zodiac-sil ty-zodiac-sil--9" title="원숭이">🐒</span>
          <span className="ty-zodiac-sil ty-zodiac-sil--10" title="닭">🐓</span>
          <span className="ty-zodiac-sil ty-zodiac-sil--11" title="개">🐕</span>
          <span className="ty-zodiac-sil ty-zodiac-sil--12" title="돼지">🌸</span>
        </div>
        <div className="ty-bg-glow ty-bg-glow--1" aria-hidden="true" />
        <div className="ty-bg-glow ty-bg-glow--2" aria-hidden="true" />
        <div className="ty-particles" aria-hidden="true">
          <span className="ty-particle p1" />
          <span className="ty-particle p2" />
          <span className="ty-particle p3" />
          <span className="ty-particle p4" />
          <span className="ty-particle p5" />
          <span className="ty-particle p6" />
        </div>

        <div className="tarot-year-shell">
          <div className="tarot-year-panel">
            <button className="tarot-year-close" id="tarotYearCloseBtn" type="button" aria-label="닫기">
              ×
            </button>

            <section id="tarotYearFortuneIntroStage" className="tarot-year-stage is-active">
              <div className="ty-hero">
                <div className="ty-hero-badge">십이지신 천운</div>
                <h1 className="ty-hero-title">운명의 수레바퀴를 열다</h1>
                <p className="ty-hero-subtitle">
                  천상의 열두 수호신이 지키는 한 해. 1월부터 12월까지 각 월의 카드를 뽑고 재물, 연애, 인간관계, 합격운을 확인하세요.
                </p>
                <button type="button" className="ty-cta-btn" id="tarotYearCtaBtn">
                  천운 카드 뽑기
                </button>
              </div>
            </section>

            <section id="tarotYearFortuneDrawStage" className="tarot-year-stage">
              <div className="ty-loading-block">
                <h3 className="ty-draw-title">천운의 카드를 뽑는 중입니다</h3>
                <p className="ty-loading-text">열두 수호신이 한 해의 문을 열고 있습니다. 잠시만 기다려 주세요.</p>
                <div className="ty-loading-spinner" aria-hidden="true" />
              </div>
              <div id="tarotYearDrawCardGrid" className="ty-draw-grid" aria-hidden="true" />
            </section>

            <section id="tarotYearFortuneResultStage" className="tarot-year-stage">
              <header className="ty-result-header">
                <h2 className="ty-result-title">십이지신 월운, 1월부터 12월 스프레드</h2>
              </header>
              <p className="ty-result-hint">월패를 눌러 해당 월 타로 상담을 여세요</p>
              <div className="ty-result-summary" id="tarotYearSummary" style={{ display: "none" }} />
              <div id="tarotYearResultCards" className="ty-result-cards" />

              <div id="tarotYearMonthDetailPanel" className="ty-month-detail-panel">
                <p className="ty-month-detail-placeholder" id="tarotYearMonthDetailPlaceholder">
                  월패를 눌러 해당 월의 운세를 확인하세요
                </p>

                <div id="tarotYearMonthDetailContent" className="ty-month-detail-content" style={{ display: "none" }}>
                  <h4 className="ty-month-detail-title" id="tarotYearMonthDetailTitle">
                    1월 상세 운세
                  </h4>

                  <div className="ty-month-oracle-hero">
                    <div className="ty-month-oracle-card" id="tarotYearMonthDetailCardWrap">
                      <img
                        id="tarotYearMonthDetailCardImg"
                        alt="이달의 타로 카드"
                        loading="lazy"
                        decoding="async"
                        width={200}
                        height={300}
                      />
                    </div>
                    <div className="ty-month-oracle-meta">
                      <p className="ty-month-oracle-name" id="tarotYearMonthDetailCardName">
                        이달의 카드
                      </p>
                      <p className="ty-month-oracle-consult">전문 타로 리딩</p>
                    </div>
                  </div>

                  <div className="ty-month-spread-wrap">
                    <h5 className="ty-month-spread-title">이달의 삼재 스프레드</h5>
                    <div className="ty-month-spread-cards" id="tarotYearMonthSpreadCards" />
                  </div>

                  <div className="ty-month-category-tabs" id="tarotYearMonthCategoryTabs">
                    <button type="button" className="ty-month-cat-btn is-active" data-cat="general">
                      전반
                    </button>
                    <button type="button" className="ty-month-cat-btn" data-cat="money">
                      재물
                    </button>
                    <button type="button" className="ty-month-cat-btn" data-cat="love">
                      연애
                    </button>
                    <button type="button" className="ty-month-cat-btn" data-cat="relationship">
                      인간관계
                    </button>
                    <button type="button" className="ty-month-cat-btn" data-cat="exam">
                      합격
                    </button>
                  </div>

                  <div className="ty-month-category-panel">
                    <h6 className="ty-month-category-title" id="tarotYearMonthCategoryTitle">
                      전반 운세 해석
                    </h6>
                    <p className="ty-month-category-text" id="tarotYearMonthCategoryText" />
                  </div>
                </div>
              </div>

              <div className="ty-advice-section">
                <h4 className="ty-advice-title">오라클의 총평</h4>
                <p className="ty-advice-text" id="tarotYearFinalAdvice" />
              </div>

              <div className="ty-result-actions">
                <button type="button" className="ty-result-btn" id="tarotYearShareBtn">
                  천운 공유
                </button>
                <button type="button" className="ty-result-btn ty-result-btn--outline" id="tarotYearResetBtn">
                  다시 점치기
                </button>
                <button type="button" className="ty-result-btn ty-result-btn--outline ty-result-btn--home" id="tarotYearHomeBtn">
                  홈화면 바로가기
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
