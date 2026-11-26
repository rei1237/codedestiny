// 신살 카탈로그: id·표시 이름·분류·극성·직렬화 우선순위.
// 배열 순서가 곧 결정적 정렬 순서다(catalogIndex). polarity 는 정렬 보조용일 뿐 길흉 판정을 출력하지 않는다.
// tier(직렬화 우선): 0 귀인·년살(도화)·역마·화개, 1 길신·대표 흉살, 2 기타 특수살, 3 기타 12신살.
import { TWELVE_IDS, TWELVE_DISPLAY_NAMES, TWELVE_DISPLAY_ORDER } from './tables.mjs';

const TWELVE_POLARITY = Object.freeze({
  jangseongsal: 'good', banansal: 'good',
  jisal: 'neutral', nyeonsal: 'neutral', wolsal: 'neutral', yeokmasal: 'neutral', hwagaesal: 'neutral',
  geopsal: 'caution', jaesal: 'caution', cheonsal: 'caution', mangsinsal: 'caution', yukhaesal: 'caution',
});
const TWELVE_TIER0 = new Set(['nyeonsal', 'yeokmasal', 'hwagaesal']);

const twelveEntries = TWELVE_DISPLAY_ORDER.map((id) => ({
  id,
  name: TWELVE_DISPLAY_NAMES[TWELVE_IDS.indexOf(id)],
  category: 'twelve',
  polarity: TWELVE_POLARITY[id],
  tier: TWELVE_TIER0.has(id) ? 0 : 3,
}));

const RAW = [
  // 귀인
  { id: 'cheoneul', name: '천을귀인', category: 'gwiin', polarity: 'good', tier: 0 },
  { id: 'taegeuk', name: '태극귀인', category: 'gwiin', polarity: 'good', tier: 0 },
  { id: 'munchang', name: '문창귀인', category: 'gwiin', polarity: 'good', tier: 0 },
  { id: 'hakdang', name: '학당귀인', category: 'gwiin', polarity: 'good', tier: 0 },
  { id: 'cheonju', name: '천주귀인', category: 'gwiin', polarity: 'good', tier: 0 },
  { id: 'cheondeok', name: '천덕귀인', category: 'gwiin', polarity: 'good', tier: 0 },
  { id: 'woldeok', name: '월덕귀인', category: 'gwiin', polarity: 'good', tier: 0 },
  // TODO(자문확정): 문곡귀인·관귀학관은 학파별 표가 갈려 표가 비어 있고 화면·직렬화에 나오지 않는다.
  { id: 'munkok', name: '문곡귀인', category: 'gwiin', polarity: 'good', tier: 0, hidden: true },
  { id: 'gwangwi', name: '관귀학관', category: 'gwiin', polarity: 'good', tier: 0, hidden: true },
  // 길신
  { id: 'geonrok', name: '건록', category: 'gil', polarity: 'good', tier: 1 },
  { id: 'amrok', name: '암록', category: 'gil', polarity: 'good', tier: 1 },
  { id: 'geumyeo', name: '금여', category: 'gil', polarity: 'good', tier: 1 },
  { id: 'hyeoprok', name: '협록', category: 'gil', polarity: 'good', tier: 1 },
  { id: 'cheonui', name: '천의성', category: 'gil', polarity: 'good', tier: 1 },
  // 12신살
  ...twelveEntries,
  // 흉살·특수살
  { id: 'yangin', name: '양인살', category: 'hyung', polarity: 'caution', tier: 1 },
  { id: 'goegang', name: '괴강살', category: 'hyung', polarity: 'caution', tier: 1 },
  { id: 'baekho', name: '백호살', category: 'hyung', polarity: 'caution', tier: 1 },
  { id: 'hongyeom', name: '홍염살', category: 'hyung', polarity: 'neutral', tier: 1 },
  { id: 'gongmang', name: '공망', category: 'hyung', polarity: 'neutral', tier: 1 },
  { id: 'wonjin', name: '원진살', category: 'hyung', polarity: 'caution', tier: 1 },
  { id: 'gwimun', name: '귀문관살', category: 'hyung', polarity: 'caution', tier: 1 },
  { id: 'biin', name: '비인살', category: 'hyung', polarity: 'caution', tier: 2 },
  { id: 'goran', name: '고란살', category: 'hyung', polarity: 'caution', tier: 2 },
  { id: 'cheonrajimang', name: '천라지망', category: 'hyung', polarity: 'caution', tier: 2 },
  { id: 'hyeonchim', name: '현침살', category: 'hyung', polarity: 'neutral', tier: 2 },
  { id: 'sangmun', name: '상문살', category: 'hyung', polarity: 'caution', tier: 2 },
  { id: 'jogaek', name: '조객살', category: 'hyung', polarity: 'caution', tier: 2 },
  // 관계(직렬화 대상 아님, 화면용)
  { id: 'stemHap', name: '천간합', category: 'relation', polarity: 'neutral', tier: 9 },
  { id: 'stemChung', name: '천간충', category: 'relation', polarity: 'neutral', tier: 9 },
  { id: 'yukhap', name: '육합', category: 'relation', polarity: 'neutral', tier: 9 },
  { id: 'samhap', name: '삼합', category: 'relation', polarity: 'neutral', tier: 9 },
  { id: 'banghap', name: '방합', category: 'relation', polarity: 'neutral', tier: 9 },
  { id: 'banhap', name: '반합', category: 'relation', polarity: 'neutral', tier: 9 },
  { id: 'chung', name: '충', category: 'relation', polarity: 'neutral', tier: 9 },
  { id: 'hyeong', name: '형', category: 'relation', polarity: 'neutral', tier: 9 },
  { id: 'pa', name: '파', category: 'relation', polarity: 'neutral', tier: 9 },
  { id: 'hae', name: '해', category: 'relation', polarity: 'neutral', tier: 9 },
];

export const SHINSAL_CATALOG = Object.freeze(RAW.map((entry, catalogIndex) => Object.freeze({ ...entry, hidden: entry.hidden === true, catalogIndex })));
export const CATALOG_BY_ID = Object.freeze(Object.fromEntries(SHINSAL_CATALOG.map((entry) => [entry.id, entry])));
export const SHINSAL_IDS = Object.freeze(SHINSAL_CATALOG.map((entry) => entry.id));

export const PILLAR_ORDER = Object.freeze(['year', 'month', 'day', 'hour', 'daewoon', 'sewoon', 'wolwoon']);
export const NATAL_PILLARS = Object.freeze(['year', 'month', 'day', 'hour']);
export const LUCK_PILLARS = Object.freeze(['daewoon', 'sewoon', 'wolwoon']);
export const POSITION_ORDER = Object.freeze(['pillar', 'stem', 'branch']);
export const BASIS_KO = Object.freeze({
  dayStem: '일간', yearStem: '년간', yearBranch: '년지', dayBranch: '일지', monthBranch: '월지',
  dayPillar: '일주', yearPillar: '년주', pillar: '간지 자체', char: '글자 자체', pair: '지지 짝', stemPair: '천간 짝', triad: '세 지지',
});
