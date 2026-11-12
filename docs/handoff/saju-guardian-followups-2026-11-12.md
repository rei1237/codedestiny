---
status: active
updated: 2026-11-12
next: "7단계(라이트 편입, 승인됨) → 5단계(프로필 화면 가디언 이미지 버튼을 프롬프트 제공으로 전환) 순서로 먼저 진행한다."
---

# 사주 가디언 후속 과제

본 작업(이미지 생성 → 이미지 프롬프트, 가격 3,000원)은 운영 `16dfa794fc491c5fe6c22c54f51030a94cc7286d`에 반영되었다. 경위와 검증은 `docs/handoff/saju-guardian-prompt-2026-11-11.md`에 있다. 이 문서는 그때 범위 밖으로 남긴 과제를 다른 세션이 이어 가기 위한 것이다.

## 첫 행동
1. `powershell -File scripts/create-safe-worktree.ps1 -Slug saju-guardian-followups`로 origin/main 기준 새 워크트리를 만든다. 메인 체크아웃 `D:\Development\code-destiny`(다른 작업의 미커밋 변경)는 건드리지 않는다.
2. 「단계」에서 체크되지 않은 첫 항목부터 진행한다. 항목마다 따로 커밋한다.
3. 「사용자 결정 필요」 항목은 구현하지 말고 선택지를 보고한다.

## 지금 상태
- 기준: origin/main `6a1bd9528`(문서 작성 시점). 운영 `16dfa794f`.
- 가디언 현재 동작:
  - 서버 `worker/routes/guardian-image.js`: `POST /api/guardian/image-prompt`(로그인·생년월일 해금 필요, 영문 프롬프트·제외 요소·seed 반환), `POST /api/guardian/generate-image`는 410 `IMAGE_GENERATION_RETIRED`.
  - 클라이언트 `app/saju-guardian/SajuGuardianClient.tsx`: 결과 화면 `#guardianPromptStudio`.
- 가격: `worker/lib/paid-feature-registry.js` `saju-guardian-unlock`·`unlock.saju_guardian` 30코인(3,000원). 생년월일(명식) 1건 구매, 같은 생년월일 재열람 무료(BIRTH 범위 해금). Play는 기존 `cd_content_tier_01`.

## 승인 상태 (원문·날짜)
- 2026-11-11 가격: "회당 가격은 3천원 정도로해주고 사주 무료화 릴리즈에 함께 배포해주면 좋겠다" → 30코인, 운영 반영 완료.
- 2026-11-12 이용권 소진 기준: "이용권 소진 기준은 30코인이든 10 코인이든 소진이 되는게 맞고" → `worker/lib/profile-limits.js` `MIN_PASS_COVERABLE_COIN`·`FAMILY_MIN_PASS_COVERABLE_COIN` 50→30 연쇄 변경(이용권 대상 최저가 = 소진 기준)을 그대로 유지한다. 되돌리지 않는다.
- 2026-11-12 후속 과제: "남은 후속 과제들은 다른 세션에서 진행가능하도록 인수인계해줘" → 이 문서.
- 원래 지시(계속 유효): 기존 권리·보관 이미지·결과·구매 이력 삭제·회수 금지. 운영 DB 변경·운영 배포는 별도 승인. API 키·개인정보 출력 금지.
- 2026-11-12 라이트 편입·이미지 기능: "사주 가디언도 그냥 라이트에 넣도록해주고 프롬프트만 제공해주도록해 기존 이미지 생성 기능은" → 7단계 B안(라이트 편입) 승인, 남아 있는 이미지 생성 진입점은 모두 프롬프트 제공으로 바꾼다.
- 승인 없음: 운영 배포, Worker 비밀값 삭제, 운영 DB 쓰기.

## 작업 규칙과 함정
- 커밋 메시지 끝: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. PR을 만들지 않는다. main push는 사용자 요청이 있을 때만. 로컬 main에 남의 미push 커밋이 있으면 origin/main 기준 트리에 내 커밋만 cherry-pick해서 push.
- 다른 세션이 main·운영 승격을 동시에 다룰 수 있다. push 전에 진행 중인 Release run을 확인하고, 승격 중이면 담당 세션과 조율한다.
- 로컬 `npm run check:fast`는 커밋 뒤 실행하면 기본 베이스가 HEAD라 "검사할 변경 없음"으로 끝난다. `node scripts/check-changed.mjs --profile=fast --skip-build --base=origin/main`으로 돌린다.
- 테스트 전에 `npm run fortune:build-data`(test:node가 당일 데이터 파일을 요구).
- `scripts/i18n-merge-authored.mjs --core`를 쓰지 않는다(객체→배열 대량 churn). `public/i18n/*.json`은 해당 값만 외과적으로 바꾼다.
- 생성기: `npm run sync:public`(미러·마케팅 문구·상세), `npm run sitemap:generate`. `index.html` 바꾸면 `public/{,en,ja,zh,zh-tw,static,ggulggul}/index.html` 미러가 따라와야 한다.
- Windows에서 `js/core/free-fortune-policy.{js,mjs}`와 `public/js/core/` 미러 4파일이 줄바꿈만 바뀐 거짓 변경으로 나타날 수 있다. 커밋하지 않는다. rebase를 막으면 `git update-index --assume-unchanged <4파일>` → rebase → `--no-assume-unchanged`.
- `verify:feature-marketing-schema`는 상세창 receives 문구의 개발 용어 금지어를 막는다. 한국어 판매·상세 문구에 "프롬프트" 대신 "그림 설명문"을 쓴다(f7baafd1f 선례).
- 가격·권리·결제 경로는 이 문서 범위에서 바꾸지 않는다(라이트 편입은 결정 항목).

