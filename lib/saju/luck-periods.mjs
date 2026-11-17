// A period contains only coexisting luck pillars. Never clash two different decades/years.
export const SAJU_PERIOD_VERSION = 'saju-periods-v1';
const kind = row => row.scope || 'luck';
const identity = row => [kind(row), row.stem, row.branch, row.startDate || row.startYear || row.age || '', row.endDate || row.endYear || '', row.year || ''].join(':');
const dateYear = value => Number(String(value || '').slice(0, 4)) || null;
const range = row => ({ start: dateYear(row.startDate) || Number(row.startYear) || null, end: dateYear(row.endDate) || Number(row.endYear) || null });
export const sajuPeriodIncludesYear = (row, year) => {
  const { start, end } = range(row);
  return Boolean(start && end && Number.isInteger(year) && year >= start && year <= end);
};

export function sajuLuckPeriods(input = [], { simultaneous = false } = {}) {
  const rows = [...new Map(input.map(row => [identity(row), row])).values()];
  const period = values => ({
    id: values.length ? values.map(identity).sort().join('|') : 'natal',
    label: values.length ? values.map(row => row.label || `${row.year || ''} ${row.stem || ''}${row.branch || ''}`.trim()).join(' · ') : '원국',
    rows: values,
  });
  if (simultaneous) {
    const scopes = rows.map(kind);
    if (new Set(scopes).size !== scopes.length) throw new TypeError('NON_SIMULTANEOUS_SAJU_LUCK');
    const decade = rows.find(row => kind(row) === 'daewoon'), annual = rows.find(row => kind(row) === 'sewoon');
    if (decade && annual) {
      const { start, end } = range(decade);
      if (start && end && annual.year && (annual.year < start || annual.year > end)) throw new TypeError('NON_SIMULTANEOUS_SAJU_LUCK');
    }
    return [period(rows)];
  }
  const result = [period([])];
  const decades = rows.filter(row => kind(row) === 'daewoon');
  for (const row of rows) {
    if (kind(row) !== 'sewoon' || !row.year) { result.push(period([row])); continue; }
    const matches = decades.filter(decade => sajuPeriodIncludesYear(decade, row.year));
    // With two decade boundaries in the same calendar year, evaluate both separately.
    // Their labels retain the decade's dates; they never share a calculation frame.
    if (matches.length) for (const decade of matches) result.push(period([decade, row]));
    else result.push(period([row]));
  }
  return result;
}
