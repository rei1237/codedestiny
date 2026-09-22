import type { DomainId, PackageId } from './shared/contracts';

export const READING_VERSION = 'destiny-book-v4';
export const READING_V5_VERSION = 'destiny-book-v5';
export const isStructuredReading = (version?: string) => version === READING_VERSION || version === READING_V5_VERSION;
export const PROMPT_VERSION = 'chapter-v4';
export const readingPolicies = {
  mackerel: { minimum: 3000, target: [3200, 4000], outputTokens: 8192, depth: ['핵심 결론', '계산 근거와 이유', '생활 사례', '첫 행동'] },
  salmon: { minimum: 6000, target: [7000, 9000], outputTokens: 4096, depth: ['핵심 결론', '반복 원인', '상황별 차이', '생활 사례', '실행'] },
  flounder: { minimum: 11000, target: [13000, 17000], outputTokens: 8192, depth: ['근거의 연결', '강점과 부담', '대안 비교', '상황별 사례', '선택 기준'] },
  tuna: { minimum: 20000, target: [24000, 32000], outputTokens: 8192, depth: ['전문 근거', '상충과 예외', '조건별 해석', '생활 사례', '행동 계획', '점검 기준'] },
  assorted: { minimum: 36000, target: [40000, 50000], outputTokens: 8192, depth: ['체계별 근거', '일치와 상충', '조건별 해석', '생활 사례', '선택 기준', '점검 계획'] },
  omakase: { minimum: 60000, target: [65000, 80000], outputTokens: 8192, depth: ['분야별 근거', '근거의 연결과 한계', '다른 가능성', '조건별 사례', '우선순위', '실행과 점검'] },
} as const;
export const depthDescriptions: Record<PackageId, string> = {
  mackerel: '핵심 특징과 이유, 생활 사례와 첫 행동',
  salmon: '반복되는 원인과 상황별 차이까지',
  flounder: '여러 근거와 선택지를 비교하는 심층 해석',
  tuna: '전문 주제와 상충 신호, 조건별 실행 전략',
  assorted: '두 체계의 근거와 차이를 살피는 전문 상담',
  omakase: '여섯 체계로 읽는 분야별 심층 상담과 실행 계획',
};
export function readingChapterCount(domain: DomainId, tier: PackageId): number {
  if (domain === 'saju' && tier === 'mackerel') return 5;
  if (tier === 'assorted') return 18;
  if (tier === 'omakase') return 28;
  const index = ['mackerel', 'salmon', 'flounder', 'tuna'].indexOf(tier);
  return (domain === 'tarot' ? [4, 5, 6, 8] : domain === 'sukuyo' ? [4, 6, 8, 10] : [4, 6, 8, 12])[index];
}

// Purchase snapshots retain their own version and quotas.
export const v5ReadingPolicies = {
  ...readingPolicies,
  tuna: {...readingPolicies.tuna, minimum:32000, target:[36000,44000]},
  assorted: {...readingPolicies.assorted, minimum:48000, target:[55000,65000]},
  omakase: {...readingPolicies.omakase, minimum:80000, target:[90000,110000]},
} as const;
export const policyForReading = (tier: PackageId, version?: string) =>
  version === READING_V5_VERSION ? v5ReadingPolicies[tier] : readingPolicies[tier];
