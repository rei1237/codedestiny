// 캐릭터 웹툰 결과 화자 레이어(4단계, 명세 docs/context/narrator-webtoon-result-spec.md N1~N7 승인 2026-11-20).
// 엔진 결과 원문 + 화자(yeoni|yeongnyangi) → CutReader 컷 배열. 순수 함수라 서버·클라이언트·테스트에서 같은 결과를 낸다.
// 🔴 엔진 해석문은 바꾸지 않는다(§8 원문 불변). 화자 대사는 i18n 결정적 템플릿만 쓰고 LLM 을 부르지 않는다(§7-1).
// 🔴 표정은 엔진 결과(정역·주의 카드·결론 흐름)만 보고 정한다(§3-2). fear·angry·cry·sad 는 매핑에 넣지 않는다.

export const NARRATOR_TEMPLATE_VERSION = 'narrator-v1';
export const NARRATORS = ['yeoni', 'yeongnyangi'];
export const EXPRESSIONS = ['smile', 'explain', 'worry', 'cheer', 'serious', 'greet', 'think', 'surprise'];

// 무료 결과 그림은 가벼운 모바일판만 쓴다. 연이 꽃돼지(400×472)는 content/novel/mobile-assets.json 의
// `pig pigV2|/images/novel/remaster/v2/yeoni/<표정>.webp` 항목, 영냥이는 moods(360×300 흰 바탕, 아이보리 패널에 multiply — N4).
// 비어 있는 표정은 임시 대체다(명세 §3-1·N6, 에셋 제작 후속): 연이 worry → think,
// 영냥이 explain → abacus(소품 포즈), worry·serious·think → ponder, cheer → heart.
// 연이 greet 는 remaster wave 를 소설 파이프라인과 같은 설정·이름 규칙으로 뽑은 모바일판(2026-11-21 F3).
const YEONI = (file) => ({ src: `/images/novel/mobile/${file}.webp`, w: 400, h: 472 });
const YN = (file) => ({ src: `/assets/yeongnyangi/moods/${file}.webp`, w: 360, h: 300 });
export const EXPRESSION_ART = {
  yeoni: {
    greet: YEONI('yeon-20ac944e7a'), // wave(sha256("pig pigV2|/images/novel/remaster/v2/yeoni/wave.webp") 앞 10자)
    smile: YEONI('yeon-5cf0ad78ef'), // soft-smile
    explain: YEONI('yeon-a1d1c67b46'), // talk
    worry: YEONI('yeon-1ff1df0cf1'), // think(대체)
    cheer: YEONI('yeon-bda44a2b1b'), // cheer
    serious: YEONI('yeon-1a6684d26b'), // determined
    think: YEONI('yeon-1ff1df0cf1'), // think
    surprise: YEONI('yeon-47bee7a179'), // surprise
  },
  yeongnyangi: {
    greet: YN('wave'),
    smile: YN('beam'),
    explain: YN('abacus'),
    worry: YN('ponder'),
    cheer: YN('heart'),
    serious: YN('ponder'),
    think: YN('ponder'),
    surprise: YN('startled'),
  },
};
/** 대체로 쓰는 표정(에셋 제작 필요 목록, 보고용). */
export const MISSING_EXPRESSION_ART = {
  yeoni: ['worry'],
  yeongnyangi: ['explain', 'worry', 'cheer', 'serious'],
};

// 주의 카드: 정방향에서 무거운 장면을 그리는 카드(js/core/tarot/master-reading.mjs 의 HEAVY 와 같은 목록, 엔진은 내보내지 않아 고정 — 명세 §9 미확인 해소).
export const CAUTION_CARD_CODES = new Set(['M13', 'M15', 'M16', 'M18', 'S03', 'S05', 'S07', 'S08', 'S09', 'S10', 'C05', 'C08', 'W05', 'W07', 'W10', 'P05']);
const CAUTION_ARCS = new Set(['caution', 'mending']);

