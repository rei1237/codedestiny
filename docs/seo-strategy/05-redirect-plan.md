# Redirect Plan — 예외 한정

> [세트 인덱스](README.md) · 이 문서는 5/10부다. [04-url-architecture.md](04-url-architecture.md)에서
> 확정된 예외 케이스만 다룬다. 이 세트는 URL 대량 마이그레이션을 하지 않으므로 이 문서는 대부분
> 비어 있는 것이 정상이다.

## 1. 구현 규약

기존 `public/_redirects` 301 컨벤션을 그대로 재사용한다(`docs/insight-hub-authoring.md §1-3`의
"통합 대상 슬러그" 처리 방식과 동일 패턴 — 새 규약을 만들지 않는다).

## 2. 리다이렉트 표

| from | to | 상태코드 | 구현 위치 | 04 케이스ID | 배포전 검증 | 배포후 검증 | 상태 |
|---|---|---|---|---|---|---|---|
| _(famous-saju 케이스 확정 시 여기 추가)_ | | 301 | `public/_redirects` | famous-saju | — | — | **확정 대기** |

## 3. famous-saju 케이스 현황

[04-url-architecture.md §3](04-url-architecture.md)에서 canonical 방향이 미확정이므로 리다이렉트도
확정 대기다. GSC 데이터 확보 후 별도 세션에서 판단하고, 이 표에 실제 항목을 추가한다.

## 4. 검증 방법

기존 `docs/seo-deploy-checklist.md §3-4`의 "레거시 경로 redirect 확인" 패턴을 재사용한다. 새 검증
명령을 만들지 않는다.

## 변경 이력

| 날짜 | 변경 내용 |
|---|---|
| 2026-08-11 | 최초 작성. famous-saju 케이스는 04에서 미확정이라 리다이렉트 항목 없음 |
