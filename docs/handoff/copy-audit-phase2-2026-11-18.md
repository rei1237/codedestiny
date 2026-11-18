---
status: in-progress
updated: 2026-11-18
next: A3 — A-novel-03.md 적용(원고 수정과 번역 갱신을 같은 커밋에)
---

# 문장 교정 Phase 2 (sepia) — 진행 문서

## 첫 행동
`git branch --show-current`가 main인지, `git status`가 깨끗한지(남의 미추적 `.claude/skills/fire-your-seo-agency/`는 무시) 확인한다. `git pull --ff-only` 후, 아래 "단계"에서 체크되지 않은 첫 항목을 진행한다.

## 승인 상태 (원문)
- 2026-11-18 사용자: "네오는 좀 그런 컨셉인데 그래도 친절한 츤데레로 바꿔주면 좋겠고 나머지는 모두 추천안으로 진행해주면 될것 같다"
- Phase 1 리포트: `docs/copy-audit/2026-11-18/` (커밋 6e50305f6). 각 표의 "수정안"이 추천안이다.
- 2026-11-18 사용자 결정(번역 질문 답): "번역도 함께 갱신 (Recommended)" — 원고에서 바뀐 비트만 en·ja·zh-CN·zh-TW authored 번역을 오프라인 직접 수정하고 source/sourceHash를 새 원문으로 맞춘다. 요청서의 '다른 언어 파일 수정 금지'에 대한 소설 번역 한정 예외다(서비스 i18n 번역은 여전히 수정하지 않는다).
- 이 승인은 문구 수정까지다. 운영 승격·실결제·과금 LLM 실호출은 포함하지 않는다.

## 결정
1. **네오 = 친절한 츤데레.**
   - 대본 대사(전략실 dialogues·welcome·소설 밖 서비스 대사)에 적용한다.
   - 첫마디는 짧고 퉁명하다. 반말과 "너"를 허용한다. 결론부터 말하고, 끝에는 꼭 챙겨 주는 한 줄을 둔다(예: "…딱히 걱정돼서 하는 말은 아니야. 그래도 이건 챙겨.").
   - 금지
     - 비하·조롱. 예: "네가 망친 선택", "흥" 남발.
     - 공포 조장. 예: "망한다".
     - 확정 예언. 예: "반드시".
     - 과장된 작전·전쟁 비유. 전략실·팩폭이라는 이름은 유지한다.
   - 오류·결제·버튼 같은 UI 문구는 네오 화면이어도 해요체로 쓴다.
   - LLM 페르소나 `worker/yeongnyangi/prompts/persona/neo.ts`의 말투 지시는 바꾸지 않는다. 과금 생성 결과를 바꾸는 일이고 실호출 검증이 금지돼 있어서다. 후속 제안으로 보고한다.
   - `docs/context/design-canon.md` 2절 네오 행에 이 결정을 반영한다(B 단계).
2. **"추천안대로"의 해석**
   - 리포트 행의 수정안을 P1·P2·P3 전부 적용한다.
   - "제안:"으로 시작하는 구조 변경
     - 몇 비트·몇 줄 안에서 끝나고 설정·사건 순서·복선을 바꾸지 않으면 적용한다.
     - 연속성 오류(P1 사실 불일치) 정정은 적용한다.
     - 새 장면·새 사건·플롯 변경이 필요하면 적용하지 않는다. "미적용(구조)" 목록에 남긴다. 예: EP.52S에 선택과 대가 장면 추가, 바보~별 4화의 공식 깨기.
   - 다른 수정안과 충돌하거나, 적용해 보니 앞뒤 문맥이 어색해지면 건너뛰고 이유를 남긴다(sepia slack).
