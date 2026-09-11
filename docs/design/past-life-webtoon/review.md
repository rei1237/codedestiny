# 목업 및 구현 검증 결과

2026-09-09. 아래 첫 항목들은 방향 확인용 목업 기록이며, 마지막 구현 항목은 실제 서비스 모듈의 로컬 검증이다.

- `node verify-plf-mockup.cjs`(2026-09-12 정리에서 삭제, git 히스토리 참조) PASS: 360/390/430/1440px, overflow 없음, 초기 이미지 src 1개, 3개 장면+공유 대표 이미지, 44px 이상 버튼, 펼침 및 demo 안내 작동, CLS0. reduced-motion 활성·DPR1·file:// 기준. 운영 LCP 및 실제 네트워크는 미측정.
- 일반색 본문 대비 14.84:1, 보조문구 7.59:1, 강조문구 6.36:1. 마지막 기억 17.05:1, CTA white/rose 6.59:1. 모두 불투명 단색 표면 기준. 이미지 하단 그라디언트 캡션은 이미지 픽셀별 합성 대비 전수 측정 전이다.
- 480px 3장 합계 144,782 bytes(141.4KiB), 800px 3장 합계 319,390 bytes(311.9KiB). 대표카드는 harbor480 재사용. DPR에 따라 브라우저 선택 크기가 달라진다.
- `impeccable detect --json docs/design/past-life-webtoon/mockup.html` exit0, 경고7건. data-src 이미지3개는 스크롤 시 src 주입을 브라우저에서 검증했으며 실제 깨진 자산이 아니다. EP.01~03 kicker3개는 사용자가 지정한 웹툰 순서라 유지. Batang 경고1개는 설치 글꼴 의존이며 서비스 구현 때 기존 display font 계약에 맞춘다. 경고0이라고 보고하지 않는다.
- 독립 generic reviewer `mockup_review`의 disposition: **ship, 디자인 방향 승인용 목업 범위**. HTML/자산/390 상단/모바일·데스크톱 전체 캡처 검토. 인물·복장·끈·지도 연속성, 발견→일상→사건→선택→결과→현재 연결, 카드와 짧은 문단 적합. 서비스 통합 동작은 검토 범위가 아니다.
- 목업의 얼굴 단서는 가상 샘플이다. 실제 수치→기존 역할→사건 의미 연결은 다음 구현 단계의 필수 검증이다.

Impeccable context는 PRODUCT.md 구형 Register/schema 및 .impeccable/design.json의 문서 시점 차이를 알렸다. 이번 기능 범위와 무관하여 수정하지 않았다. 별도 요청 시 init/document 절차로 정리할 수 있다.

## 실제 서비스 구현 검증

- `PastLifeFaceUI.js`에 기존 계산 결과를 보존하는 `plfBuildStory` 표시 DTO와 핵심 3화 웹툰, 프로필, 얼굴 단서, 현재 연결, 공유 카드를 연결했다. 기존 9장면·3령·부적·유료 궁합은 상세 펼침 영역에 보존했다.
- 공통 상징 이미지 3장은 `fuctionassets/past-life-webtoon/`의 480/800px WebP이며, 800px 각각 120KiB 이하다. 첫 장만 eager, 나머지는 지연 로드하고 404 대체 문구를 제공한다.
- `node verify-plf-mockup.cjs`(2026-09-12 정리에서 삭제, git 히스토리 참조) 실제 모듈 하네스 PASS: 360/390/430/1440px, 가로 넘침 없음, 핵심 3화·상세 9장면, 핵심 본문 1,317자, 초기 이미지 요청 1개, CLS 0, 44px 버튼, IO 없음/404/reduced-motion/초점 복원.
- `npm run verify:past-life-face` 및 `npm run check:fast` PASS. 실기기 카메라, 실제 카카오 파일 공유, 운영 네트워크/LCP는 로컬 증거 범위 밖이다.
