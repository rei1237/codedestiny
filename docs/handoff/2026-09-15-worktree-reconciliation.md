# 현재 서비스 기준 워크트리 정리

## 비교 기준

- 최초 기준 main: `34df9d9eaa019d682be81c9f3571da6091755c7d`.
- 운영 Pages/Worker 조회 기준: `78c4a554a34acd08b72b2eaffe667f54a559ce35`.
- 진행 중 main의 수호신 복구 커밋 `8396271d9`를 통합했다. 운영 승격은 하지 않는다.
- 미커밋 여부가 아니라 현행 동작·대체 구현·유효 원본 여부로 판정했다.

## 폐기 판정

| 워크트리 | 폐기 범위 | 근거 / 필요한 변경 처리 |
|---|---|---|
| `.claude/worktrees/pass-quota-refund` | 옛 Human Design 커밋, 라우트/모델 환급 패치, 옛 전용 테스트, 옛 인수인계 | Human Design은 현재 checkpoint 리포트로 분리됐다. 동물 토템은 템플릿 성공 폴백을 폐기하고 paid-narrative로 이동했다. 오라클도 paid-narrative, 초융합은 단계 저장/재개, 수호신은 새 paid-delivery 구조를 사용한다. 자미두수 섬은 검증된 결과 저장 뒤 이용권 사용을 적용하므로 옛 생성 전 차감 복구 배선은 적용하지 않는다. 관계 경계와 공통 중복 환급만 최신 구현에서 수정했다. |
| `code-destiny-header-contrast` | AuthWidget/GlobalHeader의 옛 violet 색상 패치 및 혼합 체크포인트 | 현행 GlobalHeader.module.css의 light/neo 토큰과 cd-auth-* 클래스가 대체한다. 과거 설정·스킬 삭제·lockfile과 생성물은 현행 설정으로 대체되어 가져오지 않는다. 계절 운세를 포함한 사주 엔진은 최신 main의 계산/상담 복구 구현을 유지한다. |
| `code-destiny-wt/detail-sheet-no-swap` | 옛 mountFeatureDetailShare 구현, 연결 소스, 전용 테스트/검증기, public/사이트맵/캐시 산출물 | 최신 상세창은 CSS 로드 전 옛 설명을 숨기고, 로딩/오류/재시도 상태를 제공하며 기존 CTA에 동작을 위임한다. 옛 패치는 최신 상품 소개와 inline 유료 상세를 제거하므로 폐기한다. 현재 13개 상세창 회귀 검사 통과. |
| `code-destiny-i18n-20260911` | 이미 반영된 운세 현지화, 옛 public 플레이어/manifest, 빌더 패치와 package 명령 중복, 손상 번역 값 | 현행 원문 해시와 맞는 소설 초안만 content/novel/translations로 회수하고 재개/완성도 도구를 유지했다. 미완성 초안을 플레이어에 연결하지 않는다. |
| `code-destiny-marketing-20260909` | Python 캐시 및 별도 Git 작업 사본 | 필요한 392개 원본·산출물·도구·기록은 marketing으로 회수했다. JPG 전달본과 WebP 원본은 역할이 달라 보존한다. 과거 일정 자동 실행/외부 게시 없음. |

## 재작업

- 이용권 복구와 영속 환급 영수증을 같은 Mongo 트랜잭션에 기록한다. 다른 소비가 남은 계정도 같은 환급 식별자로 두 번 복구하지 않는다.
- 공통 ServiceExecution, Master Love Codex, 자미두수 프롬프트에 안정적인 환급 식별자를 연결했다.
- 관계 경계의 최초 passRefund 증빙을 llmMeta에 저장해 별도 재개 요청까지 유지한다. 실제 refundStatus가 refunded일 때만 refunded:true를 반환한다.
- 기존 가드가 현행 코드와 어긋난 두 곳을 수정한다: 사주 복구/재시도 리스너의 이용권 갱신 이벤트 필터 및 분류, geomancy/yoga의 공통 paid-narrative 결제 검증 순서 검사.

## 외부 제한 및 남은 확인

- 소설 en 39개, zh-CN 39개, zh-TW 2,544개 미완성. 영어 재개가 첫 요청에서 HTTP 429여서 중단했다. 유효 원본은 정식 위치에 보관하므로 오래된 워크트리를 유지할 필요는 없다.
- 언어 혼입/마커 검사와 원문 해시 일치는 편집 품질 또는 4언어×4기간의 실제 화면 검수를 대신하지 않는다.
- 실 PG, 실 LLM, 운영 DB 쓰기, 운영 배포, 외부 게시를 실행하지 않는다.
- 삭제는 필요한 파일의 main 통합·CI 성공 이후 수행하며, node_modules 정션은 대상 설치본을 건드리지 않고 링크만 해제한다.