/** 명세 §3-2 결정적 선택. */
export function expressionFor(kind, { reversed = false, caution = false, cautionConclusion = false } = {}) {
  if (kind === 'opening') return 'greet';
  if (kind === 'card') return caution ? 'serious' : reversed ? 'think' : 'explain';
  if (kind === 'synthesis') return cautionConclusion ? 'serious' : 'think';
  if (kind === 'step') return 'cheer';
  if (kind === 'closing') return 'smile';
  return 'smile';
}

/** 같은 표정이 세 컷째 이어지면 그 세 번째를 think(이미 think 면 smile)로 바꾼다(명세 §3-2 결정). */
export function smoothExpressions(list) {
  const out = list.slice();
  for (let i = 2; i < out.length; i += 1) {
    if (out[i] === out[i - 1] && out[i] === out[i - 2]) out[i] = out[i] === 'think' ? 'smile' : 'think';
  }
  return out;
}

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

const SLOT = /\{(\w+)\}/g;
const TEMPLATE_COUNTS = { opening: 2, upright: 3, reversed: 3, caution: 2, synthesis: 2, step: 2, closing: 2 };
export const TEMPLATE_KEYS = Object.fromEntries(Object.entries(TEMPLATE_COUNTS).map(([pool, count]) => [pool, Array.from({ length: count }, (_, i) => `${pool}${i + 1}`)]));

