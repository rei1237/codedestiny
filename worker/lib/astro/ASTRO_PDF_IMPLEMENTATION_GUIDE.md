# 점성술 프리미엔 PDF 리팩토링 - 구현 가이드

## 개요

서양 점성술 프리미엔 PDF 생성 시스템을 `ZiweiBook`(자미두수) 패턴을 따라 완전히 리팩토링했습니다.

**핵심 개선:**
- 차트 계산 실패 → 로컬 폴백으로 항상 성공
- Gemini API 장애 → 로컬 템플릿 자동 전환
- 텍스트 품질 검증 → 실패 시 재생성 또는 폴백
- 최종 PDF → 항상 렌더링 가능 (경고 포함)

---

## 파일 구조

### 프론트엔드 (Next.js)
```
app/
├── api/premium/
│   ├── astro-western/
│   │   └── route.ts ✅ 개선됨 (로컬 폴백 추가)
│   ├── _astroCommon.ts ✅ 전면 강화
│   └── ...
├── components/astrology-pdf/
│   └── AstroPremiumPdfBuilder.tsx
└── ...
```

### 백엔드 (Cloudflare Workers)
```
worker/
├── lib/astro/ ✅ 신규 생성
│   ├── astroChapterConfig.js - 13개 챕터 메타데이터
│   ├── generateAstroChapter.js - Gemini 호출 + 재시도/폴백
│   ├── astroFallback.js - 로컬 폴백 텍스트 (13개 챕터)
│   ├── generateAstroPdf.js - 전체 PDF 생성 파이프라인
│   └── test.astroGeneration.js - 테스트
├── routes/
│   └── premium.js - 워커 라우트 (통합 필요)
└── ...
```

---

## 사용 흐름

### 1️⃣ 차트 계산 (프론트엔드)
```typescript
// app/api/premium/astro-western/route.ts
POST /api/premium/astro-western
{
  year: 1990,
  month: 3,
  day: 15,
  hour: 14,
  minute: 30,
  timezone: 9,
  lat: 37.5665,
  lon: 126.978
}

// Response
{
  ok: true,
  planets: {...},
  ascendant: {...},
  aspects: [...],
  calculationSource: "local-calculation" | "swiss-endpoint",
  warnings: [...]
}
```

**특징:**
- 입력값 자동 검증 및 정규화
- Swiss endpoint 실패 시 로컬 계산 자동 전환
- 경고 메시지 누적 (진행 상황 추적용)

### 2️⃣ PDF 생성 (워커)
```javascript
// worker/lib/astro/generateAstroPdf.js
const result = await generateAstroPdf({
  chart: { planets, ascendant, midheaven, aspects, northNode, southNode },
  reportId: 'astro-001',
  body: {},
  onProgress: (progress) => console.log(progress)
});

// Response
{
  ok: true,
  mode: "astro-western",
  reportId: "astro-001",
  pdfData: {
    chapters: [
      {
        chapter: 1,
        title: "페르소나와 존재의 핵",
        text: "... 생성된 텍스트 ...",
        source: "gemini" | "fallback" | "fallback-repair"
      },
      ...
    ],
    warnings: [...]
  }
}
```

**진행 상황 (onProgress):**
```
[AstroBook] PDF_GENERATION_START
[AstroBook] CHAPTER_1_GEMINI_SUCCESS
[AstroBook] CHAPTER_2_GEMINI_SUCCESS
...
[AstroBook] QUALITY_VALIDATION_SUCCESS
[AstroBook] PDF_GENERATION_SUCCESS
```

### 3️⃣ 프로그레시브 로딩 (Optional)
```javascript
// 단일 챕터 생성 (프로그레시브 로딩용)
const result = await generateAstroChapterOnly({
  chart: {...},
  chapterNum: 1,
  reportId: 'astro-001'
});

// Response
{
  ok: true,
  chapter: 1,
  text: "... 생성된 텍스트 ...",
  source: "gemini" | "fallback",
  quality: { ok: true, length: 3500, errors: [] }
}
```

---

## 로컬 폴백 (13개 챕터)

### 포함된 폴백 템플릿
1. **Ch1: 페르소나와 존재의 핵** - 상승궁, 태양, 달 삼중축 해석
2. **Ch2: 감정의 뿌리** - 달의 감정적 안전기지
3. **Ch3: 인지 체계와 정보의 연금술** - 수성의 의사소통 방식
4. **Ch4: 욕망의 미학과 가치 자산** - 금성의 매력과 가치관
5. **Ch5: 추진력과 갈등 처리** - 화성의 행동력
6. **Ch6: 확장과 행운의 문** - 목성의 확장 에너지
7. **Ch7: 한계와 성취의 구조** - 토성의 제약과 성숙
8. **Ch8: 관계와 계약의 지도** - 7하우스와 에스펙트
9. **Ch9: 상처와 회복 코드** - 카이론과 12하우스
10. **Ch10: 노드와 영혼의 목적** - 노드축
11. **Ch11: 트랜짓 운세 전략** - 현재 행성 흐름
12. **Ch12: 마스터 플랜** - 월별 12개월 로드맵
13. **Ch13: 90일 현실 전환 플랜** - 실행 표

