#!/usr/bin/env node
// 연이의 운명 노벨 웹툰(영냥이 시즌 1) 완성 원고를 빌드 폴더에서 리포로 들인다.
//   node scripts/import-yeoni-webtoon-episode.mjs --pages            # script/pages.json → lib/yeongnyangi/season-1-pages.mjs(제목·로그라인·쪽 alt)
//   node scripts/import-yeoni-webtoon-episode.mjs --ep 5 [--check]   # epN/out → 리포 이미지 + 출처 기록
//   --from <빌드 폴더>  기본 D:/CodeDestiny-Build/yeoni-novel-webtoon-20261113
// 1화는 프롤로그 경로(public/images/webtoons/yeoni-prologue/, 항상 공개), 2화부터는 content/yeongnyangi/season-1/epN/
// (공개 시각이 지나야 빌드 때 public/으로 복사된다 — scripts/publish-yeongnyangi-serial.mjs).
// 쪽 수는 season-1-pages.mjs와 정확히 같아야 하고, 쪽마다 NN-{720,1122}.{avif,webp}가 있어야 한다. 하나라도 어긋나면 아무것도 복사하지 않는다.
// 복사 뒤 docs/design/consultation-webtoon-assets.json에 쪽별 출처(work 'yn-s1-epN')를 다시 쓴다.
// 회차를 공개하려면 이 스크립트로 들인 뒤 lib/yeongnyangi/season-1.mjs에서 그 회차의 status를 'ready'로 바꾼다.
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: {
  ep: { type: 'string' }, pages: { type: 'boolean' }, check: { type: 'boolean' },
  from: { type: 'string', default: 'D:/CodeDestiny-Build/yeoni-novel-webtoon-20261113' },
} });
const FROM = values.from.replace(/\\/g, '/');
const PAGES_MODULE = 'lib/yeongnyangi/season-1-pages.mjs';
const PROVENANCE = 'docs/design/consultation-webtoon-assets.json';
const WIDTHS = [720, 1122];
const SIZE = { w: 1122, h: 1402 };
const pad = n => String(n).padStart(2, '0');
const fail = message => { console.error(`[import-yeoni-webtoon] ${message}`); process.exit(1); };

// 그림 속 글자를 alt에 그대로 옮긴다(스크린리더용). 구도 설명 + 읽는 순서대로 대사·내레이션·화면 글자.
const LABEL = { ui: '화면', sfx: '효과음', sign: '글자' };
function textLine(text) {
  const ko = text.ko.split('\n').map(part => part.trim()).filter(Boolean).join(' · ');
  if (text.type === 'narration') return ko;
  if (text.type === 'speech') return `${text.speaker}: ${ko}`;
  if (text.type === 'thought') return `${text.speaker || '연이'}(속말): ${ko}`;
  return `${LABEL[text.type] || '글자'}: ${ko}`;
}
function pageAlt(page) {
  const lines = page.text.map(textLine);
  return lines.length ? `${page.alt} ${lines.join(' / ')}` : page.alt;
}

function writePagesModule() {
  const script = JSON.parse(readFileSync(join(FROM, 'script', 'pages.json'), 'utf8'));
  if (script.width !== SIZE.w || script.height !== SIZE.h) fail(`page size ${script.width}x${script.height}`);
  const data = Object.fromEntries(script.episodes.map(episode => [`ep${episode.no}`, {
    title: episode.title, logline: episode.logline,
    pages: episode.pages.map(page => ({ n: page.n, alt: pageAlt(page) })),
  }]));
  const body = Object.entries(data).map(([slug, episode]) => [
    `  ${slug}: {`,
    `    title: ${JSON.stringify(episode.title)},`,
    `    logline: ${JSON.stringify(episode.logline)},`,
    '    pages: [',
    ...episode.pages.map(page => `      { n: ${page.n}, alt: ${JSON.stringify(page.alt)} },`),
    '    ],',
    '  },',
  ].join('\n')).join('\n');
  writeFileSync(PAGES_MODULE, `// 생성물: node scripts/import-yeoni-webtoon-episode.mjs --pages (원본 ${FROM}/script/pages.json, 리포 사본 docs/design/yeoni-novel-webtoon-script.md).\n`
    + '// 연이의 운명 노벨 웹툰 7편의 제목·로그라인·쪽 alt. 대사가 그림 안에 있어 alt에 그 쪽의 구도와 글자를 그대로 담는다.\n'
    + '// 1화는 프롤로그(lib/yeongnyangi/prologue.mjs), 2~7화는 연재표(lib/yeongnyangi/season-1.mjs)가 쓴다.\n'
    + `export const SEASON_ONE_PAGES = {\n${body}\n};\n`);
  console.log(`[import-yeoni-webtoon] wrote ${PAGES_MODULE}: ${Object.entries(data).map(([slug, e]) => `${slug} ${e.pages.length}`).join(', ')}`);
}