/** 결과 시드(같은 결과 = 같은 대사). */
export function seedOf(value) {
  let hash = 2166136261;
  for (const ch of String(value)) { hash ^= ch.codePointAt(0); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}

/**
 * 템플릿 풀에서 한 줄을 고르고 교정한다. 같은 결과 안에서 같은 템플릿을 다시 쓰지 않는다.
 * t: (key, vars?) => string — 'webtoon.<narrator>.<template>' 키를 번역한다(없으면 '').
 */
function narratorLine({ t, narrator, pool, vars, seed, used }) {
  const keys = TEMPLATE_KEYS[pool];
  for (let step = 0; step < keys.length; step += 1) {
    const key = `webtoon.${narrator}.${keys[(seed + step) % keys.length]}`;
    if (used.has(key)) continue;
    const raw = t(key);
    if (!raw) continue;
    const slots = [...raw.matchAll(SLOT)].map((match) => match[1]);
    if (slots.some((slot) => !vars[slot])) continue; // 빈 슬롯 → 다음 후보, 끝내 없으면 기본 문장
    const filled = correctLine(t(key, vars));
    if (!filled.text) {
      if (filled.reason === 'other-mind') return correctLine(t(`webtoon.${narrator}.mindFallback`)).text || '';
      continue;
    }
    used.add(key);
    return filled.text;
  }
  return correctLine(t(`webtoon.${narrator}.fallback`)).text || '';
}

/**
 * 타로 결과 → 웹툰 컷(명세 §2: opening → card×n → synthesis → step → closing + 고정 면책).
 * synthesis·step 은 엔진 종합이 있을 때만 만든다(종합 로드 실패 시에도 결과가 비지 않게).
 * @param {{
 *   narrator: 'yeoni'|'yeongnyangi', t: (key:string, vars?:Record<string,unknown>)=>string, seedKey: string,
 *   cards: {position:string, name:string, code?:string, reversed?:boolean, text:string, image?:{src:string, fallbacks?:string[], w:number, h:number}}[],
 *   verdict?: string, synthesis?: {flow?:string, caution?:string, action?:string}|null, close?: string, arc?: string,
 * }} input
 */
export function buildTarotWebtoon(input) {
  const narrator = NARRATORS.includes(input.narrator) ? input.narrator : 'yeoni';
  const { t, cards = [], verdict, synthesis, close, arc } = input;
  const seed = seedOf(input.seedKey ?? cards.map((card) => card.code || card.name).join(','));
  const used = new Set();
  const name = t(`webtoon.${narrator}.name`);
  const say = (pool, vars = {}, offset = 0) => ({ speaker: name, source: 'narrator', text: narratorLine({ t, narrator, pool, vars, seed: seed + offset, used }) });
  const engine = (text, label) => ({ speaker: '', source: 'engine', text, ...(label ? { label } : {}) });

  const plan = [];
  plan.push({ kind: 'opening', lines: [say('opening')] });
  cards.forEach((card, index) => {
    const caution = Boolean(card.code && CAUTION_CARD_CODES.has(card.code));
    const pool = caution ? 'caution' : card.reversed ? 'reversed' : 'upright';
    const heading = t('webtoon.cardHeading', { position: card.position, card: card.name }) + (card.reversed ? ` (${t('webtoon.reversedMark')})` : '');
    plan.push({
      kind: 'card',
      caution,
      card,
      lines: [engine(card.text, heading), say(pool, { position: card.position, card: card.name }, index)],
    });
  });
  if (synthesis && (synthesis.flow || verdict)) {
    plan.push({
      kind: 'synthesis',
      lines: [
        say('synthesis'),
        ...(verdict ? [engine(verdict, t('webtoon.labelVerdict'))] : []),
        ...(synthesis.flow ? [engine(synthesis.flow, t('webtoon.labelFlow'))] : []),
        ...(synthesis.caution ? [engine(synthesis.caution, t('webtoon.labelCaution'))] : []),
      ],
    });
  }
  if (synthesis?.action) plan.push({ kind: 'step', lines: [say('step'), engine(synthesis.action, t('webtoon.labelStep'))] });
  plan.push({
    kind: 'closing',
    lines: [
      say('closing'),
      ...(close ? [engine(close)] : []),
      // 면책은 화자 말투로 바꾸지 않는 서비스 문장(§6). 영냥이 반말 결과에서도 해요체 원문 그대로.
      { speaker: '', source: 'disclaimer', text: t('webtoon.disclaimer') },
    ],
  });

  const cautionConclusion = CAUTION_ARCS.has(arc);
  const expressions = smoothExpressions(plan.map((cut) => expressionFor(cut.kind, { reversed: cut.card?.reversed, caution: cut.caution, cautionConclusion })));
  const cuts = plan.map((cut, index) => {
    const expression = expressions[index];
    const art = EXPRESSION_ART[narrator][expression];
    const items = [];
    if (cut.card?.image?.src) {
      const reversedMark = cut.card.reversed ? ` (${t('webtoon.reversedMark')})` : '';
      items.push({ role: 'card', src: cut.card.image.src, fallbacks: cut.card.image.fallbacks, w: cut.card.image.w, h: cut.card.image.h, alt: t('webtoon.cardAlt', { card: cut.card.name }) + reversedMark });
    }
    if (art) items.push({ role: 'narrator', ...art, alt: t(`webtoon.${narrator}.alt`, { expression: t(`webtoon.expression.${expression}`) }) });
    return {
      src: '', widths: [], fallback: 0, w: 0, h: 0, alt: '',
      kind: cut.kind, expression, lines: cut.lines, art: items,
      ...(cut.card ? { card: { id: cut.card.code || cut.card.name, reversed: Boolean(cut.card.reversed), position: cut.card.position } } : {}),
    };
  });

  return {
    narratorId: narrator,
    templateVersion: NARRATOR_TEMPLATE_VERSION,
    // 엔진 원문은 따로 보존한다(글로만 보기·저장·공유는 이 원문을 쓴다).
    original: {
      verdict: verdict || '',
      positions: cards.map((card) => ({ position: card.position, name: card.name, reversed: Boolean(card.reversed), text: card.text })),
      synthesis: synthesis || null,
      close: close || '',
    },
    narrator: { lines: cuts.flatMap((cut) => cut.lines.filter((line) => line.source === 'narrator').map((line) => line.text)), expressions },
    cuts,
  };
}
