// 액땜 정본 모듈. 사주·자미두수 결과를 읽어 액땜 케이스를 고르고, 프롬프트 블록·카드 모델로 바꾼다.
// 순수 ESM, 결정론적, 던지지 않는다. 엔진(korean-calendar·natal-core·ziwei 명반) 결과는 읽기만 한다.
// 문구는 한국어(ko)만 있다. 다른 로케일이면 직렬화는 '', 카드는 null.
import { correctLine, seedOf } from '../../webtoon-result/narrator.mjs';
import { readSajuChart, detectSajuCases, everydayBalanceCase } from './detect-saju.mjs';
import { readZiweiChart, detectZiweiCases } from './detect-ziwei.mjs';
import { CASE_META, ZW_PALACE_DOMAINS, REMEDY_METHODS, ELEMENT_GUIDE, methodsFor } from './methods.mjs';
import {
  METHOD_COPY_KO, CASE_COPY_KO, NARRATOR_COPY_KO, ELEMENT_ACTIVITY_KO, PALACE_KO,
  REMEDY_INTRO_KO, REMEDY_DISCLAIMER_KO, REMEDY_CUSTOM_LABEL_KO, REMEDY_MORE_LABEL_KO,
  REMEDY_PROMPT_HEADER, REMEDY_PROMPT_FOOTER, REMEDY_PROMPT_CUSTOM_PREFIX, withJosa,
} from './copy.ko.mjs';

export { samjaeStatus, SAMJAE_STAGES } from './samjae.mjs';
export { REMEDY_METHODS, METHOD_IDS, METHOD_KINDS, CASE_METHODS, CASE_META, REMEDY_CASE_IDS, ELEMENT_GUIDE, methodsFor } from './methods.mjs';
export { METHOD_COPY_KO, CASE_COPY_KO, NARRATOR_COPY_KO, REMEDY_DISCLAIMER_KO, REMEDY_INTRO_KO, REMEDY_CUSTOM_LABEL_KO, withJosa } from './copy.ko.mjs';

export const REMEDY_VERSION = 'remedy-v1';
export const REMEDY_NARRATORS = Object.freeze(['yeoni', 'yeoni-saju', 'yeongnyangi', 'neo', 'musung']);
export const DEFAULT_REMEDY_LIMIT = 5;
export const DEFAULT_REMEDY_VISIBLE = 3;
export const DEFAULT_REMEDY_PROMPT_MAX_CHARS = 800;
// 프롬프트가 입력 상한의 95% 를 넘기면 블록을 뺀다.
export const REMEDY_PROMPT_INPUT_RATIO = 0.95;
const MUSUNG_MAX_LINE = 80;

const REMEDY_IMAGES = Object.freeze({
  yeoni: Object.freeze({ explain: '/images/fortune-tea-house/renewal/pig-advice.webp', caution: '/images/fortune-tea-house/renewal/pig-thinking.webp' }),
  'yeoni-saju': Object.freeze({ explain: '/images/saju/yeoni-clue-320.webp', caution: '/images/saju/yeoni-clue-320.webp' }),
  yeongnyangi: Object.freeze({ explain: '/images/saju/yeongnyangi-read.webp', caution: '/images/saju/yeongnyangi-read.webp' }),
  neo: Object.freeze({ explain: '/neo-operation-room/briefing/neo-explain-v1.webp', caution: '/neo-operation-room/briefing/neo-caution-v1.webp' }),
  musung: Object.freeze({ explain: '/images/expert-characters/musung/verdict.webp', caution: '/images/expert-characters/musung/thinking.webp' }),
});
export { REMEDY_IMAGES };

const finite = (value) => (value !== null && value !== '' && value !== undefined && Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : null);

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

/** 'ko'·'ko-KR'·빈 값 → 'ko'. 그 밖은 소문자 그대로. */
export function normalizeRemedyLocale(locale) {
  const text = String(locale ?? '').trim().toLowerCase();
  if (!text || text === 'ko' || text.startsWith('ko-') || text.startsWith('ko_')) return 'ko';
  return text;
}

