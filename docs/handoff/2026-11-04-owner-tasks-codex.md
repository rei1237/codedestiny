---
status: done
updated: 2026-11-04
next: "2026-12-01 이후 Q17~Q24 재측정은 별도 인수인계 절차로 진행한다"
---

# 영냥이 AEO 소유자 작업 (Codex 실행용)

## 왜

사용자 요청 원문: "내가 직접해야할것은 코덱스로 해당할 수 있도록해주고 결정이 필요한 것은 사업적으로 가장 괜찮은 선택으로 진행해 니가 판단해줘"

코드로 끝낼 수 없고 외부 콘솔에 로그인해야 하는 일을 모았다. 코드 결정은 `docs/handoff/2026-11-03-aeo-remaining-work.md`의 작업 3에서 이미 끝났으니 다시 판단하지 않는다.

## 권한 범위

| 작업 | 바꿔도 되는 것 | 소유자 "적용" 답변 |
|---|---|---|
| 1. GA4 `ai_source` | 맞춤 측정기준 1개 추가 | 필요 없음 |
| 2. Bing Webmaster 조회 | 없음 | 해당 없음 |
| 3. Copilot 질문 세트 | 없음 | 해당 없음 |
| 4. GSC `/yeongnyangi/` | 색인 요청 최대 1회(조건은 작업 4) | 필요 없음 |
| 5. Cloudflare 봇 처리 | 없음. 읽기만 | 해당 없음 |
| 6. 프로필·WordPress 점검 | 초안 작성까지 | 게시·수정 전에 항목별로 필요 |

다음은 Codex가 하지 않는다.

- 실제 후기 작성. 후기는 실제 구매자만 쓸 수 있다. 사람을 대신해 쓰거나 다듬어서 후기처럼 올리지 않는다.
- 기고문 제출, 외부 글 발행, 댓글, 서로이웃 신청.
- WAF·Bot Fight·robots 설정 변경. 특히 WAF 통째 해제.
- 비밀번호·OTP 입력 요구, API 토큰·쿠키·`.env*` 값 출력, 콘솔 화면의 계정 식별 정보 기록.
- 없는 추천을 있다고 적기, 출처 없는 직접 유입을 AI 유입으로 분류하기, 성과나 노출 보장 보고.
- 측정을 위해 가짜 AI 유입을 만들기(`utm_source=chatgpt.com`을 붙여 운영 사이트 방문 등).
- 저장소의 `.env*`, `package-lock.json`, `ads.txt`, `worker/`, `public/_routes.json`, `js/core/checkout-entry.js`, 결제·인증·DB·운세 계산 로직 수정. 실결제, 운영 DB 쓰기, 과금 LLM 호출, 운영 배포.
- 루트 체크아웃 `D:\Development\code-destiny`와 다른 세션 워크트리 수정.

## 첫 행동

1. `AGENTS.md`와 `CLAUDE.md`를 읽는다. `git fetch origin` 뒤 이 문서가 `origin/main`에 있는지 확인한다.
2. `powershell -File scripts/create-safe-worktree.ps1 -Slug owner-tasks`로 워크트리를 만들고 거기서 기록한다.
3. 쓸 수 있는 브라우저 도구에서 아래 콘솔의 로그인 상태를 확인한다. 로그인돼 있지 않은 콘솔은 그 작업만 건너뛰고 "소유자 로그인 필요"로 적는다. 소유자가 같은 브라우저에서 로그인하면 이어서 한다. 2단계 인증과 비밀번호는 소유자가 직접 입력한다.
4. 작업은 서로 독립이다. 하나가 막혀도 나머지를 계속한다.

## 작업 1: GA4 `ai_source` 맞춤 측정기준 등록

- 대상: 속성 526361229, 측정 ID `G-FMHV4ZHY3G`(`docs/handoff/ga4-tag-quality-20261029.md:76`).
- 경로: 관리 → 데이터 표시 → 맞춤 정의 → 맞춤 측정기준 만들기. 화면 이름이 다르면 같은 기능을 찾는다.
- 먼저 목록을 본다. `ai_source`가 이미 있으면 새로 만들지 않고 그 사실만 적는다.
- 값: 측정기준 이름 `AI Source`, 범위 `이벤트`, 이벤트 매개변수 `ai_source`. 정확히 이 철자다(`js/core/analytics.js:154,293`).
- 완료 확인: 맞춤 측정기준 목록에 위 행이 보인다.
- 값이 바로 나오지 않아도 실패가 아니다. 값은 등록 뒤 실제 유입부터 쌓이고, 라벨은 `chatgpt`, `perplexity`, `gemini`, `copilot`, `claude`만 나온다. 분석 동의가 없는 방문은 집계되지 않을 수 있다. 0건을 그대로 적는다.
- 과거 데이터는 소급되지 않는다. 기존 기준선은 세션 733, aiAssistant 1(2026-10-06~11-02)이고 `ai_source` 값과 비교할 수 없다.

