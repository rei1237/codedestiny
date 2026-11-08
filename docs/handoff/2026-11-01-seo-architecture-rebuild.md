---
status: active
updated: 2026-11-09
next: "묶음 ③ check:fast 결과 확인 → check:pre-push → main push → 스테이징 SHA 확인 → 승인된 운영 승격 1회 → 운영 실측·SEO Operations 기록."
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

### 2026-11-09 재개

- 사용자 요청: `D:\Development\seo-audit\code-destiny-20261101\bundle-3\approval-packet.md 참조해서 남은 seo 작업 마무리해줘`.
- origin/main과 운영 `/version.json`은 여전히 `9e8cec0a654040cf9115a5a2a2b3a1fe7eb75dea`. main CI 성공: https://github.com/rei1237/codedestiny/actions/runs/42465450472. 재리베이스 불필요. 루트 체크아웃의 다른 세션 변경은 건드리지 않는다.
- 이 워크트리의 기존 산출물 재검사: verify-dist 실패 0·경고 0. 새 빌드를 실행한 결과가 아니다. 증거: `D:/Development/seo-audit/code-destiny-20261101/bundle-3/verify-dist-20261109.json`.
- SEO 검출기 mock 테스트 67개, IndexNow 7개, canonical/verify-dist 38개 통과. 기존 커밋 트리의 check:pre-push 통과(사이트맵 1062개).
- 패킷 후속 결함 커밋 `d3ee5d140`: IndexNow가 공개 `/business/api/`, `/business/api/docs/`, `/yeongnyangi/season-1/`를 차단하던 오탐을 정확한 경로 예외로 수정. 비공개 하위 경로·쿼리·해시·인코딩 우회 차단 테스트 유지. dry-run 1062 URL 처리 성공, 외부 제출 없음.
- `verify-sitemap-canonical.mjs`의 argv 없는 import 오류 수정, 별도 Node eval 프로세스 회귀 검사 통과.
- `check:fast` 실행 중. 로그: `D:/Development/seo-audit/code-destiny-20261101/bundle-3/regression/check-fast-20261109.log`. 자동 critical 승격으로 추가 검사를 실행하며 실제 LLM·실결제·운영 DB 쓰기는 하지 않는다.
- 현재 검증 진도: 추가 가드 77/77, lint, sitemap drift, typecheck 통과 후 Node 테스트 진행 중. 시스템 여유 메모리 약 700MB에서 일시 정체. 동시 실행 수를 낮추려 했으나 프로세스 소유 관계 안전 단언에서 중단되어 종료 조치는 실행되지 않았다. 이후 기존 테스트가 다시 진행됐다. 다른 세션 프로세스에는 손대지 않았다.
- SEO Operations 최근 런은 성공: https://github.com/rei1237/codedestiny/actions/runs/42421948698. 패킷의 기존 실패 기록은 현재 상태가 아니다. 워크플로 수정 없음.
- 승인 상태(2026-11-09): 사용자 원문 `main push + 운영 승격 1회 승인`. 묶음 ③ 및 이번 후속 수정의 main 전달·운영 dispatch 1회 승인 완료. 반복 확인하지 않는다. 다른 묶음 승격·검색엔진 계정 제출·운영 DB 접근 승인은 포함하지 않는다.
- `D:/Development/seo-data/code-destiny/2026-11-01/`은 없음. 묶음 ④의 키워드 매핑·홈 역할 결정 및 ⑤의 단계별 승격을 완료로 처리하지 않는다. 실제 검색 성과는 미측정.