async function importEpisode(no) {
  const slug = `ep${no}`;
  const { SEASON_ONE_PAGES } = await import(new URL(`../${PAGES_MODULE}`, import.meta.url));
  const expected = SEASON_ONE_PAGES[slug]?.pages.length;
  if (!expected) fail(`${slug} is not in ${PAGES_MODULE} (run --pages first)`);
  const src = join(FROM, slug, 'out');
  if (!existsSync(src)) fail(`missing ${src}`);
  const files = readdirSync(src).filter(name => /^\d{2}-\d+\.(avif|webp)$/.test(name));
  const want = [];
  for (let n = 1; n <= expected; n++) for (const w of WIDTHS) for (const ext of ['avif', 'webp']) want.push(`${pad(n)}-${w}.${ext}`);
  const missing = want.filter(name => !files.includes(name));
  const extra = files.filter(name => !want.includes(name));
  if (missing.length || extra.length) fail(`${slug}: expected ${expected} pages; missing [${missing.join(', ')}] extra [${extra.join(', ')}]`);
  const provenance = JSON.parse(readFileSync(join(src, 'provenance.json'), 'utf8'));
  if (provenance.pages.length !== expected) fail(`${slug}: provenance has ${provenance.pages.length} pages, expected ${expected}`);
  const { default: sharp } = await import('sharp');
  for (let n = 1; n <= expected; n++) for (const w of WIDTHS) {
    const meta = await sharp(join(src, `${pad(n)}-${w}.webp`)).metadata();
    const h = Math.round(SIZE.h * w / SIZE.w);
    if (meta.width !== w || Math.abs(meta.height - h) > 1) fail(`${slug} ${pad(n)}-${w}.webp is ${meta.width}x${meta.height}, expected ${w}x${h}`);
  }
  const dst = no === 1 ? join('public', 'images', 'webtoons', 'yeoni-prologue') : join('content', 'yeongnyangi', 'season-1', slug);
  console.log(`[import-yeoni-webtoon] ${slug}: ${expected} pages ok (${src} -> ${dst})`);
  if (values.check) return;

  mkdirSync(dst, { recursive: true });
  for (const name of readdirSync(dst)) if (/^\d{2}-\d+\.(avif|webp)$/.test(name)) rmSync(join(dst, name));
  for (const name of want) copyFileSync(join(src, name), join(dst, name));

  const work = `yn-s1-${slug}`;
  const local = path => path.replace(/\\/g, '/').replace(/^[A-Za-z]:\//, '');
  const entries = provenance.pages.map(page => {
    const raw = join(FROM, slug, 'raw', page.rawFile);
    return {
      work, cut: pad(page.page),
      files: `${dst.replace(/\\/g, '/')}/${pad(page.page)}-{720,1122}.{avif,webp}`,
      origin: 'generated',
      source: local(`${FROM}/${slug}/raw/${page.rawFile}`),
      ...(existsSync(raw) ? { sourceSha256: createHash('sha256').update(readFileSync(raw)).digest('hex').slice(0, 16) } : {}),
      tool: 'OpenAI gpt-image-2 via Codex CLI image_gen (OAuth)',
      date: page.date,
      referenceImages: page.referenceImages.map(local),
      prompt: page.prompt,
      note: `연이의 운명 노벨 웹툰 ${no}화. 쪽번호 꼬리표만 node(sharp)로 덧붙임. 출력 1122.webp sha256 ${page.sha256.slice(0, 16)}`,
    };
  });
  const assets = JSON.parse(readFileSync(PROVENANCE, 'utf8'));
  // 1화 그림이 덮어쓴 옛 프롤로그 24쪽(yn-prologue) 기록은 1화를 들일 때 걷어 낸다.
  const replaced = new Set([work, ...(no === 1 ? ['yn-prologue'] : [])]);
  assets.cuts = [...assets.cuts.filter(cut => !replaced.has(cut.work)), ...entries];
  writeFileSync(PROVENANCE, `${JSON.stringify(assets, null, 1)}\n`);
  console.log(`[import-yeoni-webtoon] ${slug}: copied ${want.length} files, ${entries.length} provenance entries (${work})`);
}

if (values.pages) writePagesModule();
if (values.ep) {
  const no = Number(values.ep);
  if (!Number.isInteger(no) || no < 1 || no > 7) fail(`--ep must be 1..7, got ${values.ep}`);
  await importEpisode(no);
}
if (!values.pages && !values.ep) fail('usage: --pages | --ep N [--check] [--from <build folder>]');
