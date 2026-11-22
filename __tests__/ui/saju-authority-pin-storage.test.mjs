import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { BSON } from 'bson';
import { calculateLifeBookAiSaju } from '../../worker/lib/life-book-ai-saju.js';
import { connectLifeBookSajuAuthority, readSajuAuthority, lifeBookPillars } from '../../worker/lib/saju-authority-consumer.js';
import '../../worker/lib/models.js';

// 2026-11-22 운영 원인: Mongoose minimize(기본값)가 저장할 때 빈 객체(johu…presentInChart: {})를 지워
// 저장된 고정 판정의 다이제스트가 어긋났다 → /start 가 웨이브 잠금 전에 SAJU_AUTHORITY_PIN_INVALID 로 멈추고
// LLM 호출 0회로 정체 환불됐다. 실제 스키마로 저장했다 읽은 모양에서 검증이 통과해야 한다.
const stored = raw => {
  const Model = mongoose.models.LifeBookAiConsultation;
  const doc = new Model({ id: 'lbai_test', userId: 'u', idempotencyKey: 'k', sajuResult: raw, llmMeta: { factSnapshot: raw } });
  return BSON.deserialize(BSON.serialize(doc.toBSON())).llmMeta.factSnapshot;
};

test('인생의 책: 저장했다 다시 읽은 승인 판정 고정값이 검증을 통과한다', () => {
  for (const birth of [
    { birthDate: '1988-05-15', birthTime: '08:30', gender: 'male', calendarType: 'solar' },
    { birthDate: '1990-01-01', birthTime: '', birthTimeUnknown: true, gender: 'female', calendarType: 'solar' },
    { birthDate: '1975-11-20', birthTime: '23:40', gender: 'female', calendarType: 'lunar' },
  ]) {
    const raw = connectLifeBookSajuAuthority(calculateLifeBookAiSaju(birth), { enabled: true });
    const back = stored(raw);
    assert.doesNotThrow(() => readSajuAuthority(back.sajuAuthority, lifeBookPillars(back)), birth.birthDate);
    assert.doesNotThrow(() => connectLifeBookSajuAuthority(back, { enabled: true, hasExistingRecord: true }), birth.birthDate);
  }
});

test('고정값을 바꾸면 여전히 거부한다', () => {
  const raw = connectLifeBookSajuAuthority(calculateLifeBookAiSaju({ birthDate: '1988-05-15', birthTime: '08:30', gender: 'male', calendarType: 'solar' }), { enabled: true });
  const back = stored(raw);
  back.sajuAuthority.analysis.evidence.reading = { tampered: true };
  assert.throws(() => readSajuAuthority(back.sajuAuthority), /SAJU_AUTHORITY_PIN_INVALID/);
});
