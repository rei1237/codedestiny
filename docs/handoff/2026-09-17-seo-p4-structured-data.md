---
status: active
updated: 2026-09-17
next: P4 착수 예정 — 아직 조사 시작 전. 새 세션에서 이 문서부터 읽고 시작.
---

# SEO 개편 요청 — P4: structured data(구조화 데이터) 확장

## 왜

`docs/handoff/2026-09-17-seo-p1-followup.md`의 "원 요청 22개 항목 중 미착수"
목록에서 사용자가 다음 착수 항목으로 structured data 확장을 지정(2026-09-17).
P1(zh-TW·compatibility·FAQ 확장·sitemap 드리프트), P2(sitemap 중복 제출),
P3(죽은 리다이렉트 스텁 삭제) + 그 CI 회귀 수정까지 모두 완료·push·CI 초록
확정됨(`1a2c8db52` 기준). 이 문서는 컨텍스트 비용 때문에 조사를 시작하지
않고 다음 세션으로 넘기는 순수 인수인계.

## 지금 상태

- 조사 전. 이 세션에서 구조화 데이터 관련 코드를 전혀 읽지 않음 — 아래는
  전부 다음 세션이 확인해야 할 것.

## 다음 세션이 먼저 확인할 것

1. 현재 JSON-LD/schema.org 마크업이 어디에 어떻게 존재하는지 전수 확인.
   `git grep -l "application/ld+json"` 부터 시작. 구현 위치가 컴포넌트
   단위인지, `lib/generate-page-metadata.ts` 같은 공용 메타데이터 헬퍼에
   있는지 확인.
2. 어떤 schema 타입이 이미 있는지(Organization, WebSite, FAQPage,
   BreadcrumbList, Article 등) 목록화하고, 22개 원 요청이 구체적으로 어떤
   타입 확장을 말하는 것인지 원 요청 문서(있다면)를 찾아 재확인 — 없으면
   사용자에게 범위를 물어야 함.
3. `scripts/verify-adsense-readiness.mjs`, `scripts/check-seo-health.mjs`
   등 기존 verify 스크립트에 structured data 관련 가드가 있는지 확인
   (원칙 6: 기존 장치 확인 후 추가).
4. Google Rich Results Test로 실제 배포 페이지 몇 개를 실측 확인해 현재
   무엇이 인식되는지 확인(코드만 보고 "있다"고 단정하지 말 것).

## 위험도

미확인 — 코드 변경 범위가 얼마나 넓은지(공용 헬퍼 1곳 확장인지, 라우트별
개별 추가인지)에 따라 GREEN/RED 갈림. 조사 후 먼저 판단·보고.

## 참고

- 원 요청 22개 전체 목록·나머지 미착수 항목은
  [2026-09-17-seo-p1-followup.md](2026-09-17-seo-p1-followup.md) 참고.
- SEO 인프라 실측 정본: `SEO-AUDIT.md`, `SEO-LOCALE-AUDIT.md`(단, 이 두
  파일의 실제 경로가 `docs/seo/SEO_AUDIT.md`일 수 있음 — P2 세션에서
  경로 오기 발견됨, 먼저 실제 파일 확인).

## 다음 세션 첫 문장

P4(structured data 확장) 조사 시작 전. 이 문서 "다음 세션이 먼저 확인할 것"
1~4번부터 순서대로 진행.
