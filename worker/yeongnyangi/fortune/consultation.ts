import type { ChapterBody, ChapterSpec } from './book-contracts';
import { FortuneError, type DomainContext } from './shared/contracts';
import { topicLabel } from './topics';
import { ASK_PERIOD_RESOLVER, resolveAskPeriods, type AskPeriodRange } from './ask/period';

export interface Consultation {
  questionDecision?: import('./ask/question-policy').QuestionDecision;
  counselVersion?: string;
  tarotConsultation?: {version:string;kind:string;spreadId?:string};
  relationship?: {version:string;questionId?:string;participants?:{self:string;partner:string}};
  consultationKind?: string;
  kindVersion?: 1;
  kindLabel?: string;
  questionSky?: import('./question-sky-contract').SkyPublic;
  spirit?: import('./spirit-contract').SpiritPublic;
  version: 1;
  topicId: string;
  topicLabel: string;
  question: string;
  questions: { id: string; text: string; chapterId: string }[];
  asOf: string;
  timezone: string;
  period: { kind: 'requested' | 'default'; label: string; start?: string; end?: string; years?: QuestionYear[];
    ranges?: AskPeriodRange[]; resolver?: typeof ASK_PERIOD_RESOLVER };
}

export interface QuestionYear { year: number; label: string; ganji: string }

const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'], STEMS_KO = '갑을병정무기경신임계';
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'], BRANCHES_KO = '자축인묘진사오미신유술해';
const mod = (n: number, m: number) => ((n % m) + m) % m;
/** Calendar-year 간지, e.g. 2026 → '丙午(병오)'. */
export function yearGanji(year: number) {
  const s = mod(year - 4, 10), b = mod(year - 4, 12);
  return `${STEMS[s]}${BRANCHES[b]}(${STEMS_KO[s]}${BRANCHES_KO[b]})`;
}
const RELATIVE_YEARS: [RegExp, number][] = [[/^재작년$/, -2], [/^(?:작년|지난\s*해|전년)$/, -1], [/^(?:올해|금년|이번\s*해)$/, 0],
  [/^(?:내년|다음\s*해|명년)$/, 1], [/^(?:내후년|후년)$/, 2]];
const RELATIVE_WORDS = '재작년|내후년|작년|지난\\s*해|전년|올해|금년|이번\\s*해|내년|다음\\s*해|명년|후년';
const GANJI_YEAR = '(?<![가-힣])([갑을병정무기경신임계][자축인묘진사오미신유술해]|[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])\\s*[년年]';
const relativeOffset = (word: string) => RELATIVE_YEARS.find(([re]) => re.test(word))?.[1];

/** Every year the question names, resolved against the consultation date: 올해 is always the asOf year. */
export function resolveQuestionYears(question: string, asOf: string): QuestionYear[] {
  const base = Number(asOf.slice(0, 4)), found = new Map<number, string>();
  for (const m of question.matchAll(new RegExp(`${RELATIVE_WORDS}|(20\\d{2})\\s*년|${GANJI_YEAR}`, 'gu'))) {
    let year: number | undefined;
    if (m[1]) year = Number(m[1]);
    else if (m[2]) {
      const [a, b] = [...m[2]];
      const s = Math.max(STEMS.indexOf(a), STEMS_KO.indexOf(a)), br = Math.max(BRANCHES.indexOf(b), BRANCHES_KO.indexOf(b));
      // Only real sexagenary pairs (same parity); the nearest such year to the consultation date.
      if (s % 2 !== br % 2) continue;
      const offset = mod((s * 6 - br * 5) - mod(base - 4, 60), 60);
      year = base + (offset >= 30 ? offset - 60 : offset);
    } else {
      const offset = relativeOffset(m[0]);
      if (offset !== undefined) year = base + offset;
    }
    if (year !== undefined && !found.has(year)) found.set(year, m[0].replace(/\s+/g, ' '));
  }
  return [...found].sort(([a], [b]) => a - b).map(([year, label]) => ({ year, label, ganji: yearGanji(year) }));
}

const yearWord = (year: number, base: number) => ['재작년', '작년', '올해', '내년', '내후년'][year - base + 2];
/**
 * Principle 17: a relative year word paired with an explicit year that contradicts the consultation date
 * ('올해(2025년)' when asOf is 2026) is corrected deterministically, never regenerated. The year number is the
 * evidence; the word is the model's inference, so the word follows the number.
 */