모든 폴백 텍스트는 **2500자 이상** 포함하여 최소 품질 보장

---

## 검증 & 품질 관리

### 텍스트 검증 단계
```javascript
validateAstroText(text)
// Returns
{
  ok: boolean,        // 에러 없음?
  length: number,     // 글자 수
  errors: string[],   // 금지 문구, 너무 짧음, 반복 등
  warnings: string[]  // 경고
}
```

### 챕터별 검증 단계
```javascript
validateAstroChapterQuality(chapterNum, text)
// 검사 항목:
// - 금지 문구 (fallback, API 실패, reportId 등)
// - 최소 길이 (챕터별 2000~3500자)
// - 반복적인 문장 감지
// - 빈 텍스트 확인
```

### 재생성 흐름
```
Gemini 생성
  ↓ (실패)
로컬 폴백
  ↓ (품질 검증 실패)
재생성 시도
  ↓ (여전히 실패)
최종 폴백 + 경고 추가
```

---

## 진행 상황 로깅

모든 단계가 `[AstroBook]` 프리픽스로 로깅됩니다:

```
[AstroBook] API_START { userId }
[AstroBook] INPUT_NORMALIZED { normalized }
[AstroBook] FETCHING_SWISS_CHART
[AstroBook] SWISS_CHART_FAILED_USE_LOCAL { warnings }
[AstroBook] LOCAL_CHART_CALCULATION_SUCCESS
[AstroBook] CHART_READY { source, warnings }

[AstroBook] PDF_GENERATION_START { reportId }
[AstroBook] CHAPTER_1_GEMINI_SUCCESS
[AstroBook] CHAPTER_2_LOCAL_FALLBACK_USED
[AstroBook] QUALITY_VALIDATION_SUCCESS
[AstroBook] PDF_GENERATION_SUCCESS { totalLength, warnings }
```

**모니터링:**
- `GEMINI_SUCCESS` - 정상 생성
- `LOCAL_FALLBACK_USED` - API 실패, 로컬 사용
- `QUALITY_FAILED` - 품질 검증 실패 (재생성 시도)
- `REPAIRED_WITH_FALLBACK` - 재생성 후 폴백으로 최종 처리

---

## 워커 라우트 통합 예시

`worker/routes/premium.js`에 추가하기:

```javascript
import { generateAstroPdf } from "../lib/astro/generateAstroPdf.js";

// 프리미엠 라우트에서
if (config.alias === "astrology") {
  const result = await generateAstroPdf({
    chart: parsedChart,
    reportId,
    body: normalizedInput,
    onProgress: (progress) => {
      console.log(`[AstroBook] ${progress.code}: ${progress.message}`);
    }
  });

  if (result.ok) {
    // PDF 생성 후 다운로드 URL 반환
    return buildDownloadResponse(result.pdfData, reportId);
  }
}
```

---

## 테스트

### 단위 테스트
```bash
node worker/lib/astro/test.astroGeneration.js
```

**테스트 항목:**
- 단일 챕터 생성 (Gemini + 폴백)
- 전체 PDF 생성 (13개 챕터 순차)
- 품질 검증 및 재생성
- 진행 상황 로깅

---

## 환경 변수 요구사항

```env
# Gemini API Keys (최소 1개 필요)
GEMINIF_API_KEY1=your-api-key-1
GEMINIF_API_KEY2=your-api-key-2
GEMINIF_API_KEY3=your-api-key-3
GEMINIF_API_KEY4=your-api-key-4

# Vertex AI (Optional, for fallback)
VERTEX_API_TOKEN=your-vertex-token
```

---

## 트러블슈팅

### 422 에러 (차트 계산 실패)
→ 이제는 발생하지 않음! 로컬 폴백으로 자동 해결됨

### PDF가 너무 짧음
→ 로컬 폴백 사용 확인. 각 챕터 최소 2000자 보장

### 반복적인 텍스트
→ Gemini 프롬프트 재조정 또는 로컬 폴백 템플릿 개선

### 진행이 너무 느림
→ 13개 챕터 순차 생성이므로 ~60초 예상. 프로그레시브 로딩 검토

---

## 자미두수(ZiweiBook) 패턴 준용

이 구현은 자미두수 생성 시스템을 따라:
- ✅ 입력값 검증 + 정규화
- ✅ 원격 API 호출 + 재시도
- ✅ 로컬 폴백 메커니즘
- ✅ 텍스트 품질 검증
- ✅ 실패 시 자동 재생성
- ✅ 명확한 단계별 로깅
- ✅ 최종 PDF 항상 생성 가능

---

## 참고 파일

- `app/api/premium/_astroCommon.ts` - 공용 함수 & 검증
- `app/api/premium/astro-western/route.ts` - 차트 API
- `worker/lib/astro/generateAstroPdf.js` - 메인 PDF 생성
- `worker/lib/astro/astroFallback.js` - 로컬 텍스트 (모든 챕터)
- `/memories/repo/auth-social-oauth-complete-retry-hardening.md` - 참고 사례
