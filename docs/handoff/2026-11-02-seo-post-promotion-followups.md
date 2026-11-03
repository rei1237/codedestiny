---
status: active
updated: 2026-11-02
next: "P1 famous-saju JSON-LD 4곳을 serializeJsonLd로 바꾸고 check:fast → 커밋한다"
---

# SEO 묶음 ① 운영 승격 뒤 후속 과제

## 왜

묶음 ①과 후속 정리(그룹 A~E)가 2026-11-02 운영에 올라갔다. 승격 런은 https://github.com/rei1237/codedestiny/actions/runs/41335766465 이고, `/version.json` gitSha는 `6d514ecaf5561b2cda4b412c128dd2098e261015`(buildTime 2026-11-01T18:27:51.868Z)다. 이 문서는 범위 밖으로 미룬 작은 항목과 승격 뒤 관찰할 것을 모은다.
큰 흐름(묶음 ② A1 엣지부터)은 `docs/handoff/2026-11-01-seo-architecture-rebuild.md`가 정본이다. 여기서는 그 흐름을 막지 않는 작은 일만 다룬다.

## 첫 행동

1. 루트 체크아웃 `D:\Development\code-destiny`는 다른 세션 브랜치(`feat/world-cast-page`)다. 건드리지 않는다. `scripts/create-safe-worktree.ps1 -Slug seo-post-promotion`으로 origin/main 워크트리를 만들어 거기서 한다.
2. `git fetch origin` → `git log --oneline -3 origin/main`. 운영 SHA는 `curl -s https://code-destiny.com/version.json`으로 한 번만 본다.
3. 아래 단계를 위에서부터 한다. 단계마다 `npm run check:fast` → 커밋, 안정 시점에 `git push origin HEAD:main`.

## 지금 상태 (2026-11-02 확인)

- 운영 확인: 승격 런 success, `/version.json` gitSha 일치, PR CI는 `6d514ecaf`·`1d6227b4f` 모두 green.
- 운영 운세 Article 날짜는 D2 설계대로다. today·tomorrow·weekly는 `2026-11-02T00:00:00+09:00`이고, monthly는 발행 `2026-11-01T00:00:00+09:00`, 수정 `2026-11-02T00:00:00+09:00`이다. `node scripts/verify-fortune-freshness.mjs`(GET만)도 4개 기간 모두 통과했다.
- 운영 sitemap.xml 홈 lastmod는 `2026-11-01`이다.
- 묶음 ①·후속 커밋: D1 `b39779b92`, 소급 `3ea746a53`, D2 `6e93e306f`, D3+D4 `169c39614`, D5 `6d514ecaf`, 문서 `1d6227b4f`. 그 앞 A~C·E SHA는 `docs/handoff/2026-11-02-seo-bundle-1-followups.md`에 있다.
- 운영 승격 승인은 1회용이었고 이미 썼다. 이 문서의 어떤 단계도 운영 배포를 포함하지 않는다.

## 단계

- [ ] P1 `app/insights/famous-saju/[slug]/page.tsx:916-922`의 JSON-LD 4곳(person·article·faq·breadcrumb)이 아직 `JSON.stringify`다. 다른 페이지처럼 `serializeJsonLd`로 바꾼다. FAQ는 기존 출력 유지만 하고 새 FAQPage는 만들지 않는다. 바뀐 페이지 소스라 `npm run sitemap:generate` 결과(`config/sitemap-lastmod.json`, sitemap XML)를 같은 커밋에 넣는다.
- [ ] P2 `/insights/*` 113쪽이 frontmatter 날짜를 `T00:00:00.000Z`(UTC 자정 = KST 09:00)로 내보낸다. 날짜 문자열 또는 `+09:00`로 바꾸는 곳을 찾고, 바꾼 뒤 jsonld-dates를 시각 단위로 좁힐 수 있는지 실제 build:cf dist 0건으로 판단한다. 0건이 아니면 규칙은 그대로 둔다.
- [ ] P3 tarot/prompt-maker·yeon-star-hug og:image에 남은 낡은 `?v=aa88d371b4`를 현재 버전 규칙에 맞춘다. 이미지 파일 자체는 바꾸지 않는다.
- [ ] P4 IndexNow 1회 재제출 관찰. D1 원장 v2 전환으로 키가 lastmod:signature가 되어 다음 배포 때 830 URL이 한 번 다시 제출된다. 다음 운영 배포 런 로그 요약(폴링 없이 끝난 뒤 한 번)에서 제출 수가 830 근처인지, 그다음 배포에서 바뀐 쪽만 나가는지 본다. 크게 다르면 `scripts/lib/sitemap-lastmod.mjs`의 서명과 저장된 원장 버전을 비교한다.
- [ ] P5 D1 원장 동작 관찰. 공유 모듈(팬인 80% 이상 10개 파일)만 바꾼 커밋에서 lastmod가 오르지 않는지, 페이지 하나만 바꾼 커밋에서 그 경로만 오르는지 다음 두세 개 main 커밋의 `config/sitemap-lastmod.json` diff로 확인한다. 기록만 하고 고칠 게 있으면 별도 단계로 만든다.
- [ ] P6 `/fusion-fortune` 정리는 소유자 판단이다. 사이트맵에서는 빠져 있는데 `verify-seo-entity-registry`가 "published canonical hub"로 단언한다. 둘 중 하나로 맞추는 안(사이트맵 포함 또는 registry에서 noindex로 표기)을 근거와 함께 사용자에게 한 번 묻는다. 답 전에는 지우지 않는다.
- [ ] P7 `FORTUNE_RENDER_WINDOW_MS`(3h)는 빌드 시간을 덮는다. 워크플로 timeout은 fortune-daily-publish 70분, cloudflare-pages-deploy 최대 60분이라 지금은 충분하다. 빌드가 3h를 넘는 일이 생기면 그때 다시 본다. 확인했으면 체크만 한다.
- [ ] 끝: 이 문서 `status: done`, 만든 워크트리 배수(junction 해제 → `git worktree remove --force` → `git branch -d`), `.tmp` 삭제.

