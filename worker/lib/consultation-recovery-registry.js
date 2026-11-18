export const CONSULTATION_RECOVERY_ADAPTERS = Object.freeze([
  ['astrology-ai', 'AstrologyAiConsultation', { 'llmMeta.resumeBody': { $exists: true } }],
  ['vedic-ai', 'VedicAiConsultation', { 'llmMeta.resumeBody': { $exists: true } }],
  ['ziwei-ai', 'ZiweiAiConsultation', { serviceType: 'ziwei-ai', 'llmMeta.resumeBody': { $exists: true } }],
  ['sukuyo-compatibility-ai', 'SukuyoCompatibilityAiConsultation', { 'llmMeta.resumeBody': { $exists: true } }],
  ['new-year-ai', 'NewYearAiConsultation', { 'llmMeta.resumeBody': { $exists: true } }],
  ['life-book-ai', 'LifeBookAiConsultation', { 'llmMeta.resumeBody': { $exists: true } }],
  ['love-secret-ai', 'LoveSecretAiConsultation', { 'llmMeta.delivery.resumeBody': { $exists: true } }],
  ['neo-operation-room', 'NeoOperationRoomConsultation', { 'llmMeta.resumeBody': { $exists: true } }],
  ['nakshatra-ai', 'NakshatraAiConsultation', {}],
  ['human-design-report', 'HumanDesignReport', {}],
  ['destiny-compass-ai', 'DestinyCompassReport', {}],
  ['relationship-boundary-test', 'RelationshipBoundaryTest', {}],
  ['naming-prompt', 'PaidExecutionRecord', { featureId: 'premium-naming-prompt', 'result.namingPrompt': { $exists: true } }],
  ['heukwol', 'ServiceExecutionTransaction', { featureKey: 'heukwol-warning-consultation', 'metadata.analysis': { $exists: true } }],
  ['celestial-harmony', 'ServiceExecutionTransaction', { featureKey: 'tarot-celestial-harmony', 'metadata.celestialDelivery': { $exists: true } }],
  ['fortune', 'PaidExecutionRecord', { featureId: 'saju_ai_question_prompt', 'result.resumeBody': { $exists: true } }],
  ['karma-destiny-ai', 'KarmaDestinyAiConsultation', {}],
  ['fortune-tea-house', null, {}],
]);

