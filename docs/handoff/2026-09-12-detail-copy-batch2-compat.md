---
status: active
updated: 2026-09-12
next: "배치 2(궁합) 상세창 카피 PR 의 CI·머지를 확인한 뒤, 같은 형식(receives·outline)으로 배치 3(타로) 유료 상품 카피를 옮긴다."
---

# 유료 상세창 카피 배치 2 — 궁합 유료 상품 5종

범위 가정: "궁합 유료 상품" = `FEATURE_MARKETING_COPY` 궁합 항목 중 **실제 결과 화면이 있는** 5종 — `openSukuyoModal`(27수 궁합) · `gotoSukuyoPremium`(숙요 궁합 상담) · `openLoveSimulation`(LOVE CODE) · `master-love-codex-compat`(마스터 궁합) · `nakshatra-compat`(동서 통합 궁합). `nakshatra-compat-ai` · `premium-veda-compatibility-addon` 은 카피만 있고 구현이 없어 제외했다(후속 1).

선행 문서: [2026-09-12-detail-copy-batch1-saju-premium.md](2026-09-12-detail-copy-batch1-saju-premium.md)(PR #1927), 형식 계약 정본은 [2026-09-11-detail-sheet-premium-redesign.md](2026-09-11-detail-sheet-premium-redesign.md).

## 한 일

- `index.html` `FEATURE_MARKETING_COPY` 5항목에 `receives`(4~5) · `outline`(4~6) · `outlineImage`(각 상품 타일·히어로 이미지, 실재 확인) 추가. 사실 근거 주석 1개(`premium-naming-prompt` 아래 "배치 2 — 궁합").
- 실제 결과 화면과 다른 문장 정정(요지):
  - 27수 궁합: 결과는 인연 리포트(유형 해설·핵심 구간·전문가 종합판정·관계 처방·주의 신호·빛과 현실·두 사람의 자리). "여섯 주제별 해석"은 결과 안 정밀 궁합 확장에만 있어 본문에서 뺐다. 저장·다시 열기 없음을 trustNotes 에 추가. 비교표는 `valueCompare:{rows:[]}` 로 숨김. 카피 속 가격 문구 제거.
  - 숙요 궁합 상담: 게이지·8축 별점·본질·근거·지표·비교·섹션 해설·PDF·다시 보기. 재회 예측 없음, 질문 입력 없음 FAQ.
  - LOVE CODE: 16 캐릭터 × 20 장면 × 선택지 3. 선택은 데이트 결과·관계 루트·대화 선택 분석만 바꾸고 사주 궁합 5축 점수는 고정. 근거는 상위 세 가지 + 리스크·데이트 팁. 저장·공유 없음 FAQ.
  - 마스터 궁합: 다섯 막 스무 장. "앞 장이 근거" 표현 제거(장은 병렬 생성). 상대 출생 시각 모름 FAQ(정오·시주 제외).
  - 동서 통합 궁합: 숙요 세 점수 끌림·안정·갈등. 초대 링크는 상대 기기에서만 결과가 열린다. 저장 없음 FAQ. 비교표 숨김.
- 사전: 11개 로케일(en·ja·zh-cn·zh-tw 손번역, 나머지 7개 en 복사, ko 없음). 바뀐 항목만 갱신하고 나머지는 기존 번역 유지. 마스터 궁합 faq 는 새 [1] 삽입으로 기존 [1][2] 번역을 [2][3] 으로 옮겼다.
- 재생성: `sync:public`(미러·빌드 해시·generated JSON·feature-details 설명), `sitemap:generate`.
- 가격·환불 기한은 카피에 적지 않았다. 결제 로직·상품 ID·CSS 무변경.

## 검증 (2026-09-12 실행, origin/main d00737dd1 리베이스 후)

- `verify:feature-marketing-schema` OK(카피 162) · `verify:feature-marketing-dictionary` OK(11 로케일 / 36740 경로 / 사전 없는 키 0)
- `verify:public-parity` · `verify:payment-legal-copy` · `verify:rpt-preview-cta` · `verify:payment-freeze` · `verify:sitemap-drift` 통과
- `verify-feature-popup-journey` PASS(63 × 4폭)
- `check:fast` 통과(entry-encoding · jest 228 스위트 / 2686)
- **렌더 실측**(scratch Playwright, 실제 index.html 런타임, 390 모바일, 외부 요청 전부 차단 — API·결제·LLM 호출 0): 합성 유료 타일로 `_cdOpenTilePreview` 호출, 3모드 × 5종.
  - ko: 숙요 상담·마스터 궁합은 receives/outline 제목 전부 표시·outlineImage 로드·섹션 순서 계약 일치. 27수 궁합·LOVE CODE·동서 통합은 **비주얼 상세 모드**(`pvw-visual`)로 열린다(아래 함정).
  - ko-fallback(`/feature-details/` 차단): 5종 모두 카피 경로로 렌더, 제목 전부 표시, 비교표 숨김 2종 확인, 카피 구간 금지어 0. 마스터 궁합 이미지 실패는 이미지가 `/feature-details/assets/` 아래라 차단 규칙에 걸린 것(ko·en 에선 로드).
  - en(`/en/index.html`): 5종 모두 lang=en, 영어 사전의 receives/outline 제목 전부 표시, 이미지 로드.
- 시각 검사 에이전트(스크린샷 13장): PASS — 잘림·겹침·가로 넘침 0, 아이콘 누락 0, outline 이미지 전부 표시. 대비 AA 이상(카드 본문 6.97:1, 카드 제목 13.62:1, 섹션 제목 10.77:1, outline 본문 7.59:1, 금색 칩 5.44:1, CTA 10.77:1). 카피 구간에 "원"·"7일" 없음.

## 함정

- **비주얼 상세 모드가 한국어에서 카피 구간을 덮는다.** `public/feature-details/catalog.json` 에 slug·alias 가 있는 키(sukuyo←openSukuyoModal, love-simulation←openLoveSimulation, nakshatra-compat)는 ko 에서 `js/feature-detail-preview.mjs` 가 검수 소개 패널을 붙이고 `pvw-visual` 을 켜, `styles/feature-visual-detail.css:96` 이 Receive·Outline 등을 숨긴다. 이 3종의 receives/outline 은 다른 로케일과 소개 로드 실패 시에만 보인다. 렌더 실측은 ko-fallback 모드로 카피 경로를 따로 확인해야 한다.
- 카탈로그 설명(`lib/marketing/feature-visual-details.generated.json`, `public/feature-details/*.json`)은 카피 subheadline·feats 에서 생성되므로 `sync:public` 결과를 같이 커밋한다.
- 사전 컨테이너 모양이 네임스페이스마다 다르다: `openSukuyoModal` 은 배열, 나머지는 `{"0":..}` 객체. 삽입으로 인덱스가 밀리면 기존 번역을 새 인덱스로 옮겨야 한다(scratch `apply-dict.cjs` 의 `"@N"`).
- 브랜치가 origin/main 보다 뒤처지면 소스(index.html·i18n)만 WIP 커밋 → 생성물 버리고 리베이스 → `sync:public`·`sitemap:generate` 재실행이 충돌 없이 깔끔했다.

## 후속 과제 (보고만, 이 PR 에서 안 고침)

1. `nakshatra-compat-ai` · `premium-veda-compatibility-addon` 은 카피만 있고 구현이 없다. veda 카피 faq[0].a 에 금지어 "기능"이 남아 있다.
2. LOVE CODE `page.tsx:105` 가 "열한 개의 장면"이라고 쓴다(실제 20).
3. LOVE CODE 의 옛 카피 한 곳(index.html 옛 33846행 부근)이 갱신되지 않았다.
4. 동서 통합 궁합 결과의 resetLine 박스가 비어 보일 가능성.
5. index.html 동서 통합 상세 패널(옛 33929행 부근)이 "다섯 방향"을 주장한다(실측과 불일치).
6. 27수 궁합: 렌더되지 않는 섹션이 죽은 코드로 남아 있고, 카카오 공유는 궁합 결과를 담지 않는다.
7. 숙요 AI `/message` 엔드포인트는 호출하는 곳이 없다.
8. 마스터 궁합 `data/premium.ts` 가 "종합 점수/결혼 가능성"을 주장하고 가격 주석이 낡았다.
9. 옛 숙요 AI feats 문구(index.html 옛 33807행 부근).
10. 27수 궁합 결과의 AI 패널 문구(엔진 17791행 부근)에 "데이터"·"프롬프트"가 있다 — 상세창 카피가 아니라 범위 밖.
11. 비주얼 상세 모드 3종은 ko 에서 receives/outline 이 보이지 않는다(선행 문서 후속 12와 같은 결정 대기).
12. 배치 1 후속(공통 헤더 「기능 상세」 등)은 그대로 열려 있다.
13. en 상세창의 27수 궁합 outline 이미지는 한국어 글자가 박힌 이미지를 그대로 쓴다. en 헤더 로고도 "꿀꿀운세"로 보인다 — 로케일별 이미지 정책 결정 필요.
14. 27수 궁합 하단 안내문이 390px 에서 마지막 줄에 "니다."만 남게 줄바꿈된다(가벼운 조판 문제).

## 다음 배치

배치 3 타로 → 자미·점성 → 월정석 단건. 타로 대상 키는 `FEATURE_MARKETING_COPY` 에서 타로 유료 결과·단건을 먼저 목록화하고, 비주얼 상세 카탈로그 여부(ko 에서 카피가 보이는지)를 같이 적는다. 범위 가정은 문서 첫 줄에 적는다.
