import sharp from 'sharp';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const originals = path.join(root, 'assets/yeoni-teahouse/originals');
const output = path.join(root, 'public/images/fortune-tea-house/renewal');
await mkdir(output, { recursive: true });
const packs = [
  ['character-sheet.png', 1, 1, ['character-sheet'], '제작 기준: 정면·측면·후면, 두 모습의 대응 특징'],
  ['yeoni-tea-welcome.png', 1, 1, ['yeoni-tea-welcome'], '홈 대표: 차를 건네는 꽃돼지 연이'],
  ['consultation-scenes.png', 2, 2, ['yeoni-human-welcome','yeoni-saju','yeoni-tarot','yeoni-sukuyo'], '홈 상담 방식·상담 도입'],
  ['pig-reactions.png', 4, 2, ['pig-welcome','pig-listening','pig-thinking','pig-empathy','pig-advice','pig-cheer','pig-completed','pig-waiting'], '꽃돼지 안내·입력·상태'],
  ['human-states.png', 3, 3, ['human-listening','human-explaining','human-smile','human-advice','human-letter','state-brewing','state-completed','state-empty','state-retry'], '인간형 상담·결과 편지·상담함·복구'],
  ['props.png', 3, 2, ['prop-teacup','prop-teapot','prop-petals','prop-envelope','prop-notebook','prop-card-back'], '보조 소품·카드 선택'],
];
const alternatives = {
  "character-sheet": "꽃돼지와 인간형 연이의 앞·옆·뒷모습, 표정과 공통 꽃 장식 기준",
  "yeoni-tea-welcome": "찻집에서 손님에게 차를 건네는 꽃돼지 연이",
  "yeoni-human-welcome": "창가 상담 테이블에서 손님을 맞이하는 인간형 연이",
  "yeoni-saju": "계절 그림과 상담 기록을 살펴보는 인간형 연이",
  "yeoni-tarot": "카드 뒷면을 펼치며 상담을 준비하는 인간형 연이",
  "yeoni-sukuyo": "달빛과 두 별의 연결을 살펴보는 인간형 연이",
  "pig-welcome": "반갑게 인사하는 꽃돼지 연이",
  "pig-listening": "고개를 기울여 경청하는 꽃돼지 연이",
  "pig-thinking": "차분하게 생각하는 꽃돼지 연이",
  "pig-empathy": "마음을 헤아리는 꽃돼지 연이",
  "pig-advice": "조심스럽게 조언하는 꽃돼지 연이",
  "pig-cheer": "손님을 응원하는 꽃돼지 연이",
  "pig-completed": "상담 완료를 알리는 꽃돼지 연이",
  "pig-waiting": "차를 기다리는 꽃돼지 연이",
  "human-listening": "고민을 경청하는 인간형 연이",
  "human-explaining": "상담 근거를 설명하는 인간형 연이",
  "human-smile": "따뜻하게 미소 짓는 인간형 연이",
  "human-advice": "차분하게 조언하는 인간형 연이",
  "human-letter": "마무리 편지를 건네는 인간형 연이",
  "state-brewing": "상담을 준비하며 차를 우리는 꽃돼지 연이",
  "state-completed": "완성된 편지를 건네는 꽃돼지 연이",
  "state-empty": "빈 쟁반과 함께 기다리는 꽃돼지 연이",
  "state-retry": "다시 준비할 수 있도록 안내하는 꽃돼지 연이",
  "prop-teacup": "꽃무늬 찻잔",
  "prop-teapot": "연이의 꽃무늬 주전자",
  "prop-petals": "연분홍 꽃잎",
  "prop-envelope": "꽃 봉인이 있는 편지 봉투",
  "prop-notebook": "상담 기록 노트",
  "prop-card-back": "꽃과 찻잔 무늬의 장식용 카드 뒷면"
};
const screens = {
  'character-sheet': ['art-reference'],
  'yeoni-tea-welcome': ['home-hero', 'ggulggul-entry'],
  'yeoni-human-welcome': ['home-result-preview'],
  'yeoni-saju': ['home-method', 'question-method', 'saju-result'],
  'yeoni-tarot': ['home-method', 'question-method'],
  'yeoni-sukuyo': ['home-method', 'question-method', 'sukuyo-result'],
  'pig-listening': ['question-intro'],
  'pig-empathy': ['result-core-answer'],
  'pig-advice': ['result-action-advice'],
  'prop-envelope': ['result-letterhead'],
  'pig-cheer': ['result-honey-letter'],
  'human-letter': ['result-closing'],
  'state-brewing': ['generation', 'library-pending'],
  'state-completed': ['generation-complete'],
  'state-empty': ['library-empty'],
  'state-retry': ['generation-error', 'library-error'],
  'prop-card-back': ['tarot-selection'],
};
const entries = [];
for (const [source, columns, rows, names, usage] of packs) {
  const sourcePath = path.join(originals, source);
  try { await stat(sourcePath); } catch { console.warn(`Pending source: ${source}`); continue; }
  const meta = await sharp(sourcePath).metadata();
  for (let i = 0; i < names.length; i++) {
    const left = Math.floor(i % columns * meta.width / columns);
    const top = Math.floor(Math.floor(i / columns) * meta.height / rows);
    const width = Math.floor((i % columns + 1) * meta.width / columns) - left;
    const height = Math.floor((Math.floor(i / columns) + 1) * meta.height / rows) - top;
    const destination = path.join(output, `${names[i]}.webp`);
    await sharp(sourcePath).extract({left,top,width,height}).resize({width: columns === 1 ? 1440 : 640, withoutEnlargement:true}).webp({quality:85,alphaQuality:100}).toFile(destination);
    const result = await sharp(destination).metadata();
    entries.push({file:`/images/fortune-tea-house/renewal/${names[i]}.webp`,source:`assets/yeoni-teahouse/originals/${source}`,usage,screens:screens[names[i]]||[],status:screens[names[i]]?'applied-or-reference':'available-not-mounted',alt:alternatives[names[i]],decorativeAlt:'',width:result.width,height:result.height,alpha:result.hasAlpha,bytes:(await stat(destination)).size,crop:{left,top,width,height},display:columns===1?'hero: right center; preserve face and cup':'contain for transparent cutouts; center for scenes'});
  }
}
await writeFile(path.join(output,'manifest.json'), JSON.stringify({version:'yeoni-art-20261004',generator:'OpenAI image generation tool',references:['canonical Yeoni profile 1','existing yeoni-sprite7-tarot-photoroom.webp'],entries},null,2)+'\n');
console.log(`Built ${entries.length} optimized Yeoni assets.`);
