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
};

export function assertProfessionalProse(body: ChapterBody, question = '', factLabels: string[] = []) {
  const prose = [body.summary, body.example, body.advice, body.persona, ...(body.analysis || []), ...(body.highlights || []),
    ...(body.blocks || []).flatMap(b => [b.title, ...b.paragraphs]),
    ...(body.questionAnswers || []).flatMap(a => [a.answer, a.reason, a.timing, a.action])].join('\n');
  const text = question ? prose.split(question).join('') : prose;
  if (/\b(?:saju|ziwei|vedic|astrology|sukuyo|tarot)\.[A-Za-z][\w.[\]-]*|\b(?:FortuneFact|CALCULATED_DATA|USER_QUESTION|factSelectors|requiredSections|engineVersion|questionAnswers)\b/.test(text) ||
    [...Object.keys(professionalEvidenceNames),...factLabels.filter(k=>/^[A-Za-z][A-Za-z0-9]+$/.test(k))].some(key => new RegExp(`\\b${key}\\b`).test(text))) {
    throw new FortuneError('INTERNAL_EVIDENCE_EXPOSED');
  }
}

export function validatePreciseTiming(body: ChapterBody, consultation: Consultation | undefined, evidence: unknown) {
  if(!consultation)return;
  const text=[body.summary,body.example,body.advice,body.persona,...body.analysis,...(body.blocks || []).flatMap(b=>b.paragraphs),
    ...(body.questionAnswers || []).flatMap(a=>[a.answer,a.reason,a.timing,a.action])].join('\n');
  const dates=(value:string)=>[...value.matchAll(/(20\d{2})(?:년\s*|-|\/)(\d{1,2})(?:월\s*|-|\/)(\d{1,2})일?/g)].map(m=>`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`);
  const allowed=new Set(dates(JSON.stringify(evidence)+' '+JSON.stringify(consultation)));
  if(dates(text).some(date=>!allowed.has(date)))throw new FortuneError('UNSUPPORTED_PRECISE_TIMING');
}
