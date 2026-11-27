// 액땜 카드 정적 HTML(2026-11-27 R1). 정적 유료 사주의 ⑭ 뒤 <!--saju-ext--> 상자 본문으로 쓴다.
// 돌려주는 것은 상자 본문뿐이다. 상자는 부르는 쪽이 paid-renderers 의 box('remedy', 제목, 본문, accent, bg)로 감싼다.
// 글자와 속성값은 전부 이스케이프한다. 모델이 null 이거나 어디서든 예외가 나면 '' 를 돌려준다(본문을 막지 않는다).
// 색은 var(--cd-*) 토큰만 쓴다 — body.neo-mode 에서 저절로 뒤집힌다. color-mix·oklch 는 캡처가 못 읽어 쓰지 않는다.
// neo-mode 의 `.prem-text b`(금색)·`.prem-text span`(옅은 하늘색) 강제 색을 피하려고, 강조 색을 지킬 이름표는 <strong> 으로 쓴다.
// 글자 크기는 px 다 — 정적 셸은 좁은 화면에서 루트 글자가 14px 라 rem 이 12px 아래로 줄어든다(2026-11-27 실측).
// 나머지 장은 JS 없는 <details> 로 접는다. 그림은 고정 비율 상자 + width·height + 즉시 로딩이다.
import { buildRemedyCardModel } from './index.mjs';
import { remedyImageFrame } from './frames.mjs';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ESC[ch]);

const BORDER = 'var(--cd-border,rgba(216,63,120,.16))';
const ACCENT = 'var(--cd-accent,#b31955)';
const TEXT = 'var(--cd-text,#3c1830)';
const MUTED = 'var(--cd-text-muted,#70445c)';
const SURFACE = 'var(--cd-surface,rgba(255,255,255,.96))';
const SURFACE_2 = 'var(--cd-surface-2,rgba(255,247,250,.84))';

function cardHtml(card, model) {
  const frame = remedyImageFrame(model.narrator);
  const cutout = frame.fit === 'cutout';
  const frameStyle = `flex:0 0 5.5rem;width:5.5rem;aspect-ratio:${frame.width} / ${frame.height};overflow:hidden;border-radius:12px`
    + (cutout ? '' : `;border:1px solid ${BORDER};background:${SURFACE}`);
  const imgStyle = `display:block;width:100%;height:100%;object-fit:${cutout ? 'contain' : 'cover'}${cutout ? ';object-position:bottom' : ''}`;
  const methods = card.methods.map((m) => `<li><b>${esc(m.title)}</b> ${esc(m.text)}</li>`).join('');
  return `<section class="saju-remedy-card" data-remedy-case="${esc(card.caseId)}" data-tone="${esc(card.tone)}" style="margin:12px 0 0;padding:15px 16px;border:1px solid ${BORDER};border-radius:12px;background:${SURFACE_2};break-inside:avoid">`
    + (card.period.label ? `<strong class="saju-remedy-period" style="display:inline-block;padding:2px 10px;border:1px solid ${BORDER};border-radius:999px;color:${ACCENT};font-size:13px;font-weight:700;line-height:1.5">${esc(card.period.label)}</strong>` : '')
    + `<b class="saju-summary-subhead saju-remedy-title" style="--saju-subhead-color:${ACCENT};margin:6px 0 0">${esc(card.title)}</b>`
    + (card.evidenceLine ? `<p class="saju-remedy-evidence" style="margin:6px 0 0;color:${MUTED};font-size:14px;line-height:1.7">${esc(card.evidenceLine)}</p>` : '')
    + `<div class="saju-remedy-say" style="display:flex;align-items:flex-end;gap:12px;margin:12px 0 4px">`
    + `<div class="saju-remedy-frame" style="${frameStyle}"><img src="${esc(card.image.src)}" alt="${esc(card.image.alt)}" width="${frame.width}" height="${frame.height}" loading="eager" decoding="async" style="${imgStyle}"></div>`
    + (card.line ? `<p class="saju-remedy-bubble" style="flex:1 1 auto;min-width:0;margin:0 0 6px;padding:10px 13px;border:1px solid ${BORDER};border-radius:20px 20px 20px 8px;background:${SURFACE};color:${TEXT};font-size:15px;line-height:1.65"><strong style="display:block;margin-bottom:2px;color:${ACCENT};font-size:13px">${esc(model.narratorName)}</strong>${esc(card.line)}</p>` : '')
    + `</div>`
    + `<ul class="saju-summary-list saju-remedy-methods">${methods}</ul>`
    + `<div class="saju-remedy-custom" style="margin:10px 0 0;padding:10px 12px;border-radius:12px;background:${SURFACE}">`
    + `<strong style="display:block;margin-bottom:4px;color:${ACCENT};font-size:13px;font-weight:700">${esc(card.custom.label)}</strong>`
    + `<p style="margin:0;color:${TEXT};font-size:15px;line-height:1.7"><b>${esc(card.custom.title)}</b> ${esc(card.custom.text)}</p>`
    + `</div>`
    + `<p class="saju-remedy-disclaimer" style="margin:10px 0 0;color:${MUTED};font-size:13px;line-height:1.6">${esc(model.disclaimer)}</p>`
    + `</section>`;
}

/**
 * 액땜 카드 상자 본문 HTML. 실패·빈 결과·ko 외 로케일이면 ''.
 * @param {object} result 저장된 computeRemedyCases 결과
 * @param {{narrator?:'yeoni'|'yeoni-saju'|'yeongnyangi'|'neo'|'musung', tone?:'auto'|'caution'|'explain', visible?:number}} [opts]
 * @returns {string}
 */
export function renderRemedyCardsHtml(result, opts = {}) {
  try {
    const model = buildRemedyCardModel(result, opts);
    if (!model) return '';
    const head = model.cards.slice(0, model.visible).map((card) => cardHtml(card, model)).join('');
    const rest = model.cards.slice(model.visible).map((card) => cardHtml(card, model)).join('');
    const more = rest
      ? `<details class="saju-remedy-more" style="margin:12px 0 0">`
        + `<summary data-html2canvas-ignore="true" style="min-height:44px;box-sizing:border-box;padding:10px 14px;border:1px solid ${BORDER};border-radius:12px;color:${ACCENT};font-size:15px;font-weight:800;text-align:center;cursor:pointer">${esc(model.moreLabel)}</summary>`
        + rest
        + `</details>`
      : '';
    return `<div class="saju-remedy" data-remedy-cards="" data-narrator="${esc(model.narrator)}">`
      + `<div class="saju-remedy-intro" style="font-size:14px;line-height:1.78;margin-bottom:8px">${esc(model.intro)}</div>`
      + head
      + more
      + `</div>`;
  } catch {
    return '';
  }
}
