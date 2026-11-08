---
status: active
updated: 2026-11-09
next: "2d9042d91 관계 문구와 후속 수집 기록 pre-push·main 전달 후 24sign 내일 준비 원고 적용·본문 차별화·SSR 재측정·UI 확인. Space65 agent 제어, 신규 round169부터. 번역 품질·④⑤ 승인 패킷·운영 승격은 남음."
---

# SEO 아키텍처 재구축

## 왜

구글·네이버·빙 자연 검색으로 실제 신규 사용자와 구매 기회를 늘린다. 범위는 증거 기반 전수 감사 → SEO 구조 재설계 → 구현·테스트·운영 배포 → 7·28·90일 KPI다(2026-11-01 사용자 요청). 순위와 색인 시점은 보장하지 않는다.
설계 정본은 `docs/superpowers/specs/2026-11-01-seo-architecture-rebuild-design.md`(승인됨)다. 이 문서는 이어 가는 데 필요한 상태와 함정만 담는다.

## 첫 행동

1. 이 워크트리에서 이어 간다: `D:\Development\codedestiny-worktrees\seo-architecture-rebuild-20261101-135310`(브랜치 `wt/seo-architecture-rebuild-20261101-135310`). 새 워크트리를 만들지 않는다. 두 문서는 origin/main에도 있다.
2. `git fetch origin` → `git status` → `git log --oneline -3`. origin/main이 앞서 있으면 `git rebase origin/main`.
3. 묶음 ③은 운영 반영 완료다. frontmatter next의 묶음 ④부터 필요한 설계 절만 읽고 진행한다. 다음 묶음의 운영 승격은 별도 승인 대상이다.
4. 실제 새 수집본은 `D:\Development\seo-data\code-destiny\2026-11-09\`다. `README.md`와 `manifest.csv`를 정본으로 읽는다. 이전 날짜 폴더로 소급 표기하지 않는다.

## 지금 상태

### 2026-11-09 로그인 후 추가 수집·⑤ 관계 문구

- 사용자 원문: “네이버 로그인 완료했어. 최신 CI 결과 확인하고, 남은 검색 원자료 수집과 ④·⑤ SEO 작업 계속 진행해줘.” 기존 main4ee6c81148d5ccc19afbd0143232aa81d4ad0bcb의 CI42515132032 성공 확인. 아래 과거 in_progress·네이버 로그인 대기 기록을 대체한다.
- 사용자 확인 뒤 Ego Space65를 round44에서 takeOver했다. 현재 agent 제어이며 p1=GA4 방문 페이지 마지막 쪽, p2=Cloudflare 보안 이벤트 Googlebot 상세(로컬 표시만 개인정보 가림). 마지막 round168, 다음 신규169. 새 공간을 만들거나 예전 라운드를 재실행하지 않는다. 이 작업의 수집·UI 확인이 끝나기 전 finish하지 않는다.
- 외부 원자료 정본 README·manifest 갱신: `D:/Development/seo-data/code-destiny/2026-11-09/`。GSC29ZIP/189CSV에 네이버 nativeCSV7개, 검색어/URL Top30×30/90일 전사, 진단·robots·6URL 검사, 키워드 nativeXLSX10개(중복 포함5,923행), GA4 및 Cloudflare 전사를 추가해 manifest389항목. 키워드 g08=1000행은 도구 상한 가능성 Y. 원본 SHA256·행/열 검증 보존.
- 네이버 성과 END11/08,90일08/11~11/08=8,147클릭/1,478,702노출。GSC 정렬28일10/10~11/06=3,308/523,428。내일 상세가 상위 URL 다수라 Google 저성과만으로 noindex/폐기하지 않는다. Top30과 진단의 일부 페이지는 전수 자료가 아니다. 진단 최신11/07, 과거 경로는 현재 공개 응답을 확인하기 전 수정하지 않는다.
- GA4 ID G-FMHV4ZHY3G의 property526361229(FortuneDevelope), Korea·USD 확인. 28일10/10~11/06 소스/매체41행5쪽·방문 경로101행11쪽은 `_v2_transcribed`만 분석에 사용。초기 캡처는 페이지 전환 중 옛 데이터가 섞였으므로 잠정 자료로만 보존。v2는 그리드 안정/네트워크 유휴 후 수집。표시815세션에 행합계816·813으로 차이 있어 보정하지 않음。전체 트래픽이며 organic 수익으로 해석하지 않음。nativeCSV2회 timeout, 다른 기간·채널 교차·이벤트/연결 설정은 미완료.
- Cloudflare 읽기 전용: Bot Fight Mode/BIC/관리형robots 동기화/Under Attack Mode 꺼짐, Allow Verified Bots 활성。활성 속도 제한은 IP당600/10초 초과→10초 차단。4봇 문자열별 최근30일 표본: Googlebot25(24Skip/1Block),Yeti25Skip,bingbot25Skip,Daumoa 표시0행。전체 건수로 환산하지 않음。Googlebot 차단 상세는 music.code-destiny.com/wp-config.php,AS400529 Infraly,LLC,관리형 규칙。UA 문자열은 신원 증명이 아니며 본 서비스 SEO 경로 차단 증거로 보지 않음。IP·Ray ID 제외/PNG 가림。설정 변경 없음。
- 브라우저 이벤트 전체 dump는 요청 메타데이터를 출력할 수 있으므로 금지。이전 round71에서 불필요한 메타데이터가 도구에 출력됐지만 파일/커밋 저장하지 않았고 사용자에게 알림。JavaScript alert는 events에서 Page.javascriptDialogOpening.message만 추출하고 나머지 값을 출력하지 않음。개인 출생정보 쿼리 URL·개별 사용자 자료 다운로드 금지。
- ⑤ 관계 표현 구현2d9042d91: day-relation.ts와 ko.json의9문구를 오늘→기준일로 맞춤。계산/타언어/마커키는 보존。SSR↔실제 resolveKey 동일성+대상일 중립성(144동물조합·별자리/잘못된 날짜)을 기존 테스트에 추가。target18개·마커48변수/21템플릿×12locale 통과。check:fast 첫 실행은 sitemap서명 drift, 공식 생성 후 재실행은 lint/typecheck/Node4775/4775·정책/mock/Worker dry-run/encoding 통과。로컬 Jest는5분 이상 요약 없이 실행돼 이 check13892의 Jest36924/3472만 신원 확인 후 중단해 exit1。전체 성공으로 포장하지 않고 공식CI가 최종 게이트。
- 다음 차별화 원고는 외부 `_analysis/tomorrow-preparation-additions.mjs`에22sign×3문단으로 준비했으나 아직 소스 적용하지 않음。기존pig/snake 보존。내일 상시 프로필은 요약+오늘의 profile 앵커로 연결해 반복을 줄이고, 날짜별 원고·점수·관계는 유지하는 방향。상세 기간 도입은 period-readings.ts의24tomorrow문장을 직접 다듬고 공용 문자열 전역 치환하지 않음。
- UI 검증은 아직 안 함。design-canon.md:68에 실제 화면을 visual-checker 에이전트가 판정하도록 명시돼 있으므로 캡처 뒤 해당 검토만 위임 가능。메인 세션은 UI 스크린샷을 직접 읽지 않음。mock/네트워크 가드, 기존 Space65 재사용。
- ④⑤ 운영 승격은 새 묶음별 승인 필요。③ 승인/기존 VN 한 줄 수정을 확대 해석하지 않는다。개발/원자료 수집은 계속하며 전체 SEO 완료/워크트리 배수로 처리하지 않는다。

### 2026-11-09 검색 원자료·④ 로컬 구현

- 사용자 후속 요청 원문: “최종 CI 결과 확인하고, ④·⑤에 필요한 검색 원자료부터 확보해서 남은 SEO 작업도 이어서 진행해줘.”
- ③ 최종 기록 ebb19eae8의 PR CI 42508086339 성공 확인. 이후 원격 main은 cd136892a까지 119커밋 전진해 clean 상태에서 rebase했다. 그 SHA의 CI 42511932833은 다른 세션 `premium-llm-chapter-upgrade-2026-11-08.md` status: in-progress 때문에 실패했다. active 한 줄 수정·후속 push 여부를 비동기로 문의했고 아직 승인 답변을 기록하지 않았다. 앞선 VN 수정 승인을 이 새 문서로 확대하지 않는다.
- GSC 도메인 속성에서 7·28·90일 비교·전체 일별 및 핵심 URL 21개 정확 필터 원본 확보. END=11/06. 29 ZIP·189 CSV, manifest 218항목. 비교 열 중복은 ordinal로 보존. 검색어×페이지는 각 정확 페이지 필터 원본만 사용한다. 상세: 외부 `bundle-4/search-findings-20261109.md`, 계획 `docs/superpowers/plans/2026-11-09-seo-bundle-4-search-evidence.md`.
- GSC 색인 데이터는 10/23 최종 업데이트라 ③ 최근 배포의 효과를 판정할 수 없다. 네이버는 로그인 필요. Ego TaskSpace 65(`seo-raw-data-20261109`), p1 GSC·p2 네이버 로그인. round-43에서 handOff했다. 로그인 완료 사용자 회신 전 브라우저 조작 금지; 회신 뒤 기존 공간을 takeOver하고 신규 round-44부터 실행한다. 이전 라운드 재실행·복구용 새 공간 생성 금지. GA4·Cloudflare·키워드·Bing 등은 아직 미수집이다.
- 운영 SSR 61쪽을 별도 저장. E1 13쪽 최소 3,835자, 띠별 정확 고유 문단 최저91.88%, 5단어 구문 쌍별 min-set 최대41.96%/Jaccard25.65%. 추가 신년 원고 없이 수치 기준 충족. today/tomorrow 24쌍 Jaccard 최대56.30%, 10쌍≥50%. 내일 페이지에 ‘오늘 일진’과 원고 풀의 오늘 문장 노출. ⑤에서 계산이 아닌 기간별 표현을 수정한다. 한글 혼용만으로 번역 noindex하지 않는다.
- ④ 로컬: 사주 title/description·fallback H1·breadcrumb 의도 분리, 궁합 SSR 비교표, 감사 대상 5쪽의 관련 링크 보강. canonical·hreflang·robots·색인 URL 집합·결제/인증/API/DB/계산 로직 변경 없음. 첫 check:fast는 sitemap drift에서 중단. 생성 뒤 재실행에서 lint/typecheck 통과, Node 4772개 중4770통과·2실패(새 ‘무료 사주’ 문구가 기존 상품 정책과 충돌). 해당 표현을 철회하고 ‘사주 원국 확인·사주팔자 해석 안내’로 좁힌 뒤 관련 정책 파일22개 전부 통과. 전체 Node 재실행은 하지 않았다. 로그는 외부 bundle-4/check-fast-20261109-retry.log·saju-policy-regression-20261109.log. 제목 최종 수정 뒤 sitemap을 공식 생성기로 다시 갱신했다. UI 화면 검증은 네이버 로그인 제어 인계로 아직 미실행이다.
- ⑤의 시점 오류 원인·구현 경계는 외부 `bundle-5/implementation-boundaries-20261109.md`. 아직 소스 구현·noindex·승격하지 않았다. ④ 전달 경계를 먼저 정리한다.
- ④ 구현 커밋은 최초 55af67578(rebase 전), 커밋된 트리 check:pre-push 통과. 다른 세션이 fc460e1efaf03cf5400351cfbd1c36c2e0f6cf77에서 premium handoff를 수정했고 PR CI42512760338 success. 앞선 한 줄 수정 문의는 필요가 없어졌다. 최신 main으로 rebase 후 후속 기록·pre-push·main push를 수행한다. 화면 검증과 운영 승격은 아직 하지 않았다.
- ④ main 전달 완료: 구현2c431a13e·최종 기록770012970f3723cca5880407c90fbcf9de2e1c05。rebase 뒤 committed-tree pre-push 통과. 공식 CI는 다음 push/최종 보고 전 1회 확인한다. 운영 승격하지 않았다.
- ⑤ 1차 로컬 구현2dabfcdfc: daily-copy.ts의 한국어 대상일 인용 함수를 상세의 원고와 웹툰 인용에 재사용. 웹툰·로케일16개 통과(24sign·입력 불변성 포함). plan은 `2026-11-09-seo-bundle-5-daily-copy.md`. check:fast는 lint/typecheck/sitemap drift 통과 후 Node 전체 진행 중, exec session33088 및 외부 bundle-5/check-fast-20261109.log. 관계 마커·준비 문구·본문 차별화·번역 noindex는 아직 안 했고 ⑤ 전체 완료/오늘0이라고 보고하지 않는다. 로그 결과 확인 후 pre-push·main 전달하고 CI는 규칙대로 최종 1회만 확인한다.
- ⑤ 1차 검증 종료: 전체 Node4774/4774, 정책·mock 게이트·Worker dry-run 빌드·인코딩까지 통과. 로컬 Jest는 요약 없이 실행되어 이 실행의 Jest 프로세스 트리만 중단했고 check:fast exit1. 모든 검사 성공으로 포장하지 않으며 공식 CI가 전체 Jest를 확인해야 한다. 해당 로그는 보존했다. 다른 세션 프로세스는 중단하지 않았다. 84ad9519e의 pre-push 통과, 최종 기록 뒤 다시 실행한다.
- ⑤ 전달 준비 시 ④ PR CI42513561435는 in_progress(실패 아님), 원격 main은 여전히770012970이었다. 반복 대기하지 않는다. 최종 보고에서는 새 main CI를1회 확인한다. 네이버 로그인은 여전히 회신 대기이며 Space65를 임의로 재개하지 않는다.
- 운영 승격은 ④·⑤ 각각 새 승인 필요. 이 작업의 임시 대기는 원자료 로그인/공유 CI 경계이며 SEO 전체 완료가 아니다. 현재 작업·워크트리를 지우지 않는다.

### 2026-11-09 묶음 ③ 운영 반영 완료

- **최종 문서 전달 게이트 해소**: 공유 main 72fed7684의 CI https://github.com/rei1237/codedestiny/actions/runs/42505056922 는 VN 문서 status: in-progress 때문에 실패했었다. 사용자 추가 승인(2026-11-09) 원문 “한 줄 수정과 후속 push 승인”. 재개 시 다른 작업이 9e7ee899717beab7a6d168a32796ab8c13318a0f에서 active로 정규화했고 CI https://github.com/rei1237/codedestiny/actions/runs/42507044209 가 성공했음을 확인했다. 기존 수정을 보존해 최종 SEO 기록을 전달한다. 준비했던 vn-handoff-status-fix.patch는 적용하지 않았다.

- 사용자 요청: 승인 패킷을 참조해 남은 SEO 작업 마무리. 이 세션에서 묶음 ③ main 전달·운영 실측·읽기 전용 SEO Operations를 완료했다. 묶음 ④·⑤와 KPI 관찰은 아래 선행 조건 때문에 완료로 처리하지 않는다.
- 승인 원문(2026-11-09): “main push + 운영 승격 1회 승인”, 추가 “3개 포함해 운영 승격 진행”. 추가 잠금화면 커밋 90e7c43f4·5027fdb66·87c6e54dd 및 같은 기능의 Java 캡션 후속 e2190a629를 보존했다.
- SEO 구현 전달 SHA: 2faaa262b9ceb7fc01f77496b711d0972ccc1000. 구현 후속 커밋 37cb17270은 IndexNow 공개 3쪽 오탐과 canonical 검증기의 argv 없는 import 오류를 고쳤다. 비공개 하위 경로·쿼리·해시·인코딩 우회 차단은 유지했다.
- 공식 CI 성공: https://github.com/rei1237/codedestiny/actions/runs/42503460206 . 스테이징 성공: https://github.com/rei1237/codedestiny/actions/runs/42503516402 . npm run verify:staging -- --sha=2faaa262b9ceb7fc01f77496b711d0972ccc1000에서 Pages·Worker 둘 다 일치.
- 승격 직전 main이 VN 작업의 37개 커밋을 포함한 72fed768472e292055df9c29a5bec27ee9e0e934로 전진하여 이 세션의 production dispatch는 SHA 안전 검사에서 실행되지 않았다. VN의 별도 운영 승인(2026-11-09, docs/handoff/vn-oh-story-rewrite-2026-11-08.md의 “운영배포도해야지”)으로 이미 시작된 공유 운영 릴리스 https://github.com/rei1237/codedestiny/actions/runs/42505123236 가 성공했다. 이 릴리스는 SEO 전달 SHA를 포함한다. 추가 production dispatch는 하지 않았다.
- 운영 Pages /version.json 및 Worker /api/version 모두 72fed768472e292055df9c29a5bec27ee9e0e934 실측. /fortune/·/en/·/saju/ 모두 200, 자기 canonical 1개, robots 1개, googlebot 메타 0개, hreflang 9개 집합과 사이트맵 일치. 홈 ko·x-default=/ggulggul/ 유지. 증거 production-before-20261109.json·production-after-20261109.json.
- 공유 운영 릴리스의 fresh verify-dist: 실패 0·경고 0. IndexNow: 사이트맵 1062 URL, 변경 775 URL, HTTP 200, 성공 체크포인트 저장. 로그 production-release-20261109.log.
- SEO Operations daily 성공: https://github.com/rei1237/codedestiny/actions/runs/42506670432 . 계정의 사이트맵 재제출·수집 요청은 하지 않았다.
- 로컬 검증: 검출기 67, IndexNow 7, canonical/verify-dist 38, Node 전체 4700, 잠금화면 10 통과. check:pre-push는 리베이스 후 exit 0. check:fast는 Jest 이전 전부 통과한 뒤 장시간 요약 없는 로컬 Jest만 중단해 exit 1. 전체 통과로 기록하지 않으며 동일 SEO 전달 트리의 공식 CI 성공으로 Jest를 포함한 검증을 완료했다. 실 LLM·실결제·운영 DB 쓰기 없음.
- 문서 상태 in-progress는 기존 검증기의 active/blocked/done 계약과 달라 실패했다. 해당 문서 커밋 4b2522f83만 4cae63642로 revert하고 active로 복구했다. 다른 세션의 프로세스·루트 미커밋 변경·워크트리를 건드리지 않았다.
- 예비 측정(기존 dist, build 66e63dee6): 2027 13쪽 main 본문 최소 3974자, 1800자 미달 0. 12띠의 정확히 일치하는 문단 기준 고유 비율 최소 약 91.9%, 문자 5-gram 최대 겹침 약 55.4%. 별도 진단 기준이며 E1 합격 판정이 아니다. 다국어 501쪽 SSR 한글 혼용 비율도 기록했으며 CSS 가시성·클라이언트 렌더·번역 품질은 미판정. 색인 정책 변경 없음.
- 증거 정본: D:/Development/seo-audit/code-destiny-20261101/bundle-3/approval-packet.md 및 같은 폴더 regression/, delivered-files-20261109.txt. 예비 측정은 bundle-4/와 bundle-5/의 JSON.
- 남은 조건: D:/Development/seo-data/code-destiny/2026-11-01/ 원자료가 아직 없다. 묶음 ④의 검색어×페이지 매핑·홈 대표 URL 결정을 추정으로 채우지 않는다. ⑤는 설계대로 ④ 이후 50~100쪽씩 검증·승격하며 7·28·90일 성과는 아직 미측정. 이 프로젝트 인수인계와 기존 SEO 워크트리는 후속 단계용으로 유지한다.

### 2026-11-08 이전 기록

- 묶음 ③ 로컬 완료, 승인 대기(2026-11-08). origin/main `9e8cec0a6`(= 운영 `/version.json`) 위로 리베이스해 16커밋, HEAD `66e63dee6` 뒤에 이 문서 커밋. 리베이스 전 상태는 태그 `bundle3-pre-rebase`. 아래 SHA는 리베이스 전 값이다(리베이스 뒤: 계획 `6d801c27a`, T1 `018d10f55`, T2 `a08a0b134`, T3 `a6e87e1e3`, T4 `ea47b6b9a`, T5 `846473190`, T6 `4c9ccfe24`, T7 `4e40665a2`, 정책 페이지 `651667e09`, T8 `665f6489b`, T9 `f847607c4`). 리베이스 판단: upstream `0b70e9801`의 `/business/api/dashboard` 사이트맵 제외를 원장에 `meta: null, sitemap: false`로 옮김. 그 커밋의 coreRoutes 2줄(`/business/api`, `/business/api/docs`)은 첫 충돌 해결 때 빠져 `ea47b6b9a`에서 되살림(`a6e87e1e3`만 두 줄이 없다). 생성 파일 충돌은 생성기를 다시 돌려 해결. T10 결과: 최종 build:cf exit 0, verify-dist 실패 0·경고 0(hreflang-sitemap warn 185 → fail 0), index-state 차이는 upstream 새 페이지 3개뿐, 회귀 묶음 전부 exit 0, `check:pre-push` exit 0. 승인 패킷 `D:/Development/seo-audit/code-destiny-20261101/bundle-3/approval-packet.md`. 이전 기록: 계획 `1c448dd3c`, T1 `abbaa53ad`, T2 `5f05c0104`, T3 `e26a56301`, T4 `f64bb98d2`(googlebot meta 0, 페이지당 robots meta 최대 1, `index-state-t4.json` diff 0줄), T5 `1c2bdba88`, T6 `125794c4c`, T7 `6602003eb`, 정책 페이지 재생성 `4c077642b`, T8 `5a81a33a3`(verify-dist 규칙 robots-meta-count·index-ledger·hreflang-reciprocal 추가, 홈 클러스터 셸 5쪽 hreflang 을 빌드 때 alternatesFor(I18N_ROUTE_MAP.home)로 교체 → hreflang-sitemap 5→0, 네 규칙 모두 실 dist 0건이라 fail 로 올림, `verify-dist-t8.json` 실패 0·경고 0, `index-state-t8.json` diff 0줄), T9 `800556f5d`(submitIndexNowUrls·getAllSitemapUrls 삭제, INDEXNOW_ENDPOINT 는 export 로 유지, 근거 `dead-code-grep.txt`; seo-site-urls 변경으로 사이트맵 서명 120·lastmod 17건 재생성). 남은 것은 T10. T7 뒤 build:cf: verify-dist 실패 0, hreflang-sitemap 185→5(정적 셸 `/ggulggul/`·`/en/`·`/ja/`·`/zh/`·`/zh-tw/`의 index.html 블록 ko-KR·ja-JP·en-US), `index-state-t7.json` diff 0줄. 증거는 `D:\Development\seo-audit\code-destiny-20261101\bundle-3\`(기준 `build-before.log`·`verify-dist-before.json`·`index-state-before.json`, T3 뒤 `index-state-t3.json` diff 0줄).
  - 기준 verify-dist: 실패 0, hreflang-sitemap 경고 185(80·1·100·4).
  - 빌드에 `ALLOW_DEV_SERVER_DURING_BUILD=1`이 필요하다. 다른 세션 dev 서버(포트 32722)가 돌고 가드는 디렉터리를 가리지 않는다. 이 워크트리 `.next`는 별도 폴더다.
  - T4 함정: `verify-adsense-readiness`의 `verifyPrivateNoindexRoutes`가 `googleBot.includes("noindex")`를 단언한다. 정적 셸 robots 문자열(`static-shell-route-meta.mjs`)도 T4에서 정한다.
  - 사이트맵 쪽 파생 목록은 원소만 같고 순서는 다르다(`.some()`이라 무관). adsense 목록 3종은 뜻이 달라 원장 밖에 두고 부분집합 가드 테스트만 넣었다.
- 운영 SHA `9e8cec0a6`(2026-11-08 `/version.json` 실측, origin/main과 같다). 그 전 기록: `9ecd08743`(2026-11-04, 릴리스 런 https://github.com/rei1237/codedestiny/actions/runs/41739205895). 앞선 운영 `bf9c77a64` 위에 영냥이 AEO 결정 반영과 다른 세션 커밋이 더해졌다. 묶음 ③은 시작하지 않았다.
  - 2026-11-04 릴리스 런 41729564058(`914fca524`)은 배포 전 테스트에서 막혔고, 원인과 수정은 `docs/handoff/2026-11-03-aeo-remaining-work.md`의 "운영 재반영 완료"를 본다.
  - 아래 두 줄의 상세 실측은 이전 운영 `bf9c77a64` 기준이다. `9ecd08743`에서는 SHA, 주요 경로 상태 코드, `ai_source`만 다시 쟀다.
  - 실측(2026-11-04, 한국 IP, Chrome UA, `Accept: text/html`): `/version.json`·`/api/version`이 `bf9c77a64`. `/`·`/saju/`·`/en/saju/` 200 `private, no-cache`. `/checkout/`·`/account/password/`·`/admin/`·`/login/`·`/diary/` 200 `private, no-store`. `/saju`·`/index.html` 절대 URL 301 `no-store`. `/?lang=en` 302 `private, no-store`. 해외 IP는 측정하지 않았다.
  - `/`, `/yeongnyangi/`, `/saju/`, `/insights/`가 `analytics.js?v=20261103-ai-source-v1`을 읽고 파일에 `ai_source`가 있다. GA4 수신은 측정하지 않았다.
- 묶음 ① main push 완료(2026-11-02, origin/main `32397321e` 위로 rebase). 운영 배포는 2026-11-02 사용자 승인으로 1회 실행했다(https://github.com/rei1237/codedestiny/actions/runs/41335766465, `98643c274..6d514ecaf` 66커밋). 계획은 `docs/superpowers/plans/2026-11-01-seo-bundle-1-v0-a2-d1.md`(`e00cf2f88`).
  - 커밋(rebase 후): T1 `cc57c748f`·`78e5cd1f9`, T2 `f4e76db9a`·`ad9e418d1`, T3 `6492b2ca7`·`f4f268314`, T4 `9807f5e50`·`ebecc316a`, T5 `f71eafb85`, T6 `023be9a18`, T7 `cdd15f625`, T8 `d7ba36b65`, T9 `53c4959ca`, 최종 검토 수정 `29ec78b93`.
  - 태스크마다 새 검토자, 끝에 Opus 전체 검토. Important 1건(jsonld-dates 시각 비교 → 새벽 빌드 거짓 실패)은 KST 날짜 비교로 고쳤다.
  - rebase 충돌은 생성 파일(`config/sitemap-lastmod.json`, sitemap XML)뿐이었고 커밋마다 `npm run sitemap:generate`로 다시 만들었다. 운세 페이지 lastmod가 11-02로 하루 넘어간 것은 일일 갱신분이다.
- verify-dist(로컬 build:cf): 실패 규칙 전부 0. og:url 8 → 0(실패로 승격). 경고 hreflang 185(80·1·100·4)와 엣지 3/1/4는 묶음 ②·③ 몫이다.
- 증거와 승인 패킷: `D:\Development\seo-audit\code-destiny-20261101\bundle-1\`(`approval-packet.md`, verify-dist 전후 JSON, `regression\` 로그, `sdd-ledger.md` 원장).
- 묶음 ② 운영 반영 확인(2026-11-03). 운영 `/version.json`과 `/api/version`이 `79ef4a4ed`이고 그 안에 묶음 ②가 있다. 다음 승격 승인 패킷에는 운영 `/version.json`의 SHA로 `git log <운영 SHA>..origin/main`을 새로 뽑아 넣는다.
  - 커밋: 계획 `c0b29aa84`, T1 `599acf294`, T2 `574f76429`, T3 `c3ea9a19d`·`8fda3bce1`, T4 `7a6255d28`, T5 `ce132b37a`, T6 `374d9e690`, 사이트맵 `4b38d006d`, 전체 검토 수정 `485e905ca`, 미러 `d27cbd970`, no-store `8032698e8`·`89615a5c5`, h1 검사기 예외 `c5f71bec0`.
  - 실측(한국 IP): HTML `private, no-cache`, `/checkout/`·`/account/`·`/admin/`·`/login/`·`/diary/`는 `private, no-store`, 슬래시 없는 경로·`/index.html`은 절대 URL 301, `/?lang=en` 302, Googlebot 헤더가 Chrome과 같다. 해외 IP는 vm 하네스로만 확인했다.
  - 계획의 "`_headers`가 `/checkout/`에 no-store를 준다"는 틀렸다. `/*/`의 `no-cache`만 받고, 옛 워커의 일괄 no-store가 지켜 왔다. 지금은 `privateCacheControl`의 경로 목록이 지킨다.
  - `verify-hydrated-h1-integrity`에 `/yeongnyangi/result` 예외를 넣었다(`f19f5c471` 이후 오탐). 결제된 상담 화면의 브라우저 확인은 안 했다.
  - 내가 실행한 승격 런 41471987438은 프리뷰 스모크의 CSS HTTP 500으로 막혔고 원인은 모른다. 묶음 ②는 다른 사람이 실행한 런 41571861422로 들어갔다.
  - 스케줄 SEO Operations는 `Test detector with mock inputs`(`keyword-research`, `public-inventory` 테스트)에서 실패한다. 11/01 런에도 같은 실패가 있어 묶음 ② 때문이 아니다. 아직 고치지 않았다.
  - 증거와 승인 패킷: `D:\Development\seo-audit\code-destiny-20261101\bundle-2\`(`approval-packet.md`, `sdd-ledger.md`, `regression\`).
- 미룬 사소한 항목(약 45건)은 별도 세션으로 넘겼다: `docs/handoff/2026-11-02-seo-bundle-1-followups.md`. 이 흐름은 묶음 ②부터 이어 간다. `verify-dist.mjs`를 같이 고치므로 자주 rebase한다.
- 과거의 “Codex 수집본 없음” 상태는 위 2026-11-09 수집 기록으로 대체한다. 홈 브랜드 검색어 공개 표본이 부족해 역할 변경을 자동 확정하지 않는다.

## 작업 규칙

- 루트 체크아웃 `D:\Development\code-destiny`는 다른 세션이 쓰는 중이다(`feat/world-cast-page`, 미커밋 다수). 건드리지 않는다.
- push는 묶음 승인 때 함께 한다: `git fetch` → `git rebase origin/main` → `npm run check:pre-push` → `git push origin HEAD:main`.
- 운영: 묶음 승인 뒤 `gh workflow run cloudflare-pages-deploy.yml --ref main -f mode=production`. 실행 URL만 전하고 폴링하지 않는다.
- 따로 승인받을 것: 워크플로 변경(T1 자정 지연, seo-operations 입력), 계정 제출(사이트맵 재제출·수집 요청), `scripts/report-revenue-funnel.mjs` 실행(운영 DB 읽기).
- 금지 사항과 경계는 설계 문서 '작업 경계'를 따른다.

## 설계

설계 문서가 정본이다. 승격 순서: ① V0+A2+D1 → ② A1 엣지 → ③ B+A3 원장·hreflang → ④ E1+C+E2(11/07 이후, Codex 수집본 필요) → ⑤ D2(50~100쪽씩) → 별도 F 성능. 묶음마다 '배포 게이트' 8단계를 거친다.

## 단계

- [x] 묶음 ① — verify-dist 실패 0, 경고가 감사 수치를 재현(og:url 8쪽, hreflang 100/80/8), 운영 `/version.json` SHA 일치
  - [x] 로컬: 구현·검토·회귀 통과, verify-dist 실패 0, 승인 패킷 작성
  - [x] main push (2026-11-02, HEAD는 이 문서 커밋)
  - [x] 운영 배포 승인(2026-11-02, 후속 정리 그룹 D 포함) → 승격 런 https://github.com/rei1237/codedestiny/actions/runs/41335766465 (main `6d514ecaf`). `/version.json` gitSha `6d514ecaf` 일치 확인(2026-11-02), 작은 후속은 `docs/handoff/2026-11-02-seo-post-promotion-followups.md`
- [x] 묶음 ② — vm 하네스 5개국×3UA 불변, 절대 Location 301 한 번, 결제 회귀 통과
- [x] 묶음 ③ — main·공식 CI·스테이징·공유 운영 릴리스·SEO 실측·daily Operations 완료(2026-11-09)
- [ ] Codex 수집본 반영 → 묶음 ④ → 묶음 ⑤ → F
- [ ] 최종 산출물 6종(설계 문서 '최종 산출물')
- [ ] 끝: 이 문서 `status: done`, 워크트리 배수(junction 해제 → `git worktree remove --force` → `git branch -d`)

## 함정

1. `scripts/verify-sitemap-integrity.mjs:8`은 낡은 루트 robots.txt를 읽는다. `dist/robots.txt`로 바꾸면 빌드 전에 돌 때 파일이 없다.
2. `dist/robots.txt`는 postbuild가 `out/` → `public/` 순으로 복사한 뒤 `promote-static-shell-to-root.mjs:11→:15`가 out 판으로 되돌린다. 사본을 지운 뒤 최종본이 `app/robots.ts` 출력인지, `apply-staging-noindex.mjs:124`가 여전히 덮어쓰는지 본다.
3. `/sitemap.xml`(빙이 읽음)과 sitemap-index 하위 합집합은 개수(1,037)만 같다. 집합 동일 규칙과 내부 링크 404 규칙은 깨끗하지 않으면 경고로 시작한다.
4. `cd_geo_country` Set-Cookie가 있는 동안 HTML Cache-Control은 `private`을 유지한다.
5. 언어 제안 배너는 `navigator.languages`를 쓴다. 자동 이동과 SSR 출력은 없고, `cd_locale_explicit`와 닫기 기록을 존중한다.
6. `wt/infra-deploy-20261031-190620`이 `index.html`(:974, :983, :1105 이후)과 `package.json` ~:188을 건드린다. 새 스크립트는 :188에서 떨어뜨린다.
7. verify-dist는 00:10 KST 일일 발행(`fortune-daily-publish`)과 다른 세션 배포를 막으면 안 된다.
8. 승격할 때마다 `git log <운영 SHA>..origin/main`을 승인 패킷에 넣는다.
9. 겹치는 기존 검사는 지우지 않는다. main CI에서 10회 같은 판정을 낸 뒤 별도 커밋으로 지운다(CLAUDE.md:54).

## 정본 예시

- 워커 vm 하네스: `__tests__/ui/visitor-country-routing.test.mjs`
- 의존성 없는 ESM 원장: `lib/brand/brand-facts.mjs`

## 검증

```
npm run verify:handoff-contract
npm run check:fast
npm run check:pre-push
npm run verify:staging -- --sha=<40자리 SHA>
```

## 근거

- 이번 감사 보존본: `D:\Development\seo-audit\code-destiny-20261101\`(목록은 README.md)
- 10/29 감사: `D:\Development\seo-audit\code-destiny-20261029\ACTION-PLAN.md`
- 원 대화: `C:\Users\user\.claude\projects\C--Users-user\079f77bc-4a1f-4184-8376-249500b7d7ec.jsonl`

## 모르는 것

- 검색 수치(Codex 수집 전). 추측해서 채우지 않는다.
- 홈 역할: `/`와 `/ggulggul/` 중 어느 쪽을 홈 hreflang 묶음의 ko·x-default로 둘지. 묶음 ④ 승인 패킷에서 사용자가 정한다.
- `/yeongnyangi/free-fortune` 302를 영구로 둘지.

## 재개

- 새 세션은 `C:\Users\user`에서 열고 `/handoff D:\Development\codedestiny-worktrees\seo-architecture-rebuild-20261101-135310\docs\handoff\2026-11-01-seo-architecture-rebuild.md`로 시작한다.
- 작업 디렉터리는 `D:\Development\codedestiny-worktrees\seo-architecture-rebuild-20261101-135310`이다. 브랜치는 origin/main과 같은 지점까지 push됐다. 이어서 할 때는 `git fetch` 후 `git rebase origin/main`부터 한다.
- 다음 행동은 frontmatter `next`다.