## 작업 2: Bing Webmaster 조회

읽기만 한다. 사이트 추가, GSC 가져오기, 사이트맵 제출, URL 제출을 하지 않는다. IndexNow는 배포 파이프라인에 이미 있다.

- 사이트 `https://code-destiny.com/`이 등록돼 있는지. 없으면 등록하지 않고 "미등록"으로 적는다.
- 최근 28일 클릭, 노출, CTR, 평균 순위. 28일을 고를 수 없으면 실제 기간을 적는다.
- 색인된 페이지 수와 사이트맵 상태.
- `/yeongnyangi/` URL 검사 결과.
- AI 성능 관련 보고서가 있으면 그 수치와 기간. 없으면 "메뉴 없음"으로 적는다.
- 크롤 오류, 차단 경고.

## 작업 3: Copilot 질문 세트

- 질문: `docs/seo/2026-10-15-brand-root/aeo-evaluation.csv`의 Q17~Q24. 문구를 바꾸지 않는다.
- 질문마다 새 대화에서 1회 묻는다. 로그인 여부를 함께 적는다.
- 원문 저장: `D:\Development\seo-audit\code-destiny-20261103\ai-baseline\bing-copilot\`에 질문별 텍스트 파일로 둔다. 저장소에 넣지 않는다.
- CSV 기록: `bing_copilot` 열에 다른 열과 같은 형식으로 적는다. 예: `미언급 / 사이트 인용 0건 / 링크: a.com b.com`. 답변에 없는 링크를 추측해 넣지 않는다. 브랜드 질문은 답변 내용이 `expected_fact`와 맞는지 함께 적는다.
- `observed_on`은 덮어쓰지 않는다. `notes` 끝에 `bing_copilot 관측 YYYY-MM-DD, 변경 후`를 붙인다.

**주의: 이 값은 변경 전 기준선이 아니다.** ChatGPT, Perplexity, Gemini는 2026-11-03 변경 전에 측정했고 Copilot은 영냥이 AEO 변경이 운영에 올라간 뒤 처음 측정한다. 나중의 값과는 비교할 수 있지만, 이번 값으로 변경 효과를 말하지 않는다. 질문당 1회라 답변 변동도 크다.

## 작업 4: GSC `/yeongnyangi/` URL 검사 (선택)

- URL: `https://code-destiny.com/yeongnyangi/`.
- 적을 것: 색인 상태, Google이 선택한 표준 URL, 사용자 선언 표준 URL, 마지막 크롤링 날짜.
- 색인 요청은 "Google에 등록되어 있지 않음"일 때만 1회 한다. 이미 등록돼 있으면 하지 않는다.
- 사이트맵은 재제출하지 않는다.

## 작업 5: Cloudflare 실제 봇 처리 확인

읽기만 한다. 설정의 저장, 켜기, 끄기를 누르지 않는다. 점검 항목의 출처는 `docs/seo/2026-10-05-brand-search-baseline.md:272`와 `docs/seo/2026-10-05-brand-search-operations.md:11`이다.

- verified bot 기록에서 Yeti, Googlebot, Bingbot, AI 검색 봇의 최근 30일 2xx, 403, challenge 건수와 URL별 분류. 요금제 때문에 기간이 짧으면 실제 기간을 적는다.
- 현재 설정 상태: Bot Fight 또는 Super Bot Fight Mode, AI Crawl Control, Managed robots, WAF custom·managed rules, rate limiting, Bot score 조건, challenge 적용 범위, Browser Integrity Check, JavaScript Detections.
- 대표 URL: `/`, `/ggulggul/`, `/yeongnyangi/`, `/kkul-kkul-unse/`, `/about/`, `/saju/`, `/insights/`.
- 사용자 에이전트만 바꾼 요청의 200은 실제 봇 통과 증거가 아니다. 대시보드 기록으로만 판단하고, 기록이 없으면 "미측정"으로 적는다.
- 차단이 보이면 고치지 말고 규칙 이름, 대상 봇, URL, 건수, 제안하는 최소 변경을 보고한다.

## 작업 6: 프로필·WordPress 점검

