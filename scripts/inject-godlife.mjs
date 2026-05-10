import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const filePath = resolve(__dirname, '../index.html');

let html = readFileSync(filePath, 'utf8');

// ─── 1. godlife 그룹 HTML 삽입 ───────────────────────────────
const FLOWER_END_MARKER = `          </div><!-- /fg-group__cards --></section><!-- /fg-group--flower -->

    </div>
    <!-- ═══ / 부가 기능 카드 그리드 ═══ -->

      <!-- 드림 타로 모달 -->`;

const GODLIFE_GROUP = `          </div><!-- /fg-group__cards --></section><!-- /fg-group--flower -->

        <!-- ══════════════════════════════════════
             GROUP: 운기·기일 다이어리
        ══════════════════════════════════════ -->
        <section class="fg-group fg-group--godlife" aria-labelledby="fgTitleGodlife">
          <div class="fg-group__cards">

            <div class="godlife-collection feat-collection--godlife" id="godlifeCollection">
              <div class="feat-collection__cosmos" aria-hidden="true">
                <span class="fc-star fc-star--1"></span>
                <span class="fc-star fc-star--2"></span>
                <span class="fc-star fc-star--3"></span>
                <span class="fc-star fc-star--4"></span>
                <span class="fc-star fc-star--5"></span>
                <span class="fc-star fc-star--6"></span>
              </div>

              <div class="godlife-collection-body">
                <div class="godlife-header-wrap">
                  <div class="godlife-icon-wrap" aria-hidden="true">
                    <img src="/fuctionassets/godlife.webp" alt="" class="godlife-header-img" width="72" height="72" loading="lazy" decoding="async">
                  </div>
                  <div class="godlife-header-text">
                    <h3 class="godlife-title" id="fgTitleGodlife">✨ 운기·기일 다이어리</h3>
                    <p class="godlife-subtitle">오늘의 운기 흐름을 기록하고 내일의 리듬을 설계하는 Luck-Sync 다이어리</p>
                  </div>
                </div>

                <div class="godlife-features">
                  <span class="godlife-feat-chip">📊 오늘의 운기 요약</span>
                  <span class="godlife-feat-chip">🎰 행운 아이템 리딩</span>
                  <span class="godlife-feat-chip">✅ 오운완 루틴</span>
                  <span class="godlife-feat-chip">🌙 밤 리플렉션</span>
                  <span class="godlife-feat-chip">📅 날짜별 저장</span>
                </div>

                <button class="godlife-open-btn" type="button"
                        data-action="openLuckSyncDiary"
                        aria-label="운기 기일 다이어리 열기">
                  <div class="godlife-btn-inner">
                    <div class="godlife-btn-img-wrap" aria-hidden="true">
                      <img src="/fuctionassets/godlife.webp" alt="" width="56" height="56" loading="lazy" decoding="async">
                    </div>
                    <div class="godlife-btn-text">
                      <span class="godlife-btn-title">📔 다이어리 열기</span>
                      <span class="godlife-btn-desc">오늘의 흐름을 확인하고 하루 리듬을 정리해보세요.</span>
                    </div>
                    <span class="godlife-btn-arrow">▶</span>
                  </div>
                </button>
              </div>

            </div><!-- /feat-collection--godlife -->

          </div><!-- /fg-group__cards -->
        </section><!-- /fg-group--godlife -->

    </div>
    <!-- ═══ / 부가 기능 카드 그리드 ═══ -->

      <!-- 드림 타로 모달 -->`;

if (!html.includes(FLOWER_END_MARKER)) {
  console.error('❌ [1] flower 섹션 마커를 찾을 수 없습니다');
  process.exit(1);
}
html = html.replace(FLOWER_END_MARKER, GODLIFE_GROUP);
console.log('[1] godlife 그룹 HTML 삽입 완료');

// ─── 2. 스크립트 태그 삽입 ───────────────────────────────────
const SCRIPT_MARKER = `<script src="/js/dream-meaning-library.js" defer></script>
<script src="/lib/ai-engine.js" defer></script>
<script src="/js/dream-ledger.js" defer></script>`;

