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
const ziwei = fixture('ziwei', 'buildZiweiPreviewPayload');
const newYear = fixture('new-year', 'buildNewYearPreviewPayload');
const sukuyo = fixture('sukuyo-compatibility', 'buildSukuyoCompatibilityPreviewPayload');
sukuyo.consultation.status = 'completed';
const life = fixture('life-book', 'buildLifeBookPreviewPayload');
const love = fixture('love-secret', 'buildLoveSecretPreviewPayload');
const karma = fixture('karma-destiny', 'buildKarmaDestinyPreviewPayload');
const fusion = fixture('fusion-fortune', 'buildFusionPreviewResult');
const { getProduct } = loadTsModule('worker/yeongnyangi/payments/catalog.ts');
// blockedByGuard: the records client bundle currently pulls worker/lib/swiss-ephemeris.js via SavedCompassReport, so guard.cjs fails compilation.
// These run only when named in AUDIT_SERVICES.
export const services = [
  { key: 'ziwei', route: `/ziwei-ai/?cid=${savedId}`, endpoint: '/api/ziwei-ai/result', payload: ziwei,
    conclusion: '지금은 스스로를 믿고 앞으로 나아가도 좋은 시기입니다.', module: 'app/ziwei-ai/ZiweiAiClient.tsx' },
  { key: 'vedic', route: `/vedic-ai/result/?id=${savedId}`, endpoint: '/api/vedic-ai/result', payload: vedic,
    conclusion: '게자리 라그나에 목성이 자리해 넓은 시야와 낙관적인 태도를 타고났습니다.', module: 'app/vedic-ai/result/VedicAiResultClient.tsx' },
  { key: 'astrology', route: `/astrology-ai/result/?id=${savedId}`, endpoint: `/api/astrology-ai/result/${savedId}`, payload: astrology,
    conclusion: '별자리 상담 요약과 관련해 출생 차트를 살펴보면', module: 'app/astrology-ai/result/AstrologyAiResultClient.tsx' },
  { key: 'new-year', route: `/new-year-ai-consultation/?sid=${savedId}`, endpoint: '/api/new-year-ai/result', payload: newYear,
    conclusion: '지금은 제안받은 업무의 역할과 지원 조건을 확인한 뒤 이직을 결정하는 편이 좋겠습니다.', module: 'app/new-year-ai-consultation/NewYearAiClient.tsx' },
  { key: 'sukuyo', route: `/sukuyo-compatibility-ai/?cid=${savedId}`, endpoint: '/api/sukuyo-compatibility-ai/result', payload: sukuyo,
    conclusion: '민준님과 서연님은 만나자마자 서로의 결을 알아보는 사이예요.', module: 'app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx' },
  { key: 'life-book', route: `/life-book-ai/result/?attemptId=${savedId}`, endpoint: '/api/life-book-ai/result', payload: life,
    conclusion: life.reportJson.coreSummary.oneLine, bodyMarker: '#life-book-chapter-deck', module: 'app/life-book-ai/result/LifeBookAiResultClient.tsx' },
  { key: 'love-secret', route: `/love-secret-ai/result/?sessionId=${savedId}`, endpoint: `/api/love-secret-ai/result/${savedId}`, payload: love,
    conclusion: love.reading.oneLineDiagnosis, bodyMarker: `text=${love.finalLine}`, module: 'app/love-secret-ai/result/LoveSecretAiResultClient.tsx' },
  { key: 'karma', route: `/karma-destiny-ai/result/?sessionId=${savedId}`, endpoint: '/api/karma-destiny-ai/result', payload: karma,
    conclusion: '운명을 바꾸는 핵심 문장은 지금 다시 마주할 시기입니다.', module: 'app/karma-destiny-ai/result/KarmaDestinyAiResultClient.tsx' },
  { key: 'fusion', route: `/fusion-fortune/?cid=${savedId}`, endpoint: '/api/fusion-fortune/result', payload: { ok: true, consultation: { id: savedId, status: 'completed', result: fusion.result } },
    conclusion: fusion.result.finalVerdict.headline, module: 'app/fusion-fortune/FusionFortuneClient.tsx' },
];
// Saved record reopen: the stored body leads, the saved saju chart follows in a closed reference.
const pillars = { yearPillar: '庚辰', monthPillar: '辛巳', dayPillar: '癸酉', hourPillar: '甲寅' };
const savedRecord = (source, serviceId, serviceName, startHref) => ({ id: savedId, source, key: `${source}:${savedId}`, serviceId, serviceName, title: `[합성 검증] ${serviceName}`,
  question: '', createdAt: '2026-11-01T00:00:00.000Z', status: 'completed', character: '', group: 'report', href: `/records/view/?source=${source}&id=${savedId}`, startHref, nativeHref: '' });
