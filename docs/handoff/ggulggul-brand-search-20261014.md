---
status: active
updated: 2026-10-14
next: main·CI와 기존 브랜드 작업을 확인하고, 실제 HTML·Google Search Console 근거를 수집한 뒤 꿀꿀운세 표기를 통일한다.
---

# 꿀꿀운세 브랜드 통일과 Google 검색 미노출 후속

## 왜

사용자 요청: 브랜드명을 띄어쓰기 없는 **꿀꿀운세**로 통일하고 `check:fast`의 브랜드 검사 실패를 해결한다. Google에서 꿀꿀운세를 검색해도 나오지 않는다고 제보했다. 이번 세션에서는 구현하지 않고 인수인계 후 다음 세션에서 진행한다.

## 지금 상태

- 작업 위치 `D:\Development\code-destiny`, main. 마지막 기능 커밋 `c08026d5d6214ad2969148b2d9b94b6b8df03411`까지 push 완료. 뇌구조·영냥이 모자는 완료된 별도 작업이다.
- CI https://github.com/rei1237/codedestiny/actions/runs/38473276582 는 문서 작성 시 진행 중. 재개 시 다시 확인한다. 운영 배포·검색 색인 확인은 안 했다.
- 다른 세션의 미추적 `.claude/skills/fire-your-seo-agency/`, `scripts/grant-family-pass.mjs` 보존. 본 문서는 다음 세션 작업이 남아 있어 active다.

## 남은 작업

- [ ] 먼저 조사: `/`·`/ggulggul/`의 실제 리다이렉트, JS 없는 HTML, title·canonical·robots·OG·WebSite 구조화 데이터, sitemap을 기록한다. Google Search Console의 대표 URL 검사·색인 제외 이유·사용자/Google 선택 canonical·최근 크롤링과 `꿀꿀운세` 질의 실적을 확인한다. 접근 불가면 확인하지 못한 항목을 명시한다.
- [ ] 기존 `docs/handoff/ggulggul-brand-seo-20261013.md`와 관련 커밋을 먼저 비교한다. 이미 반영한 작업을 반복하거나 소스 반영을 운영 반영으로 오인하지 않는다.
- [ ] 정본·생성기·화면·메타의 한국어 브랜드를 `꿀꿀운세`로 통일한다. 시작점은 `lib/seo/siteSeo.ts:81`의 `brandName`(현재 `꿀꿀 운세`), 같은 파일 `siteName`, `lib/i18n/locales.ts`, `scripts/build-fortune-hub-shell.mjs`, root 정적 셸이다. 참조를 좁혀 추적하고 다른 언어를 한국어로 덮지 않는다.
- [ ] `sync:public`로 미러를 재생성한다. `dist`를 직접 치환하거나 검사에서 빼지 않는다. 기존 산출물과 현 소스의 차이를 확인하고 저장소 빌드 절차로 갱신해 두 실패를 재검증한다. 타 세션 산출물을 임의 삭제하지 않는다.
- [ ] 위 조사로 확인한 검색 차단 원인을 최소 범위로 수정한다. URL 변경·중복 랜딩 양산·키워드 반복으로 대체하지 않는다. 운영 승격과 Search Console 외부 제출은 기존 승인 경계를 따른다.
- [ ] 검증→커밋→pre-push→push→CI 1회 확인. 구현 완료, 운영 반영, Google 색인·검색 노출을 별개로 보고하고 완료 시 이 문서를 done으로 닫는다.

## 실패 근거와 검증

`__tests__/ui/site-name-signals.static.test.js:68,165` 두 검사가 정본 `꿀꿀 운세`와 기존 `dist`의 `꿀꿀운세` 불일치로 실패했다. 정본 기대값을 쓰는 검사는 유지한다. 검색 미노출의 원인이 띄어쓰기라는 증거는 없다.

```powershell
node --require ./scripts/lib/mock-network-guard.cjs --test __tests__/ui/site-name-signals.static.test.js
npm run verify:handoff-contract
npm run check:fast -- --plan
npm run check:fast
# 커밋 후
npm run check:pre-push
```

관련 규칙: `docs/context/seo-and-adsense.md`, `docs/context/delivery-and-ci.md`. 기존 결제·인증·DB·영냥이 모자 기능은 수정 범위 밖이다. 과거 955개 sitemap URL은 현행 정본과 비교해 보존한다. 검색 노출·순위는 코드 검사 통과만으로 완료 판정하지 않는다.

## 재개 지시

`D:\Development\code-destiny`에서 이 문서를 읽고 기준 기능 커밋 `c08026d5d6214ad2969148b2d9b94b6b8df03411` 이후 변경과 CI를 확인한다. 첫 행동은 실제 배포 HTML 및 Search Console의 읽기 전용 진단이다. 사용자가 승인한 브랜드 통일과 확인된 원인 수정은 이후 진행한다.
