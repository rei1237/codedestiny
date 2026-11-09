---
status: in-progress
updated: 2026-11-09
next: 이벤트 명시화 후 check:fast(exec24559) 결과 확인, 해당 수정 커밋·pre-push·HEAD:main 전달·CI1회 확인·승인된 production dispatch1회·워크트리 배수
---

# 달빛 정원 다이어리와 일반 캐릭터 외형 조합

## 첫 행동
이 문서와 최신 git 상태를 읽고 next부터 계속한다. 승인 범위를 반복 확인하지 않는다.

## 지금 상태
- 구현 복구 지점은 8a68f11decfc300068a30fca75b56f6a445ac1d3. 최종 critical 실행45391은 기존 고아 이벤트 정적 검사에서 `cd:diary-open`의 매개변수 발신을 인식하지 못해 중단했다(그 앞 paid/lint/typecheck 통과). notify에서 두 발신 이름을 명시했고 정적 배선+실제 DOM 행동7개 모두 통과. 검사 면제·약화 없음. 미러 동기화 후 기본 변경 기반 check:fast를24559로 다시 실행 중(.tmp/diary-check-fast-delivery.log, 계획 diary-event-plan.log). 이전 critical 전체를 통과했다고 보고하지 않는다.
- **최신 정본(아래 초기 진행 메모보다 우선):** 소스·실제 UI 구현 완료. Ego73을 finish({keep:[]})로 닫았고 mock 서버18279 종료. 최종 독립 시각 검수 SHIP(작은 공용 프로필·유니크·알·정원·먹기/놀이/잠자기·stamp 모두 회귀 없음).
- CI 준비 복구는 db66c6f71 + 3604d30057179e224261a556a3ce10077acc28a7. 두 번째는 기존 upstream billing runtime 캐시 핀 변경에 빠진 동결 해시 1개만 공식 도구로 갱신했다. 결제 로직·허용 범위는 바꾸지 않았다. verify:payment-freeze 통과.
- 최종 sync:public·sitemap:generate·verify:payment-freeze 통과 후 check:fast 자동 critical 실행 중(exec45391). 계획/로그 .tmp/diary-check-{plan,fast}-final.log. 이전 첫 전체 실행은 기존 freeze 해시 오류 하나로 실패했으며 복구 후 재실행이다. 실행하지 않은 검사나 진행 중인 검사를 통과로 보고하지 않는다.
- targeted69개 통과, shared portrait/appearance5개 통과, 서버 mock20개 통과, 기존 summary browser 전체 통과, sprite verifier35개 기존 atlas+신규48파트 통과. detector는 **정확히 1회** 실행해 advisory11/primary0/exit0; 추가 실행하지 않는다.
- 실제 UI: 360/390/430/1280 × 크림/네오 가로 넘침 없음, 본문 입력16px/주요 버튼48px, 최소 대비5.75. 즉시 닫기 저장·같은 iframe·자정 변경·동일 profileId 생년 정정·검색/달력/할 일·내부/외부 Escape·초점 복귀 통과. reduced-motion의 body/headwear animationName 모두 none. 기존 작은 실천 EXP1 모의 지급 유지.
- 최신 캡처는 C:/Users/user/.codex/visualizations/2026/11/08/01a1bcc9-2c34-71b2-bc5b-69bf1f4bcda8/profile-diary-final-{garden,mobile}.png 및 profile-shared-portrait-{normal,unique,egg}.png, profile-diary-nft-{feed,play,sleep}-gallery.png. 가상 프로필과 localhost만 사용했다.
- 이 문서 아래 서버68661/Ego첫실행/1차 파츠크기/targeted 재확인 메모는 **초기 이력**이다. 최신 서버/브라우저 작업은 완료·종료했다.
- 원본 D:/Development/code-destiny는 다른 세션의 dirty feat/world-cast-page다. 변경하거나 reset/stash하지 않는다.
- 내 워크트리 D:/Development/codedestiny-worktrees/profile-moonlight-diary-20261109-121904, wt/profile-moonlight-diary-20261109-121904.
- 시작 SHA d7b0ccc15785c0c893a7e398a1c3f6255d350a8e. 기존 main CI42546906216 실패: verify-saju-summary-browser.mjs:224에서 새 compact details 안의 summary 본문을 펼치지 않고 visible 대기한다. 본문 요청200·DOM 배달은 정상이다. 프로덕션 표시를 강제로 바꾸지 않고 실제 details 버튼을 여는 사용자 동작으로 검증을 갱신한다. 별도 복구 단위로 검증·커밋한다.
- CI 복구 커밋 db66c6f71: 실제 group/card summary를 클릭해 펼친 후 기존 본문·해금 검사를 수행한다. 대운 offer 역시 접힌 card 안이라 미리 펼쳐야 lazy image가 로드된다. 최초 복구 시 이 지점에서 추가 timeout이 있어 순서를 수정했다. 최신 verify:saju-summary-browser 모바일/데스크톱·복원/기존해금·360/390/430/1280·대운10개 모두 통과. 아직 push하지 않았다.
- mock 서버 exec68661, http://127.0.0.1:13418/ggulggul/ · /looks/ · /diary/. .tmp/diary-preview-server.mjs. 실제 카드 모듈과 실제 React diary 컴포넌트·provider·저장소를 사용한다. Next navigation/link만 mock full navigation으로 대체했고 실제 CSS Modules는 esbuild local-css로 번들한다. 모든 API는 mock이거나403, CSP는 self만 허용. 서버 시작 JSDOM의 Could not parse CSS stylesheet는 index의 새 CSS 문법 경고이며 HTML에서 honey widget을 추출할 때만 발생한다.
- Ego 첫 스크립트 .tmp/diary-ego-01.mjs 실행 중 exec57537. 새 TaskSpace 이름 '달빛 정원 다이어리와 NFT 외형 20261109', 생성 ID는 출력에서 확인해 여기에 기록한다. 기존69는 이전 작업에서 이미 finish했으므로 재개하지 않는다.
- 시작 원격 failed log는 TEMP/diary-main-ci-failed-20261109.txt(내 파일)이다. 완료 시 지운다.