- 묶음 ③ 로컬 완료, 승인 대기(2026-11-08). origin/main `9e8cec0a6`(= 운영 `/version.json`) 위로 리베이스해 16커밋, HEAD `66e63dee6` 뒤에 이 문서 커밋. 리베이스 전 상태는 태그 `bundle3-pre-rebase`. 아래 SHA는 리베이스 전 값이다(리베이스 뒤: 계획 `6d801c27a`, T1 `018d10f55`, T2 `a08a0b134`, T3 `a6e87e1e3`, T4 `ea47b6b9a`, T5 `846473190`, T6 `4c9ccfe24`, T7 `4e40665a2`, 정책 페이지 `651667e09`, T8 `665f6489b`, T9 `f847607c4`). 리베이스 판단: upstream `0b70e9801`의 `/business/api/dashboard` 사이트맵 제외를 원장에 `meta: null, sitemap: false`로 옮김. 그 커밋의 coreRoutes 2줄(`/business/api`, `/business/api/docs`)은 첫 충돌 해결 때 빠져 `ea47b6b9a`에서 되살림(`a6e87e1e3`만 두 줄이 없다). 생성 파일 충돌은 생성기를 다시 돌려 해결. T10 결과: 최종 build:cf exit 0, verify-dist 실패 0·경고 0(hreflang-sitemap warn 185 → fail 0), index-state 차이는 upstream 새 페이지 3개뿐, 회귀 묶음 전부 exit 0, `check:pre-push` exit 0. 승인 패킷 `D:Developmentseo-auditde-destiny-20261101bundle-3pproval-packet.md`. 이전 기록: 계획 `1c448dd3c`, T1 `abbaa53ad`, T2 `5f05c0104`, T3 `e26a56301`, T4 `f64bb98d2`(googlebot meta 0, 페이지당 robots meta 최대 1, `index-state-t4.json` diff 0줄), T5 `1c2bdba88`, T6 `125794c4c`, T7 `6602003eb`, 정책 페이지 재생성 `4c077642b`, T8 `5a81a33a3`(verify-dist 규칙 robots-meta-count·index-ledger·hreflang-reciprocal 추가, 홈 클러스터 셸 5쪽 hreflang 을 빌드 때 alternatesFor(I18N_ROUTE_MAP.home)로 교체 → hreflang-sitemap 5→0, 네 규칙 모두 실 dist 0건이라 fail 로 올림, `verify-dist-t8.json` 실패 0·경고 0, `index-state-t8.json` diff 0줄), T9 `800556f5d`(submitIndexNowUrls·getAllSitemapUrls 삭제, INDEXNOW_ENDPOINT 는 export 로 유지, 근거 `dead-code-grep.txt`; seo-site-urls 변경으로 사이트맵 서명 120·lastmod 17건 재생성). 남은 것은 T10. T7 뒤 build:cf: verify-dist 실패 0, hreflang-sitemap 185→5(정적 셸 `/ggulggul/`·`/en/`·`/ja/`·`/zh/`·`/zh-tw/`의 index.html 블록 ko-KR·ja-JP·en-US), `index-state-t7.json` diff 0줄. 증거는 `D:\Development\seo-audit\code-destiny-20261101\bundle-3\`(기준 `build-before.log`·`verify-dist-before.json`·`index-state-before.json`, T3 뒤 `index-state-t3.json` diff 0줄).
  - 기준 verify-dist: 실패 0, hreflang-sitemap 경고 185(80·1·100·4).
  - 빌드에 `ALLOW_DEV_SERVER_DURING_BUILD=1`이 필요하다. 다른 세션 dev 서버(포트 32722)가 돌고 가드는 디렉터리를 가리지 않는다. 이 워크트리 `.next`는 별도 폴더다.
  - T4 함정: `verify-adsense-readiness`의 `verifyPrivateNoindexRoutes`가 `googleBot.includes("noindex")`를 단언한다. 정적 셸 robots 문자열(`static-shell-route-meta.mjs`)도 T4에서 정한다.
  - 사이트맵 쪽 파생 목록은 원소만 같고 순서는 다르다(`.some()`이라 무관). adsense 목록 3종은 뜻이 달라 원장 밖에 두고 부분집합 가드 테스트만 넣었다.
- 운영 SHA `9e8cec0a6`(2026-11-08 `/version.json` 실측, origin/main과 같다). 그 전 기록: `9ecd08743`(2026-11-04, 릴리스 런 https://github.com/rei1237/codedestiny/actions/runs/41739205895). 앞선 운영 `bf9c77a64` 위에 영냥이 AEO 결정 반영과 다른 세션 커밋이 더해졌다. 묶음 ③은 시작하지 않았다.
  - 2026-11-04 릴리스 런 41729564058(`914fca524`)은 배포 전 테스트에서 막혔고, 원인과 수정은 `docs/handoff/2026-11-03-aeo-remaining-work.md`의 "운영 재반영 완료"를 본다.
  - 아래 두 줄의 상세 실측은 이전 운영 `bf9c77a64` 기준이다. `9ecd08743`에서는 SHA, 주요 경로 상태 코드, `ai_source`만 다시 쟀다.
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
- [ ] 묶음 ③ — (T1~T10 로컬 완료, main push·운영 승격 승인 대기) 전 URL 색인 상태 diff 0, HTML과 사이트맵의 hreflang 집합 일치
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
