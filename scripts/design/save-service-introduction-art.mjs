import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [slug, source] = process.argv.slice(2);
const ledgerPath = 'docs/design/service-introduction-art.json';
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const item = ledger.assets.find(row => row.slug === slug);
if (!item || !source || !fs.existsSync(source)) throw new Error('Known feature and generated image required');
fs.mkdirSync(path.dirname(item.output), { recursive: true });
await sharp(source).resize({ width: 1536, withoutEnlargement: true }).webp({ quality: 86 }).toFile(item.output);
for (const width of [320, 640, 960]) {
  await sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toFile(item.output.replace('.webp', `-${width}.webp`));
}
item.source = path.basename(source);
item.status = 'generated-awaiting-review';
const names = {yeoniPalm:'인간 연이',yeoni:'연이',yeoniPig:'꽃돼지 연이',neo:'네오',hanbi:'서한비',yun:'윤달',musung:'무성',master:'마스터',yeongnyangi:'영냥이'};
const specificAlt = {
  'palm-reading':'분홍 머리의 인간 연이가 펼친 손바닥의 손금을 함께 살피는 장면',
  ziwei:'무성이 열두 궁 명반의 별자리를 금빛 깃털로 짚는 장면',
  sukuyo:'서한비가 두 달 자리 사이의 관계 거리를 살피는 장면',
  astrology:'윤달이 서양 점성술의 원형 출생차트와 행성 배치를 살피는 장면',
  vedic:'윤달이 베다점의 마름모 차트와 달의 자리를 살피는 장면',
};
const catScenes = {
  saju: ['사주', '네 기둥과 다섯 원소를 살피는'],
  tarot: ['타로', '펼친 타로 카드의 흐름을 읽는'],
  ziwei: ['자미두수', '사각 열두 궁 명반의 별을 짚는'],
  astrology: ['서양 점성술', '원형 출생차트와 행성 배치를 살피는'],
  vedic: ['베다점', '마름모로 나뉜 베다 차트를 살피는'],
  sukuyo: ['숙요점', '두 달 자리의 관계 거리를 살피는'],
  'fusion-saju-ziwei': ['사주·자미두수 융합', '사주 기둥과 열두 궁 명반을 비교하는'],
  'fusion-sukuyo-vedic': ['숙요·베다 융합', '두 달의 관계와 베다 차트를 함께 읽는'],
  'fusion-astrology-tarot': ['점성술·타로 융합', '행성 차트와 타로 카드를 함께 읽는'],
  'fusion-all': ['전체 융합', '사주·자미두수·숙요·베다·점성술·타로 도구를 함께 살피는'],
};
for (const row of ledger.assets) {
  const scene = row.slug.startsWith('yeongnyangi-') && catScenes[row.slug.slice(12)];
  if (scene) {
    row.title = `영냥이 ${scene[0]}`;
    row.alt = `마법사 고양이 영냥이가 ${scene[1]} 장면`;
  }
}
for (const row of ledger.assets) row.alt ||= specificAlt[row.slug] || (row.masters.length
  ? `${row.masters.map(key=>names[key]).join('·')}의 ${row.title} 상담 장면`
  : `${row.title}의 핵심 도구와 이용 장면을 담은 일러스트`);
fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n');
const published = Object.fromEntries(ledger.assets.filter(row => row.source).map(row => [
  row.slug, {
    image: '/' + row.output.replace(/^public\//, ''),
    cardImage: '/' + row.output.replace(/^public\//, '').replace('.webp', '-320.webp'),
    alt: row.alt || `${row.title}의 상담 도구와 이용 장면을 담은 일러스트`,
  },
]));
fs.writeFileSync('lib/marketing/service-introduction-art.json', JSON.stringify(published, null, 2) + '\n');
console.log(`${slug}: saved original composition and 320/640/960 WebP`);
