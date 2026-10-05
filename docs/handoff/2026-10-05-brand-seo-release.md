---
status: blocked
updated: 2026-10-05
next: 운영 승격 명시 승인을 받은 뒤 최신 main CI와 SEO 커밋 포함 여부를 확인하고 GitHub Actions production 배포를 실행한다.
---

# 꿀꿀운세 두 진입점 SEO 운영 반영

## 왜

정확한 `꿀꿀운세` 검색에서 `/ggulggul/`와 `/yeongnyangi/`가 각각 노출되게 만든다. G1 권장 구현은 승인됐고 운영 승격은 별도 승인 경계다.

## 지금 상태

- 구현을 main에 직접 push했다. PR 없음. 최종 SEO 통합 커밋 `55289307fa8f8a9ed0a116db420c546db0e12164`, 이후 동일 트리 병합 `b1fd513f6d95ab51ad3022290a87d517e4bd3f7d`.
- 기능 커밋 CI 37302855519 PASS. 최종 통합 커밋 CI 37305714379 PASS. 상세는 `docs/seo/2026-10-05-brand-entry-implementation.md`에서 확인한다.
- staging `d0f5d7dc50b1c65e2dee5d71d3b7c858ebbd8ef4` Pages·Worker 일치, release 37303994368 PASS. 운영은 `3ff468f39b953b00a85cf58ebd253ca11a7c882f`, 이번 변경 미반영.

## 남은 작업

- [ ] 운영 배포 1회: 명시 승인 후 최신 main 포함 변경·CI 확인 → production workflow → Pages/Worker SHA 및 두 입구 curl 검증. 실패 시 규정된 롤백 절차.
- [ ] 사용자 계정 작업 5종: Naver, GSC, Bing, Cloudflare, 공식 블로그. 수집 순서는 운영 문서에 있다.
- [ ] 운영일 D+14/D+30: 자동화 `d-14-d-30` 활성. 두 URL을 각각 브랜드 SERP O/X로 판정한다.
- [ ] 모바일 전체 성능은 미달: staging 꿀꿀 3회 중앙값34, 영냥이1회32. 이미지 용량·404는 개선했지만 CSS·초기 JS 비용은 남는다. 결제/인증 초기화 변경은 별도 승인 필요.

## 정본

`lib/seo/brand-copy.mjs`, `docs/seo/2026-10-05-brand-entry-implementation.md`, `docs/seo/2026-10-05-brand-search-operations.md`.

## 함정

기존 canonical과 루트/index.html → ggulggul을 유지한다. 브랜드 설명 페이지 노출을 두 입구 노출로 세지 않는다. 다른 세션 변경이 main에 포함되어 있으므로 배포 전 차이를 확인한다. 공유 main 미커밋 파일을 reset/stash/clean하지 않는다. 엔진·결제·인증·DB는 이번 SEO 변경 범위 밖이다.

## 증빙 위치

`C:/Users/user/.codex/visualizations/2026/10/05/01a10b51-36b8-7aa2-ad0d-29518f311283/seo-implementation/`에 보고서 사본·curl·Lighthouse·화면을 보존했다. 공유 체크아웃이 오래됐으면 이 사본을 먼저 읽는다. 운영 승격 전에는 `docs/context/delivery-and-ci.md:38`을 따른다.
