// Evaluate actual observations offline. Never calls a model, search API or paid service.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const SEARCH_QUERIES = [
  ['B01', 'brand', '꿀꿀 운세란?'],
  ['B02', 'brand', '꿀꿀 운세 공식 홈페이지'],
  ['B03', 'brand', '코드 데스티니 운세'],
  ['B04', 'brand', '영냥이 사주'],
  ['B05', 'brand', '꿀꿀 운세 후기'],
  ['N01', 'nonbrand', '사주풀이 사이트 추천'],
  ['N02', 'nonbrand', '2027년 신년운세 사이트'],
  ['N03', 'nonbrand', '명리학 기반 사주 분석 서비스'],
  ['N04', 'nonbrand', '자미두수 사주 함께 보는 사이트'],
  ['N05', 'nonbrand', '숙요점 궁합 사이트 추천'],
  ['N06', 'nonbrand', '다양한 점술을 함께 분석하는 운세 사이트'],
].map(([id, group, query]) => ({ id, group, query }));
export const SEARCH_PROVIDERS = ['chatgpt', 'gemini', 'perplexity', 'google', 'naver', 'bing'];
export const CRITERIA = ['brandRecognized', 'officialUrl', 'serviceAccuracy', 'brandRelationship', 'priceAccuracy', 'sourcesPresent', 'nonbrandDiscovery'];

export function evaluateSearchObservations(observations) {
  const seen = new Set();
  const rows = observations.map(row => {
    const query = SEARCH_QUERIES.find(query => query.id === row.queryId);
    if (!query || !SEARCH_PROVIDERS.includes(row.provider)) throw new Error('Unknown query or provider');
    const key = `${row.phase}:${row.provider}:${row.queryId}`;
    if (seen.has(key)) throw new Error(`Duplicate observation: ${key}`);
    seen.add(key);
    if (!['before', 'after'].includes(row.phase)) throw new Error('Missing observation phase');
    if (!['observed', 'blocked', 'not_run'].includes(row.status)) throw new Error('Invalid observation status');
    if (row.status !== 'observed') {
      if (CRITERIA.some(key => row.assessment?.[key] != null)) throw new Error('Unobserved results cannot receive scores');
      return { ...row, group: query.group, assessment: null };
    }
    if (!['ui', 'official_api'].includes(row.method) || row.mock === true) throw new Error('Only actual UI or official API evidence is allowed');
    const hasTime = /^\d{4}-\d\d-\d\dT/.test(row.observedAt || '') && Number.isFinite(Date.parse(row.observedAt));
    const hasDate = /^\d{4}-\d\d-\d\d$/.test(row.observedOn || '') && Number.isFinite(Date.parse(row.observedOn));
    if (!hasTime && !hasDate) throw new Error('Missing actual observation time or date');
    if (!String(row.evidence?.text || '').trim() || !/^https:\/\//.test(row.evidence?.url || '')) throw new Error('Missing answer/result evidence');
    const assessment = Object.fromEntries(CRITERIA.map(key => {
      const value = row.assessment?.[key] ?? null;
      if (value !== null && typeof value !== 'boolean') throw new Error(`Invalid criterion: ${key}`);
      if (value !== null && !String(row.reasons?.[key] || '').trim()) throw new Error(`Missing criterion evidence: ${key}`);
      return [key, key === 'nonbrandDiscovery' && query.group === 'brand' ? null : value];
    }));
    const sources = row.evidence.sources || [];
    if (!Array.isArray(sources) || sources.some(url => !/^https?:\/\//.test(url))) throw new Error('Invalid observed source URLs');
    return { ...row, group: query.group, assessment };
  });
  const summary = [];
  for (const phase of ['before', 'after']) for (const provider of SEARCH_PROVIDERS) for (const group of ['brand', 'nonbrand']) {
    const relevant = rows.filter(row => row.phase === phase && row.provider === provider && row.group === group);
    summary.push({ phase, provider, group,
      expected: SEARCH_QUERIES.filter(query => query.group === group).length,
      observed: relevant.filter(row => row.status === 'observed').length,
      unavailable: relevant.filter(row => row.status === 'blocked').length,
      criteria: Object.fromEntries(CRITERIA.map(key => {
        const scored = relevant.filter(row => row.status === 'observed' && typeof row.assessment?.[key] === 'boolean');
        return [key, { passed: scored.filter(row => row.assessment[key]).length, evaluated: scored.length }];
      })),
    });
  }
  return { limitation: 'A UI observation or API response is a sample, not a ranking guarantee. Search APIs are not the consumer product UI. Missing observations and unmentioned prices are not failures. Before/after differences require comparable contexts and indexing time.', rows, summary };
}

async function main() {
  const input = process.argv.find(arg => arg.startsWith('--input='))?.slice(8);
  const output = process.argv.find(arg => arg.startsWith('--output='))?.slice(9);
  if (!input || !output) throw new Error('Usage: node scripts/seo/search-evaluation.mjs --input=observations.json --output=evaluation.json');
  const report = evaluateSearchObservations(JSON.parse(await readFile(input, 'utf8')));
  await mkdir(dirname(resolve(output)), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[search-evaluation] ${report.rows.length} observations; paid API calls: 0`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