정본은 `lib/brand/brand-facts.mjs`다. 기준은 서비스명 `꿀꿀 운세`, 운영자 `CODE DESTINY`, 홈 `https://code-destiny.com/`이다. `꿀꿀운세`는 별칭이고, `사주 달빛 정원`·`꿀꿀 사주`는 과거 이름이라 현재 이름처럼 쓰면 어긋남으로 적는다.

대상은 `sameAs` 6곳이다.

- https://www.youtube.com/@CodeDestiny_Official
- https://www.threads.com/@codedestiny_official
- https://www.instagram.com/codedestiny_official/
- https://blog.naver.com/neosaju
- https://ggulggulinsights.wordpress.com/
- https://x.com/sajuseongj97497

`goodbyejieun`은 옛 문서(`docs/seo/2026-10-05-brand-search-operations.md:12`)에 공식 채널로 적혀 있지만 `sameAs`에 없다. 공식으로 취급하지 말고, 소유 관계를 소유자에게 묻는 항목으로만 남긴다.

곳마다 다음을 표로 적는다.

- 접근 가능 여부, 표시 이름, 소개 문구, 홈 링크.
- 소개와 고정 글의 가격, 무료 범위, 메뉴 이름이 현행과 어긋나는지. 영냥이 가격은 `worker/yeongnyangi/payments/catalog`를 읽어 대조한다. 읽기만 한다.
- WordPress는 사이트 소개와 최근 글에 `https://code-destiny.com/`이나 `/yeongnyangi/`로 가는 링크가 있는지. 기존 문서에 어느 글에 어떤 링크를 넣을지 정해져 있지 않으므로, 맥락이 맞는 글 1~3개와 넣을 문장을 제안한다. 없는 곳에 억지로 넣지 않는다.

그 뒤 고칠 곳마다 현재 문구와 제안 문구를 나란히 적어 소유자에게 보여 준다. 소유자가 그 항목에 "적용"이라고 답한 경우에만 그 항목을 수정한다. 게시된 글의 사실 정정은 필요한 최소 범위만 제안한다. 자동 발행은 하지 않는다.

## 결과 기록

- 저장소: `docs/seo/SEO_STATE.json`의 `yeongnyangiAeo20261103`에 쓴다. `bingWebmaster`, `bingCopilot`의 `null`을 관측값으로 바꾸고, `observedAt`이 2026-11-03인 나머지 값은 그대로 둔다. 새 키 `ownerTasks20261104`에 GA4 등록 여부, GSC 결과, Cloudflare 요약, 프로필 어긋남 수, 건너뛴 작업과 이유를 넣는다. 각 항목에 관측 날짜를 적는다.
- 질문 세트: `docs/seo/2026-10-15-brand-root/aeo-evaluation.csv`.
- 원문·캡처: `D:\Development\seo-audit\code-destiny-20261103\owner-tasks\`. 계정 이메일, 결제 정보, 토큰이 보이는 캡처는 저장하지 않는다.
- 측정하지 못한 값은 `null`로 두고 이유를 적는다. 0과 `null`을 섞지 않는다.

## 끝낼 때

1. `npm run check:fast`.
2. 바꾼 파일만 이름을 지정해 스테이지하고 커밋한다.
3. `git fetch origin` → `git rebase origin/main` → `npm run check:pre-push` → `git push origin HEAD:main` → main CI 확인. 다른 사람 커밋 때문에 빨간불이면 그 커밋을 보고하고 push하지 않는다. 문서만 바뀌므로 배포하지 않는다. force-push, `reset --hard`, stash는 쓰지 않는다.
4. 이 문서를 `status: done`으로 바꾸고 작업별 결과를 적는다. 소유자 답변을 기다리는 항목이 남았으면 `status: active`로 두고 `next:`에 그 항목을 적는다.
5. 워크트리를 정리한다. `node_modules` 정션을 먼저 끊는다.

```powershell
(Get-Item -LiteralPath '<워크트리>\node_modules' -Force).Delete()
git worktree remove --force '<워크트리>'
```

보고는 한국어로 하고, 작업마다 완료·건너뜀·소유자 답변 대기를 나누고, 실측과 추정을 구분한다.

## 이 문서 범위 밖

- 2026-12-01 이후 Q17~Q24 재측정. 절차는 `docs/handoff/2026-11-03-yeongnyangi-aeo.md`의 "재측정" 절이다. 그 전에 이 작업으로 대신하지 않는다.
- 묶음 ③과 `docs/handoff/2026-11-02-seo-post-promotion-followups.md`.
- `https://claude.ai/artifact/PtPUfhaiHM37ebpxtr4nQV`의 공유 해제. 소유자가 판단한다.
- 네이버 답변 측정. `naver` 값은 이번에도 `null`로 둔다.


