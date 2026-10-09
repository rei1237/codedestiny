import type { Consultation } from '../consultation';
import type { buildAskFirstChapterPrompt } from './prompt';

export const requestsMonthlyEvidence = (consultation: Consultation) =>
  consultation.questions.some(q => /월별|매월|월마다|월\s*부터|월\s*[~～–-]/u.test(q.text));

// A requested civil month is not a solar-term month. Keep the calculator's
// instants and original IDs; missing evidence never becomes a forecast.
export function buildAskMonthlyEvidence(consultation: Consultation, guide: ReturnType<typeof buildAskFirstChapterPrompt>) {
  if (!requestsMonthlyEvidence(consultation)) return undefined;
  const ranges = consultation.period.ranges || [];
  const requested = ranges.some(r => r.scale === 'month') ? ranges.filter(r => r.scale === 'month') : ranges.filter(r => r.scale === 'year');
  const keys = new Set<string>();
  for (const range of requested) {
    const cursor = new Date(`${range.start.slice(0,7)}-01T00:00:00Z`);
    while (cursor.toISOString().slice(0,10) <= range.end) {
      keys.add(cursor.toISOString().slice(0,7));
      cursor.setUTCMonth(cursor.getUTCMonth()+1);
    }
  }
  if (!keys.size) return undefined;
  const timing = guide.evidence.timing.filter(t => t.source.system === 'saju' && t.label.startsWith('monthlyLuck.') && t.resolution === 'instant')
    .sort((a,b) => a.from.localeCompare(b.from));
  return {
    calendar: 'civil-month', timezone: consultation.timezone,
    months: [...keys].sort().map(month => {
      const starts = timing.filter(t => t.from.slice(0,7) === month);
      const running = timing.filter(t => t.from.slice(0,10) < `${month}-01`).at(-1);
      const evidence = [...(running ? [running] : []), ...starts];
      return {month, evidenceStatus: starts.length ? 'grounded' : 'limited',
        evidence: evidence.map(t => ({id:t.id,source:t.source,value:t.value,startsAt:t.from,
          endsBefore:timing.find(next => next.from > t.from)?.from ?? null}))};
    }),
  };
}

export const ASK_MONTHLY_GUIDE = '월별 요청은 monthlyEvidence.months의 양력 월을 빠짐없이 다룬다. 배정된 질문이 있는 장의 blocks에서 연간 방향을 먼저 설명한 뒤 각 월을 이름 붙여 수입·지출·목돈 관리 중 질문에 해당하는 점과 행동을 간결하게 쓴다. 각 월에 제공된 절기 시작 시각·간지와 원국의 관계를 근거로 붙이고 용어의 뜻을 설명한다. 양력 1일과 절기 월 시작은 다르며 한 양력 월 안에서 월운이 바뀔 수 있다고 밝힌다. 끝 경계가 null이면 정확한 종료 시각을 만들지 않는다. evidenceStatus가 limited인 월도 생략하지 말고 계산 근거 부족과 현실적인 점검 행동을 구분해 쓴다. 다른 장은 해당 근거를 주제에 연결하되 월별 목록을 반복하지 않는다. 제공된 근거가 있는데 없다고 쓰거나 연간 근거만으로 월별 길흉을 만들지 않는다. sources에는 실제 사용한 source.factId를 넣고 내부 ID는 본문에 노출하지 않는다. 기존 장·소제목·분량과 호출 예산을 유지한다.';
