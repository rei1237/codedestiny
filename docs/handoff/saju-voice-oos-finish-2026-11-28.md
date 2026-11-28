---
status: done
updated: 2026-11-28
next: 스테이징 반영 및 버전 검증 완료. 운영은 별도 지시 전까지 보류.
---

# 사주 말투·문장 다듬기 + 범위 밖 결함 마무리 (세션 ccbee9c2 인수인계)

## 첫 행동
### 스테이징 전달 상태 (2026-11-28, 이후 본문의 예전 상태보다 우선)
- A와 전문가 상담 영상은 원격 main `3ee2917109`에 포함. CI 46143022631 실패: 고객센터 커밋 `c41f82d9c9`의 `worker/yeongnyangi/support-knowledge.ts:54`에서 Toss 타입 검사 TS7006. 실패 파일은 A·영상 diff에 없다. 다른 세션 소유 파일·워크트리는 수정하지 않는다.
- 후속 작업 트리: `D:\Development\codedestiny-worktrees\saju-voice-20261128-082248`. C `f18b91949d`, B 일부 `0f7f3fbee9`·`61f758145a`, 범례 포커스 `ef11733db8`, 일 스타일 테마 `2958ea6491`, 통합 `221f69a851`, 괴강 세 소비처 보정 `f875eb9c02`. 아직 미push. 범례 9건·일 스타일 26건·괴강 관련 33건 통과. 375/960px 테마 검사 범위는 브라우저 CSS 픽스처이며 최종 화면 검수를 대신하지 않는다.
- 로컬 후속 구현: P3-5 문구·26개 종합 기준 해시 `341e6829cc`/`1959398bd5`; 무료 일 스타일·기존 구매 원본·결제 호출 부재 실화면 검사 `f9be3dfb17`; 캡처 기준선 `6631679001`(375/960px 양 테마에서 원화면 16px, 보정 전 26px, 후 17px); 오행 글자 수와 월지 가중 비율 구분·문구·줄바꿈 `1046a9e793`~`3bdaa6eefd`. 계산·권한·저장본은 변경하지 않았다.
- 화면 검수: 한국어 375/960px 라이트·네오, 영어 375px 라이트에서 신살 시트·포커스 복귀, 화자 카드·일진·편지 전환 확인. 모의 잠금 결과에서는 현재 대운 본문이 비어 있어 해금/재잠금은 별도 테스트로 확인. 일 스타일은 360/390/430/1280px 로컬 브라우저 통과. 워커 494건 통과. 통합 검사에서 검출된 대운 테스트 2건과 요청 기준값 테스트 1건은 `8afc309d80`에서 보완 후 단독 통과(7개 행에서 요청 해시만 변경).
- 전달 완료: 고객센터 타입 수정 `463c188ac2`, 복구 CI 46160123655 성공. 통합 `82b16e3e8ba31a0c85e6e0448db803651588e32d`의 check:fast/pre-push 및 main CI 46162087908 성공. 스테이징 실행 46164275321 성공, Pages /version.json 및 Worker /api/version이 모두 해당 SHA와 일치. 운영 배포 없음. 아래 단계 목록은 이전 세션의 계획 기록이다.

1. `d:\Development\code-destiny\CLAUDE.md`를 읽는다. 공유 체크아웃 `d:\Development\code-destiny`에서는 reset·stash·checkout·merge·pull·commit을 하지 않는다. 옆 세션의 미커밋 작업이 있고, 로컬 main이 수백 커밋 뒤처져 있다. 모든 작업은 워크트리에서 한다.
2. 세부 기록은 세션 상태 파일 `d:\Development\code-destiny\.claude\state\ccbee9c2.md`에 있다(약 1300줄, 미커밋). 끝부분의 "추가 요청 4", "P3 머지·push", "OOS A", "OOS D+F+H", "조정 메모" 절을 읽는다. 수치는 기억에 기대지 말고 git과 파일로 다시 확인한다.
3. `git fetch` 뒤 `gh run list --branch main --limit 5`로 main CI를 확인한다.

## 지금 상태 (2026-11-28 18시경)
- origin/main: `1664bf8f40` "fix(ci): ignore the career-style voice storage key gitleaks false positive". 이 커밋까지 P3(P3-1·P3-2·P3-6·P4)와 D·F·H 머지가 push되었다고 추정한다. 머지 에이전트가 push했고, 결과 보고는 받지 못했다. `git log origin/main --oneline -30`에서 아래 SHA가 포함됐는지 확인한다.
  - 포함 확인 대상: P3-1 dab105fe28, P3-2 26c348416b, P3-6 5fc8cc4ffd, P4 a5c4edc4fe, D·F·H d1fd57da6d
  - 확인 명령: `git merge-base --is-ancestor <sha> origin/main && echo IN`
