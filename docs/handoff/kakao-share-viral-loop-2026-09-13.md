# 카카오 공유 바이럴 루프 복구 — Phase 0~4 완료, Phase 5 착수 직전

작성 2026-09-13. 계획 정본은 `C:\Users\user\.claude\plans\majestic-tickling-plum.md`(7개 Phase).
실행 순서는 **0 → 1 → 3 → 2 → 4 → 5 → 6**. 지금 **Phase 5 차례**다.

## 다음 세션 첫 문장

> `D:\Development\codedestiny-worktrees\kakao-share-phase5-20260913-125400` 로 이동해
> 브랜치 `wt/kakao-share-phase5-20260913-125400` 에서 Phase 5 를 이어간다(0단계는 끝났다).
> 주 체크아웃(`D:\Development\code-destiny`)에는 **다른 세션이 쓰고 있으므로 들어가지 않는다.**
> **첫 할 일은 코드가 아니라 결정이다** — 아래 "정적 셸에는 카카오 JS 키를 얻을 길이
> 비로그인 상태에서 없다" 를 사용자에게 보고하고 A/B/C 중 하나를 받는다.

---

## 왜 이 작업을 하는가 (실측 근거, 추정 아님)

단톡방 공유가 바이럴로 이어지지 않는 원인 5건:

1. `js/share.js:532` `cdBuildShareUrl()` 이 항상 `origin + '/?action=…'` 을 만든다 — 링크를 받은
   친구는 **보낸 사람 결과를 못 보고 홈으로 떨어진다**. 호기심 격차가 0.
2. `js/share.js` 2124줄에 `Kakao.` 호출이 **0건**. 전부 `navigator.share` → `kakaotalk://send?text=`
   → 클립보드다. 단톡방에 **썸네일 없는 맨 텍스트**만 간다.
3. `worker/lib/guardian-fortune-share.js` 276줄(토큰 서명·PII·TTL·스냅샷)이 완성돼 있고 플래그도
   양쪽 `"true"` 인데 **호출부가 0건**이었다.
4. 🔴 P0 계약 불일치: `js/share-service.mjs` 가 `?id=` 만 화이트리스트하는데 워커·뷰어는 `?shareId=`
   를 쓴다 → id 가 통째로 삭제돼 "찾을 수 없음" 착지.
5. `lib/share.v2.ts:41` `shareable` 게이트가 `/result`·`/my` 를 막아 `ShareWidget` 이 null 반환.
   **게이트는 넓히지 않기로 했다**(사설 라우트가 통째로 열린다).

**사용자 결정 3건(확정, 다시 묻지 말 것)**
- 착지점: **결과 스냅샷 페이지**(DB 쓰기 수반, RED 감수)
- 범위: **파일럿 3~4개 먼저**(전체 ~30 진입점 아님)
- 유료 정책: **무료 결과만 공유** — 유료 본문은 스냅샷에 **절대** 들어가지 않는다

---

## 완료 상태 (커밋 기준)

| Phase | 내용 | 상태 |
|---|---|---|
| 0 | `share-service.mjs` `id`→`shareId` P0 수정, 폐기 브랜드 제거 | 완료 |
| 1 | `/fortune-chat` 죽은 파이프라인 배선 + 서버측 무료 게이팅 | 완료 |
| 3 | `worker/lib/share-snapshot-core.js` 코어 추출 | 완료 |
| 2 | `public/_worker.js` HTMLRewriter OG 교체 + `share-og-meta.js` | 완료 |
| **4** | **범용 결과 스냅샷(서버) — 커밋 `e36f7067b`** | **완료** |
| 5 | 정적 셸 파일럿 배선 | **← 여기부터** |
| 6 | 퍼널 계측 | 미착수 |

### Phase 4 가 남긴 것 (`e36f7067b`, 12파일 796줄)

- `worker/lib/result-share-snapshot.js` (신규 195줄)
- `worker/lib/models.js` — `ResultSharedSnapshot` 모델, TTL 90일
- `worker/routes/fortune.js` — `POST /api/fortune/share`, `GET /api/fortune/share/{sr_id}`
- `app/share/` — `page.tsx` / `ResultShareClient.tsx` / `.module.css` (뷰어, `robots: noindex`)
- `config/env.contract.json` — `ENABLE_RESULT_SHARE` 등재
- `worker/wrangler.toml` · `worker/wrangler.staging.toml` — `ENABLE_RESULT_SHARE = "false"`
- `__tests__/worker/result-share-snapshot.test.js` (8 테스트)
- 모델 목 2곳(`pig-coin-refund-escalation`, `subscription-status-auto-renew-concurrency`)에
  `ResultSharedSnapshot: {},` 추가 — **모델 export 를 늘리면 이 목들이 link 단계에서 깨진다.**