const SCRIPT_WITH_LSD = `<script src="/js/dream-meaning-library.js" defer></script>
<script src="/lib/ai-engine.js" defer></script>
<script src="/js/luck-sync-diary.js" defer></script>
<script src="/js/dream-ledger.js" defer></script>`;

if (!html.includes(SCRIPT_MARKER)) {
  console.error('❌ [2] 스크립트 마커를 찾을 수 없습니다');
  process.exit(1);
}
html = html.replace(SCRIPT_MARKER, SCRIPT_WITH_LSD);
console.log('[2] 스크립트 태그 삽입 완료');

// ─── 3. CSS 스타일 삽입 ─────────────────────────────────────
const CSS_MARKER = `  <link rel="stylesheet" href="/styles/mobile-ux.css?v=20260323-navscrollfix2">
</head>`;

const LSD_CSS = `  <link rel="stylesheet" href="/styles/mobile-ux.css?v=20260323-navscrollfix2">
<style id="lsd-styles">
/* ════════════════════════════════════════════════════════════
  Luck-Sync Diary — 운기·기일 다이어리
   ════════════════════════════════════════════════════════════ */

/* ── 랜딩 카드 그룹 ── */
.fg-group--godlife { margin-top: 12px; }
.feat-collection--godlife {
  background: linear-gradient(135deg,#0f0c29 0%,#1a1040 50%,#100c2a 100%);
  border:1.5px solid rgba(129,140,248,.35);
  border-radius:20px;overflow:hidden;position:relative;
}
.feat-collection--godlife::before {
  content:'';position:absolute;inset:0;
  background:linear-gradient(120deg,rgba(129,140,248,.08) 0%,transparent 60%);
  pointer-events:none;
}
.godlife-collection-body{padding:24px 20px;}
.godlife-header-wrap{display:flex;align-items:center;gap:16px;margin-bottom:16px;}
.godlife-icon-wrap{flex-shrink:0;width:72px;height:72px;border-radius:16px;overflow:hidden;
  background:rgba(129,140,248,.15);border:1.5px solid rgba(129,140,248,.4);
  box-shadow:0 0 20px rgba(129,140,248,.3);}
.godlife-header-img{width:100%;height:100%;object-fit:cover;display:block;}
.godlife-header-text{flex:1;}
.godlife-title{font-size:1.1rem;font-weight:700;color:#e0e7ff;margin:0 0 4px;line-height:1.3;}
.godlife-subtitle{font-size:.82rem;color:rgba(199,210,254,.75);margin:0;line-height:1.4;}
.godlife-features{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:18px;}
.godlife-feat-chip{font-size:.75rem;padding:4px 10px;border-radius:999px;
  background:rgba(129,140,248,.12);border:1px solid rgba(129,140,248,.3);
  color:#c7d2fe;white-space:nowrap;}
.godlife-open-btn{width:100%;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a78bfa 100%);
  border:none;border-radius:14px;cursor:pointer;padding:0;
  transition:transform .2s,box-shadow .2s;
  box-shadow:0 4px 20px rgba(99,102,241,.45),0 0 40px rgba(139,92,246,.2);}
.godlife-open-btn:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(99,102,241,.55),0 0 50px rgba(139,92,246,.3);}
.godlife-open-btn:active{transform:translateY(0);}
.godlife-btn-inner{display:flex;align-items:center;gap:14px;padding:14px 18px;}
.godlife-btn-img-wrap{width:56px;height:56px;border-radius:12px;overflow:hidden;flex-shrink:0;
  background:rgba(255,255,255,.15);border:1.5px solid rgba(255,255,255,.25);}
.godlife-btn-img-wrap img{width:100%;height:100%;object-fit:cover;}
.godlife-btn-text{flex:1;text-align:left;}
.godlife-btn-title{display:block;font-size:1rem;font-weight:700;color:#fff;margin-bottom:3px;}
.godlife-btn-desc{display:block;font-size:.8rem;color:rgba(255,255,255,.8);}
.godlife-btn-arrow{font-size:1.2rem;color:rgba(255,255,255,.7);flex-shrink:0;}

/* ── 모달 오버레이 ── */
.lsd-overlay{position:fixed;inset:0;background:rgba(5,5,20,.85);backdrop-filter:blur(6px);
  -webkit-backdrop-filter:blur(6px);display:none;align-items:flex-start;justify-content:center;
  z-index:2000;padding:12px;overflow-y:auto;-webkit-overflow-scrolling:touch;}
.lsd-shell{position:relative;width:100%;max-width:560px;
  background:linear-gradient(160deg,#0d0b1e 0%,#130f30 60%,#0d0b1e 100%);
  border:1.5px solid rgba(129,140,248,.3);border-radius:24px;overflow:hidden;margin:auto;
  box-shadow:0 20px 60px rgba(0,0,0,.7),0 0 0 1px rgba(129,140,248,.1);}
.lsd-close{position:absolute;top:12px;right:16px;background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.7);border-radius:50%;
  width:32px;height:32px;cursor:pointer;font-size:1rem;display:flex;align-items:center;
  justify-content:center;transition:background .2s;z-index:10;}
.lsd-close:hover{background:rgba(239,68,68,.3);color:#fff;}

/* ── 헤더 ── */
.lsd-header{position:relative;text-align:center;padding:28px 20px 20px;overflow:hidden;}
.lsd-header-glow{position:absolute;inset:0;
  background:radial-gradient(ellipse at 50% 0%,rgba(129,140,248,.25) 0%,transparent 70%);
  pointer-events:none;}
.lsd-header-img-wrap{width:80px;height:80px;border-radius:20px;overflow:hidden;margin:0 auto 12px;
  border:2px solid rgba(129,140,248,.5);box-shadow:0 0 24px rgba(129,140,248,.4);}
.lsd-header-img{width:100%;height:100%;object-fit:cover;display:block;}
.lsd-kicker{font-size:.72rem;letter-spacing:.15em;color:#818cf8;text-transform:uppercase;margin-bottom:6px;}
.lsd-title{font-size:1.35rem;font-weight:800;color:#e0e7ff;margin:0 0 6px;
  background:linear-gradient(90deg,#a78bfa,#818cf8,#60a5fa);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.lsd-sub{font-size:.82rem;color:rgba(199,210,254,.7);margin:0;}

/* ── 탭 ── */
.lsd-tabs{display:flex;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;
  border-bottom:1px solid rgba(129,140,248,.15);padding:0 12px;gap:2px;}
.lsd-tabs::-webkit-scrollbar{display:none;}
.lsd-tab{flex-shrink:0;background:none;border:none;border-radius:8px 8px 0 0;
  color:rgba(199,210,254,.6);cursor:pointer;font-size:.78rem;padding:10px 12px;
  transition:color .2s,background .2s;white-space:nowrap;}
.lsd-tab:hover{color:#c7d2fe;background:rgba(129,140,248,.08);}
.lsd-tab.is-active{color:#a78bfa;border-bottom:2px solid #818cf8;font-weight:700;}

/* ── 패널 ── */
.lsd-panel{padding:18px 18px 24px;}
.lsd-section-title{font-size:.95rem;font-weight:700;color:#c7d2fe;margin:0 0 4px;}
.lsd-section-sub{font-size:.78rem;color:rgba(199,210,254,.55);margin:0 0 16px;}

/* ── 사주 위젯 ── */
.lsd-saju-widget{background:rgba(129,140,248,.07);border:1px solid rgba(129,140,248,.2);
  border-radius:14px;padding:14px 16px;margin-bottom:14px;}
.lsd-widget-label{font-size:.72rem;color:#818cf8;letter-spacing:.05em;margin-bottom:6px;}
.lsd-daymaster{font-size:1.4rem;font-weight:700;margin-bottom:10px;line-height:1.3;}
.lsd-widget-badges{display:flex;flex-wrap:wrap;gap:6px;}
.lsd-elem-badge{font-size:.75rem;padding:4px 10px;border-radius:999px;border:1px solid;
  display:inline-flex;align-items:center;gap:3px;font-weight:600;}
.lsd-elem-badge.is-yong{box-shadow:0 0 8px currentColor;}
.lsd-badge-tag{font-size:.65rem;padding:1px 5px;background:rgba(255,255,255,.15);border-radius:4px;margin-left:2px;}
.lsd-badge-tag--ki{background:rgba(239,68,68,.25);color:#fca5a5;}

/* ── 에너지 카드 ── */
.lsd-energy-card{background:rgba(99,102,241,.1);border:1.5px solid rgba(99,102,241,.35);
  border-radius:14px;padding:14px 16px;margin-bottom:14px;transition:border-color .3s;}
.lsd-energy-top{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:10px;}
.lsd-energy-iljin{font-size:.85rem;color:#c7d2fe;flex:1;min-width:0;}
.lsd-iljin-elem{font-size:.78rem;color:rgba(199,210,254,.7);}
.lsd-energy-star{font-size:.85rem;color:#c7d2fe;white-space:nowrap;}
.lsd-energy-guide{font-size:.85rem;color:#e0e7ff;line-height:1.55;font-weight:500;}

/* ── 레이더 차트 ── */
.lsd-radar-wrap{background:rgba(15,12,35,.6);border:1px solid rgba(129,140,248,.15);
  border-radius:14px;padding:14px 16px;}
.lsd-radar-container{display:flex;justify-content:center;margin:8px 0;}
.lsd-radar{display:block;max-width:300px;height:auto;}
.lsd-luck-elem-row{text-align:center;font-size:.82rem;color:rgba(199,210,254,.7);margin-top:8px;}

/* ── 가챠 머신 ── */
.lsd-machine{display:flex;flex-direction:column;align-items:center;gap:16px;padding:16px 0;}
.lsd-machine-globe{width:180px;height:180px;border-radius:50%;
  background:radial-gradient(circle at 35% 35%,rgba(129,140,248,.2),rgba(10,8,30,.95));
  border:2px solid rgba(129,140,248,.4);
  box-shadow:inset 0 0 30px rgba(129,140,248,.2),0 0 40px rgba(129,140,248,.25),0 0 80px rgba(99,102,241,.15);
  position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;}
.lsd-machine-shine{position:absolute;top:10%;left:15%;width:35%;height:30%;
  background:radial-gradient(ellipse,rgba(255,255,255,.18) 0%,transparent 70%);
  border-radius:50%;pointer-events:none;}
.lsd-globe-inner{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:center;padding:16px;}
.lsd-globe-inner.is-spinning .lsd-ball{animation:lsdBallSpin .4s linear infinite;}
@keyframes lsdBallSpin{
  0%{transform:translate(0,0) rotate(0deg);}
  25%{transform:translate(8px,-10px) rotate(90deg);}
  50%{transform:translate(-8px,5px) rotate(180deg);}
  75%{transform:translate(5px,10px) rotate(270deg);}
  100%{transform:translate(0,0) rotate(360deg);}
}
.lsd-ball{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-size:.75rem;font-weight:900;color:#fff;
  text-shadow:0 1px 3px rgba(0,0,0,.5);flex-shrink:0;}
.lsd-ball--wood {background:radial-gradient(circle at 35% 35%,#4ade80,#15803d);box-shadow:0 0 12px #22c55e88;}
.lsd-ball--fire {background:radial-gradient(circle at 35% 35%,#fb923c,#c2410c);box-shadow:0 0 12px #f9731688;}
.lsd-ball--earth{background:radial-gradient(circle at 35% 35%,#fbbf24,#92400e);box-shadow:0 0 12px #d9770688;}
.lsd-ball--metal{background:radial-gradient(circle at 35% 35%,#e2e8f0,#64748b);box-shadow:0 0 12px #94a3b888;}
.lsd-ball--water{background:radial-gradient(circle at 35% 35%,#7dd3fc,#1d4ed8);box-shadow:0 0 12px #60a5fa88;}
.lsd-lucky-elem-hint{font-size:.82rem;color:rgba(199,210,254,.75);text-align:center;}
.lsd-lotto-btn{background:linear-gradient(135deg,#7c3aed,#4f46e5);border:none;border-radius:14px;
  color:#fff;cursor:pointer;font-size:1rem;font-weight:700;padding:14px 28px;
  transition:transform .15s,box-shadow .15s;box-shadow:0 4px 20px rgba(124,58,237,.5);letter-spacing:.02em;}
.lsd-lotto-btn:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(124,58,237,.6);}
.lsd-lotto-btn:active{transform:translateY(0);}
.lsd-lotto-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;}

/* ── 가챠 결과 ── */
.lsd-lotto-result{text-align:center;padding:16px;border-radius:16px;
  background:rgba(129,140,248,.08);border:1px solid rgba(129,140,248,.2);margin-top:8px;width:100%;}
.lsd-lotto-result.lsd-result--pop{animation:lsdPop .35s cubic-bezier(.34,1.56,.64,1);}
@keyframes lsdPop{0%{transform:scale(.7);opacity:0;}100%{transform:scale(1);opacity:1;}}
.lsd-result-ball{width:72px;height:72px;border-radius:50%;margin:0 auto 10px;display:flex;
  align-items:center;justify-content:center;font-size:1.4rem;font-weight:900;color:#fff;}
.lsd-result-emoji{font-size:2.4rem;margin-bottom:6px;}
.lsd-result-name{font-size:1.1rem;font-weight:700;color:#e0e7ff;margin-bottom:6px;}
.lsd-result-tip{font-size:.85rem;color:rgba(199,210,254,.8);line-height:1.55;margin-bottom:12px;}
.lsd-lotto-redraw{background:rgba(129,140,248,.15);border:1px solid rgba(129,140,248,.35);
  border-radius:10px;color:#c7d2fe;cursor:pointer;font-size:.85rem;padding:8px 18px;transition:background .2s;}
.lsd-lotto-redraw:hover{background:rgba(129,140,248,.28);}

/* ── 챌린지 ── */
.lsd-challenges{display:flex;flex-direction:column;gap:8px;margin-bottom:18px;}
.lsd-challenge-item{display:flex;align-items:center;gap:12px;background:rgba(129,140,248,.07);
  border:1px solid rgba(129,140,248,.18);border-radius:10px;padding:10px 14px;cursor:pointer;
  transition:background .2s,border-color .2s;user-select:none;}
.lsd-challenge-item:hover{background:rgba(129,140,248,.13);}
.lsd-challenge-item.is-done{background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.35);}
.lsd-check-box{width:22px;height:22px;border-radius:6px;border:2px solid rgba(129,140,248,.5);
  flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:.75rem;
  color:#4ade80;background:rgba(255,255,255,.03);transition:border-color .2s,background .2s;}
.is-done .lsd-check-box{border-color:#22c55e;background:rgba(34,197,94,.2);}
.lsd-challenge-text{font-size:.85rem;color:#c7d2fe;line-height:1.4;flex:1;}
.is-done .lsd-challenge-text{color:rgba(199,210,254,.55);text-decoration:line-through;}

/* ── 기분 ── */
.lsd-mood-row{margin-top:6px;}
.lsd-mood-label{font-size:.82rem;color:rgba(199,210,254,.65);margin-bottom:8px;}
.lsd-mood-emojis{display:flex;gap:8px;flex-wrap:wrap;}
.lsd-mood-btn{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.05);
  border:1.5px solid rgba(255,255,255,.1);cursor:pointer;font-size:1.3rem;display:flex;
  align-items:center;justify-content:center;transition:transform .15s,border-color .15s,box-shadow .15s;}
.lsd-mood-btn:hover{transform:scale(1.15);border-color:rgba(129,140,248,.5);}
.lsd-mood-btn.is-active{border-color:#818cf8;box-shadow:0 0 12px #818cf888;transform:scale(1.2);
  background:rgba(129,140,248,.15);}

/* ── 야간 회고 ── */
.lsd-night-match{margin-bottom:16px;}
.lsd-night-label{font-size:.82rem;color:rgba(199,210,254,.7);margin-bottom:8px;}
.lsd-match-btns{display:flex;gap:8px;flex-wrap:wrap;}
.lsd-match-btn{background:rgba(129,140,248,.1);border:1.5px solid rgba(129,140,248,.25);
  border-radius:10px;color:#c7d2fe;cursor:pointer;font-size:.82rem;padding:8px 14px;transition:background .2s,border-color .2s;}
.lsd-match-btn:hover{background:rgba(129,140,248,.2);}
.lsd-match-btn.is-active{background:rgba(129,140,248,.25);border-color:#818cf8;color:#a78bfa;font-weight:700;}
.lsd-diary-label{display:block;font-size:.82rem;color:rgba(199,210,254,.7);margin-bottom:8px;}
.lsd-diary-textarea{width:100%;min-height:100px;background:rgba(255,255,255,.04);
  border:1.5px solid rgba(129,140,248,.25);border-radius:12px;color:#e0e7ff;font-size:.88rem;
  line-height:1.6;padding:12px 14px;resize:vertical;outline:none;transition:border-color .2s;
  box-sizing:border-box;font-family:inherit;}
.lsd-diary-textarea::placeholder{color:rgba(199,210,254,.35);}
.lsd-diary-textarea:focus{border-color:#818cf8;}
.lsd-char-count{font-size:.72rem;color:rgba(199,210,254,.4);text-align:right;margin:4px 0 12px;}
.lsd-save-btn{width:100%;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;
  border-radius:12px;color:#fff;cursor:pointer;font-size:.92rem;font-weight:700;padding:12px;
  transition:opacity .2s,transform .2s;}
.lsd-save-btn:hover{opacity:.9;transform:translateY(-1px);}
.lsd-save-feedback{text-align:center;color:#4ade80;font-size:.85rem;margin-top:8px;font-weight:600;}

/* ── 기록 ── */
.lsd-history-list{display:flex;flex-direction:column;gap:10px;margin-bottom:16px;}
.lsd-history-item{background:rgba(129,140,248,.07);border:1px solid rgba(129,140,248,.18);
  border-radius:12px;padding:12px 14px;}
.lsd-history-date{font-size:.82rem;font-weight:700;color:#a78bfa;margin-bottom:6px;}
.lsd-history-meta{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;}
.lsd-history-tag{font-size:.72rem;padding:3px 8px;background:rgba(129,140,248,.12);
  border-radius:999px;color:#c7d2fe;}
.lsd-history-log{font-size:.82rem;color:rgba(199,210,254,.7);font-style:italic;line-height:1.5;}
.lsd-empty{font-size:.85rem;color:rgba(199,210,254,.4);text-align:center;padding:20px 0;}
.lsd-clear-btn{width:100%;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);
  border-radius:10px;color:#fca5a5;cursor:pointer;font-size:.82rem;padding:10px;transition:background .2s;}
.lsd-clear-btn:hover{background:rgba(239,68,68,.2);}

/* ── 모바일 ── */
@media(max-width:600px){
  .lsd-shell{border-radius:18px;}
  .lsd-title{font-size:1.15rem;}
  .lsd-machine-globe{width:150px;height:150px;}
  .lsd-ball{width:32px;height:32px;font-size:.68rem;}
  .godlife-header-wrap{flex-direction:column;text-align:center;}
  .godlife-btn-inner{padding:12px 14px;gap:10px;}
}
</style>
</head>`;

if (!html.includes(CSS_MARKER)) {
  console.error('❌ [3] CSS 마커를 찾을 수 없습니다');
  process.exit(1);
}
if (!html.includes('id="lsd-styles"')) {
  html = html.replace(CSS_MARKER, LSD_CSS);
  console.log('[3] CSS 스타일 삽입 완료');
} else {
  console.log('[3] CSS가 이미 삽입되어 있습니다');
}

writeFileSync(filePath, html, 'utf8');
console.log('✅ index.html 저장 완료');

const lineCount = html.split('\n').length;
console.log(`총 라인 수: ${lineCount}`);