const invalid = (locale, reason) => deepFreeze({ version: REMEDY_VERSION, valid: false, reason, locale, refYear: null, sources: { saju: false, ziwei: false }, total: 0, cases: [] });

function decorate(row) {
  const meta = CASE_META[row.caseId];
  if (!meta) return null;
  const methodIds = methodsFor(row.caseId, row.variant).filter((id) => REMEDY_METHODS[id]);
  if (!methodIds.length) return null;
  const domains = row.system === 'ziwei' && ZW_PALACE_DOMAINS[row.variant] ? ZW_PALACE_DOMAINS[row.variant] : meta.domains;
  const out = {
    caseId: row.caseId,
    variant: row.variant || '',
    system: row.system,
    period: { kind: row.period.kind, label: row.period.label },
    evidence: row.evidence.slice(0, 2).map((item) => ({ label: item.label, value: item.value })),
    domains: [...domains],
    methodIds,
    priority: meta.priority,
    elements: { use: row.elements?.use || '', activity: row.elements?.activity || row.elements?.use || '' },
  };
  if (row.samjae) out.samjae = { stage: row.samjae.stage, years: [...row.samjae.years] };
  return out;
}

const byPriority = (a, b) => b.priority - a.priority || (a.caseId < b.caseId ? -1 : a.caseId > b.caseId ? 1 : 0);

/**
 * 액땜 케이스를 고른다.
 * @param {{saju?:object, ziwei?:object, refYear:number, locale?:string}} input
 *   saju: calculateLifeBookAiSaju 결과나 { pillars:{year,month,day,hour}, timeUnknown, sewoon, daewoon, natalCore } (detect-saju.mjs readSajuChart 참고)
 *   ziwei: calculateZiweiAiChart 결과(명반)
 * @param {{limit?:number}} [opts]
 * @returns {{version:string, valid:boolean, locale:string, refYear:number|null, sources:{saju:boolean, ziwei:boolean|'time-unknown'}, total:number,
 *   cases:{caseId:string, variant:string, system:'saju'|'ziwei', period:{kind:'year'|'decade'|'natal', label:string},
 *   evidence:{label:string,value:string}[], domains:string[], methodIds:string[], priority:number, elements:{use:string, activity:string}}[]}}
 */
export function computeRemedyCases(input = {}, opts = {}) {
  const locale = normalizeRemedyLocale(input?.locale);
  try {
    const refYear = finite(input?.refYear);
    if (refYear === null) return invalid(locale, 'refYear');
    let sajuChart = null;
    let sajuRows = [];
    try {
      sajuChart = readSajuChart(input?.saju, refYear);
      sajuRows = sajuChart ? detectSajuCases(sajuChart) : [];
    } catch {
      sajuRows = [];
    }
    let ziweiChart = null;
    let ziweiRows = [];
    try {
      ziweiChart = readZiweiChart(input?.ziwei);
      ziweiRows = ziweiChart ? detectZiweiCases(ziweiChart, refYear) : [];
    } catch {
      ziweiRows = [];
    }
    if (!sajuChart && !ziweiChart) return invalid(locale, 'input');
    let cases = [...sajuRows, ...ziweiRows].map(decorate).filter(Boolean);
    if (!cases.length && sajuChart) {
      const fallback = decorate(everydayBalanceCase(sajuChart) || {});
      if (fallback) cases = [fallback];
    }
    cases.sort(byPriority);
    const limit = Math.max(1, finite(opts?.limit) ?? DEFAULT_REMEDY_LIMIT);
    return deepFreeze({
      version: REMEDY_VERSION,
      valid: true,
      locale,
      refYear,
      sources: { saju: Boolean(sajuChart), ziwei: ziweiChart ? (ziweiChart.timeUnknown ? 'time-unknown' : true) : false },
      total: cases.length,
      cases: cases.slice(0, limit),
    });
  } catch {
    return invalid(locale, 'error');
  }
}

