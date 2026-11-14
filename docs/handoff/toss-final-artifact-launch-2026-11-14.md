---
status: in-progress
updated: 2026-11-14
next: 실행 중인 build2(session83971) 결과를 받고 actual AIT animal/music 검증부터 끝낸 뒤 최종 CI/Linux AIT/새 QR/운영 출시안을 완성한다.
---

## 첫 행동
handoff 스킬/CLAUDE를 읽고 이 문서를 최신 정본으로 삼는다. 전체 사용자 요청은 중단하지 않는다. 이전 toss-launch-completion 및 toss-private-extended-native 문서는 이전 증거 참고용이다.

## 지금 상태
- 워크트리 D:/Development/codedestiny-worktrees/toss-launch-completion-20261114-165438, 브랜치 wt/toss-launch-completion-20261114-165438. root checkout은 다른 세션 소유: 편집/checkout/reset 금지.
- 마지막 코드 통합 f76687af0, 동물 도감 QA 029670ad0. git fetch 완료. main 마지막 push 9a6ac23eb. 이후 로컬 커밋 다수; HEAD:main으로 push한다. 다른 변경 보존.
- **빌드 실행 중**: npm --prefix apps/toss run build:private-simulation, exec session83971, 로그 D:/Development/Temp/launch-final-private-build2.txt. source freeze다. 이 빌드에 음악/동물/가격배지 수정/추가 gzip 모두 포함.
- agent /root/launch_final_coordinator/animal_port가 동물 소유, source 안정/QA 도움 대기. /root/music_download는 완료/슬롯 반환. parent /root에게 진행 및 출시안 전달한다.

## 승인 상태
- 사용자 2026-11-14: 모든 코드 가능한 기능을 끝까지 진행, 실제 AIT mock 검증, 가능하면 론칭까지. 실결제/실 LLM/운영 DB 쓰기 금지, 판매 false 유지. 검토 보류와 최신 론칭 요청의 운영 게이트는 코드/AIT 완료 후 root가 한 번 묶음 질문한다. 개발 중 이 때문에 중단하지 않는다.
- 새 브라우저 작업공간에서 계속 승인 유지. 다른 사용자 공간 claim 금지.
- 운영 Worker 승격/secret 등록/상품노출/검토/최종출시는 개별 게이트. 임의 SKU 가격/secret 값 생성 금지. 승인된 콘솔 5SKU(연이4950+영냥이4tier) 외 판매 금지.

## 구현 및 증거
- 고정110행 감사 docs/toss/original-mode-audit-20261114.json, inventory/feature-matrix. 53eca7d6a는 historical local-partial과 현재 portStatus 분리: 당시 2일부(animal/music),92운영설정,16개발범위동작. old 상세 수동표의 일부 이식은 역사 증거. 최종 동물/음악 실제AIT 후 감사/생성기 갱신할 것. 기존 검증을 새110개 개별E2E로 부풀리지 않는다.
- 동물 02ebf0ffc +029670ad0: 원본 AnimalResultScreen 전체10탭/6심층/12도감/관계/성장/카드, 원본 solar/lunar/leap/unknown+144궁합,7targeted/tsc/eslint/detector PASS. guest 무료/미저장 원본 정책. private API 공개 경로 원본 pure worker 호출. --animal-destiny QA 포함.
- 음악 세부 정본 docs/handoff/toss-music-download-2026-11-14.md (cf5186f40). 단건권리/owner/환불/서비스경계/원본 proxy 유지. mock SDK는 exact ID3 10byte만 localStorage 기록하며 실제 파일 저장 없음. 대상12+모델13+상품2 PASS. **32MiB 초과 원곡 저장 미완료**: 설치SDK3.7 File.saveBase64/openPDFViewer만 지원, URL/stream API없음. 정책한도 아닌 기술제약; 큰파일 전체완료로 표시하지 않는다. 운영은 곡별SKU/실원곡크기/실기기파일 필요.
- 통합 f76687af0: privateAPI 음악 DI/카탈로그/주문/보관함, bootstrap/sdk 음악목록, 모의저장 정확문구, --music-download/animal CLI, workflow5모드. Node private music API+SDK2PASS, CLI syntax PASS.
- 추가무손실압축: 62598c2f3 심리검사 literal -69KB; b165ada4c 타로 sun-recovery/interpretation literal -105KB, 원문identity+failclosed검사 PASS. animal gzip -27KB. 원본/아트삭제 없음. 더 압축 필요하면 lossless만.
- 이전 실제 Windows AIT 01a1d9c9-e74b-7540-af9f-81dcba5c8032는 expanded100022244(한도22244초과), 음악/동물/최신gzip 전. 이 AIT에서 astro2,vedic2+flower4,neoemail 경로 PASS. 로그 D:/Development/Temp/launch-final-astro-synastry2.txt / launch-final-free-originals2.txt / launch-final-neo-email3.txt. astro 원본가격배지 발견해 b5de20414 neutral수정, 새AIT 재검증 필요.
- Neo email은 실제 메일발송아닌 mock 접수/상태/취소요청/보관함, deliveries0. 취소요청을 환불완료로 주장하지 않는다.

