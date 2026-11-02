// Synthetic stored responses only: no calculator, database, PG or LLM imports.
import './guard.cjs';
import { loadTsModule } from '../../../scripts/lib/load-ts-module.mjs';
const fixture = (file, name) => loadTsModule(`lib/dev-preview/fixtures/${file}.ts`)[name]('success');
export const savedId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const vedic = fixture('vedic', 'buildVedicPreviewPayload');
// Static rendering fixtures are not astronomical evidence or Swiss calculations.
vedic.consultation.vedicChart.calculationConfig.source = 'synthetic-mock';
vedic.consultation.vedicChart.calculationMeta.source = 'synthetic-mock';
const astrology = fixture('astrology', 'buildAstrologyPreviewPayload');
const newYear = fixture('new-year', 'buildNewYearPreviewPayload');
const sukuyo = fixture('sukuyo-compatibility', 'buildSukuyoCompatibilityPreviewPayload');
sukuyo.consultation.status = 'completed';
const life = fixture('life-book', 'buildLifeBookPreviewPayload');
const love = fixture('love-secret', 'buildLoveSecretPreviewPayload');
const karma = fixture('karma-destiny', 'buildKarmaDestinyPreviewPayload');
const fusion = fixture('fusion-fortune', 'buildFusionPreviewResult');
const { getProduct } = loadTsModule('worker/yeongnyangi/payments/catalog.ts');
export const services = [
  { key: 'vedic', route: `/vedic-ai/result/?id=${savedId}`, endpoint: '/api/vedic-ai/result', payload: vedic,
    conclusion: '게자리 라그나에 목성이 자리해 넓은 시야와 낙관적인 태도를 타고났습니다.', module: 'app/vedic-ai/result/VedicAiResultClient.tsx' },
  { key: 'astrology', route: `/astrology-ai/result/?id=${savedId}`, endpoint: `/api/astrology-ai/result/${savedId}`, payload: astrology,
    conclusion: '별자리 상담 요약과 관련해 출생 차트를 살펴보면', module: 'app/astrology-ai/result/AstrologyAiResultClient.tsx' },
  { key: 'new-year', route: `/new-year-ai-consultation/?sid=${savedId}`, endpoint: '/api/new-year-ai/result', payload: newYear,
    conclusion: '합이 드는 달에는 관계가 가까워지고', module: 'app/new-year-ai-consultation/NewYearAiClient.tsx' },
  { key: 'sukuyo', route: `/sukuyo-compatibility-ai/?cid=${savedId}`, endpoint: '/api/sukuyo-compatibility-ai/result', payload: sukuyo,
    conclusion: '민준님과 서연님은 만나자마자 서로의 결을 알아보는 사이예요.', module: 'app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx' },
  { key: 'life-book', route: `/life-book-ai/result/?attemptId=${savedId}`, endpoint: '/api/life-book-ai/result', payload: life,
    conclusion: life.reportJson.coreSummary.oneLine, module: 'app/life-book-ai/result/LifeBookAiResultClient.tsx' },
  { key: 'love-secret', route: `/love-secret-ai/result/?sessionId=${savedId}`, endpoint: `/api/love-secret-ai/result/${savedId}`, payload: love,
    conclusion: love.reading.oneLineDiagnosis, module: 'app/love-secret-ai/result/LoveSecretAiResultClient.tsx' },
  { key: 'karma', route: `/karma-destiny-ai/result/?sessionId=${savedId}`, endpoint: '/api/karma-destiny-ai/result', payload: karma,
    conclusion: '운명을 바꾸는 핵심 문장은 지금 다시 마주할 시기입니다.', module: 'app/karma-destiny-ai/result/KarmaDestinyAiResultClient.tsx' },
  { key: 'fusion', route: `/fusion-fortune/?cid=${savedId}`, endpoint: '/api/fusion-fortune/result', payload: { ok: true, consultation: { id: savedId, status: 'completed', result: fusion.result } },
    conclusion: fusion.result.finalVerdict.headline, module: 'app/fusion-fortune/FusionFortuneClient.tsx' },
];
for (const [index, domain] of ['saju', 'ziwei', 'sukuyo', 'vedic', 'astrology', 'tarot'].entries()) {
  const id = String(index + 1).repeat(64), product = getProduct(`${domain}_mackerel`);
  const answer = `${product.name} 합성 저장 답변입니다. 이번 주에는 미뤄 둔 일 하나의 완료 기준을 먼저 정해 보세요.`;
  const manifest = Array.from({ length: product.chapterCount }, (_, i) => ({ id: `chapter-${i}`, title: `저장된 해석 ${i + 1}`, ordinal: i, theme: 'self' }));
  const fortune = { id, productId: product.id, profileId: 'mock-profile', product, state: 'COMPLETED', paid: true, locale: 'ko',
    createdAt: '2026-11-01T00:00:00.000Z', completedAt: '2026-11-01T00:00:00.000Z', manifest,
    chapters: manifest.map(() => ({ summary: answer, analysis: ['약속을 늘리기보다 현재 할 일을 정리하면 여유를 되찾는 데 도움이 됩니다.'], advice: '중요한 일 하나를 작은 단계로 나눠 보세요.' })),
    charts: [{ domain, title: `${product.name} 저장 자료`, source: '구매 당시 저장된 계산 근거', limitations: [], groups: [{ id: 'saved', kind: 'natal', label: '합성 저장 배치', chapterIds: ['chapter-0'], items: [{ label: '원본 기록', value: `${domain} 원문 보존 값` }], ...(domain === 'tarot' ? { cardCode: 'M00' } : {}) }] }],
  };
  services.push({ key: `yeongnyangi-${domain}`, route: `/yeongnyangi/result/?id=${id}`, endpoint: `/api/yeongnyangi/requests/${id}`, payload: { ok: true, fortune }, conclusion: answer,
    module: 'app/yeongnyangi/_components/ReadingBook.tsx', ritualId: domain === 'tarot' ? id : undefined });
}
export function mockResponse(url) {
  const pathname = url.pathname.replace(/\/$/, '');
  const shared = {
    '/api/auth/me': { ok: true, authenticated: true, user: { id: 'mock-owner', _id: 'mock-owner', nickname: '합성 검증' } },
    '/api/activation-rewards/status': { ok: true, accountId: 'mock-owner', tutorial: { eligible: false, legacySignupReceived: true }, wallet: { balance: 0, minimumProductKRW: 3000 },
      firstPaid: { receipt: { status: 'granted', amount: 0 } }, recommendations: [], policy: { tutorial: { amount: 0, days: 30 }, firstPaid: { amount: 0, days: 30 }, review: { amount: 0, days: 30, trigger: 'approved' } } },
    '/api/activation-rewards/snu/status': { ok: true, verified: false },
    '/api/version': { ok: true, version: 'mock-results-audit' },
    '/api/me/access-state': { ok: true, userId: 'mock-owner', unlocks: [], subscription: null },
    '/api/profile': { ok: true, profiles: [] },
    '/api/reviews/products': { ok: true, items: [], reviews: [] },
    '/api/recommendations': { ok: true, recommendations: [] },
    '/api/fusion-fortune/status': { ok: true, available: true },
    '/api/billing/unlock-status': { ok: true, userId: 'mock-owner', unlocks: [], subscription: null },
  };
  if (shared[pathname]) return shared[pathname];
  const service = services.find(item => item.endpoint === pathname);
  if (!service) return null;
  if (service.key === 'fusion' && url.searchParams.has('pending')) return { ok: true, consultation: null };
  if (['sukuyo', 'fusion', 'new-year', 'vedic'].includes(service.key) && !url.search) return { ok: true, consultations: [], sessions: [] };
  return service.payload;
}