3. **꽃돼지**는 canon 그대로 연이와 같은 인물이며 존댓말을 쓴다. "꽃돼지?" 물음표는 리포트 수정안을 따른다.
4. **기능명**
   - 리포트에 추천이 명시된 것만 통일한다: 팩폭 → "네오의 팩폭 전략실", 흑월 → "흑월의 주의 시기", 나크샤트라 "결정판" 삭제, 작명 → "사주 맞춤 작명", "바람끼" → "바람기".
   - 추천이 없는 브랜드 결정은 하지 않는다. 대상: 이용권 상위 이름, 연애 비책 개명.
   - registry `reason` 변경은 RED다. paid-gate-auditor 점검과 `verify-payment-copy-dictionary`를 포함한 check:fast를 통과해야 한다. 가격은 바꾸지 않는다.

## 작업 규칙과 함정
- 불변(요청서)
  - 운세 엔진과 sajuAdapter.ts·normalizeSaju.ts는 수정하지 않는다.
  - 결제 실행·동결 파일은 수정하지 않는다(README "유료 기능 문구 기준" 목록). `config/payment-freeze.json` 대상도 마찬가지다.
  - i18n 키 이름은 바꾸지 않는다. ko 값만 고친다. `i18n/authored/*.json`은 모든 로케일이 한 객체에 있으므로 ko 필드만 손댄다.
  - 하드코딩 문자열을 i18n으로 옮기지 않는다.
  - 다른 언어 값은 수정하지 않는다. 의미가 바뀐 ko 키는 "번역 동기화 필요" 목록에 남긴다.
  - 글자 수는 ±20% 안으로 맞춘다. 넘으면 기록한다.
  - 금지 표현을 넣지 않는다.
- 원고: `content/novel/episodes.source.json`을 수정한 뒤 `npm run novel:build`로 생성물(`public/data/novel/`, `lib/stories/vn/episodes.generated.json` 등)을 만들어 함께 커밋한다. 번역은 위 결정대로 함께 갱신한다: 바뀐 비트의 `content/novel/translations/authored/<locale>-ep-XX.json` 행을 새 원문에 맞춰 직접 번역(번역 API·과금 LLM 금지)하고 `source`·`sourceHash`를 갱신한다. 해시만 다시 찍고 번역문을 그대로 두는 것은 금지(계약 위반). 절차는 `content/novel/translations/README.md`를 따른다. 검증: `node scripts/verify-novel-locale-completeness.mjs`, `npm run novel:build` 뒤 4개 로케일이 다시 게시되는지(availableLocales) 확인, `npm run verify:story-sync`. A2~A6은 원고 수정과 번역 갱신을 같은 커밋에 넣는다.
- 번역 갱신 실제 절차(T1에서 확인)
  - 바뀐 비트 추출: 부모·대상 커밋의 `episodes.source.json`을 비트 id로 비교해 `t`가 다른 비트를 뽑는다. 🔴 Windows에서 node `execSync('git show X^:...')`는 cmd가 `^`를 먹어 부모가 자기 자신이 된다(변경 0건). `X~1`을 쓴다.
  - 각 비트는 `authored/en-*.json`(`beats[].t`), `ja-*.json`·`zh-*.json`(`rows[].translations.{ja|zh-CN,zh-TW}`) 세 파일에 한 행씩 있다. `prologue-00x.json`·`prologue-metadata.json`은 조립에서 빠지는 옛 공용 파일이라 고치지 않는다(이미 일부 stale). `zh-prologue.json` 일부 행에는 en·ja 키도 있으니 같은 문장으로 맞춘다.
  - 행마다 `source`=새 원문, `sourceHash`=sha256(새 원문). 파일 형식은 `JSON.stringify(d,null,2)+'\n'`(LF)로 바이트 왕복 일치.
  - 로케일 파일(`translations/<locale>.json`)은 실행기가 없다. 스크래치 스크립트에서 `scripts/lib/novel-authored-merge.mjs`의 `assembleNovelAuthored(sourceRaw, 해당 접두사(en-/ja-/zh-) authored 문서들, locale, content/novel/ui-copy.json)`로 조립하고, 기존 파일과 비트별로 비교해 바뀐 비트 밖 차이 0·missing 0일 때만 같은 형식으로 쓴다. 파일 sourceHash는 조립 결과가 원고 전체 sha256으로 넣는다.
  - 그다음 `node scripts/verify-novel-locale-completeness.mjs` → `npm run novel:build`(locale 에피소드 292개·manifest 갱신) → `public/data/novel/manifest.json`의 availableLocales 확인 → `npm run verify:story-sync` → `npm run sitemap:generate`(`config/sitemap-lastmod.json` signature만 바뀔 수 있음, 함께 커밋).