## 설계 / 작업 규칙과 함정
- source 안정 후 현재 build2 완료 확인. 명령 node apps/toss/test/private-simulation-archive.mjs apps/toss/private-simulation/ai-saju-studio.ait --local-windows --animal-destiny (옵션 교체).
- 즉시 --animal-destiny / --music-download / --astro-synastry / --free-originals / --neo-email 및 core(default), 압축회귀 --free-calculations / --free-reading 검증. 최종 Linux workflow가 전체 서비스 CLI 실행. 실결제나 external fetch 폴백없음.
- TOSS_CAPTURE_DIR=D:/Development/Temp/launch-final-screens 사용하면 동물/음악/vedic/prashna/flower PNG 생성. view_image로 작은화면 직접 확인. QA selector 실패는 실제UI 근거로만 고치며 상태검증 축소 금지.
- 음악 홈 검색 음악→첫곡→로그인→단건결제로다운로드→모의파일저장→앱재진입→꿀꿀운세구매기록→다시보기→B동일URL차단. 동물은 무료라 로그인/주문0, B 입력초기화.
- 공식 checkfast 이번 묶음 아직 미실행. npm run check:fast -- --plan --base=9a6ac23eb 후 계획대로 1회, prepush, mainCI한번 조회 후 push. 기존CI run43588000694 SHA9a6은 마지막조회 in_progress(critical/build/typecheck성공,static진행). 지금push직전 한번조회. 빨간불이면 원인수정. 매번전체검사/CI폴링 금지. Linux artifact workflow 필요한 completion 대기는 허용.
- .github/workflows/pr-ci.yml에 --astro-synastry/free-originals/neo-email/music-download/animal-destiny 추가. YAML parse 최종필요. Linux 최종검증SHA로 full_ci+toss_artifact+toss_simulation_artifact 공식워크플로실행. 이전 QR15는80bd 구버전이므로 새번들새QR필수.
- 공유index: 명시적 own files add/commit, 다른agent stage와 겹치지 않는다. no reset/stash.

## 콘솔 / 운영 출시안
- ego-browser skill 및 CLI 전체guide 다시읽고사용. 설치0.6.2.8, 업그레이드불필요. TaskSpace68 name Code Destiny final Linux private QR 20261114, p1. 마지막 app-build https://apps-in-toss.toss.im/workspace/21957/mini-app/ai-saju-studio/app-build . 이전버전20261114-15. ref127 버전등록/ref128정보수정은 snapshot갱신후사용.
- 실행파일 D:/Development/Temp/toss-launch-console-20261114/round-32.mjs~round-40.mjs. 새round41이후 unique파일 작성, ego-browser nodejs -e import(file URL). space사라지면 승인대로새space. 아직업로드/검토/외부저장 안함. corrected600x600opaque아이콘 기존검증완료; 새아트불필요. 기존콘솔3스크린샷이옛축소홈이라 최종실AIT화면교체자료 필요.
- docs/toss/launch-operational-evidence-20261114.md 최신302b9c496: read-only wrangler secret list code-destiny-web 60names중TOSS_*0. TOSS_IDENTITY_KEY/TOSS_DATA_KEY/TOSS_CALLBACK_AUTHORIZATION 미확인/미등록, 값노출없음. 로그 D:/Development/Temp/launch-final-secret-names.txt(names only). 기존 데이터키관계 확인없이 랜덤등록 금지. 로컬 mTLS bindingcert/expiry2027-12-03 존재는 운영배포증거아님.
- 공식 purchaseowner 독립검증 API 부족으로 신규판매닫힘필수. 최종 root 전달할 구체출시후보: **무료+검증된기존결과,신규판매닫힘**, Worker commit/bindings/datafields/secret필요이름/개인정보정본/UI콘솔기입값/제출문구 묶음. 코드를 먼저끝낸 뒤 root운영승인질문.

## 단계
- [x] fixed110 원본추적 및 코드가능 마지막2군 구현
- [x] 음악/동물 mock 통합 및 소스대상검사
- [ ] build2 용량확인 / 실제AIT 마지막2군 및 회귀 / 모바일스크린샷 확인
- [ ] 기능표 최종증거갱신 / checkfast / prepush / mainpush / CI
- [ ] Linux exactSHA AIT / 전체 실제번들mock검사 / 새 비공개QR
- [ ] 무료+기존결과 운영출시안 및 실기기 버튼별절차를 root전달
- [ ] 승인된 운영단계 처리 또는 정확한 gate보고, 자기문서done/작업물정리