## 승인 상태
- 2026-11-09 사용자: “잘 구현했고 여기에 다이어리 기능을 이식해주고 기존 사주 화면의 다이어리는 없애줘 다이어리 UI/UX도 프로필 처럼 이 디자인으로 귀엽고 동글동글한 달빛 예화 느낌으로 구현 후 운영 반영해줘”. **이 다이어리·프로필 업데이트의 운영 승격 1회 승인 포함**. 다시 운영 승인 질문을 하지 않는다.
- 추가 요청: 일반 프로필 캐릭터도 NFT처럼 실제 이미지 파츠 조합을 크게 늘리고 중복 방지. 이미 단일인 유니크 캐릭터는 유지. 기존 동물 종·오행 색 규칙·희귀 확률·보상 수량 유지.
- 개발 검증은 mock만 사용. 실 LLM·결제·운영 DB 검증/일회성 백필은 하지 않는다. 운영 승격은 기존 GitHub Actions mode=production만 사용하고 로컬 배포는 하지 않는다.

## 작업 규칙과 함정
- main 전달은 내 HEAD:main FF push. 공유 dirty 원본을 checkout/merge/reset하지 않는다. 다른 세션 변경을 섞지 않는다.
- Impeccable의 기존 승인된 달빛 예화·둥근 프로필 디자인을 확장한다. 코드/현재 원화가 정본. context는 .tmp/diary-impeccable-context.txt에 저장했다. 완료 detector1회, 실제 모바일360/390/430·desktop 양테마 검수, visual-checker/finish-review 위임은 스킬·design-canon의 명시 요구 범위에서만 사용한다.
- profile-pet.mjs 기존 pattern4/expression6/accessory8=192에서 expression은 실제 표정 아닌 대기속도다. 새 카운트는 실제 보이는 headwear16×neckwear16×prop16×trim8×charm8×pattern4=1,048,576만 센다. 기존 timing은 수량에 넣지 않는다. 유니크 petSpriteMarkup의 unique 분기는 같은 appearance 입력 유무에 완전히 동일함을 테스트했다.
- worker/lib/profile-pet.js는 profile_pets에 uid:profileId _id로 부화1회, 현재 traits 배정. 영냥이 계정은 서버 User 이메일로만 판정. 기존 부화·돌봄·보상 트랜잭션을 보존한다.
- /diary 앱은 luck_sync_diary_v2와 확장 저장소를 공유하며 provider가 기존 일별 필드를 병합한다. 사주 결과 dashboard에는 새 갓생 다이어리와 legacy 이전 버전 카드가 둘 다 있다. 두 진입을 제거하고 프로필에서 기존 기록/캘린더/할 일을 유지한다. /diary 및 과거 링크는 삭제하지 않는다.
- 배포 흐름: check:fast -- --plan → check:fast → commit → check:pre-push → push → main CI1회 확인. CI를 폴링하지 않는다. 운영 릴리스는 승인된 production dispatch를 실행하고 런 URL을 보고하며 폴링하지 않는다. 실패한 main 위에 무관한 push를 쌓지 않는다.

