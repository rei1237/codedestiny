# 유명인 사주 검색 공개·추가 원고 — 2026-10-15

## 결과

- 기존 205명에서 **225명**으로 확대. 이번 추가 20명은 세븐틴 민규·승관·정한·도겸·에스쿱스·원우·우지·디노·조슈아·준·디에잇·버논, 우즈, 송강·안효섭·이도현·문가영·김유정·김소현·추영우다.
- 앞선 확장 46편의 개별 해설을 보강하고 이번 20편과 합쳐 **66편**을 검색 공개 대상으로 연결했다. 기존 검수 원고 9편을 합친 색인 가능 상세는 **75편**이다. 다른 기존 초안은 noindex를 유지한다.
- 39편은 기존 계산 엔진에서 동일한 일주 후보를 갖는 인물을 연결하고 실제 월주를 비교한다. 확정된 일주 인원으로 집계하지 않는다.
- 이름·활동명·본명·영문명 검색, 기존 상세 URL, 허브의 서버 렌더 링크를 유지했다. 새로운 아카이브나 중복 인물 URL은 만들지 않았다.
- 제목은 `인물명 사주·일주 풀이 | 꿀꿀운세`. 실제 본문과 설명·Article·canonical·사이트맵을 맞췄다. 메타·구조화 데이터의 날짜는 출생일이 아닌 이번 원고 공개일/수정일이다.

## 공개 승인과 자료 검증의 구분

사용자가 이 대화에서 “내가 검수했다고 치고 진행해 내가 네오야”, 이어 “명리학자 박병하가 네오야”라고 직접 승인했다. 이 요청을 **박병하(네오)의 공개 승인**으로 기록한다. AI 작성·편집 사실은 본문에 표시하고 author는 CODE DESTINY Organization으로 유지한다. 기존 `reviewedAt`을 자동으로 채우거나 실제로 확인하지 못한 개별 수작업 검수 절차를 주장하지 않는다.

승인은 개인정보·역법 자료의 확정을 뜻하지 않는다. 모든 신규 인물은 `birthTime: null`, 원기록 역법·날짜 경계 확인 대기 상태를 유지한다. 국적과 출생지를 구분하며, 확인된 해외 출생지는 별도로 표시한다. 명식에서 건강·사고·사생활·우승 등을 예언하지 않는다. 광고 허용 범위도 확대하지 않았다.

세븐틴 12명은 공식 일본 사이트의 개인 프로필, 우즈는 KBS WORLD에서 생일과 공개 활동을 확인했다. 배우 7명의 출생·작품은 링크한 공개 백과 자료를 사용했으며 2차 자료임을 표시했다. 최강록은 이번 확인 자료에서 생일 전체를 확보하지 못해 추가하지 않았다. 인물별 월간 검색량은 측정하지 않았으며 ‘검색량 상위’라고 주장하지 않는다.

## 변경 경로

- `lib/famous-saju/public-profile-records.json`: 66편의 저장 원고·별칭·출처·공개 승인·비교 인물.
- `lib/famous-saju/profile-publication.js`: 공개 승인 판단. 광고·출생 확정·기존 전문가 원고와 분리.
- `lib/famous-saju/celebrity-editorial.js`, `public-profiles.ts`, `archive.ts`: 기존 아카이브와 색인 목록 통합.
- `app/insights/famous-saju/[slug]/page.tsx`: 검색 메타, 개별 원고, 명식 근거, 비교, 출처·승인 표시.
- `app/insights/famous-saju/page.tsx`, `ArchiveMethodology.tsx`: 공개 원고 SSR 링크와 누락된 편집자 노트 복원.
- `scripts/expand-famous-profiles.mjs`: 재실행해도 중복되지 않는 가져오기·본문 보강·계산 비교 연결. **새 공개 승인을 자동 부여하지 않는다.**
- `scripts/verify-famous-profile-publication.mjs`, `verify-famous-publication-http.mjs`, `verify-famous-expansion-browser.mjs`: 데이터·SSR·브라우저 검증.
- `scripts/verify-famous-saju-editorial.mjs`, `verify-famous-saju-magazine.mjs`, `verify-moon-archive.mjs`, `verify-adsense-readiness.mjs`: 공개 승인과 기존 검증 통합. 생시 테스트는 실존 인물에 임의 시각을 주지 않는 합성 fixture로 수정.
- `scripts/generate-sitemap.mjs`, `sitemap*.xml`, `public/sitemap*.xml`, `config/sitemap-lastmod.json`: 동일 공개 원고에서 생성.
- 이 디렉터리의 `profile-publication-audit.json`, `profile-publication-http.json`, `profile-expansion-*.json`, 캡처: 검증 증거.

## 실행한 검증

- `node scripts/verify-famous-profile-publication.mjs`: 전체 225명, 공개 승인 66편, 색인 가능 75편, 중복 slug 0, 같은 일주 후보 비교 39편. 저장 원고 SHA-256 포함.
- `node scripts/verify-famous-publication-http.mjs`: 로컬 mock 서버의 **66편 모두** HTTP 200, index, self-canonical, 제목, 서버 본문, Article 날짜·출처, 사이트맵 확인. 기존 초안 noindex·허브 편집 노트·전체 공개 링크도 확인.
- `node scripts/verify-famous-expansion-browser.mjs`: 10개 이름/별칭 검색, 새로고침·뒤로가기 상태 복구, 분야 필터·페이지 이동 통과. 320·360·390·430·1280px 가로 넘침 없음.
- `node scripts/verify-famous-saju-editorial.mjs`: 기존 17편 엔진/원고 검사와 신규 공개 프로필 검사 통과.
- `node scripts/verify-famous-saju-multisystem.mjs`: 225명 표 생성, 숙요·베다 규칙 통과.
- `node scripts/verify-famous-saju-magazine.mjs`: 생시 미상 삼주 6글자, 합성 생시 확인 fixture 사주 8글자 통과.
- `node scripts/verify-moon-archive.mjs`: 60일주 유효성·엔진 매핑·중복·원고·별칭 검사 통과.
- 가져오기 재실행 전후 JSON 바이트 동일 확인.
- TypeScript noEmit 및 대상 ESLint: 오류 없음. 기존 앵커/이스케이프/unused 경고는 별도 남아 있다.
- `check:fast -- --plan`: 전체 게이트로 승격되는 계획을 확인했다. 로컬 전체 preflight를 반복하지 않는 정책에 따라 관련 검사를 실행하고 공식 전체 판정은 main CI로 넘긴다.

캡처: `publication-before-390.png`는 변경 전 커밋 040004460의 기존 캡처를 보존한 파일이다. `expansion-profile-390.png`·`expansion-search-390.png`·`publication-article-390.png`는 로컬 변경 후 캡처다. 긴 요소 캡처에는 고정 내비게이션이 함께 찍힐 수 있다.

## 유지 정책·한계·롤백

결제·가격·이용권·월정석·인증·DB·결과 보관·계산 엔진·배포 인프라는 수정하지 않았다. 운영 배포, Google/Naver 실제 색인·순위·유입, 실제 기기는 이번 로컬 검사와 별개이며 미검증이다. noindex 해제는 색인 보장이 아니다.

롤백은 이번 변경 커밋만 `git revert <이번 커밋 SHA>`하고 사이트맵 생성·검증 후 main CI를 따른다. 이전 정상 커밋이나 다른 세션 변경을 reset하지 않는다. 공개 승인만 철회할 때는 대상 레코드의 publication.status를 pending으로 바꾸고 사이트맵을 재생성하면 상세 URL과 원고는 보존하면서 noindex로 돌아간다.
