---
status: in-progress
updated: 2026-11-16
next: 웹툰 검증 단위를 pre-push 후 root에 main 병합을 요청하고 고정 main SHA Linux AIT와 실제 archive 검증을 이어간다.
---

## 첫 행동

handoff 스킬과 CLAUDE.md를 읽고 아래 워크트리에서 git 상태/fetch를 확인한다. 부모 `/root`가 QR19 문서 전달5b74dd4a6을 완료했고 이 워크트리에 병합했다. 기존 UI handoff는 done이다. 새 웹툰 코드·검사·미리보기는 이 워크트리의 후속 에이전트가 전담한다.

## 지금 상태

- 작업 디렉터리: `D:/Development/codedestiny-worktrees/toss-guided-entry-20261115-221109`
- 브랜치: `wt/toss-guided-entry-20261115-221109`. UI 구현3b48cdd98은 main에 병합됐고, Linux/QR19 소스는 `d38c0997cab26fb08f280618c243c21d19ce8e56`이다.
- 이 문서 직전 HEAD: `11cce55f73633b49baf4c3509f0a9d411a28d0b9`(실제 설정 버튼에 맞춘 테스트1줄, main 미전달, pre-push PASS). 앞으로 웹툰 단위와 함께 main에 전달한다.
- QR19 `20261116-19` 등록 완료, 검토 필요 상태. 실제 구매와 검토 제출은 하지 않았다.
- URI: `intoss-private://ai-saju-studio?_deploymentId=01a1dfb2-f631-72f8-a8e3-fa56410e9908&host=appsInTossHost`
- Linux AIT: `C:/Users/user/Downloads/CodeDestiny/20261115-guided-entry-linux/ai-saju-studio.ait`. SHA256 `ac4a4cd8904b15e099d073555c4d4e7d7f907cdb3b6dfdabfe47a83ef4961e86`. expanded99,099,236 bytes, archive87,856,544, portable=true.
- 고정 d38 전체 CI43725888081: 모든 job/CI required SUCCESS. 같은 SHA push CI43725837626 SUCCESS. 정적 검사는 정상적으로 약21분36초 걸렸다.
- root 콘솔 Ego20은 finish 완료. 이후 추가 비공개 QR은 부모가 담당할 수 있다. AIT 업로드 중복/새 검토/실결제 금지.

## 승인 상태

- 2026-11-16 최신 요청 원문(부모 전달): “가상 모바일로 확인해볼게. 최종 CI와 새 비공개 테스트 QR 등록까지 계속 마무리하고, 그다음 기존 웹툰 방식 설명도 원본을 재사용해서 이식해줘. 실결제와 새 검토 제출은 계속 보류해.” 앞의 CI/QR19가 완료되어 이제 웹툰 구현 단계다.
- 홈·프로필·찻집 개선판의 달빛 예화 디자인을 유지한다. 기능 과밀을 다시 만들지 않는다. 웹 원본의 설명과 실제 상담 진입을 재사용한다.
- 실LLM·실결제·운영DB 테스트 쓰기·신규 판매 활성화·새 검토 제출·공개 출시·중복 운영 배포 금지. 새로운 승인 흐름을 만들거나 이미 받은 개발/비공개 테스트 승인을 반복 질문하지 않는다.
- 기존 구매 결과의 원문/가격/권리와 영냥이·꿀꿀운세 기록 및 계정 경계는 유지한다. 기존 앱 이름 지원 문의는 사용자 담당이다.

## 작업 규칙과 함정