verify-dist 경고(hreflang-sitemap 185 = code-sitemap-only 80·html-only 1·xdefault-sitemap-only 100·one-way 4, 엣지 3/1/4)는 묶음 ②·③ 몫이다. 여기서 고치지 않는다.

## 함정

1. 페이지 소스나 공유 모듈을 바꾸면 `npm run sitemap:generate` 결과를 같은 커밋에 넣는다. 안 그러면 `sitemap:check`가 CI에서 실패한다.
2. 빌드 뒤 rss 변동은 `git checkout -- rss.xml insights/rss.xml public/rss.xml public/insights/rss.xml`로 되돌린다.
3. verify-dist에 실패 규칙을 더하거나 warn→fail로 바꾸기 전에 실제 build:cf dist에서 0건을 확인한다. 00:10 KST `fortune-daily-publish`를 막으면 안 된다.
4. `npx playwright install`은 하지 않는다. Playwright 기준 실패 2건은 허용된 상태다.
5. 겹치는 기존 검사는 지우지 않는다(CLAUDE.md).
6. origin/main은 다른 세션 커밋으로 자주 움직인다. push 전에 `git fetch` → `git rebase origin/main` → `npm run check:pre-push`.
7. 결제·이용권·인증·DB·운세 계산 로직, 메인 디자인, `.github/workflows/*`는 범위 밖이다.

## 검증

```
npm run verify:handoff-contract
npm run check:fast
npm run sitemap:check
npm run check:pre-push
```

## 금지

- 과금 LLM 검증, 실결제·운영 DB 쓰기·환불·정산.
- `.env*`, `package-lock.json`, `.wrangler/`, `dist/`, `out/`, 마이그레이션 결과물, `worker/wrangler.toml` 구조 수정.
- 비밀정보 출력·저장·커밋, 요청 밖 삭제, 다른 세션 워크트리·파일 삭제.
- 새 FAQPage/HowTo, 사실이 아닌 구조화 데이터.
- push를 배포 승인으로 보지 않는다. 운영 승격은 매번 따로 승인받는다(`gh workflow run cloudflare-pages-deploy.yml --ref main -f mode=production`, 롤백은 `mode=rollback`). 런은 URL만 전하고 `gh run watch`·`gh run view --log`로 폴링하지 않는다. 로컬 wrangler 배포 금지.

## 근거

- 승격 런: https://github.com/rei1237/codedestiny/actions/runs/41335766465
- 이전 후속 정리: `docs/handoff/2026-11-02-seo-bundle-1-followups.md`(그룹 A~E, 판단 기록 포함)
- 큰 흐름: `docs/handoff/2026-11-01-seo-architecture-rebuild.md`, 설계 `docs/superpowers/specs/2026-11-01-seo-architecture-rebuild-design.md`
- 원 대화: `C:\Users\user\.claude\projects\C--Users-user\99675bd9-d6c6-48e2-b373-e30c12e35901.jsonl`

## 재개

- 새 세션은 `C:\Users\user`에서 열고 `/handoff docs/handoff/2026-11-02-seo-post-promotion-followups.md`로 시작한다. 루트가 뒤처졌으면 `git show origin/main:docs/handoff/2026-11-02-seo-post-promotion-followups.md`로 읽는다.
- 다음 행동은 frontmatter `next`다.
