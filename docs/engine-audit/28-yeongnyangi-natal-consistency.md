# 영냥이 체계별 고정 성향·무료/유료 연결 결과

status: done
rollout_status: default-off
date: 2026-11-02

## 구현 범위

시작 HEAD 5072c4497, 브랜치 codex/results-main-gyeokguk-20261102, 시작 clean. 보호된 계산 엔진 내부·운영 플래그 설정·결제/권한/DB 스키마는 수정하지 않았다. 새 서버 선택 YEONGNYANGI_NATAL_PROFILE_V1은 기본 OFF다. 신규 계산에만 저장 사실과 고정 성향을 함께 만들고, 완료된 유료 원문은 변경하지 않는다.

| 체계 | 무료/유료 공통 기준 | 표시·구체화 |
| --- | --- | --- |
| 사주 | 실제 원국·십성에서 기존 saju-temperament 해석 재사용 | 욕구·선택·강점·과할 때·조절 행동. 시주 미상 유지. 무료 및 유료 명반 영역에 4기둥 만세력 표 |
| 베다 | 라그나·달 라시·나크샤트라/파다·주인·행성 배치 | 기존 vedic-ai-knowledge의 나크샤트라/라시 어휘 재사용. 서양 체계와 혼용하지 않음. current dasha를 성향 원인으로 넣지 않음 |
| 숙요 | 출생 당시 본명숙과 기존 keywords/strengths/shadows | 무료 신규 성향에서 오늘 정오 숙·관계 계산을 분리. 어댑터가 options 전체 대신 runtimeEnv를 provider에 전달하도록 보정 |
| 자미 | 출생 명궁/신궁·배치와 기존 궁별 파생 해석 | 기존 readingNotes를 활용. 빈 궁을 결함으로 확정하지 않음 |
| 서양 점성술 | 출생 행성·기존 elementBalance의 원소/모드 성향 | 객체형 실제 행성 출력 지원. 베다 라시 사전을 재사용하지 않음 |
| 타로 | 최초 저장된 카드/자리/정역/해석 | scope=draw. 출생 성격이 아닌 질문 당시 선택·감정 패턴. 별도 유료 추첨 확정 경계도 연결 |

고등어(mackerel), 연어(salmon), 광어(flounder), 참치(tuna)의 공통 domain prompt와 장별 fact selector 모두 동일 natalProfile/sourceDigest를 받는다. 모둠/오마카세가 사용하는 장별 selector에도 같은 체계별 사실이 들어간다. 등급에 따라 원국이나 기본 성향을 새로 만들지 않는다. 장 프롬프트는 동기→선택 습관→관계/일 장면→예외/과도한 조건→조절 행동의 상세화를 지시한다. 무료 문장을 길게 복사하거나 시기 운세로 출생 성향을 뒤집지 않는다. LLM 호출 횟수·결제 상품 구성·최소/최대 분량 게이트는 변경하지 않았다.

정적이라는 뜻은 같은 출생 명반·계산/해석 버전이면 날짜나 질문이 달라져도 성향 내용이 같다는 것이다. 무료의 기존 일별 저장/출석 해금 정책은 그대로 유지한다. 무료·유료가 서로 다른 출생 입력/새 카드 배열/엔진 버전을 선택하면 같은 결과라고 주장하지 않는다.

## UI·애니메이션

- 무료 진입은 사주 탭. 짧은 요약 → 만세력/명반 → 자세한 문단 → 공유 순으로 배치.
- 사주 표는 시·일·월·년 순서, 실제 저장 값만 표시. 다른 체계에 사주 만세력 명칭을 붙이지 않는다.
- 영냥이 생성 장면은 신규 4×4 16프레임 스프라이트. 호흡/눈 깜빡임 중심의 작은 동작, 정지·재생, reduced-motion, 로딩 실패 시 기존 정지 그림 유지.
- 자산 public/assets/yeongnyangi/readings/natal-loading-sprite-v2.webp: imagegen으로 제작한 새 파생 자산. 참조 vedic-loading-sprite-v1.webp의 캐릭터 정체성 유지. 원본/기존 자산 보존. 생성 PNG 1254²를 동일 비율 1280² WebP로 포맷 변환(808,894바이트). 새 프레임 시트는 전 체계의 생성 화면에서 사용하며 운세별 결과/명반은 별개다.
- 시각 검수는 design-canon 지시에 따라 별도 읽기 전용 visual reviewer가 담당. 반복 장식보다 본문 흐름·대비·모바일 가독성을 우선했다. 이미지 투명 픽셀의 RGB 색은 실제 표시 아티팩트가 아님을 확인했다.

