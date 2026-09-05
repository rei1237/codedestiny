---
status: active
updated: 2026-09-06
next: Phase 2-2 PR 머지(사용자) → 2-4(저자 E-E-A-T·sameAs) 를 새 워크트리에서 시작 → 2026-09-20 GSC 재측정 뒤 2-3(신규 콘텐츠 15편) 착수 여부·AdSense 재신청 시점 판단(사용자)
---

# SEO 진단 + AdSense 승인 최적화 — Phase 2 인수인계

## 왜

사용자 지시 "[Code Destiny] SEO 현황 진단 + 애드센스 승인 최적화". Phase 0 진단·Phase 1 리포트 승인(2026-09-05). 발견 사항 F-01~F-17·실행 계획은 `C:\Users\user\.claude\plans\code-destiny-seo-piped-bentley.md` 가 정본이다 — 다시 조사하지 말고 그 파일을 읽는다.

## 지금 상태

- Phase 2-1 머지 완료(#1595). 2-2 구현 완료, PR 로 올라가 있다(`gh pr list --search seo-phase2-2`). 머지는 사용자 몫.
- 범위 결정(2026-09-06, 에이전트가 계획 파일 권고대로 확정): **2-2 = 기존 URL 본문 증보(신규 URL 0)** 로 진행, **2-3(신규 콘텐츠 15편) 은 09-20 GSC 재측정 뒤로 연기** — 색인 수 증설 동결과 양립하려는 것. 색인 수 451 불변.
- 남은 미확정(사용자): AdSense 재신청 시점(계획 권고 = 2-4 승격 + 1주).

## Phase 2-2 결과

- `SeoLandingTemplate` 에 선택 필드 `sections`(해설 산문)·`linkGroups`(가시 링크 묶음) 렌더링 추가. 안 넘긴 랜딩은 출력 불변.
- 엔진 허브 6곳(사주·타로·자미두수·점성술·숙요·베다, `lib/seo-landing-pages.js`)에 체계 해설 3섹션씩. 공백 제외 손글 본문 871~1,179 → **2,022~2,177자** (스크래치 측정기 기준; 라우트마다 고유 문장이라 8-gram 셔플 가드 통과).
- `/vedic` 에 27 나크샤트라 도감(`/nakshatra/codex/0~26/`) 가시 링크 묶음 — `app/vedic/page.js` 가 `NAKSHATRA_CROSSWALK` 로 생성, 산출물에서 27개 실측.
- `/insights/{engine}` TOPIC_GUIDES 6개 항목에 유파·읽는 순서 문단 2개씩(`app/insights/InsightTopicArchive.jsx`).
- 원장 `config/sitemap-lastmod.json` 26건 갱신(허브 데이터 import 서명 변경분).
- 하지 않은 것(2-1 에서 이어짐): `/pdf/new-year` 301, lastmod 정직화, robots Disallow, SearchAction(가드가 금지).

## 검증 (2026-09-06 실측, 전부 exit 0)

```
npm run sitemap:generate                                   # 451 URLs, 원장 갱신 26
npm run build:cf                                           # [adsense-readiness] OK
npm run verify:editor-notes && npm run verify:indexable-prose-depth && npm run verify:internal-link-depth
SEO_AUDIT_OUT_DIR=dist node scripts/seo-audit.mjs --source=out --crawl-sitemap   # Issues: 0
npm run verify:sitemap && npm run verify:sitemap-drift     # 451 OK / 추적본 일치
npm run verify:seo-heading-integrity && npm run verify:hydrated-h1-integrity   # 451 OK / 202 OK
npm run lint && npm run typecheck && npm run check:quick   # lint 오류 0(경고는 기존 파일)
```

## 함정

- 워크트리엔 node_modules 정션을 손으로 건다(PowerShell `New-Item -ItemType Junction`). `git add .` 금지.
- `styles/*.css`·`js/**` 를 고치면 정적 셸 미러가 함께 바뀐다 — 되돌리지 말고 `npm run sync:public` 결과를 **커밋**한다. 반면 `build:cf`·`check:quick` 가 건드린 `rss.xml` 4개·`.ignore`(개행) 는 되돌린다. 허브 데이터를 고쳤으면 `sitemap:generate` 를 다시 돌려 원장을 같은 커밋에 담는다.
- `verify:indexable-prose-depth`·`internal-link-depth` 는 **dist/ 를 읽는다** — 소스만 고치고 돌리면 옛 빌드로 통과한다. `build:cf` 뒤에 다시 돌린다.
- `lib/seo-landing-pages.js`·`app/vedic/page.js` 는 LF, `SeoLandingTemplate.jsx`·`InsightTopicArchive.jsx` 는 CRLF. Edit/sed 가 CRLF 를 떨구므로 node 패치로 고친다.
- 원장은 UTC `today` 와 KST 휘발성 날짜를 섞어 쓴다. 자정(KST) 을 넘기면 운세 100개 라우트 lastmod 가 하루 앞선다.
- 새 `verify:*` npm 스크립트 추가는 CI 게이트 추가 = 사용자 승인 사항.

## 모르는 것

- 저자 `sameAs` 공개 프로필 URL(2-4 에서 필요) — 사용자 제공 대기.
- 해설 본문의 사실 검토(빔쇼타리 연수·오행국·서머타임 연도 등) 는 에이전트 지식으로 썼고 외부 대조는 안 했다 — 사용자가 훑어볼 것.