- 그 push의 main PR CI run 46138585760은 진행 중이었다.
- 워크트리(이 세션 소유)

| 워크트리 | 상태 | 할 일 |
|---|---|---|
| `D:\Development\codedestiny-worktrees\saju-voice-20261128-082248` (wt/saju-voice-20261128-082248) | P3 머지 대상, push됨 | 남은 P3-5·P5 작업에 쓴다. 마지막에 배수 |
| `...\saju-natal-polish-20261128-144624` | P3-2, 머지됨 | CI 초록이면 배수 |
| `...\saju-cycle-polish-20261128-144626` | P3-6, 머지됨 | 배수 |
| `...\career-style-voice-20261128-113312` | P4, 머지됨 | 배수 |
| `...\oos-dfh-20261128-155710` | D·F·H, 머지됨 | 배수 |
| `...\oos-a-20261128-172336` (wt/oos-a-20261128-172336) | 묶음 A 커밋 6개와 이 문서, **미push** | 2단계에서 머지·push 뒤 배수 |

- 배수 명령은 `d:\Development\code-destiny`에서 `npm run worktree:remove -- <경로>`이다.
- 위 표 밖의 워크트리(card-rpg, android, aeo, perf, widgetqa, native-home 등)는 다른 세션 것이다. 지우지 않는다.

## 진행 중인 다른 세션 (보고만, 손대지 않는다)
- 고객센터 S9: `docs/handoff/support-center-s9-2026-11-28.md`, 브랜치 wt/support-s9-20261128-180306. "step 2a awaiting approval" 상태다.
- 결제 공백 P0: wt/payment-gap-p0-20261128-141643. origin/main 머지가 55ea4f0b1d에 올라가 있다.
- life calibration: bd0056717e~a5a0d2c252, 3f833f3b94에서 main 빨강을 수습했다.
- records 묶음 후속: 74077dfbb2에서 문서를 닫았다.
- master-consultation-voice: `d:\Development\code-destiny\.tmp\voice-worktrees\master-consultation-voice-20261126-080025`
- 공유 체크아웃의 미커밋 변경(카드 RPG 삭제, AppChrome·layout·NightHero 등)은 옆 세션 것이다.
- 위 세션의 커밋 때문에 main이 빨갛게 되면 그 위에 push하지 말고 커밋 SHA를 보고한다.
- 결제 독립 페이지 캐시 핀 낡음(`verify:payment-choice-parity`, 5797b38b19 유래)은 check:fast에서 우리 diff와 무관하게 실패할 수 있다. 그때는 "남의 몫"으로 기록한다.

## 승인 상태 (원문)
- 계획 승인 2026-11-28(ExitPlanMode). 사용자 요청 5개는 계획 파일 `C:\Users\user\.claude\plans\pasted-content-id-32f7-code-cuddly-flute-of-ccbee9c2-3d47-4c20-84f5-28095eec105d.md`에 있다.
- "범위 밖 문제도 수정해" (2026-11-28)
- RED 선택(AskUserQuestion): "괴강 壬戌 누락 보정 (추천), 신살 범례 클릭 + 줄밀림, 일 스타일 neo 테마·옛 브라우저 테스트"
  - 미선택이라 보류·보고: 액땜 카드의 PDF·토스·다국어(R9-1/R9-6)
- 연이 고정 문구(메일 카드·상담 안내): "그대로 두기 (추천)". 결함이 아닌 것으로 닫았다.
- "모든 권한 승인하는데 … 인수인계해서 제대로 마무리하도록" (2026-11-28): 명령 실행 권한 승인이다. **운영 배포 승인이 아니다.**
- 운영 배포 결정 "1차 보류, 2차 때 함께 (추천)": 모든 작업이 끝난 뒤 e0777b28b0..그 시점 main 범위(옆 세션 커밋 포함)를 AskUserQuestion으로 다시 묻는다. 승인되면 아래 가드 한 줄로 dispatch한다.
  ```
  A=<승인 SHA>; H=$(git ls-remote origin refs/heads/main | cut -f1); if [ "$A" = "$H" ]; then gh workflow run cloudflare-pages-deploy.yml --ref main -f mode=production; else echo "main moved: $H"; fi
  ```
  dispatch한 뒤 run headSha와 `/api/version`을 확인한다.
- 받지 않은 승인: 과금 LLM 실호출, 실결제·운영 DB 쓰기.