## 2026-11-04 실행 기록

- GA4: 속성 526361229의 기존 맞춤 측정기준 0개를 확인한 뒤 AI Source / 이벤트 / ai_source를 등록하고 목록에서 확인했다. 등록 후 유입 값은 미측정.
- Bing Webmaster 및 Copilot: 로그인 화면. 소유자 로그인 필요. 등록 여부·수치와 Q17~Q24는 미측정이며 CSV와 원문을 변경하지 않았다.
- GSC: 영냥이 URL 색인됨. 두 표준 URL은 검사 URL과 일치. 최근 크롤링 화면 표기 2026-11-03 17:36:54. 재요청하지 않았다.
- Cloudflare: Bot Fight Mode와 Browser Integrity Check 꺼짐, 관리 규칙셋 항상 활성. Allow Verified Bots 활성; AI 사용자 에이전트 차단·스캐너 차단·해외 민감 페이지 챌린지 비활성. Block-Infinite-Loop 속도 제한 활성. 최근 7일 AI 통계 전체 403 14건, 404 약 2.35천 건. 봇·URL별 상태와 규칙 원인은 미측정이며 실패를 차단으로 간주하지 않는다. 상세는 SEO_STATE. 설정 변경 없음.

| 채널 | 관측된 이름·소개 | 홈 링크 | 검토 |
|---|---|---|---|
| YouTube | 코드 데스티니, 공식 채널 | 있음 | 서비스명 소개 개선 제안 |
| Threads | 꿀꿀 운세 공식, 사주 등 소개 | 표시됨 | 가입 시 월정석 500개 문구와 코드의 가입 지급 0이 다름; 운영 설정 별도 확인 필요 |
| Instagram | Code:Destiny_official, 종합 운세 플랫폼 | 화면에서 확인 안 됨 | 게시물은 프로필 링크로 유도; 설정 확인 필요 |
| 네이버 블로그 | 유명인 사주, 코드데스티니 / 영냥이 | 프로필에서 확인 안 됨 | 서비스명과 홈 링크 명확화 제안 |
| WordPress | 꿀꿀 운세 인사이트 | CODE DESTINY | 소개에 URL 텍스트, 관련 기능 링크 있음 | 질문 예시 글은 영냥이 링크가 이미 있음 |
| X | Code:Destiny_official, 영문 슬로건 | 표시됨 | 서비스명 소개 개선 제안 |

고정 글 전수와 가격·무료 범위 대조는 미완료. 카탈로그는 가격을 별도 registry에서 가져온다. 아래는 소유자 항목별 적용 답변을 기다리는 초안이며 외부 게시물은 수정하지 않았다.