검증: 신규 8/8, 변이 4종(feature 화이트리스트·PII 줄·레이트 리밋 비교·섹션 slice) **전부 물림**,
`verify:env-parity` PASS, `npm run check:fast` **exit 0** (232 suites / 2708 tests).

### 🔴 지금 이 엔드포인트는 살아 있지 않다 — 의도된 상태

`ENABLE_RESULT_SHARE = "false"` 라 두 라우트 다 404 다. 소비자(정적 셸 공유 버튼)가 없는
공개 쓰기 경로를 미리 열어두지 않기 위해서다. **켜는 시점은 Phase 5 배선 커밋이다.**

같은 이유로 아래 둘도 Phase 5 로 **의도적으로 미뤘다**(없는 코드를 선언하면 거짓 선언):
- `public/_routes.json` 의 `/share/*` include
- `public/_worker.js` 안의 `// @routes-include: /share/*` 마커 + `sr_` 카드 분기

가드는 이 둘의 **양방향 드리프트를 모두 문다**. 반드시 **같은 커밋에 셋을 함께** 넣는다.

### 설계상 일부러 가디언과 다르게 한 것

- **레이트 리밋에 끄는 스위치가 없다.** 가디언은 서명 토큰이 1차 방어라 플래그로 껐다 켤 수 있지만,
  여기는 레이트 리밋이 **유일한** 유량 방어다. 플래그를 두면 켜는 걸 잊은 순간 무제한 공개 쓰기가 된다.
  10분 / 10회, 출처를 못 읽으면 `ip:unknown` 공용 버킷으로 몰아 **fail-closed** 로 센다.
- **`contentHash` 유일 인덱스**로 같은 본문 → 같은 링크. 카카오는 **URL 을 캐시 키로** 쓰므로
  같은 본문에 URL 이 둘 생기면 스크랩이 갈린다. 11000 충돌 시 그 문서를 그대로 돌려준다.
- **TTL 은 `schema.index({expiresAt:1},{expireAfterSeconds:0})` 로만** 선언한다.
  필드 레벨 `index:true` 를 같이 쓰면 `IndexOptionsConflict` 가 난다.

---

## 🔴 Phase 5 착수 중 발견 — 먼저 결정해야 하는 것

### 정적 셸에는 카카오 JS 키를 얻을 길이 **비로그인 상태에서 없다**

전수 grep(`kakaoJavascriptKey`, 소스 3건) 결과, 셸이 키를 얻는 경로는
`index.html:20553` 하나뿐이고 그 출처는 **`POST /api/auth/referral/kakao-share`** 다.
`worker/routes/auth.js:4225` `handleKakaoReferralShare` 는 맨 첫 줄이 `requireAuth` 이고
비로그인은 **401** 이다. 게다가 이 엔드포인트는 호출될 때마다 **추천 코드를 만들고 RPG EXP 를
적립하는 부작용**이 있다 — 공유 버튼이 쓸 수 있는 성격의 API 가 아니다.

한편 `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY` 는 `config/env.contract.json` 상
`scope: client` / `secret: false` / **`targets: ["pages"]`** / 소비자 `app/components/KakaoSdk.tsx` 다.
즉 **리액트 빌드에만 주입되고 정적 셸에는 들어오지 않는다.**

**결과:** 파일럿 ②③(정적 셸 타로·사주)에서 **비로그인 사용자는 카톡 리치 카드를 띄울 수 없다.**
바이럴 대상의 대다수가 비로그인이므로 이걸 풀지 않으면 Phase 5 의 핵심 효과가 안 난다.

