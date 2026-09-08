---
status: active
updated: 2026-09-08
next: PR 검사 결과와 운영 배포 SHA를 확인한 뒤 GSC URL Inspection으로 변경 URL을 재검사한다
---

# 검색 유입 회복 후속 확인

## 왜

실제 Google/Naver 데이터로 검색 의도를 정리하고, 번역·중복 URL·기존 콘텐츠 개선을 구현한다. 머지와 운영 배포는 별도 요청 경계다.

## 지금 상태

- `codex/seo-search-recovery-20260908`: 코드·실측 보고서·목록 작성, PR 전달 단계.
- 기준선과 근거는 `docs/seo/SEO_AUDIT.md`, 검증은 `docs/seo/VALIDATION.md`.
- 운영 효과를 검증한 상태가 아니며 작업 워크트리를 보존한다.

## 남은 작업

- [ ] 운영/스테이징 2개 호스트: 배포 SHA·정상 HTML·staging noindex 응답을 확인. 일반 요청 403만으로 bot 차단 판정 금지.
- [ ] GSC 7일/28일/3개월 3개 기간: exact dates와 전체 Query–Page export, 나머지 색인 제외 사유, backlink 목록을 확보. 익명화 누락을 0으로 채우지 않음.
- [ ] 4개 해외 홈: 핵심 첫 안내 외 본문/서비스 카드/모달의 번역 잔여를 운영에서 비교. 검증 전 일괄 noindex 금지.
- [ ] 12개 유명인 고유 원고: 이번 정국 한 문단 수정 외 각 주장·생년월일·시간 출처 대조. 저자 검수 없이 reviewedAt 갱신 금지.
- [ ] 113개 인사이트: 개별 원문/템플릿 중복 대조와 중요 Query 교차 조회 후 편집 순서 확정. 자동 목록은 수동 전수 검수 완료가 아님.
- [ ] 모바일 주요 Query의 Google/Naver 각 상위 5개 직접 비교, LCP/CLS 같은 조건 전후 실험. INP는 필드 데이터 확보 후 판정.
- [ ] 배포일 기준 7/28/90일 3회 동일 기간 비교. 비브랜드 클릭·가치 있는 페이지 색인·organic 서비스 이동 증가를 관찰.

## 정본 예시

`scripts/prerender-locale-shell-translations.mjs` — 실제 정적 셸 번역 경로.

## 함정

기존 숙요 체크리스트·리듬 가이드는 승인된 통합 이력이 있다. `/fusion-fortune/`도 기존 noindex 서비스다. 이를 새 결함으로 보고 복원/승격하지 않는다. 다른 홈 작업과 template/index 공통 파일이 겹친다.

## 검증

```sh
npm run verify:handoff-contract
npm run verify:sitemap-drift
node --test __tests__/ui/seo-search-recovery.test.mjs
node scripts/seo-search-browser-check.mjs
```

## 모르는 것

번역과 Google 하락의 인과관계, 전체 외부 링크, 미노출 Query, 실제 INP, 운영 WAF가 검증된 검색 로봇에 주는 최종 응답은 아직 확인하지 못했다.
