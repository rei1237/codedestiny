import type { ChapterBody } from '../book-contracts';
import type { Consultation } from '../consultation';
import { FortuneError } from '../shared/contracts';
import type { AskAnalysis } from './analysis';
import type { EvidencePacket } from './contracts';
import { buildAskFirstChapterPrompt } from './prompt';
import { periodOverlaps } from './window';

type Answer = NonNullable<ChapterBody['questionAnswers']>[number] & {
  factIds?: unknown;
  timingIds?: unknown;
  evidenceStatus?: unknown;
};

const uniqueIds = (value: unknown, allowed: Set<string>) => Array.isArray(value) &&
  value.every(id => typeof id === 'string' && allowed.has(id)) &&
  new Set(value).size === value.length;

// A written date the period itself does not supply: anything but a requested range's first or last day (or its month).
function datesBeyondPeriod(text: string, restated: Set<string>) {
  return [...text.matchAll(/(20\d{2})[-/.년]\s*(\d{1,2})(?:[-/.월]\s*(\d{1,2}))?/gu)].some(([, y, m, d]) => {
    const month = `${y}-${m.padStart(2, '0')}`;
    return !restated.has(d ? `${month}-${d.padStart(2, '0')}` : month);
  });
}

// The after-period reflection question is optional output: one that is malformed, leaks an internal key, pushes
// repeated checking or more consultations, or claims a reminder/record feature is dropped, never regenerated.
function normalizeReview(value: unknown) {
  if (typeof value !== 'string') return;
  const review = value.replace(/\s+/g, ' ').trim();
  if (review.length < 5 || review.length > 200 || /<\/?[a-z][^>]*>|\b[FT]\d{3}\b|\b(?:saju|ziwei|vedic|astrology|sukuyo|tarot)\.|[a-z][A-Z]/u.test(review) ||
      /매일|날마다|수시로|다시\s*상담|상담을\s*(?:더|또|다시)|다음\s*상담|알림|기록(?:해|을\s*남겨)\s*(?:드|두)|저장해\s*(?:드|두)|100\s*%|반드시|무조건/u.test(review)) return;
  return review;
}