**권장(A): 부작용 없는 공개 키 엔드포인트를 하나 판다.**
`GET /api/auth/kakao-share-key` → `{ kakaoJavascriptKey }` 만. 카카오 JS 키는 설계상
브라우저에 노출되는 **공개 클라이언트 키**이므로(계약에도 `secret: false`) 인증 없이 내려도 된다.
기존 `resolveKakaoJavascriptKey(env)`(`auth.js:207`)를 그대로 재사용하면 로직 추가가 없다.
🔴 다만 **새 공개 라우트**이므로 CLAUDE.md 상 RED — 착수 전 위험·검증·롤백 선보고가 필요하고,
`config/env.contract.json` 의 `targets` 에 `worker` 를, `consumers` 에 그 라우트를 추가해야
`verify:env-parity` 가 통과한다(fail-closed).

**대안(B):** 키를 `index.html` 에 빌드 타임 인라인 — 계약상 `targets: ["pages"]` 를 깨고
키 문자열이 레포에 커밋된다. **권장하지 않는다.**
**대안(C):** 로그인 사용자만 리치 카드, 비로그인은 기존 텍스트 폴백 — 효과가 대폭 줄어든다.

**이 결정이 나기 전까지 파일럿 ②③ 의 카카오 리치 카드 부분은 착수할 수 없다.**
스냅샷 생성(`POST /api/fortune/share`)과 링크 복사·`navigator.share` 폴백은 키 없이도 되므로
그 부분은 먼저 붙일 수 있다.

### `sync:public` 은 사이트맵 원장을 함께 밀어낸다

`npm run sync:public` 이 캐시버스트 키를 다시 쓰면 `index.html` + 로케일 미러 5개가 바뀌고,
그 여파로 `config/sitemap-lastmod.json` 의 **signature 29개**가 갱신된다(`lastmod` 날짜는 그대로).
`verify:sitemap-drift` 가 fail-closed 로 문다. **sync:public 을 돌렸으면 항상
`npm run sitemap:generate` 를 이어 돌리고 원장을 같은 커밋에 담는다.** 이번에 한 번 막혔다.

---

## Phase 5 할 일 (🟠 AMBER) — 실측 앵커 포함

줄 번호는 워크트리 기준 2026-09-13 실측.

0. ✅ **완료 (커밋 `994eeb6ab`)** — `js/share-service.mjs` `publicShareUrl` 이 `/share` + `sr_`
   를 통과시키도록 `SNAPSHOT_ROUTES` 표로 바꿨다. 이걸 안 고치면 새 공유 링크의 id 가 통째로
   삭제돼 친구가 빈 뷰어를 본다(Phase 0 에서 `gf_` 로 겪은 그 증상). 변이 2종 확인.

1. **`js/share-bridge.mjs` 신규** — `window.cdPrepareKakao` / `window.cdShareThrough` 노출.
   비모듈 `js/share.js` 가 `js/share-service.mjs` 의 `prepareKakao`(:18) / `shareThrough`(:54) 를
   쓸 수 있게 하는 다리다.
2. **`js/share.js:929` `cdShareFortuneKakao` 에 `snapshot` 옵션 추가.**
   기존 호출부 4곳(:1002, :1008, :1022, :1076 노출)은 **손대지 않는다**(회귀 0).
3. **파일럿 ② 기본 타로** — `index.html:18537` `#tarotResultContainer` 에서 수집.
   유료 `#tarotFinalBtn` 흐름 리딩 DOM 은 **수집 대상에서 제외**(DOM 셀렉터 게이팅 + 서버
   화이트리스트 이중 방어). feature 값은 `tarot-basic`.
4. **파일럿 ③ 기본 사주** — `index.html:20193` `data-action="shareKakao"`, `#shareSection`(:20190)
   이미 존재. feature 값은 `saju-basic`.
5. **파일럿 ④ `/fortune/[period]/[sign]`** — 이미 공개 정적 URL. **스냅샷 불필요**,
   `Kakao.Share.sendDefault` 리치 카드만.
6. **SDK 일원화** — `index.html:20443` `KAKAO_SDK_SRC` 2.8.1 → `share-service.mjs:3` 의 2.8.3 경로로
   통일하고 **`KAKAO_SDK_INTEGRITY`(:20444) 와 그 사용처(:20541) 도 함께 삭제**(고아 참조 방지).
   CSP `script-src-elem` 은 이미 `https://t1.kakaocdn.net` 를 허용 — **CSP 변경 불필요.**
7. **`ENABLE_RESULT_SHARE` 를 양쪽 토물에서 `"true"` 로.** 파리티 가드가 값 불일치를 물므로
   **스테이징만 켤 수 없다** — 두 파일을 반드시 같이 고친다.
