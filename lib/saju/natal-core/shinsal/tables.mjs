// 정본 신살 조견표. 로직 없이 데이터와 한 줄 조회만 둔다.
//
// 재사용(수정 금지 정본):
//   - lib/saju/sinsal-rules.mjs: 삼합·12신살 행, 천을·홍염·양인, 백호, 공망 순, 귀문·원진 짝, 상문·조객.
//   - lib/saju/myeongri-tables.js: 지장간(ZHI_HIDE_GAN)·12운성(CHANG_SHENG·OFFSET)·납음(NAYIN)·순공(getXunKong).
//   - lib/saju/natal-core/tables.mjs: 간지 순서·건록(ROK)·천간 합충·지지 육합·충·삼합·방합.
// 새로 더하는 표는 전통 명리 조견표(지시서 2-3·2-4, 2026-11-26 사용자 제공)와 같고, 학파 이견은 옵션으로 뺐다.
// 문창·태극·월덕·천덕은 js/core/saju/manse-shinsal.js(정적 셸 IIFE라 import 불가)와 같은 값이며
// __tests__/saju/shinsal-canon.test.mjs 가 전수 대조한다.
import {
  STEM_ORDER, BRANCH_ORDER, STEM_KO, BRANCH_KO, ROK,
  STEM_HAP, STEM_CHUNG, BRANCH_LIUHE, BRANCH_CHUNG, SAMHAP, BANGHAP,
} from '../tables.mjs';
import {
  SAMHAP_GROUPS, TWELVE_SINSAL_NAMES, YANGIN_BY_STEM, HONGYEOM_BY_STEM, CHEONEUL_BY_STEM,
  BAEKHO_GANJI, GWIMUN_PAIRS, WONJIN_PAIRS, gongmangBranches, sangmunBranch, jogaekBranch,
  samhapGroup, twelveSinsalName,
} from '../../sinsal-rules.mjs';
import { NAYIN, ZHI_HIDE_GAN, CHANG_SHENG, CHANG_SHENG_OFFSET, getXunKong } from '../../myeongri-tables.js';

export {
  STEM_ORDER, BRANCH_ORDER, STEM_KO, BRANCH_KO, ROK, STEM_HAP, STEM_CHUNG, BRANCH_LIUHE, BRANCH_CHUNG, SAMHAP, BANGHAP,
  SAMHAP_GROUPS, TWELVE_SINSAL_NAMES, YANGIN_BY_STEM, HONGYEOM_BY_STEM, CHEONEUL_BY_STEM, BAEKHO_GANJI,
  GWIMUN_PAIRS, WONJIN_PAIRS, gongmangBranches, sangmunBranch, jogaekBranch, samhapGroup, twelveSinsalName, getXunKong,
};

const mod = (value, size) => ((value % size) + size) % size;
export const shiftBranch = (branch, steps) => (BRANCH_ORDER.includes(branch) ? BRANCH_ORDER[mod(BRANCH_ORDER.indexOf(branch) + steps, 12)] : '');
const f = (value) => Object.freeze(value);

// 12신살 id. TWELVE_SINSAL_NAMES(겁살→화개살) 순서와 같다. 년살은 도화와 같은 자리라 "년살(도화)" 하나로 통합한다.
export const TWELVE_IDS = f(['geopsal', 'jaesal', 'cheonsal', 'jisal', 'nyeonsal', 'wolsal', 'mangsinsal', 'jangseongsal', 'banansal', 'yeokmasal', 'yukhaesal', 'hwagaesal']);
export const TWELVE_DISPLAY_NAMES = f(TWELVE_SINSAL_NAMES.map((name) => (name === '년살' ? '년살(도화)' : name)));
// 지시서 2-2의 표시 순서(지살 → 년살 → … → 천살).
export const TWELVE_DISPLAY_ORDER = f(['jisal', 'nyeonsal', 'wolsal', 'mangsinsal', 'jangseongsal', 'banansal', 'yeokmasal', 'yukhaesal', 'hwagaesal', 'geopsal', 'jaesal', 'cheonsal']);

