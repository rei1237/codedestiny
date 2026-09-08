// Offline queue generation. Never sends outreach or calls an LLM/API.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const weights = { relevance: 25, searchVisibility: 10, contentQuality: 15,
  freshness: 10, spamSafety: 15, outboundQuality: 5, readership: 5, naturalFit: 10, brandFit: 5 };
export function scoreOpportunity(candidate) {
  let score = 0;
  const unknown = [];
  for (const [key, max] of Object.entries(weights)) {
    const value = candidate.ratings?.[key];
    if (value == null) { unknown.push(key); continue; }
    if (!Number.isInteger(value) || value < 0 || value > max) throw new Error(`Invalid ${key} score`);
    score += value;
  }
  const excluded = candidate.excluded === true;
  return { score: excluded ? 0 : score, unknown,
    tier: excluded || score < 40 ? 'exclude' : score < 60 ? 'low' : score < 80 ? 'keep' : 'priority',
    // A score cannot replace editorial review or authorize sending.
    contactReady: !excluded && !unknown.length && candidate.reviewed === true && score >= 80 };
}
export function quickWins(rows = []) {
  return rows.filter(row => Number.isFinite(row.position) && row.position >= 4 && row.position <= 20 &&
    Number.isFinite(row.impressions) && row.impressions > 0)
    .map(row => ({ ...row, evidence: row.query && row.page ? 'query-page' : row.query ? 'query-only' : 'page-only',
      lowSample: row.impressions < 100 }))
    .sort((a, b) => b.impressions - a.impressions);
}
export async function run() {
  const state = JSON.parse(await readFile('docs/seo/SEO_STATE.json', 'utf8'));
  const candidates = JSON.parse(await readFile('docs/seo/outreach/candidates.json', 'utf8'));
  const ageDays = (Date.now() - Date.parse(state.observedAt)) / 86400000;
  if (!Number.isFinite(ageDays)) throw new Error('Invalid observation date');
  const opportunities = candidates.map(c => ({ ...c, evaluation: scoreOpportunity(c) }))
    .sort((a, b) => b.evaluation.score - a.evaluation.score).slice(0, 20);
  const report = { generatedAt: new Date().toISOString(), observedAt: state.observedAt,
    stale: ageDays > 8, metrics: state.metrics, quickWins: quickWins(state.gscRows), opportunities,
    acquiredLinks: state.acquiredLinks, nextActions: state.nextActions, sends: 0 };
  const m = state.metrics;
  const display = value => value == null ? '미확인' : String(value);
  const lines = ['# SEO WEEKLY REPORT', '', `데이터 관측: ${state.observedAt} (집계 기간 ${state.period.start}–${state.period.end}; 주간 수치로 환산하지 않음)`,
    `데이터 갱신 필요: ${report.stale ? '예 — 이번 주 수치로 사용하지 않음' : '아니오'}`, '',
    `Organic Clicks: ${display(m.organicClicks)}`, `Impressions: ${display(m.impressions)}`,
    `CTR: ${m.ctr == null ? '미확인' : `${m.ctr}%`}`, `Indexed Pages: ${display(m.indexedPages)}`,
    `New Referring Domains: ${display(m.newReferringDomains)}`, '', '## 이번 주 개선',
    `기록 기준: ${state.lastWeeklyCycle}; 과거 기록은 이번 주 완료로 집계하지 않음.`,
    ...state.improvements.map(x => `- ${x}`), '', '## 새로운 SEO 기회',
    ...report.quickWins.map(x => `- ${x.query || x.page}: ${x.impressions}회, ${x.position}위 (${x.evidence}${x.lowSample ? ', 적은 표본' : ''})`),
    '', '## 백링크 후보', ...opportunities.map(c => `- ${c.site}: ${c.evaluation.score}/100, ${c.evaluation.tier}, 미확인 ${c.evaluation.unknown.length}항목, ${c.status}`),
    '', '## 획득된 링크',
    ...(state.acquiredLinks?.length ? state.acquiredLinks.map(link => `- ${link.url} → ${link.asset} (관측 ${link.observedAt})`)
      : ['- 신규 획득 확인 없음. 기존 GSC 표본과 신규 획득을 구분.']), '',
    '## AdSense 위험요소', ...state.adsense.risks.map(x => `- ${x}`), '', '## 다음 주 우선순위',
    ...state.nextActions.map((x, i) => `${i + 1}. ${x}`), ''];
  await mkdir('seo-qa/operations', { recursive: true });
  await writeFile('seo-qa/operations/weekly.json', JSON.stringify(report, null, 2) + '\n');
  await writeFile('seo-qa/operations/weekly.md', lines.join('\n'));
  console.log(`[seo-growth] ${report.quickWins.length} opportunities; ${opportunities.length} candidates; sends=0; stale=${report.stale}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await run();
