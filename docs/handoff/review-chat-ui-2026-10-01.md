---
status: done
implementationStatus: done
updated: 2026-10-01
next: 구현 완료(abb0d883d, origin/main 반영). 후속 후보는 아래 "후속" — 각각 별도 결정
---

# 상담 후기: 더 많이, 채팅처럼, 고급스럽게 (2026-10-01)

다음 세션 첫 문장(후속을 고를 때): "docs/handoff/review-chat-ui-2026-10-01.md 의 후속 1(정적 셸 `/ggulggul/` 후기 카드를 채팅형 시각 언어로 통일)을 진행해줘."

사용자 요청(2026-10-01): "후기 시스템을 훨씬 더 고급스럽고 채팅처럼 나오도록. 나머지 후기를 더 많이 넣고 UI 를 개선." 정치인 데이터 정리는 하지 않기로 했다(`political-trust-to-reviews-2026-10-01.md` 후속 과제 2).

등급: GREEN(데이터·마크업·CSS, 결제·라우팅 무변경). 테스트 정책은 바뀌었다(아래). 계획 전문: `C:\Users\user\.claude\plans\dapper-exploring-rivest.md`.

## 결정

- 과장·각색 금지: 사용자는 과장해도 된다고 했지만, 지어낸 후기는 표시광고법(추천·보증 심사지침)상 기만 광고라 하지 않았다. 대신 강한 원문을 앞세우고, 원문의 부분 문자열만 `highlight` 강조 인용으로 띄운다.
- 최상급·비교 원문 허용(사용자 결정 "원문 그대로 넣기"): 028·030·035·036, 사용자 캡처 2(=006).
- 사용자 캡처 2장은 게시 동의를 받았다(사용자 확인). 블로그 사본에서 같은 이미지를 찾았다: 캡처 1 = 075, 캡처 2 = 006. 번호와 업로드일은 그 사본 기준이다.
- 006은 강의 수강생 후기다. 그래서 `service: 'neo-lecture'`를 새로 두고 대표 자리에는 올리지 않는다(아래 코드 규칙).

## 결과 (커밋 abb0d883d, 14파일)

데이터 `lib/brand/customer-reviews.mjs`: 12건 → 42건(이미지 번호 오름차순).
- 추가 30건: 002 006 007 009 026 028 030 035 036 037 046 062 063 064 065 066 068 070 071 072 074 075 076 077 081 083 085 086 088 089.
- 대표(★)는 075(합격 "말씀해주신대로 큰 명예를 얻었어요~!!!"), 076(보험업 적중), 089("선생님 분석이 너무 정확해서")로 바꿨다. 024·047·050은 대표에서 내렸다.
- `highlight`는 24건으로 넣었다. 기존 024·031·047에도 붙였다. 037은 띄어쓰기 없는 덩어리("잘맞을것같다고하셔서놀랏어요!!!!")라 좁은 칸에서 "!|!!!"로 갈려 후속 커밋에서 뺐다. 지금은 23건이다(해시 무관).
- 3회 판독이 일치한 조각만 넣었다(`build-entries.cjs`가 조각마다 A·B·C 판독과 사용자 사본을 대조).
- 제외:
  - 061: 판독 3회가 갈림.
  - 022·038: 이름·장소가 문맥에 박혀 생략하면 문장이 깨짐.
  - 008: 제3자 사생활 상세.
  - 088 말풍선 0: 상담사 말을 인용한 부분.
  - 계속 제외: 정치 027, 재난 예언 019, 강의 003·005, 문장 없음 042·048·057, 제3자 사생활 013.
- 판독이 갈린 구간을 피해 발췌한 항목은 6건이다. 076("2년(?)반쯤"), 066(12만원), 009(ㅋ 개수), 026(금액), 037(겟/겠), 089(줄바꿈)는 일치한 쪽 조각만 쓰고 "…"로 표시했다.

코드 규칙(같은 파일):
- `SERVICES = {'neo-1on1','neo-lecture'}`. `isPublishable`이 그 밖의 서비스를 숨긴다(fail-closed).
- `splitReviews`는 대표·앞자리를 `neo-1on1`에서만 뽑는다. 강의 후기는 펼침 영역에만 나온다.

테스트 `__tests__/ui/customer-reviews.test.mjs`(정책 변경, 사용자 승인 2026-10-01):
- `BANNED`(최고·유일 등)는 우리 문구에만 적용한다. FounderTrust 검사는 `data-review-text` 문단을 빼고 본다.
- 고객 원문과 `highlight`에는 새 `REVIEW_BANNED`(정치어 + 금액 `\d원·만원·천원`)만 적용한다.
- 새 단언:
  - `highlight`는 자기 말풍선의 부분 문자열이어야 한다.
  - 대표는 전부 `neo-1on1`이어야 한다.
  - 강의 후기는 앞자리에 오지 않는다.
  - service가 없거나 모르는 값이면 숨긴다.
