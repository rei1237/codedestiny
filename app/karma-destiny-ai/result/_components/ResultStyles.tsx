"use client";

/**
 * 운명의 업 결과 화면 — Premium Destiny Observatory.
 *
 * 색 토큰은 `.kdai-result-page` 안에서만 선언한다(전역 오염 없음). 연이/네오 분기는 쓰지
 * 않는다 — 그 분기는 루트 셸 전용 규칙이다.
 *
 * 🔴 PDF 규칙: html2canvas 는 backdrop-filter 를 지원하지 않는다. .kdo-pane 의 background
 * 스택 맨 아래에 반드시 불투명 레이어를 둔다. 안 두면 PDF 에서 카드가 투명/검정으로 찍힌다.
 * 같은 이유로 리포트 안에서는 mask-image 대신 radial-gradient 페이드를 쓴다.
 */
export default function ResultStyles() {
  return (
    <>
      <style jsx global>{`
        .kdai-result-page {
          /* 표면 */
          --kdo-navy-900: #060a18;
          --kdo-navy-800: #0a1024;
          --kdo-navy-700: #101a33;
          --kdo-purple-700: #241844;
          /* 잉크 — 유리면(#191E31) 기준 대비: ink 14.4:1 / ink-2 10.5:1 / muted 9.1:1 */
          --kdo-ink: #edeff5;
          --kdo-ink-2: #c6cee0;
          --kdo-ink-muted: #b6c0d8;
          --kdo-aurora: #9cc9f0;
          /* 골드는 본문에 쓰지 않는다(One Accent Rule) — 킥커·수치·파이핑 전용 */
          --kdo-gold: #e8d5a3;
          --kdo-star: #fff2c6;
          /* 인터랙티브 경계·포커스 링은 3:1 이상이어야 한다 */
          --kdo-line-strong: rgba(232, 213, 163, 0.48);
          --kdo-line: rgba(198, 206, 224, 0.3);
          --kdo-radar-fill-in: rgba(78, 168, 245, 0.42);
          --kdo-radar-fill-out: rgba(78, 168, 245, 0.16);

          position: relative;
          min-height: 100vh;
          padding: 0 0 64px;
          color: var(--kdo-ink);
          background:
            radial-gradient(120% 80% at 20% -10%, rgba(36, 24, 68, 0.85), transparent 60%),
            radial-gradient(90% 70% at 85% 0%, rgba(20, 48, 92, 0.6), transparent 55%),
            linear-gradient(180deg, var(--kdo-navy-800) 0%, var(--kdo-navy-900) 100%);
          font-family: "SUIT", "Pretendard", system-ui, sans-serif;
        }

        /* 전역 element 선택자를 쓰면 문서 전체가 영향을 받는다. 이 페이지 안으로 스코프를 좁힌다. */
        .kdai-result-page button,
        .kdai-result-page .kdai-back,
        .kdai-result-page .kdai-error-state a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          /* 탭 타깃 하한 44px */
          min-height: 44px;
          padding: 0 15px;
          border-radius: 999px;
          border: 1px solid var(--kdo-line);
          background: rgba(255, 255, 255, 0.05);
          color: var(--kdo-ink);
          font-size: 0.92rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
          touch-action: manipulation;
        }
        .kdai-result-page button:hover:not(:disabled),
        .kdai-result-page .kdai-back:hover {
          border-color: var(--kdo-line-strong);
          background: rgba(255, 255, 255, 0.09);
        }
        .kdai-result-page button:disabled { opacity: 0.6; cursor: default; }
        .kdai-result-page :focus-visible {
          outline: 2px solid var(--kdo-line-strong);
          outline-offset: 2px;
        }

        /* ── 표면 이펙트 ────────────────────────────────────────────────── */
        .kdo-pane {
          position: relative;
          border-radius: 8px;
          border: 1px solid var(--kdo-line);
          /* ↓ 불투명 폴백이 반드시 스택 맨 아래에 있어야 PDF 에서 살아남는다 */
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.02)),
            var(--kdo-navy-700);
          backdrop-filter: blur(18px) saturate(120%);
          box-shadow:
            inset 0 1px 0 rgba(255, 247, 223, 0.08),
            0 24px 70px rgba(6, 10, 24, 0.42);
          padding: clamp(20px, 4vw, 34px);
          margin: 0 0 clamp(18px, 4vw, 30px);
          overflow: hidden;
        }
        /* 골드 파이핑 — 텍스트가 아니라 테두리이므로 낮은 알파가 허용된다 */
        .kdo-pane::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(140deg, rgba(232, 213, 163, 0.55), rgba(156, 201, 240, 0.18) 42%, rgba(232, 213, 163, 0.08));
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .kdo-pane--aurora::after {
          content: "";
          position: absolute;
          inset: 0 0 auto 0;
          height: 130px;
          background:
            radial-gradient(120% 100% at 20% 0%, rgba(156, 201, 240, 0.16), transparent 62%),
            radial-gradient(90% 100% at 82% 0%, rgba(124, 58, 237, 0.14), transparent 58%);
          pointer-events: none;
        }
        /* Glow 는 상태 변화에서만 (Glow-Not-Shadow) */
        .kdo-pane:focus-within,
        .kdo-pane.is-open {
          border-color: var(--kdo-line-strong);
          box-shadow:
            inset 0 1px 0 rgba(255, 247, 223, 0.1),
            0 0 0 1px rgba(232, 213, 163, 0.22),
            0 0 34px -6px rgba(156, 201, 240, 0.32);
        }

        .kdo-kicker {
          display: block;
          font-size: 0.74rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--kdo-gold);
          margin-bottom: 8px;
        }
        .kdai-result-page h1 { font-size: clamp(1.5rem, 4vw, 2.05rem); line-height: 1.35; margin: 0 0 8px; }
        .kdai-result-page h2 { font-size: clamp(1.1rem, 2.6vw, 1.42rem); line-height: 1.4; margin: 0 0 12px; }

        /* ── 별 배경 ─────────────────────────────────────────────────────── */
        .kdo-starfield {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.55;
          /* 별 하나당 DOM 노드를 만들지 않는다 */
          background-image:
            radial-gradient(1.4px 1.4px at 12% 18%, rgba(255, 242, 198, 0.9), transparent),
            radial-gradient(1.1px 1.1px at 78% 8%, rgba(156, 201, 240, 0.8), transparent),
            radial-gradient(1.6px 1.6px at 42% 62%, rgba(255, 255, 255, 0.7), transparent),
            radial-gradient(1.2px 1.2px at 88% 48%, rgba(232, 213, 163, 0.75), transparent),
            radial-gradient(1px 1px at 26% 84%, rgba(255, 255, 255, 0.55), transparent),
            radial-gradient(1.3px 1.3px at 64% 92%, rgba(156, 201, 240, 0.6), transparent);
          background-repeat: repeat;
          background-size: 620px 620px;
        }
        /* 컴포지터 스레드에서 도는 스크롤 애니메이션. 미지원 브라우저는 자동으로 정적이다. */
        @supports (animation-timeline: view()) {
          @media (prefers-reduced-motion: no-preference) {
            .kdo-parallax {
              animation: kdoDrift linear both;
              animation-timeline: view();
              animation-range: entry 0% exit 100%;
            }
            @keyframes kdoDrift {
              from { transform: translate3d(0, 12px, 0); }
              to { transform: translate3d(0, -12px, 0); }
            }
          }
        }

        /* ── 레이아웃 ───────────────────────────────────────────────────── */
        .kdo-observatory {
          display: grid;
          grid-template-columns: 270px minmax(0, 1fr);
          gap: clamp(16px, 3vw, 30px);
          max-width: 1180px;
          margin: 0 auto;
          padding: clamp(18px, 4vw, 34px) clamp(14px, 3vw, 26px) 0;
        }
        .kdai-report {
          position: relative;
          min-width: 0;
          padding-bottom: 40px;
        }

        /* ── 목차 레일 ──────────────────────────────────────────────────── */
        .kdai-toc {
          position: sticky;
          top: 18px;
          align-self: start;
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          border-radius: 8px;
          border: 1px solid var(--kdo-line);
          background: rgba(10, 16, 36, 0.82);
          padding: 14px;
        }
        .kdai-toc__head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .kdai-toc__head strong { font-size: 0.95rem; }
        .kdai-toc__count { font-size: 0.78rem; color: var(--kdo-ink-muted); margin-right: auto; }
        .kdai-toc__head button { min-height: 44px; min-width: 44px; padding: 0; border-radius: 10px; }
        .kdai-toc__rail { display: flex; flex-direction: column; gap: 2px; }
        .kdai-toc__rail a {
          display: grid;
          grid-template-columns: 12px 26px minmax(0, 1fr);
          align-items: center;
          gap: 8px;
          min-height: 44px;
          padding: 0 8px;
          border-radius: 8px;
          color: var(--kdo-ink-2);
          font-size: 0.86rem;
          text-decoration: none;
        }
        .kdai-toc__rail a:hover { background: rgba(255, 255, 255, 0.05); }
        .kdai-toc__rail a.is-active { background: rgba(156, 201, 240, 0.13); color: var(--kdo-ink); }
        .kdai-toc__bead {
          width: 8px; height: 8px; border-radius: 50%;
          border: 1px solid var(--kdo-line-strong);
          transition: background 0.25s ease, transform 0.25s ease;
        }
        .kdai-toc__rail a.is-active .kdai-toc__bead { background: var(--kdo-gold); transform: scale(1.25); }
        .kdai-toc__order { font-variant-numeric: tabular-nums; color: var(--kdo-gold); font-size: 0.78rem; }
        .kdai-toc__title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* ── 섹션 탭 + 진행률 ───────────────────────────────────────────── */
        .kdo-tabs--rail { margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--kdo-line); }
        .kdo-tabs__meter { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 8px; margin-bottom: 10px; }
        .kdo-tabs__meter-label, .kdo-tabs__meter-value { font-size: 0.72rem; color: var(--kdo-ink-muted); }
        .kdo-tabs__meter-track { height: 3px; border-radius: 999px; background: rgba(255, 255, 255, 0.12); overflow: hidden; }
        .kdo-tabs__meter-fill {
          display: block; height: 100%;
          background: linear-gradient(90deg, var(--kdo-aurora), var(--kdo-gold));
          /* width 가 아니라 transform 으로 움직인다(레이아웃 애니메이션 금지) */
          transform: scaleX(var(--kdo-progress, 0));
          transform-origin: left;
          transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .kdo-tabs--rail .kdo-tabs__list { display: flex; flex-wrap: wrap; gap: 4px; }
        .kdo-tabs__item {
          display: inline-flex; align-items: center;
          min-height: 44px; padding: 0 11px;
          border-radius: 999px;
          font-size: 0.82rem;
          color: var(--kdo-ink-2);
          text-decoration: none;
        }
        .kdo-tabs__item.is-active { background: rgba(232, 213, 163, 0.16); color: var(--kdo-ink); }
        .kdo-tabs--mobile { display: none; }

        /* ── 히어로 ─────────────────────────────────────────────────────── */
        .kdai-report-hero { text-align: center; }
        .kdai-report-hero > span { display: block; font-size: 0.76rem; letter-spacing: 0.14em; color: var(--kdo-gold); }
        .kdai-report-hero p { color: var(--kdo-ink-muted); font-size: 0.9rem; margin: 0 0 16px; }
        .kdai-back { position: absolute; top: 14px; left: 14px; font-size: 0.84rem; }
        .kdo-hero__mark { width: 74px; height: 74px; margin: 8px auto 10px; display: block; color: var(--kdo-gold); }
        .kdai-report-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }

        /* ── ① 핵심 문장 ───────────────────────────────────────────────── */
        .kdo-core__line {
          font-family: var(--font-serif);
          font-size: clamp(1.24rem, 3.4vw, 1.78rem);
          line-height: 1.6;
          margin: 0 0 18px;
          word-break: keep-all;
        }
        .kdo-core__meta { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; font-size: 0.86rem; color: var(--kdo-ink-2); }
        .kdo-core__meta span { display: inline-flex; align-items: center; gap: 6px; }
        .kdo-core__icon { width: 17px; height: 17px; color: var(--kdo-gold); }
        .kdo-core__keywords { display: inline-flex; flex-wrap: wrap; gap: 6px; }
        .kdo-core__keywords em {
          font-style: normal; font-size: 0.78rem;
          padding: 4px 10px; border-radius: 999px;
          border: 1px solid var(--kdo-line-strong);
          color: var(--kdo-star);
        }

        /* ── ② 에너지 강도 ─────────────────────────────────────────────── */
        .kdo-energy__list { list-style: none; margin: 0; padding: 0; display: grid; gap: 16px; }
        .kdo-energy__head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
        .kdo-energy__head strong { font-size: 0.98rem; }
        .kdo-energy__head span { font-variant-numeric: tabular-nums; color: var(--kdo-gold); font-weight: 700; }
        .kdo-energy__track { display: block; height: 6px; border-radius: 999px; background: rgba(255, 255, 255, 0.1); overflow: hidden; }
        .kdo-energy__fill {
          display: block; height: 100%;
          background: linear-gradient(90deg, var(--kdo-aurora), var(--kdo-star));
          transform-origin: left;
          transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .kdo-energy__list p { margin: 8px 0 0; font-size: 0.86rem; line-height: 1.7; color: var(--kdo-ink-2); word-break: keep-all; }
        .kdo-energy__note { margin: 18px 0 0; font-size: 0.8rem; color: var(--kdo-ink-muted); }

        /* ── ③ 종합 결론 + 레이더 ──────────────────────────────────────── */
        .kdo-synthesis__body { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: clamp(16px, 3vw, 28px); align-items: start; }
        .kdo-synthesis__radar { position: relative; }

        .kdo-radar { margin: 0; }
        .kdo-radar__svg { width: 100%; height: auto; max-width: 330px; display: block; margin: 0 auto; }
        .kdo-radar__ring { fill: none; stroke: rgba(198, 206, 224, 0.18); stroke-width: 1; }
        .kdo-radar__axis { stroke: rgba(198, 206, 224, 0.22); stroke-width: 1; }
        .kdo-radar__area { stroke: var(--kdo-gold); stroke-width: 2; stroke-linejoin: round; }
        .kdo-radar__node { fill: var(--kdo-star); }
        .kdo-radar__label { fill: var(--kdo-ink-2); font-size: 12.5px; }
        .kdo-radar__value { fill: var(--kdo-ink); font-size: 11px; font-variant-numeric: tabular-nums; }
        .kdo-radar__caption { margin: 10px 0 0; font-size: 0.8rem; color: var(--kdo-ink-muted); text-align: center; word-break: keep-all; }
        .kdo-radar__toggle { margin: 10px auto 0; display: flex; font-size: 0.82rem; }
        .kdo-radar__table { width: 100%; margin-top: 12px; border-collapse: collapse; font-size: 0.84rem; }
        .kdo-radar__table caption { text-align: left; font-size: 0.78rem; color: var(--kdo-ink-muted); padding-bottom: 6px; }
        .kdo-radar__table th, .kdo-radar__table td { text-align: left; padding: 7px 8px; border-bottom: 1px solid var(--kdo-line); vertical-align: top; }
        .kdo-radar__table thead th { color: var(--kdo-gold); font-weight: 600; }
        .kdo-radar__formula { display: block; font-size: 0.74rem; color: var(--kdo-ink-muted); margin-top: 3px; }
        /* display:none 을 쓰면 스크린리더에서도 사라진다 — 레이더의 유일한 대체 수단이므로 시각적으로만 숨긴다. */
        .kdo-visually-hidden {
          position: absolute !important;
          width: 1px; height: 1px;
          margin: -1px; padding: 0; border: 0;
          clip-path: inset(50%);
          overflow: hidden; white-space: nowrap;
        }

        /* ── ④ 운명 지도 ───────────────────────────────────────────────── */
        .kdo-map__list { list-style: none; margin: 0; padding: 0; display: grid; gap: 18px; }
        .kdo-map__list li { display: grid; grid-template-columns: 14px minmax(0, 1fr); gap: 12px; position: relative; }
        .kdo-map__list li::after {
          content: ""; position: absolute; left: 6px; top: 18px; bottom: -18px;
          width: 1px; background: var(--kdo-line);
        }
        .kdo-map__list li:last-child::after { display: none; }
        .kdo-map__dot { width: 13px; height: 13px; border-radius: 50%; border: 2px solid var(--kdo-gold); background: var(--kdo-navy-800); margin-top: 4px; }
        .kdo-map__list strong { display: block; font-size: 0.95rem; margin-bottom: 4px; }
        .kdo-map__list p { margin: 0 0 4px; font-size: 0.86rem; line-height: 1.7; color: var(--kdo-ink-2); word-break: break-all; }
        .kdo-map__source { font-size: 0.76rem; color: var(--kdo-ink-muted); }

        /* ── ⑤ 카테고리 카드 ───────────────────────────────────────────── */
        .kdo-deck__head { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-end; justify-content: space-between; margin-bottom: 18px; }
        .kdo-deck__head h2 { margin: 0; }
        .kdo-density { display: inline-flex; gap: 4px; padding: 3px; border-radius: 999px; border: 1px solid var(--kdo-line); }
        .kdo-density button { min-height: 44px; padding: 0 16px; border: 0; background: transparent; font-size: 0.86rem; }
        .kdo-density button[aria-pressed="true"] { background: rgba(232, 213, 163, 0.18); color: var(--kdo-star); }
        .kdo-deck__toc {
          margin: 0 0 clamp(18px, 4vw, 30px);
          padding: clamp(18px, 3vw, 26px) clamp(18px, 3vw, 26px) clamp(18px, 3vw, 26px) clamp(36px, 5vw, 46px);
          border-radius: 8px;
          border: 1px solid var(--kdo-line);
          background: var(--kdo-navy-700);
          color: var(--kdo-ink-2);
          font-size: 0.9rem;
          line-height: 2;
        }

        .kdai-chapter { padding: 0; overflow: visible; }
        .kdai-chapter__head {
          display: grid !important;
          grid-template-columns: 42px minmax(0, 1fr) auto auto;
          align-items: center;
          gap: 12px;
          width: 100%;
          min-height: 76px;
          padding: 14px clamp(16px, 3vw, 28px) !important;
          border: 0 !important;
          border-radius: 8px !important;
          background: transparent !important;
          text-align: left;
          scroll-margin-top: calc(18px + var(--kdo-tabbar-h, 0px));
        }
        /* 선택자를 클래스로 좁힌다. head 안의 모든 span 을 잡으면 렌즈 배지가 원형으로 깨진다. */
        .kdai-chapter__num {
          display: inline-flex; align-items: center; justify-content: center;
          width: 38px; height: 38px; border-radius: 50%;
          border: 1px solid var(--kdo-line-strong);
          color: var(--kdo-gold);
          font-family: var(--font-serif);
          font-size: 1.02rem;
        }
        .kdai-chapter__head h2 { margin: 0; font-size: clamp(1rem, 2.4vw, 1.24rem); }
        .kdo-lens-badge {
          font-size: 0.72rem; letter-spacing: 0.04em;
          padding: 5px 10px; border-radius: 999px;
          border: 1px solid var(--kdo-line);
          color: var(--kdo-ink-muted);
          white-space: nowrap;
        }
        .kdai-chapter__body { padding: 0 clamp(16px, 3vw, 28px) clamp(18px, 3vw, 26px); }
        .kdo-prose {
          font-size: 1.0625rem;
          line-height: 1.85;
          color: var(--kdo-ink);
          max-width: 66ch;
        }
        .kdo-prose p { margin-bottom: 1.35em; }
        .kdai-chapter__prose.is-clamped {
          max-height: 320px;
          overflow: hidden;
          -webkit-mask-image: linear-gradient(180deg, #000 62%, transparent 100%);
          mask-image: linear-gradient(180deg, #000 62%, transparent 100%);
        }
        /*
         * 인용구는 인용구로 보여야 한다. 좌측 굵은 바 + 배경 틴트 + 비대칭 라운드를 겹치면
         * "액센트 탭이 달린 카드"로 읽혀 카드(.kdo-pane)와 위계가 충돌한다.
         * 얇은 괘선만 남기고 카드 장식은 뺀다.
         */
        .kdo-quote {
          margin: 0 0 20px;
          padding: 2px 0 2px 16px;
          border-left: 1px solid var(--kdo-line-strong);
          background: none;
          color: var(--kdo-star);
          font-family: var(--font-serif);
          font-size: 1.06rem;
          line-height: 1.8;
          word-break: keep-all;
        }
        .kdo-summary-line { margin: 0 0 16px; font-size: 0.98rem; line-height: 1.85; color: var(--kdo-ink-2); word-break: keep-all; }
        .kdai-more-toggle { min-height: 44px; margin: 12px 0 0; font-size: 0.86rem; }
        .kdai-core-box {
          margin-top: 18px;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid var(--kdo-line);
          background: rgba(156, 201, 240, 0.07);
          display: grid;
          gap: 8px;
        }
        .kdai-core-box__head { display: flex; align-items: center; gap: 7px; }
        .kdai-core-box__head strong { font-size: 0.9rem; color: var(--kdo-star); }
        .kdai-core-box__icon { width: 17px; height: 17px; color: var(--kdo-gold); }
        .kdai-core-box span { font-size: 0.9rem; line-height: 1.75; color: var(--kdo-ink-2); word-break: keep-all; }
        .kdai-copy-chapter { margin-top: 14px; font-size: 0.84rem; }

        /* ── 근거 펼치기 ───────────────────────────────────────────────── */
        .kdo-evidence { margin-top: 16px; border-radius: 8px; border: 1px solid var(--kdo-line); background: rgba(255, 255, 255, 0.03); }
        .kdo-evidence__summary {
          display: flex; align-items: center; gap: 8px;
          min-height: 44px; padding: 0 14px;
          cursor: pointer; list-style: none;
          font-size: 0.88rem; color: var(--kdo-ink-2);
        }
        .kdo-evidence__summary::-webkit-details-marker { display: none; }
        .kdo-evidence__icon { width: 16px; height: 16px; color: var(--kdo-gold); flex: none; }
        .kdo-evidence__chevron { margin-left: auto; transition: transform 0.25s ease; }
        .kdo-evidence[open] .kdo-evidence__chevron { transform: rotate(180deg); }
        /* grid-template-rows 는 높이 애니메이션에 한해 허용되는 예외다. */
        .kdo-evidence__wrap { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
        .kdo-evidence[open] .kdo-evidence__wrap { grid-template-rows: 1fr; }
        .kdo-evidence__inner { overflow: hidden; padding: 0 14px; }
        .kdo-evidence[open] .kdo-evidence__inner { padding-bottom: 14px; }
        .kdo-evidence__note { margin: 0 0 10px; font-size: 0.8rem; color: var(--kdo-ink-muted); }
        .kdo-evidence__group h4 { margin: 12px 0 6px; font-size: 0.82rem; color: var(--kdo-gold); font-weight: 600; }
        .kdo-evidence dl { margin: 0; display: grid; gap: 6px; }
        .kdo-evidence__row { display: grid; grid-template-columns: minmax(96px, 30%) minmax(0, 1fr); gap: 10px; }
        .kdo-evidence__row dt { font-size: 0.82rem; color: var(--kdo-ink-2); }
        .kdo-evidence__row dd { margin: 0; font-size: 0.82rem; color: var(--kdo-ink); word-break: break-all; }
        .kdo-evidence__badge {
          display: inline-block; margin-left: 6px;
          font-size: 0.68rem; padding: 2px 6px; border-radius: 999px;
          border: 1px solid var(--kdo-line); color: var(--kdo-ink-muted);
        }

        /* ── ⑥ 행동 전략 · 편지 ────────────────────────────────────────── */
        .kdo-action__list { list-style: none; margin: 0 0 22px; padding: 0; display: grid; gap: 10px; }
        .kdo-action__list li { display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: 10px; align-items: start; font-size: 0.94rem; line-height: 1.75; word-break: keep-all; }
        .kdo-action__icon { width: 18px; height: 18px; color: var(--kdo-gold); margin-top: 3px; }
        .kdo-letter { padding-top: 18px; border-top: 1px solid var(--kdo-line); }

        /* ── ⑦ 오늘의 문장 ─────────────────────────────────────────────── */
        .kdo-today { text-align: center; }
        .kdo-today__line {
          font-family: var(--font-serif);
          font-size: clamp(1.12rem, 3vw, 1.5rem);
          line-height: 1.65;
          margin: 0 0 16px;
          word-break: keep-all;
        }
        .kdo-today__more summary { cursor: pointer; min-height: 44px; display: inline-flex; align-items: center; font-size: 0.86rem; color: var(--kdo-ink-2); }
        .kdo-today__more ul { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 8px; text-align: left; }
        .kdo-today__more li { font-size: 0.9rem; line-height: 1.7; color: var(--kdo-ink-2); padding-left: 14px; position: relative; word-break: keep-all; }
        .kdo-today__more li::before { content: "·"; position: absolute; left: 2px; color: var(--kdo-gold); }

        .kdai-disclaimer {
          border-radius: 8px;
          border: 1px solid var(--kdo-line);
          background: rgba(255, 255, 255, 0.03);
          padding: 16px;
          font-size: 0.8rem;
          line-height: 1.7;
          color: var(--kdo-ink-muted);
          text-align: center;
          word-break: keep-all;
        }

        /* ── 구분선 · 별 사슬 · 별자리 문양 ──────────────────────────────── */
        .kdo-divider { display: flex; align-items: center; gap: 12px; margin: clamp(28px, 6vw, 56px) 0; color: var(--kdo-gold); }
        .kdo-divider__line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, var(--kdo-line-strong), transparent); }
        .kdo-divider__glyph { width: 40px; height: 12px; flex: none; }

        .kdo-chain { display: flex; gap: 6px; }
        .kdo-chain--column { flex-direction: column; }
        .kdo-chain__star { width: 8px; height: 8px; border-radius: 50%; border: 1px solid var(--kdo-line-strong); }
        .kdo-chain__star.is-filled { background: var(--kdo-gold); border-color: var(--kdo-gold); }

        .kdo-constellation__lines { opacity: calc(0.25 + var(--kdo-unravel, 1) * 0.6); }
        .kdo-constellation__core { opacity: calc(0.35 + var(--kdo-unravel, 1) * 0.65); }

        /* ── 로딩 별자리 ───────────────────────────────────────────────── */
        .kdo-loader {
          max-width: 640px;
          margin: 0 auto;
          padding: clamp(28px, 8vw, 64px) 20px;
          text-align: center;
          display: grid;
          justify-items: center;
          gap: 10px;
        }
        .kdo-loader__sky { width: 100%; max-width: 420px; height: auto; margin-bottom: 6px; }
        .kdo-loader__edge {
          fill: none;
          stroke: var(--kdo-gold);
          stroke-width: 1.6;
          stroke-linecap: round;
          stroke-dasharray: 1;
          stroke-dashoffset: calc(1 - var(--kdo-edge-p, 0));
          transition: stroke-dashoffset 0.9s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .kdo-loader__dot {
          fill: var(--kdo-navy-800);
          stroke: var(--kdo-line-strong);
          stroke-width: 1.4;
          transform-box: fill-box;
          transform-origin: center;
          transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), fill 0.5s ease, stroke 0.5s ease;
        }
        .kdo-loader__node[data-state="done"] .kdo-loader__dot { fill: var(--kdo-gold); stroke: var(--kdo-gold); }
        .kdo-loader__node[data-state="active"] .kdo-loader__dot {
          fill: var(--kdo-aurora);
          stroke: var(--kdo-star);
          /* filter 를 transition 하면 매 프레임 재래스터가 발생한다. 상태별 정적 값만 쓴다. */
          filter: drop-shadow(0 0 8px rgba(156, 201, 240, 0.7));
          animation: kdoPulse 2.2s ease-in-out infinite;
        }
        @keyframes kdoPulse {
          0%, 100% { transform: scale(1.3); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.82; }
        }
        .kdo-loader__glyph { fill: var(--kdo-navy-900); font-size: 8px; font-weight: 700; }
        .kdo-loader__node[data-state="idle"] .kdo-loader__glyph { fill: var(--kdo-ink-muted); }
        .kdo-loader__label { fill: var(--kdo-ink-muted); font-size: 9.5px; }
        .kdo-loader__node[data-state="active"] .kdo-loader__label { fill: var(--kdo-star); }
        .kdo-loader__kicker { font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--kdo-gold); }
        .kdo-loader p { margin: 0; color: var(--kdo-ink-2); font-size: 0.92rem; word-break: keep-all; }
        .kdo-loader__meter { font-variant-numeric: tabular-nums; color: var(--kdo-star); font-size: 0.94rem; }
        .kdo-loader__chain { margin-top: 4px; }
        .kdo-loader__count { font-size: 0.82rem; color: var(--kdo-ink-muted); }
        .kdo-loader__retry { margin-top: 8px; }

        /* ── 상태 화면 ─────────────────────────────────────────────────── */
        .kdai-pending, .kdai-error-state {
          display: grid; justify-items: center; gap: 12px;
          padding: clamp(48px, 14vw, 120px) 20px;
          text-align: center;
          color: var(--kdo-ink-2);
        }
        .kdai-spin { animation: kdaiSpin 1s linear infinite; color: var(--kdo-gold); }
        @keyframes kdaiSpin { to { transform: rotate(360deg); } }
        .kdai-inline-error { color: #ffbdb0 !important; font-size: 0.88rem; }
        .kdai-toast {
          position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%);
          z-index: 40; padding: 11px 18px; border-radius: 999px;
          border: 1px solid var(--kdo-line-strong);
          background: rgba(10, 16, 36, 0.94);
          font-size: 0.88rem;
        }

        /* ── 순차 등장 ─────────────────────────────────────────────────── */
        [data-kdo-reveal] {
          opacity: 0;
          transform: translate3d(0, 14px, 0);
          transition: opacity 0.55s ease, transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
        }
        [data-kdo-reveal].is-revealed { opacity: 1; transform: none; }

        /* ── 모바일 ───────────────────────────────────────────────────── */
        @media (max-width: 960px) {
          .kdai-result-page { --kdo-tabbar-h: 58px; }
          .kdo-observatory { grid-template-columns: minmax(0, 1fr); }
          .kdai-toc {
            position: fixed;
            /* 하단 탭 바에 가리지 않도록 띄운다 */
            inset: auto 10px calc(var(--kdo-tabbar-h) + env(safe-area-inset-bottom, 0px));
            z-index: 30;
            max-height: 62vh;
            transform: translateY(120%);
            transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
            background: rgba(6, 10, 24, 0.97);
          }
          .kdai-toc.is-open { transform: none; }
          .kdai-report { padding-bottom: calc(var(--kdo-tabbar-h) + 24px + env(safe-area-inset-bottom, 0px)); }
          .kdo-synthesis__body { grid-template-columns: minmax(0, 1fr); }
          .kdo-prose { font-size: 1rem; }
          .kdo-tabs--rail { display: none; }
          .kdo-tabs--mobile {
            display: block;
            position: fixed;
            inset: auto 0 0 0;
            z-index: 28;
            padding: 6px 8px calc(6px + env(safe-area-inset-bottom, 0px));
            background: rgba(6, 10, 24, 0.92);
            border-top: 1px solid var(--kdo-line-strong);
            backdrop-filter: blur(16px);
          }
          .kdo-tabs--mobile::before {
            content: "";
            position: absolute; inset: 0 auto auto 0;
            height: 2px; width: 100%;
            transform: scaleX(var(--kdo-progress, 0));
            transform-origin: left;
            background: linear-gradient(90deg, var(--kdo-aurora), var(--kdo-gold));
            transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
          }
          .kdo-tabs--mobile .kdo-tabs__list {
            display: flex; gap: 4px;
            overflow-x: auto;
            overscroll-behavior-x: contain;
            scroll-snap-type: x proximity;
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .kdo-tabs--mobile .kdo-tabs__list::-webkit-scrollbar { display: none; }
          .kdo-tabs--mobile .kdo-tabs__item { min-width: 44px; scroll-snap-align: center; white-space: nowrap; }
        }

        /* ── PDF 캡처 가드 ─────────────────────────────────────────────── */
        /* 미노출 카드·접힌 패널이 빈 페이지로 찍히는 것을 막는다. */
        .kdai-report[data-kdai-exporting="true"] [data-kdo-reveal] { opacity: 1 !important; transform: none !important; }
        .kdai-report[data-kdai-exporting="true"] .kdo-parallax { animation: none !important; transform: none !important; }
        .kdai-report[data-kdai-exporting="true"] .kdo-evidence__wrap { grid-template-rows: 1fr !important; }
        .kdai-report[data-kdai-exporting="true"] .kdo-radar__table { position: static !important; clip-path: none !important; width: 100% !important; height: auto !important; margin: 12px 0 0 !important; }
        .kdai-report[data-kdai-exporting="true"] .kdai-chapter__prose.is-clamped { max-height: none; -webkit-mask-image: none; mask-image: none; }
        .kdai-report[data-kdai-exporting="true"] .kdo-loader__dot { animation: none !important; }
        [data-kdai-exporting="true"] ~ .kdo-tabs--mobile { display: none !important; }
        .kdai-report[data-kdai-exporting="true"] .kdai-back,
        .kdai-report[data-kdai-exporting="true"] .kdai-report-actions,
        .kdai-report[data-kdai-exporting="true"] .kdo-density,
        .kdai-report[data-kdai-exporting="true"] .kdai-copy-chapter,
        .kdai-report[data-kdai-exporting="true"] .kdai-more-toggle,
        .kdai-report[data-kdai-exporting="true"] .kdo-radar__toggle { display: none !important; }

        /* 인쇄·강제 색상 모드에서는 레이더만 라이트 토큰으로 바꾼다(셸은 다크 유지). */
        @media print, (forced-colors: active) {
          .kdo-radar__area { stroke: #8a6b1f; }
          .kdo-radar__ring, .kdo-radar__axis { stroke: #5a6478; }
          .kdo-radar__label, .kdo-radar__value { fill: #1b2340; }
        }

        @media (prefers-reduced-motion: reduce) {
          .kdo-loader__edge,
          .kdo-loader__dot,
          .kdo-energy__fill,
          .kdo-tabs__meter-fill,
          .kdo-evidence__wrap,
          [data-kdo-reveal] { transition: none !important; animation: none !important; }
          .kdo-loader__node[data-state="active"] .kdo-loader__dot { transform: scale(1.3); }
          [data-kdo-reveal] { opacity: 1; transform: none; }
          .kdo-parallax { animation: none !important; }
        }

        /* 결과 화면 가로 넘침 차단. 전역 overflow-x:clip 이라 넘친 내용은 가로 스크롤바 없이 그냥 잘린다 —
           ① 암시적 1열 그리드의 min-content 바닥을 0 으로 내리고
           ② 자동 최소폭에 밀리는 아이템을 풀고
           ③ 줄바꿈 불가한 긴 런을 끊는다(keep-all 단독은 못 끊고 break-word 는 min-content 를 안 줄인다). */
        .kdai-core-box, .kdo-today__more ul, .kdo-energy__list, .kdo-map__list,
        .kdo-action__list, .kdo-evidence dl, .kdo-evidence__wrap { grid-template-columns: minmax(0, 1fr); }

        .kdai-core-box__head, .kdai-core-box span, .kdo-today__more li,
        .kdo-core__keywords, .kdo-core__keywords em, .kdai-chapter__head h2,
        .kdo-evidence__row dt, .kdo-action__list li span { min-width: 0; }

        .kdai-report-hero h1, .kdai-report-hero p, .kdai-chapter__head h2, .kdo-synthesis > h2,
        .kdo-deck__toc li, .kdo-map__source, .kdo-letter .kdo-kicker,
        .kdo-core__line, .kdo-core__keywords em, .kdo-energy__list p, .kdo-radar__caption,
        .kdo-quote, .kdo-summary-line, .kdai-core-box span, .kdo-evidence__row dt,
        .kdo-action__list li, .kdo-today__line, .kdo-today__more li,
        .kdai-disclaimer, .kdo-loader p { overflow-wrap: anywhere; }
      `}</style>
    </>
  );
}
