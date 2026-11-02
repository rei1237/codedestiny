# 신규 계산의 실제 브라우저 결제 복귀·전달 검증

status: done
updated: 2026-11-02
next: 이번 로컬 검증 완료. 별도 승인 범위가 정해지기 전 실 PG/LLM/DB·플래그 활성화·push/배포 금지.

기준: `a81ebc0f6` / 구현 기준 `cf7c81a08`. 사용자는 실제 브라우저 검증 및 필요한 수정을 승인했고, DB·PG·LLM은 mock, 플래그 OFF·Swiss 차단·기존 저장/유료 결과 보존·push/배포 금지를 지정했다.

## 실행 경계

- 실제 PC의 Google Chrome을 Playwright로 제어한다. 새 임시 프로필만 사용한다. 연결 도구의 별도 브라우저는 이 PC의 loopback에 접근하지 못했으므로 닫고 로컬 Chrome으로 전환했다.
- 실제 `ZiweiAiClient.tsx`, 입력 컴포넌트, 결과 컴포넌트, `billing-client.ts`, `usePaidResume`, `checkout-entry.js`, 인증/소유자 훅을 esbuild로 묶어 React에 마운트한다. Next의 image/link/dynamic/navigation 호스팅만 전용 shim으로 연결한다. Next 서버·전체 앱 레이아웃·SSR 검증은 아니다.
- 결제 런타임 경계 `_cdOpenPaidServiceGate`만 가짜 승인 화면으로 대체한다. 실제 billing-client가 넘긴 서술자를 저장한 후 전체 문서 이동 → 복귀 → 실제 checkout dispatcher/React hook 순서로 재개한다. PortOne SDK/실 결제창/웹훅은 실행하지 않는다.
- 14번 하네스의 실제 서버 처리 선언·허용 공개 명반 어댑터와 메모리 저장소를 HTTP로 연결한다. 모델 전체/DB 연결/전체 Worker import는 금지한다.
- 외부 요청은 Node transport guard, 브라우저 route 차단, CSP로 막는다. UI 번들 resolve에서 Swiss 모듈은 실패시킨다. Lucide의 `swiss-franc` 통화 아이콘은 천문 라이브러리가 아니며 ISC/MIT 원문 확인 후 이름을 구분했다.
- 새 설치/운영 의존성 변경은 없다. 생성 번들은 전용 `.tmp/engine-audit-browser-delivery`에 두고 종료 시 자기 산출물만 정리한다. 캡처·검사 증거는 `results/browser-delivery-20261102/`에 보존한다.

## 확인된 오류와 최소 수정

`app/ziwei-ai/ZiweiAiClient.tsx`의 `MajorLuckTimeline`이 화면을 여는 현재 연도로 나이를 다시 계산하고 있었다. 합성 입력 `2023-02-04 11:42 / 양력 / 남성`, 준비 연도 2034, 복귀 브라우저 연도 2035에서 저장 본문·근거·메타정보는 **명궁 3–12세**지만 타임라인은 **형제궁 13–22세**를 강조했다. 실제 Chrome의 경계 검사에서 수정 전 assertion 실패를 확인했다.

전달된 `structuredResult.meta.dayun`을 타임라인에 전달하고, 저장된 궁 이름과 나이 범위로 강조 위치를 선택하도록 표시 계층만 수정했다. 현재 연도로 저장 명반/본문을 재계산하지 않는다. 과거 결과에 `dayun` 메타정보가 없으면 기존 나이 기반 표시를 유지한다. 저장 메타정보와 일치하는 주기가 없으면 임의의 주기를 대신 강조하지 않는다. CSS·문구·결제/인증/저장 경로 변경은 없다.

수정 후 같은 경계 사례에서 본문·근거·타임라인이 모두 **명궁 3–12세**로 일치했다. [경계 증거](results/browser-delivery-20261102/boundary.json), [데스크톱 캡처](results/browser-delivery-20261102/boundary.png), [모바일 캡처](results/browser-delivery-20261102/partial.png)를 보존한다. 최초 디버깅 캡처는 최종 증거와 혼동되지 않게 정리했다.