export function alignRelativeYears(body: ChapterBody, asOf: string, locale = 'ko'): { body: ChapterBody; count: number } {
  if (locale !== 'ko' || !/^\d{4}-/.test(asOf || '')) return { body, count: 0 };
  const base = Number(asOf.slice(0, 4));
  let count = 0;
  const wordFirst = new RegExp(`(${RELATIVE_WORDS})(\\s*[(（]\\s*)(20\\d{2})(\\s*년?\\s*[)）])`, 'gu');
  const yearFirst = new RegExp(`(20\\d{2})(\\s*년\\s*[(（]\\s*)(${RELATIVE_WORDS})(\\s*[)）])`, 'gu');
  const fix = (value: unknown) => {
    if (typeof value !== 'string' || !value) return value;
    const next = value.replace(wordFirst, (whole, word: string, open: string, y: string, close: string) => {
      const year = Number(y), offset = relativeOffset(word);
      if (offset === undefined || base + offset === year) return whole;
      count++;
      const right = yearWord(year, base);
      return right ? `${right}${open}${y}${close}` : `${y}년`;
    }).replace(yearFirst, (whole, y: string, open: string, word: string, close: string) => {
      const year = Number(y), offset = relativeOffset(word);
      if (offset === undefined || base + offset === year) return whole;
      count++;
      const right = yearWord(year, base);
      return right ? `${y}${open}${right}${close}` : `${y}년`;
    });
    return next;
  };
  const out: ChapterBody = { ...body, summary: fix(body.summary) as string, example: fix(body.example) as string,
    advice: fix(body.advice) as string, persona: fix(body.persona) as string,
    analysis: Array.isArray(body.analysis) ? body.analysis.map(fix) as string[] : body.analysis,
    highlights: Array.isArray(body.highlights) ? body.highlights.map(fix) as string[] : body.highlights,
    ...(Array.isArray(body.blocks) ? { blocks: body.blocks.map(b => !b || typeof b !== 'object' ? b : { ...b,
      paragraphs: Array.isArray(b.paragraphs) ? b.paragraphs.map(fix) as string[] : b.paragraphs }) } : {}),
    ...(Array.isArray(body.questionAnswers) ? { questionAnswers: body.questionAnswers.map(a => !a || typeof a !== 'object' ? a :
      { ...a, answer: fix(a.answer) as string, reason: fix(a.reason) as string, timing: fix(a.timing) as string, action: fix(a.action) as string, ...(typeof a.review === 'string' ? { review: fix(a.review) as string } : {}) }) } : {}),
  };
  return count ? { body: out, count } : { body, count: 0 };
}

export function consultationClock(timezone: unknown, now = new Date()) {
  const zone = typeof timezone === 'string' && timezone ? timezone : 'Asia/Seoul';
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const part = (type: string) => parts.find(p => p.type === type)!.value;
    return { timezone: zone, asOf: `${part('year')}-${part('month')}-${part('day')}` };
  } catch { throw new FortuneError('INVALID_TIMEZONE'); }
}