const bookBody = '인생의 책 합성 저장 본문입니다. 기준을 먼저 세우면 흐름이 단단해집니다.';
const yearBody = '신년 합성 저장 본문입니다. 상반기에는 정리, 하반기에는 확장이 어울립니다.';
services.push(
  { key: 'records-life-book', blockedByGuard: true, route: `/records/view/?source=life-book&id=${savedId}`, endpoint: '/api/records/detail', query: { source: 'life-book' },
    payload: { ok: true, record: savedRecord('life-book', 'life-book', '인생의 책', '/life-book-ai/'), content: { sajuResult: pillars, chapters: [{ title: '저장된 첫 장', content: bookBody }] } },
    conclusion: bookBody, module: 'app/records/view/SavedServiceReading.tsx' },
  { key: 'records-new-year', blockedByGuard: true, route: `/records/view/?source=new-year&id=${savedId}`, endpoint: '/api/records/detail', query: { source: 'new-year' },
    payload: { ok: true, record: savedRecord('new-year', 'new-year', '신년운세', '/new-year-ai-consultation/'), content: { sajuResult: pillars, sections: [{ title: '올해의 흐름', content: yearBody }] } },
    conclusion: yearBody, module: 'app/records/view/SavedServiceReading.tsx' },
);
// Saved tea reading (saju mode), hand-written so no saju calculator is imported.
const teaId = 'tea-answer-first', teaText = '합성 저장 찻집 결과입니다. 실제 상담 결과가 아닙니다.';
const teaMain = '연이의 합성 저장 해석입니다. 지금은 결정을 미루기보다 기준 하나를 먼저 정해 보세요.';
const teaPillar = (key, label, ganji, element) => ({ key, label, ganji, heavenlyStem: ganji[0], earthlyBranch: ganji[1], element, available: true });
const teaElement = (key, nameKo, value, tone) => ({ key, nameKo, value, strengthLabel: '보통', reading: teaText, tone });
const tea = { resultId: teaId, sessionTitle: '[합성 검증] 연이의 사주 찻집', questionSummary: teaText, consultationMode: 'saju', createdAt: '2026-11-01T00:00:00.000Z',
  teaCup: { id: 'lotus-moon', name: '연꽃', topic: '선택', reading: teaText },
  saju: { available: true, title: '사주 해석', summary: teaText, keyPoints: ['기준 세우기'], dayMaster: '癸',
    birthSummary: { nickname: '합성 검증', hasBirthTime: true, birthDate: '1990-05-15', birthTime: '07:00', calendarType: 'solar', timezone: 'Asia/Seoul' },
    pillars: [teaPillar('year', '년주', '庚辰', 'metal'), teaPillar('month', '월주', '辛巳', 'metal'), teaPillar('day', '일주', '癸酉', 'water'), teaPillar('hour', '시주', '甲寅', 'wood')],
    fiveElements: [teaElement('wood', '목', 2, 'green'), teaElement('fire', '화', 1, 'rose'), teaElement('earth', '토', 1, 'gold'), teaElement('metal', '금', 3, 'silver'), teaElement('water', '수', 1, 'blue')],
    deepSections: [{ id: 'flow', title: '흐름', body: teaText, tone: 'flow' }], cautionReading: teaText, actionPrescription: teaText },
  tarot: { cardId: 'major-0', number: 0, nameKo: '바보', nameEn: 'The Fool', orientation: 'upright', keywords: ['시작'], meaning: teaText, reading: teaText },
  emotionAnalysis: [], yeoniReading: { intro: teaText, main: teaMain, advice: teaText, caution: teaText }, synthesis: { title: '종합', summary: teaText, sajuTarotBridge: '' },
  choiceSimulation: [], actionPrescription: teaText, luckyKeywords: ['정리'], closingLine: teaText };
services.push({ key: 'tea-house', route: `/fortune-tea-house/?resultId=${teaId}`, endpoint: `/api/fortune-tea-house/results/${teaId}`, payload: { ok: true, result: tea },
  conclusion: teaMain, bodyMarker: '#closingResultTitle', module: 'src/features/fortune-tea-house/components/TeaHouseResultSheet.tsx' });
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
  const service = services.find(item => item.endpoint === pathname && Object.entries(item.query || {}).every(([key, value]) => url.searchParams.get(key) === value));
  if (!service) return null;
  if (service.key === 'fusion' && url.searchParams.has('pending')) return { ok: true, consultation: null };
  if (['ziwei', 'sukuyo', 'fusion', 'new-year', 'vedic'].includes(service.key) && !url.search) return { ok: true, consultations: [], sessions: [] };
  return service.payload;
}