- root 체크아웃을 편집하지 않는다. 부모가 main 문서 정리/콘솔을 담당하고 후속이 이 워크트리 구현을 전담한다. 무관한 main 변경도 보존하고 병합한다.
- 새 사용자용 미리보기 `http://127.0.0.1:4330/preview`는 이미 사용자에게 전달됐다. 사용자 브라우저를 조작하거나 A/B 계정·기록을 초기화하지 않는다.
- 4330을 동일 바이트의 독립 사본 서버로 이관 완료했다(exec session23303). Frame/App HTTP200 및 mock marker 확인, 브라우저 저장소는 조작하지 않았다. 사본은 `C:/Users/user/Downloads/CodeDestiny/20261115-guided-entry-preview`(scripts/preview-private.mjs, private-simulation/dist, 사용안내.txt). 같은 포트와 origin이므로 사용자 기록은 유지된다. 이전36448은 종료했다.
- 독립 사본의 `node scripts/preview-private.mjs`는 node 내장 모듈만 필요하며 cwd와 무관하게 동작한다. 후속 웹툰 개발/검수는 별도 포트/브라우저에서 하고 사용자4330을 건드리지 않는다.
- 기존 소스 개발 서버4329(exec46027)가 남아 있다. 필요 시 자기 서버만 정리한다. QA4332는 이미 종료했다. Ego17/p1은 사용자 미리보기 페이지이므로 조작하지 않는다.
- Windows Python은 `py -3`, 파일 UTF8 명시. PowerShell rg 경로 wildcard와 추측 파일 경로를 쓰지 않는다. `rg --files`로 관련 경로를 먼저 찾는다. `apps/toss` 전체를 검색할 때 생성 dist가 섞이지 않게 src/service/test 등 좁은 범위를 지정한다.
- deps 설치됨: root node_modules 정션, apps/toss npm ci --ignore-scripts. lockfile 변경 없음.
- 모든 apps/toss .mjs 테스트 수정도 check:fast의 unclassified fail-closed로 critical 승격될 수 있다. 판정을 조용히 약화하지 않는다. 공식 계획의 통과한 단계를 반복하지 말고, 실패 단계 해결 후 남은 동일 guard/env 단계를 잇는 기록을 남긴다.
- 새 worktree의 Node 전체 검사에서 오늘 fortune/data 생성물 누락1건이 있었다. `node --require ./scripts/lib/mock-network-guard.cjs scripts/fortune-build-data.mjs`로 로컬 결정적 데이터를 만든 뒤 해당 sky-and-range7개 PASS. 날짜가 바뀌었으므로 다음 전체 검사 전에 이 산출물을 준비한다(외부 호출0).
- 일반 AIT와 private-simulation AIT는 다른 변형이다. QR19 일반판은99.1MB 이하 PASS. 이전 private-simulation expanded100,257,263 bytes는 업로드 한도 FAIL지만 로컬 사용자 미리보기는 정상이다. 한도 검사 완화나 원본 아트 손실로 해결하지 않는다. 다음 QR도 일반판이며 모의 업로드 QR은 요청 범위가 아니다.
- shared 웹 컴포넌트 수정 후 정식 sitemap:generate로 원장/추적본이 갱신될 수 있다. 최신 main 원장을 기준으로 정식 생성해 충돌을 해결한다.
- 임시/캡처는 `.tmp/` 또는 저장소 밖, docs PNG 커밋 금지. 완료 시 자기 handoff done, main push/CI, 자기 worktree 배수까지 수행한다. 사용자 미리보기 서버/사본은 유지한다.

## 설계와 원본 추적

확정된 main 웹툰 원본 커밋은93f73981d이며 이후 main에 병합됐다. 더 이상 미커밋 원본이 아니다. 시작 전 최신 main에서 변경 여부를 확인한다.

