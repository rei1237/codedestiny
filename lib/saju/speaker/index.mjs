// 사주 풀이의 화자 말풍선(연이·영냥이). 브라우저는 전역 CdSajuSpeaker 번들로, 워커는 이 파일을 직접 import 해서 같은 마크업을 쓴다.
// 그림 경로는 완전한 문자열 리터럴로만 적는다 — 템플릿 리터럴로 조립하면 토스 빌드의 자산 추적·크기 검사가 경로를 놓친다.
// 스타일은 인라인뿐이다(공유 캡처 html2canvas 가 color-mix·oklch·color() 를 못 읽는다). 색은 화면이 덮어쓸 수 있는
// --cd-speaker-* 토큰을 먼저 보고, 없으면 --cd-* 토큰, 그다음 밝은 판 고정색으로 내려간다.
// 얼굴은 원본(상반신 그림)에서 얼굴 정사각형(crop)만 둥근 틀에 보이게 잘라 44~72px 에서도 표정이 읽히게 한다.

/** @typedef {{ src: string, width: number, height: number, crop: { x: number, y: number, s: number } }} SpeakerMood */

export const SPEAKER_ART = Object.freeze({
  yeoni: Object.freeze({
    name: '연이',
    defaultMood: 'listen',
    frame: Object.freeze({ background: '#fde9c8', border: '#e9a6bd' }),
    moods: Object.freeze({
      listen: Object.freeze({ src: '/images/fortune-chat/persona/yeoni-listen.webp', width: 264, height: 372, crop: Object.freeze({ x: 19, y: 7, s: 228 }) }),
      greet: Object.freeze({ src: '/images/fortune-chat/persona/yeoni-greet.webp', width: 264, height: 372, crop: Object.freeze({ x: 16, y: 3, s: 236 }) }),
      cheer: Object.freeze({ src: '/images/fortune-chat/persona/yeoni-cheer.webp', width: 264, height: 372, crop: Object.freeze({ x: 18, y: 3, s: 230 }) }),
      read: Object.freeze({ src: '/images/fortune-chat/persona/yeoni-read.webp', width: 264, height: 372, crop: Object.freeze({ x: 18, y: 5, s: 230 }) }),
      think: Object.freeze({ src: '/images/fortune-chat/persona/yeoni-think.webp', width: 264, height: 372, crop: Object.freeze({ x: 18, y: 2, s: 232 }) }),
    }),
  }),
  nyang: Object.freeze({
    name: '영냥이',
    defaultMood: 'read',
    // 흰 고양이라 밝은 배경에 묻힌다 — 틀 배경을 한 단계 짙은 보라로 둔다.
    frame: Object.freeze({ background: '#bfb0e6', border: '#7d68b8' }),
    moods: Object.freeze({
      read: Object.freeze({ src: '/images/saju/yeongnyangi-read.webp', width: 270, height: 360, crop: Object.freeze({ x: 10, y: 1, s: 234 }) }),
      cheer: Object.freeze({ src: '/images/saju/yeongnyangi-cheer.webp', width: 270, height: 360, crop: Object.freeze({ x: 11, y: 4, s: 228 }) }),
      listen: Object.freeze({ src: '/images/saju/yeongnyangi-listen.webp', width: 270, height: 360, crop: Object.freeze({ x: 11, y: 0, s: 234 }) }),
      think: Object.freeze({ src: '/images/saju/yeongnyangi-think.webp', width: 270, height: 360, crop: Object.freeze({ x: 12, y: 0, s: 240 }) }),
    }),
  }),
});

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ESC[ch]);
const pct = (value) => `${Number(value.toFixed(2))}%`;

const MIN_SIZE = 44;
const MAX_SIZE = 72;
const DEFAULT_SIZE = 56;

/** 풀이 화자 값('neo' = 영냥이, 그 밖 = 연이)을 말풍선 화자 키로 바꾼다. */
export function speakerFor(mode) {
  return mode === 'neo' ? 'nyang' : 'yeoni';
}

function resolve(who, mood) {
  const art = SPEAKER_ART[who] || SPEAKER_ART.yeoni;
  const picked = art.moods[mood] || art.moods[art.defaultMood];
  return { art, picked };
}

function clampSize(size) {
  const n = Number(size);
  if (!Number.isFinite(n)) return DEFAULT_SIZE;
  return Math.round(Math.min(MAX_SIZE, Math.max(MIN_SIZE, n)));
}

/**
 * 둥근 얼굴 틀 하나. alt 가 빈 문자열이면 장식(aria-hidden)으로 둔다.
 * @param {{ who?: 'yeoni'|'nyang', mood?: string, size?: number, alt?: string }} [options]
 */
export function faceHtml({ who = 'yeoni', mood, size, alt = '' } = {}) {
  const { art, picked } = resolve(who, mood);
  const box = clampSize(size);
  const { x, y, s } = picked.crop;
  const decorative = !alt;
  const frame = `position:relative;display:block;flex:0 0 ${box}px;width:${box}px;height:${box}px;border-radius:50%;overflow:hidden;`
    + `border:2px solid ${art.frame.border};background:${art.frame.background};box-sizing:border-box`;
  const img = `position:absolute;left:${pct(-x / s * 100)};top:${pct(-y / s * 100)};width:${pct(picked.width / s * 100)};max-width:none;height:auto;display:block`;
  return `<span class="cd-speaker__face"${decorative ? ' aria-hidden="true"' : ''} style="${frame}">`
    + `<img src="${picked.src}" alt="${esc(alt)}" width="${picked.width}" height="${picked.height}" loading="eager" decoding="async" style="${img}"></span>`;
}

/**
 * 화자 얼굴 + 말풍선. label 은 이스케이프하고 html 은 부르는 쪽이 이미 이스케이프한 본문으로 믿는다.
 * label 이 화자를 밝히면 그림은 장식(alt="")이고, label 이 비면 그림의 alt 가 화자 이름이다.
 * @param {{ who: 'yeoni'|'nyang', mood?: string, label?: string, html: string, size?: number }} options
 */
export function speakerHtml({ who, mood, label, html, size } = /** @type {any} */ ({})) {
  const key = SPEAKER_ART[who] ? who : 'yeoni';
  const named = label != null && String(label).trim() !== '';
  const face = faceHtml({ who: key, mood, size, alt: named ? '' : SPEAKER_ART[key].name });
  const bubble = 'flex:1 1 auto;min-width:0;padding:10px 14px;border-radius:20px 20px 20px 8px;'
    + 'border:1px solid var(--cd-speaker-line,var(--cd-border,rgba(216,63,120,.16)));'
    + 'background:var(--cd-speaker-bubble,var(--cd-surface,rgba(255,255,255,.96)));'
    + 'color:var(--cd-speaker-ink,var(--cd-text,#3c1830));font-size:15px;line-height:1.65;text-align:left;overflow-wrap:anywhere';
  const name = named
    ? `<strong class="cd-speaker__label" style="display:block;margin:0 0 2px;color:var(--cd-speaker-accent,var(--cd-accent,#b31955));font-size:13px;font-weight:700;line-height:1.5">${esc(label)}</strong>`
    : '';
  return `<div class="cd-speaker cd-speaker--${key}" style="display:flex;align-items:flex-end;gap:12px">${face}`
    + `<div class="cd-speaker__bubble" style="${bubble}">${name}${html == null ? '' : String(html)}</div></div>`;
}
