---
status: active
updated: 2026-09-08
next: 최신 main에서 해외 홈 런타임 언어 초기화를 mock 재현하고 원인별 최소 수정을 진행한다
---

# 검색 유입 회복 후속 확인

## 왜

실제 Google/Naver 데이터로 검색 의도를 정리하고, 번역·중복 URL·기존 콘텐츠 개선을 구현한다. 운영 배포는 별도 요청 경계다. PR 전달은 현행 CLAUDE.md의 검사·머지·스테이징 확인 절차를 따른다.

## 지금 상태

- 기존 PR #1817 머지 완료: `ff2d524c647dc0ebf909d752fa3998b93abd4c62`, PR CI/정책 게이트 success.
- 후속 조사 브랜치: `codex/seo-search-followup-20260908`.
- 기준선과 근거는 `docs/seo/SEO_AUDIT.md`, 검증은 `docs/seo/VALIDATION.md`.
- 새 실측과 우선순위: `docs/seo/SEARCH_RECOVERY_FOLLOWUP.md`, `DEPLOYMENT_FOLLOWUP.json`, `INSIGHT_DUPLICATION_FOLLOWUP.json`, `CELEBRITY_SOURCE_FOLLOWUP.md`.
- 스테이징 Pages·Worker SHA 일치 확인: 최초 `ff2d524c647d`, 후속 문서 배포 후 `62c72c3a4bf6`. 운영은 아직 `a6082514bdd2`로 SEO 변경 미반영.
- GSC 7일/28일/3개월 exact dates, 색인 제외 13개 사유, 표시된 외부 링크 2개 원본, 일본어 홈 과거 크롤링 성공 확인. 실제 URL 테스트는 GSC 오류, CSV 다운로드는 Chrome 차단.

## 남은 작업

- [x] 운영/스테이징 24개 GET: SHA·HTML 200·staging noindex 확인. bot 전체 성공으로 확대하지 않음.
- [x] GSC exact dates·나머지 색인 제외 3개 사유(382/229/4)·표시된 backlink 2개 원본 확인.
- [ ] 전체 Query–Page export 확보. Chrome CSV 다운로드 차단 복구 필요. 익명화 누락을 0으로 채우지 않음.
- [x] 해외 홈 4개 운영 응답/현재 Chrome 표시 대조. 스테이징 HTML에는 로케일별 한국어 leaf 90개, 현재 Chrome은 해외 경로에서도 실행 후 ko. 신규 방문자/저장 언어 영향은 미검증.
- [ ] 해외 홈 언어 초기화 재현·잔여 번역 수정 및 모달 검증. `cdReadUrlTranslateLang`, `cdGetExplicitTranslateIntentLang`부터 추적하고 공통 홈 파일 중첩 확인. 일괄 noindex 금지.
- [ ] 12개 유명인: 생년월일 출처 1차 대조표 작성 완료, 모든 주장/시간 검수는 남음. 아이유 오후 3시 공개 근거 우선 확인. 저자 검수 없이 reviewedAt 갱신 금지.
- [x] 인사이트 113개 원문/seed 전수 비교: authored 113, 정규화 본문 일치 113, 60자 이상 p 완전 중복 0. 점성술 연애운 Query의 실제 유입은 홈임을 확인.
- [ ] 113개 의미 중복·개별 주장 수동 검수 및 synastry 실제 Query 확보. 자동 검사는 전수 편집 검수 완료가 아님.
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

## 다음 세션에서 바로 이어가기

`docs/handoff/seo-search-recovery-20260908.md와 docs/seo/SEARCH_RECOVERY_FOLLOWUP.md를 읽고, 최신 main의 새 격리 워크트리에서 해외 경로가 런타임에 ko로 바뀌는 현상을 mock으로 재현해 원인을 수정해줘. worktree:status로 홈 공통 파일 중첩을 확인하고 가격·결제·API·색인 정책은 유지해줘. 검증·커밋·push·PR·필수 검사·안전한 머지·스테이징 확인까지 진행하고, 운영 승격은 하지 마.`
