// 사주 명식 카드 전용 글꼴 서브셋(OFL)을 같은 출처로 들여온다. 클라우드 쓰기·배포 없음.
//   CodeDestinyManseHan   — Noto Serif KR 600: 천간 10·지지 12·기둥 표기(時日月年柱). 브랜드 명조(Nanum
//                           Myeongjo)에는 이 한자 대부분이 없어 그동안 모바일·PC 모두 시스템 고딕으로 떨어졌다.
//   CodeDestinyManseLabel — Gowun Dodum 400: 카드 라벨(기둥·십성·오행·띠·신살 이름)만. 전체 청크로 받으면
//                           이 라벨에만 13청크·약 190KB 가 들어 텍스트 서브셋 하나로 줄였다.
// 두 패밀리는 #sajuCard 규칙에서만 참조하므로 명식을 그릴 때만 받는다. 서브셋에 없는 글자는 다음 폴백으로 그린다.
// 재생성: node scripts/build-manse-fonts.mjs  (검사: --check)
import {mkdir, readFile, writeFile, unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = path.join(root, 'public/assets/fonts/manse');
const cssPath = path.join(root, 'styles/fortune-ui.css');
const manifestPath = path.join(directory, 'manifest.json');
const LABEL_TEXT = [
  '사주 명식 시주 일주 월주 년주 천간 지지 음 양 12신살 명식에 머문 신살 · —',
  '일간 비견 겁재 식신 상관 편재 정재 편관 정관 편인 정인',
  '갑목 을목 병화 정화 무토 기토 경금 신금 임수 계수',
  '쥐 소 호랑이 토끼 용 뱀 말 원숭이 닭 개 돼지',
  '겁살 재살 천살 지살 년살 월살 망신살 장성살 반안살 역마살 육해살 화개살',
  '도화살 홍염살 천을귀인 문창귀인 태극귀인 월덕귀인 천덕귀인 괴강살 백호살 양인살 공망 귀문관살 원진살',
].join(' ');
const sources = [
  {
    family: 'CodeDestinyManseHan', name: 'NotoSerifKR', weight: 600,
    text: '甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥時日月年柱',
    license: 'https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifkr/OFL.txt',
  },
  {
    family: 'CodeDestinyManseLabel', name: 'GowunDodum', weight: 400,
    text: [...new Set(LABEL_TEXT.replace(/\s/g, ''))].join(''),
    license: 'https://raw.githubusercontent.com/google/fonts/main/ofl/gowundodum/OFL.txt',
  },
];
const cssUrl = source => `https://fonts.googleapis.com/css2?family=${source.name.replace(/([a-z])([A-Z])/g, '$1+$2')}:wght@${source.weight}&display=swap&text=${encodeURIComponent(source.text)}`;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const urlPattern = name => new RegExp(`url\\('/assets/fonts/manse/${name}-manse-[0-9a-f]{16}\\.woff2'\\)`);

if (process.argv.includes('--check')) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  for (const asset of manifest.assets) {
    if (hash(await readFile(path.join(directory, asset.file))) !== asset.sha256) throw new Error('Invalid manse font asset: ' + asset.file);
  }
  const css = await readFile(cssPath, 'utf8');
  const fonts = manifest.assets.filter(asset => asset.file.endsWith('.woff2'));
  for (const font of fonts) {
    if (!css.includes(`url('/assets/fonts/manse/${font.file}')`)) throw new Error('styles/fortune-ui.css does not reference ' + font.file);
  }
  console.log(`Manse fonts: ${fonts.map(font => `${font.file} ${font.bytes}B`).join(', ')} verified`);
  process.exit(0);
}

async function fetchBytes(url) {
  const response = await fetch(url, {headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'}});
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

await mkdir(directory, {recursive: true});
const previous = await readFile(manifestPath, 'utf8').then(JSON.parse).catch(() => ({assets: []}));
let css = await readFile(cssPath, 'utf8');
const assets = [];
for (const source of sources) {
  const upstreamCss = (await fetchBytes(cssUrl(source))).toString('utf8');
  const src = upstreamCss.match(/url\(([^)]+)\)\s*format\('woff2'\)/)?.[1];
  if (!src) throw new Error('Missing woff2 URL in upstream CSS: ' + source.name);
  const bytes = await fetchBytes(src);
  if (bytes.subarray(0, 4).toString() !== 'wOF2') throw new Error('Expected WOFF2: ' + source.name);
  const file = `${source.name}-manse-${hash(bytes).slice(0, 16)}.woff2`;
  await writeFile(path.join(directory, file), bytes);
  assets.push({file, family: source.family, sha256: hash(bytes), bytes: bytes.length});
  const license = await fetchBytes(source.license);
  const licenseFile = `${source.name}-OFL.txt`;
  await writeFile(path.join(directory, licenseFile), license);
  assets.push({file: licenseFile, url: source.license, sha256: hash(license)});
  if (!urlPattern(source.name).test(css)) throw new Error(`styles/fortune-ui.css has no ${source.family} @font-face url to update`);
  css = css.replace(urlPattern(source.name), `url('/assets/fonts/manse/${file}')`);
}
await writeFile(cssPath, css);
assets.sort((a, b) => a.file.localeCompare(b.file));
await writeFile(manifestPath, JSON.stringify({sources, assets}, null, 2) + '\n');
for (const asset of previous.assets) {
  if (path.basename(asset.file) !== asset.file) throw new Error('Invalid old asset path');
  if (!assets.some(current => current.file === asset.file)) await unlink(path.join(directory, asset.file)).catch(() => {});
}
console.log(`Vendored ${assets.filter(a => a.bytes).map(a => `${a.file} (${a.bytes}B)`).join(', ')}`);
