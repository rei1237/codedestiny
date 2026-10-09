# 별빛 운영본부 — 기존 기능 대응표

관리자 화면(`/admin`)을 "CODE DESTINY · 별빛 운영본부"로 개편하면서 기존 기능이 어디로 갔는지 정리한 표다.
**기존 주소는 하나도 바뀌지 않았다.** 메뉴를 그룹으로 묶고, 새 화면을 덧붙였을 뿐이다.

상태 열의 뜻:
- **코드**: 이 저장소에 구현이 있다.
- **배포**: main push 로 스테이징에 올라갔다(프로덕션은 별도 승인 후 `Release Cloudflare Pages and Worker` 워크플로).
- **외부 연결**: 외부 원천(PortOne·GA4 등)과 실제로 데이터를 주고받는 것을 확인했다.

## 메뉴 대응

| 기존 기능 | 새 위치(게임명 · 실제 기능명) | 기존 API·원천 | 확장 | 코드 | 배포 | 외부 연결 |
|---|---|---|---|---|---|---|
| (`/admin` → `/admin/content` 리다이렉트) | 별빛 운영본부 · 운영 홈 `/admin` | — | `GET /api/admin/hq/summary` | ✅ | 스테이징 | — |
| 캠페인 CSV(`marketing/campaigns/2026-10-12-growth/`) | 별빛 퀘스트 · 마케팅 일정 `/admin/quests` | `calendar.csv`, `week01.md` | 빌드 스크립트 → `worker/ops-hq/generated/*.js` → `ops_quests` importer | ✅ | 스테이징 | — |
| Threads 자동 발행 | 퀘스트 안 "자동 발행 확인" | `GET /api/admin/sns-daily-post/status`, `idempotency_keys` | 읽기 전용 매핑(`/run` 호출 없음) | ✅ | 스테이징 | Threads 자체는 기존 크론 |
| 주문 · 환불 `/admin/orders` | 별빛 금고 · 주문과 결제 | `/api/admin/orders*` | 확인 필요 큐, 제공 상태, XP 반영·보류 사유 | ✅ | 스테이징 | PortOne(기존) |
| 결제 복구(reconcile) | 금고 안 "복구 대기" + 홈 최우선 알림 | `POST /api/admin/orders/reconcile`, `metadata.fulfillmentAlert` | 홈 알림 연결 | ✅ | 스테이징 | — |
| (없음) | 성장 기록 · 성과와 XP `/admin/growth` | `payments`, 퀘스트 증빙 | `ops_xp_ledger`, `ops_revenue_facts`, `ops_traffic_snapshots` | ✅ | 스테이징 | GA4 **연동 대기** |
| (없음) | 관측소 연결 · 연결 상태 `/admin/connections` | 각 동기화 커서 | `ops_sync_state`, 재집계 | ✅ | 스테이징 | — |
| 글 편집 · 콘텐츠 관리 · 프롬프트 랩 · 콘텐츠 진단 | 연이의 서재 · 콘텐츠 관리 | 기존 그대로 | 그룹 메뉴만 | 기존 | 기존 | 기존 |
| 리뷰 · 버그 제보 | 연이의 응접실 · 고객 경험 | 기존 그대로 | 그룹 메뉴만 | 기존 | 기존 | 기존 |
| 생활 추천 · 카카오 CRM · 월정석 지급 | 성장 공방 · 마케팅 운영 | 기존 그대로 | 그룹 메뉴만 | 기존 | 기존 | 기존 |
| 배포 · 캐시 | 네오의 관제실 · 안정성 | 기존 그대로 | 연결 상태 화면과 같은 그룹 | 기존 | 기존 | 기존 |
| (모바일 서랍 메뉴) | 하단 탭 본부 / 퀘스트 / 성과 / 관리 | — | `/admin/manage` 는 그룹별 기존 기능 허브 | ✅ | 스테이징 | — |

## 신규 API (`/api/admin/hq/*`, 모두 `authorizeAdminRequest`)

| 메서드 | 경로 | 용도 |
|---|---|---|
| GET | `/ui-mode` | 롤백 플래그(`uiEnabled`) |
| GET | `/summary` | 홈 화면 |
| GET | `/quests` | 퀘스트 목록(필터) |
| GET | `/quests/:id` | 퀘스트 상세 + 증빙 |
| POST | `/quests/sync` | 계획 importer(멱등) |
| POST | `/quests/:id/transition` | 상태 이동 |
| POST | `/quests/:id/evidence` | 증빙 등록 |
| PATCH | `/quests/:id/target` | 작업 목표 시각 조정(외부 예약 시스템에는 쓰지 않음) |
| GET | `/xp` | 원장·출처별 합계·레벨 |
| POST | `/xp/backfill?dryRun=1` | 백필 미리보기·적용 |
| GET/PATCH | `/settings` | 규칙·목표·제외 사용자·UI 플래그 |
| GET | `/connections` | 원천별 연결 상태 |
| POST | `/sync` | 재집계 |
| GET | `/traffic` | 트래픽 스냅샷 |
| GET | `/achievements` | 업적 |

## 롤백

1. 모든 관리자: `PATCH /api/admin/hq/settings { "uiEnabled": false }` → 셸이 예전 평면 메뉴로, `/admin` 은 `/admin/content` 로.
2. 이 브라우저만: 관리 화면(`/admin/manage`)의 "기존 화면으로 전환" 또는 `localStorage.cd_admin_ui = "classic"`.
3. 코드: 해당 커밋 `git revert`. 새 컬렉션(`ops_*`)은 기존 화면이 읽지 않으므로 남아 있어도 영향이 없다.
