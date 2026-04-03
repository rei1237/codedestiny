/**
 * _patch_saju_gate_ui.mjs
 * 사주 분석 화면 무료/유료 표시 개선 + 코인 디자인 lifebook 스타일 일괄 적용
 * 대상: public/[locale]/index.html (모든 로케일), public/static/index.html
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = 'c:\\Users\\Neo\\Desktop\\Code Destiny Main\\public';

const LOCALE_FILES = [
  'de-de/index.html',
  'en-us/index.html',
  'es-es/index.html',
  'fr-fr/index.html',
  'hi-in/index.html',
  'ja-jp/index.html',
  'ms-my/index.html',
  'nl-nl/index.html',
  'static/index.html',
  'zh-cn/index.html',
];

// ── CSS 교체 목록 ──────────────────────────────────────────────────────────────
const CSS_REPLACEMENTS = [
  // 코인 배지 개선 (paid)
  {
    from: `.tarot-tile__coin-badge{position:absolute;top:8px;left:8px;z-index:3;display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:999px;font-size:.68rem;font-weight:800;line-height:1;letter-spacing:.02em;white-space:nowrap;background:rgba(10,5,30,.78);color:#ede9fe;border:1px solid rgba(160,120,255,.5);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);box-shadow:0 2px 10px rgba(0,0,0,.45);pointer-events:none}.tarot-tile__coin-badge::before{content:"";display:inline-block;width:10px;height:10px;border-radius:50%;background:radial-gradient(circle at 33% 28%,#fffde0 0%,#ffd040 48%,#c97a08 100%);border:1px solid rgba(255,200,50,.55);box-shadow:0 0 4px rgba(255,195,40,.55),inset 0 1px 2px rgba(255,255,200,.6);flex-shrink:0}.tarot-tile__coin-badge--free::before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:radial-gradient(circle at 33% 28%,#d1fae5 0%,#6ee7b7 50%,#059669 100%);border:1px solid rgba(110,231,183,.55);box-shadow:none;flex-shrink:0}`,
    to:   `.tarot-tile__coin-badge{position:absolute;top:8px;left:8px;z-index:3;display:inline-flex;align-items:center;gap:6px;padding:5px 13px;border-radius:999px;font-size:.7rem;font-weight:900;line-height:1;letter-spacing:.03em;white-space:nowrap;background:rgba(10,5,30,.88);color:#ede9fe;border:1px solid rgba(160,120,255,.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 3px 12px rgba(0,0,0,.55),0 0 0 1px rgba(120,80,220,.12);pointer-events:none}.tarot-tile__coin-badge::before{content:"";display:inline-block;width:12px;height:12px;border-radius:50%;background:radial-gradient(circle at 33% 28%,#fffde0 0%,#ffd040 48%,#c97a08 100%);border:1px solid rgba(255,200,50,.6);box-shadow:0 0 7px rgba(255,195,40,.65),inset 0 1px 2px rgba(255,255,200,.6);flex-shrink:0}.tarot-tile__coin-badge--free::before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 33% 28%,#d1fae5 0%,#6ee7b7 50%,#059669 100%);border:1px solid rgba(110,231,183,.55);box-shadow:0 0 5px rgba(52,211,153,.35);flex-shrink:0}`,
  },
  // free 배지 색상 개선
  {
    from: `.tarot-tile__coin-badge--free{background:rgba(4,28,20,.88);border-color:rgba(90,210,150,.38);color:#6ee7b7}`,
    to:   `.tarot-tile__coin-badge--free{background:rgba(4,28,20,.92);border-color:rgba(52,211,153,.48);color:#34d399;font-weight:900}`,
  },
  // 게이트 오버레이 — 다크 프리미엄
  {
    from: `.cd-section-gate__overlay{position:absolute;inset:0;z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:linear-gradient(180deg,rgba(255,250,245,.08) 0%,rgba(255,245,230,.82) 52%,rgba(255,236,210,.97) 100%);border-radius:12px;padding:20px 16px;text-align:center}`,
    to:   `.cd-section-gate__overlay{position:absolute;inset:0;z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:linear-gradient(180deg,rgba(5,2,18,.82) 0%,rgba(8,3,25,.92) 52%,rgba(6,2,20,.97) 100%);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-radius:12px;padding:32px 22px;text-align:center;border:1px solid rgba(160,100,255,.18)}`,
  },
  // 게이트 아이콘 glow
  {
    from: `.cd-section-gate__icon{font-size:2.6rem;line-height:1}`,
    to:   `.cd-section-gate__icon{font-size:3rem;line-height:1;filter:drop-shadow(0 0 14px rgba(255,200,50,.48))}`,
  },
  // 게이트 타이틀 — 밝은 색으로
  {
    from: `.cd-section-gate__title{font-size:1.05rem;font-weight:900;color:#7c2e00;margin:0}`,
    to:   `.cd-section-gate__title{font-size:1.12rem;font-weight:900;color:#f0ebff;margin:0;letter-spacing:.02em;text-shadow:0 2px 12px rgba(0,0,0,.9)}`,
  },
  // 게이트 desc
  {
    from: `.cd-section-gate__desc{font-size:.84rem;color:#8a4620;line-height:1.5;margin:0;max-width:320px}`,
    to:   `.cd-section-gate__desc{font-size:.84rem;color:rgba(210,200,245,.85);line-height:1.58;margin:0;max-width:320px;text-shadow:0 1px 6px rgba(0,0,0,.7)}`,
  },
  // 게이트 버튼 — 황금 CTA
  {
    from: `.cd-section-gate__btn{display:inline-flex;align-items:center;gap:7px;border:none;border-radius:999px;padding:12px 26px;background:linear-gradient(135deg,#ff7aaa,#ffb15e);color:#fff;font-size:.91rem;font-weight:900;cursor:pointer;box-shadow:0 10px 24px rgba(219,89,55,.32);transition:transform .2s ease,box-shadow .2s ease;letter-spacing:.02em}`,
    to:   `.cd-section-gate__btn{display:inline-flex;align-items:center;gap:8px;border:none;border-radius:12px;padding:14px 28px;background:linear-gradient(90deg,#ffd54f 0%,#ffaa00 50%,#ff8c00 100%);color:#1a0a3a;font-size:.92rem;font-weight:900;cursor:pointer;box-shadow:0 4px 22px rgba(255,160,0,.48),inset 0 1px 0 rgba(255,255,220,.38);transition:filter .2s,transform .2s;letter-spacing:.03em}`,
  },
  // 게이트 버튼 hover
  {
    from: `.cd-section-gate__btn:hover{transform:translateY(-2px);box-shadow:0 14px 28px rgba(219,89,55,.42)}`,
    to:   `.cd-section-gate__btn:hover{filter:brightness(1.08);transform:translateY(-2px);box-shadow:0 8px 30px rgba(255,160,0,.58)}`,
  },
  // 게이트 배지 — lifebook PREMIUM badge 스타일
  {
    from: `.cd-section-gate__badge{display:inline-flex;align-items:center;gap:6px;padding:5px 14px 5px 10px;border-radius:999px;background:linear-gradient(135deg,rgba(255,193,87,.28),rgba(255,162,58,.22));color:#7a3a00;font-size:.76rem;font-weight:800;border:1px solid rgba(255,162,58,.38);box-shadow:0 2px 8px rgba(255,150,50,.12)}.cd-section-gate__badge::before{content:"";display:inline-block;width:11px;height:11px;border-radius:50%;background:radial-gradient(circle at 33% 28%,#fffde0 0%,#ffd040 46%,#c97a08 100%);border:1.5px solid rgba(255,200,50,.55);box-shadow:0 0 5px rgba(255,195,40,.5),inset 0 1px 2px rgba(255,255,200,.6);flex-shrink:0}`,
    to:   `.cd-section-gate__badge{display:inline-flex;align-items:center;gap:7px;padding:4px 12px 4px 9px;border-radius:5px;background:rgba(14,8,2,.82);color:#fde68a;font-size:.68rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;border:1px solid rgba(250,204,21,.55);box-shadow:0 2px 10px rgba(0,0,0,.55)}.cd-section-gate__badge::before{content:"";display:inline-block;width:12px;height:12px;border-radius:50%;background:radial-gradient(circle at 33% 28%,#fffde0 0%,#ffd040 46%,#c97a08 100%);border:1.5px solid rgba(255,200,50,.55);box-shadow:0 0 7px rgba(255,195,40,.6),inset 0 1px 2px rgba(255,255,200,.6);flex-shrink:0}`,
  },
  // 미디어 쿼리
  {
    from: `@media(max-width:600px){.cd-section-gate__overlay{padding:16px 12px}.cd-section-gate__btn{padding:11px 20px;font-size:.86rem}}`,
    to:   `@media(max-width:600px){.cd-section-gate__overlay{padding:22px 14px}.cd-section-gate__btn{padding:12px 22px;font-size:.86rem}}`,
  },
  // sec-tier-badge CSS 추가 (golden-unlock-area 앞에 삽입)
  {
    from: `.golden-unlock-area{margin-top:16px;padding:14px;border-radius:14px;border:1px solid rgba(255,182,121,0.34);background:linear-gradient(160deg,rgba(255,242,226,0.9),rgba(255,232,241,0.82))}`,
    to:   `.sec-tier-badge{display:inline-flex;align-items:center;vertical-align:middle;gap:4px;font-size:.58rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;border-radius:4px;padding:2px 7px;margin-left:7px;pointer-events:none;line-height:1.3}\n.sec-tier-badge--free{background:rgba(4,28,20,.9);color:#34d399;border:1px solid rgba(52,211,153,.42)}\n.sec-tier-badge--paid{background:rgba(14,8,2,.82);color:#fde68a;border:1px solid rgba(250,204,21,.5)}\n.golden-unlock-area{margin-top:16px;padding:14px;border-radius:14px;border:1px solid rgba(255,182,121,0.34);background:linear-gradient(160deg,rgba(255,242,226,0.9),rgba(255,232,241,0.82))}`,
  },
];

// ── HTML 교체 목록 ─────────────────────────────────────────────────────────────
const HTML_REPLACEMENTS = [
  // 사주 명식 FREE 배지
  {
    from: `<h3 id="sajuTitle" class="sec-title">🌸 사주 명식 (四柱命式)</h3>`,
    to:   `<h3 id="sajuTitle" class="sec-title">🌸 사주 명식 (四柱命式) <span class="sec-tier-badge sec-tier-badge--free">FREE</span></h3>`,
  },
  // 일주 FREE 배지
  {
    from: `<div class="sec-title ilju-sec-title">📖 나의 일주(日柱) 프로파일링</div>`,
    to:   `<div class="sec-title ilju-sec-title">📖 나의 일주(日柱) 프로파일링 <span class="sec-tier-badge sec-tier-badge--free">FREE</span></div>`,
  },
  // 십성 FREE 배지
  {
    from: `<div class="sec-title">🎴 보유 십성 (十星) — 탭하면 상세 분석!</div>`,
    to:   `<div class="sec-title">🎴 보유 십성 (十星) — 탭하면 상세 분석! <span class="sec-tier-badge sec-tier-badge--free">FREE</span></div>`,
  },
  // 조후 FREE 배지
  {
    from: `<div class="sec-title">🌡️ 한난조습 (寒暖燥濕) 조후 분석</div>`,
    to:   `<div class="sec-title">🌡️ 한난조습 (寒暖燥濕) 조후 분석 <span class="sec-tier-badge sec-tier-badge--free">FREE</span></div>`,
  },
  // 억부 FREE 배지
  {
    from: `<div class="sec-title">⚖️ 억부(抑扶) · 종격(從格) 분석</div>`,
    to:   `<div class="sec-title">⚖️ 억부(抑扶) · 종격(從格) 분석 <span class="sec-tier-badge sec-tier-badge--free">FREE</span></div>`,
  },
  // 대운 PREMIUM 배지
  {
    from: `<h3 id="daewunTitle" class="sec-title">🔮 대운 (大運) — 억부+조후+종격 통합 판단</h3>`,
    to:   `<h3 id="daewunTitle" class="sec-title">🔮 대운 (大運) — 억부+조후+종격 통합 판단 <span class="sec-tier-badge sec-tier-badge--paid">PREMIUM</span></h3>`,
  },
  // 종합 사주 PREMIUM 배지
  {
    from: `<h3 id="summaryTitle" class="sec-title">📖 종합 사주 풀이</h3>`,
    to:   `<h3 id="summaryTitle" class="sec-title">📖 종합 사주 풀이 <span class="sec-tier-badge sec-tier-badge--paid">PREMIUM</span></h3>`,
  },
  // 궁합 PREMIUM 배지
  {
    from: `<h3 id="compatTitle" class="sec-title">💞 궁합 보기 (연애 · 사업 · 친구)</h3>`,
    to:   `<h3 id="compatTitle" class="sec-title">💞 궁합 보기 (연애 · 사업 · 친구) <span class="sec-tier-badge sec-tier-badge--paid">PREMIUM</span></h3>`,
  },
  // 게이트 아이콘/타이틀/설명 — 대운
  {
    from: `          <div class="cd-section-gate__icon">🔒</div>
          <p class="cd-section-gate__title">대운 분석 — 유료 콘텐츠</p>
          <p class="cd-section-gate__desc">억부·조후·종격 통합 대운 흐름과 인생 길흉 그래프를 열람하려면 황금 돼지 코인이 필요합니다.</p>`,
    to:   `          <div class="cd-section-gate__icon">🔐</div>
          <p class="cd-section-gate__title">대운 분석 — 프리미엄 콘텐츠</p>
          <p class="cd-section-gate__desc">억부·조후·종격 통합 대운 흐름과 인생 길흉 그래프를 열람하려면 코인이 필요합니다.</p>`,
  },
  // 게이트 아이콘/타이틀/설명 — 종합 사주
  {
    from: `          <div class="cd-section-gate__icon">🔒</div>
          <p class="cd-section-gate__title">종합 사주 풀이 — 유료 콘텐츠</p>
          <p class="cd-section-gate__desc">A4 20페이지 분량의 성격·진로·연애·건강·재물·귀인·개운 심층 풀이를 열람하려면 황금 돼지 코인이 필요합니다.</p>`,
    to:   `          <div class="cd-section-gate__icon">🔐</div>
          <p class="cd-section-gate__title">종합 사주 풀이 — 프리미엄 콘텐츠</p>
          <p class="cd-section-gate__desc">A4 20페이지 분량의 성격·진로·연애·건강·재물·귀인·개운 심층 풀이를 열람하려면 코인이 필요합니다.</p>`,
  },
  // 게이트 아이콘/타이틀/설명 — 궁합
  {
    from: `          <div class="cd-section-gate__icon">🔒</div>
          <p class="cd-section-gate__title">궁합 분석 — 유료 콘텐츠</p>
          <p class="cd-section-gate__desc">연애·사업·친구 궁합을 사주 기반으로 분석한 결과를 열람하려면 황금 돼지 코인이 필요합니다.</p>`,
    to:   `          <div class="cd-section-gate__icon">🔐</div>
          <p class="cd-section-gate__title">궁합 분석 — 프리미엄 콘텐츠</p>
          <p class="cd-section-gate__desc">연애·사업·친구 궁합을 사주 기반으로 분석한 결과를 열람하려면 코인이 필요합니다.</p>`,
  },
  // 게이트 버튼 🐷 → 🪙 (대운)
  {
    from: `data-unlock-key="section_daewun" data-unlock-cost="50">🐷 50코인으로 잠금 해제</button>`,
    to:   `data-unlock-key="section_daewun" data-unlock-cost="50">🪙 50코인으로 잠금 해제</button>`,
  },
  // 게이트 버튼 🐷 → 🪙 (종합 사주)
  {
    from: `data-unlock-key="section_summary" data-unlock-cost="50">🐷 50코인으로 잠금 해제</button>`,
    to:   `data-unlock-key="section_summary" data-unlock-cost="50">🪙 50코인으로 잠금 해제</button>`,
  },
  // 게이트 버튼 🐷 → 🪙 (궁합)
  {
    from: `data-unlock-key="section_compat" data-unlock-cost="50">🐷 50코인으로 잠금 해제</button>`,
    to:   `data-unlock-key="section_compat" data-unlock-cost="50">🪙 50코인으로 잠금 해제</button>`,
  },
];

let totalFiles = 0;
let totalChanges = 0;

for (const relPath of LOCALE_FILES) {
  const fullPath = join(ROOT, relPath);
  let content;
  try {
    content = readFileSync(fullPath, 'utf8');
  } catch {
    console.warn(`[SKIP] ${relPath} — not found`);
    continue;
  }

  let changed = 0;

  for (const { from, to } of [...CSS_REPLACEMENTS, ...HTML_REPLACEMENTS]) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      changed++;
    }
  }

  if (changed > 0) {
    writeFileSync(fullPath, content, 'utf8');
    console.log(`[OK] ${relPath} — ${changed} replacement(s)`);
    totalChanges += changed;
    totalFiles++;
  } else {
    console.log(`[--] ${relPath} — already up to date or no match`);
  }
}

console.log(`\n✅ Done: ${totalFiles} files updated, ${totalChanges} total replacements.`);
