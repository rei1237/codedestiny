import type { ChapterBody, ChapterSpec } from './book-contracts';
import { FortuneError } from './shared/contracts';
import { topicLabel } from './topics';

export interface Consultation {
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
  period: { kind: 'requested' | 'default'; label: string; start?: string; end?: string };
}

export function consultationClock(timezone: unknown, now = new Date()) {
  const zone = typeof timezone === 'string' && timezone ? timezone : 'Asia/Seoul';
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const part = (type: string) => parts.find(p => p.type === type)!.value;
    return { timezone: zone, asOf: `${part('year')}-${part('month')}-${part('day')}` };
  } catch { throw new FortuneError('INVALID_TIMEZONE'); }
}

export function createConsultation(question: string, topicId: string, clock: ReturnType<typeof consultationClock>, manifest: ChapterSpec[]): Consultation {
  // Preserve every character of the input in the snapshot; splitting only assigns
  // answer slots, it never asks another model to rewrite the user's intent.
  const units = question.trim().split(/\n+|(?<=[?？])\s*/u).map(s => s.trim()).filter(Boolean);
  const questions = units.length > 8 ? [...units.slice(0, 7), units.slice(7).join('\n')] : units;
  const requested = question.match(/(?:20\d{2}\s*년(?:\s*\d{1,2}\s*(?:월\s*)?(?:[~～–-]\s*\d{1,2}\s*)?월(?:\s*\d{1,2}\s*일)?)?|\d{1,2}\s*(?:월\s*)?[~～–-]\s*\d{1,2}\s*월|\d{1,2}\s*월(?:\s*\d{1,2}\s*일)?|(?:앞으로|향후)\s*\d+(?:\s*[~～–-]\s*\d+)?\s*(?:개월|달|년|주)|올해|내년|이번\s*달|다음\s*달|상반기|하반기|봄|여름|가을|겨울)/gu);
  const end = new Date(`${clock.asOf}T12:00:00Z`);
  const day=end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth()+3);
  const last=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1,0)).getUTCDate();
  end.setUTCDate(Math.min(day,last));
  return { version: 1, topicId, topicLabel: topicLabel(topicId) || '전체 흐름', question,
    questions: questions.map((text, i) => ({ id: `q${i + 1}`, text, chapterId: manifest[0].id })), ...clock,
    period: requested ? { kind: 'requested', label: [...new Set(requested)].join(' · ') }
      : { kind: 'default', label: `${clock.asOf}부터 3개월의 흐름과 실천·점검`, start: clock.asOf, end: end.toISOString().slice(0, 10) } };
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
  fiveElements: '오행의 분포', dayMaster: '일간 — 나를 나타내는 천간', pillars: '사주 네 기둥',
  pillarDetails: '천간과 지지의 구성', seasonalBalance: '월령과 계절에 따른 오행의 균형',
  tenGods: '십성의 구성', tenGodsByPillar: '각 기둥의 십성 관계', strengthHeuristic: '일간의 세력과 생조·설기 관계',
  natalInteractions: '원국의 합·충·형 관계', shinsal: '신살의 배치와 해석상 한계', usefulGod: '용신과 희신',
  majorLuck: '대운의 흐름', yearlyLuck: '세운의 흐름', monthlyLuck: '월운의 흐름', advancedFactors: '지지와 오행의 추가 관계',
  palaces: '자미두수의 궁과 별 배치', bodyPalace: '신궁의 위치', planets: '행성의 위치',
  ascendant: '상승점', aspects: '행성 간 각도', houseCusps: '하우스의 경계',
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

export function redactInternalEvidence(body: ChapterBody, question = '', factLabels: string[] = [], locale = 'ko'): { body: ChapterBody; count: number } {
  const keys = exposedKeys(factLabels, locale);
  const isInternal = (token: string) => new RegExp(`^${EVIDENCE_ID.source}$`).test(token) || keys.includes(token);
  const shortName = (key: string) => professionalEvidenceNames[key]?.split(' — ')[0];
  let count = 0;
  const particle = (name: string, found?: string) => {
    if (!found) return '';
    const pair = PARTICLES.find(p => p.includes(found))!, fc = finalConsonant(name);
    return pair[0] === '으로' ? (fc && fc !== 8 ? '으로' : '로') : fc ? pair[0] : pair[1];
  };
  const PARTICLE = '(?:(?<particle>으로|로|은|는|을|를|과|와|이|가)(?=[\\s.,!?·)\\]」』]|$))?';
  const names = Object.keys(professionalEvidenceNames).filter(k => keys.includes(k));
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
      { ...a, answer: fix(a.answer) as string, reason: fix(a.reason) as string, timing: fix(a.timing) as string, action: fix(a.action) as string }) } : {}),
  };
  if (body.title === undefined) delete (out as {title?: string}).title;
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
