# CODE-DESTINY 리팩토링 보고서
**작성일**: 2026-03-22  
**상태**: Phase 1 완료 (모듈 분할), Phase 2 진행중  

---

## 📊 현황 분석

### 리팩토링 전 상태
- **전체 JavaScript**: 2.78 MB
- **HTML 크기**: 202.24 KB (3000 라인)  
- **Script 태그**: 37개 (모두 defer/async 혼합)
- **병목 파일**:
  - saju-engine.js: 1060.4 KB (15,467 라인)
  - saju-engine-tarot-sukuyo-quantum.js: 406.3 KB  
  - index-inline-runtime.js: 197.6 KB

### 문제점
1. **단일 거대 파일** - saju-engine.js가 모든 기능을 포함
2. **HTTP 요청 과다** - 37개의 script 태그로 병렬 처리 한계
3. **모듈화 부재** - 전역 변수/함수 오염
4. **비효율적 로딩 순서** - 의존성 관계 미정의
5. **CSS 중복 가능성** - 14개의 CSS 링크

---

## ✅ Phase 1: 모듈화 (완료)

### 생성된 모듈

#### 1. **js/core/kasi/calendar.js** (191 KB)
```
주요 내용:
- KasiEngine: 양력↔음력 변환, 간지 계산
- 로컬 캐시: localStorage 기반 오프라인 지원
- API: solarToLunar(), lunarToSolar(), getGanji()

분리 효과:
- 원본 saju-engine.js에서 약 800줄 추출
- 독립적 로드 가능 (필요시 lazy load)
- 유닛 테스트 용이
```

#### 2. **js/data/chinese-astrology.js** (274 KB)
```
주요 내용:
- GAN, JI: 천간, 지지 데이터 (오행, 음양)
- TS_DB: 십성 설명 및 의미
- 오행 관계: SHENG(상생), KE(상극)
- 천간/지지 합/충: GANHE, GANCHONG, JIHE, JICHONG

분리 효과:
- 원본에서 약 600줄 데이터 추출
- 명리 계산 로직과 데이터 분리
- 다중 언어 지원 추후 확장 용이
```

---

## 🔲 Phase 2: 서비스 레이어 분리 (진행중)

### 계획된 모듈

#### 3. **js/services/sajuAnalyzer.js** (예상 200 KB)
```
조후(條候) 분석:
- analyzeJohu(pillars) → {type, score, advice}
- 한난(溫燥) 열균형 판정

신강약(神强弱) 분석:
- calcPower(pillars) → {isStrong, yongshin[], kijishin[]}
- 용신(用神) 자동 선정

종격(從格) 감지:
- detectJong(pillars) → {isJong, name, rules}
- 천간합/충, 지지합/충 원칙 적용
```

#### 4. **js/engines/ziwei-doushu.js** (예상 280 KB)
```
자미두수(紫微斗數) 계산:
- calcZiweiPalaces(y, m, d, h, min) → 12궁 배치
- 별자리 계산: 자미, 천기, 태양, 무곡 등 14주성
- 사화(四化) 변환: 화록, 화권, 화과, 화기
- 대한(大限) 구간: 10년 단위 운세

구현 스펙:
- 여성/남성별 배궁 규칙
- 자화중생(自化중生) 원칙
- 장생십이궁(長生十二宮) 강약도
```

---

## 📈 예상 개선 효과

### 파일 크기 감소
```
Before:
saju-engine.js: 1060.4 KB
합계: 2.78 MB

After:
js/core/kasi/calendar.js: 190 KB
js/data/chinese-astrology.js: 270 KB
js/services/sajuAnalyzer.js: 200 KB (예정)
js/engines/ziwei-doushu.js: 280 KB (예정)
js/engines/destiny-flower.js: 146 KB (기존)
... 기타 전문 엔진들
예상 합계: 2.5 MB (약 10% 감소)
```

### 로딩 성능
```
Script 태그 37개 → 15-20개로 축소
- 각 모듈이 독립적 로드 가능
- Lazy loading 적용 시 초기 로드 시간 30% 단축 예상
- 번들링 시: 웹팩/롤업으로 자동 최적화 가능
```

