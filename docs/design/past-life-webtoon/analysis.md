# 전생 관상 웹툰 개편 — 코드 분석 및 구현 계약

기준: 최초 분석 origin/main `357108ef0`, 2026-09-08. 상태: 2026-09-09 서비스 구현 및 로컬 검증 완료, PR 전달 준비.

## 현재 연결

| 항목 | 확인한 구현 |
|---|---|
| 진입 | `index.html` 전생 관상 타일 → `openPastLifeFaceApp`; `js/core/uiBindings.js`, `js/mobile-performance-bootstrap.js`, `js/mobile-interaction-patch.js`에서 AnalysisEngine/PastLifeFaceUI 지연 로드 |
| 기존 관상에서 이동 | `PhysiognomyUI.js:2453`부터 `openPastLifeFaceFromPhysiognomy` → `{seed:firstAnalysisResult}`. 재업로드 생략 |
| 사진 | `PastLifeFaceUI.js:3137`의 plfHandleFile. image/*, 20MB 제한. FileReader/이미지 디코딩 → 최대 변 1280, 최대 1280² 픽셀, 필요 시 JPEG .86 |
| 모바일 카메라 | input type=file accept=image/* 사용. capture 속성 및 직접 getUserMedia 없음. 촬영 선택지는 OS 파일 선택기에 따름. 독립 카메라 권한 UI를 새로 만들지 않음 |
| 얼굴 인식 | MediaPipe FaceMesh 0.4.1633559619, jsDelivr/unpkg fallback, 예열, onResults 콜백, 실패 시 런타임 리셋 후 1회 재시도 |
| 계산 | AnalysisEngine.analyze(landmarks,null,aspect), classifyFaceShape, calculatePastLifePhysiognomy, calculatePastLifeCompatibility. loadDatabase는 Promise.resolve이며 서버 DB 조회가 아님 |
| 서버/API/LLM | 개인 전생 리딩용 API 및 LLM 호출·프롬프트 없음. 클라이언트 규칙/테이블. MediaPipe 정적 파일 다운로드와 결제 서비스 호출은 별개 |
| 결과 데이터 | plfBuildReading의 JS 객체. firstNick/body/detail, role*, world{era,place,sense}, event*, omen/bond/relic/season/unfinished/recurrence/reputation, guardians, evidence, keywords, signs, talisman, memory/progress |
| 렌더 | plfBuildScenes → 9장면 → plfSceneHtml; plfRenderReading은 봉인 공유 카드 → 9장면 → 게이지 → 심화 CTA. CSS/마크업/콘텐츠가 동일 IIFE 파일에 있음 |
| 로그인/잠금 | 개인 전생 진입에는 로그인/결제 가드 없음. 전생 궁합은 _cdCoinGatePerUse, featureKey=physiognomy-pastlife-compatibility, serviceKey=physiognomy. 가격·판정은 기존 계약 유지 |
| 결제 복귀 | 결제 직전 cd_pastlife_face_resume_snapshot에 self 분석 결과를 JSON 저장. localStorage, TTL 30분, 512KiB 문자 상한. registerPaidResumeHandler로 상대 사진 선택 단계 복원 |
| 저장/재조회 | 일반 리딩을 서버에 저장하거나 새로고침 후 복원하는 기능 없음. 메모리 결과와 결제 복귀용 snapshot은 일반 결과 보관함이 아님. 공유 helper는 PNG 다운로드 가능 |
| 공유 | plfShare가 봉인 해제 → cdShareResultCardImage → html2canvas → Web Share files 또는 PNG 다운로드/링크 복사. 실패 시 카카오 텍스트 경로. helper 부재 시 plfShareText |
| 공유 위험 | helper의 contentId 기본값은 saju인데 현재 호출은 contentId 생략. caption의 전생 링크와 helper의 공유 링크가 달라질 수 있음. 전생 contentId/링크 계약을 확인하고 기능 범위 안에서 수정 예정 |
| 뒤로가기 | close는 타이머/업로드 토큰 취소·모달 숨김. 모바일 backstack에 openPastLifeFaceApp 등록. 모달 자체의 키보드 초점 복원/가둠은 별도 실브라우저 확인 필요 |
| 다국어 | 홈 타일에는 home.tiles.pastLifeFace* 번역키. 결과 모듈은 한국어 literal이며 독립 결과 번역 사전 없음. 한국어 본문 개선에 번역된 척하는 fallback을 넣지 않음 |
| 이미지 | 진입 CSS 달/문/별. 결과는 이모지·CSS, 스토리 장면 비트맵 없음. 기존 관상 전생 R2 그림은 동물 그림이라 재사용 부적합 |
| 로딩/에러 | 사진 미리보기 skeleton, 주기적 PLF_SCAN_STEPS, 장기 대기 안내, timeout 및 사진 재선택. 시간 기반 티커에서 이미 사건을 발견한 듯 말하는 문구는 실제 단계 표현으로 수정 필요 |

## 실제 문제

1. 검증 표본 솔로 3,865자/9장면. 그림 없이 장문과 근거 각주가 반복된다. 첫 공유 카드도 봉인되어 첫 화면에 이야기가 없다.
2. PLF_ROLES 60항목 중 얼굴 제약상 55종만 도달한다. 기존 검증기가 55종 × 27 수호령 = 1,485개 고유 결과를 확인한다. 60종 전부 도달한다고 홍보하면 안 된다.
3. 세계관 world.era는 시대명이 아니라 역할의 추상 설명이다. 시대·지역 다양성을 실제로 제공하려면 역할과 호환되는 배경 메타데이터가 필요하다.
4. 사건은 얼굴 수치 해시, 사건 근거 문장은 미간 폭 범주에서 따로 나온다. 결정론적이라는 사실과 의미적으로 연결된다는 사실은 다르다.
5. 인연/미완/유물 등 독립 조합은 분량을 늘리지만 사건의 선택·결과와 충돌할 수 있다. 단편 전체를 잇는 사건 아크가 필요하다.
6. 기억의 선명도·숙제 진행도는 해시 숫자다. 실측 확률이나 실제 전생 진행률처럼 읽히지 않도록 표현을 재검토한다.
7. 일부 문장은 현재 성향을 단정한다. 상징적 이야기임을 초반부터 밝히고 현재 연결에서는 선택 가능한 해석으로 쓴다.

## 유지 경계와 위험

RED: 결과 공유 동작 및 결제 후 결과 렌더와 만나는 범위. 얼굴 계산, 결제 gate/featureKey/requestId/resume, 사진 처리, 인증, DB, 타 기능 CTA를 그대로 둔다. 새 유료 LLM·이미지 생성 API를 런타임에 추가하지 않는다.

회귀: 기존 엔진 결과와 역할 판정 동일성, 55종 전수, top3 수호령 보존, 업로드/취소/재시도/결제복귀 mock, 모바일 뒤로가기·공유 fallback 검사. 롤백: 전생 표현 모듈·신규 자산·생성 미러의 해당 커밋 revert. DB 변경 없음.

## 제안 스토리 계약 v1

`plfBuildReading`을 원본으로 보존하고 `plfBuildStory(reading)`가 표시용 DTO를 만든다. JSON 문자열과 객체는 입력 경계에서 타입/길이를 검증한다. parsing 실패 시 확보된 legacy reading을 짧은 장면으로 표시하고, reading 자체가 없으면 재시도 안내로 내려간다. 얼굴 근거를 만들어 채우지 않는다.

```text
version, pastLifeSummary
profile: era, location, occupation, personality[], desire, event, trace
facialClues[]: id, label, observation, symbolicMeaning
episodes[]: id, sceneType, sceneTitle, narration[], clueIds[], assetKey
finalMemory: narration[2..4], assetKey
connectionToPresent[3..5]: title, body, clueIds[]
ending, shareSummary, keywords[3], legacyReading
```

visualScenes 제작 manifest에는 character/location/era/mood/cameraAngle/lighting/visualPrompt를 둔다. 배포 UI에는 허용 목록 assetKey, alt, 크기만 전달하며 프롬프트를 DOM/접근성 텍스트로 내보내지 않는다.

매핑: 기존 shape/dominant/lane → 기존 역할 유지 → 역할의 생활 무대와 성향 → 호환되는 사건 아크(일상/문제/선택/결과) → 기존 roleEcho/eventEcho와 일치하는 현재 연결. 같은 입력은 같은 결과. 동물상은 수호령 전용. 측정은 실제 얼굴 형태이고 성격/전생 연결은 검증된 사실이 아닌 오락적 상징이다.

화면 순서: 얼굴 단서(발견) → EP.01 시대·일상 + 전생 기록 → EP.02 사건과 선택 + 근거 → EP.03 선택의 결과 → 마지막 기억 → 현재 연결 3개 → 대표 공유 카드 → 기존 수호령/부적/심화 기능. 핵심 스크롤은 900~1,500자 목표, 자세한 원문은 별도 펼침 영역에 보존. 이 목표 수치는 구현 후 실측해야 한다.

## 이미지 전략 비교

| 방식 | 요청당 추가 생성 | 품질/제약 | 결정 |
|---|---|---|---|
| 유형별 공통 일러스트 | 없음 | 작화 통일, 각 역할·시대 호환성 검증 필요 | 초기 선택 |
| 배경+캐릭터 합성 | 없음 | 손/광원/원근/옷 불일치 위험, 조합 관리 부담 | 보류 |
| 선택 장면 동적 | 발생 | 개인화, 실패·대기·캐시·비용 추가 | 보류 |
| 대표1+공통 장면 | 대표 생성 시 발생 | 인물 연속성 관리 필요 | 정적 대표로 보완 가능 |
| 완전 동적 | 장면 수만큼 발생 | 가장 높은 비용·대기·불일치 위험 | 초기 제외 |

초기 구현은 55종 역할에 특정 직업 이미지를 잘못 붙이지 않도록 단서·선택·문턱을 상징하는 공통 3장면을 사용한다. 목업의 항구 지도 제작자는 **가상 샘플**로만 남긴다. 역할별 전용 그림은 역할군별 시각 매핑이 준비될 때 확장하며, 다른 시대 이미지를 임의로 붙이지 않는다.

목표: WebP 480/800px, 800px 파일당 120KiB 이하, 첫 장만 eager, 나머지는 스크롤 컨테이너 근처 진입 시 src 부여 + lazy. width/height와 aspect-ratio 고정, decoding=async, 신규 font/preload 없음. Pages 정적 동일 출처 경로로 시작하고 content hash 자산명을 쓰면 캐시/공유 canvas 관리가 단순하다. R2 확장은 CORS·허용 CDN과 배포 절차 확인 후 별도 판단. 네트워크/CLS/LCP는 mock 페이지와 실제 앱을 구분해 측정한다.

## 검증 결과

- `npm run verify:past-life-face` PASS: 55종 × 27 수호령 = 1,485 고유 조합, 3령/근거, 핵심 3화, 원문 상세 9장면, 객체/JSON/누락/오류 입력, 이미지 계약, 유료 궁합 mock 렌더, 클래식 스크립트 공존.
- `node verify-plf-mockup.cjs`(2026-09-12 정리에서 삭제, git 히스토리 참조) PASS: 360/390/430/1440px, 가로 넘침 없음, 핵심 3화·상세 9장면, 핵심 본문 1,317자, 최초 이미지 1개, IO 없음/404/reduced-motion, 초점 복원, 버튼 44px 이상, CLS 0.
- `npm run check:fast -- --plan`은 shared/critical 전체 검사로 판정. `npm run check:fast` PASS: lint 경고만, 타입 검사, Node 969개, Jest 2,422개 및 결제·복귀·Worker·인코딩 가드 통과.
- 정적 800px WebP 3장은 각각 120KiB 이하이고 첫 장만 eager, 나머지는 관찰 영역 진입 시 같은 출처에서 불러온다.
- 미검증: 실기기 카메라, 실제 카카오 파일 공유, 운영 네트워크/LCP, PR CI, 스테이징.

## Direction contract

THESIS: 얼굴의 단서가 선택의 이야기로 이어지는 짧은 세로 웹툰.
OWN-WORLD: 달빛 종이 #fffaf7, 와인 잉크 #3c1830, 로즈 #b31955; 바다 청록은 그림 안에서 사용. 네온/반복 카드 프레임 배제.
STORY: 단서 발견 → 살아 있는 하루 → 사건 → 선택 → 남겨진 기억 → 현재의 선택.
FIRST VIEWPORT: 작은 기능 상단바, 2행 훅, 세로 인물 장면이 화면의 대부분. 640px 단일 읽기 열, 데스크톱 바깥은 조용한 여백.
FORM: 사용자가 지정한 모바일 웹툰 형식. 번호는 이야기 순서를 전달. 동일 패턴의 대체 디자인 선택은 요청하지 않음.
FINISH: 공유한 목업 방향으로 구현하고, 실제 화면과 회귀 검증, 변경 파일 전달까지 수행한다. 2026-09-09 규칙 변경에 따라 별도 목업 승인 대기는 필요하지 않다.
