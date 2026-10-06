// Shared navigation and storage contract. Prices remain in billing-feature-registry.
const service = (id, name, model, href, resultPath, featureKey, extra = {}) => ({
  id, name, model, href, resultPath, featureKey, group: 'report', idField: 'id', ...extra,
});
export const RECORD_SERVICES = Object.freeze([
  service('tea', '연이의 운명 찻집', '', '/fortune-tea-house/', '/fortune-tea-house/?resultId=', 'fortune-tea-house-tarot-consultation', { collection: 'fortune_tea_house_results', idField: 'resultId', character: 'yeoni', featured: true, description: '마음이 복잡할 때, 내 상황을 차분하게 풀어보고 싶다면', format: '질문별 해석과 실천 조언 · 명식 또는 카드', image: '/images/fortune-tea-house/flower-pig-honey-hug.webp' }),
  service('neo', '네오의 팩폭 전략실', 'NeoOperationRoomConsultation', '/neo-operation-room/', '/neo-operation-room/result/?attemptId=', 'neo-operation-room-consultation', { character: 'neo', featured: true, description: '반복되는 문제를 짚고, 다음 행동을 정하고 싶다면', format: '상황 브리핑과 실행 작전', image: '/neo-operation-room/lion-seal-loading.webp' }),
  service('fusion', '초융합 운세', 'FusionFortuneConsultation', '/fusion-fortune/', '/fusion-fortune/?cid=', 'fusion-fortune-consultation', { featured: true, description: '여러 운세 체계로 내 상황을 깊이 살펴보고 싶다면', format: '여섯 체계별 해석과 종합 리포트', image: '/images/fusion-fortune/fusion-guardian-celestial-hero.webp' }),
  service('codex', '마스터 인연의 서', 'MasterLoveCodexSession', '/master-love-codex/', '/master-love-codex/result/?sessionId=', 'master-love-codex', { featured: true, description: '나의 인연 패턴이나 두 사람의 관계 흐름이 궁금하다면', format: '개인판 또는 궁합판 · 챕터별 인연 리포트', image: '/feature-details/assets/master-love-codex-og.webp' }),
  service('new-year', '신년운세 상담', 'NewYearAiConsultation', '/new-year-ai-consultation/', '/new-year-ai-consultation/?sid=', 'new-year-ai-consultation', { hub: true, description: '올해의 선택과 시기별 흐름을 미리 정리하고 싶다면', format: '신년 종합 해석과 시기별 조언', image: '/feature-details/assets/new-year-ai-480.webp' }),
  service('karma', '운명의 업 리포트', 'KarmaDestinyAiConsultation', '/karma-destiny-ai/', '/karma-destiny-ai/result/?sessionId=', 'karma-destiny-ai-consultation', { hub: true, description: '반복되는 삶의 패턴과 선택의 의미를 돌아보고 싶다면', format: '근거별 해석과 챕터 리포트', image: '/feature-details/assets/karma-destiny-ai-480.webp' }),
  service('ziwei', '자미두수 상담', 'ZiweiAiConsultation', '/ziwei-ai/', '/ziwei-ai/?cid=', 'ziwei-ai-consultation'),
  service('ziwei-deep', '자미두수 심층 리포트', 'ZiweiDeepReport', '/ziwei-ai/', '', 'ziwei-deep-pdf'),
  service('love-secret', '연애 비책', 'LoveSecretAiConsultation', '/love-secret-ai/', '/love-secret-ai/result/?sessionId=', 'love-secret-ai-consultation', { hub: true, description: '내 관계 방식과 연애 고민을 구체적으로 풀어보고 싶다면', format: '사주 근거와 질문별 연애 비책', image: '/feature-details/assets/love-secret-ai-480.webp' }),
  service('life-book', '인생의 책', 'LifeBookAiConsultation', '/life-book-ai/', '/life-book-ai/result/?attemptId=', 'life-book-ai-consultation', { hub: true, description: '내 기질과 인생의 방향을 긴 흐름으로 읽고 싶다면', format: '사주 기반 인생 챕터 리포트', image: '/feature-details/assets/life-book-ai-480.webp' }),
  service('sukuyo-compat', '숙요점 궁합 상담', 'SukuyoCompatibilityAiConsultation', '/sukuyo-compatibility-ai/', '/sukuyo-compatibility-ai/?cid=', 'sukuyo-compatibility-ai-consultation', { idField: '_id' }),
  service('vedic', '베다점 상담', 'VedicAiConsultation', '/vedic-ai/', '/vedic-ai/result/?id=', 'vedic-ai-consultation'),
  service('astrology', '서양 점성술 상담', 'AstrologyAiConsultation', '/astrology-ai/', '/astrology-ai/result/?id=', 'astrology-ai-consultation'),
  service('nakshatra', '나크샤트라 상담', 'NakshatraAiConsultation', '/nakshatra/ai/', '', 'nakshatra-ai-consultation'),
  service('compass', '운명의 나침반', 'DestinyCompassReport', '/destiny-compass/', '/destiny-compass/?reportId=', 'destiny-compass-life-voyage'),
  service('human-design', '휴먼디자인 리포트', 'HumanDesignReport', '/human-design/', '/human-design/report/?reportId=', 'human-design-report'),
  service('human-design-chart', '휴먼디자인 차트', 'HumanDesignCalculation', '/human-design/', '', '', { group: 'chart', where: { accessType: { $in: ['paid', 'pass', 'monthly_credit', 'membership_credit', 'subscription', 'admin'] } } }),
  service('human-design-reading', '휴먼디자인 해석', 'HumanDesignInterpretation', '/human-design/', '', '', { group: 'chart' }),
  service('relationship', '그 사람의 바람끼 테스트', 'RelationshipBoundaryTest', '/relationship-boundary-test/', '', 'relationship-boundary-test'),
  service('chat', '연이·네오 대화 상담', 'FortuneChatSession', '/fortune-chat/', '/fortune-chat/?session=', 'fortune-chat-consultation', { group: 'chat', idField: 'sessionId' }),
  service('chat-consultation', '연이·네오 상담실', '', '/fortune-chat/', '/fortune-chat/?consultation=', 'fortune-chat-consultation', { collection: 'yeongnyangi_requests', idField: '_id', group: 'chat', where: { featureKey: 'fortune-chat-consultation', persona: { $in: ['yeoni', 'neo'] } } }),
  service('executions', '저장된 운세', 'ServiceExecutionTransaction', '/ggulggul/', '', '', { idField: 'executionKey', dynamic: true }),
  service('paid-results', '저장된 상담 결과', 'PaidExecutionRecord', '/ggulggul/', '', '', { idField: '_id', dynamic: true }),
  service('legacy-naming', '작명 상담', 'Payment', '/naming-ai/', '', 'premium-naming-prompt', { idField: '_id', where: { $or: [{ namingPrompt: { $exists: true, $ne: null } }, { 'pricingSnapshot.namingPrompt': { $exists: true, $ne: null } }] } }),
]);

