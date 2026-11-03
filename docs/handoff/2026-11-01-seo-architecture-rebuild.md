---
status: active
updated: 2026-11-03
next: "superpowers:writing-plans로 묶음 ③ B+A3 원장·hreflang 계획을 쓴다(묶음 ② 운영 반영은 2026-11-03 실측 끝, 작은 후속은 docs/handoff/2026-11-02-seo-post-promotion-followups.md)"
---

# SEO 아키텍처 재구축

## 왜

구글·네이버·빙 자연 검색으로 실제 신규 사용자와 구매 기회를 늘린다. 범위는 증거 기반 전수 감사 → SEO 구조 재설계 → 구현·테스트·운영 배포 → 7·28·90일 KPI다(2026-11-01 사용자 요청). 순위와 색인 시점은 보장하지 않는다.
설계 정본은 `docs/superpowers/specs/2026-11-01-seo-architecture-rebuild-design.md`(승인됨)다. 이 문서는 이어 가는 데 필요한 상태와 함정만 담는다.

## 첫 행동

1. 이 워크트리에서 이어 간다: `D:\Development\codedestiny-worktrees\seo-architecture-rebuild-20261101-135310`(브랜치 `wt/seo-architecture-rebuild-20261101-135310`). 새 워크트리를 만들지 않는다. 두 문서는 origin/main에도 있다.
2. `git fetch origin` → `git status` → `git log --oneline -3`. origin/main이 앞서 있으면 `git rebase origin/main`.
3. 설계 문서를 끝까지 읽고 superpowers:writing-plans로 묶음 ① 계획을 쓴다. 브레인스토밍과 설계 승인은 끝났다. 설계 문서의 '확정된 결정'·'설계 판단'은 다시 묻지 않고, 운영 승격만 묶음마다 승인받는다.
4. `D:\Development\seo-data\code-destiny\2026-11-01\`(Codex 수집본, `manifest.csv`·`README.md`)이 생겼는지 본다. 생겼으면 설계 문서 근거 부록 6(원인 판정)과 묶음 ④ 매핑에 반영한다.

## 지금 상태

- 운영 SHA `bf9c77a64`(2026-11-03, 다른 세션의 릴리스 런 https://github.com/rei1237/codedestiny/actions/runs/41658891499). 앞선 운영 `a221a78eb` 위에 `ai_source` 키 수정, 스타일시트 캐시 키, 서비스 선택 화면 분리(`683b1c716`), Toss·Fusion 수정이 더해졌다. 묶음 ③은 시작하지 않았다.
  - 2026-11-04 릴리스 런 41729564058(`914fca524`)은 배포 전 테스트에서 막혀 운영이 바뀌지 않았다. 원인과 수정은 `docs/handoff/2026-11-03-aeo-remaining-work.md`의 "운영 재반영 대기"를 본다.
  - 실측(2026-11-04, 한국 IP, Chrome UA, `Accept: text/html`): `/version.json`·`/api/version`이 `bf9c77a64`. `/`·`/saju/`·`/en/saju/` 200 `private, no-cache`. `/checkout/`·`/account/password/`·`/admin/`·`/login/`·`/diary/` 200 `private, no-store`. `/saju`·`/index.html` 절대 URL 301 `no-store`. `/?lang=en` 302 `private, no-store`. 해외 IP는 측정하지 않았다.
  - `/`, `/yeongnyangi/`, `/saju/`, `/insights/`가 `analytics.js?v=20261103-ai-source-v1`을 읽고 파일에 `ai_source`가 있다. GA4 수신은 측정하지 않았다.
- 묶음 ① main push 완료(2026-11-02, origin/main `32397321e` 위로 rebase). 운영 배포는 2026-11-02 사용자 승인으로 1회 실행했다(https://github.com/rei1237/codedestiny/actions/runs/41335766465, `98643c274..6d514ecaf` 66커밋). 계획은 `docs/superpowers/plans/2026-11-01-seo-bundle-1-v0-a2-d1.md`(`e00cf2f88`).
  - 커밋(rebase 후): T1 `cc57c748f`·`78e5cd1f9`, T2 `f4e76db9a`·`ad9e418d1`, T3 `6492b2ca7`·`f4f268314`, T4 `9807f5e50`·`ebecc316a`, T5 `f71eafb85`, T6 `023be9a18`, T7 `cdd15f625`, T8 `d7ba36b65`, T9 `53c4959ca`, 최종 검토 수정 `29ec78b93`.
  - 태스크마다 새 검토자, 끝에 Opus 전체 검토. Important 1건(jsonld-dates 시각 비교 → 새벽 빌드 거짓 실패)은 KST 날짜 비교로 고쳤다.
  - rebase 충돌은 생성 파일(`config/sitemap-lastmod.json`, sitemap XML)뿐이었고 커밋마다 `npm run sitemap:generate`로 다시 만들었다. 운세 페이지 lastmod가 11-02로 하루 넘어간 것은 일일 갱신분이다.
- verify-dist(로컬 build:cf): 실패 규칙 전부 0. og:url 8 → 0(실패로 승격). 경고 hreflang 185(80·1·100·4)와 엣지 3/1/4는 묶음 ②·③ 몫이다.
- 증거와 승인 패킷: `D:\Development\seo-audit\code-destiny-20261101\bundle-1\`(`approval-packet.md`, verify-dist 전후 JSON, `regression\` 로그, `sdd-ledger.md` 원장).
- 묶음 ② 운영 반영 확인(2026-11-03). 운영 `/version.json`과 `/api/version`이 `79ef4a4ed`이고 그 안에 묶음 ②가 있다. 다음 승격 승인 패킷에는 운영 `/version.json`의 SHA로 `git log <운영 SHA>..origin/main`을 새로 뽑아 넣는다.
  - 커밋: 계획 `c0b29aa84`, T1 `599acf294`, T2 `574f76429`, T3 `c3ea9a19d`·`8fda3bce1`, T4 `7a6255d28`, T5 `ce132b37a`, T6 `374d9e690`, 사이트맵 `4b38d006d`, 전체 검토 수정 `485e905ca`, 미러 `d27cbd970`, no-store `8032698e8`·`89615a5c5`, h1 검사기 예외 `c5f71bec0`.
  - 실측(한국 IP): HTML `private, no-cache`, `/checkout/`·`/account/`·`/admin/`·`/login/`·`/diary/`는 `private, no-store`, 슬래시 없는 경로·`/index.html`은 절대 URL 301, `/?lang=en` 302, Googlebot 헤더가 Chrome과 같다. 해외 IP는 vm 하네스로만 확인했다.
  - 계획의 "`_headers`가 `/checkout/`에 no-store를 준다"는 틀렸다. `/*/`의 `no-cache`만 받고, 옛 워커의 일괄 no-store가 지켜 왔다. 지금은 `privateCacheControl`의 경로 목록이 지킨다.
  - `verify-hydrated-h1-integrity`에 `/yeongnyangi/result` 예외를 넣었다(`f19f5c471` 이후 오탐). 결제된 상담 화면의 브라우저 확인은 안 했다.
  - 내가 실행한 승격 런 41471987438은 프리뷰 스모크의 CSS HTTP 500으로 막혔고 원인은 모른다. 묶음 ②는 다른 사람이 실행한 런 41571861422로 들어갔다.
  - 스케줄 SEO Operations는 `Test detector with mock inputs`(`keyword-research`, `public-inventory` 테스트)에서 실패한다. 11/01 런에도 같은 실패가 있어 묶음 ② 때문이 아니다. 아직 고치지 않았다.
  - 증거와 승인 패킷: `D:\Development\seo-audit\code-destiny-20261101\bundle-2\`(`approval-packet.md`, `sdd-ledger.md`, `regression\`).
- 미룬 사소한 항목(약 45건)은 별도 세션으로 넘겼다: `docs/handoff/2026-11-02-seo-bundle-1-followups.md`. 이 흐름은 묶음 ②부터 이어 간다. `verify-dist.mjs`를 같이 고치므로 자주 rebase한다.
- Codex 수집본 없음. 11/07 홈 title D+30 관찰 대기.

## 작업 규칙

- 루트 체크아웃 `D:\Development\code-destiny`는 다른 세션이 쓰는 중이다(`feat/world-cast-page`, 미커밋 다수). 건드리지 않는다.
- push는 묶음 승인 때 함께 한다: `git fetch` → `git rebase origin/main` → `npm run check:pre-push` → `git push origin HEAD:main`.
- 운영: 묶음 승인 뒤 `gh workflow run cloudflare-pages-deploy.yml --ref main -f mode=production`. 실행 URL만 전하고 폴링하지 않는다.
- 따로 승인받을 것: 워크플로 변경(T1 자정 지연, seo-operations 입력), 계정 제출(사이트맵 재제출·수집 요청), `scripts/report-revenue-funnel.mjs` 실행(운영 DB 읽기).
- 금지 사항과 경계는 설계 문서 '작업 경계'를 따른다.

## 설계

설계 문서가 정본이다. 승격 순서: ① V0+A2+D1 → ② A1 엣지 → ③ B+A3 원장·hreflang → ④ E1+C+E2(11/07 이후, Codex 수집본 필요) → ⑤ D2(50~100쪽씩) → 별도 F 성능. 묶음마다 '배포 게이트' 8단계를 거친다.

## 단계

- [x] 묶음 ① — verify-dist 실패 0, 경고가 감사 수치를 재현(og:url 8쪽, hreflang 100/80/8), 운영 `/version.json` SHA 일치
  - [x] 로컬: 구현·검토·회귀 통과, verify-dist 실패 0, 승인 패킷 작성
  - [x] main push (2026-11-02, HEAD는 이 문서 커밋)
  - [x] 운영 배포 승인(2026-11-02, 후속 정리 그룹 D 포함) → 승격 런 https://github.com/rei1237/codedestiny/actions/runs/41335766465 (main `6d514ecaf`). `/version.json` gitSha `6d514ecaf` 일치 확인(2026-11-02), 작은 후속은 `docs/handoff/2026-11-02-seo-post-promotion-followups.md`
- [x] 묶음 ② — vm 하네스 5개국×3UA 불변, 절대 Location 301 한 번, 결제 회귀 통과
- [ ] 묶음 ③ — 전 URL 색인 상태 diff 0, HTML과 사이트맵의 hreflang 집합 일치
- [ ] Codex 수집본 반영 → 묶음 ④ → 묶음 ⑤ → F
- [ ] 최종 산출물 6종(설계 문서 '최종 산출물')
- [ ] 끝: 이 문서 `status: done`, 워크트리 배수(junction 해제 → `git worktree remove --force` → `git branch -d`)

## 함정

1. `scripts/verify-sitemap-integrity.mjs:8`은 낡은 루트 robots.txt를 읽는다. `dist/robots.txt`로 바꾸면 빌드 전에 돌 때 파일이 없다.
2. `dist/robots.txt`는 postbuild가 `out/` → `public/` 순으로 복사한 뒤 `promote-static-shell-to-root.mjs:11→:15`가 out 판으로 되돌린다. 사본을 지운 뒤 최종본이 `app/robots.ts` 출력인지, `apply-staging-noindex.mjs:124`가 여전히 덮어쓰는지 본다.
3. `/sitemap.xml`(빙이 읽음)과 sitemap-index 하위 합집합은 개수(1,037)만 같다. 집합 동일 규칙과 내부 링크 404 규칙은 깨끗하지 않으면 경고로 시작한다.
4. `cd_geo_country` Set-Cookie가 있는 동안 HTML Cache-Control은 `private`을 유지한다.
5. 언어 제안 배너는 `navigator.languages`를 쓴다. 자동 이동과 SSR 출력은 없고, `cd_locale_explicit`와 닫기 기록을 존중한다.
6. `wt/infra-deploy-20261031-190620`이 `index.html`(:974, :983, :1105 이후)과 `package.json` ~:188을 건드린다. 새 스크립트는 :188에서 떨어뜨린다.
7. verify-dist는 00:10 KST 일일 발행(`fortune-daily-publish`)과 다른 세션 배포를 막으면 안 된다.
8. 승격할 때마다 `git log <운영 SHA>..origin/main`을 승인 패킷에 넣는다.
9. 겹치는 기존 검사는 지우지 않는다. main CI에서 10회 같은 판정을 낸 뒤 별도 커밋으로 지운다(CLAUDE.md:54).

## 정본 예시

- 워커 vm 하네스: `__tests__/ui/visitor-country-routing.test.mjs`
- 의존성 없는 ESM 원장: `lib/brand/brand-facts.mjs`

## 검증

```
npm run verify:handoff-contract
npm run check:fast
npm run check:pre-push
npm run verify:staging -- --sha=<40자리 SHA>
```

## 근거

- 이번 감사 보존본: `D:\Development\seo-audit\code-destiny-20261101\`(목록은 README.md)
- 10/29 감사: `D:\Development\seo-audit\code-destiny-20261029\ACTION-PLAN.md`
- 원 대화: `C:\Users\user\.claude\projects\C--Users-user\079f77bc-4a1f-4184-8376-249500b7d7ec.jsonl`

## 모르는 것

- 검색 수치(Codex 수집 전). 추측해서 채우지 않는다.
- 홈 역할: `/`와 `/ggulggul/` 중 어느 쪽을 홈 hreflang 묶음의 ko·x-default로 둘지. 묶음 ④ 승인 패킷에서 사용자가 정한다.
- `/yeongnyangi/free-fortune` 302를 영구로 둘지.

## 재개

- 새 세션은 `C:\Users\user`에서 열고 `/handoff D:\Development\codedestiny-worktrees\seo-architecture-rebuild-20261101-135310\docs\handoff\2026-11-01-seo-architecture-rebuild.md`로 시작한다.
- 작업 디렉터리는 `D:\Development\codedestiny-worktrees\seo-architecture-rebuild-20261101-135310`이다. 브랜치는 origin/main과 같은 지점까지 push됐다. 이어서 할 때는 `git fetch` 후 `git rebase origin/main`부터 한다.
- 다음 행동은 frontmatter `next`다.