- `REVIEWS_SHA256`을 새 세트로 갱신했다.

UI `app/components/CustomerReviews.tsx`·`.module.css`(서버 컴포넌트, 클라이언트 JS 0):
- 카드 하나 = 대화창 하나.
  - 상단 바: "네오 1:1 상담|네오 사주 강의 · 카카오톡".
  - 익명 아바타(`UserRound`)와 발신자 "익명 상담 고객|익명 수강생".
  - 말풍선은 왼쪽에 묶고, 꼬리는 첫 말풍선에만 둔다(아바타 옆, 카카오톡 관례).
  - 하단 메타는 기존 문구를 유지한다.
- 대표 카드에는 `highlight`를 명조·금색 인용(`aria-hidden`)으로 띄운다.
- 첫 대표는 640px 이상에서 전체 폭 히어로다. 960px 이상이면 히어로 안이 2열로 바뀐다(후속 커밋).
  - 왼쪽: 큰 인용(30px, 960·1280 모두 2줄).
  - 오른쪽: 상단 바와 대화창. 금색 헤어라인으로 나눈다.
  - 하단 메타는 전체 폭이다.
  - 인용이 없는 히어로는 `:has(> .quote)`가 맞지 않아 세로 쌓기 그대로다.
  - 나머지 대표 두 장은 그 아래 2열로 놓인다.
  - 높이는 내용을 따라간다. 1280 실측 카드 높이 747 → 464px, 대화창 위 45·아래 20.
- 🔴 기각한 히어로 시도:
  - 첫 대표를 2행에 걸치는 배치는 오른쪽 두 장 높이로 늘어나 말풍선 아래가 240px 비었다.
  - 대화 묶음을 세로 가운데로 옮겨도 빈 228px(카드의 30%)을 위아래로 나눴을 뿐이었다.
  - 날짜 알약도 넣지 않았다. `postedAt`은 블로그 게시일이라 대화 날짜처럼 보이면 안 된다.
- 펼침 `<details>` 안 나머지 후기는 CSS columns 벽이다(1/2/3열). summary는 `inline-flex`라 기본 삼각형이 없다. 그래서 회전 셰브론을 직접 그렸다(후속 커밋).
- 모션: `@supports (animation-timeline: view())`와 `prefers-reduced-motion: no-preference`가 모두 맞을 때만 스크롤 진입 `crArrive`를 쓴다. 그 밖에는 정지 화면이다.
- 줄바꿈: `word-break: keep-all; overflow-wrap: anywhere; text-wrap: pretty`.
- h3는 "네오 1:1 상담·강의 실제 후기"다. `FounderTrust.tsx` 문구도 "1:1 상담과 강의에서"로 맞췄다.
- Consultation inline(`limit=2`)은 대표 075·076만 보여 준다. `Consultation.tsx`는 무변경이다.

정적 셸: 대표가 바뀌어 `node scripts/design/build-home-funnel.mjs` → `npm run sync:public`(수렴) → `node scripts/generate-sitemap.mjs`를 돌렸다. `index.html`과 `public/{index,en,ja,zh,zh-tw,ggulggul,static}/index.html`, `config/sitemap-lastmod.json`(서명 6건, lastmod 불변)이 바뀌었다.

커밋을 3개로 나누지 않고 하나로 묶었다. 데이터만 커밋하면 정적 셸 테스트가 깨지고, UI만 커밋하면 typecheck가 깨지며, 006이 1:1 상담 라벨로 잘못 나간다.

## 검증 (실측)

- `node --test __tests__/ui/customer-reviews.test.mjs` 외 관련 UI 테스트 20/20 통과. 변이로 금액 삽입과 없는 `highlight`를 넣어 각각 실패하는 것을 확인했다.
- 대상 검사는 모두 통과했다: eslint, typecheck, `verify:paid-gate-ui`, `verify:checkout-pass-card`, `verify:analytics-events`, `verify:entry-encoding --strict-core`, `generate-sitemap --check`(abb0d883d 시점).
- `npm run check:fast`는 v7-golden EPERM rename 경합(동시 스위트 환경 플레이크)으로 BLOCKED였다. 그 테스트를 단독으로 돌리면 2/2 통과한다.
- mock dev 서버 3107 실측(스크래치 Playwright, `/yeongnyangi/`·`/yeongnyangi/1000-won-fortune/` × 360·768·1280):
  - article 42 = `visibleReviews()`, 페이지 가로 넘침 0, 카드 밖 넘침 0.
  - 대비 최소: 말풍선 16.2, 인용·상단 바·summary 9.23, 메타 11.22, 고지 9.04, 제목 13.2.
  - reduced-motion에서 애니메이션 0. 모션 허용 시 88개이며, 화면 안 말풍선 opacity는 1이다.
  - 벽 열 수 1/2/3. summary "후기 39개 더 보기".
  - 단어 갈림은 고객 원문 속 띄어쓰기 없는 긴 덩어리(최대 29자, "역시해외에자꾸…")가 말풍선보다 넓을 때만 `overflow-wrap`이 끊은 경우다. 037 강조 인용의 꼬리 갈림은 인용을 빼서 없앴다.
  - 006은 360에서 "더"가 한 줄에 홀로 남는다. 원문 속 21자리 숫자 덩어리 때문이며, 원문을 바꾸지 않으므로 받아들인다.