// askPeriods: only the '무엇이든 물어보기' kind resolves week/month ranges and carries the period contract;
// every other product keeps its earlier period output byte for byte.
export function createConsultation(question: string, topicId: string, clock: ReturnType<typeof consultationClock>, manifest: ChapterSpec[], askPeriods = false): Consultation {
  // Preserve every character of the input in the snapshot; splitting only assigns
  // answer slots, it never asks another model to rewrite the user's intent.
  const units = question.trim().split(/\n+|(?<=[?？])\s*/u).map(s => s.trim()).filter(Boolean);
  const questions = units.length > 8 ? [...units.slice(0, 7), units.slice(7).join('\n')] : units;
  const requested = question.match(/(?:20\d{2}\s*년(?:\s*\d{1,2}\s*(?:월\s*)?(?:[~～–-]\s*\d{1,2}\s*)?월(?:\s*\d{1,2}\s*일)?)?|\d{1,2}\s*(?:월\s*)?[~～–-]\s*\d{1,2}\s*월|\d{1,2}\s*월(?:\s*\d{1,2}\s*일)?|(?:앞으로|향후)\s*\d+(?:\s*[~～–-]\s*\d+)?\s*(?:개월|달|년|주)|재작년|내후년|작년|지난\s*해|올해|금년|내년|명년|이번\s*달|다음\s*달|이번\s*주|다음\s*주|차주|상반기|하반기|봄|여름|가을|겨울)/gu);
  const requestedLabels: string[] = requested ? [...requested] : [];
  // A named year becomes an explicit calendar range, so '올해' can never drift to another year downstream.
  const years = resolveQuestionYears(question, clock.asOf);
  // Weeks and months become absolute ranges too; the request then spans their union, never the whole window.
  const ranges = askPeriods ? resolveAskPeriods(question, clock.asOf, resolveQuestionYears) : [];
  const resolver = askPeriods ? { resolver: ASK_PERIOD_RESOLVER } : {};
  const span = ranges.length ? { start: ranges.map(r => r.start).sort()[0], end: ranges.map(r => r.end).sort().at(-1)!, ranges } : undefined;
  const end = new Date(`${clock.asOf}T12:00:00Z`);
  const day=end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth()+3);
  const last=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1,0)).getUTCDate();
  end.setUTCDate(Math.min(day,last));
  return { version: 1, topicId, topicLabel: topicLabel(topicId) || '전체 흐름', question,
    questions: questions.map((text, i) => ({ id: `q${i + 1}`, text, chapterId: manifest[0].id })), ...clock,
    period: requestedLabels.length || years.length || span ? { kind: 'requested', label: [...new Set([...requestedLabels, ...years.map(y => y.label)
      .filter(label => !requestedLabels.some(r => r.replace(/\s+/g, ' ').includes(label)))])].join(' · '),
      ...(years.length ? { start: `${years[0].year}-01-01`, end: `${years[years.length - 1].year}-12-31`, years } : {}),
      ...(span || {}), ...resolver }
      : { kind: 'default', label: `${clock.asOf}부터 3개월의 흐름과 실천·점검`, start: clock.asOf, end: end.toISOString().slice(0, 10), ...resolver } };
}

export function validateConsultationAnswers(body: ChapterBody, chapter: ChapterSpec, consultation?: Consultation) {
  if (!consultation) return;
  const expected = consultation.questions.filter(q => q.chapterId === chapter.id);
  const answers = body.questionAnswers || [];
  if (answers.length !== expected.length || new Set(answers.map(a => a.questionId)).size !== answers.length ||
    expected.some(q => !answers.some(a => a.questionId === q.id)) || answers.some(a =>
      !a || ![a.answer, a.reason, a.timing, a.action].every(s => typeof s === 'string' && s.trim().length >= 10 && s.length <= 2000 && !/<\/?[a-z][^>]*>/i.test(s)))) {
    console.warn('[yeongnyangi-answer-validation]',JSON.stringify({chapter:chapter.ordinal,expectedCount:expected.length,actualCount:Array.isArray(answers)?answers.length:null}));
    throw new FortuneError('QUESTION_ANSWER_INCOMPLETE');
  }
}