## 단계
- [ ] 1. 구매 내역 표기 오류: `app/points/history/order-view-model.ts:99` `if (product.includes("guardian")) return "guardian-fortune";`가 `saju-guardian-unlock` 주문까지 잡아 `copy.guardian`("오늘의 귀인 운세 대화권", en "Guardian Fortune conversation pass", 57·74행)로 표시한다. `guardian-fortune`(app/fortune-chat 귀인 운세)과 사주 가디언을 구분해 사주 가디언 주문은 올바른 이름(예: 「사주 가디언 소환진」)이 나오게 한다. 기존 주문 기록은 바꾸지 않고 표시만 고친다. 근처 테스트(`__tests__` 중 order-view-model)를 찾아 한 건 추가.
- [ ] 2. 영문 등 11개 언어의 잘못된 가격 CTA: `public/i18n/{de,en,es,fr,hi,ja,ms,nl,vi,zh-cn,zh-tw}.json` 약 6003행 `cta.openSajuGuardianPage`·`cta.openSajuAnimalPage`가 "Permanently unlock for 10,000 KRW" 류다. 실제 가격(3,000원, 생년월일별)과 다르다. 먼저 이 키의 정본(i18n/authored 또는 생성기)과 실제 사용처를 찾아 정본에서 고치고, 화면에 실제로 노출되는지 확인한다. 한국어 쪽 대응 문구도 함께 확인.
- [ ] 3. 번역 사전 누락: `SajuGuardianClient.tsx:1829` `tx("나의 수호 캐릭터")`가 en 사전에 없다. en 항목 추가(같은 파일의 사전 객체).
- [ ] 4. 개발 경고: `SajuGuardianClient.tsx:1338` `<g transform-origin="200 200">` → React 속성 `transformOrigin`(또는 style). 회전 애니메이션 중심이 그대로인지 화면으로 확인.
- [ ] 5. (우선, 승인됨) 이미지 생성 진입점 → 프롬프트 제공. 아래 조사 뒤, 버튼이 렌더되면 이미지 생성 대신 사주 가디언 그림 설명문(프롬프트)으로 안내한다(예: `/saju-guardian/` 결과의 `#guardianPromptStudio`로 이동, 문구는 "그림 설명문 받기" 류, "생성 중" 스피너 제거). 렌더되지 않으면 죽은 코드로 제거. 다른 곳에 남은 가디언 이미지 생성 호출(NVIDIA·flux·generate-image·guardian-avatar)이 없는지 전수 grep. — 원래 메모: 죽은 코드 `/api/guardian-avatar`: `js/destiny-profile.js:10584`(미러 `public/js/destiny-profile.js`)가 호출하지만 `worker/`에 라우트가 없다. `.dp-mc-guardian-btn` 버튼이 실제로 렌더되는지 확인하고, 렌더되면 눌렀을 때 실패만 하는 상태이므로 버튼과 함수를 제거한다(또는 /saju-guardian로 연결). 미러는 sync로 맞춘다. 관련 정적 검사·테스트 확인.
- [ ] 6. (7단계로 대체) 낡은 제외 사유: `worker/lib/light-fortune-catalog.js:18` `'saju-guardian-unlock': '해금 뒤 호출마다 외부 이미지 모델(NVIDIA flux)을 부른다'`는 더 이상 사실이 아니다. 7단계 결정 전까지는 제외는 유지하고 사유 문구만 사실대로 바꾼다(예: "유료 생년월일별 해금 상품으로 유지(2026-11-12 이미지 생성 종료 뒤 라이트 편입 미결정)"). 이 값을 고정하는 테스트가 있으면 함께.
- [ ] 7. (우선, 승인됨: B안 라이트 편입) `worker/lib/light-fortune-catalog.js`의 `LIGHT_FORTUNE_AUDIT_EXCLUDED_KEYS`에서 `saju-guardian-unlock`을 빼고 라이트 목록에 넣는 공식 경로(카탈로그 정본·생성기·`verify:pass-tier-policy`·이용권 상태 API·클라이언트 미러·판매 문구의 이용권 표기)를 따라 편입한다. 비이용권 판매가는 3,000원 그대로, 기존 권리·주문 기록은 그대로. `MIN_PASS_COVERABLE_COIN`이 검사 규칙상 다시 바뀌어야 하면 규칙대로 맞추고 결과를 보고(사용자: 30이든 10이든 소진되는 게 맞다). 테스트: 이용권 보유자가 가디언 프롬프트를 차감 없이 받는지, 비보유자는 3,000원 결제 요구(402)인지, 라이트 대상 목록 고정 테스트 갱신. 원래 메모 — 라이트(이용권 무제한) 편입 여부: 2026-11-04 판정(`docs/handoff/2026-11-04-pass-flat-pricing-rulings.md` 18행)은 NVIDIA 비용 때문에 가디언을 라이트에서 뺐다. 지금은 외부 비용이 없다. 선택지: A) 현행 유지(유료 3,000원, 이용권은 예산 차감), B) 라이트 편입(이용권 보유자 무제한). 영향(이용권 가격 정책 검사, 소진 기준, 판매 문구)을 정리해 보고만 한다.
- [ ] 8. 🟡 사용자 승인 필요 — NVIDIA 비밀값 정리: 코드에는 `NVIDIA_DRAW_API_KEY` 참조가 없다(origin/main grep 0건, 문서 제외). Worker 비밀값 삭제(`wrangler secret delete NVIDIA_DRAW_API_KEY` 운영·스테이징)와 NVIDIA 계정 키 폐기는 운영 외부 행동이므로 승인 뒤에만. 값은 절대 출력하지 않는다. 다른 기능이 같은 비밀값을 쓰는지 먼저 확인(worker 전체 grep, wrangler 설정).
- [ ] 9. 상세 패널 08·09 대체 그림: 2026-11-11 결정으로 `content/product-details/saju-guardian/manifest.json`과 공식 빌드 산출물 `public/feature-details/crafted/saju-guardian/manifest.json`에서 `08-image-and-profile`·`09-before-you-begin`을 뺐다(원본 webp는 남아 있음). 새 패널은 `panels.cjs`·`한글-원고.md`·`editable-layout.html`·`layout.css` 흐름으로 만든다. 내용: 이미지는 제공하지 않고 외부 이미지 도구용 그림 설명문을 준다, 3,000원 생년월일별, 저장 프로필 필요. 금지어 "프롬프트" 주의. 기존 패널 그림을 나란히 놓고 화풍을 맞춘다. 만든 뒤 사용자 확인을 받고 manifest에 다시 넣는다(`build-visual-details`가 참조 안 되는 -540 변형을 지우므로 manifest와 함께 빌드).
- [ ] 10. 낡은 docs 인벤토리: `docs/purchase-journey/inventory.json`, `docs/mobile-platform/inventory.json`, `docs/product-details/sale-symbol-evidence.json`에 옛 가디언 문구(AI 이미지·5,000원)가 남아 있다. base부터 이미 낡아 재생성하면 수천 줄이 바뀐다. 해당 생성기를 찾아 별도 커밋으로 재생성하고, 바뀐 범위가 가디언 외에도 넓으면 그 사실을 보고한다.
- [ ] 11. (선택) 쓰이지 않는 키 `home.tiles.sajuGuardianPricePrice5000`(public/i18n 12개)은 새 키 `...Price3000`으로 대체되었다. 사용처 0건을 확인한 뒤 정리할지 판단. 정리 검사(i18n 미사용 키)가 있으면 그 규칙을 따른다.
- [ ] 12. (선택) Windows 줄바꿈 거짓 양성: `verify-public-mirror-fresh`가 free-fortune-policy 4파일에서 CRLF만으로 실패한다. `.gitattributes` 또는 검사 정규화로 고칠 수 있는지 조사만 하고 보고.

## 검증 기준
- 항목별: 관련 jest/node 테스트, `node scripts/check-changed.mjs --profile=fast --skip-build --base=origin/main`, `npm run check:worker`(worker 바꾼 경우), 화면 변경은 390px 브라우저 확인(가로 스크롤 없음, 버튼 44px 이상). 가디언 화면 e2e 예시: 쿠키 배너 「필수만 사용」 → 「출생 좌표 입력하고 인장 열기」 → placeholder 년도/월/일/시 입력 → 「수호 인장 열기」 → `#guardianPromptStudio`. 해금은 localStorage `cd_tile_locks` `{"saju-guardian-unlock":true}`, API는 route 모의.
- 끝나면 이 문서의 체크박스·결과를 갱신하고 커밋한다.
