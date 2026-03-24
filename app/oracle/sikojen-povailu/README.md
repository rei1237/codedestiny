# 🌸 Sikojen Povailu - 핀란드 주석점 앱 구현 완료

## 📋 프로젝트 구조

### Next.js 버전
```
app/oracle/sikojen-povailu/
├── page.tsx                    # 메인 페이지 (Phase 라우터)
├── SikojenpovailuContext.tsx   # 상태 관리 Context
├── data/
│   └── shapes.ts              # 형태 데이터베이스 (12개 형태)
└── components/
    ├── PhaseWelcoming.tsx      # Phase 1: 환영
    ├── PhaseRitualPrep.tsx      # Phase 2: 카테고리 선택
    ├── PhaseCasting.tsx        # Phase 3: 주석 투하
    ├── PhaseReveal.tsx         # Phase 4: 형태 해석
    ├── PhaseSharing.tsx        # Phase 5: 결과 공유
    ├── ShadowReading.tsx       # 숨겨진 기능: 그림자 읽기
    └── phases.css              # 메인 스타일 (2800+ 라인)
```

### 정적 HTML 버전 (Cloudflare Pages)
```
public/fortune/sikojen-povailu/
├── index.html                  # 완전 독립형 HTML/JS
└── images/
    ├── yeon.webp              # 꽃돼지 연이 캐릭터
    └── piggyfortune.webp       # 운세 카드 이미지
```

---

## 🎮 게임 페이즈 흐름

### Phase 1: 환영 (The Welcoming)
- 아늑한 핀란드 오두막 배경
- 벽난로 불 애니메이션
- 눈 내리는 창, 오로라 효과
- "시작하기" 버튼으로 다음 단계 진행

### Phase 2: 의식 준비 (The Ritual Prep)
- 3개 카테고리 선택: 💰 금전운, ❤️ 연애운, ✨ 행운
- 연이의 반응: "좋은 예감이 들어!"
- 카드 선택 애니메이션

### Phase 3: 주석 투하 (The Casting)
- 냄비에서 주석이 녹는 효과
- 물 그릇 클릭으로 주석 투하
- 증기 입자 애니메이션
- "치직-" 효과음 (UI 라인만, 실제 음성은 선택적)
- 로딩 스피너

### Phase 4: 형태 해석 (The Reveal)
- 12가지 형태 무작위 생성
  - 보트, 심장, 동전주머니, 열쇠, 태양, 꽃, 나침반, 나무, 별, 왕관, 다리, 깃털, 여우, 닻
- 한국어 + 핀란드어 이름
- 형태별 의미 풀이
- 연이의 조언
- 카드 디자인 (아기자기한 파스텔 톤)

### Phase 5: 결과 공유 (The Sharing)
- 결과 카드 미리보기
- 📤 친구에게 공유 (Web Share API / 클립보드)
- 💾 카드 저장
- 🔄 다시 시작

### 숨겨진 기능: 그림자 읽기 (Shadow Reading)
- Phase 4에서 카드를 길게 터치하면 발동
- 어두운 오두막 배경
- 형태의 그림자가 벽에 비춤
- **숨겨진 반전 운세** 표시
  - 예: 보트의 그림자 → 거울이 되어 내면 여행 알림
  - 심장의 그림자 → 골짜기가 되어 외로움과 배움 말함

---

## 🎨 UI/UX 특징