## 작업 규칙과 함정
- 동결·금지 파일: `.env*`, `package-lock.json`, `.wrangler/`, `dist/`, `out/`, `worker/wrangler.toml` 구조, 결제 동결 파일(`config/payment-freeze.json`과 대조). `?v=`는 손으로 고치지 않고 `npm run sync:public`이 만든다.
- 고정 규칙(Gate 1~4): `sajuAdapter.ts`의 `calculateLocalResult()`는 수정 금지. KASI prefetch와 `normalizeSaju.ts`에는 timezone을 넣지 않는다. 6개 점술 엔진은 읽기 전용이다.
- 생성물 충돌은 손으로 합치지 않고 다시 만든다.
  - 런타임: `node scripts/extract-saju-section-runtime.mjs --write`, 확인은 `--check`
  - 패리티 픽스처 `__tests__/fixtures/saju-section-client-parity.json`: 테스트 파일의 헬퍼로 임시 테스트를 돌려 다시 만든다(선례 206c694860·5fc8cc4ffd·1cadcab818). 별도 `test(saju)` 커밋으로 남긴다.
  - sitemap이 어긋나면 `npm run sitemap:generate` 뒤 `chore(seo)` 커밋
- `sync:public`이 `public/feature-details/crafted/*.webp`를 다시 인코딩하는 잡음은 D·F·H에서 sha 잠금으로 고쳤다. 그래도 생기면 되돌린다.
- 토스 번들 한도는 풀린 크기 100,000,000B, 최근 실측은 98,662,896B다. 이미지 경로는 완전한 문자열 리터럴로 쓴다(`${}` 템플릿을 쓰면 폴더 전체가 복사된다). 토스에 닿는 파일에 이미지를 더하면 `npm run build --prefix apps/toss`로 다시 잰다.
- 검사 흐름: `npm run check:fast`(커밋한 뒤에는 `--base=<sha>`) → commit → `npm run check:pre-push` → main CI가 빨간지 확인 → `git fetch && git merge origin/main` → `git push origin HEAD:main` → 백그라운드 `gh run watch <id> --exit-status`를 한 번만 돌린다. sleep으로 반복 확인하지 않는다.
  - 동시에 도는 스위트 때문에 60초 타임아웃·EPERM 헛실패가 날 수 있다. 실패한 스위트만 한 번 단독으로 다시 돌린다.
- 화면 검수는 headless Chrome으로 한다(headed는 멈춘다). 이미지 판정은 visual-checker 서브에이전트에 맡기고 메인 세션은 이미지를 읽지 않는다. 기준: 375·960px, 라이트·neo-mode, 연이(`cdSajuPersonaV1='pig'`)·영냥이(`'neo'`).
- 말투 정본
  - 연이: 존댓말로 "당신"이라 부르고, 관찰 → 생활 사례 → 작은 실천 순서로 말한다.
  - 영냥이: 반말로 "너"라 부르고, 진단 → 근거 → 행동 순서로 말하며 끝은 다정하게 맺는다. "~냥"은 짧은 줄에서만 쓴다.
  - 한국어 다듬기 기준: `docs/design/saju-reading-modes.md` "## 한국어 다듬기 기준 (2026-11-28)". 도구는 `sepia:sepia-refactor`
- 구매한 결과는 삭제하거나 숨기지 않는다. 정적 결과는 다시 렌더되어 새 문구가 보인다(기존 동작). 일 스타일 저장본은 원본(연이)을 그대로 보여 준다.
- 커밋 메시지 끝: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- `taskkill /IM node.exe`는 쓰지 않는다. 편집 전에 CRLF/LF를 확인한다.

## 단계
- [x] P0 CI 복구, P1 신살 카드, P2a/P2b 화자 이미지, P3-3 일주 다듬기 (push됨)
- [x] P3-1·P3-2·P3-6·P4 + D·F·H 머지·push (1664bf8f40 계열, CI 결과 확인 필요)
- [x] **1. CI 확인**: 1664bf8f40 / 46138585760 success. 선행 커밋 5개 포함 확인.
- [ ] **2. 묶음 A 머지·push**: oos-a 워크트리에서 `git merge origin/main`을 한다. paid-renderers.src.js·runtime·parity가 겹치므로 runtime과 parity는 다시 만든다. 그 뒤 sync:public → check:fast → pre-push → push → CI 1회 → oos-a 배수. 이 문서도 같이 main에 올라간다.
- [ ] **3. 묶음 C** (P1-4, P1-5, P3-2-3): index.html, i18n, manse-view.js, reading-personas.js. 분류표는 `D:\Development\Temp\claude\40e1d9fc07e84b89\ccbee9c2-3d47-4c20-84f5-28095eec105d\scratchpad\oos\triage.md`
- [ ] **4. 묶음 B** (P3-3-1, P3-2-1, P3-2-2, P3-2-4, P3-2-5)와 새 문구 후보
  - 영냥이 모드의 "과유불급 경고"·"지지합" 카드가 존댓말로 나온다.
  - `js/saju-engine.js:25466` 옛 대운 안내
  - "떠올릴 수 있어요"가 남아 있다(`js/saju-engine-tarot-sukuyo-quantum.js`, `lib/saju/crystal-catalog.mjs`).
  - `lib/saju/reading-depth-public.mjs` cycleActions
  - "화 / (火)" 줄갈림(A-new-2): reading-personas.js·reading-rich.js 라벨을 nowrap span으로 감싸고, 워커 짝(parity)도 맞춘다.