export const professionalEvidenceNames: Record<string, string> = {
  preventionEvidence:'주의할 흐름과 예방 행동의 근거',
  relationshipBasis:'관계의 바탕',relationshipComparison:'두 사람의 교차 비교',relationshipTiming:'계산된 관계 시기',
  fiveElements: '오행의 분포', dayMaster: '일간 — 나를 나타내는 천간', pillars: '사주 네 기둥',
  pillarDetails: '천간과 지지의 구성', seasonalBalance: '월령과 계절에 따른 오행의 균형',
  tenGods: '십성의 구성', tenGodsByPillar: '각 기둥의 십성 관계', strengthHeuristic: '일간의 세력과 생조·설기 관계',
  natalInteractions: '원국의 합·충·형 관계', shinsal: '신살의 배치와 해석상 한계', usefulGod: '용신과 희신',
  majorLuck: '대운의 흐름', yearlyLuck: '세운의 흐름', monthlyLuck: '월운의 흐름', advancedFactors: '지지와 오행의 추가 관계',
  elementProfile: '오행의 과다·결핍과 기질', tenGodProfile: '십성 군집의 발달과 조합',
  movementSignals: '이동수·해외운의 근거(역마·충·병존)', romanceTiming: '연애·결혼운의 시기 근거(배우자성·도화·일지 합충)',
  healthBasis: '생활 리듬과 컨디션 관리의 근거',
  businessBasis: '사업운의 근거(재백·자녀·전택·관록궁과 궁간 비화)',
  palaces: '자미두수의 궁과 별 배치', bodyPalace: '신궁의 위치', planets: '행성의 위치',
  ascendant: '상승점', aspects: '행성 간 각도', houseCusps: '하우스의 경계',
  houseRulers: '하우스 주인(전통 룰러)과 그 배치', chartSect: '주간·야간 차트(섹트)', elementBalance: '원소·모드 분포',
  vimshottariDasha: '빔쇼타리 다샤의 기간', cards: '뽑힌 카드와 위치별 상징',
  todaySaju: '오늘의 사주 일진', todaySukuyo: '오늘의 숙요 일운', todayVedic: '오늘의 베다 판창가와 타라 발라',
  todayNumerology: '오늘의 수비학 개인 수', sajuYearlyLuck: '사주 세운의 흐름', sajuMonthlyLuck: '사주 월운의 흐름',
};

const exposedKeys = (factLabels: string[], locale: string) =>
  [...new Set([...Object.keys(professionalEvidenceNames),...factLabels.filter(k=>/^[A-Za-z][A-Za-z0-9]+$/.test(k))])].filter(key=>locale==='ko'||/[a-z][A-Z]|[0-9_]/.test(key));

export function assertProfessionalProse(body: ChapterBody, question = '', factLabels: string[] = [], locale = 'ko') {
  const prose = [body.title || '',body.summary, body.example, body.advice, body.persona, ...(body.analysis || []), ...(body.highlights || []),
    ...(body.blocks || []).flatMap(b => [b.title, ...b.paragraphs]),
    ...(body.questionAnswers || []).flatMap(a => [a.answer, a.reason, a.timing, a.action])].join('\n');
  const text = question ? prose.split(question).join('') : prose;
  // Detail names the matched class and key only (never model text), so the next exposure is diagnosable.
  const system = text.match(/\b(?:saju|ziwei|vedic|astrology|sukuyo|tarot)\.[A-Za-z][\w.[\]-]*|\b(?:FortuneFact|CALCULATED_DATA|USER_QUESTION|factSelectors|requiredSections|engineVersion|questionAnswers)\b/);
  if (system) throw new FortuneError('INTERNAL_EVIDENCE_EXPOSED',400,(system[0].includes('.')?`id:${system[0]}`:`system:${system[0]}`).slice(0,80));
  const key = exposedKeys(factLabels,locale).find(key => new RegExp(`\\b${key}\\b`).test(text));
  if (key) throw new FortuneError('INTERNAL_EVIDENCE_EXPOSED',400,`key:${key}`.slice(0,80));
}

// Principle 17: an internal evidence ID in the prose is corrected, not paid for again. A bracket that holds only
// IDs/keys is dropped; in Korean a bare ID/key becomes its professional name with the particle fixed.
// Anything else (system names, unknown keys, non-Korean bare keys) is left for assertProfessionalProse to reject.
const EVIDENCE_ID = /\b(saju|ziwei|vedic|astrology|sukuyo|tarot)\.([A-Za-z][\w[\]-]*(?:\.[A-Za-z0-9][\w[\]-]*)*)/g;
const BRACKETED = /[ \t]*[(\[（【]\s*([^()[\]（）【】\n]{1,200}?)\s*[)\]）】]/g;
const CITATION_LABEL = /^(?:근거|출처|참고|데이터|자료|sources?|evidence|ref|根拠|出典|依据|依據)\s*[:：]?\s*/i;
const PARTICLES: [string, string][] = [['으로','로'],['은','는'],['을','를'],['과','와'],['이','가']];
const finalConsonant = (s: string) => { const c = s.charCodeAt(s.length - 1) - 0xAC00; return c >= 0 && c <= 11171 ? c % 28 : 0; };

