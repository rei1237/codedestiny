---
status: done
updated: 2026-11-04
next: "없음. 소유자 작업은 docs/handoff/2026-11-04-owner-tasks-codex.md로 넘겼고 2026-12-01 재측정만 남는다"
---

# 영냥이 AEO 남은 작업

## 진행 결과

아래 "지금 상태"부터는 2026-11-03 18:30 KST 시점의 기록이다. 최종 결과는 이 절을 본다.

- **작업 1 완료.** 키 수정 `77c6d007f`가 운영에 반영됐다. 다른 세션의 릴리스 런 41658891499가 `bf9c77a64`를 운영에 올렸고, 이 AEO 세션은 운영 배포를 하지 않았다. 앞서 낸 런 41645119233은 배포 전에 취소돼 운영을 바꾸지 않았다.
- **라이브 재측정(2026-11-04, 한국 IP).** `/version.json`·`/api/version`이 `bf9c77a64`. `/yeongnyangi/`, `/`, `/saju/`, `/insights/`가 모두 `analytics.js?v=20261103-ai-source-v1`을 읽고 파일에 `ai_source`가 2건 있다. 캐시 헤더와 리다이렉트는 이전 측정과 같다. 증거는 `D:\Development\seo-audit\code-destiny-20261103\live-after-ai-source\`다. 미측정: 해외 IP, 실제 크롤러와 WAF, 영상 재생, 결제·로그인 화면, GA4 수신.
- **작업 2 돼지 이미지 완료.** 원인은 무버전 CSS와 1년 immutable 조합이었다. `01be950ce`로 HTML 참조에 `?v=`를 붙이고 `__tests__/ui/static-css-cache-keys.test.mjs`로 고정했다. 라이브 `/ggulggul/`은 `first-visit-guide.css?v=build-6a507f2c285e`를 읽고, 무버전 `/styles/` 참조가 0건이다. Chrome 모바일 3회 모두 `aspect-ratio: 5/6`, 이미지 폭 400%로 한 프레임만 보인다. WebKit과 실제 휴대폰은 측정하지 않았다.
- **작업 2 WebKit 완료.** 하네스 분류를 `55b7a3a47`(`activation-rewards` 읽기), `fbfaf07b7`(`/yeongnyangi/library/`의 GET 목록 읽기) 두 번 고쳤다. 앱 코드는 고치지 않았다. 수동 런 41662159066이 114건 전부 통과했고 WebKit은 43건이다. 전에는 간헐 실패였으므로 1회 통과로 재발 없음을 뜻하지는 않는다. 취소된 읽기라는 판단은 코드와 CI 기록에서 나온 추정이고, 로컬에서 WebKit으로 재현하지 않았다.
- **SEO Operations.** `54f8c5ebf`로 `Test detector` 앞에 `npm ci`를 넣었다. 로컬 65/65 통과, 다음 예약 실행의 CI 결과는 아직 보지 못했다.
- **기타.** `2401224a0`는 스타일시트 키 변경에 따른 시그니처 갱신이다. `/`는 `683b1c716`부터 서비스 선택 화면이라 MV가 없고 MV는 `/ggulggul/`에 있다. 그래서 `root-mv.cjs`는 더는 맞지 않는다. `/premium-unlock/`의 "프리미엄 해금 페이지를 여는 중입니다."는 동적 import 로딩 문구이고, 1회 측정에서 8.6초 뒤 실제 내용으로 바뀌었다. 고치지 않았다.
- **남긴 후속.** `content/product-details/*/editable-layout.html` 153개의 무버전 `/styles/service-intro-fonts.css`, `js/core/profile-character-card.mjs:38`의 동적 무버전 링크, 런 41661777631의 `--pages-only` 차단(다른 세션 런, 운영 영향 없음, 원인 미조사).
- **작업 3 결정 완료(2026-11-04).** 사용자가 "결정이 필요한 것은 사업적으로 가장 괜찮은 선택으로 진행해 니가 판단해줘"라고 위임했다. 결정과 근거는 아래 작업 3에 있다.
- **운영 재반영 대기(2026-11-04).** 릴리스 런 41729564058(`914fca524`)이 배포 전 테스트에서 막혔고 운영은 `bf9c77a64` 그대로다. 원인은 타로 난수로 흔들리는 토큰 테스트였고 `46f083c19`로 고정했다. 재배포는 사용자 확인을 받은 뒤 한다.

## 왜

2026-11-03 운영 배포 뒤 남은 일을 새 세션에서 잇는다. 사용자 요청 원문은 "남은 작업들도 진행해줘 새 새션에서 진행하도록 인수인계해서 진행하자"다.

가장 급한 일은 내 실수로 남은 결함이다. `js/core/analytics.js`를 고치면서 `app/layout.js`의 고정 캐시 키를 올리지 않아, `/yeongnyangi/`를 포함한 Next 페이지에서 AI 유입 라벨 `ai_source`가 동작하지 않는다.

## 첫 행동

1. 저장소 위치를 확인한다. 작업 위치는 `D:\Development\codedestiny-worktrees\yeongnyangi-aeo-20261103-140559`이고, 브랜치는 `wt/yeongnyangi-aeo-20261103-140559`다. 없거나 더럽다면 `scripts/create-safe-worktree.ps1`로 새로 만든다. 루트 체크아웃은 쓰지 않는다.
2. `git fetch origin` 뒤 `git log --format='%h %s' a221a78eb..origin/main`으로 운영보다 앞선 커밋을 확인한다. `curl -s https://code-destiny.com/version.json`으로 운영 SHA도 다시 확인한다.
3. 아래 "승인 범위"에 적은 내 해석을 사용자에게 한 줄로 알리고 작업 1을 시작한다. 답을 기다리느라 멈추지는 않는다.

## 지금 상태

2026-11-03 18:30 KST 무렵 실측이다.

- 운영: `a221a78eb1c667a4e00976f562e62f5298f48503`. 런은 https://github.com/rei1237/codedestiny/actions/runs/41601761405 이고 성공했다.
- 롤백 기준: `ed3f7f2d1`.
- origin/main: `6ae9f0298` (문서만 추가, 배포 안 함). PR CI는 통과했다. 이 SHA의 스케줄 Release 런은 판단 단계만 돌고 배포를 건너뛰었다.
- 결함 근거: `/`, `/yeongnyangi/`, `/saju/`, `/insights/`는 `analytics.js?v=20261103-discovery-v1`을 읽는다. 이 응답은 엣지 캐시 HIT(Age 5128)였고 `ai_source`가 0건이었다. `/ggulggul/`, `/en/`, `/static/`은 `build-46cffa3b99f9` 키로 라벨이 들어 있는 파일을 읽는다.
- 키 사용처: 코드에서 `discovery-v1`은 `app/layout.js:188` 한 곳이다. 이 키를 고정한 테스트는 없다.
- 미측정: 해외 IP, 실제 크롤러와 WAF, 영상 재생, 결제·로그인 화면, 변경 후 AI 답변.

## 승인 범위

앞 세션의 운영 배포 승인 1회는 런 41601761405로 소진됐다. 그 보고에서 `ai_source` 수정은 "승인해 주시면 진행하겠습니다"라고 물었고, 사용자가 "남은 작업들도 진행해줘"라고 답했다.

내 해석은 다음과 같다. 사용자가 확인해 준 것은 아니므로 첫 행동에서 알린다.

- **포함:** `ai_source` 키 수정의 운영 배포 1회.
- **먼저 확인:** 그 배포에 다른 세션의 기능 코드 커밋이 함께 올라가면, 커밋 목록을 보여 주고 승격 전에 확인받는다. 문서만 바꾼 커밋은 목록만 보고한다.
- **제외:** 묶음 ③, `docs/handoff/2026-11-02-seo-post-promotion-followups.md`, SEO Operations의 Test detector 실패, 아래 작업 3의 제품 변경. 사용자가 따로 말할 때만 한다.

## 지켜야 할 것

사용자 원문이다. 그대로 유효하다.

- "롤백은 git revert 후 재배포만 해. force-push, reset --hard, stash, 로컬 wrangler 배포는 금지야."
- "루트 체크아웃 D:\Development\code-destiny와 다른 세션 워크트리는 건드리지 마."
- ".env*, package-lock.json, ads.txt, worker/, public/_routes.json, js/core/checkout-entry.js, 결제·인증·DB·운세 계산 로직은 수정하지 마."
- "실결제, 운영 DB 쓰기, 과금 LLM 호출은 하지 마."
- "SEO Operations의 Test detector 실패는 11/01부터 있던 별도 문제야. 이번에 고치지 말고 후속으로만 남겨 둬."
- "묶음 ③과 docs/handoff/2026-11-02-seo-post-promotion-followups.md는 시작하지 마."
- "다른 세션 커밋이 더 올라오면 새 HEAD로 다시 확인해. 다른 사람 커밋 때문에 빨간불이면 그 커밋을 보고하고 위에 push하거나 배포하지 마."
- 배포 "실패하면 원인을 보고하고 임의로 다시 돌리지 마."
- AEO 원 지시: "특정 AI가 추천하지 않았더라도 추천했다고 허위 보고하지 않는다." "출처가 확인되지 않는 직접 유입을 임의로 AI 추천 유입으로 분류하지 않는다." "확인되지 않은 성과나 검색 노출 보장은 보고하지 않는다."

## 작업 절차

push: `git fetch` → `git rebase origin/main` → `npm run check:pre-push` → `git push origin HEAD:main`. `git add` 전에 `git status`와 `git diff --stat`을 보고, 파일 이름을 지정해 스테이지한다.

CI: main 맨 위 SHA의 PR CI가 끝날 때까지 `gh run watch --exit-status`로 기다린다. Browser Shadow는 필수 게이트 밖이다. PR CI로 판단한다.

배포: `gh workflow run cloudflare-pages-deploy.yml --ref main -f mode=production --repo rei1237/codedestiny`. 런 URL을 사용자에게 전하고 끝까지 결과를 확인한다.

함정:

- `build:cf`를 돌리면 rss 4개(`insights/rss.xml`, `public/insights/rss.xml`, `public/rss.xml`, `rss.xml`)가 바뀐다. `git checkout --`으로 되돌리고 커밋하지 않는다.
- `js/core/analytics.js`를 다시 고치면 정적 미러의 `build-<hash>` 키도 바뀐다. 그때는 `npm run sync:public` 결과를 함께 커밋한다.
- `config/sitemap-lastmod.json` 충돌은 병합하지 말고 `npm run sitemap:generate`로 다시 만든다.
- 측정 스크립트는 `D:\Development\seo-audit\code-destiny-20261103\scripts\`에 있다. `live-measure.sh`의 두 검사는 믿지 않는다. `aiSourceLabel` 검색은 코드가 압축돼서 항상 0이므로 `ai_source`를 센다. `cdhMoonlightMv` 검사는 `/`에 맞지 않으므로 홈 영상은 `root-mv.cjs`로 본다.

## 작업 1: ai_source 수정과 운영 배포

1. `app/layout.js:188`의 키를 새 값(예: `20261103-ai-source-v1`)으로 올린다. 다른 파일은 바꾸지 않는다.
2. 대상 테스트 `__tests__/ui/purchase-analytics.test.mjs`를 돌리고 커밋한 뒤 위 절차로 push하고 PR CI를 확인한다.
3. 다른 세션 커밋을 확인한다(`git log a221a78eb..origin/main`). "승인 범위"에 따라 진행한다.
4. 운영에 1회 배포하고 `/version.json`의 SHA를 확인한다.
5. 라이브를 재측정한다.
   - `/yeongnyangi/`, `/`, `/saju/`, `/insights/`의 HTML이 새 키를 쓰고, 그 키의 응답에서 `ai_source`가 1건 이상인지 센다.
   - `live-measure.sh`, `root-mv.cjs`, `mv-shots.cjs`로 앞 배포의 측정 항목(상태 코드, Cache-Control, 리다이렉트, 플레이스홀더 0건, JSON-LD, robots, 영상)이 그대로인지 본다. 결과는 `live-after-ai-source\`에 따로 저장하도록 `OUT` 경로를 바꿔 실행한다.
6. `docs/seo/SEO_STATE.json:429`의 `productionObservedSha`, `docs/handoff/2026-11-01-seo-architecture-rebuild.md`의 "지금 상태", `docs/handoff/2026-11-03-yeongnyangi-aeo.md`의 결함 문단을 고친다. 문서 커밋은 재배포하지 않는다.

같은 실수를 막는 가드(`analytics.js`가 바뀌면 키도 바뀌었는지 검사)는 이번에 넣지 않는다. 필요성만 후속으로 보고한다.

성공 기준은 라벨이 배포됐다는 것까지다. 실제 AI 유입 건수나 GA4 보고서 값은 이 작업으로 확인되지 않으므로 성과로 보고하지 않는다.

## 작업 2: 조사 후 보고 (고치지 않음)

원인을 확인해 보고만 한다. 고치려면 사용자에게 묻는다.

- **Browser Shadow의 WebKit 오류.** `/api/activation-rewards/status`와 `/snu/status`가 "due to access control checks"로 실패한다. `a221a78eb`와 `25bfc0940` 모두에서 났고, 내 변경 때문인지는 확인되지 않았다. 필수 게이트는 아니다.
- **`/ggulggul/` 모바일 첫 방문 안내의 잘린 두 번째 돼지 이미지.** 스크린샷은 `D:\Development\seo-audit\code-destiny-20261103\live-after\mv-mobile-guide.png`다. 문구는 `js/first-visit-copy.mjs`에 있다. 조사 전이고 다른 세션 작업일 수 있으니 `git log`부터 본다.

## 작업 3: 결정 기록

2026-11-04 결정이다. 전환·원가 효과는 측정하지 않았다.

- **허브 CTA: 8챕터 질문 경로로 바꿈.** `/yeongnyangi/1000-won-fortune/`의 CTA를 `consultationKind=ask`에서 `/yeongnyangi/fortune/?flow=question&domain=saju&fish=mackerel`로 바꿨다. 같은 5,000원에 5챕터 경로로 보내면 구매자가 손해이고 랜딩 문구와도 어긋난다. `YeongnyangiGuide`의 `fishRows`가 이미 쓰는 경로이고 worker·결제·가격은 고치지 않았다. 운영에서 이 URL이 질문 입력 화면으로 열리는 것을 비로그인 390px로 확인했다(결제 안 함). 8챕터의 LLM 원가 증가는 측정하지 않았다. 메뉴에서 상담 종류를 고르는 경로의 5챕터는 그대로다.
- **`SampleExposure`: 샘플별 ID로 분리.** 정본을 하나로 합치지 않았다. `contentId`를 필수 prop으로 바꿔 타로·연어 샘플은 `tarot-salmon-question-v1`, 고등어 샘플은 `mackerel-question-v1`로 보낸다. 타로·연어 샘플이 고등어로 기록되던 측정 오류를 고쳤다. 과거 데이터는 `item_id`로 구분한다.
- **claude.ai 링크: 공개 화면 3곳에서 제거.** `YeongnyangiGuide.tsx`, `js/consultation-sample-guide.mjs`, `js/feature-detail-panels.mjs`다. 대상 페이지는 링크 공유 상태이고 제목이 옛 서비스명이며, 시험 프로필, 모델명, 호출 수, 비용, 토큰, 품질 이슈가 보인다. 아티팩트 자체는 삭제하지 않았고 공유 해제는 소유자가 판단한다. `content/product-details/*/manifest.json`, `lib/marketing/result-samples.json`, `public/feature-details/*.json`의 `sourceUrl` 데이터는 남겼다. 화면에 링크로 나오지 않지만 공개 JSON에 URL 문자열은 남아 있다.
- **대운·세운 가이드: 링크를 넣지 않음.** 애드센스 검수 원고 해시가 깨져 재검수가 필요한데 이득이 불확실하다.
- **`/premium-unlock/`: 고치지 않음.** 2026-11-04 3회 재측정이 2,083·2,185·2,336ms였다(이전 1회 8.6초). noindex이고 사이트맵 밖이다.
- **결정이 아니라 조건 대기.** 구매 이벤트 중복과 실구매 대사는 자연 발생 주문으로만 검증된다. GA4 CSP 수정 `wt/ga4-csp-diagnosis-20261030-103058`은 다른 세션 워크트리이므로 건드리지 않았다.

## 소유자 작업

Codex가 실행하도록 `docs/handoff/2026-11-04-owner-tasks-codex.md`로 넘겼다. 실제 후기는 사람만 쓸 수 있어 제외했다. 아래는 원래 목록이다.

- GA4 맞춤 측정기준 `ai_source` 등록. 작업 1의 배포 뒤에 해야 값이 쌓인다.
- Bing Webmaster, Copilot 로그인 뒤 기준선 조회.
- WordPress 링크, 프로필 정합, 실제 후기, Cloudflare WAF 실제 봇 처리 확인.
- 선택: GSC에서 `/yeongnyangi/` URL 검사. 사이트맵 재제출은 필요 없다.

## 나중에

- 승격 28일 뒤(2026-12-01 이후) `aeo-evaluation.csv` Q17~Q24 재측정. 절차는 `docs/handoff/2026-11-03-yeongnyangi-aeo.md`에 있다.
- 11/07 관측 뒤 묶음 ④ 판단. 후보 문안은 같은 문서에 있다.

## 끝낼 때

`status: done`으로 바꾸고 결과 SHA를 적는다. 워크트리를 지울 때는 `node_modules` 정션을 먼저 끊는다.

```powershell
(Get-Item -LiteralPath '<워크트리>\node_modules' -Force).Delete()
git worktree remove --force '<워크트리>'
```

보고는 한국어로 하고, 실측과 추정을 나누고, 함께 올라간 다른 세션 커밋을 적는다.
