# 5개 PDF 생성 시스템 통합 개선 로드맵

## 목표
모든 프리미엄 PDF가 **챕터별 순차 생성** + **로컬 폴백** + **품질 검증** + **명확한 로깅**을 갖추도록 통합

## 기준: Astro-Western 패턴 (완성된 참조)

```javascript
// Astro 구조 (완성)
worker/lib/astro/
├── astroChapterConfig.js      // 메타데이터 + 검증 규칙
├── generateAstroChapter.js     // 단일 챕터 생성 (Gemini + 재시도)
├── astroFallback.js            // 로컬 폴백 템플릿 (13장)
├── generateAstroPdf.js         // 전체 PDF 오케스트레이션
├── test.astroGeneration.js     // 테스트 케이스
└── ASTRO_PDF_IMPLEMENTATION_GUIDE.md
```

## 5개 서비스별 구현 계획

### 1️⃣ Vedic (베다 점성술) - 12 chapters, 54,000 chars

**생성 파이프라인:**
```
worker/lib/vedic/
├── vedic-chapter-config.js           (NEW: 12장 메타데이터)
├── generate-vedic-chapter.js         (NEW: 단일 챕터 생성)
├── vedic-fallback.js                 (NEW: 12장 로컬 폴백)
├── generate-vedic-pdf.js             (NEW: 전체 PDF 오케스트레이터)
└── vedic-generation-test.js          (NEW: 테스트)
```

**타임아웃 가드:**
- 기존: 무제한 (타임아웃 위험 78-156초)
- 개선: 12초/챕터 × 12장 + 여유 = 180초 제한, 12초/요청

**파일 크기 목표:**
- `vedic-chapter-config.js`: ~200 lines
- `generate-vedic-chapter.js`: ~300 lines (Astro 패턴 복사)
- `vedic-fallback.js`: ~1500 lines (12장 × ~125 lines)
- `generate-vedic-pdf.js`: ~250 lines

---

### 2️⃣ Sukuyo (숙요점) - 12 chapters, 52,800 chars

**생성 파이프라인:**
```
worker/lib/sukuyo/
├── sukuyo-chapter-config.js          (NEW: 12장 메타 통합)
├── generate-sukuyo-chapter.js        (NEW: 단일 챕터)
├── sukuyo-fallback.js                (NEW: 12장 로컬 폴백)
├── generate-sukuyo-pdf.js            (NEW: 전체 PDF)
└── sukuyo-generation-test.js         (NEW: 테스트)
```

**특수 처리:**
- 기존: sukuyo-premium.js vs sukyo-pdf.js 스키마 불일치
- 개선: 통합된 설정 (개인 12장 + 커플 12장 분리)
- 로컬 폴백 시 Mode 구분 (natal vs compat)

---

### 3️⃣ Saju NewYear (신년운세) - 12 chapters, 48,000 chars

**생성 파이프라인:**
```
worker/lib/saju/new-year/
├── new-year-chapter-config.js        (NEW: 12장 메타)
├── generate-new-year-chapter.js      (NEW: 단일 챕터)
├── new-year-fallback.js              (NEW: 12장 로컬 폴백)
├── generate-new-year-pdf.js          (NEW: 전체 PDF)
└── new-year-generation-test.js       (NEW: 테스트)
```

**특수 처리:**
- 월별(1~12) 운세 생성
- 각 월 4000자 목표
- 전년도 강점 + 올해 과제 연결

---

### 4️⃣ LoveSecret (연애 비책) - 13 chapters, 52,000 chars

**생성 파이프라인:**
```
worker/lib/saju/love-secret/
├── love-secret-chapter-config.js     (NEW: 13장 메타)
├── generate-love-secret-chapter.js   (NEW: 단일 챕터)
├── love-secret-fallback.js           (NEW: 13장 로컬 폴백)
├── generate-love-secret-pdf.js       (NEW: 전체 PDF)
└── love-secret-generation-test.js    (NEW: 테스트)
```

**특수 처리:**
- 모드: 개인/커플/보조
- 각 모드별 13장 구조 동일
- 운명도/감정도/행운지 활용

