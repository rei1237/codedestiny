// 셸 UI 검증 중 결제·생성·상담 요청이 한 건도 나가지 않았는지 기록한다.
// 시트 열기·필터·모드 전환·재렌더는 화면만 바꿔야 한다 — 돈이나 LLM 을 건드리면 그 자체가 회귀다.
// 허용 목록이 아니라 금지 목록이라 새 엔드포인트는 조용히 통과할 수 있다. 그래서 /api/ 로 나간
// 요청은 전부 `seen` 에 남기고, 호출자는 금지 건수와 함께 전체 목록도 보고서에 남긴다.

const FORBIDDEN = [
  { re: /^\/api\/payments?(\/|$)/, why: 'payment' },
  { re: /^\/api\/checkout(\/|$)/, why: 'payment' },
  { re: /^\/api\/billing\/(?!features(\/|$))/, why: 'billing' },
  { re: /^\/api\/(coin|coins|points)\/(spend|consume|charge|deduct)/, why: 'spend' },
  { re: /^\/api\/subscription\/(start|cancel|change|issue)/, why: 'subscription-write' },
  { re: /^\/api\/(fortune-chat|chat|consult|consultation|ai|llm|generate|premium|reading)(\/|$)/, why: 'generation' },
  { re: /^\/api\/[a-z0-9-]*(generate|stream|completion)/, why: 'generation' },
];

export function classify(pathname, method) {
  if (pathname === '/api/billing/features' && method === 'GET') return null;
  for (const rule of FORBIDDEN) if (rule.re.test(pathname)) return rule.why;
  return null;
}

export function watchForbiddenRequests(page) {
  const seen = [];
  const forbidden = [];
  page.on('request', (request) => {
    let url;
    try { url = new URL(request.url()); } catch { return; }
    if (!url.pathname.startsWith('/api/')) return;
    const method = request.method();
    const entry = { method, path: url.pathname };
    seen.push(entry);
    const why = classify(url.pathname, method);
    if (why) forbidden.push({ ...entry, why });
  });
  return { seen, forbidden };
}