- `app/_entry/ServiceGuide.tsx`: quickGuideStories5종, 대표6/전문7 그룹. `CutReader`를 재사용하고 각 원본 href/상담ID로 연결한다.
- `lib/brand/service-guide-webtoon.mjs`: 사주/오늘·내일/타로/숙요 관계/영냥이 각각3컷. 원본 일러스트와 원본 대사/설명을 그대로 재사용한다. 개인 분석이나 실제 후기가 아닌 안내용 창작 이야기 고지도 유지한다.
- `app/components/webtoon/CutReader.tsx`: src/widths/fallback/w/h/alt/kind/lines 계약. tone lantern이 원본 서비스 안내, 기존 Toss 상담 본편은 yehwa/night.
- **실제 Toss 파일은 `apps/toss/src/StoryLibrary.tsx`**(service/TossStoryLibrary.tsx가 아님). App의 `consultations/stories` 라우트와 홈 서가 항목이 이미 있다. 별도 중복 페이지보다 이 서가를 확장한다.
- 기존 `homeStories`14편(`app/consultations/home-stories.ts`), `virtual:consultation-webtoons`, 원본 CutReader/`story-library.css` 재사용. StoryLibrary는 `?story=`와 native-back 이벤트로 읽기/목록을 이동한다.
- `apps/toss/service/vite-service.mjs`가 `virtual:consultation-webtoons`를 원본에서 읽고 cut src를 공개 웹 원화 URL로 투영한다. 큰 원화를 일반 AIT에 중복 넣지 않는 기존 계약을 유지한다.
- StoryLibrary `readyRooms`12개에서 빠진 codex/legacy-naming은 실제 Screens에 `/master-love-codex/`, `/naming-ai/` 구현이 있으므로 원본 설명→입력 CTA를 복구할 수 있다. 가격/결제는 수정하지 않는다.
- 원본 quick href: saju `/saju/free/`, daily `/fortune/today/`, tarot `/tarot/`, compatibility `/sukuyo/`, cat `/yeongnyangi/`. Toss 대응 주소는 실제 AppEntry/App/서비스 라우트와 대조해 명시적으로 연결한다. 이름 문자열로 라우팅을 추정하지 않는다.
- UnifiedHome은 `/?world=ggulggul`, `/?world=yeongnyangi`와 `/yeongnyangi/`를 읽는다. 루트 안내 진입은 한 곳, 상세 목록은 묶음별 점진 노출로 현재 과밀 해소를 보존한다.
- private 미리보기 CSP는 outbound를 차단한다. 새 설명 원화가 로컬 모의 미리보기에서도 실제로 보이는지 별도로 검증한다. 기존 실LLM/실결제/외부API 차단을 풀어서 그림을 보여주지 않는다. 필요하면 private 전용 원본 그림의 로컬 수집을 검토하되 일반 AIT 용량과 구분한다.

## 이전 단위 검증 근거

- UI targeted73 PASS, 기존 paid77/lint/typecheck/계약/Worker dry build/encoding PASS. Node5098+누락 생성물 해결 후 파일7PASS, Jest479 suites/8011tests PASS(1skip).
- 모의 AIT 찻집6모드, 편지saju, 네오saju-partner: 홈→로그인→주문1건/생성1회→원문·후속·앱 재진입→계정B 거부 PASS.
- 프로필 모의 AIT: 홈→4단계→reload→native back→B 빈 초안→A 복원 PASS.
- Linux QR19 AIT: 정상 홈/원본 그림/질문 검색·복원/360×420 CTA, 전체73목적지 실제 클릭, 신규판매닫힘/원문·단절복구/계정B 거부/추가과금0 PASS.
- 증거 `C:/Users/user/Downloads/CodeDestiny/20261115-guided-entry-linux/verification`, 이전 모의/시각 증거는 `.../20261115-guided-entry-preview/verification`.
- 기존 소유권 archive 테스트가 옛 '내 정보' 버튼을 찾은 실패는 실제 '설정·고객지원'으로 고쳐11cce55f7에 커밋. AIT 런타임 수정 없이 같은 QR19 파일로 최종 PASS했다.

## 단계

- [x] 앞선 간편 UI 단위의 최종 CI/Linux AIT/QR19 완료
- [x] 부모 QR19 문서 전달5b74dd4a6 병합, 새 작업 정본 확정
- [x] 원본 quick5 + 기존14편의 CTA/입력 경로 대조
- [x] 원본 설명·CutReader를 재사용한 간편 웹툰 선택/읽기/진입 구현
- [x] 사용자 미리보기와 분리한 mock 동선·모바일·뒤로가기·그림 검증
- [ ] targeted/check:fast/작은 커밋/pre-push/main CI
- [ ] 고정 소스 Linux 일반 AIT·실제 archive 검증·비공개 테스트 전달(새 검토/실결제 없음)
- [ ] handoff done/미리보기 유지/자기 worktree·임시 파일 정리

## 웹툰 구현·검증 (2026-11-16)

