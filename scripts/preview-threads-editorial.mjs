// 실제 발행/유료 모델 없이 같은 provider로 7일 편성과 첫날 12띠 전문을 출력한다.
import './lib/mock-network-guard.cjs';
import { build } from 'esbuild';
import { mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const date = process.argv.find(arg => arg.startsWith('--date='))?.slice(7) || '2026-10-04';
if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T03:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error('Valid --date=YYYY-MM-DD required');
const types = ['zodiac', 'saju', 'karma'];
const bundle = await build({
  stdin: { contents: types.map(type => `export * as ${type} from './worker/lib/threads-daily-providers/${type}.js';`).join('\n') + "\nexport * as shared from './worker/lib/threads-daily-providers/shared.js';\nexport {threadsTextWeight} from './worker/lib/threads.js';", resolveDir: root },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  plugins: [{ name: 'no-live-sky', setup(b) {
    b.onResolve({ filter: /swiss-ephemeris\.js$/ }, () => ({ path: 'sky', namespace: 'mock' }));
    b.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: 'export async function getSwissVedicPlanets(){throw new Error("Unexpected sky call in editorial preview")}', loader: 'js' }));
  } }],
});
const cache = path.join(root, 'node_modules/.cache', `threads-editorial-preview-${process.pid}.cjs`);
mkdirSync(path.dirname(cache), { recursive: true });
writeFileSync(cache, bundle.outputFiles[0].text);
try {
  const providers = createRequire(import.meta.url)(cache), rows = [], recent = { zodiac: [], saju: [], karma: [] };
  for (let day = 0; day < 7; day += 1) {
    const now = Date.parse(`${date}T03:00:00Z`) + day * 86400000, key = new Date(now).toISOString().slice(0, 10), row = { date: key };
    for (const type of types) {
      const p = providers[type], facts = p.buildFacts({}, now), { copy } = await p.writeCopy({}, facts, { recent: recent[type] });
      recent[type].push(copy);
      row[type] = { hook: copy.hook, posts: [].concat(p.format(facts, copy, providers.shared.buildUtmUrl('https://code-destiny.com', p.PATH, type, key))) };
    }
    rows.push(row);
  }
  const maxWeight = Math.max(...rows.flatMap(row => types.flatMap(type => row[type].posts.map(providers.threadsTextWeight))));
  if (maxWeight > providers.shared.POST_TEXT_LIMIT) throw new Error(`Post over limit: ${maxWeight}`);
  const output = path.join(root, 'marketing/threads-editorial-preview-20261004.md');
  const first = rows[0];
  const text = `# Threads 일주일 편성과 분야별 띠 운세 원문\n\n문안 버전 ${providers.shared.PROMPT_VERSION}. ${date}부터 7일, 한국 시각. 정본 일진·띠 관계와 검수된 분야별 해석 문안으로 생성한 예시다. 과금 LLM 0회, 실제 게시 0건. 세 분야는 개인 명식의 재성·배우자궁·직업운을 새로 계산한 값이 아니라 날짜와 띠 관계의 생활 영역별 해석이다.\n\n재현: \`node scripts/preview-threads-editorial.mjs --date=${date}\`. 최대 본문 가중 길이 ${maxWeight}/480. 최근 예시끼리 훅 중복을 비교했으며 실제 공개 이력은 발행 전 별도 확인한다.\n\n## 일주일 편성\n\n| 날짜 | 08:30 분야별 띠 운세 | 12:00 해설 | 20:30 마음 노트 |\n|---|---|---|---|\n` +
    rows.map(row => `| ${row.date} | ${row.zodiac.hook} | ${row.date === '2026-10-05' ? '09:00 기존 소개글로 대체, 낮 발행 없음' : row.saju.hook} | ${row.karma.hook} |`).join('\n') +
    `\n\n## ${date} 띠별 연속글 전체\n\n` + first.zodiac.posts.map((post, i) => `### ${i === 0 ? '원글' : `답글 ${i} · 2띠`}\n\n${post}`).join('\n\n') +
    `\n\n## ${date} 낮 해설\n\n${first.saju.posts.join('\n\n')}\n\n## 저녁 원문 7편\n\n` + rows.map(row => `### ${row.date}\n\n${row.karma.posts.join('\n\n')}`).join('\n\n') + '\n';
  writeFileSync(output, text);
  console.log(JSON.stringify({ output, version: providers.shared.PROMPT_VERSION, days: rows.length, zodiacReplyCount: first.zodiac.posts.length - 1, maxWeight, realLlmCalls: 0, realPosts: 0 }));
} finally {
  unlinkSync(cache);
}