8. **`public/_routes.json` `/share/*` include + `public/_worker.js` 마커·`sr_` 분기** (위 참조).
9. **`npm run sync:public`** — 미러: `share.js`, `share-service.mjs`, `share-bridge.mjs`,
   `share-reward.js`, `index.html`. **산출물 커밋 필수.**

### Phase 6 (GREEN, 마지막)

`js/core/analytics.js:177-197` `share_receive` 에 `feature`·`shareId` 디멘션 추가
(채널 화이트리스트 정규식은 유지). 퍼널: `share_click` → `share_receive` → 무료 결과 도달.

---

## 함정 (이번 작업에서 실제로 밟았거나 확인한 것)

- **`worker/wrangler.toml` · `worker/wrangler.staging.toml` 은 CRLF.** Edit/sed 가 CRLF 를 떨구므로
  **node 스크립트로 패치**하고 앵커 문자열도 `\r\n` 으로 만든다. 이번에 `\n` 앵커로 한 번 실패했다.
  반대로 `worker/**.js` 와 `__tests__/worker/*.test.js` 는 **LF** 다 — 섞지 말 것.
- **`verify:env-parity` 는 fail-closed.** 새 env 키를 소스가 읽는 순간 `config/env.contract.json`
  에 없으면 `[undeclared-usage]` 로 막힌다. 이번에 그렇게 한 번 막혔다.
- **`_headers` 와 `public/_headers` 는 바이트 동일**(28220B)이어야 한다. 이번 Phase 4 에서는
  `/share/*` 의 `X-Robots-Tag` 를 **넣지 않았다** — 기존 `/fortune/share/` 도 항목이 없고,
  noindex 는 `app/share/page.tsx` 의 `metadata` 로 충분하다.
- **robots.txt 에 Disallow 를 넣지 않는다** — 카카오 스크래퍼까지 막혀 카드가 통째로 죽는다.
- **중복 `og:image` → 카카오가 정적 이미지를 고른다.** 반드시 **교체**(append 아님).
- **추천 파라미터(`ref`/`rs`/`via`)는 카카오 feed 의 `link` 에만.** `og:url` 에 붙이면 수신자마다
  URL 이 달라져 카카오 캐시가 무력화된다.
- `npm run build:worker` 는 로컬에서 항상 실패한다(`workers-og` 미설치). **CI 가 정본.**
- 워크트리에서 jest 는 `npx --no-install jest …` 로 돌린다.
- **Bash 도구는 Git Bash 다.** PowerShell here-string `@'…'@` 를 쓰면 커밋 제목에 `@` 가 섞인다
  (이번에 한 번 밟아 amend 했다). 멀티라인은 `<<'MSG' … MSG` heredoc 을 쓴다.

---

## 격리·전달 상태

- **워크트리**: `D:\Development\codedestiny-worktrees\kakao-share-phase5-20260913-125400`
  브랜치 `wt/kakao-share-phase5-20260913-125400`, base `9c25caa97`(Phase 4 포함).
  `node_modules` 는 정션, `.env.local`·`.env.cloudflare.local` 은 하드링크.
- **주 체크아웃에 다른 세션이 쓰고 있다.** `docs/refactor/**`·`docs/handoff/refactor-phase4-*.md`
  의 미커밋 변경은 그 세션 것이다. 🔴 공유 체크아웃에서 `reset --hard`·`stash`·`checkout --` 는
  옆 세션의 미커밋 작업을 **복구 불가로** 지운다.
- **`main` 은 `origin/main` 보다 21 커밋 앞서 있고 그중 다수가 옆 세션 작업이다.**
  push 하면 그 작업까지 함께 올라간다 — **내 판단으로 push 하지 않았다.** 옆 세션과 시점을
  맞춘 뒤 올린다.
- 병합은 PR 없이 `git merge` 로 main 에 직접. 워크트리 제거 전 **정션부터 끊는다**
  (`(Get-Item -LiteralPath '<wt>\node_modules' -Force).Delete()` → `git worktree remove --force <wt>`).
  끊지 않고 지우면 공유 `node_modules` 가 함께 삭제된다.

## 롤백

Phase 4 는 커밋 1개(`e36f7067b`) revert 로 되돌아간다. 스키마는 TTL 컬렉션이라 문서가 남아도
90일 뒤 자동 소멸하며 다른 기능이 참조하지 않는다.
