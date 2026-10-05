# 가격 정정 및 상담가 홍보

status: done

사용자 요청: 영냥이 가격을 고등어 3,000원 기준 원래 비율로 정정하고 운영 승격한 뒤 공식 Threads에 가격 안내와 고급 홍보 이미지를 게시한다. 연이의 운명 찻집, 네오 팩폭 전략실도 홍보 이미지와 함께 게시한다.

확정 단건 가격: 고등어 3,000 / 연어 9,000 / 광어 15,000 / 참치 30,000 / 모둠 50,000 / 오마카세 80,000원.
생선 팩: 5·10·20회 20·30·40% 할인 유지. 기존 구매 권리 유지.

- [x] 사용자에게 생선 비율과 융합 가격 재확인
- [x] 서버 정본 및 예정가·팩 가격 정정
- [x] mock 검증 및 main CI 통과
- [x] 승인된 운영 승격 1회 및 Pages/Worker SHA·실제 상품가 확인
- [x] 이미지 3종 제작·검수
- [x] 공식 Threads 게시·공개 URL 확인
- [x] 임시 파일·자기 워크트리 정리

동시 작업 보존: 주 체크아웃의 index.html, public 미러, styles 및 기존 v3 캠페인 미커밋 변경은 다른 세션 소유. 별도 워크트리에서 작업하며 기존 v3 게시물을 재사용하지 않는다.

이미지는 built-in image_gen으로 생성한다. 영냥이는 hero-800.webp, 연이는 사용자 바탕화면 CodeDestiny-Build/연이 프로필1.png, 네오는 neo-character-800.webp를 정체성 참조로 사용했다. 프롬프트는 prompts.json에 기록한다.

## 완료 증거
- 운영 SHA: 3ff468f39b953b00a85cf58ebd253ca11a7c882f
- main CI: https://github.com/rei1237/codedestiny/actions/runs/37281841329 (success)
- 운영 승격 1회: https://github.com/rei1237/codedestiny/actions/runs/37283155290 (success)
- 실서비스 읽기 검증 PASS: Pages/Worker SHA 일치, 상담 28개, 팩 12개, 홈 가격 4개.
- 영냥이: https://www.threads.com/@codedestiny_official/post/DeGyX2bnfV7
- 연이: https://www.threads.com/@codedestiny_official/post/DeGyg-CnSjm
- 네오: https://www.threads.com/@codedestiny_official/post/DeGytS9HbEg
- 이미지 및 대체 텍스트를 포함한 공개 게시물을 직접 확인했다. posts.json은 게시 전 작성본이며 위 URL이 실제 게시 증거다.

## 변경 및 검증
- 서버 가격 정본, 생선 팩 가격, 예정가, 홈 표시와 생성 미러, 관련 테스트를 수정했다. 홈 가격은 서버 정본에서 동기화한다.
- 이용권 할인율 20/30/40%, 30일, 자동 갱신 없음, 기존 구매 스냅샷을 유지했다. 인증, DB 스키마, 해석/LLM 요청 내용은 변경하지 않았다.
- targeted node/Jest, verify-app-store-pricing, verify-krw-copy-canonical, verify:public-mirror-fresh, verify:sitemap-drift PASS.
- reading-invariance 123개 사례 PASS. 가격을 포함하는 앞 2개 fingerprint만 갱신했으며 나머지 해석/요청/manifest hash는 동일했다.
- 초기 check:fast는 가격 fingerprint 불일치로 실패했고 수정 후 focused 검증 및 최종 GitHub CI가 통과했다. 전체 로컬 검사를 재실행한 것으로 주장하지 않는다.
- 실제 과금/실제 LLM 호출 검증은 실행하지 않았다. Android의 신규 가격 SKU는 검증 전 차단 상태를 유지했다.
- 사용자 바탕화면 CodeDestiny-상담홍보-2026-10-05-가격정정 폴더에 이미지, 게시문구, 운영가격검증.ps1, production-evidence.json, 공개 게시 스크린샷을 보관한다.
- 주 체크아웃의 다른 세션 변경을 보존했다. 원격 main에 작업을 반영했으며 주 체크아웃을 강제로 덮어쓰지 않았다.
