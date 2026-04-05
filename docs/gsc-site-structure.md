# Google Search Console — Site Structure & Crawl Request Guide
## Google Search Console — 사이트 구조 설명 및 크롤링 요청 가이드

---

## A. Site Overview (영문 / English)

**Site Name**: Code Destiny (꿀꿀 만세력)  
**Primary URL**: https://code-destiny.com/  
**Purpose**: Free AI-powered fortune telling service (Saju, Tarot, Astrology, Compatibility, I Ching, Ziwei Doushu, Sukuyo) in 9 languages.  
**Content Type**: Entertainment / Lifestyle — All readings are for entertainment purposes only and do not constitute professional advice.  
**Technology**: Next.js 14 App Router + Cloudflare Pages (static generation)  
**Languages**: Korean (ko), English (en), Japanese (ja), Chinese Simplified (zh-CN), Chinese Traditional (zh-TW), Hindi (hi), Spanish (es), French (fr), German (de)

---

## B. 사이트 개요 (한국어)

**서비스명**: 꿀꿀 만세력 (Code Destiny)  
**주소**: https://code-destiny.com/  
**목적**: 무료 AI 운세 서비스 — 사주팔자, 타로카드, 점성술, 궁합, 주역, 자미두수, 숙요점 (엔터테인먼트 목적)  
**기술 스택**: Next.js 14 App Router + Cloudflare Pages (정적 생성)  
**지원 언어**: 한국어, 영어, 일본어, 중국어(간/번체), 힌디어, 스페인어, 프랑스어, 독일어

---

## C. URL Structure

### 1. Main Service (클라이언트 사이드 렌더링)
| URL | Description |
|-----|-------------|
| `https://code-destiny.com/` | Main page — All fortune services hub |
| `https://code-destiny.com/en-us` | English locale root |
| `https://code-destiny.com/ja-jp` | Japanese locale root |
| `https://code-destiny.com/zh-cn` | Chinese (Simplified) locale root |
| `https://code-destiny.com/hi-in` | Hindi locale root |
| `https://code-destiny.com/es-es` | Spanish locale root |
| `https://code-destiny.com/fr-fr` | French locale root |
| `https://code-destiny.com/de-de` | German locale root |
| `https://code-destiny.com/nl-nl` | Dutch locale root |
| `https://code-destiny.com/ms-my` | Malay locale root |

### 2. Blog / Insights (서버 사이드 정적 생성 — SSG)
| URL | Description |
|-----|-------------|
| `https://code-destiny.com/insights` | Insights hub index page |
| `https://code-destiny.com/insights/saju-pallja-basic-principles-complete-guide` | 사주팔자 기초 원리 완전 정리 |
| `https://code-destiny.com/insights/five-elements-ohang-complete-guide` | 오행(五行) 완전 정리 |
| `https://code-destiny.com/insights/tarot-major-arcana-22-complete-meanings` | 타로 대아르카나 22장 해설 |
| `https://code-destiny.com/insights/ziwei-doushu-complete-beginner-guide` | 자미두수 입문 가이드 |
| `https://code-destiny.com/insights/cheongan-jiji-complete-explanation` | 천간 지지 완벽 해설 |
| `https://code-destiny.com/insights/singang-sinyak-judgment-complete-guide` | 신강·신약 판단법 |
| `https://code-destiny.com/insights/yongshin-finding-method-practical-guide` | 용신 찾는 방법 실전 |
| `https://code-destiny.com/insights/goonghap-compatibility-basics-complete` | 궁합 보는 법 기초 |
| `https://code-destiny.com/insights/iljoo-personality-complete-guide-60-pillars` | 일주별 성격 총정리 60 일주 |
| `https://code-destiny.com/insights/daewoon-sewoon-reading-complete-guide` | 대운과 세운 읽는 법 |
| `https://code-destiny.com/insights/saju-four-pillars-basics` | 사주팔자 기초 (기존) |
| `https://code-destiny.com/insights/tarot-card-meanings-guide` | 타로카드 의미 (기존) |
| `https://code-destiny.com/insights/compatibility-guide` | 궁합 가이드 (기존) |

### 3. Free Sample Pages (정적 HTML — 코인 불요, 공개 접근)
| URL | Description |
|-----|-------------|
| `https://code-destiny.com/sample/saju-result.html` | 무료 사주 결과 샘플 (1990년 5월생 남성 예시) |
| `https://code-destiny.com/sample/tarot-result.html` | 무료 타로 결과 샘플 (3카드 스프레드) |
| `https://code-destiny.com/sample/today-fortune.html` | 오늘의 운세 샘플 (일간별 완전 가이드) |

### 4. Legal & Support
| URL | Description |
|-----|-------------|
| `https://code-destiny.com/privacy` | 개인정보처리방침 / Privacy Policy |
| `https://code-destiny.com/terms` | 이용약관 / Terms of Service |

---

## D. Crawl Priority & Indexing Instructions

### 최우선 크롤링 요청 URL (Priority 1 — Immediate)

아래 URL들은 신규 또는 최근 수정된 콘텐츠이므로 즉시 URL 검사 → 색인 요청을 진행해 주세요.

```
https://code-destiny.com/insights/saju-pallja-basic-principles-complete-guide
https://code-destiny.com/insights/five-elements-ohang-complete-guide
https://code-destiny.com/insights/tarot-major-arcana-22-complete-meanings
https://code-destiny.com/insights/ziwei-doushu-complete-beginner-guide
https://code-destiny.com/insights/cheongan-jiji-complete-explanation
https://code-destiny.com/insights/singang-sinyak-judgment-complete-guide
https://code-destiny.com/insights/yongshin-finding-method-practical-guide
https://code-destiny.com/insights/goonghap-compatibility-basics-complete
https://code-destiny.com/insights/iljoo-personality-complete-guide-60-pillars
https://code-destiny.com/insights/daewoon-sewoon-reading-complete-guide
https://code-destiny.com/sample/saju-result.html
https://code-destiny.com/sample/tarot-result.html
https://code-destiny.com/sample/today-fortune.html
```

