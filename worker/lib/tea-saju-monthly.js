import { formatPillar, ganji, nodeTerms } from '../../lib/korean-calendar/index.js';
import { buildLuckNatalInteractions, tenGodFor } from './life-book-ai-saju.js';

const labels = { year: '년주', month: '월주', day: '일주', hour: '시주' };
const stems = { 갑: '甲', 을: '乙', 병: '丙', 정: '丁', 무: '戊', 기: '己', 경: '庚', 신: '辛', 임: '壬', 계: '癸' };
const branches = { 자: '子', 축: '丑', 인: '寅', 묘: '卯', 진: '辰', 사: '巳', 오: '午', 미: '未', 신: '申', 유: '酉', 술: '戌', 해: '亥' };
const wallMs = t => Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute);
const ymd = t => `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
// Pillars arrive as Hanja (server chart) or Hangul (legacy snapshots); the relation tables are Hanja.
export const toHanjaPillar = value => {
  const [s = '', b = ''] = Array.from(String(value || '').trim());
  const pillar = `${stems[s] || s}${branches[b] || b}`;
  return /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/.test(pillar) ? pillar : '';
};

// Solar-term months (월운) from the one in force at `now`, the same 절기 frame Yeongnyangi uses
// (worker/yeongnyangi/fortune/saju/runtime.ts). Terms are tabulated in KST.
// `pillars` maps year/month/day/hour to ganji strings; an unknown hour is simply absent.
export function buildTeaSajuMonthlyRows(pillars, now = new Date(), count = 3) {
  const kst = new Date(now.getTime() + 9 * 3600000);
  const year = kst.getUTCFullYear();
  const terms = [...nodeTerms(year - 1).slice(-1), ...nodeTerms(year), ...nodeTerms(year + 1)];
  const start = terms.findLastIndex(term => wallMs(term) <= kst.getTime());
  const details = Object.fromEntries(Object.entries(labels)
    .map(([key, label]) => [key, label, toHanjaPillar(pillars?.[key])])
    .filter(([, , pillar]) => pillar)
    .map(([key, label, pillar]) => [key, { label, pillar, heavenlyStem: pillar[0], earthlyBranch: pillar[1] }]));
  const dayStem = details.day?.heavenlyStem;
  if (start < 0 || !dayStem) return [];
  return terms.slice(start, start + count).map((term, i) => {
    const frame = ganji(term);
    const pillar = formatPillar(frame.month.stemIndex, frame.month.branchIndex, 'hanja');
    const next = terms[start + i + 1];
    const natalRelations = Object.values(buildLuckNatalInteractions(pillar, details)).flat()
      .map(item => `${item.pillarLabels.map(label => label === '운' ? '월운' : label).join('↔')} ${item.type}${item.label ? ` ${item.label}` : ''}`);
    return { startsOn: ymd(term), nextStartsOn: next ? ymd(next) : undefined, pillar, stemTenGod: tenGodFor(dayStem, pillar[0]), natalRelations };
  });
}
