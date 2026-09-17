---
status: active
updated: 2026-09-17
next: 조사 완료(실측: robots.txt 6곳이 통합+로케일5개 전부 선언, 진짜 파티션 중복 확인). 옵션 A(robots.txt에서 통합 sitemap.xml 선언 제거) 권장 — 사용자 확인 후 구현만 남음
---

# SEO 개편 — P2: sitemap 중복 제출

## 왜

[docs/handoff/2026-09-17-seo-p1-followup.md](2026-09-17-seo-p1-followup.md)의 P2 항목을
사용자가 "P2가 더 심각한 것 같다"고 우선 지정. P1(zh-TW 4허브, compatibility
다국어화, 소개 페이지 FAQ 확장, sitemap lastmod 드리프트 정리)은 전부 완료·
push·CI 초록 확정됨(`91326b771` 기준). 이 문서는 P2 착수 직전 상태에서,
사용자가 "별도 세션이 낫겠다"고 판단해 인수인계로 전환한 것 — 이 세션은
조사를 시작만 하고 완료하지 못했다.

## 지금 상태

- P1 전부 완료. 최신 main: `91326b771`(이 문서 작성 시점) 또는 그 이후
  (다른 세션이 동시에 `02cbb5127`(compatibility en title/description SERP
  표시폭 수정)을 커밋한 것을 확인함 — 여러 세션이 같은 작업 디렉터리를
  공유 중이니 시작 전 `git pull --ff-only` 필수).
- **P2 조사는 이 세션에서 완료됨(구현은 다음 세션 몫).** 아래 "실측 결과"가
  Explore 서브에이전트가 코드를 직접 읽고 확인한 결과다 — 재조사 불필요.

## 실측 결과 (2026-09-17, 재조사 불필요)

1. **생성 구조** — `scripts/generate-sitemap.mjs`(852-857행 `main()`)가 통합
   `sitemap.xml`을 루트+`public/`에 쓰고, `scripts/lib/locale-sitemaps.mjs`의
   `splitLocaleSitemaps(xml)`로 로케일별 5개(`sitemap-ko/ja/en/zh/zh-tw.xml`)를
   만들어 역시 루트+`public/` 양쪽에 쓴다. 전부 평평한 `<urlset>`이며
   `<sitemapindex>` 포맷은 레포 어디에도 없음(`grep sitemapindex` 전체 0건 —
   처음부터 새로 만들어야 함).
2. **파티션 관계(진짜 중복 확인)** — `splitLocaleSitemaps`는 `sitemap.xml`의
   모든 `<url>` 블록을 URL 첫 경로 세그먼트로 정확히 5개 파일 중 하나에만
   배정한다(교집합 없음, 합집합 = `sitemap.xml`과 정확히 동일).
   `__tests__/ui/seo-trust-locales.test.js:7-22`가 이걸
   `assert.deepEqual(...)`로 강제한다. 즉 **통합본과 5개 로케일본은 콘텐츠가
   바이트 단위로 동일한 URL 집합의 중복 표현**이다 — 내부 산출물이 아니라
   실제로 똑같은 내용을 두 가지 형태로 두 번 제출 중.
3. **실제 제출 지점** — `robots.txt`와 `public/robots.txt` 320~326행
   (`app/robots.ts` 93행이 동적 생성 정본)에 **6개 Sitemap: 지시줄이 전부**
   선언돼 있음: `sitemap.xml` + `sitemap-ko/ja/en/zh/zh-tw.xml` 5개. 크롤러
   입장에서 같은 1281개 URL을 6개 파일을 통해 두 번(통합 1번 + 로케일
   분할로 1번) 알게 되는 구조 — 이게 P1 문서가 말한 "중복 제출"의 실체.
4. `docs/SEO-AUDIT.md`/`docs/SEO-LOCALE-AUDIT.md`는 실제로 존재하지 않음
   (경로 오기 — 실제 파일은 `docs/seo/SEO_AUDIT.md`이며 제출 전략 논의
   없음). `docs/context/seo-and-adsense.md`도 제출 전략 언급 없음 — 이
   결정은 완전히 새로 내려야 함, 참고할 기존 결정 없음.

## 남은 작업 — 방향 결정 후 구현

두 옵션(둘 다 실행 가능, 트레이드오프만 다름):

- **옵션 A(권장, 낮은 위험) — robots.txt/app/robots.ts에서 통합
  `sitemap.xml` 선언만 제거**, 로케일 5개만 유지. `generate-sitemap.mjs`는
  그대로 둬도 됨(통합본 자체는 계속 생성해도 무방 — 단지 크롤러에
  "제출"만 안 하면 됨). 코드 변경량 최소, 새 포맷 불필요, 기존 테스트
  (파티션 검증)에 영향 없음. 단점: 통합 `sitemap.xml`을 외부 도구·수동
  확인용으로 쓰던 관행이 있다면 그 용도가 사라짐(레포 내에서는 그런 용도
  확인 안 됨).
