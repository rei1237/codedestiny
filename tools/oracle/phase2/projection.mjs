export const STAR_NAMES = Object.fromEntries(['紫微:자미','天机:천기','太阳:태양','武曲:무곡','天同:천동','廉贞:염정','天府:천부','太阴:태음','贪狼:탐랑','巨门:거문','天相:천상','天梁:천량','七杀:칠살','破军:파군','左辅:좌보','右弼:우필','文昌:문창','文曲:문곡','禄存:녹존','天马:천마','天魁:천괴','天钺:천월','擎羊:경양','陀罗:타라','火星:화성','铃星:영성','地空:지공','地劫:지겁','天姚:천요','咸池:함지'].map(s => s.split(':')));
export const MAIN_STARS = Object.values(STAR_NAMES).slice(0, 14);
const pick = (value, keys) => Object.fromEntries(keys.filter(k => value?.[k] !== undefined).map(k => [k, value[k]]));
export function projectSaju(r) {
  if (r.status !== 'ok') return r;
  const a = r.raw.natalAnalysis;
  return { status: r.status, pillars: r.facts.pillars, evidence: r.raw.calculationEvidence,
    school: { pattern: pick(a.gyeokgukAnalysis, ['finalGyeokguk', 'finalType', 'candidates', 'judgmentReason', 'monthHiddenStems']),
      useful: pick(a.yongshinAnalysis, ['coreYongshin', 'auxiliaryYongshin', 'heesin', 'gisin', 'johuYongshin', 'eokbuYongshin', 'gyeokgukYongshin', 'judgment']),
      strength: a.dayMaster, johu: a.johu, shinsal: a.shinsalAnalysis },
    hiddenStems: Object.fromEntries(Object.entries(a.hiddenStemActivation.byPillar).map(([k, rows]) => [k, rows.map(v => pick(v, ['hiddenStem', 'tenGod', 'hiddenWeight']))])) };
}
export function projectOracle(r) {
  const { solarTerms, ...facts } = r.facts;
  return { status: r.status, ...(r.reason ? { reason: r.reason } : {}), facts, policy: r.policy };
}
export function projectZiwei(r, service = false) {
  if (r.status !== 'ok') return { status: r.status, reason: r.reason };
  const c = r.facts.ziwei, stars = {}, decades = {}, hua = {};
  let life, body;
  if (service) {
    life = c.palaces.find(p => p.name === c.lifePalace)?.branchIndex;
    body = c.palaces.find(p => p.name === c.bodyPalace)?.branchIndex;
    for (const p of c.palaces) {
      for (const s of [...p.mainStars, ...p.assistantStars, ...p.maleficStars]) stars[s] = p.branchIndex;
      decades[p.branchIndex] = p.majorLuck.startAge;
    }
    return { status: 'ok', life, body, bureau: c.bureau.number, stars, decades, hua: c.fourTransformations, minorLuck: c.minorLuck, yearlyLuck: c.yearlyLuck };
  }
  life = '子丑寅卯辰巳午未申酉戌亥'.indexOf(c.lifePalace);
  body = '子丑寅卯辰巳午未申酉戌亥'.indexOf(c.bodyPalace);
  const huaKey = { 禄: 'huaLu', 权: 'huaQuan', 科: 'huaKe', 忌: 'huaJi' };
  for (const p of c.palaces) {
    const index = '子丑寅卯辰巳午未申酉戌亥'.indexOf(p.earthlyBranch);
    decades[index] = p.decadal.range[0];
    for (const s of [...p.majorStars, ...p.minorStars, ...p.adjectiveStars]) if (STAR_NAMES[s.name]) {
      stars[STAR_NAMES[s.name]] = index;
      if (s.mutagen) hua[huaKey[s.mutagen]] = STAR_NAMES[s.name];
    }
  }
  return { status: 'ok', life, body, bureau: { 水: 2, 木: 3, 金: 4, 土: 5, 火: 6 }[c.bureau[0]], stars, decades, hua, solarDate: c.solarDate, lunarDate: c.lunarDate };
}
