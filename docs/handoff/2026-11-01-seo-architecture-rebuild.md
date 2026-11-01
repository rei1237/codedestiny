---
status: active
updated: 2026-11-01
next: "설계 문서를 읽고 superpowers:writing-plans로 묶음 ①(V0 검사 도구·A2 메타/JSON-LD/robots·D1 날짜 계약) 작업 계획을 쓴 뒤 구현을 시작한다"
---

# SEO 아키텍처 재구축

## 왜

구글·네이버·빙 자연 검색으로 실제 신규 사용자와 구매 기회를 늘린다. 범위는 증거 기반 전수 감사 → SEO 구조 재설계 → 구현·테스트·운영 배포 → 7·28·90일 KPI다(2026-11-01 사용자 요청). 순위와 색인 시점은 보장하지 않는다.
설계 정본은 `docs/superpowers/specs/2026-11-01-seo-architecture-rebuild-design.md`(승인됨)다. 이 문서는 이어 가는 데 필요한 상태와 함정만 담는다.

## 첫 행동

1. 이 워크트리에서 이어 간다: `D:\Development\codedestiny-worktrees\seo-architecture-rebuild-20261101-135310`(브랜치 `wt/seo-architecture-rebuild-20261101-135310`). 새 워크트리를 만들지 않는다. 두 문서는 아직 origin/main에 없으니 이 경로에서 읽는다.
2. `git fetch origin` → `git status` → `git log --oneline -3`. origin/main이 앞서 있으면 `git rebase origin/main`.
3. 설계 문서를 끝까지 읽고 superpowers:writing-plans로 묶음 ① 계획을 쓴다. 브레인스토밍과 설계 승인은 끝났다. 설계 문서의 '확정된 결정'·'설계 판단'은 다시 묻지 않고, 운영 승격만 묶음마다 승인받는다.
4. `D:\Development\seo-data\code-destiny\2026-11-01\`(Codex 수집본, `manifest.csv`·`README.md`)이 생겼는지 본다. 생겼으면 설계 문서 근거 부록 6(원인 판정)과 묶음 ④ 매핑에 반영한다.

## 지금 상태

- 설계 승인, 코드 변경 0. 커밋: 설계 문서 `496c0bc62`, 이 문서(브랜치 HEAD). push 보류(사용자 규칙: push·배포는 요청할 때만).
- 운영 `a64a7cbf3`(11/01 확인). origin/main `a9634ff14`에는 다른 세션 커밋 2개(`0600c9717`·`a9634ff14`, 진로 리포트 결제)가 더 있어 다음 승격에 같이 실린다.
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

- [ ] 묶음 ① — verify-dist 실패 0, 경고가 감사 수치를 재현(og:url 8쪽, hreflang 100/80/8), 운영 `/version.json` SHA 일치
- [ ] 묶음 ② — vm 하네스 5개국×3UA 불변, 절대 Location 301 한 번, 결제 회귀 통과
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
- 작업 디렉터리는 `D:\Development\codedestiny-worktrees\seo-architecture-rebuild-20261101-135310`이다. 마지막 커밋은 이 문서를 담은 브랜치 HEAD다(부모 `496c0bc62`, 기준 origin/main `a9634ff14`). rebase하면 SHA가 바뀐다.
- 다음 행동은 frontmatter `next`다.