- [ ] **5. 묶음 E**: P4-1, 그리고 선택된 P4-3(일 스타일 페이지 neo/다크 테마), P4-4(`career-style.browser.mjs`를 현행 흐름으로 갱신하고 배선).
  - P4-4의 결제 단언은 RED이므로 위험·검증·롤백을 먼저 적고 진행한다.
- [ ] **6. 선택된 RED(G)**
  - X-1: 괴강 목록 3곳에 壬戌를 추가한다. 유료 재열람 결과·골든·parity가 바뀌므로 별도 커밋으로 한다.
  - P1-6: 신살 범례를 눌러 해당 신살로 이동하게 한다(기능 추가).
  - P1-3: html2canvas 글자 밀림. 사이트 전체 캡처와 PDF에 영향이 있으므로 시각 검수를 반드시 한다. share.js의 h2c 블록(D에서 만든 `// ── h2c-capture-colors` 구간)을 이어서 고친다.
  - 보류·보고만: R9-1/R9-6 액땜 PDF·토스·다국어, P1-8(`prompt-hub-honey.js:63 products?.`, 결제 UI이므로 payment-freeze 절차만 확인하고 보고)
- [ ] **7. P3-5 유료 종합 다듬기**: `worker/lib/saju-section/paid-renderers.src.js` 상자 ①–⑤, ⑥–⑩, ⑪–⑮를 세 묶음으로 나눠 sepia-refactor 기준을 적용한다. 한국어만 다듬고 슬롯·계산값·`*Neo` 구조는 보존한다. 그 뒤 parity를 다시 만들고 push한다.
- [ ] **8. P5 마무리**
  - 시각 매트릭스: `/ggulggul/` 사주 카드(신살 펼치기·시트, 머리 카드, 화자 말풍선, 공유 캡처)와 `/saju/career-style/` 두 모드. 375·960px, 라이트·neo.
  - saju-voice 워크트리를 배수하고, 이 문서를 `status: done`으로 닫아 커밋한다.
  - 스크래치 삭제(`D:\Development\Temp\claude\40e1d9fc07e84b89\ccbee9c2-3d47-4c20-84f5-28095eec105d\scratchpad\` 아래 r9-ci.log, green-ci.log*, ci-*.log, runs.txt, t*.txt, shinsal-consumer-injection-notes.md, p1-shots/p2a-shots/p4-shots, p1-qa.mjs/p2a-qa.mjs, p3m-*, p3merge-*). `llm-probe\`와 전후 비교 문서(p31·p32·p36·p4)는 사용자 검수용이므로 남긴다.
  - 최종 한국어 보고를 하고, 2차 운영 배포 범위를 AskUserQuestion으로 묻는다.

## 범위 밖으로 보고만 할 후속 (고치지 않음)
- 24절기 제목 `--pink` 2.21:1(사이트 공용 토큰), `.t24-section-label` 약 11.5px, 24절기 헤드라인이 단어 중간에서 끊김, `styles/fortune-ui-home.css:604`(생성물) 미반영
- neo 테마의 번들 CTA(`.cd-bundle-inline`)가 크림색 배경이다. 캡처에서 FREE 배지와 칩 보조 라벨이 조금 잘린다. neo 테마에서 쌓인 액땜 카드 간격이 좁다.
- 액땜 R9-4 가정: 같은 축의 짝은 방법 쪽이 이긴다. 그래서 백호 카드의 풍속은 custom-new-year-aengmagi가 되고, LLM 프롬프트에는 피 풍속이 남는다.
- 구조 문제: godLife/flowOpen 문장 중복, 연이 편지 종합 문단 반복, 관계 장 relation 문장 이어 붙임
- 영냥이 일 스타일 전용 이미지가 없다. 토스 번들 여유는 약 1.3MB다.