## 설계
- React DailyCard도 같은 서버 저장 pet.appearance와 petSpriteMarkup을 사용한다. 임의 재추첨이나 기존 공용 종 그림 폴백을 하지 않으며 미부화는 기존 알, 유니크는 원래 전용 원화를 표시한다. 실제 얼굴/파츠가 작은 프로필에서도 잘리지 않는지 검수했다.
- 실제 조합 수에 포함되는 문양은 모자 뒤에 숨지 않도록 항상 보이는 작은 charm stamp로 표시한다. 전체 costume 비율은 작은 프로필에서도 같은 좌표로 축소된다. 신규 atlas는 인접 셀 조각을 정리해 최종 합계 약1.11MB이며 원본 이미지는 보존했다.
- 다이어리의 기존 작은 실천 선택·다시 뽑기·완료·EXP를 DiaryDailyQuest에서 기존 useDailyJourney로 유지한다. 출석/꿀방울 중복 UI만 프로필로 모았다. diary TopBar는 같은 provider 안에 있어 기존 기록 검색도 정상이다. 문양 mask CSS의 tokens-only cd-yehwa-scope를 생성기에 추가해 diary/프로필에서 실제 달·꽃 선화를 사용한다.
- profile-diary.mjs: 프로필에서 native dialog 책을 열고 기존 /diary 앱을 same-origin iframe으로 표시한다. 닫아도 iframe을 유지해 초안·선택탭 보존, 다른 프로필로 열 때 기존 draft controller의 cd:diary-flush를 먼저 발행 후 갱신. native dialog로 focus/inert 유지하고 close 때 현재 프로필 버튼으로 초점 복귀. preview 실패여도 버튼은 지갑처럼 독립적으로 남는다. 일반 과거 /diary 링크도 유지.
- DiaryShell의 같은 DiaryStoreProvider 안으로 TopBar를 옮겨 검색도 기존 저장소를 읽는다. iframe에서 back/home 중복은 숨김. useDiaryDraft는 pagehide/cd:diary-flush에서 기존 flush를 호출. 저장 키·일별 필드·600ms/blur 저장·백업은 변경하지 않는다.
- DiaryHomePage는 중복 프로필/출석 DailyCard 대신 DiaryJournalCard + 기존 DiaryEntryFields를 쓴다. 마음·한줄·메모, 기존 흐름/나/계획 details와 하단 달력/기록/더보기는 유지. 무료 조건·개인화면 noindex·결제/보상 수량 유지. 사주 reportDashboard의 fortunePlanner/legacyLuckSyncDiary 두 카드와 category 키만 삭제, compatibility loaders와 기록 데이터는 보존.
- 새 watercolor atlas3개(각16파트)를 imagegen 기본 도구로 생성했다. source PNG는 C:/Users/user/.codex/generated_images/01a1bcc9-2c34-71b2-bc5b-69bf1f4bcda8/ 아래 유지. .tmp/prepare-pet-parts.mjs로1024px WebP 변환. public/assets/profile-pets/moon-garden-v2/{headwear,neckwear,props}.webp 및 provenance.json. 합계 약1.27MB. 기존 v1 동물/영냥이 원화 bytes는 그대로다. 새 outfit은 잠자기 때 곁에 벗어 둔 파츠로 표시.
- profile-pet-appearance.mjs: version2 실제 외형 tuple과 strict bounded key 생성. 서버 profile_pet_appearances의 built-in _id uniqueness로 전 계정/프로필 조합 예약. 예약+pet.appearance 저장은 기존 Mongo transaction 하나. 충돌이면 transaction 전체 rollback 후 cosmetic만 최대16회 재시도, 희귀·동물 seed는 밖에서1회 배정. 예약에는 uid/profileId를 넣지 않아 탈퇴 뒤 식별자가 남지 않는다. 기존 일반 pet은 GET에서 한번만 lazy upgrade, 유니크는 skip. 원화 종·오행·알·희귀·친밀도·돌봄·보상 유지. 운영DB 백필/새 인덱스 수동 적용 없음.
- 서버 worker tests19개, 새 UI/외형3개, sprite 검증 모두 통과. targeted63개 중61pass/2fail은 내가 diary mount를 token 초기화 앞에 호출한 순서 결함. 올바른 초기화 순서로 수정 후 지갑6+기존pet6=12개 재확인 모두pass. 최신 공통 targeted63은 다시 확인해야 한다. source/public sync는 그 순서 수정 전이므로 최종 sync 필요.

## 단계
- [x] 승인 범위/dirty 원본/최신 실패 원인 확인, 안전 워크트리 생성.
- [x] 기존 CI 복구 targeted 검증·커밋.
- [x] 다이어리 이식·기존 사주 진입 정리·달빛 예화 디자인 구현. 실제 UI 검수 남음.
- [x] 일반 외형 조합·서버 고정 배정/중복 방지·유니크 보존 구현/서버19 검증. 실제 파츠 겹침 검수 남음.
- [x] 스프라이트/파츠 및 실제 UI 검수·detector1회·독립 검수.
- [ ] check:fast 계획/실행·미러·관련 회귀·커밋·pre-push·main 전달/CI 확인.
- [ ] 승인된 운영 승격 dispatch1회와 URL 보고. 임시파일/워크트리 배수, 문서 done.
