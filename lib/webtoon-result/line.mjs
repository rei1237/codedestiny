// 화자 대사 교정·결과 시드(명세 docs/context/narrator-webtoon-result-spec.md §7-1). narrator.mjs 가 다시 내보낸다.
// 🔴 그림 경로를 두지 않는다. 액땜(lib/saju/remedy)이 이것만 가져가는데, 토스 번들러는 청크에 남은
// `/images/...${...}` 템플릿 접두어로 폴더를 통째로 복사한다(narrator.mjs EXPRESSION_ART → novel/mobile 10MB, 2026-11-28).

// ── 대사 교정(명세 §7-1) ──
// 한글·가나·한자는 60자, 그 밖(라틴 문자 번역)은 같은 분량이 더 길어 100자.
const MAX_LINE = 60;
const MAX_LINE_LATIN = 100;
const CJK = /[぀-ヿ㐀-鿿가-힯]/;
export const maxLineFor = (text) => (CJK.test(text) ? MAX_LINE : MAX_LINE_LATIN);
const BANNED = [['반드시', '차분히'], ['무조건', '되도록'], ['틀림없이', '아마도'], ['확실히', '천천히'], ['100%', '충분히']];
const BANNED_LEFT = /반드시|무조건|확실|틀림없|100\s*%/;
// 상대 마음 단정 문형: "그 사람은/이 ~하고 있어요", "상대는 ~", "그의/그녀의 마음은".
const OTHER_MIND = /(그 사람|상대(방)?|그녀|그)(은|는|이|가|의 마음은|의 마음이)\s*\S*\s*(하고 있|생각하고|원하고|기다리고|좋아하고|느끼고)/;
const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;
const ONOMATOPOEIA = /(ㅋ|ㅎ|ㅠ|ㅜ){2,}/g;

function clip(text) {
  const max = maxLineFor(text);
  if (text.length <= max) return text;
  const sentences = text.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g) || [text];
  let out = '';
  for (const sentence of sentences.slice(0, 2)) {
    const next = (out + sentence).trim();
    if (next.length > max) break;
    out = next + ' ';
  }
  out = out.trim();
  if (out) return out;
  const comma = text.lastIndexOf(',', max - 1);
  if (comma > 0) return text.slice(0, comma).trim();
  return text.slice(0, max).trim();
}

/**
 * 화자 대사 한 줄을 규칙에 맞춘다. 고칠 수 없으면 null(호출부가 기본 문장으로 바꾼다).
 * @returns {{text:string|null, reason?:'banned'|'other-mind'|'empty'}}
 */
export function correctLine(raw) {
  let text = String(raw ?? '').replace(EMOJI, '').replace(ONOMATOPOEIA, '').replace(/\s+/g, ' ').trim();
  if (!text) return { text: null, reason: 'empty' };
  if (OTHER_MIND.test(text)) return { text: null, reason: 'other-mind' };
  for (const [from, to] of BANNED) text = text.split(from).join(to);
  if (BANNED_LEFT.test(text)) return { text: null, reason: 'banned' };
  // 2문장 이하.
  const sentences = text.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g) || [text];
  if (sentences.length > 2) text = sentences.slice(0, 2).join('').trim();
  return { text: clip(text) };
}

/** 결과 시드(같은 결과 = 같은 대사). */
export function seedOf(value) {
  let hash = 2166136261;
  for (const ch of String(value)) { hash ^= ch.codePointAt(0); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}
