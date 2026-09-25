import { FortuneError } from '../shared/contracts';

export function assertEvidenceDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value + 'T00:00:00Z'))
    || new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) !== value)
    throw new FortuneError('INVALID_EVIDENCE_DATE');
}
export function evidenceWindow(today: string) {
  assertEvidenceDate(today);
  const [year, month] = today.split('-').map(Number);
  // Twelve previous months, the current month, and twenty-four following months.
  return {
    from: new Date(Date.UTC(year, month - 13, 1)).toISOString().slice(0, 10),
    to: new Date(Date.UTC(year, month + 24, 0)).toISOString().slice(0, 10),
  };
}
export function periodOverlaps(from: string, to: string, window: {from: string; to: string}) {
  const bounds = (v: string, end: boolean) => {
    if (/^\d{4}$/.test(v)) return v + (end ? '-12-31' : '-01-01');
    if (/^\d{4}-\d{2}$/.test(v)) {
      const [y, m] = v.split('-').map(Number);
      if (m < 1 || m > 12) return '';
      return end ? new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10) : v + '-01';
    }
    if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(v)) return '';
    if(v.includes('T')&&!Number.isFinite(Date.parse(v)))return '';
    try { assertEvidenceDate(v.slice(0, 10)); } catch { return ''; }
    return v.slice(0, 10);
  };
  const a = bounds(from, false), b = bounds(to, true);
  return Boolean(a && b && a <= b && a <= window.to && b >= window.from);
}