// ── 문구 채우기 ──

function slotsOf(row) {
  const use = ELEMENT_GUIDE[row.elements?.use] || null;
  return {
    el: row.elements?.use || '',
    dir: use?.direction || '',
    color: use?.color || '',
    activity: ELEMENT_ACTIVITY_KO[row.elements?.activity] || ELEMENT_ACTIVITY_KO[row.elements?.use] || '',
    palace: PALACE_KO[row.variant] || '',
  };
}

/** {key}·{key|조사} 를 채운다. 빈 자리가 하나라도 있으면 null. */
function fill(template, slots) {
  let missing = false;
  const text = String(template ?? '').replace(/\{(\w+)(?:\|([^}]+))?\}/g, (_, key, josa) => {
    const value = slots[key];
    if (!value) { missing = true; return ''; }
    return josa ? withJosa(value, josa) : String(value);
  });
  return missing ? null : text;
}

const METHOD_HINT_SLOT = Object.freeze({ 'direction-desk': 'dir', 'direction-walk': 'dir', 'travel-direction-trip': 'dir', 'direction-color-item': 'color', 'lifestyle-element-activity': 'activity' });

function methodView(id, slots) {
  const copy = METHOD_COPY_KO[id];
  const method = REMEDY_METHODS[id];
  if (!copy || !method) return null;
  const template = (copy.textByEl && copy.textByEl[slots.el]) || copy.text;
  const text = fill(template, slots);
  if (!text) return null;
  const hintKey = METHOD_HINT_SLOT[id];
  const hint = hintKey && !(copy.textByEl && copy.textByEl[slots.el]) ? slots[hintKey] : '';
  return { id, kind: method.kind, title: copy.title, text, hint: hint || '' };
}

function caseViews(row) {
  const slots = slotsOf(row);
  const copy = CASE_COPY_KO[row.caseId];
  if (!copy) return null;
  const title = fill(copy.title, slots);
  const topic = fill(copy.topic, slots);
  if (!title || !topic) return null;
  const views = row.methodIds.map((id) => methodView(id, slots)).filter(Boolean);
  const methods = views.filter((view) => view.kind !== 'custom').slice(0, 3);
  const custom = views.find((view) => view.kind === 'custom') || null;
  if (methods.length < 2 || !custom) return null;
  return { title, topic, methods, custom, evidenceLine: row.evidence.map((item) => item.value).join(' · ') };
}

/** 화자 대사(결정론적). 무성은 합니다체 판정 문장 80자, 나머지는 60자·2문장. 고칠 수 없으면 null. */
function narratorLine(row, topic, narrator) {
  const copy = NARRATOR_COPY_KO[narrator];
  const first = copy.frame.replace('{topic}', topic);
  const closing = copy.closings[seedOf(`${row.caseId}:${row.variant}:${narrator}`) % copy.closings.length];
  if (narrator === 'musung') {
    let line = '';
    for (const sentence of [first, closing]) {
      const fixed = correctLine(sentence).text;
      if (!fixed) continue;
      const next = line ? `${line} ${fixed}` : fixed;
      if (next.length > MUSUNG_MAX_LINE) break;
      line = next;
    }
    return line || null;
  }
  return correctLine(`${first} ${closing}`).text;
}

/**
 * 프롬프트용 사실 블록. 실패·빈 결과·ko 외 로케일이면 ''.
 * @param {object} result computeRemedyCases 결과
 * @param {{maxChars?:number, maxCases?:number, basePromptChars?:number, inputCapChars?:number}} [opts]
 *   inputCapChars 를 주면 basePromptChars + 블록이 그 95% 를 넘지 않게 줄이고, 한 줄도 못 넣으면 '' 를 낸다.
 */
