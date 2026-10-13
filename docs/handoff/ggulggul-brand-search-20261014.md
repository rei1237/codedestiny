---
status: done
updated: 2026-10-14
next: main push 뒤 CI 결과와 실제 운영 배포 시점을 구분해 확인하고, Search Console 접근이 복구되면 대표 URL 검사와 색인 상태를 읽기 전용으로 확인한다.
---

# 꿀꿀운세 브랜드 통일과 Google 검색 미노출 후속

## 왜

사용자 요청: 브랜드명을 띄어쓰기 없는 **꿀꿀운세**로 통일하고 `check:fast`의 브랜드 검사 실패와 확인된 검색 신호 불일치를 해결한다.

## 완료 상태

- 기준 main과 origin/main은 작업 시작 시 `35104ce1338f6c058aa3acb8073208e76de33e0c`로 일치했다. 해당 SHA의 PR CI는 진행 중이었고 실패 잡은 없었다. Release·Secret Scan·Landing Watchdog의 최신 완료 실행은 성공이었다.
- 운영 `/`는 `/ggulggul/`로 301 이동했고, `/ggulggul/`은 200이었다. JS 없는 HTML에는 self canonical, `index, follow` robots, sitemap이 있었고 HTTP `X-Robots-Tag` 차단은 없었다. 다만 title·`og:site_name`이 `꿀꿀 운세`로 남아 소스 정본과 검색 신호가 혼재했다.
- Google 공개 검색 표본에서는 `꿀꿀운세` 결과가 있어 사이트 전체 색인 차단은 아니었지만, 띄어쓰기·옛 브랜드가 섞인 결과도 확인됐다. Google Search Console은 브라우저 연결 오류로 속성·대표 URL 검사·선택 canonical·최근 크롤링·질의 실적을 직접 확인하지 못했다. 색인 요청은 제출하지 않았다.
- `siteSeo`, WebSite·Organization 구조화 데이터, title·OG·application-name, 앱·Worker·메일·공유 문구, 12개 로케일 사전과 정적/public 미러의 현재 브랜드를 `꿀꿀운세`로 통일했다. `꿀꿀 운세`, `꿀꿀 사주`, `꿀꿀사주`는 검색 연결용 `alternateName`과 별칭 설명에만 유지했다.
- 브랜드 변경으로 실제 콘텐츠 서명이 달라진 321개 사이트맵 원장 항목을 생성기로 갱신했다. sitemap URL 수는 955개를 유지했고 드리프트 검사를 통과했다.
- 결제·가격·인증·API·DB 로직은 변경하지 않았다. 다른 세션의 미추적 `.claude/skills/fire-your-seo-agency/`, `scripts/grant-family-pass.mjs`도 건드리지 않았다.

## 완료한 작업

- [x] main·origin/main·CI 기준선과 운영 HTML·robots·sitemap을 먼저 확인했다.
- [x] 기존 브랜드 SEO 작업과 현재 정본을 비교했다.
- [x] 정본·생성기·화면·메타의 현재 브랜드를 `꿀꿀운세`로 통일하고 검색 별칭은 구조화 데이터에 보존했다.
- [x] `sync:public`와 사이트맵 생성기로 미러·원장을 갱신했다.
- [x] 혼재한 사이트 이름 신호와 오래된 사이트맵 서명을 수정하고 브랜드·SEO·결제 정책 회귀 검사를 통과했다.
- [ ] Google Search Console 읽기 전용 확인은 브라우저 연결 복구 후 필요하다. 운영 배포와 Google 재크롤·검색 노출도 main 반영과 별도 확인 대상이다.

## 실패 근거와 검증

초기 handoff에 기록된 브랜드 검사는 현재 기준에서 이미 통과했지만, 정본과 운영 HTML의 띄어쓰기 신호가 다시 갈라져 있었다. 정본 기대값을 `꿀꿀운세`로 고정하고 public 미러까지 같은 값으로 생성했다. 첫 `check:fast`는 브랜드 변경 때문에 운세 페이지의 사이트맵 서명이 달라졌는데 원장을 갱신하지 않아 주간 `lastmod` 테스트 1건이 실패했다. `npm run sitemap:generate`로 원장을 갱신한 뒤 같은 테스트와 전체 게이트가 통과했다.

```powershell
node --require ./scripts/lib/mock-network-guard.cjs --test __tests__/ui/site-name-signals.static.test.js
npm run verify:seo-entity-registry
npm run verify:sitemap-drift
npm run verify:handoff-contract
npm run check:fast -- --plan
npm run check:fast
# 커밋 후
npm run check:pre-push
```

관련 규칙: `docs/context/seo-and-adsense.md`, `docs/context/delivery-and-ci.md`. 기존 결제·인증·DB·영냥이 모자 기능은 수정 범위 밖이다. 955개 sitemap URL을 보존했다. 검색 노출·순위는 코드 검사 통과만으로 완료 판정하지 않는다.

## 재개 지시

`D:\Development\code-destiny`에서 이 문서를 읽고 최종 main SHA와 CI를 확인한다. Search Console 연결이 복구되면 `/ggulggul/` 대표 URL의 색인 상태·사용자/Google 선택 canonical·최근 크롤링과 `꿀꿀운세` 질의 실적을 읽기 전용으로 확인한다. 색인 요청이나 운영 승격은 별도 승인 없이 진행하지 않는다.