/** Tarot position keys of the drawn cards (inner_vocation → '마음의 소명'); a key without a stored label maps to ''. */
export function tarotPositionNames(context?: DomainContext): Record<string, string> {
  const out: Record<string, string> = {};
  for (const fact of context?.facts || []) {
    const cards = fact.label === 'cards' ? fact.value : fact.label === 'tarotConsultation' ? (fact.value as { cards?: unknown })?.cards : undefined;
    if (Array.isArray(cards)) for (const card of cards) {
      const key = String(card?.positionKey || '');
      if (/^[a-z][a-z0-9_]*$/.test(key)) out[key] = out[key] || String(card.positionLabel || '');
    }
  }
  return out;
}

export function redactInternalEvidence(body: ChapterBody, question = '', factLabels: string[] = [], locale = 'ko', positions: Record<string, string> = {}): { body: ChapterBody; count: number } {
  // A one-word position key ('calling', 'current') is ordinary English outside Korean prose.
  const positionKeys = Object.keys(positions).filter(k => locale === 'ko' || k.includes('_'));
  const keys = [...exposedKeys(factLabels, locale), ...positionKeys];
  const isInternal = (token: string) => new RegExp(`^${EVIDENCE_ID.source}$`).test(token) || keys.includes(token);
  const shortName = (key: string) => positions[key] || professionalEvidenceNames[key]?.split(' — ')[0];
  let count = 0;
  const particle = (name: string, found?: string) => {
    if (!found) return '';
    const pair = PARTICLES.find(p => p.includes(found))!, fc = finalConsonant(name);
    return pair[0] === '으로' ? (fc && fc !== 8 ? '으로' : '로') : fc ? pair[0] : pair[1];
  };
  const PARTICLE = '(?:(?<particle>으로|로|은|는|을|를|과|와|이|가)(?=[\\s.,!?·)\\]」』]|$))?';
  const names = [...Object.keys(professionalEvidenceNames).filter(k => keys.includes(k)), ...positionKeys.filter(k => positions[k])];
  const renames = [new RegExp(`\\b(?:saju|ziwei|vedic|astrology|sukuyo|tarot)\\.(?<key>[A-Za-z][\\w[\\]-]*(?:\\.[A-Za-z0-9][\\w[\\]-]*)*)${PARTICLE}`, 'g'),
    ...(names.length ? [new RegExp(`\\b(?<key>${names.join('|')})\\b${PARTICLE}`, 'g')] : [])];
  const fix = (value: unknown) => {
    if (typeof value !== 'string' || !value) return value;
    let fixed = 0, next = value.replace(BRACKETED, (whole, inner: string) => {
      const tokens = inner.replace(CITATION_LABEL, '').split(/[\s,，、·/|;]+/).filter(Boolean);
      if (!tokens.length || !tokens.every(isInternal)) return whole;
      fixed++; return '';
    });
    if (locale === 'ko') for (const pattern of renames) next = next.replace(pattern, (...args) => {
      const whole = args[0] as string, groups = args[args.length - 1] as { key: string; particle?: string };
      const name = shortName(groups.key.split(/[.[]/)[0]);
      if (!name) return whole;
      fixed++; return name + particle(name, groups?.particle);
    });
    if (next === value) return value;
    next = next.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+([.,!?。])/g, '$1').trim();
    // Never blank a field to pass: an emptied string stays as written for the guard to reject.
    if (!next) return value;
    count += fixed; return next;
  };
  if (question && (new RegExp(EVIDENCE_ID.source).test(question) || keys.some(k => new RegExp(`\\b${k}\\b`).test(question)))) return { body, count: 0 };
  const out: ChapterBody = { ...body,
    title: fix(body.title) as string, summary: fix(body.summary) as string, example: fix(body.example) as string,
    advice: fix(body.advice) as string, persona: fix(body.persona) as string,
    analysis: Array.isArray(body.analysis) ? body.analysis.map(fix) as string[] : body.analysis,
    highlights: Array.isArray(body.highlights) ? body.highlights.map(fix) as string[] : body.highlights,
    ...(Array.isArray(body.blocks) ? { blocks: body.blocks.map(b => !b || typeof b !== 'object' ? b : { ...b, title: fix(b.title) as string,
      paragraphs: Array.isArray(b.paragraphs) ? b.paragraphs.map(fix) as string[] : b.paragraphs }) } : {}),
    ...(Array.isArray(body.questionAnswers) ? { questionAnswers: body.questionAnswers.map(a => !a || typeof a !== 'object' ? a :
      { ...a, answer: fix(a.answer) as string, reason: fix(a.reason) as string, timing: fix(a.timing) as string, action: fix(a.action) as string, ...(typeof a.review === 'string' ? { review: fix(a.review) as string } : {}) }) } : {}),
  };
  if (body.title === undefined) delete (out as {title?: string}).title;
  return count ? { body: out, count } : { body, count: 0 };
}

