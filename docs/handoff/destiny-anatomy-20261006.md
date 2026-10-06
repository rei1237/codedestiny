---
status: done
updated: 2026-10-06
next: '운영 활성화·실기기 native 공유는 별도 확인. 전달 검증은 이 문서 변경 커밋의 main CI를 확인.'
---

# 운명 구조도 구현 및 검증

- 구현 상태: 완료
- 기준 작업: Claude의 wt/destiny-anatomy-20261006-121559, f2e69f5f9
- 범위: 정적 사주 결과의 엔진·5개 언어 문구·SVG·공유 카드·공개 안내. 결제/인증/API/DB 정책 변경 없음.

## 표현과 계산 경계

밝은 연이 종이 테마에 달창 금선, 얇은 얼굴 윤곽, 명조 문구를 적용했다. 십성 묶음의 계산 비율을 뇌구조 면적으로 보여주며 실제 뇌 측정값·희귀도·순위를 만들지 않는다. 첫 화면은 별명, 뇌구조, 핵심 문장, 공유 동작이다. 상세는 생각/결정과 관계/몸과 회복의 세 native disclosure로 읽는다.

사주 오행은 강약의 근거→생활 질문→작은 실천으로 읽는다. HD는 기존 bodygraph-geometry.js의 센터9·게이트64·채널36 좌표를 생성기에 연결했다. 정의 센터, 완성 채널, 단독 활성 게이트를 구분하며 센터명은 장기 상태를 뜻하지 않는다. 베다는 실제 라그나에서 홀사인 방식으로 얻은 6하우스와 주인 행성을 별도로 표시한다. 12하우스 안내도는 전체 행성 차트를 가장하지 않는다. 차크라 강조값은 사주 기반의 상징 매핑임을 명시한다. 출생시간 미상·누락 차트는 추정하지 않는다.

## 공유와 공개 안내

1080×1920 이미지에는 이름·출생정보·건강 상세가 들어가지 않는다. 동일한 별명, 뇌구조 비율과 속마음, 연이 이미지와 비교 질문을 사용한다. 기기 공유 취소는 성공 기록에서 제외하고 파일 미지원 기기는 다운로드로 구분한다. 공개 /saju/destiny-anatomy/는 개인 결과 없이 /saju로 연결한다. PRODUCTION_ENABLED=false, NARRATE_ENABLED=false를 유지했다.

## 검증

- node --require ./scripts/lib/mock-network-guard.cjs --test __tests__/ui/destiny-anatomy-{engine,copy,boot}.test.mjs: 관련 44개 통과. 실제 실행은 각 파일을 별도 인자로 전달.
- node scripts/design/verify-destiny-anatomy-browser.cjs: 실제 정적 셸 및 사주 계산, 인증·HD·베다만 fixture. 모든 외부/API 트래픽 차단. 360/390/430/1280 × 5개 언어 20건; 가로 넘침·44px 터치·깨진 이미지·섹션 오류 0. 데이터 지연 후 챕터 유지와 뷰 버튼 포커스 유지 확인. 실기기 결과는 아님.
- 전체 요소 스크린샷에는 content-visibility:auto 캡처 최적화만 해제. 이전 미리보기 기록을 재사용하지 않았다.
- 공유 취소/실패/저장 분기, 개인정보 allow-list, 오행/면적 비율, 시간 미상, 정본 생성물 일치 테스트 포함.
- impeccable detector: 기존 AI 질문 옆의 두꺼운 선 1건 수정. 기존 세밀한 도표용 글자 크기의 advisory는 수치·도표 가독성에 맞춰 유지.
- check:fast 첫 실행은 sitemap 원장 드리프트에서 중단. 소스 완료 뒤 재생성했고 sitemap:check 및 public-mirror-fresh가 통과했다. 통합본 check:fast와 정확한 push SHA의 CI 결과는 최종 전달 보고에서 확인한다.

## 유지 및 남은 확인

가격·이용권·월정석·단건 결제, 인증, 기존 API 응답과 DB 구조 유지. 실 LLM·실결제·운영 DB·운영 배포는 실행하지 않는다. native 공유 패널과 실제 기기 저장 UX, 운영 활성화는 별도 확인이다. 일반 생활 안내의 참고: NHS 수면 안내(https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/how-to-fall-asleep-faster-and-sleep-better/). 운세 해석의 의학적 근거로 사용하지 않는다.


## 추가 디자인 요청 반영

꽃돼지 해설을 챕터별 한 문장으로 줄이고, 뇌구조 안에는 다섯 개 짧은 생각 이름만 사용한다. 긴 속마음은 범례에 남긴다. 과열/대운 배지·무늬·광택·반복 설명을 첫 화면에서 덜고 대운 상세는 생각 챕터로 옮겼다. 베다점은 라그나·라시·바바를 구분하고 12바바는 선택적으로 펼친다.

사용자가 선택한 달빛 수채화 톤의 brain/vedic/hd 장식 에셋 3종을 built-in image_gen으로 제작했다. 투명도를 보존한 WEBP 384/768 버전이며 public/images/destiny-anatomy/가 정본이다. 생성 프롬프트와 크기·용량은 docs/design/destiny-anatomy-assets.json에 기록했다. 장식 이미지는 aria-hidden이고 개인 계산값은 기존 SVG/텍스트만 전달한다. UI는 아이보리·저채도 세이지/문스톤·얇은 금선으로 조정했다.