- **옵션 B(더 큰 변경) — `sitemap.xml`을 실제 `<sitemapindex>`로 전환**해
  5개 로케일 파일을 가리키게 함. `generate-sitemap.mjs`/
  `locale-sitemaps.mjs`에 index 포맷 생성 로직을 새로 추가해야 함(기존
  코드에 전혀 없음). 구글이 권장하는 "대량 URL은 index로 묶어라" 관례에는
  더 부합하지만, 이 레포는 1281개 URL로 index가 필요할 규모(통상
  50,000개/파일 한도)가 전혀 아니라서 이득이 크지 않음 — 과설계 가능성.

**권장: 옵션 A.** 1281개는 index가 필요한 규모가 아니고(단일 sitemap 한도
50,000 URL의 극히 일부), 로케일 분할은 이미 `hreflang` 편의를 위해 존재하는
구조이므로 robots.txt에서 통합본 선언만 빼는 게 가장 낮은 위험으로 "중복
제출"을 해소한다. 단, robots.txt 변경은 크롤러 동작에 영향을 주는 항목이라
**사용자 확인 후 진행** 권장(GREEN이지만 결정 자체는 사용자 몫으로 CLAUDE.md
코딩 원칙 5·7 취지에 맞음).

## 정본 예시

- `scripts/generate-sitemap.mjs` — sitemap 생성 로직 정본.
- `scripts/lib/locale-sitemaps.mjs` — 로케일 분할 로직.
- `__tests__/ui/seo-trust-locales.test.js:7-23` — 파티션 정합성 테스트.
- `config/sitemap-lastmod.json` — lastmod 원장(이번 P1 세션에서 두 번
  드리프트 정리함 — [[seo-sitemap-adsense-pitfalls]] 참고: "드리프트 원인은
  재생성+diff로만 증명").

## 함정

- sitemap 소스는 `generate-sitemap.mjs` 뿐 — 이걸 거치지 않은 수동 수정은
  다음 `--check` 가드에서 드리프트로 잡힌다.
- `app/**` 라우트 변경이 원장을 무효화할 수 있음(이번 세션에서 description
  텍스트 변경만으로도 lastmod 드리프트가 두 번 발생했다 — 콘텐츠 변경도
  시그니처에 포함됨을 실측).
- 여러 세션이 같은 작업 디렉터리(main 체크아웃)를 공유 중 — 시작 전
  `git status`·`git pull --ff-only`로 최신 상태 확인 필수, 쓰는 세션이
  둘 이상이면 워크트리 격리 고려.

## 검증

```
npm run check:fast          # 코드 수정 시
npm run verify:sitemap-drift   # sitemap 관련 수정 후 필수
```

## 모르는 것

- Search Console에 실제로 몇 개가 "제출"돼 있는지(수동 제출 상태는 레포
  밖 정보라 이 세션 권한으로 확인 불가 — GSC 접근이 있는 세션에서 확인).
  robots.txt 선언과 GSC 수동 제출 목록이 다를 수 있음(GSC는 과거에 수동
  등록된 것이 남아있을 수 있어 robots.txt만으로 완전한 그림은 아님).
- 옵션 A(robots.txt에서 통합본 선언 제거) 적용 후 실제 색인 상태 변화는
  GSC 반영에 시간이 걸려 이번 세션 범위에서 검증 불가 — 배포 후 관찰
  필요.

## 다음 세션 첫 문장

`git pull --ff-only && git log --oneline -3` 로 최신 상태 확인 후, 위
"실측 결과"는 재조사 없이 신뢰하고 바로 사용자에게 옵션 A(권장)/B 중
확인 요청 → 승인 시 `robots.txt`, `public/robots.txt`, `app/robots.ts`
세 곳에서 `Sitemap: https://code-destiny.com/sitemap.xml` 줄만 제거(로케일
5개 줄은 유지) → `npm run check:fast`로 검증 → 커밋(GREEN, robots.txt
텍스트 변경이라 동작 경계는 "크롤러가 읽는 목록"에 한정) → push.
`generate-sitemap.mjs`는 수정 불필요(통합본은 계속 생성해도 무방, 단지
robots에서 광고만 안 하면 됨) — 코드 로직 변경 없이 텍스트 3곳만 고치는
가장 작은 단위 커밋이 될 것.
