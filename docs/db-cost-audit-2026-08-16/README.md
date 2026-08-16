# MongoDB 비용 감사 — 2026-08-16

> 목적: **Atlas 월 요금 절감.** 성능 감사가 아니다.
> 실측 기준: `code_destiny` 프로덕션, 2026-08-16 조회. 도구는 전부 읽기 전용.
> 원자료: [raw/collections.json](raw/collections.json)

이 문서는 [docs/db-audit-2026-08/](../db-audit-2026-08/)(2026-08-12, **회원 스키마** 감사)의 후속이며
주제가 다르다. 그쪽은 "users 문서에 무엇이 들어 있나", 이쪽은 "무엇이 돈을 쓰나"이다.

## 한 줄 결론

**쿼리 최적화로 줄어드는 월요금은 0원이다. 요금을 바꾸는 유일한 레버는 티어다.**

M10 Dedicated 는 사용량과 무관하게 고정 청구된다. 그리고 이 서비스의 데이터는 M10 용량의
극히 일부만 쓴다 — 전체 문서 26,537건, 측정한 주요 컬렉션 전체를 합쳐 **약 18 MB**다.

## 실측 요약

| 지표 | 값 | 2026-08-12 대비 |
|---|---:|---|
| 컬렉션 수 | **71** | +4 |
| 전체 문서 수 | **26,537** | +409 |
| 등록 mongoose 모델 | **51** | +3 |
| 선언됐지만 실재하지 않는 인덱스 | **81** | +9 |
| `users` | 250 | +5 |
| `pointhistories` (최대 컬렉션) | 19,684 | +160 |
| 실재 TTL 인덱스 | **10종** | +1 (이번 작업으로 생성) |

### 컬렉션 크기 실측 (`$bsonSize`)

| 컬렉션 | 문서 | 평균 | 최대 | 합계 |
|---|---:|---:|---:|---:|
| `pointhistories` | 19,684 | 0.7 KB | 1.4 KB | **13.34 MB** |
| `neoOperationRoomConsultations` | 27 | 53.9 KB | **203.4 KB** | 1.42 MB |
| `security_events` | 3,301 | 0.3 KB | 0.5 KB | 0.95 MB |
| `payments` | 315 | 2.4 KB | 31.7 KB | 0.75 MB |
| `content_entitlements` | 1,384 | 0.5 KB | 0.6 KB | 0.66 MB |
| `ziweiAiConsultations` | 4 | 41.7 KB | 55.3 KB | 0.16 MB |
| `sukuyoCompatibilityAiConsultations` | 4 | 43.8 KB | 83.8 KB | 0.17 MB |
| `karmaDestinyAiConsultations` | 2 | 46.1 KB | 76.1 KB | 0.09 MB |
| `lifeBookAiConsultations` | 4 | 15.4 KB | 16.4 KB | 0.06 MB |
| `masterLoveCodexSessions` · `nakshatraAiConsultations` · `astrologyAiConsultations` | 각 1~9 | 6~39 KB | 52 KB | 각 <0.1 MB |
| `loveSecretAiConsultations` · `destinyCompassReports` · `ziweiDeepReports` | 0 | — | — | — |

재현: `$group` + `$bsonSize` 집계(쓰기 0건). `scripts/audit-mongo-collections.mjs` 는 크기를
수집하지 않으므로 별도 임시 스크립트로 쟀고, 사용 후 삭제했다.

## 이 감사가 뒤집은 것

작업 착수 시 세웠던 가설 중 **실측으로 무너진 것들**이다. 같은 실수를 반복하지 않으려고 남긴다.

### 1. "AI 상담 폴링이 8만 자 문서를 3초마다 읽는다" — 과장이었다

스키마 상한(`worker/lib/models.js:821` `messages[].content` maxlength 80,000)을 실제 크기로
오인한 것이다. 실측 평균은 0.6~54 KB, 최대 203 KB다.

**더 중요한 것**: projection 은 **바이트와 CPU 를 줄이지 ops/sec 을 줄이지 않는다.**
`findOne` 은 projection 유무와 무관하게 1 op 이다. Atlas Flex 의 과금 단위가 ops/sec 이므로,
티어를 내렸을 때 요금을 좌우하는 것은 **쿼리 개수**이지 쿼리가 읽는 바이트가 아니다.