- Threads 현재: 가입 시 5천원 상당 월정석 500개 → 제안: 해당 문장 삭제. 코드상 가입 지급은 0이며 500 월정석은 무료 사주 튜토리얼 완료 보상으로 설명된다. 운영 확인 전 대체 혜택은 쓰지 않는다.
- YouTube 현재: 코드 데스티니 공식 채널 → 제안: CODE DESTINY가 운영하는 꿀꿀 운세 공식 채널입니다. 기존 홈 링크 유지.
- Instagram 현재: 운명을 코드로 풀어내는 code:destiny, 종합 운세 플랫폼 → 제안: CODE DESTINY가 운영하는 꿀꿀 운세. 사주·타로·자미두수·점성술을 통해 나의 흐름을 살펴보세요. 홈 링크 설정 여부 확인.
- 네이버 현재: 정밀 사주 분석 및 다양한 운세 서비스, 서비스 홍보로만 쓴다는 소개 → 제안: CODE DESTINY가 운영하는 꿀꿀 운세의 사주와 다양한 운세 이야기를 전합니다. 서비스 안내: https://code-destiny.com/
- X 현재: Code Your Fate. Command Your Freedom. → 제안: CODE DESTINY가 운영하는 꿀꿀 운세. 사주·타로와 다양한 운세를 통해 나의 흐름을 살펴보세요.
- WordPress 질문 예시 글(https://ggulggulinsights.wordpress.com/2026/10/25/fortune-consultation-question-guide/): 영냥이에게 고민을 적어 보라는 문장 뒤에 상담 구성과 이용 조건을 영냥이 상담 화면에서 확인하라는 문장과 https://code-destiny.com/yeongnyangi/ 링크를 제안. 하단에 같은 목적지 링크가 이미 있으므로 필수 정정은 아니다.

 goodbyejieun 소유 관계는 미확인. 공식 채널로 판단하지 않으며 소유자 확인 필요.


## 2026-11-04 소유자 승인 후 적용

소유자가 프로필 수정 제안 전체를 승인했고 로그인 필요한 작업은 건너뛰도록 지시했다. goodbyejieun은 소유자의 계정이지만 공식 채널에서 제외한다.

- YouTube: 공식 채널 설명의 첫 문장을 승인된 문장으로 바꾸고 게시 완료 알림 확인. 나머지 소개와 기존 홈 링크 유지.
- 네이버 블로그: 소개를 승인된 문구와 서비스 URL로 바꾸고 성공 알림 확인.
- WordPress: 상담 질문 예시 글에 승인된 안내 문장 및 영냥이 링크 추가, 글 업데이트 완료 확인.
- Instagram: 저장된 계정 목록에 대상 공식 계정이 없고 기존 계정 로그인만 표시되어 건너뜀.
- Threads: 현재 다른 계정으로 접속되어 있으며 편집 권한 또는 계정 전환을 확인하지 못해 미적용.
- X: 이전 확인에서 다른 계정으로 접속되어 있었고, 이번 편집 권한 확인 중 브라우저 연결이 끊겨 미적용.
- Bing Webmaster와 Copilot: 로그인 작업을 건너뛰라는 지시에 따라 재시도하지 않음.

위의 기존 제안 목록은 승인 당시 기록이다. 완료된 항목을 재적용하지 않는다.


## 2026-11-04 공식 계정 재확인

- Instagram @codedestiny_official: 승인한 소개를 저장하고 새로고침 후 확인했다. 사이트 링크 편집은 모바일 앱에서만 가능하다는 안내가 보여 미적용이다.
- Threads: 활성 계정은 @youngyangi91이며 공식 프로필에 편집 버튼이 없어 월정석 가입 문구 삭제는 미적용이다.
- X: 활성 계정은 다른 계정이며 전환 목록에 대상 계정이 없어 소개 수정은 미적용이다.

## 2026-11-04 재개 결과

- Cloudflare AI Crawl Control을 최근 30일로 다시 확인했다. 전체 113.34k 요청, 허용 102k, 비성공 12k이며 상태 코드는 200 97.95k, 403 170, 404 11.31k로 표시됐다. 비성공은 차단과 같은 뜻이 아니며 대부분은 404다.
- 주요 크롤러의 허용/비성공 표시는 Applebot 33.6k/560, OAI-SearchBot 26.37k/3.32k, Googlebot 13.93k/1.08k, BingBot 7.38k/660, GPTBot 3.95k/510, PerplexityBot 2.8k/400, ClaudeBot 2.18k/360, Claude-SearchBot 0/430이다.
- 대표 URL 중 `/`는 740건에서 200 350, 301 230, 302 110, 403 10, 404 40이었다. `/ggulggul/`는 200 860·302 10, `/yeongnyangi/`는 200 220, `/kkul-kkul-unse/`는 200 30·301 10, `/about/`는 200 50, `/saju/`는 200 50, `/insights/`는 200 90이었다. 대표 URL의 403은 루트 10건 외에는 보이지 않았다.
- Bot Preference Sync(Managed robots 대응)는 꺼짐이다. Bot Fight Mode와 Browser Integrity Check는 앞선 관측대로 꺼짐이며 관리 규칙셋은 항상 활성이다. 설정은 바꾸지 않았다.
- 현재 Free 요금제 화면은 JavaScript Detections와 Bot score를 노출하지 않았고, 크롤러별 403·challenge 건수와 규칙 귀속도 제공하지 않았다. Yeti는 보이는 AI 크롤러 목록에 없었다. 이 값들은 추측하지 않고 미측정으로 남겼다.
- Threads 공식 프로필의 잘못된 `가입 시 월정석 500개` 문구는 현재 사라졌고 서비스 소개와 홈 링크가 표시된다. 활성 세션은 `@youngyangi91`이고 공식 계정 편집 버튼은 없으므로 외부 수정은 하지 않았다.
- X는 공식 `@sajuseongj97497` 계정으로 로그인돼 있고 편집 권한이 확인됐다. 승인된 소개와 홈 링크가 이미 적용돼 있어 다시 저장하지 않았다.
- Bing Webmaster와 Copilot은 소유자의 건너뜀 지시를 유지했다. 이번 재개에서 외부 설정·프로필·게시물은 변경하지 않았다.