export function recordService(id) { return RECORD_SERVICES.find(item => item.id === id); }
export function savedRecordPath(source, id) { return `/records/view/?source=${encodeURIComponent(source)}&id=${encodeURIComponent(id)}`; }

// Result-bearing variants in the shared execution stores. These are separate
// products even when their storage adapter is shared.
export const SAVED_FEATURES = Object.freeze(Object.fromEntries([
  ['saju_ai_prompt_generator', '사주 전문가 상담', '/saju/'],
  ['vedic_prashna_prompt', '베다 프라슈나 상담', '/vedic/'],
  ['premium-naming-prompt', '작명 상담', '/naming-ai/'],
  ['tarot-year-fortune', '십이지신 천운 타로', '/tarot/'],
  ['ziwei_ai_prompt_generator', '자미두수 전문가 질문', '/ziwei/'],
  ['sukuyo_ai_prompt_generator', '숙요점 전문가 질문', '/sukuyo/'],
  ['astrology_ai_prompt_generator', '점성술 전문가 질문', '/astrology/'],
  ['vedic_ai_prompt_generator', '베다점 전문가 질문', '/vedic/'],
  ['tarot-love-relationship', '우리는 무슨 사이 타로', '/tarot/'],
  ['tarot-mindscan', '말과 행동 사이 타로', '/tarot/'],
  ['tarot-prompt-maker', '타로 상담', '/tarot/prompt-maker/'],
  ['tarot-prompt-maker-standard', '타로 상담 · 기본', '/tarot/prompt-maker/'],
  ['tarot-prompt-maker-deep', '타로 상담 · 심층', '/tarot/prompt-maker/'],
  ['tarot-prompt-maker-master', '타로 상담 · 마스터', '/tarot/prompt-maker/'],
  ['dream-psycho-analysis', '정신분석 해몽', '/dream/psycho/'],
  ['animal-totem-basic', '애니멀 토템 · 기본', '/animal-totem/'],
  ['animal-totem-deep', '애니멀 토템 · 심층', '/animal-totem/'],
  ['geomancy', '지오맨시', '/geomancy/'],
  ['yoga-guru-per-use', 'Divya Yoga', '/yoga-guru/'],
  ['pet-saju-ai-consultation', '반려동물 사주', '/pet-saju/'],
  ['pet-compatibility-ai', '반려동물 궁합', '/pet-saju/'],
  ['fortune-chat-consultation', '연이·네오 대화 상담', '/fortune-chat/', 'chat'],
  ['palm-reading-general', '손금 리딩', '/palm-reading/'],
  ['tarot-celestial-harmony', '천체의 선율', '/celestial-harmony/'],
  ['premium-fpti-report', 'FPTI 심층 리포트', '/fpti/'],
].map(([id, name, href, group]) => [id, { name, href, group: group || 'report' }])));