### 2. "`insights` 목록이 단일 최악" — 구조는 맞고 비용은 0이다

`worker/routes/insights.js:364`(`limit(6000)` + `content contentHtml body` 포함, 필터·정렬·페이징
전부 메모리) 와 `:496`(상세 조회마다 `limit(5000)` + 인덱스 없는 `publishedAt` 정렬)은 실제로
그렇게 짜여 있다(직접 확인). 그러나 **`insights` 컬렉션은 문서가 1건이다.** 지금은 돈이 들지 않는다.

🔴 **SEO 콘텐츠를 늘리는 순간 이 두 줄이 단일 최악이 된다.** 콘텐츠 확장 작업의 선결 과제로 남긴다.
다만 `/api/content` 목록은 응답에 `content`/`contentHtml` 를 그대로 싣기 때문에
(`worker/routes/content.js:184-186`), projection 축소가 곧 **응답 형식 변경**이다 — 함께 고쳐야 한다.

### 3. "미생성 인덱스 3종" — 2종은 이미 만들어져 있었다

[db-audit-2026-08/05-execution-log.md:71-82](../db-audit-2026-08/05-execution-log.md) 이
"미실행"으로 기록한 것 중 두 개는 그 사이에 생성됐다. 실측(2026-08-16 `listIndexes`):

| 인덱스 | 2026-08-12 기록 | 2026-08-16 실측 |
|---|---|---|
| `pointhistories.user_kind_feature_lookup` | 미실행 | ✅ **존재** |
| `content_entitlements.permanent_unlock_identity` | 미실행 | ✅ **존재** (unique, partial) |
| `checkout_funnel_events` 90일 TTL | 미실행 | ❌ 없음 → **이번에 생성** |

문서의 "미실행" 기록을 근거로 마이그레이션을 그냥 돌렸다면 무의미한 프로덕션 쓰기였다.
**문서의 상태 기록은 그날의 측정값이지 현재 상태가 아니다.**

### 4. LifeBook 폴링 800ms 무한 반복 의혹 — 사실이 아니다

서버는 생성 중 **202** 를 반환하고(`worker/routes/life-book-ai.js:2240`), 클라이언트는
`LifeBookAiResultClient.tsx:329` 에서 202 를 잡아 `setPollAttempts(0)`(`:347`) **이전에** return 한다.
리셋은 최종 완료 시에만 일어나고 그때는 `:362` 가 폴링을 멈춘다. 간격은 의도대로 첫 회 800ms →
이후 3,200ms 다.

## 목차

| 문서 | 내용 |
|---|---|
| [01-connection-and-ops.md](01-connection-and-ops.md) | 연결 계층 실측값 · 상시 비용 · 요청당 왕복 |
| [02-query-inventory.md](02-query-inventory.md) | 쿼리 비용 순위 · projection/정렬 문제 · 중복 호출 |
| [03-index-and-ttl.md](03-index-and-ttl.md) | 인덱스 실물 대조 · 81개 미생성 분류 · TTL 현황 |
| [04-tier-decision.md](04-tier-decision.md) | **M10 vs Flex** · 차단 요인 · Atlas 콘솔 확인 경로 |

## 감사 도구의 안전성

사용한 연산은 `listCollections` · `listIndexes` · `estimatedDocumentCount` · `countDocuments` ·
`find`(정렬 1건) · `aggregate`(`$group`/`$bsonSize`, `$out`·`$merge` 없음) 뿐이다.
문서의 **값**은 출력하지 않았다 — 개수와 바이트 크기만 집계했다.

이번 작업에서 프로덕션 DB 에 실행한 **유일한 쓰기**는
`checkout_funnel_events` 의 `createdAt_ttl_90d` 인덱스 생성 1건이다. 생성 전 삭제 대상 문서를
먼저 셌고 **0건**이었다(최고령 2026-07-31, 16일 전). 생성 후 문서 수는 588건 그대로다.