// 천을귀인 庚: 기본 丑未(sinsal-rules), 옵션 cheoneulGengInO 는 寅午 학파.
export const CHEONEUL_GENG_IN_O = f(['寅', '午']);
// 태극귀인(일간). manse-shinsal.js 81-104와 같다.
export const TAEGEUK_BY_STEM = f({ 甲: f(['子', '午']), 乙: f(['子', '午']), 丙: f(['卯', '酉']), 丁: f(['卯', '酉']), 戊: f(['辰', '戌', '丑', '未']), 己: f(['辰', '戌', '丑', '未']), 庚: f(['寅', '亥']), 辛: f(['寅', '亥']), 壬: f(['巳', '申']), 癸: f(['巳', '申']) });
// 문창귀인(일간). manse-shinsal.js·worker/lib/saju-shinsal.js와 같다.
export const MUNCHANG_BY_STEM = f({ 甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' });
// 학당귀인 = 일간의 장생지. 戊는 기본 寅(화토동법), 옵션 hakdangMuShin 은 申(수토동법).
export const HAKDANG_BY_STEM = f({ 甲: '亥', 乙: '午', 丙: '寅', 丁: '酉', 戊: '寅', 己: '酉', 庚: '巳', 辛: '子', 壬: '申', 癸: '卯' });
export const HAKDANG_MU_SHIN = '申';
// 천주귀인 = 식신의 건록.
export const CHEONJU_BY_STEM = f({ 甲: '巳', 乙: '午', 丙: '巳', 丁: '午', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' });
// 건록 = natal-core ROK(戊祿巳·己祿午).
export const GEONROK_BY_STEM = ROK;
// 암록 = 건록과 육합하는 지지.
export const AMROK_BY_STEM = f({ 甲: '亥', 乙: '戌', 丙: '申', 丁: '未', 戊: '申', 己: '未', 庚: '巳', 辛: '辰', 壬: '寅', 癸: '丑' });
// 금여(록).
export const GEUMYEO_BY_STEM = f({ 甲: '辰', 乙: '巳', 丙: '未', 丁: '申', 戊: '未', 己: '申', 庚: '戌', 辛: '亥', 壬: '丑', 癸: '寅' });
// 천덕귀인(월지 기준). s=천간, b=지지. manse-shinsal.js와 같다.
export const CHEONDEOK_BY_MONTH = f({ 寅: '丁', 卯: '申', 辰: '壬', 巳: '辛', 午: '亥', 未: '甲', 申: '癸', 酉: '寅', 戌: '丙', 亥: '乙', 子: '巳', 丑: '庚' });
// 월덕귀인(월지 삼합 기준 천간). manse-shinsal.js와 같다.
export const WOLDEOK_BY_SAMHAP = f({ water: '壬', wood: '甲', fire: '丙', metal: '庚' });
// 천의성(월지 바로 앞 지지): 寅월→丑, 卯월→寅 …
export const cheonuiBranch = (monthBranch) => shiftBranch(monthBranch, -1);
// 양인 음간 옵션(yanginYinStems). 양간 표는 sinsal-rules YANGIN_BY_STEM.
export const YANGIN_YIN_BY_STEM = f({ 乙: '辰', 丁: '未', 己: '未', 辛: '戌', 癸: '丑' });
// 비인 = 양인의 충(양인 옵션과 연동).
export const biinBranch = (yanginBranch) => BRANCH_CHUNG[yanginBranch] || '';
// 현침살: 천간 甲·辛, 지지 卯·午·申. 옵션 hyeonchimIncludeMi 는 未 포함.
export const HYEONCHIM_STEMS = f(['甲', '辛']);
export const HYEONCHIM_BRANCHES = f(['卯', '午', '申']);
export const HYEONCHIM_MI = '未';
// 괴강살(주 단위). 기본 庚辰·庚戌·壬辰·壬戌 + 옵션 goegangIncludeMuSul(기본 on) 戊戌.
// 주의: 기존 3벌(sinsal-rules GOEGANG_GANJI·manse-shinsal·saju-shinsal)은 壬戌이 빠져 있다. 정본은 지시서 표를 따른다.
export const GOEGANG_BASE_GANJI = f(['庚辰', '庚戌', '壬辰', '壬戌']);
export const GOEGANG_MU_SUL = '戊戌';
// 고란살(일주 한정).
export const GORAN_DAY_GANJI = f(['甲寅', '乙巳', '丁巳', '辛亥', '戊申']);
// 천라지망(지지 짝): 戌亥 = 천라, 辰巳 = 지망.
export const CHEONRA_JIMANG_PAIRS = f({ 戌亥: '천라', 辰巳: '지망' });

// 지지 형·파·해(worker/lib/saju-shinsal.js 표와 같은 통설).
export const HYEONG_TRIADS = f([f(['寅', '巳', '申']), f(['丑', '戌', '未'])]);
export const SANGHYEONG_PAIR = '子卯';
export const JAHYEONG_BRANCHES = f(['辰', '午', '酉', '亥']);
export const PA_PAIRS = f(['子酉', '丑辰', '寅亥', '卯午', '巳申', '未戌']);
export const HAE_PAIRS = f(['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌']);

// 12운성 한글(app/fortune/prompt-hub/saju-prompt-facts.ts CHANG_SHENG_KO와 같다).
export const UNSEONG_KO = f({ 长生: '장생', 沐浴: '목욕', 冠带: '관대', 临官: '임관', 帝旺: '제왕', 衰: '쇠', 病: '병', 死: '사', 墓: '묘', 绝: '절', 胎: '태', 养: '양' });
// 납음 한글(saju-prompt-facts.ts NAYIN_KO와 같다).
export const NAYIN_KO = f({
  海中金: '해중금', 沙中金: '사중금', 炉中火: '노중화', 山下火: '산하화', 大林木: '대림목',
  平地木: '평지목', 路旁土: '노방토', 壁上土: '벽상토', 剑锋金: '검봉금', 金箔金: '금박금',
  山头火: '산두화', 覆灯火: '복등화', 涧下水: '간하수', 天河水: '천하수', 城头土: '성두토',
  大驿土: '대역토', 白蜡金: '백랍금', 钗钏金: '차천금', 杨柳木: '양류목', 桑柘木: '상자목',
  泉中水: '천중수', 大溪水: '대계수', 屋上土: '옥상토', 沙中土: '사중토', 霹雳火: '벽력화',
  天上火: '천상화', 松柏木: '송백목', 石榴木: '석류목', 长流水: '장류수', 大海水: '대해수',
});

/** 12운성: 기준 천간이 지지에서 갖는 자리(myeongri-tables 오프셋 공식, 양간 순행·음간 역행). */
export function unseongOf(stem, branch) {
  const offset = CHANG_SHENG_OFFSET[stem];
  const bi = BRANCH_ORDER.indexOf(branch);
  if (!Number.isFinite(offset) || bi < 0) return '';
  const yang = STEM_ORDER.indexOf(stem) % 2 === 0;
  const stage = CHANG_SHENG[mod(offset + (yang ? bi : -bi), 12)];
  return UNSEONG_KO[stage] || '';
}
/** 지장간: myeongri-tables 원 순서 그대로(첫 글자가 본기). */
export const hiddenStemsOf = (branch) => (ZHI_HIDE_GAN[branch] ? [...ZHI_HIDE_GAN[branch]] : []);
/** 납음 한글. 간지가 아니면 ''. */
export const nayinOf = (ganji) => NAYIN_KO[NAYIN[ganji]] || '';