// Principle 17: the counselor's own name used as the reader's ('연이님은', '연이님,') is corrected, not regenerated.
// The prompt never carries the reader's name, so '<counselor>님/씨' is always a mis-address. A vocative is dropped;
// any other use becomes '당신' with the particle refitted. Korean prose only.
export function correctPersonaAddress(body: ChapterBody, name: string, locale = 'ko'): { body: ChapterBody; count: number } {
  if (locale !== 'ko' || !name) return { body, count: 0 };
  const who = `(?<![가-힣])${name}\\s?(?:님|씨)`;
  const lead = new RegExp(`${who}\\s*[,，!]\\s*`, 'g'), tail = new RegExp(`\\s*[,，]\\s*${who}(?=\\s*[.!?。]|$)`, 'g');
  // '님' already takes the consonant particle; only '씨' + a vowel-form particle (씨는·씨로서) needs refitting.
  const rest = new RegExp(`${who}(?<particle>는|를|와|가|로)?`, 'g');
  const fit: Record<string, string> = { 는: '은', 를: '을', 와: '과', 가: '이', 로: '으로' };
  let count = 0;
  const fix = (value: unknown) => {
    if (typeof value !== 'string' || !value.includes(name)) return value;
    const next = value.replace(lead, () => (count++, '')).replace(tail, () => (count++, ''))
      .replace(rest, (...args) => { count++; const p = (args[args.length - 1] as { particle?: string }).particle; return '당신' + (p ? fit[p] : ''); });
    return next.trim() ? next : value;
  };
  const out: ChapterBody = { ...body, summary: fix(body.summary) as string, example: fix(body.example) as string,
    advice: fix(body.advice) as string, persona: fix(body.persona) as string,
    analysis: Array.isArray(body.analysis) ? body.analysis.map(fix) as string[] : body.analysis,
    highlights: Array.isArray(body.highlights) ? body.highlights.map(fix) as string[] : body.highlights,
    ...(body.title === undefined ? {} : { title: fix(body.title) as string }),
    ...(Array.isArray(body.blocks) ? { blocks: body.blocks.map(b => !b || typeof b !== 'object' ? b : { ...b, title: fix(b.title) as string,
      paragraphs: Array.isArray(b.paragraphs) ? b.paragraphs.map(fix) as string[] : b.paragraphs }) } : {}),
    ...(Array.isArray(body.questionAnswers) ? { questionAnswers: body.questionAnswers.map(a => !a || typeof a !== 'object' ? a :
      { ...a, answer: fix(a.answer) as string, reason: fix(a.reason) as string, timing: fix(a.timing) as string, action: fix(a.action) as string, ...(typeof a.review === 'string' ? { review: fix(a.review) as string } : {}) }) } : {}),
  };
  return count ? { body: out, count } : { body, count: 0 };
}

export function validatePreciseTiming(body: ChapterBody, consultation: Consultation | undefined, evidence: unknown) {
  if(!consultation)return;
  const text=[body.summary,body.example,body.advice,body.persona,...body.analysis,...(body.blocks || []).flatMap(b=>b.paragraphs),
    ...(body.questionAnswers || []).flatMap(a=>[a.answer,a.reason,a.timing,a.action])].join('\n');
  const dates=(value:string)=>[...value.matchAll(/(20\d{2})(?:년\s*|-|\/)(\d{1,2})(?:월\s*|-|\/)(\d{1,2})일?/g)].map(m=>`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`);
  const allowed=new Set(dates(JSON.stringify(evidence)+' '+JSON.stringify(consultation)));
  if(dates(text).some(date=>!allowed.has(date)))throw new FortuneError('UNSUPPORTED_PRECISE_TIMING');
}