/** Validate private model citations before the public chapter is stored. */
export function validateAskChapter(body: ChapterBody, consultation: Consultation, analysis: AskAnalysis, packet: EvidencePacket): ChapterBody {
  const guide = buildAskFirstChapterPrompt(consultation, analysis, packet);
  if (!guide.questions.length) return body;
  const answers = body.questionAnswers as Answer[] | undefined;
  if (!Array.isArray(answers) || answers.length !== guide.questions.length)
    throw new FortuneError('ASK_EVIDENCE_INCOMPLETE');
  const facts = new Map(guide.evidence.facts.map(fact => [fact.id, fact]));
  const timing = new Map(guide.evidence.timing.map(period => [period.id, period]));
  const periodContract = guide.version === 'ask-first-chapter-v3';
  // v3 answers name their consultation period in absolute dates; restating a range boundary is not a dated claim.
  const restated = new Set(periodContract ? (guide.requestedPeriod.ranges || [])
    .flatMap(range => [range.start, range.end, range.start.slice(0, 7), range.end.slice(0, 7)]) : []);
  for (const question of guide.questions) {
    const answer = answers.find(item => item?.questionId === question.questionId);
    if (!answer || !uniqueIds(answer.factIds, new Set(question.factIds)) ||
        !uniqueIds(answer.timingIds, new Set(question.timingIds)) ||
        !['grounded', 'limited'].includes(String(answer.evidenceStatus)))
      throw new FortuneError('ASK_EVIDENCE_INCOMPLETE');
    const factIds = answer.factIds as string[], timingIds = answer.timingIds as string[];
    if (answer.evidenceStatus === 'grounded' &&
        ((!factIds.length && question.factIds.length > 0) ||
         (!timingIds.length && question.needsTiming) ||
         (!question.factIds.length && !question.timingIds.length)))
      throw new FortuneError('ASK_EVIDENCE_INCOMPLETE');
    if (!question.needsTiming && timingIds.length)
      throw new FortuneError('ASK_UNSUPPORTED_TIMING');
    if (answer.evidenceStatus === 'limited' && datesBeyondPeriod(
      [answer.answer,answer.reason,answer.timing,answer.action].join('\n'), restated))
      throw new FortuneError('ASK_UNSUPPORTED_TIMING');
    for (const id of [...factIds, ...timingIds]) {
      const source = (facts.get(id) || timing.get(id))?.source.factId;
      if (!source || !body.sources.includes(source)) throw new FortuneError('ASK_EVIDENCE_INCOMPLETE');
    }
    if (answer.evidenceStatus === 'grounded' && question.needsTiming) {
      if (guide.requestedPeriod.start && guide.requestedPeriod.end &&
          timingIds.some(id => timing.get(id)!.relation !== 'in-effect' && !periodOverlaps(timing.get(id)!.from,timing.get(id)!.to,
            {from:guide.requestedPeriod.start!,to:guide.requestedPeriod.end!})))
        throw new FortuneError('ASK_UNSUPPORTED_TIMING');
      const citedPeriods = timingIds.map(id => timing.get(id)!);
      if (datesBeyondPeriod(answer.timing, restated) &&
          citedPeriods.every(period => period.resolution === 'year'))
        throw new FortuneError('ASK_UNSUPPORTED_TIMING');
      const citedYears = new Set(timingIds.flatMap(id => {
        const period = timing.get(id)!;
        const first = Number(period.from.slice(0, 4)), last = Number(period.to.slice(0, 4));
        return Number.isInteger(first) && Number.isInteger(last) && last - first <= 30
          ? Array.from({length: last - first + 1}, (_, i) => String(first + i)) : [];
      }));
      for (const year of answer.timing.match(/20\d{2}/g) || [])
        if (year !== guide.asOf.slice(0, 4) && !citedYears.has(year)) throw new FortuneError('ASK_UNSUPPORTED_TIMING');
    }
  }
  const prose = [body.summary, body.persona, ...(body.analysis || []), ...(body.highlights || []),
    ...(body.blocks || []).flatMap(block => [block.title, ...block.paragraphs]),
    ...answers.flatMap(answer => [answer.answer, answer.reason, answer.timing, answer.action])].join('\n');
  if (/\b[FT]\d{3}\b|(?:100\s*%|반드시|무조건|guaranteed|definitely).{0,30}(?:재회|결혼|성공|reunion|marriage|success)/iu.test(prose))
    throw new FortuneError('ASK_UNSAFE_CLAIM');
  const categories=new Map(guide.questions.map(question=>[question.questionId,question.category]));
  // The citations stay on the stored chapter as server-only internalBasis (packet IDs plus the fact IDs they point at,
  // which outlive the ask checkpoint). presentFortune removes it; the public answers never carry them.
  const internalBasis={questionAnswers:answers.map(answer=>{
    const factIds=answer.factIds as string[],timingIds=answer.timingIds as string[];
    return {questionId:answer.questionId,factIds:[...factIds],timingIds:[...timingIds],evidenceStatus:answer.evidenceStatus as 'grounded'|'limited',
      sources:[...new Set([...factIds,...timingIds].map(id=>(facts.get(id)||timing.get(id))!.source.factId))]};
  })};
  return {...body, internalBasis, questionAnswers: answers.map(({factIds: _facts, timingIds: _timing, evidenceStatus, review: rawReview, ...answer}) => {
    const review = periodContract ? normalizeReview(rawReview) : undefined;
    return {...answer, ...(review ? {review} : {}), mode:evidenceStatus==='limited'?'limited':categories.get(answer.questionId)==='health'?'care':'normal'};
  })};
}