- `index.html`을 고치면 `npm run sync:public`을 돌리고, 생성된 미러를 함께 커밋한다.
- i18n authored를 고치면 merge 스크립트(`scripts/i18n-merge-authored.mjs`, 또는 package.json의 해당 npm 스크립트)로 생성물을 갱신한다.
- 검증: `npm run check:fast` 1회. 실패하면 원인을 고친다. 회귀가 나면 덧대지 말고 되돌린다.
- 커밋
  - 단위마다 하나씩 한다. 경로를 지정해 `git add <paths>` 한다. `git add .`는 쓰지 않는다.
  - Conventional Commits 형식: `copy(novel): ...`, `copy(service): ...`, `copy(paid): ...`
  - 트레일러: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- 공유 체크아웃이다. `git reset --hard`, `stash`, `checkout --`를 쓰지 않는다. 남의 미추적 파일을 건드리지 않는다.
- 각 리포트 파일 끝에 "## Phase 2 적용 결과" 절을 추가하고 같은 커밋에 넣는다. 내용
  - 적용 행 수
  - 건너뛴 행과 이유
  - 미적용(구조) 목록
  - 번역 동기화 필요 키
  - 글자 수 ±20% 초과 목록
  - Before/After 대표 2쌍

## 단계
- [x] A1 `A-novel-01.md` — 73행 적용, 건너뜀 8, 미적용(구조) 7. 🔴 원고 수정으로 번역 4개 언어가 stale 판정(availableLocales=[ko]) — push 전 번역 재조립 필요 여부 결정. novel:build 뒤 sitemap:generate 필요(소설 URL lastmod). check:fast는 범위 밖 기존 실패 `__tests__/ui/feature-visual-details.test.mjs`(fusion-fortune 이미지 기대값, 29022710f 이후)로 test:node에서 BLOCKED — 보고만
- [x] T1 A1(c3ae3dffd)에서 바뀐 비트의 4개 언어 번역 갱신 — 78비트 × 4언어(authored 행 234개, 문장 수정 291건; 문장부호·어미만 바뀐 5비트와 뜻이 이미 맞던 en 2·ja 1건은 원문 대조 후 번역 유지). 4개 언어 missing 0, 바뀐 비트 밖 출력 차이 0. `public/data/novel/manifest.json` availableLocales = ko·en·ja·zh-CN·zh-TW 복구
- [x] A2 `A-novel-02.md` — 65행 적용(65비트, ep-14a:11 화자 neo→yun 포함), 건너뜀 3, 미적용(구조) 2. 번역 65비트 × 4언어 같은 커밋(authored 행 195, 번역문 수정 168), missing 0·범위 밖 차이 0, availableLocales ko+4
- [ ] A3 `A-novel-03.md`
- [ ] A4 `A-novel-04.md`
- [ ] A5 `A-novel-05.md`
- [ ] A6 `A-novel-06.md`
- [x] B1 `B-service-characters.md` (네오 츤데레, design-canon 2절 갱신 포함) — 적용 70·보류 6·구조 2, 번역 동기화 18키(+네오 en/ja/zh 표). 결과는 리포트 "Phase 2 적용 결과" 절
- [ ] B2 `B-service-stats.md` 대표 예시 행
- [ ] C1 `C-paid-signature.md`
- [ ] C2 `C-paid-catalog.md`
- [ ] 마무리: 금지 표현 grep, 불변 파일 diff 0 확인, check:pre-push, push, 최종 보고(요청서 7절 형식)