export function serializeRemedyForPrompt(result, opts = {}) {
  try {
    if (!result?.valid || result.locale !== 'ko' || !Array.isArray(result.cases) || !result.cases.length) return '';
    let cap = finite(opts?.maxChars) ?? DEFAULT_REMEDY_PROMPT_MAX_CHARS;
    const inputCap = finite(opts?.inputCapChars);
    if (inputCap !== null) cap = Math.min(cap, Math.floor(inputCap * REMEDY_PROMPT_INPUT_RATIO) - (finite(opts?.basePromptChars) ?? 0));
    const maxCases = Math.max(1, finite(opts?.maxCases) ?? DEFAULT_REMEDY_LIMIT);
    const out = [REMEDY_PROMPT_HEADER];
    for (const row of result.cases.slice(0, maxCases)) {
      const view = caseViews(row);
      if (!view) continue;
      const methods = view.methods.map((m) => (m.hint ? `${m.title}(${m.hint})` : m.title)).join(', ');
      const line = `- [${row.period.label}] ${view.title}: ${view.evidenceLine} → 방법: ${methods} / ${REMEDY_PROMPT_CUSTOM_PREFIX}: ${view.custom.title}`;
      if ([...out, line, REMEDY_PROMPT_FOOTER].join('\n').length > cap) break;
      out.push(line);
    }
    if (out.length === 1) return '';
    return [...out, REMEDY_PROMPT_FOOTER].join('\n');
  } catch {
    return '';
  }
}

/**
 * 결과 화면 카드 모델. 실패·빈 결과·ko 외 로케일이면 null.
 * @param {object} result computeRemedyCases 결과
 * @param {{narrator?:'yeoni'|'yeoni-saju'|'yeongnyangi'|'neo'|'musung', tone?:'auto'|'caution'|'explain', visible?:number}} [opts]
 *   tone 'auto'(기본)는 케이스별 기본 표정(CASE_META.tone)을 쓴다.
 */
export function buildRemedyCardModel(result, opts = {}) {
  try {
    if (!result?.valid || result.locale !== 'ko' || !Array.isArray(result.cases) || !result.cases.length) return null;
    const narrator = REMEDY_NARRATORS.includes(opts?.narrator) ? opts.narrator : 'yeoni';
    const tone = opts?.tone === 'caution' || opts?.tone === 'explain' ? opts.tone : 'auto';
    const name = NARRATOR_COPY_KO[narrator].name;
    const cards = [];
    for (const row of result.cases) {
      const view = caseViews(row);
      if (!view) continue;
      const line = narratorLine(row, view.topic, narrator);
      const cardTone = tone === 'auto' ? (CASE_META[row.caseId]?.tone || 'explain') : tone;
      cards.push({
        caseId: row.caseId,
        variant: row.variant,
        system: row.system,
        title: view.title,
        period: { kind: row.period.kind, label: row.period.label },
        evidenceLine: view.evidenceLine,
        methods: view.methods.map(({ id, kind, title, text }) => ({ id, kind, title, text })),
        custom: { label: REMEDY_CUSTOM_LABEL_KO, id: view.custom.id, title: view.custom.title, text: view.custom.text },
        line: line || '',
        tone: cardTone,
        image: { src: REMEDY_IMAGES[narrator][cardTone], alt: `${withJosa(name, '이')} 액땜 방법을 알려 주는 그림` },
      });
    }
    if (!cards.length) return null;
    const visible = Math.min(cards.length, Math.max(1, finite(opts?.visible) ?? DEFAULT_REMEDY_VISIBLE));
    const more = cards.length - visible;
    return deepFreeze({
      version: REMEDY_VERSION,
      narrator,
      narratorName: name,
      tone,
      intro: REMEDY_INTRO_KO.text,
      disclaimer: REMEDY_DISCLAIMER_KO.text,
      customLabel: REMEDY_CUSTOM_LABEL_KO,
      cards,
      visible,
      more,
      moreLabel: more > 0 ? REMEDY_MORE_LABEL_KO(more) : '',
    });
  } catch {
    return null;
  }
}