---

### 5️⃣ LifeBook (사주 인생의 책) - 13 chapters, 52,000 chars

**개선 사항 (기존 generateLifeBookPdf.js 개선):**
```
worker/lib/saju/life-book/
├── generateLifeBookPdf.js            (MODIFY: 타임아웃 가드 추가)
├── life-book-fallback.js             (NEW: 13장 로컬 폴백)
└── test-life-book-generation.js      (NEW: 테스트 강화)
```

**현재 문제:**
- 과도한 검증으로 인한 재시도 루프 (타임아웃 초과)
- 해결: 검증 기준 완화 + 시간 제한 도입

---

## 통합 구현 순서

### Phase 1: 기초 구조 (2h)
- [ ] 각 서비스별 디렉토리 생성
- [ ] 메타데이터 파일 작성 (config)
- [ ] 로컬 폴백 템플릿 작성

### Phase 2: 오케스트레이터 구현 (3h)
- [ ] 단일 챕터 생성 함수 (Astro 패턴 복사)
- [ ] 전체 PDF 오케스트레이터
- [ ] 타임아웃 가드 추가

### Phase 3: 통합 & 라우팅 (1h)
- [ ] worker/routes/premium.js 수정
- [ ] 각 라우트에 새 오케스트레이터 연결
- [ ] 기존 로직과 호환성 유지

### Phase 4: 테스트 & 배포 (2h)
- [ ] 각 서비스 개별 테스트
- [ ] 통합 테스트 (5개 동시)
- [ ] 배포 전 검증

---

## 파일 생성/수정 목록

**신규 생성 (27개 파일)**

Vedic (5):
```
worker/lib/vedic-chapter-config.js
worker/lib/generate-vedic-chapter.js
worker/lib/vedic-fallback.js
worker/lib/generate-vedic-pdf.js
worker/lib/vedic-generation-test.js
```

Sukuyo (5):
```
worker/lib/sukuyo-chapter-config.js
worker/lib/generate-sukuyo-chapter.js
worker/lib/sukuyo-fallback.js
worker/lib/generate-sukuyo-pdf.js
worker/lib/sukuyo-generation-test.js
```

NewYear (5):
```
worker/lib/saju/new-year-chapter-config.js
worker/lib/saju/generate-new-year-chapter.js
worker/lib/saju/new-year-fallback.js
worker/lib/saju/generate-new-year-pdf.js
worker/lib/saju/new-year-generation-test.js
```

LoveSecret (5):
```
worker/lib/saju/love-secret-chapter-config.js
worker/lib/saju/generate-love-secret-chapter.js
worker/lib/saju/love-secret-fallback.js
worker/lib/saju/generate-love-secret-pdf.js
worker/lib/saju/love-secret-generation-test.js
```

LifeBook (3):
```
worker/lib/saju/life-book/life-book-fallback.js
worker/lib/saju/life-book/test-life-book-generation.js
(generateLifeBookPdf.js 개선)
```

**수정 대상 (1개 파일)**
```
worker/routes/premium.js  // 5개 라우트에 새 오케스트레이터 연결
```

---

## 품질 검증 기준 (모든 서비스 통일)

| 검사 항목 | 기준 |
|---------|------|
| 최소 글자수 | 각 챕터별 설정값 (2000-4800) |
| 금지 문구 | 30+ 문구 (AI 생성 오류 감지) |
| 반복 문장 | 3회 반복 감지 |
| 태그 오염 | `<`, `>`, `[`, `]` 미허용 |
| 파일명/reportId 노출 | 금지 |

---

## 배포 체크리스트

- [ ] 모든 신규 파일 생성 완료
- [ ] 모든 테스트 파일 실행 (성공)
- [ ] premium.js 라우트 통합
- [ ] npm run build (성공)
- [ ] npm run typecheck (성공)
- [ ] git commit (메시지: "feat(pdf): unified chapter-based generation for 5 services")
- [ ] git push main

---

**시작 시간**: 2026-05-26
**예상 소요 시간**: 8시간
**우선순위**: P0 (모든 프리미엄 PDF 생성 기능 복구)