- 후속 `/root/toss_entry_usability/webtoon_guide`가 소스·검사를 단독 편집했고 `/root`가 main 전달/콘솔을 담당한다.
- StoryLibrary에 `virtual:service-guide`로 원본 quick5 대사/그림/CTA와 guideGroups 대표6·전문7을 재사용했다. 흑월은 별도 단일 링크로 보존하고 기존14편의 모든 CTA(인연의 서·작명 포함)를 실제 입력 경로로 연결했다.
- 홈 캐릭터2장 아래 안내 진입1개. 서가는 quick5만 기본 펼침, 대표·전문은 닫힘. 원본 CutReader lantern/yehwa/night 및 창작 안내 고지를 유지한다. 전문편→CTA→뒤로→서가의 묶음을 query story에서 복원한다.
- quick web→Toss: `/saju/free/`→`/manse`, `/fortune/today/`→`/today`, `/tarot/`→`/tarot-library`, `/sukuyo/`→`/sukuyo`, `/yeongnyangi/` 유지. 결제/인증/API/DB/신규판매 게이트는 수정하지 않았다. 비공개 미니앱만 변경하므로 공개 SEO/title/canonical/sitemap 영향 없음.
- vite-service의 private-simulation에서만 `__story-art`에 원본 AVIF 후보/WebP fallback/표지를 정확한 바이트로 넣는다. CSP·외부 API 차단 유지. 일반 AIT는 원화 스트리밍 유지하며 새 원화를 중복 포함하지 않는다. private 미리보기 dist는136,665,394bytes/2,219files이며 로컬전용이다. 일반 업로드100MB 검증과 구분하고 모의판은 업로드하지 않는다.
- 읽기전용 운영 그림 GET: 총428 URL 전부200/206 + image/* (2026-11-16). 새 운영 배포 필요 없음. 검증 JSON `C:/Users/user/Downloads/CodeDestiny/20261116-webtoon-guide/verification/webtoon-art-live.json`.
- `node --test apps/toss/test/story-guide.test.mjs`:2PASS(일반/private 원본 대사·그림 계약 동일). Toss typecheck최종PASS(그룹복원 변경포함).
- `story-library-browser.mjs`: 모의19편 모든컷 decode·대사일치·360px overflow없음·CTA실제화면과컨트롤·browser back/native back·대표전문묶음복원 PASS, 네트워크POST0. 테스트가 main만 찾던 부분은 일부 서비스의 기존 div/h2 구조에 맞춰 수정했고, Vedic async 준비 컨트롤을 기다리도록 수정했다(런타임 결함 아님). 같은 실패 반복 없음.
- 목록360/390/430·saju3컷/CTA 캡처를 root가 독립 시각검수PASS. 추가 꾸미기 없음. detector `[]`. Ego21은 finish완료(사용자 공간 아님).
- 사용자 새미리보기 `http://127.0.0.1:4333/preview`를 root가 이미 안내했다. **4333도 사용자용이므로 조작/초기화 금지**. 독립 Downloads 사본으로 동일포트 이관완료(exec3320), index SHA동일/HTTP200/mockmarker확인. 사본 `C:/Users/user/Downloads/CodeDestiny/20261116-webtoon-guide`의 scripts/private-simulation/사용안내.txt. 기존4330/exec23303도 유지. worktree 서버19488은 종료. 이후 QA는 실제 AIT 테스트의 독립 browser context만 사용한다.
- `npm run check:fast` 전체계획 PASS(exit0): `.tmp/webtoon-checkfast.log`. critical 자동승격 유지. paid77/lint/sitemap/typecheck/Node5104/정책/Worker dry build/encoding PASS, Jest479suites/8012tests PASS(1skip). 오늘 fortune 결정적 데이터를 mock-network-guard로 준비했고 데이터는 git변경없음.
- Linux AIT workflow: `gh workflow run pr-ci.yml --ref main -f full_ci=true -f toss_artifact=true -f toss_simulation_artifact=false`. dispatch직전 origin/main=검증할40SHA, 결과run.headSha일치확인. artifact `toss-preview-<40SHA>`(retention1day). root가 main merge/push 후 SHA전달. 완성archive를 `story-library-browser.mjs <ait>`로 검증 가능하며 원화 로컬fixture/실외부API차단/일반AIT에__story-art없음 검사 포함.