### 우선순위 2 (Priority 2 — Sitemap Re-submit)

사이트맵을 다시 제출해 전체 URL 목록을 갱신하세요.

```
Sitemap URL: https://code-destiny.com/sitemap.xml
```

GSC > 색인 생성 > 사이트맵 > 새 사이트맵 추가 또는 재제출

---

## E. Content Description (for AdSense Review)

아래 설명은 Google AdSense 콘텐츠 검토 시 제출용입니다.

### 사이트 성격
Code Destiny(꿀꿀 만세력)는 **엔터테인먼트 및 자기계발 목적**의 무료 AI 운세 서비스입니다.  
모든 콘텐츠는 심리학적 관점의 자기탐구와 동양 철학 교육을 목적으로 하며, 전문적인 의료·법률·금융 조언을 제공하지 않습니다.  
모든 페이지 하단에는 "오락 목적 면책 조항"이 명시되어 있습니다.

### 주요 콘텐츠 카테고리
1. **사주팔자 (Four Pillars of Destiny)** — 생년월일시 기반 동양 철학 분석 (교육 목적)
2. **타로카드 리딩** — 78장 유니버설 웨이트 덱 기반 심리 탐구
3. **점성술** — 베딕/서양 점성술 기반 행성 배치 분석
4. **자미두수** — 당나라 발원 동양 점성술 (14주성 14개 보성)
5. **숙요점** — 불교 밀교 27수 달 별자리 기반 성격·카르마 분석
6. **주역·거북점** — 64괘 I Ching 오라클
7. **이집트 신탁** — 케멧(Kemet) 고대 이집트 오라클
8. **궁합 분석** — 사주/MBTI/숙요 기반 상성 분석
9. **AI 관상** — 얼굴형 및 동물 유형 분석
10. **인사이트 블로그** — 동양 철학·운세 지식 교육 콘텐츠

### 무료 샘플 페이지 (코인 페이월 없음)
- `/sample/saju-result.html` — 사주 결과 예시 (전체 공개)
- `/sample/tarot-result.html` — 타로 리딩 예시 (전체 공개)
- `/sample/today-fortune.html` — 오늘의 운세 예시 (전체 공개)

### 면책 조항 위치
- 모든 페이지 상단 배너 (`DisclaimerBanner` 컴포넌트)
- 모든 페이지 하단 (`FooterLegal` 컴포넌트)
- 각 샘플 페이지 내 별도 면책 섹션

---

## F. GSC 색인 요청 절차 (Step-by-Step)

### 1단계: URL 검사 도구로 개별 URL 색인 요청
1. GSC 접속 → 좌측 메뉴 "URL 검사"
2. 검색창에 위 Priority 1 URL 13개를 **하나씩** 입력
3. "색인 생성 요청" 버튼 클릭
4. 완료 시 "요청을 충족했습니다" 메시지 확인

### 2단계: 사이트맵 재제출
1. GSC 접속 → 좌측 메뉴 "색인 생성" → "사이트맵"
2. 사이트맵 URL 입력: `https://code-destiny.com/sitemap.xml`
3. "제출" 클릭
4. "성공" 상태 확인 (수 시간~수 일 소요)

### 3단계: 크롤링 통계 모니터링
- GSC → 설정 → 크롤링 통계
- 신규 URL에 대한 크롤링 기록이 3~7일 내 나타나는지 확인
- 만약 "크롤링이 너무 많음" 경고 시 `robots.txt` 확인

### 4단계: AdsBot 크롤링 허용 확인
- `robots.txt`에 `User-agent: AdsBot-Google` 항목이 있는지 확인
- `Allow: /insights/`, `Allow: /sample/` 가 명시되어 있어야 함

---

## G. Technical SEO Checklist

| 항목 | 상태 | 비고 |
|------|------|------|
| `sitemap.xml` 제출 | ✅ 완료 | 신규 13개 URL 추가됨 |
| `robots.txt` 설정 | ✅ 완료 | AdsBot-Google Allow 추가 |
| Canonical 태그 | ✅ 완료 | 모든 페이지 동적 생성 |
| hreflang 태그 | ✅ 완료 | 10개 언어 |
| OG / Twitter Card | ✅ 완료 | 모든 인사이트 페이지 포함 |
| JSON-LD 구조화 데이터 | ✅ 완료 | WebApplication, FAQPage, Organization, WebSite, ItemList |
| 블로그 기사 정적 생성 | ✅ 완료 | 10개 신규 + 기존 16개 = 26개 |
| 무료 샘플 페이지 | ✅ 완료 | 3개 (사주/타로/오늘운세) |
| 면책 조항 배너 | ✅ 완료 | 모든 페이지 상단 + 하단 |
| Core Web Vitals | ⬜ 모니터링 필요 | GSC → 경험 → 핵심 웹 성능 지표 |
| 모바일 사용성 | ⬜ 확인 필요 | GSC → 경험 → 모바일 사용성 |

---

## H. Contact & Publisher Info

**Publisher**: Code Destiny  
**URL**: https://code-destiny.com/  
**Contact**: 서비스 내 피드백 채널 사용  
**Content Policy**: 오락 목적 콘텐츠, 개인정보 미수집 (생년월일은 서버에 저장되지 않음)  
**Last Updated**: 2026-04-05
