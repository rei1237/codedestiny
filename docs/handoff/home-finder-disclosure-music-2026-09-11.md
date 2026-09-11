---
status: active
updated: 2026-09-11
next: PR 머지 후 남은 결함 1(해시 진입 시 홈 사라짐)을 0d805da89 기준으로 복원한다
---

# 홈 "전체 서비스 검색" — 카드 이미지·음악 1,000원 복구·접기/펼치기·중복 정리 (2026-09-11)

- 브랜치: `worktree-home-finder-disclosure-music` (base `origin/main` 73cfd6e07)
- PR: (PR 생성 후 기입)
- 상태: 커밋·푸시·Ready PR까지. **머지·스테이징 확인은 사용자 승인 대기.**

## 한 일
1. **접기/펼치기** — 새 토글을 만들지 않고, `56932bb53`의 `<details id="cdhFinderDisclosure">`를 되살렸다. #1912(`3a3e7c433`)가 마크업·CSS만 지웠고 JS 훅(`js/core/home-funnel.js` toggle 이벤트, `js/core/home-service-finder.js` `boot()` 지연 마운트)은 살아 있었다. 기본 상태는 접힘(사용자 확정).
   - `templates/home-funnel.html`: summary = 기존 luxe 머리(kicker·`h2#cdhServicesTitle`·lead) + 셰브런.
   - `styles/home-funnel.css`: `.cdh-finder-disclosure*` summary/arrow 규칙만 추가.
   - summary 머리는 좌우 대칭 그리드(24px | 1fr | 24px) + `margin-inline:auto`로 가운데 정렬(480px 이하는 2열). 픽셀 실측 중심 오차 1.5px 이내.
2. **음악 1,000원 복구** — #1835(`60d7c42c2`)의 옛 사본 덮어쓰기로 되돌려진 `c707b8cf1`·`56932bb53` 라인을 복원.
   - `js/core/service-registry.js` music `price: "무료 재생 · 다운로드 1,000원"`.
   - `index.html` `data-price="low"` 칩 "1천원대", `public/i18n/*.json` `home.mobileFunnel.lowPrice` 12개 언어.
   - `scripts/verify-home-service-registry.mjs` 가격 형식·PG 최소 1,000원 검사 복원.
3. **카드 이미지** — 매핑 없는 36개가 공통 로고로 폴백되던 것을 기능 상세 대표 이미지 `/feature-details/assets/<id>-480.webp` 파생 규칙으로 교체. 깨진 `tarot-celestial-harmony` 명시 경로 제거, `points` → `/fuctionassets/membership-honey-kkulkkul.webp`. verify에 "최종 이미지 파일이 public/에 존재" fail-closed 검사 추가(변이 테스트로 무는 것 확인).
4. **중복 삭제**(deletion-auditor 3면 확인 후)
   - `#cdFinder` 내부 중복 제목 `h2#cdFinderTitle` → `aria-labelledby="cdhServicesTitle"`.
   - 중복 "전체 보기" `.fortune-gateway__all` 링크 + `styles/fortune-gateway.css` 규칙, `home-funnel.css` 숨김 규칙 2개.
   - 죽은 코드: `renderCompactResults()`, `.cd-svc-index__searchbar…__empty`·`.cd-svc-hit*` 인라인 CSS 13줄, 비홈 분기 `#cdServiceSearchInput` 포커스.
   - 따라간 참조: 테스트 셀렉터, `scripts/measure-home-interaction.mjs` 검색 입력 대상(`#fortuneGatewaySearch` + summary 펼치기 setup).
   - i18n 키 `shell.cdFinder.moonSectionHead.kf1ogji`, `…fortuneGatewayAll.kqk7ooc`, `home.svcIndex.empty`는 13개 파일 동시 삭제가 필요해 **남겨 둠**(게이트 영향 없음).

## 검증(실측)
- `node scripts/verify-home-service-registry.mjs` OK(57개, 상세 문안 57/57).
- `node --test __tests__/ui/home-service-finder.test.js __tests__/ui/home-yehwa-motifs.static.test.js __tests__/ui/guardian-fortune.static.test.js` 31 pass.
- `npm run i18n:check`, `verify-hero-firstpaint-lock` PASS, `build-home-funnel --check` current.
- `npm run check:fast`: typecheck·test:node·결제 verify 전부·build:worker·entry-encoding OK. sitemap-drift는 `sitemap:generate` 후 OK.
- 미검증(환경): 공유 node_modules 손상으로 jest 228/228 스위트가 `lru-cache` 모듈 없음, ESLint `handleUnsupportedTSVersion`(main 파일도 동일) → CI 클린 설치 결과로 확인.
- 로컬 브라우저(1280·390, visual-checker 판정): 접힘 시작 → summary 펼침/접힘, 1천원대 칩 = "달빛 음악 플레이어", 카드 이미지 깨짐 0·로고 폴백 0, 중복 제목·링크 0, 콘솔 오류 0.

## 남은 결함(후속 과제 — 이번 PR 범위 밖)
1. 🔴 **해시 진입 시 홈 전체가 사라짐.** `js/core/home-funnel.js` `route()`의 `home.hidden = isServices;` 때문에 `#cdFinder`·`#services/*`·헤더/내비 "전체 서비스" 버튼(`data-cd-service-index-jump` → `#services`) 진입 시 `#cdHomeFunnel`(검색 섹션 포함)이 `display:none` → 빈 화면. `0d805da89`(fix(home): restore service discovery)가 고쳤던 것을 #1835가 되돌렸다. 복원안: `0d805da89`의 route/click 변경(`home.hidden = false`, `#cdFinder` 스크롤 + `#fortuneGatewaySearch` 포커스, 점프 해시 `cdFinder`). `scripts/design/verify-home-funnel.cjs:130-131`도 이 때문에 main에서도 시간 초과.
2. `scripts/verify-mobile-runtime-readiness.mjs` 가 main에서도 실패(하단 내비 `data-nav-key="fortunes" … #cdhFeatured`, `data-nav-key="free"` 없음).
3. #1835 가 `worker/payments/*`·`pass-consumption.js`·음원 이용권 다운로드 등 09-08 결제 작업도 되돌린 흔적 → 별도 감사.
4. `.cdh-services__vine` 이 CSS 우선순위 충돌로 안 보임.
5. 로컬 공유 `node_modules`의 `@typescript-eslint/parser` 8.70 ↔ `typescript-estree` 8.57 불일치로 ESLint 전 파일 파싱 오류(환경 문제, CI는 클린 설치).
6. 시각 판정 부수 발견(기존 스타일): 선택된 가격 칩 글자 대비 약 3.2~3.6:1(<4.5), 모바일 "선택 초기화" 크기·기준선 어긋남, 모바일 검색 placeholder 잘림, 총 개수 데스크톱 90 ↔ 모바일 63 불일치, 기존 명시 매핑 `tarot-love-relationship`(tarolove.webp)이 다른 카드와 비슷한 그림.

## 다음 세션 첫 문장
"PR 머지·staging SHA 확인 후 최신 origin/main 기반 linked worktree에서 `npm run session:start -- --handoff=docs/handoff/home-finder-disclosure-music-2026-09-11.md` 를 통과하고, 남은 결함 1(해시 진입 시 홈 사라짐)을 `0d805da89` 기준으로 복원해줘."