### 디자인 언어
- **폰트**: Google Fonts Jua (둥글둥글한 한글, 핀란드 분위기)
- **색상 팔레트**:
  - 주황/노란색: 난로 불 (#FF6B35)
  - 크림 베이지: 배경 (#FFF8E7)
  - 하늘색: 얼음물 (#A8D8EA)
  - 온화한 앰버: 따뜻한 톤 (#D4A574)
  - 분홍색: 연이 피부톤 (#F4C2C2)

### 애니메이션
- 😊 연이 춤추기 (피그 댄스)
- 🔥 벽난로 깜빡임
- ❄️ 눈 내리기 (Parallax 효과)
- 🌌 오로라 파동
- 💨 증기 입자 상승
- ✨ 스파클 효과
- 📇 카드 회전 애니메이션

### 반응형 디자인
- 모바일 (480px): 컴팩트 레이아웃
- 태블릿 (768px): 중간 크기
- 데스크톱 (1200px+): 풀 스크린

---

## 📊 형태 데이터베이스 (12개 형태)

각 형태는 다음을 포함:
- 한국어 이름 / 핀란드어 이름 / 영문 이름
- 이모지 아이콘
- 의미 (한글/핀란드어/영문)
- 조언 (한글/핀란드어)
- 숨겨진 그림자 의미 (모두 3개 언어)
- 카테고리 분류 (travel, wealth, love, health, secret, luck, adventure)
- 카드 배경색

---

## 🔄 상태 관리 (Context API)

```typescript
interface SikojenpovailuContextType {
  // Phase 추적
  currentPhase: 'welcome' | 'ritual-prep' | 'casting' | 'reveal' | 'sharing' | 'shadow'
  
  // 선택 데이터
  selectedCategory: '금전운' | '연애운' | '행운' | null
  selectedShape: Shape | null
  
  // 게임 상태
  isRitualing: boolean
  isCasting: boolean
  shadowShapeVisible: boolean
  
  // 액션 메서드
  selectCategory()
  generateShape()
  setPhase()
  setIsRitualing()
  setIsCasting()
  setShadowShapeVisible()
  resetGame()
}
```

---

## 📁 파일 크기

| 파일 | 크기 | 용도 |
|------|------|------|
| phases.css | 28 KB | 모든 Phase 스타일 |
| shapes.ts | 14 KB | 형태 데이터베이스 |
| page.tsx | 1.7 KB | 페이지 라우터 |
| Context | 3 KB | 상태 관리 |
| public/index.html | 18 KB | 정적 독립형 버전 |
| yeon.webp | 9 KB | 캐릭터 이미지 |
| piggyfortune.webp | 217 KB | 운세 카드 이미지 |

---

## 🚀 배포 경로

### Next.js 버전 (추천)
```
https://code-destiny.com/oracle/sikojen-povailu
```

### 정적 버전 (Cloudflare Pages)
```
https://code-destiny.com/fortune/sikojen-povailu
```

---

## 🧪 테스트 체크리스트

- [ ] **로컬 개발**: `npm run dev` → http://localhost:3000/oracle/sikojen-povailu
- [ ] **정적 버전**: http://localhost:3000/fortune/sikojen-povailu/index.html
- [ ] **이미지 로드 확인**: yeon.webp, piggyfortune.webp 표시
- [ ] **Phase 전환**: 모든 5개 Phase 순서대로 성공
- [ ] **형태 무작위 생성**: 다양한 형태 생성 확인
- [ ] **그림자 읽기**: Phase 4에서 카드 터치 시 Shadow Phase로 진행
- [ ] **결과 공유**: 포맷 확인 및 클립보드 복사
- [ ] **반응형**: 모바일/태블릿/데스크톱 모두 테스트
- [ ] **폰트**: Jua 폰트 올바르게 로드
- [ ] **애니메이션**: 부드럽게 작동

---

## 📝 사용자 설명

### Phase 1부터 5까지의 여정
1. **"Moi! (안녕!)"** - 연이가 환영하며 배경은 따뜻한 오두막
2. **주머니 선택** - 당신의 마음이 가는 카테고리를 고르세요
3. **주석 투하** - 물 그릇을 클릭해서 마법을 시작하세요
4. **형태 탄생** - 주석이 특별한 형태로 굳어집니다
5. **의미 발견** - 연이가 형태의 의미를 풀이해줍니다
6. **(선택) 그림자 읽기** - 형태의 그림자 속 숨겨진 진실

---

## 🔒 보안 & 성능

- **CSR (Client-Side Rendering)**: 모든 상호작용은 클라이언트에서 처리
- **이미지 최적화**: WebP 형식 사용 (자동 압축)
- **캐싱 친화적**: CSS는 분리, 정적 자산은 public 폴더에
- **완전 오프라인 준비**: Service Worker 호환 구조

---

## 🎯 다음 단계 (선택사항)

1. **효과음 추가** (선택적)
   - 주석 녹는 소리: `/public/fortune/sikojen-povailu/sounds/sizzle.mp3`
   - 형태 생성음: `/public/fortune/sikojen-povailu/sounds/magic.mp3`

2. **특수 기능**
   - 일일 형태 추천 저장
   - 사용자 형태 히스토리
   - 친구 초대 코드 공유

3. **다국어 지원**
   - 현재: 한글/핀란드어/영문
   - 추가 가능: 일본어, 중국어 등

4. **애널리틱스**
   - 형태별 선호도 추적
   - 사용자 여정 분석

---

## 📞 지원

문제 발생 시:
1. 이미지 경로 확인: `/fortune/sikojen-povailu/images/`
2. 폰트 로드 확인: 브라우저 DevTools Network 탭
3. CSS 캐시 무효화: `Ctrl+Shift+Delete (또는 Cmd+Shift+Delete)`
4. 콘솔 에러 확인: `F12 → Console`

---

**🌸 연이와 함께하는 따뜻한 마법의 여행을 즐기세요!**
**Onnea uuteen vuoteen! (새해를 축하해!)**