// 유료 LLM 전달 계약 (S5, 2026-11-18). 결제·이용권·월정석·코인으로 시작하는 LLM 생성은
// 모두 여기 한 줄씩 있어야 한다: 생성 파일, 판매 키, 결과를 못 줄 때 돈을 되돌리는 공용 경로.
// 금지 상태 3가지 — 차감됐는데 결과 없음 / 결과가 있는데 못 봄 / partial 영구 정체.
// scripts/verify-paid-llm-delivery-contract.mjs 가 (1) 결제 원시함수+LLM 호출을 함께 쓰는 worker 파일이
// 이 목록 밖에 있으면, (2) refunds 의 공용 환불 경로가 files 에서 참조되지 않으면,
// (3) 카탈로그의 LLM 판매 키나 위 복구 어댑터가 빠지면 실패한다. 새 유료 LLM 서비스는 여기와
// __tests__/worker/paid-llm-delivery-contract.test.js 에 함께 등록한다.
// gap 은 자동 환불이 아직 없는 알려진 구멍이다(검증기 KNOWN_REFUND_GAPS 와 짝 — 새로 늘리면 실패).
const narrative = ['runPaidNarrativeDelivery'];
const NARRATIVE_CARD_GAP = 'paid-narrative 실행 기록에 paymentRef 가 없어 시간 초과 정산(runServiceExecutionTimeoutTask)이 단건 카드 PG 취소를 하지 못할 수 있다 — 이용권·코인·월정석만 자동 복원';
export const PAID_LLM_DELIVERY_CONTRACT = Object.freeze([
  { service: 'astrology-ai', files: ['worker/routes/astrology-ai.js'], featureKeys: ['astrology-ai-consultation'], refunds: ['failServiceExecution', 'autoRefundSinglePaymentDeliveryFailure', 'refundPassUseEvidence'] },
  { service: 'vedic-ai', files: ['worker/routes/vedic-ai.js'], featureKeys: ['vedic-ai-consultation'], refunds: ['autoRefundSinglePaymentDeliveryFailure', 'refundPassUseEvidence'] },
  { service: 'ziwei-ai', files: ['worker/routes/ziwei-ai.js'], featureKeys: ['ziwei-ai-consultation'], refunds: ['autoRefundSinglePaymentDeliveryFailure', 'refundPassUseEvidence'] },
  { service: 'sukuyo-compatibility-ai', files: ['worker/routes/sukuyo-compatibility-ai.js'], featureKeys: ['sukuyo-compatibility-ai'], refunds: ['refundPassUseEvidence'] },
  { service: 'new-year-ai', files: ['worker/routes/new-year-ai.js'], featureKeys: ['new-year-ai-consultation'], refunds: ['settleFailedConsultationRefund'] },
  { service: 'life-book-ai', files: ['worker/routes/life-book-ai.js'], featureKeys: ['life-book-ai-consultation', 'life-fortune-ai-consultation'], refunds: ['settleFailedConsultationRefund'] },
  { service: 'love-secret-ai', files: ['worker/routes/love-secret-ai.js'], featureKeys: ['love-secret-ai-consultation'], refunds: ['refundPassUseEvidence'] },
  { service: 'neo-operation-room', files: ['worker/routes/neo-operation-room.js'], featureKeys: ['neo-operation-room-consultation'], refunds: ['failServiceExecution', 'autoRefundSinglePaymentDeliveryFailure'] },
  { service: 'nakshatra-ai', files: ['worker/routes/nakshatra-ai.js'], featureKeys: ['nakshatra-ai-consultation'], refunds: ['failServiceExecution', 'refundPassUseEvidence'] },
  { service: 'human-design-report', files: ['worker/routes/human-design-report.js'], featureKeys: ['human-design-report'], refunds: ['failServiceExecution'] },
  { service: 'destiny-compass-ai', files: ['worker/routes/destiny-compass-ai.js'], featureKeys: ['destiny-compass-deep-report'], refunds: ['failServiceExecution'] },
  { service: 'relationship-boundary-test', files: ['worker/routes/relationship-boundary-test.js'], featureKeys: ['relationship-boundary-test'], refunds: ['failServiceExecution'] },
  { service: 'naming-prompt', files: ['worker/routes/naming-prompt.js'], featureKeys: ['premium-naming-prompt'], refunds: ['refundPassUseEvidence'] },
  { service: 'heukwol', files: ['worker/routes/heukwol.js'], featureKeys: ['heukwol-warning-consultation'], refunds: ['failServiceExecution'] },
  { service: 'celestial-harmony', files: ['worker/routes/celestial-harmony.js', 'worker/lib/celestial-delivery-store.js', 'worker/lib/celestial-report-delivery.js'], featureKeys: ['tarot-celestial-harmony'], refunds: ['failServiceExecution'] },
  { service: 'fortune', files: ['worker/routes/fortune.js'], featureKeys: ['saju_ai_question_prompt'], refunds: ['autoRefundSinglePaymentDeliveryFailure', 'refundPassUseEvidence', 'refundPassCoverage'] },
  { service: 'karma-destiny-ai', files: ['worker/routes/karma-destiny-ai.js'], featureKeys: ['karma-destiny-ai-consultation'], refunds: ['refundPassUseEvidence'] },
  { service: 'fortune-tea-house', files: ['worker/routes/fortune-tea-house.js'], featureKeys: ['fortune-tea-house-*'], refunds: ['refundPassCoverage'] },
  { service: 'feature-question', files: ['worker/lib/feature-question-delivery.js', 'worker/routes/fortune.js'], featureKeys: ['ziwei_ai_prompt_generator', 'astrology_ai_prompt_generator', 'vedic_ai_prompt_generator', 'sukuyo_ai_prompt_generator'], refunds: ['autoRefundSinglePaymentDeliveryFailure', 'refundPassUseEvidence'] },
  { service: 'master-love-codex', files: ['worker/routes/master-love-codex.js'], featureKeys: ['master-love-codex', 'master-love-codex-compat'], refunds: ['runPaymentCancel', 'runCoinRefund', 'runMonthlyCreditRefund', 'refundPassUseEvidence', 'refundPassCoverage'] },
  { service: 'ziwei-deep-report', files: ['worker/routes/ziwei-deep-report.js'], featureKeys: ['ziwei-deep-pdf'], refunds: ['failServiceExecution'] },
  { service: 'fusion-fortune', files: ['worker/routes/fusion-fortune.js', 'worker/lib/fusion-fortune.js', 'worker/lib/fusion-fortune-recovery-task.js'], featureKeys: ['fusion-fortune-consultation'], refunds: ['refundEligibleAt'] },
  { service: 'yeongnyangi', files: ['worker/yeongnyangi/service.ts', 'worker/yeongnyangi/repository.js', 'worker/yeongnyangi/terminal-refund.js'], featureKeys: ['yeongnyangi-*'], refunds: ['refundYeongnyangiServicePack', 'refundYeongnyangiMoonstone', 'refundPassCoverage', 'refundPaymentAsOperator'] },
  { service: 'fortune-chat-question', files: ['worker/yeongnyangi/per-use-access.js', 'worker/yeongnyangi/repository.js', 'worker/routes/fortune-chat-consultations.js'], featureKeys: ['fortune-chat-question-*'], refunds: ['autoRefundSinglePaymentDeliveryFailure', 'refundYeongnyangiMoonstone', 'refundPassCoverage'] },
  { service: 'tarot-oracle', files: ['worker/lib/tarot-oracle-delivery.js', 'worker/routes/tarot.js'], featureKeys: ['tarot-prompt-maker', 'tarot-prompt-maker-standard', 'tarot-prompt-maker-deep', 'tarot-prompt-maker-master'], refunds: narrative, gap: NARRATIVE_CARD_GAP },
  { service: 'love-tarot', files: ['worker/lib/love-tarot-delivery.js'], featureKeys: ['tarot-love-relationship'], refunds: narrative, gap: NARRATIVE_CARD_GAP },
  { service: 'mindscan', files: ['worker/lib/mindscan-delivery.js'], featureKeys: ['tarot-mindscan'], refunds: narrative, gap: NARRATIVE_CARD_GAP },
  { service: 'dream', files: ['worker/routes/dream.js'], featureKeys: ['dream-psycho-analysis'], refunds: narrative, gap: NARRATIVE_CARD_GAP },
  { service: 'yoga-guru', files: ['worker/routes/yoga-guru.js'], featureKeys: ['yoga-guru-per-use'], refunds: narrative, gap: NARRATIVE_CARD_GAP },
  { service: 'saju-compat-basic', files: ['worker/routes/saju-compat-basic.js'], featureKeys: ['compat-saju-compatibility'], refunds: narrative, gap: NARRATIVE_CARD_GAP },
  { service: 'pet-saju-ai', files: ['worker/routes/pet-saju-ai.js'], featureKeys: ['pet-saju-ai-consultation', 'pet-compatibility-ai'], refunds: narrative, gap: NARRATIVE_CARD_GAP },
  { service: 'geomancy-oracle', files: ['worker/routes/oracle.js'], featureKeys: ['openGeomancyOracle', 'geomancy'], refunds: narrative, gap: NARRATIVE_CARD_GAP },
  { service: 'animal-totem', files: ['worker/routes/animal-totem.js'], featureKeys: ['animal-totem-basic', 'animal-totem-deep'], refunds: narrative, gap: NARRATIVE_CARD_GAP },
  { service: 'guardian-fortune', files: ['worker/lib/guardian-paid-delivery.js', 'worker/lib/guardian-fortune-generate.js', 'worker/routes/fortune-chat.js'], featureKeys: ['fortune-chat-consultation'], refunds: narrative, gap: NARRATIVE_CARD_GAP },
  // 토스 인앱결제(TOSS_IAP): 파트너 환불 API 가 없다(worker/toss/order-reconciliation.js — 읽기만).
  // 환불은 토스 쪽에서 일어나고 대사 cron 이 recordTossRefund 로 반영한다.
  { service: 'toss-native', files: ['worker/toss/routes.js', 'worker/toss/owned-narrative.js', 'worker/toss/native-pet-paid.js', 'worker/toss/native-saju-compat.js', 'worker/toss/native-yoga.js', 'worker/toss/tarot-library-generator.js'],
    featureKeys: ['pet-saju-ai-consultation', 'compat-saju-compatibility', 'yoga-guru-per-use', 'tarot-celestial-harmony'], refunds: [],
    gap: '토스 인앱결제는 파트너 환불 API 가 없다 — 생성 실패 시 토스 환불 요청·대사(order-reconciliation)로만 정리된다' },
  { service: 'palm', files: ['worker/routes/palm.js', 'worker/lib/palm-result-delivery.js'], featureKeys: ['palm-reading-general'], refunds: [],
    gap: '결제 증빙을 결과 저장 전까지 같은 requestId 재시도에 재사용(paymentRetainedForRetry) — 생성이 끝내 실패하면 자동 환불 경로가 없다' },
].map(entry => Object.freeze({ ...entry, files: Object.freeze(entry.files), featureKeys: Object.freeze(entry.featureKeys), refunds: Object.freeze(entry.refunds) })));
