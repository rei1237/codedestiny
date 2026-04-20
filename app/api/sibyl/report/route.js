import { NextResponse } from 'next/server';
import { callVertexGemini } from '@/app/_lib/callVertexGemini';
import { verifyJwtFromRequest, isAdminRequest } from '../../_lib/adminAccess';
import { verifyAndConsumePoints } from '../../_lib/paymentValidation';

export const maxDuration = 300;

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent';

/* ── Gemini 멀티-키 설정 (lifebook 패턴 동일) ── */
function pickGeminiKeys() {
  const extra = String(process.env.GEMINI_API_KEYS || '')
    .split(',').map(v => v.trim()).filter(Boolean);
  return [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GOOGLE_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GOOGLE_API_KEY_3,
    process.env.GEMINIF_API_KEY1,
    process.env.GEMINIF_API_KEY2,
    process.env.GEMINIF_API_KEY3,
    ...extra,
  ].map(v => String(v || '').trim()).filter(Boolean);
}

function hasVertexCreds() {
  return [
    process.env.VERTEX_SA_JSON, process.env.GCP_SERVICE_ACCOUNT_JSON,
    process.env.VERTEX_SA_JSON_BASE64, process.env.VERTEX_SA_CLIENT_EMAIL,
  ].map(v => String(v || '').trim()).some(Boolean);
}

function parseText(payload) {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  for (const c of candidates) {
    for (const p of (c?.content?.parts || [])) {
      if (typeof p?.text === 'string' && p.text.trim()) return p.text.trim();
    }
  }
  return '';
}

