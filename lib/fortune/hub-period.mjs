// Date selection belongs to the adapter, not the fortune engines.
export function hubDay(period = 'today', now = new Date()) {
  const shifted = new Date(now.getTime() + (9 + (period === 'tomorrow' ? 24 : 0)) * 3600000);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

// Existing engines describe their supplied day as today. Only display strings change.
export function labelHubPeriod(payload, period, locale) {
  if (period !== 'tomorrow' || locale !== 'ko') return payload;
  const visit = value => typeof value === 'string' ? value.replaceAll('오늘', '내일')
    : Array.isArray(value) ? value.map(visit)
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, visit(item)])) : value;
  return visit(payload);
}
