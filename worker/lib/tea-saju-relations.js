import { getBranchPairRelations, getStemPairRelation, toBranchKo, toStemKo } from './saju-shinsal.js';
import { buildNatalInteractions } from './life-book-ai-saju.js';
import { toHanjaPillar } from './tea-saju-monthly.js';

const labels = { year: '년주', month: '월주', day: '일주', hour: '시주' };
const crossPositions = [['day', '일지'], ['year', '년지'], ['month', '월지'], ['hour', '시지']];
const stemRelationNames = { 합: '천간합', 충: '천간충', 동: '같은 오행', 생: '상생', 극: '상극' };

// `pillars` maps year/month/day/hour to ganji (Hanja or Hangul); an unknown hour is simply absent.
const chartDetails = pillars => Object.fromEntries(Object.entries(labels)
  .map(([key, label]) => [key, label, toHanjaPillar(pillars?.[key])])
  .filter(([, , pillar]) => pillar)
  .map(([key, label, pillar]) => [key, { label, pillar, heavenlyStem: pillar[0], earthlyBranch: pillar[1] }]));

const natalRelationsOf = details => Object.values(buildNatalInteractions(details)).flat()
  .map(item => `${item.pillarLabels.join('↔')} ${item.type}${item.label ? ` ${item.label}` : ''}`);

// One chart's own 합·충·형·파·해, from the tables the life-book reading uses. undefined without a day pillar.
export function buildTeaNatalRelations(pillars) {
  const details = chartDetails(pillars);
  return details.day ? natalRelationsOf(details) : undefined;
}

// Two charts against each other for 사주 궁합: day stems, then the branches at the same position.
// 시지 appears only when both hours are known. null without both day pillars.
export function buildTeaCompatRelations(selfPillars, partnerPillars) {
  const self = chartDetails(selfPillars);
  const partner = chartDetails(partnerPillars);
  if (!self.day || !partner.day) return null;
  const [selfStem, partnerStem] = [self.day.heavenlyStem, partner.day.heavenlyStem];
  return {
    dayStems: `${toStemKo(selfStem)}↔${toStemKo(partnerStem)} ${stemRelationNames[getStemPairRelation(selfStem, partnerStem)]}`,
    branchPairs: crossPositions.filter(([key]) => self[key] && partner[key]).map(([key, position]) => {
      const [a, b] = [self[key].earthlyBranch, partner[key].earthlyBranch];
      // 두 글자만 맞는 삼합은 반합이다.
      const relations = getBranchPairRelations(a, b).map(name => (name === '삼합' ? '반합' : name));
      return { position, self: toBranchKo(a), partner: toBranchKo(b), relations: relations.length || a !== b ? relations : ['같은 지지'] };
    }),
  };
}