## 실제 브라우저 결과

`node tools/oracle/browser-delivery/verify.mjs --case=<이름>`을 순차 실행했다. **7/7 종료 0**. Chrome 버전·실행한 번들 입력·요청 경로·명반/저장 결과 해시는 각 JSON에 기록했다. headless Chrome의 실제 DOM·React 렌더링 검증이며 VM 함수 실행만으로 대체하지 않았다.

| 이름 | 검증 결과 |
|---|---|
| normal | 실제 입력 → 준비/근거 → mock PG 전체 문서 이동 → 복귀/생성 → 저장 → 재열람. 준비·LLM·반환 명반 해시 동일 |
| boundary | 준비 2034 → 복귀 2035. 저장된 대한과 화면 강조 일치 |
| partial | 부분 생성의 기존 묶음을 인계해 완료. 생성 호출 2회, mock 결제 승인/사용 처리 각각 1회 |
| storage-failure | 완료 저장 실패 후 실제 화면의 동일 작업 재시도. 생성/결제 승인/사용 처리 각각 1회 |
| delayed-auth | 결제 복귀의 사용자 복원을 지연해도 기존 재개 훅으로 완료 |
| concurrent | 두 브라우저 문서가 동시에 같은 결제에서 복귀. 결과·생성·사용 처리 각각 1회, 두 화면에 결과 전달 |
| legacy | 준비 기록/새 저장 스냅샷/dayun 메타정보가 없는 합성 과거 형식으로 재열람. 원본 보존, 기존 나이 기반 강조 유지 |

모든 사례에서 신규 선택은 **legacy(플래그 OFF)**였고, 새로고침과 보관함에서 동일 원본을 재열람했다. 재열람 전후 상담·준비·결제 기록 해시 동일, 쓰기 횟수 증가 0, 추가 PG 조회/승인/생성 요청 0을 확인했다. 모든 LLM/DB/PG 행위는 mock이다. 브라우저 오류·서버 예외·외부 시도·환불 호출 0. 생성 재시도는 기존 request/session ID를 사용했다.

각 사례에서 화면 폭 360/390/430/960/1440px의 문서 가로 넘침 0을 확인했다. 경계 데스크톱·부분 생성 모바일 캡처를 육안 확인했고 기존 카드·본문·명반 구조를 유지했다. Next 전체 레이아웃을 제외한 호스팅이므로 공통 셸까지 포함한 960px 운영 화면 증명은 아니다. CSS는 변경하지 않았다.

## 기존 회귀와 보호 확인

`node tools/oracle/browser-delivery/check.mjs` 종료 0. [명령·출력](results/browser-delivery-20261102/verification.json), [소스 보존 증거](results/browser-delivery-20261102/source-proof.json).

| 검사 | 결과 |
|---|---|
| 기존 전달 통합 | 13/13 |
| 준비·실행 선택/재개 | 23/23 |
| 격리 DB 러너 오프라인 차단 | 15/15, 실제 DB 연결 없음 |
| 공식/확대 골든 | 12/12, **확정 101건 포함**, 외부 KASI 재호출 없음 |
| 저장·유료 결과·화면 재개 | 28/28 |
| 회귀 합계 | **91/91 통과**, skipped 0 |
| 변경 파일 ESLint | 종료 0 |
| 변경 TSX 및 import 그래프 타입 검사 | 진단 0, 코드 실행/산출물 생성 없음 |
| 결제 freeze | 종료 0, 기존 검증기/핀 수정 없음 |
| 결제 선택 parity/self-test | 종료 0, 10 렌더러/105 CSS/12 로케일 |
| 문서 신선도 | 종료 0 |
| `check:fast` 계획 | 종료 0. critical 전체 경로가 선택되어 실제 전체 실행은 Swiss 차단으로 보류 |
| 보호 파일 비교 | 기준 `a81ebc0f6` 대비 **38개 동일**, 승인 표시 변경 파일만 별도 before/after 기록 |
| Impeccable 정적 탐지 | 종료 0, 발견 목록 `[]` |

