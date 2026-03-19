# saju-engine.js 모듈 분석 - 빠른 참조

## 📊 모듈 위치 맵

```
saju-engine.js (21,710 lines)
│
├─ Group A: KASI 음양력 (L1-800)
│  ├─ 함수: _kasiPad2, getActualSolarDate, parseKasiGanjiPair
│  ├─ 데이터: KASI_LOCAL_PATCH_*, KASI_GAN_MAP, KASI_JI_MAP
│  └─ 크기: 800 라인 | 난이도: 🟢 낮음
│
├─ Group B: 사주 핵심 (L858-5063)
│  ├─ 함수: analyzeJohu, calcPower, detectJong, evalDaewun, analyzeCompat
│  ├─ 데이터: GAN, JI, TS_DB, MING_GONG, HEALTH_DATA 등 60+개 객체
│  ├─ 크기: 4,200 라인 | 난이도: 🟡 중간
│  └─ ⭐ 모든 다른 그룹의 기초
│
├─ Group C: 천문학 (L4702-5063)
│  ├─ 함수: AstroEngine (내부: JD, deltaT, sunLon, moonLon, ...)
│  ├─ 데이터: 순수 수학/상수
│  ├─ 크기: 360 라인 | 난이도: 🟢 낮음
│  └─ ⭐ 완전 독립적, 안전하게 추출 가능
│
├─ Group D: 자미두수 (L1418-8100)
│  ├─ 함수: calcZiweiPalaces, renderZiwei, zwComputeStarStrength, ...
│  ├─ 데이터: ZW_*, ZHI_*, 궁위별 별 상태 표
│  ├─ 크기: 6,700 라인 | 난이도: 🔴 높음
│  └─ ⚠️ 렌더링과 계산 혼재, CSS 인라인
│
├─ Group E: 타로/숙요 (L16315-20974)
│  ├─ 함수: calcSukuyoData, renderSukuyo, startTarotReading, ...
│  ├─ 데이터: TAROT_DATA (900라인), 숙요 정보
│  ├─ 크기: 4,600 라인 | 난이도: 🟡 중간
│  └─ ⚠️ API 호출 포함, 큰 데이터베이스
│
└─ Group F: UI/렌더링 (L1730-21700)
   ├─ 함수: renderSummary, renderIlju, renderManse, renderZiwei 등 20+
   ├─ 데이터: 인라인 HTML/CSS 매우 많음
   ├─ 크기: 10,000+ 라인 | 난이도: 🔴 매우 높음
   └─ ⚠️ 계산과 렌더링 완전히 혼재, 전역 상태 의존
```

## 🎯 주요 라인 번호

| 항목 | 라인 | 설명 |
|------|------|------|
| GAN/JI 데이터 | 858-877 | 10 천간 + 12 지지 기초 |
| TS_DB (십성) | 883+ | 십성 database (비견-정인) |
| MING_GONG (궁) | 1097+ | 자미두수 12궁 설명 |
| globalState vars | 1232+ | GENDER, BIRTH_YEAR, G_POWER 등 |
| AstroEngine | 4702-5063 | 천문학 계산 (280 inner functions) |
| calcZiweiPalaces | 1422 | ⭐ 자미두수 계산 핵심 |
| renderZiwei | 7801 | 자미두수 렌더링 (1000+ 라인) |
| TAROT_DATA | 16315 | 타로 카드 DB (900 라인) |
| calcSukuyoData | 19029 | 숙요 계산 |
| renderSummary | 13096 | ⭐ 메인 요약 렌더링 |
| renderReportDashboard | 21523 | 최종 리포트 대시보드 |

## 📈 의존성 그래프

```
F (UI/렌더링)
├─→ D (자미두수) 
├─→ E (타로/숙요)
├─→ C (천문학)
├─→ B (사주 핵심) ⭐
│   ├─→ A (KASI)
│   └─→ Solar/Lunar lib
└─→ A (KASI)
```

