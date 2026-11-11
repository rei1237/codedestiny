import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const engine = readFileSync('js/saju-engine.js','utf8');
const sukuyo = readFileSync('js/saju-engine-tarot-sukuyo-quantum.js','utf8');
const presentation = readFileSync('js/core/saju/basicFortunePresentation.js','utf8');
test('deterministic astrology and ziwei CTAs describe their free access',()=>{
 for(const value of ['두 사람의 별자리 궁합 보기 · 무료','유명인 시나스트리 · 무료','관계 심화 · 무료','궁위 해설 · 무료','상징 해설 · 무료','보조 흐름 · 무료','10년운 열기 · 무료']) assert.ok(engine.includes(value),value);
 for(const value of ['✦ 5,000원으로','유료 관계 · 5,000원','유료 궁위 · 5,000원','유명인 시나스트리 · 5,000원']) assert.ok(!engine.includes(value),value);
 assert.ok(engine.includes('질문을 입력하면 5,000원 결제 확인 후 현재 차트와 최근 궁합 결과를 반영한 상담 답변을 생성합니다.'));
});
test('sukuyo annual and precision copy is free without changing AI or tarot prices',()=>{
 assert.ok(sukuyo.includes('숙요점 1년운 전체 해석 보기 · 무료'));
 assert.ok(sukuyo.includes('정밀 궁합 확장 열기 · 무료'));
 assert.ok(!sukuyo.includes('잠금 콘텐츠 · 5,000원'));
 assert.ok(sukuyo.includes('5,000원 AI 상담 받기'));
 assert.ok(sukuyo.includes('흐름 리딩 보기 · 5,000원'));
 assert.ok(presentation.includes('상세 풀이는 무료입니다. AI 상담은 별도 유료로 이용할 수 있어요.'));
});