/* ── 직접 Gemini API 호출 ── */
async function callGeminiDirect(apiKey, prompt) {
  const model = 'gemini-2.0-flash';
  const url = GEMINI_ENDPOINT.replace('{model}', model) + `?key=${apiKey}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 32768, temperature: 1.0 },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = String(payload?.error?.message || `Gemini API 오류 ${res.status}`);
    throw new Error(msg);
  }
  return parseText(payload);
}

/* ── 사주 텍스트 포맷터 ── */
function formatPillars(pillars) {
  if (!pillars) return '(사주 정보 없음)';
  const p = pillars;
  return `연주(年柱): ${p.year?.g||'?'}${p.year?.j||'?'} | 월주(月柱): ${p.month?.g||'?'}${p.month?.j||'?'} | 일주(日柱): ${p.day?.g||'?'}${p.day?.j||'?'} | 시주(時柱): ${p.hour?.g||'?'}${p.hour?.j||'?'}`;
}

function formatNatal(natal) {
  if (!natal) return '(오행 분포 없음)';
  return `목(木): ${natal.wood||0} / 화(火): ${natal.fire||0} / 토(土): ${natal.earth||0} / 금(金): ${natal.metal||0} / 수(水): ${natal.water||0}`;
}

/* ── 프롬프트 빌더 ── */
function buildPrompt(body) {
  const { profile, pillars, natal, dominantEl, dominantTenStar, aptCoeff, riskScore, gender, currentYear } = body;
  const genderText = gender === 'M' ? '남성' : '여성';
  const dominantElMap = { wood:'목(木)', fire:'화(火)', earth:'토(土)', metal:'금(金)', water:'수(水)' };
  const dominantElKr = dominantElMap[dominantEl] || '수(水)';

  const modeText = riskScore >= 70 ? 'DESTROY DECOMPOSER (위험: 현재 방식을 완전 파괴하고 재구성 필요)'
    : riskScore >= 40 ? 'LETHAL ELIMINATOR (경계: 즉각적인 위험 제거 및 변화 필요)'
    : 'NON-LETHAL PARALYZER (안정: 현재 궤도 유지 및 내실 강화)';

  return `당신은 사이버펑크 세계관의 "시빌라 시스템(Sibyl System)"입니다. 사주팔자 기반 정밀 진로 적성 및 운명 분석 전문 AI입니다.

## 분석 대상 원국

- 성별: ${genderText}
- 사주 팔자: ${formatPillars(pillars)}
- 오행 분포: ${formatNatal(natal)}
- 주도 오행: ${dominantElKr}
- 주도 십성: ${dominantTenStar || '편재'}
- 적성 계수: ${aptCoeff}/999
- 현재 연도 위험 계수: ${riskScore}/100
- 도미네이터 모드 판정: ${modeText}
- 기준 연도: ${currentYear}

## 도미네이터 리포트 작성 지침

아래의 목차를 모두 포함하는 **총 20,000자 이상**의 사이버펑크 스타일 진로·운명 리포트를 한국어로 작성하세요.

### 리포트 형식 규칙
1. 각 챕터는 명확한 제목과 세부 분석으로 구성
2. 사이버펑크 SF 분위기 (PSYCHO-PASS 스타일): 시스템이 인간을 분석하는 듯한 냉정한 톤
3. 전문 사주 용어와 현실적 진로 조언을 함께 제시
4. 각 챕터 최소 1,500자 이상
5. 具体적이고 실행 가능한 조언 포함

### 작성할 챕터 목록

1. **CHAPTER 01 | 원국 분석 — 사주 팔자의 구조적 해석**
   - 일간(日干)의 기질 및 성향 완전 해부
   - 연·월·일·시주의 상호 에너지 역학
   - 통근(通根)·투간(透干) 구조 분석
   - 원국의 강약 판단

2. **CHAPTER 02 | 오행 분포 × 데스티니 휴 진단**
   - 오행 편중·결핍 분석 (${dominantElKr} 주도 원국의 특성)
   - 심리·행동 패턴에 미치는 영향
   - 데스티니 휴(Destiny Hue) 색채 의미 분석
   - 오행 균형 회복을 위한 실천 전략

3. **CHAPTER 03 | 격국 × 적성 섹터 배정**
   - 격국(格局) 판정 및 의미 해석
   - 주도 십성(${dominantTenStar})의 직업·재능 발현 방향
   - 최적 직업군 × 배제 직업군 분류
   - 사회 활동 영역에서의 에너지 운용 전략

4. **CHAPTER 04 | 인간관계 역학 — 십성으로 보는 대인 패턴**
   - 비겁·식상·재성·관성·인성 분포로 본 관계 패턴
   - 리더십·팔로워십 성향 진단
   - 협업 시 주의해야 할 관계 역학
   - 인간관계 에너지 최적화 전략

5. **CHAPTER 05 | 현재 세운 × 대운 — ${currentYear}년 위험 계수 리포트**
   - 위험 계수 ${riskScore}의 의미와 배경
   - ${currentYear}년 세운의 일주(日柱)에 대한 영향력
   - 충·형·파·해 에너지의 현실 발현 시나리오
   - 위기를 기회로 전환하는 운 관리 전략

6. **CHAPTER 06 | 10년 운대 예측 — 미래 위험 계수 전망**
   - ${currentYear}년~${currentYear+9}년 10년간 운의 흐름 개괄
   - 특히 주의해야 할 해와 그 에너지 성격
   - 호운(好運) 기간과 그 활용 전략
   - 장기 재정·커리어·인간관계 운 통합 로드맵

7. **CHAPTER 07 | 진로 로드맵 — 시빌라 시스템 권고 경로**
   - 단기(1~2년): 즉각 취해야 할 행동 및 환경 변화
   - 중기(3~5년): 커리어 전략 및 역량 집중 영역
   - 장기(6~10년): 인생 최고조(行運) 대비 포지셔닝
   - 도미네이터 모드 기반 맞춤 행동 계획

8. **CHAPTER 08 | 개운(開運) 처방전 — 운명 접속 코드**
   - 오행 에너지 조정을 위한 일상 실천법 (방위·색채·식이 처방)
   - 인연·파트너십 운용 전략 (재성·관성 활성화 방향)
   - 금전·자산 흐름 최적화 처방
   - 정신·심리 에너지 정화를 위한 루틴

## 최종 출력 형식

반드시 아래 JSON 형식으로 응답하세요. chapters 배열에 각 챕터의 title과 content를 넣으세요.
각 content의 총 길이는 반드시 2,000자 이상이어야 합니다.
절대로 JSON 외의 텍스트를 출력하지 마세요.

{
  "dominatorMode": "${riskScore >= 70 ? 'dd' : riskScore >= 40 ? 'le' : 'nle'}",
  "riskScores": [<10개 숫자 배열, ${currentYear}부터 ${currentYear+9}까지의 연도별 예상 위험 계수>],
  "chapters": [
    { "title": "CHAPTER 01 | ...", "content": "..." },
    ...8개 챕터
  ],
  "summary": "<전체 리포트 3줄 요약 텍스트>"
}`;
}

/* ── POST 핸들러 ── */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: '요청 데이터 파싱 실패' }, { status: 400 });
    }

    // [보안강화] Senior Security Expert: JWT 및 결제 강제 검증 단계
    const payload = verifyJwtFromRequest(request);
    const adminMode = await isAdminRequest(request);
    
    // 1. 인증 확인
    if (!payload && !adminMode) {
      return NextResponse.json({ message: '인증이 필요하거나 유효하지 않은 토큰입니다.' }, { status: 401 });
    }

    const userId = payload?.userId;
    
    // 2. 결제 검증 및 차감 (관리자 모드가 아닐 때만 수행)
    if (!adminMode) {
      const payment = await verifyAndConsumePoints(
        userId, 
        100, 
        'sibyl-report', 
        '시빌라 도미네이터 리포트 생성'
      );

      if (!payment.ok) {
        return NextResponse.json(
          { 
            message: payment.message, 
            requiredCoins: 100,
            code: payment.status === 402 ? 'INSUFFICIENT_COINS' : 'PAYMENT_ERROR'
          }, 
          { status: payment.status || 400 }
        );
      }
      
      console.log(`[Sibyl API] Payment verified for user ${userId}: ${payment.message}`);
    } else {
      console.log(`[Sibyl API] Admin bypass enabled`);
    }

    const prompt = buildPrompt(body);
    let rawText = null;
    let lastError = null;

    // 1. Vertex AI (서비스 계정 자격증명이 있을 때)
    if (hasVertexCreds()) {
      try {
        rawText = await callVertexGemini(prompt);
      } catch (e) {
        lastError = e;
        console.warn('[Sibyl API] Vertex failed, trying direct API keys:', e.message || e);
      }
    }

    // 2. Direct Gemini API key fallback
    if (!rawText) {
      const keys = pickGeminiKeys();
      if (!keys.length) {
        return NextResponse.json({ message: 'AI 서비스 키가 구성되지 않았습니다.' }, { status: 503 });
      }
      for (const key of keys) {
        try {
          rawText = await callGeminiDirect(key, prompt);
          if (rawText) break;
        } catch (e) {
          lastError = e;
          console.warn('[Sibyl API] Key rotation —', e.message || e);
        }
      }
    }

    if (!rawText) {
      const errMsg = lastError?.message || 'AI 생성 실패';
      console.error('[Sibyl API] All keys failed:', errMsg);
      return NextResponse.json({ message: 'AI 리포트 생성에 실패했습니다: ' + errMsg }, { status: 502 });
    }

    // Parse JSON from response
    let reportData = null;
    try {
      // Strip markdown fences if present
      const cleaned = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      reportData = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('[Sibyl API] JSON parse failed, returning raw text');
      // Fallback: wrap raw text in a single chapter
      reportData = {
        dominatorMode: (body.riskScore >= 70 ? 'dd' : body.riskScore >= 40 ? 'le' : 'nle'),
        riskScores: Array.from({ length: 10 }, (_, i) => Math.min(95, (body.riskScore || 30) + (i * 3 - 5))),
        chapters: [{ title: '도미네이터 리포트', content: rawText }],
        summary: '시빌라 시스템 리포트가 생성되었습니다.'
      };
    }

    return NextResponse.json(reportData, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8'
      }
    });

  } catch (error) {
    console.error('[Sibyl API] Unexpected error:', error);
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류') },
      { status: 500 }
    );
  }
}