## 검증

- 7개 파일 Node mock 회귀 57/57: natal-profile, free-fortune, natal-claims, chapter-completion, non-saju-consumer-rollout, all-engine-fact-consumers, expert-consumer-facts.
- natal-profile 7개 회귀에 6체계×4유료 등급 교차 검사 포함. 베다/숙요 실제 어댑터 함수에서 천문 provider는 합성 fixture로 치환. 날짜/질문 변경에도 성향 불변, 실제 무료 함수와 LLM/장별 근거 동일, 저장 손상 거절, 기본 OFF, fallback 거절, 숙요 env 전달 검증.
- tsc --noEmit, 변경 소스 ESLint --quiet 통과. verify:worker-no-undef 808개 통과. git diff --check의 공백 1건을 정리했다.
- impeccable detect: 변경 UI 5개 표적 검사 종료 0.
- verify-natal-ui.mjs: 실제 Next 무료 사주/베다/숙요 및 유료 생성 화면 960px/390px. 수평 넘침 없음, 스프라이트 위치 변경/일시정지/reduced-motion 통과. 초기에 하네스 route 키와 profile mock이 누락됐던 문제를 하네스에서 수정했으며 실제 서비스로 폴백하지 않았다.

## 보존·한계

실 PG/DB/LLM/Swiss 실행 및 신규 라이선스 설치 없음. 실제 LLM 문장의 의미적 일치와 실 천문 정확도는 이 mock 검사로 보증하지 않는다. 이번 변경은 승인된 기존 계산값과 해석 근거를 서비스 소비 경로에 일관되게 전달하는 구현이다. Swiss 대체 천문 엔진의 승인/독립 검증이 새로 생긴 것은 아니다. 기존 CR-009 영속 준비 계약 등 이전 미승인 범위는 유지된다. 운영 활성화·push·배포는 하지 않는다.

## 수정 파일
- __tests__/ui/yeongnyangi-natal-profile.test.mjs
- app/yeongnyangi/_components/FreeFortune.tsx
- app/yeongnyangi/_components/natal-chart-table.module.css
- app/yeongnyangi/_components/NatalChartTable.tsx
- app/yeongnyangi/_components/reading-loading.module.css
- app/yeongnyangi/_components/ReadingCharts.tsx
- app/yeongnyangi/_components/ReadingLoading.tsx
- app/yeongnyangi/_home/free-fortune.css
- public/assets/yeongnyangi/readings/natal-loading-sprite-v2.webp
- tools/oracle/next-delivery/verify-natal-ui.mjs
- worker/yeongnyangi/fortune/chapter-facts.ts
- worker/yeongnyangi/fortune/free/categories.ts
- worker/yeongnyangi/fortune/free/readings.ts
- worker/yeongnyangi/fortune/shared/consumer-facts.ts
- worker/yeongnyangi/fortune/shared/domain.ts
- worker/yeongnyangi/fortune/shared/natal-profile.ts
- worker/yeongnyangi/fortune/shared/prompt.ts
- worker/yeongnyangi/fortune/sukuyo/index.ts
- worker/yeongnyangi/free-service.ts
- worker/yeongnyangi/providers/chapter.ts
- worker/yeongnyangi/service.ts
## 최종 마감 검증

- backend d06b71908, UI/스프라이트 3b4f59f7d 로컬 커밋.
- 최종 verify-natal-ui: passed=true, errors=[], unknown=[]; 만세력 별도 캡처 및 프로필 API mock 포함.
- 기존 verify-service-results를 영냥이 6체계로 제한 실행: 6/6 통과. 재열람·계산 근거·저장 원문 해시 유지.
- 최종 npx tsc --noEmit 및 git diff --check 종료 0.
- check:fast --base=5072c4497 --plan은 critical. 전체 test:node/build:worker/test:jest 의존 그래프는 Swiss 차단 제약 때문에 실행하지 않았다. 표적 mock 검사로 대체했으며 전체 빌드/CI 통과를 주장하지 않는다.
- SEO: 결과 화면의 기존 색인·canonical·상품 정책 유지. 신규 공개 경로 없음. 사이트맵은 기존 생성기로 변경 서명만 갱신.
- 대운은 기존 시기 해석 경로에 유지하며 출생 성향 고정 자료에서 분리했다. 기존 pin에 없는 대운을 재계산하지 않는다.
- check:pre-push 최종 전체 통과(사이트맵 1,058 URL, mirror/llms/SEO registry/repo hygiene). 작업 트리 clean 확인, push/배포 없음.