- Consultation `/yeongnyangi/fortune/?domain=saju`:
  - 접힘 기본, article 2, 가로 넘침 0. `?lang=en`이면 블록 0이다.
  - 1280에서 펼쳐도 결제 버튼 y는 2371/2482 그대로다. 360은 1열이라 펼치면 아래로 밀리며, 개편 전과 같은 구조다.
- `scripts/verify-conversion-sharing.mjs`는 실패한다. 첫 단언(`/`의 "1회 30만원…" 제목)에서 30초 타임아웃이 난다. 홈 `/`이 09-30에 꿀꿀 운세 홈(`app/page.js`)으로 바뀌어 FounderTrust가 더는 `/`에 없기 때문이다. 이번 변경 전부터 낡아 있던 수동 검증기이고 CI에는 배선돼 있지 않다(후속 2).
- 화면 판정(visual-checker): 아래 "화면 판정" 참고.

## 화면 판정 (visual-checker, 2026-10-01~02)

스크래치 Playwright로 찍었다(`shoot-reviews.mjs`, 고정·sticky 요소와 Next 오버레이 숨김). 메인 세션은 이미지를 읽지 않았다.

- 1차 결과 ISSUE 2건:
  - 960px 이상 히어로에서 말풍선 아래가 비었다.
  - summary 펼침 표시가 없었다.
  - 둘 다 고쳤다(위 UI 절).
- 최종 결과는 전 항목 통과다(1280, 두 페이지).
  - 좌우 47:53이고, 큰 빈 영역이 없다.
  - 헤어라인 구분선은 은은하다(1.46~1.66:1).
  - 인용은 세로 중심에서 4px 위다.
  - 바·푸터 들여쓰기는 17px로 일치한다.
  - 대비: 인용·바 9.2, 푸터 10.1, 장식 따옴표 4.2.
  - 제안대로 인용을 26 → 30px로 키웠다. 다시 재 보니 2줄 유지, 카드 높이 불변, 넘침 0이었다.
- 360·768 대표와 벽은 변화 없이 통과했다. 1280 벽은 037 카드가 짧아져 재배치됐지만, 쪼개진 카드는 없다.

## main CI

abb0d883d는 옆 세션의 push(79b0b1ec1)로 origin/main에 올라갔다. 그 run의 PR CI는 `Verify the tracked sitemap matches its sources` 한 스텝만 실패했고, 나머지 워크플로는 성공했다.
- 원인: 옆 세션 ziwei S5 커밋 9bc1d069c가 `lib/ziwei-star-strength.js`를 바꿨는데, 그 파일을 읽는 4개 라우트의 원장 서명을 갱신하지 않았다. 4개 라우트는 `/destiny-compass/`, `/fortune/prompt-hub/`, `/ziwei/animal-destiny/`, `/ziwei/chart/`다.
- `node scripts/generate-sitemap.mjs`로 재생성해 diff하면 이 4건만 서명이 바뀐다. lastmod는 그대로다.
- 이 작업 범위 밖이라 고치지 않았다. 옆 세션이 50dd10e7d로 재생성해 풀렸다.
- 히어로 후속 커밋은 `/yeongnyangi/1000-won-fortune/` 원장 서명 1건을 함께 바꾼다. 후기 데이터와 CSS가 그 라우트의 import 폐포 안에 있기 때문이다.
- KST 자정 날짜 롤링(`/fortune/date` URL 12개 교체)은 바로 뒤의 별도 재생성 커밋으로 맞췄다.

## 후속 (각각 별도 결정)

1. 정적 셸 `/ggulggul/` 후기 카드 3건(`build-home-funnel.mjs`)은 데이터만 새 대표로 바뀌었고 시각은 옛 카드 그대로다. 채팅형으로 통일하려면 12개 로케일 셸과 sitemap 서명이 함께 움직인다.
2. `verify-conversion-sharing.mjs` 홈 단언을 FounderTrust가 있는 `/yeongnyangi/`(또는 천원 페이지)로 옮긴다.
3. 원문 캡처는 임시 폴더에만 있다(블로그 사본 `...\4df55ab9-...\scratchpad\rv\`, 사용자 캡처 `...\17e7b3ed-...\images\1.png`·`2.png`). 사용자가 따로 보관해야 한다. 저장소에는 넣지 않는다(개인정보).
4. 최상급·비교 원문을 노출하는 법적 판단은 사용자 승인으로 진행했다. 고지 "개인 경험에 따른 후기이며 결과를 보장하지 않습니다"는 유지한다.