사주 어댑터의 금지 함수·KASI 입력·정규화·6개 엔진·결제 실행 파일·인증·DB 스키마·저장/유료 결과와 운영 의존성·기능 설정은 변경하지 않았다. 운영 실행 코드 변경은 `ZiweiAiClient.tsx`의 저장 메타정보 표시뿐이다. 테스트용 기존 하네스에는 보관함 읽기에 필요한 메모리 `find`/`limit`만 추가했다. 별도 브라우저 도구/보고서/증거와 아래 공식 생성 사이트맵을 추가·갱신했다.

## 완료 범위와 남은 확인

이번 증거는 자미 상담의 **로컬 mock 전달 경로**다. 새로운 v2를 운영에서 켜거나 6개 엔진 전체를 서비스에 적용한 결과가 아니다. v2 준비 기록의 OFF 복귀와 엔진 101건은 기존 독립 회귀에서 확인했으며 실제 브라우저의 신규 계산은 요구대로 OFF만 실행했다.

실 PG SDK/웹훅/결제사 쿠키, 실 LLM 내용, 실제 DB 내구성, 전체 Next 서버/SSR/공통 레이아웃, 물리 모바일 기기, 전체 CI/build는 미검증이다. Swiss 연결 전체 Worker 경로는 계속 차단했다. 기존 11번 보고서의 실제 DB·PG 승인 경계를 유지한다. 디자인 보조 문서의 기존 불일치 알림은 이번 기능 수정 범위에서 갱신하지 않았다.

회귀 시 이번 표시 수정만 되돌린다. 기존 CR-006 reader·준비 ID/명반·OFF를 유지하고 구매 결과를 재계산하거나 다른 주문으로 대체하지 않는다. 되돌린 표시 소스에 맞춰 공식 사이트맵도 재생성한다.

## 로컬 전달 기록

- `7ccb7b1b0`: 표시 수정, 실제 브라우저 도구·7개 시나리오·91개 회귀 증거.
- 첫 `npm run check:pre-push`는 변경된 자미 화면의 사이트맵 원장 불일치로 종료 1. [최초 출력](results/browser-delivery-20261102/committed-check-before-sitemap.json)을 그대로 보존했다. 엔진/결제 검사 실패는 아니었다.
- `node --require ./scripts/lib/mock-network-guard.cjs scripts/generate-sitemap.mjs`로 정본 생성. XML 12개와 `config/sitemap-lastmod.json` 갱신: URL/우선순위/주기 불변, XML 변경은 lastmod뿐이다. 소스 서명 변경은 `/ziwei-ai/` 하나이고, 생성기의 정해진 주기에 따른 운세 날짜 갱신도 함께 포함됐다. 파일을 수동 편집하거나 검사 기대값을 바꾸지 않았다. [생성 범위 증거](results/browser-delivery-20261102/sitemap-generation.json).
- `bc459b891be7d49c68643a0437d8eb174b2317c7`: 생성 사이트맵·증거 별도 커밋. 그 커밋 상태에서 **`npm run check:pre-push` 종료 0**: 홈 registry 63개, 공개 미러, 사이트맵 1,037 URL, llms 문서, SEO registry 통과. [최종 출력](results/browser-delivery-20261102/committed-check.json).
- `git diff --check` 종료 0. 브라우저/로컬 HTTP는 각 실행 종료 때 닫았고 자기 `.tmp/engine-audit-browser-delivery/`만 절대 경로 확인 후 삭제했다. 기존 로컬 DB 자료·다른 세션 파일은 보존했다.
- 완료 기록은 별도 로컬 문서 커밋으로 남긴다. 감사 누적 변경은 main 미통합이므로 기존 감사 워크트리를 보존한다. **push·배포 없음**. 전체 CI 통과나 실제 구매자 전달을 주장하지 않는다.
