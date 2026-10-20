import fs from 'node:fs';
import path from 'node:path';
import { extractObjectLiteral } from '../lib/feature-marketing-extract.mjs';

// A reviewable production ledger, sourced from the existing feature catalogue.
// Run before generation; reruns preserve generated paths and review state.
const target = 'docs/design/service-introduction-art.json';
const catalogue = JSON.parse(fs.readFileSync('lib/marketing/feature-visual-details.generated.json', 'utf8'));
const prior = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf8')).assets : [];
const shellDetails = extractObjectLiteral(fs.readFileSync('index.html', 'utf8'), 'D');
const extras = [
  ['fortune-prompt-hub', 'fortune-prompt-hub', '종합 운세 프롬프트', '여러 점술의 질문과 해석을 정리하는 프롬프트 작업대'],
  ['tarot-healing', 'openTarotHealingModal', '따뜻한 태양 회복 타로'],
  ['tarot-self-esteem', 'openTarotSelfEsteemModal', '자기 기준 회복 타로'],
  ['hwatu', 'openHwatuModal', '화투점'],
  ['sikojen-povailu', '/oracle/sikojen-povailu', '핀란드 돼지 주석점'],
  ['destiny-island', '/destiny-island.html', '자미두수 운명의 섬', '연이와 네오가 섬에 펼쳐진 열두 궁을 탐험하는 자미두수'],
  ['life-fortune-ai', 'life-fortune-ai-consultation', '인생 총운', '타고난 기질, 연애, 일과 재물, 삶의 변화와 행동 조언'],
  ['pet-saju', '/pet-saju.html', '반려동물 사주', '반려동물의 생일로 알아보는 기질과 보호자와의 관계'],
  ['yeon-star-hug', 'openYeonStarHug', '연이의 마음 별자리'],
  ['neo-consultation', '/neo-consultation/', '네오에게 물어봐', '네오가 사주와 자미두수 질문을 직접 검수해 이메일로 답하는 상담'],
  ['fortune-chat-yeoni', '/fortune-chat/?character=yeoni', '연이와 나누는 대화 상담', '연이가 현재의 고민을 듣고 명식의 근거와 다음 행동을 정리하는 대화 상담'],
];
for (const [slug, alias, title, description] of extras) {
  const detail = shellDetails[alias] || {};
  catalogue.index.push({slug, title, href: alias});
  catalogue.items[slug] = { description: detail.tagline || description, benefits: detail.feats || [], aliases: [slug, alias], evidence: ['index.html:D'], image: detail.img || '' };
}
const catFeatures = {
  saju: '오행과 십성으로 보는 기질과 선택 습관, 사주 두루마리와 다섯 원소',
  tarot: '카드 상징을 읽으며 현재 마음과 선택을 살피는 타로 상담',
  ziwei: '중앙이 빈 사각형 테두리에 열두 궁이 배치된 자미두수 명반과 별',
  astrology: '서양 점성술의 원형 열두 하우스 출생차트와 행성 간의 각',
  vedic: '인도 베다점의 마름모 차트, 라그나와 달의 나크샤트라, 다샤 시기',
  sukuyo: '두 사람이 태어난 달의 자리와 숙요 관계의 거리',
  'fusion-saju-ziwei': '사주 두루마리와 사각형 자미두수 명반을 나란히 비교',
  'fusion-sukuyo-vedic': '숙요점 두 달의 거리와 베다점 마름모 차트를 나란히 비교',
  'fusion-astrology-tarot': '서양 점성술 원형 출생차트와 타로 카드 세 장을 나란히 비교',
  'fusion-all': '사주, 자미두수, 베다점, 서양 점성술, 숙요점, 타로의 서로 다른 여섯 체계를 교차 검토',
};
for (const [key, description] of Object.entries(catFeatures)) {
  const slug = `yeongnyangi-${key}`;
  catalogue.index.push({slug, title: `영냥이 ${key}`, href: '/yeongnyangi/'});
  catalogue.items[slug] = { description, benefits: [], aliases: [slug], evidence: ['app/yeongnyangi/_original/home-data.ts', 'worker/yeongnyangi/payments/catalog.ts'], image: `/assets/yeongnyangi/original/${key}.webp` };
}
const entryScenes = {
 'tea-saju-compat': ['연이 사주 궁합','yeoni','Human Yeoni seated to the right, comparing TWO parallel sets of FOUR pillar strips representing two people, with small natural element emblems. A red silk thread loosely connects the two sets. One open hand indicates each set, palms natural with five fingers. Distinct partner-chart comparison, no tarot cards, no moon spheres, no western wheel.'],
 'tea-saju': ['연이 사주 상담','yeoni','Human Yeoni seated at a warm tea table compares FOUR tall pillar strips, each with abstract nature symbols, and five natural elements. Hold a slim wooden pointer, thoughtful face. No western wheel.'],
 'tea-tarot': ['연이 타로 상담','yeoni','Human Yeoni leans forward at a rose tea table, spreading THREE large illustrated tarot cards with sun, moon and flower pictures. One hand gently rests on the table, the other indicates a card. No text on cards.'],
 'tea-sukuyo': ['연이 숙요점 상담','yeoni','Human Yeoni viewed three-quarter from the left, thoughtfully comparing TWO small glowing moon spheres at different distances, joined by a silk thread over a night-sky map. The relationship distance is the central motif. No tarot or western wheel.'],
 'tea-saju-joint': ['연이·네오 공동 사주 상담','joint','The TWO reference counselors HUMAN pink-haired Yeoni and silver-haired Neo sit on opposite sides of a wooden table, comparing FOUR pillar strips with nature emblems, five elemental objects and a blank action-planning notebook. Warm Yeoni listens while Neo points with a gloved hand. Both faces clear, separate hands and bodies. No zodiac wheel.'],
 'neo-saju': ['네오 사주 전략','neo','Neo stands beside a desk, assessing FOUR vertical pillar strips with nature symbols, five elemental objects, and wooden strategy pieces. His gloved index finger points at one pillar. Decisive clear pose. No astrology wheel.'],
 'neo-vedic': ['네오 베다 전략','neo','Neo seated sideways at a carved desk, analyzing a north Indian square chart subdivided by diagonal lines into diamonds and triangles, next to a strand of timing beads. No western wheel, no western zodiac glyphs. Gloved hand holds one bead.'],
 'neo-ziwei': ['네오 자미두수 전략','neo','Neo leaning over a SQUARE Ziwei chart with exactly TWELVE palace compartments around an EMPTY central square: four top, four bottom and two each middle side. Glowing star markers inside the border compartments. He places a small gold strategy piece in one compartment. No wheel.'],
 'neo-astrology': ['네오 점성술 전략','neo','Neo looking up from a circular western astrology birth chart divided into twelve radial houses with fine planetary aspect lines across its center. He turns a brass armillary sphere with a gloved hand. Side lighting, close desk scene. No square or diamond charts.'],
};
for(const [slug,[title,master,scene]] of Object.entries(entryScenes)) {
 const file=slug.startsWith('tea-')?'src/features/fortune-tea-house/components/FortuneTeaHouseLanding.tsx':'src/features/neo-war-room/data/assets.ts';
 catalogue.index.push({slug,title,href:slug.startsWith('tea-')?'/fortune-tea-house/':'/neo-operation-room/'});
 catalogue.items[slug]={description:scene,benefits:[],aliases:[slug],evidence:[file],image:''};
}
const masters = {
  saju: ['yeoniPig'],
  'sikojen-povailu': ['yeoniPig'],
  'yeon-star-hug': ['yeoniPig'],
  'palm-reading': ['yeoniPalm'],
  'master-love-codex': ['master'],
  'fortune-tea-house': ['yeoni'],
  'fortune-chat': ['yeoni', 'neo'],
  'fortune-chat-yeoni': ['yeoni', 'yeoniPig'],
  'love-secret-ai': ['yeoni', 'hanbi'],
  'neo-operation-room': ['neo'],
  'neo-consultation': ['neo'],
  'new-year-ai': ['neo'],
  'life-book-ai': ['yun'],
  'karma-destiny-ai': ['neo', 'hanbi'],
  'fusion-fortune': ['neo', 'yeoni', 'hanbi', 'yun', 'musung'],
  ziwei: ['musung'], 'ziwei-ai': ['musung'],
  sukuyo: ['hanbi'], 'sukuyo-compatibility-ai': ['hanbi'],
  astrology: ['yun'], 'astrology-ai': ['yun'],
  vedic: ['yun'], 'vedic-ai': ['yun'],
};
const references = {
  yeoniPig: 'public/images/consultation/saju-yeoni-entry-v2-640.webp',
  yeongnyangi: 'public/assets/yeongnyangi/original/hero-800.webp',
  yeoniPalm: 'public/images/expert-characters/yeoni/hero.webp',
  yeoni: 'public/images/master-profiles/yeoni-teahouse-portrait.webp',
  neo: 'public/images/master-profiles/neo-strategy-portrait.webp',
  hanbi: 'public/images/expert-characters/hanbi/hero.webp',
  yun: 'public/images/expert-characters/yun/hero.webp',
  musung: 'public/images/expert-characters/musung/hero.webp',
  master: 'public/images/master-profiles/master-love-portrait.webp',
};
const scenes = {
  saju: '꽃돼지 연이가 책상에서 사주 네 기둥과 오행의 관계를 두루마리와 다섯 자연물로 살핀다. 꽃돼지 형태 유지.',
  'sikojen-povailu': '꽃돼지 연이가 북유럽 창가에서 물그릇에 굳어진 은빛 주석 조각을 등불에 비춰 벽에 생긴 그림자를 살핀다. 주석 모양과 그림자가 핵심.',
  'yeon-star-hug': '꽃돼지 연이가 작은 별빛을 품에 안고 부드러운 별자리 곁에서 사용자의 감정을 위로한다. 다정한 치유 장면, 점술 도구 나열 금지.',
  'palm-reading': '인간 연이가 손님의 펼친 손바닥을 받치고 작은 나무 지시봉으로 손바닥 선을 함께 살핀다. 얼굴과 손바닥 모두 크게 보인다.',
  ziwei: '무성이 금빛 깃털로 책상 위 사각형 명반의 열두 궁을 차례로 짚는다. 동양 천문 서재, 열두 궁이 핵심이다.',
  'ziwei-ai': '무성이 펼쳐진 열두 궁 명반에서 서로 연결된 별의 자리를 금빛 깃털로 분석한다. 사용자 질문을 듣는 가까운 상담 구도.',
  sukuyo: '서한비가 달이 머무는 두 별자리의 거리를 두 개의 작은 달 모형과 잇는 실로 살핀다. 차분한 달밤의 상담 탁자.',
  'sukuyo-compatibility-ai': '서한비가 나란히 놓인 두 사람의 달 자리와 관계의 거리를 장부와 두 등불로 비교한다. 차분하고 다정하되 연애 보장 분위기 금지.',
  astrology: '윤달이 망원경이 있는 천문대에서 원형 열두 하우스 출생차트를 펼친다. 태양과 달의 위치를 작은 구체로 보여준다.',
  'astrology-ai': '윤달이 책상에 펼친 원형 출생차트의 행성 사이 연결선을 짚으며 상담한다. 서양 점성술의 원형 휠과 행성의 각이 핵심.',
  vedic: '윤달이 인도식 석조 아치 아래 항성 지도와 마름모로 구획된 베다 차트를 살핀다. 서양 황도 별자리 글리프는 쓰지 않는다.',
  'vedic-ai': '윤달이 인도식 관측실에서 나크샤트라 달 구역과 다샤 시기 흐름을 구슬과 마름모 차트로 함께 설명한다. 서양 점성술 휠 금지.',
  'karma-destiny-ai': '네오와 서한비가 서로 떨어진 채 탁자 위 팽팽하게 얽힌 붉은 실의 매듭을 살핀다. 반복 관계와 경계의 분석이며 다정한 커플 그림이 아니다.',
  'new-year-ai': '네오가 사계절의 풍경이 펼쳐진 열두 칸의 작전 지도를 검토한다. 새해의 계획과 시기별 선택을 상담하는 장면.',
  'neo-consultation': '은발 인간 네오가 질문에 답하는 편지를 만년필로 정성스럽게 검토한다. 봉투와 밀랍 봉인, 사주 네 기둥의 자연 상징, 작은 사각 열두 궁 명반. 종이에는 글자가 전혀 없고 그림과 선만 있다.',
  'fortune-chat-yeoni': '인간 연이가 꽃돼지 연이와 함께 꽃빛 상담실에서 빈 맞은편 의자를 바라보며 손님의 이야기를 경청한다. 열린 노트에는 네 기둥의 자연 그림만 있고 글씨는 없다. 따뜻한 찻잔과 질문을 정리하는 펜, 대화 상담의 환대가 중심. 두 캐릭터와 도구는 오른쪽 55퍼센트에 모으고 왼쪽은 글자를 얹을 수 있는 밝은 크림색 빈 벽. 이미지 자체에는 글자를 넣지 않는다.',
  'life-book-ai': '윤달이 큰 책을 펼치자 어린 시절부터 성장과 일과 관계까지 이어지는 작은 풍경이 페이지 위에 나타난다. 삶을 읽는 서고.',
  'fusion-fortune': '다섯 마스터가 원탁에 모여 사주 두루마리, 자미두수 사각 명반, 베다 마름모 차트, 서양 원형 차트, 두 달의 관계, 타로를 교차 검토한다. 다섯 얼굴을 모두 구별한다.',
};
const assets = catalogue.index.filter(x => !['music', 'novel', 'points'].includes(x.slug)).map(entry => {
  const item = catalogue.items[entry.slug];
  const assigned = entryScenes[entry.slug] ? (entryScenes[entry.slug][1] === 'joint' ? ['yeoni','neo'] : [entryScenes[entry.slug][1]]) : entry.slug.startsWith('yeongnyangi-') ? ['yeongnyangi'] : masters[entry.slug] || [];
  const features = [...new Set([
    item.description,
    ...(item.benefits || []),
    ...(item.contents || []).map(x => `${x.title}: ${x.detail || ''}`),
  ].filter(Boolean))];
  const scene = scenes[entry.slug] || `다음 기능의 실제 핵심 행동과 도구가 한눈에 구별되는 단일 장면: ${entry.title}. ${features.slice(0, 6).join(' / ')}`;
  const prompt = [
    'Use case: stylized-concept. Create one finished landscape 3:2 premium Korean painterly manhwa illustration for a fortune service introduction.',
    `Feature: ${entry.title} (${entry.slug}). Actual feature evidence: ${features.join(' / ')}`,
    `Scene: ${scene}`,
    assigned.length ? `The attached references are character identity references, in order: ${assigned.join(', ')}. Preserve each face, hair, age, clothing and illustration style precisely. Show these counselors actively doing the feature, not a generic portrait. No extra counselor.` : 'This feature has no confirmed assigned counselor. Do not invent a branded master. Focus on its distinctive tools, environment and symbolic action. Ordinary anonymous people only if the feature requires them.',
    'Use a distinct composition specific to this feature. Large readable central subject and tools, safe center 75 percent for mobile cropping. Sophisticated detailed illustration, tactile materials, natural light, cohesive with a Korean illustrated fortune anthology. Not photorealistic. No UI, writing, letters, numbers, logos, watermark, collage or multiple panels. No promises, horror, diagnosis or guaranteed outcome. Any symbolic chart is decorative, not an actual user result.',
  ].join('\n');
  return {
    slug: entry.slug, title: entry.title, masters: assigned,
    evidence: item.evidence, features, scene,
    references: assigned.map(key => references[key]),
    previousImage: item.image, aliases: item.aliases,
    surfaces: ['catalogue', 'search', 'detail', entry.href],
    output: `public/images/service-introductions/${entry.slug}.webp`,
    prompt, status: 'planned',
    ...prior.find(row => row.slug === entry.slug),
  };
});
fs.writeFileSync(target, JSON.stringify({ status: 'in-progress', tool: 'built-in image_gen', excludes: ['music', 'novel', 'points', 'result charts', 'tarot deck faces', 'report interior illustrations'], assets }, null, 2) + '\n');
console.log(`${assets.length} feature briefs: ${path.resolve(target)}`);