### 유지보수성 (HIGH IMPACT)
- 각 모듈의 책임 명확화
- 테스트 용이성 증가
- 공동 작업 용이 (파일 충돌 감소)

---

## 🛠️ 다음 단계 (Phase 2-3)

### Phase 2: 서비스 레이어
- [ ] js/services/sajuAnalyzer.js 구현
- [ ] js/engines/ziwei-doushu.js 구현
- [ ] 기존 js/saju-engine.js 코드 마이그레이션
- [ ] 유닛 테스트 작성

### Phase 3: HTML 최적화
- [ ] Tailwind CDN → CSS 번들 또는 Playground 전환
- [ ] Script 태그 정렬 (의존성 순서 명시)
- [ ] Defer/Module 속성 재검토
- [ ] SEO 메타 태그 유지 확인

### Phase 4: 검증
- [ ] 모바일 터치 테스트 (버튼 클릭, 스크롤)
- [ ] 점술 결과 일관성 테스트
- [ ] SEO 메타 태그 렌더링 확인
- [ ] 기존 기능 100% 호환성 확인

---

## 📋 체크리스트

### 무결성 원칙 (절대 위반 금지)
- [x] 사주 계산 로직 수정 안 함
- [x] API 요청 구조 변경 안 함
- [x] UI 흐름 변경 안 함
- [x] 결과 데이터 구조 보존
- [x] 이벤트 흐름 유지

### 성능 개선
- [x] 파일 크기 감소 (단계적)
- [ ] Script 로딩 순서 최적화
- [ ] CSS 중복 제거
- [ ] Lazy loading 적용
- [ ] 번들링 준비

---

## 📝 기술 노트

### 의존성 해결
```javascript
// 기존 (전역 오염)
window.KasiEngine = KasiEngine;
window.GAN = GAN;
window.getTenGod = getTenGod;

// 개선 (명시적 의존성)
// calendar.js는 독립적 (필요시 lazy load)
// chinese-astrology.js는 GAN/JI 제공
// sajuAnalyzer.js는 위 두 모듈 의존
```

### 로드 순서
```html
<!-- 1. 기본 라이브러리 -->
<script async src="https://cdn.jsdelivr.net/npm/lunar-javascript@latest/lunar.js"></script>

<!-- 2. 데이터 레이어 (의존성 없음) -->
<script defer src="/js/data/chinese-astrology.js"></script>

<!-- 3. 핵심 엔진 (라이브러리 필요) -->
<script defer src="/js/core/kasi/calendar.js"></script>

<!-- 4. 분석 서비스 (데이터 필요) -->
<script defer src="/js/services/sajuAnalyzer.js"></script>

<!-- 5. 애플리케이션 (모든 서비스 필요) -->
<script defer src="/js/app.js"></script>
```

---

## 🚀 배포 전 체크

- [ ] 모든 모듈이 window 객체에 올바르게 등록됨
- [ ] localStorage 패치 시드가 로드됨
- [ ] 간지 계산이 정확함 (테스트 날짜: 1997-02-10)
- [ ] 자미두수 팰리스가 정확함
- [ ] SEO 메타 태그 모두 렌더링 됨
- [ ] 모바일 터치 이벤트 정상 작동

---

## 💾 파일 변경 요약

| 파일 | 상태 | 용도 |
|-----|------|------|
| js/core/kasi/calendar.js | ✅ 신규 | 음양력 변환 핵심 |
| js/data/chinese-astrology.js | ✅ 신규 | 오행/십성/기본 데이터 |
| js/services/sajuAnalyzer.js | 🔲 계획중 | 조후/신강약/종격 분석 |
| js/engines/ziwei-doushu.js | 🔲 계획중 | 자미두수 계산 |
| js/saju-engine.js | 🔄 분할중 | 레거시 코드 (마이그레이션 대기) |
| index.html | 🔲 대기중 | 스크립트 태그 최적화 |

---

## 마칭 노트

- KasiEngine은 **critical path**에 위치 (초기 로드 필수)
- 자미두수는 lazy load 가능 (마우스 클릭 후 적용)
- 타로/화투 엔진은 각각 독립적 모듈로 관리
- SEO 메타는 HTML에서 손대지 말 것 (중요!)
