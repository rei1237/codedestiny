---
status: done
updated: 2026-09-12
next: "후속: 2026-09-12-detail-copy-batch2-compat.md (배치 2 궁합)."
---

# 유료 상세창 카피 배치 1 — 사주 프리미엄 리포트 7종

선행 문서: `2026-09-11-detail-sheet-premium-redesign`(완료 핸드오프, git 히스토리 참조) (공통 구조·운명의 꽃, PR #1923 머지 7aecad1fb). 형식 계약(섹션 순서·금지어·`valueCompare:{rows:[]}` 명시 숨김·outlineImage 실재 검사)은 그 문서가 정본이다.

## 범위 (가정)

"사주 프리미엄 리포트" = 사주 결과 화면 안 유료 리포트 카드 7종으로 잡았다.
`rpt_healthReportCard` · `rpt_quantumCard` · `rpt_skillTreeCard` · `rpt_specialCharmCard` · `rpt_energyCoordCard` · `rpt_villainCard` · `rpt_secretHouseEntryCard`.
`animal-destiny-unlock` 은 사주 결과 카드가 아니라 제외했다.

## 한 일

- `index.html` `FEATURE_MARKETING_COPY` 7항목에 `receives`(4~5) · `outline`(4~6) · `outlineImage`(각 카드 타일 썸네일, public/fuctionassets) 추가, 사실 근거 주석 1개(건강 항목 위).
- 실제 결과 화면과 다른 문장 정정:
  - 건강: 사용자에게 보이는 것은 `js/entertain-engine.js` 의 `renderHealthReport` 오버라이드(`buildWellnessHealthReport`) — 오늘·오행 균형·체질·흐름·실천 5장, 추천 음식 5선. 원국 기준, 날짜는 표시용(조후 중립일 때만 지금 달 사용).
  - 빌런: "원형 10종 전부" → 점수 40 이상이 있으면 상위 7종, 없으면 5종.
  - 시크릿 하우스: 출연자 다섯 명은 고정, 일간은 첫 호감도·궁합만 정한다. 이미지 저장 없음.
  - 스킬 트리: 챕터·성장 흐름은 지금 나이 기준, 오늘의 성장 기록(일일 퀘스트·경험치, KST 자정 초기화).
  - 매력·빌런: 날짜·무작위 없음. 여행지: 여행 난이도는 해외 좌표에만.
- 금지어 제거(매력·시크릿 하우스의 "기능").
- 사전: 11개 로케일 × 39경로(en·ja·zh-cn·zh-tw 손번역, 나머지 7개 en 복사, ko 없음). 이름 표기 연이=Yeoni(ja ヨニ), Neo=ネオ.
- 재생성: `sync:public`(미러·빌드 해시·`feature-marketing-copy.generated.json`), `sitemap:generate`(아래 함정).
- 가격·환불 기한은 카피에 적지 않았다. 결제 로직·상품 ID 무변경.
- `styles/feature-marketing-detail.css` `.tile-pvw-outline-img`: `object-fit: cover → contain` + `background: transparent`. 틀은 운명의 꽃 이미지(320×213, 3:2)에 맞춰져 있어, 타일 썸네일(1672×941, 16:9)을 넣으면 cover 가 양옆을 잘라 이미지 속 제목 첫 글자가 사라졌다(건강·퀀텀·스킬 트리·시크릿 하우스 4장, 시각 검사 실측). contain 은 3:2 인 꽃에는 변화가 없고, 16:9 는 위아래 17~18px 띠가 생긴다. 띠에 전역 img 폴백 회색(#e5e5e5, `styles/fortune-ui.css:242`)이 깔려 transparent 로 끄고 틀의 blush 가 보이게 했다(`styles/fortune-gateway.css:372` 와 같은 처리). 다음 배치도 16:9 썸네일을 그대로 쓸 수 있다.

## 검증 (2026-09-12 실행)

- `verify:feature-marketing-schema` OK(카피 162) · `verify:feature-marketing-dictionary` OK(11 로케일 / 35640 경로 / 결손 0)
- `verify:public-parity` · `verify:payment-legal-copy` · `verify:rpt-preview-cta` · `verify:payment-freeze` · `verify:sitemap-drift` 통과
- `verify-feature-popup-journey` PASS(63 × 4폭 — rpt 카드는 이 검사 대상이 아니다)
- `check:fast` 통과(jest 228 스위트 / 2686)
- **렌더 실측**(scratch CDP, rpt-preview-cta 하네스 복사, 390 모바일, 잠금 상태): 7종 모두 상세창 열림 · receives/outline 제목 전부 표시 · outlineImage 로드(naturalWidth>0). 시트 안 "기능"은 공통 헤더 라벨 「기능 상세」 하나뿐(모든 상세창 공통 UI, 이번 범위 밖).
- 시각 검사 에이전트(스크린샷 7장, sharp 픽셀): 제목 잘림 0 · 띠 #FBEEF1(blush) 위아래 17~18px 대칭 · 대비 AA 이상(본문 7.6:1, 번호 5.4:1, CTA 10.8:1). 촬영 환경은 가격 API 가 없어 CTA 가 "가격 확인 중"으로 보인다(정상).
- origin/main(875401499, #1921 숙요) 리베이스 후 위 가드·`check:fast`·렌더 실측 재실행 통과. 충돌은 `config/sitemap-lastmod.json` 하나 — upstream 채택 후 `sitemap:generate`·`sync:public` 재생성. #1921 이 바꾼 퀀텀 엔진 파일은 퀀텀 카피(숙요 언급 없음)에 영향 없음.

## 함정

- **sitemap drift**: #1895 의 날짜 기반 URL 때문에 날짜 창이 매일 움직여(오늘 추가·30일 전 제거) lastmod 서명이 바뀐다. 아무 PR 이나 그날 `npm run sitemap:generate` 없이 올리면 `verify:sitemap-drift`(pr-ci.yml)가 실패한다.
- rpt 하네스의 정적 서버는 레포 루트를 서빙해 `/fuctionassets/*`(public/ 에만 있음) 이미지가 404 다. 렌더 실측할 때는 public/ 폴백을 넣은 복사본을 쓴다.
- 카피 한 줄(JS 객체 리터럴) 수정은 `new Function` 파싱 → JSON 의미 비교 → 직렬화 방식이 안전했다. Bash heredoc 은 백슬래시를 먹으니 Write 도구로 스크립트를 쓴다.
- 사전 경로 이름이 COPY 필드와 다르다: subheadline→tagline, unlockBenefits→premiumChapters, recommendedFor→premiumAudience, trustNotes→premiumOutcomes, previewText→premiumIntro, `valueCompare.rows.N` → `valueCompare.N`. 배열은 `{"0":..}` 객체.

## 후속 과제 (보고만, 이 PR 에서 안 고침)

1. 매력·스킬 트리는 구매 전에도 유료 본문 전체가 DOM 에 렌더된다.
2. 시크릿 하우스 URL 은 해금 확인 없이 열린다.
3. 시크릿 하우스 카카오 SDK 분기는 죽은 코드이고 공유 URL 은 늘 홈이다.
4. 시크릿 하우스 타일 문구 "엔딩 카드 저장/공유" — 저장이 없다.
5. 건강 리포트 가격 불일치: 문서 5,000원(MOBILE_FEATURE_REGISTRY.md:113, docs/payments/payment-inventory.md:51) vs 코드 cost 100(=10,000원).
6. 건강 리포트 레거시 렌더러가 오버라이드된 채 남아 있다.
7. 스킬 트리 카피 자기모순(기존): faq[1] "수치는 고정값" vs trustNotes[1] "노력으로 변할 수 있습니다".
8. 퀀텀의 "삼합·방합" 주장은 실측하지 않았다(카피 기존 문장 유지).
9. 상세창 공통 헤더 「기능 상세」가 금지어 톤과 어긋난다 — 공통 라벨 변경은 별도 결정.
10. 선행 문서 후속 과제(가격 배지 "· 전문가 상담", CTA 이중 호출 등)는 그대로 열려 있다.

## 다음 배치

배치 2 궁합 → 타로 → 자미·점성 → 월정석 단건. 궁합 대상 키는 `FEATURE_MARKETING_COPY` 에서 궁합 결과 카드·단건을 먼저 목록화하고 범위 가정을 문서 첫 줄에 적는다.