## 🔑 핵심 함수 (추출 우선순위)

### 즉시 추출 가능 (난이도 낮음)
- ✅ Group A: getActualSolarDate, parseKasiGanjiPair, rememberKasiCalendarReference
- ✅ Group C: AstroEngine.calcAll, AstroEngine.deltaT

### 신중히 추출 (난이도 중간)
- ⚠️ Group B: analyzeJohu, calcPower, calcNatalElement (데이터 구조 매우 크지만 자체 완결)
- ⚠️ Group E: calcSukuyoData (API 의존성 있음)

### 리팩토링 필요 (난이도 높음)
- 🔴 Group D: calcZiweiPalaces (신뢰성 있음), renderZiwei (CSS 분리 필요)
- 🔴 Group F: renderSummary, renderIlju (DOM 강결합, 전역 상태 의존)

## 📦 주요 데이터 구조

| 이름 | 라인 | 크기 | 용도 |
|------|------|------|------|
| `GAN` | 858 | 10개 | 천간 기호 & 오행속성 |
| `JI` | ~867 | 12개 | 지지 기호 & 오행속성 |
| `TS_DB` | 883+ | 10개 | 십성 (비견~정인) 설명 |
| `MING_GONG` | 1097 | 12개 | 자미두수 12궁 |
| `TAROT_DATA` | 16315 | 78개 | 타로 카드 데이터베이스 |
| `ZW_CLASSICAL_STATE` | 7285+ | 14x12 | 별 상태 매트릭스 |

## ⚙️ 전역 상태 변수

```javascript
// 사용자/입력 정보
GENDER, USER_NAME, BIRTH_YEAR, DAY_GAN, JOHU_TYPE, JOHU_SCORE

// 계산 결과 캐시
G_POWER, G_JONG, G_JOHU, G_PILLARS, G_NATAL, G_BAZI

// 입력 데이터
window._ziweiBirth, window._astroBirth, window._currentZiweiData
```

## 🚀 모듈 추출 권장 순서

1. **Phase 1** (1-2일): A + C 추출 → TypeScript로 변환
2. **Phase 2** (3-4일): B 추출 → 테스트 작성
3. **Phase 3** (4-5일): E 추출 → API 서비스 추상화
4. **Phase 4** (8-12일): D 추출 → 렌더링/계산 분리, CSS 외부화
5. **Phase 5** (20-30일): F 리팩토링 → 컴포넌트 기반 UI

**총 예상 기간**: 6-8주 (점진적)

## ⚠️ 주의사항

1. **localStorage 캐싱**: Group A에서 자체 캐싱 관리 (KASI_LOCAL_PATCH_STORE)
2. **Solar/Lunar 의존**: A, B, D 그룹 모두 lunar-javascript 라이브러리 필요
3. **전역 상태**: F 그룹이 B 그룹의 계산 결과를 G_POWER 등으로 캐싱
4. **타로 카드 로드**: 16MB 데이터베이스, JSON 별도 파일로 마이그레이션 권장
5. **이벤트 핸들러**: 렌더링 함수 내부에 인라인으로 정의 (이벤트 위임 시스템 필요)

## 📋 체크리스트

- [ ] Group A (KASI) 추출 & 테스트 (~2시간)
- [ ] Group C (Astro) 추출 & 테스트 (~1시간)
- [ ] Group B (Saju) 추출 & TypeScript 변환 (~6시간)
- [ ] Group B API 정의 문서화 (~2시간)
- [ ] Group E (Tarot) 추출 & API 서비스화 (~6시간)
- [ ] Group D (Ziwei) 계산/렌더링 분리 (~12시간)
- [ ] Group D CSS 모듈 추출 (~4시간)
- [ ] Group F UI 컴포넌트화 (20+시간)
- [ ] 통합 테스트 & E2E (10+시간)

---

**작성일**: 2026-03-19  
**상세 내용**: SAJU_ENGINE_MODULE_ANALYSIS.md 참고
