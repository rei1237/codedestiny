---
status: active
updated: 2026-09-28
next: 스테이징 공유 생성·OG·폐기를 확인하고 사용자 요청에 따라 정식 production workflow를 실행한 뒤 실사용 지표를 관측한다.
---

# 꿀꿀·영냥이 공유 편지 전달

## 구현과 측정

- 공유 `b3367a6c0`, SEO `cae4868ea`, 통합 `db3e74035`, 문서 계약 `c674f49bb`, 환경 분리 `456ea72d6816726de95f8bbf406177aa80112c78`를 main에 push했다. PR 없음.
- 영냥이·연이·네오 원본을 참조한 편지 그림 3종을 제작했다. 크림색 수신 화면, 1:1/9:16 저장 이미지, 1200×630 서버 OG에 적용했다. 고객별 이미지 생성 API를 호출하지 않는다.
- 고객이 고른 120자만 공개 전 미리보기·동의 후 저장한다. 이름·출생정보·개인 질문·상대 정보·전체 상담/보관함은 기본 제외. 공개 링크는 30일 만료·같은 브라우저에서 폐기 가능하다.
- 상세 진단 표·검색 기준선·수정 의도·미확인 항목은 [2026-09-28-insight-sharing-audit.md](../seo/2026-09-28-insight-sharing-audit.md).
- 정책/가격/이용권/월정석/단건 결제 및 기존 유료 생성·복구·결과 DB 스키마는 유지했다. 공유용 API·별도 collection은 새로 추가했다.

## 검증과 발견한 회귀

- paid gate 88/88, node tests, Jest 309 suites/4,515 tests, typecheck, lint, worker dry-run, sitemap drift 통과. check:fast는 중간 오류 수정 후 남은 계획 항목을 이어 실행했다.
- 모의 생성·취소·폐기·4폭(360/390/430/1280), 기존 영냥이 공유/미완성/재생성 방지 회귀 통과. 실제 PG/LLM/운영 DB 쓰기 0.
- 로컬 Cloudflare renderer의 세 캐릭터 PNG 200, 120자·두 저장 비율 시각 검토 통과. 실제 메신저 전송과 여성 고객 선호도는 미검증.
- 운영 상품 API 28개 가격·챕터가 코드와 28/28 일치. 실제 checkout 과금은 검증하지 않음.
- 최초 CI `36375550399`는 handoff frontmatter 누락으로 실패했고 `c674f49bb`에서 수정했다. 최신 코드 `456ea72d`의 [main CI 36382085504](https://github.com/rei1237/codedestiny/actions/runs/36382085504)는 성공했다.
- 첫 스테이징 실험은 API 생성/폐기 정상, 공개 HTML 503. 기존 API origin 기본값이 production Worker였던 것이 원인이다. 새 공유 렌더러만 호스트별 production/staging 목적지로 분리하고 알 수 없는 호스트는 차단했다. VM 회귀 테스트로 두 목적지와 unknown host의 fetch 0회를 확인했다. 이전 시험 문서는 폐기했고 API404를 확인했다.

## 다음 관측과 확장

1. 공개 링크 생성→수신→무료 시작을 두 브랜드별로 집계한다. 복사/공유창 반환을 전달 완료로 세지 않는다. 구매는 결제 원장·환불·내부 트래픽을 정제한 뒤 비교한다.
2. 실제 카카오톡/문자 미리보기 캐시, 인스타그램 스토리 업로드, 저사양 모바일, 이미지 실패율·운영 비용을 관측한다. 저장·전송된 이미지는 링크 폐기로 회수할 수 없다.
3. 계산 체계별 근거 카드와 두 사람 동의 관계 카드는 이번 구현에 포함되지 않았다. 각 계산 출력 계약 및 상대방의 참여·철회를 먼저 설계한다. 번역404 원 URL·미색인 사유·예측 원문 대조·비한국어 무료 본문 검수도 남아 있다.

## 재개

작업 디렉터리 `D:\Development\code-destiny`. 문서 절대 경로 `D:\Development\code-destiny\docs\handoff\2026-09-28-insight-sharing-seo.md`. 기능 기준 SHA `456ea72d6816726de95f8bbf406177aa80112c78`. 다른 세션의 마케팅/next-env 변경을 보존한다. 먼저 이 SHA 이후의 release 결과와 Pages/Worker SHA를 읽기 전용으로 확인한다.

화면·측정 JSON은 `C:\Users\user\.codex\visualizations\2026\09\28\01a0e5f0-1bb6-7ad3-8bb7-0bacc04a5703\share-insight`에 보존했다. 영냥이 예시 `receiver-yeongnyangi-390.png`. 비밀 폐기키와 고객 문장은 증거/로그에 저장하지 않는다.

## 스테이징 실측 및 운영 경계

- 기능 SHA `456ea72d6816726de95f8bbf406177aa80112c78`의 [스테이징 36382123366](https://github.com/rei1237/codedestiny/actions/runs/36382123366) 성공. `npm run verify:staging -- --sha=456ea72d6816726de95f8bbf406177aa80112c78`: Pages/Worker PASS.
- 격리된 스테이징 DB 시험 1건: POST201, 서버 HTML200, OG PNG200, 390px 화면, DELETE200, API/공개 페이지404 통과. 시험 문서는 폐기했다. 고객 정보·운영 DB·실결제·실LLM을 사용하지 않았다.
- 동시 작업으로 main이 `780d0dc8f3e0fd2ee0d6d9b725bed8e390bc3d31`까지 진행해 첫 운영 요청 `36383458252`를 checkout 단계에서 취소했다. release job 실행 없음. 새 타로/상품 안내 변경은 다른 세션 소유이며 이 작업의 성과로 합산하지 않는다.
- production은 사용자 요청 범위 안에서 최신 코드의 CI/스테이징 확인 후 정식 workflow로 실행한다. 저장소 전달 규칙에 따라 production 실행 후 장기 폴링하지 않고 run URL을 최종 보고한다. 실행 요청과 운영 성공을 구분한다. 후속 세션은 run 결과 및 Pages/Worker SHA부터 확인해야 한다.
