---
status: active
updated: 2026-09-23
next: "구매 전 소개·입력 확장의 main CI를 확인하고, 상세 팝업과 다른 전문가 상담군을 같은 품질로 순차 확장한다."
---

# 전문가 상담 UI 개선

## 사용자 방향과 범위

사용자는 고가 전문가 상담의 화면이 가격에 맞게 고급스러워야 구매하고 싶어진다고 지적했다. 단순한 색·여백 조정을 두 차례 거부하고 **인생의 책은 실제 책, 연애 비책은 비밀 연애 편지**라는 구체적 방향과 필요한 이미지 에셋 제작을 지시했다. 이 방향은 다시 묻지 않는다. 다른 전문가 상담도 각 상담의 성격에 맞게 개선하는 것이 전체 목표이며, 두 결과 화면의 수정으로 전체 완료를 선언하지 않는다.

## Direction contract

- THESIS: 사용자가 자신만의 책과 편지를 받은 느낌을 갖고, 긴 해설을 읽고 다시 열고 나누기 쉽게 한다.
- OWN-WORLD: 인생의 책은 짙은 녹색 천 제본·금박 나무 문양·아이보리 내지. 연애 비책은 면지·봉투·와인색 밀랍 봉인·절제된 잉크. 실제 생성한 래스터를 주 소재로 사용한다.
- STORY: 저장된 결과 확인 → 한 줄 핵심 → 명식·장별 해설 → 실행 조언 → 공유/PDF. 원문·계산·저장 상태와 기존 권한은 유지한다.
- FIRST VIEWPORT: 책은 실제 표지 위 제목과 소유자, 다음으로 요약과 두 열의 프로필. 편지는 편지지 위 제목·핵심 문장·관계 맥락. 전역 내비게이션 아래 여백을 확보한다.
- FORM: 사용자가 명시한 실제 책/비밀 편지. 선택지를 다시 제안하거나 임의의 세계관으로 치환하지 않는다. 기존 페이지 넘김·책갈피·요약 공유를 사용한다.
- FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

이 문서는 두 상품의 Direction contract·구현 기록·자산 출처다. 구현 후 지역 디자인 정본은 [docs/design/premium-consultation/DESIGN.md](design/premium-consultation/DESIGN.md), 확장 sidecar는 [design.json](design/premium-consultation/.impeccable/design.json)이다. 프로젝트 전역 DESIGN.md나 영냥이·연이 캐릭터 정체성을 덮어쓰지 않는다.

## 구매 전 화면 확장 — Direction contract

- THESIS: 구매 전에 받게 될 책·편지의 모습을 보여주고 상담 범위·가격·입력 동선을 한 화면에서 이해시킨다. 모드는 Persuade에서 Operate로 이어진다.
- OWN-WORLD: 기존에 제작한 녹색 제본 표지와 아이보리 봉인 편지를 그대로 사용한다. 모바일에서도 이미지 원본 비율을 유지하며 글자는 실제 HTML로 올린다.
- STORY: 결과물의 모습 → 상담 범위 → 기존 가격 → 정보 입력. 시작 CTA는 폼으로 이동하고 결제·생성을 실행하지 않는다.
- FIRST VIEWPORT: 데스크톱은 표지/편지 왼쪽과 소개·가격·CTA 오른쪽, 모바일은 작은 표지 다음 소개·CTA 순서. 전역 홈 버튼 아래에서 시작한다.
- FORM: 이미 사용자가 지정한 실제 책/비밀 편지 세계를 구매 전에도 유지한다. 연애 비책은 입력 폼을 넓은 열에 두고 안내를 좁은 열에 둔다. 모든 상태·기존 번역·가격 registry를 유지한다.
- FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

기존 라스터를 재사용한 확장 작업이며 새로운 생성 에셋은 없다. 결과 화면은 이번 입력 화면 확장으로 다시 수정하지 않는다. 다른 상담/상세 팝업은 별도 후속이다.

## 적용 경계

- 인생의 책: 결과 표지, 장별 내지, 목차, 첫 열람 표지 애니메이션, 공유 표지를 같은 책으로 연결한다.
- 연애 비책: 결과 첫 장과 공유 카드에 같은 편지지를 사용한다. 반복 하트 배경·이모지·밀랍을 흉내 낸 CSS 장식을 제거한다. 서명/프로필은 실제 저장된 값이다.
- 고정된 밝은 편지지에는 밝은/어두운 테마 모두 어두운 잉크를 짝지어 사용한다. 나머지 화면은 paired reportTheme을 사용한다.
- 이미지에는 문구를 굽지 않는다. 실제 결과 텍스트·다국어 사전·화면 확대를 유지한다.
- 가격·이용권·월정석·단건 결제·생성·저장·재열람·환불·PDF 권한은 변경하지 않는다.
- 공유 URL은 공개 상담 진입이다. 결과 ID/attemptId를 보낼 URL과 파일명에 넣지 않는다. 취소는 오류로 표시하지 않는다. 연애 비책은 미저장 결과에서 공유를 비활성화한다.
- 기존 두 공유 카드의 소유자 이름 표시와 원문 한 줄 선택 방식은 유지했다. 이름 숨기기/문구 편집/전송 전 카드 미리보기는 다음 공유 개선에 남아 있다.

## 다음 전문가 상담군

| 대상 | 실제 결과 진입 | 방향·다음 작업 |
|---|---|---|
| 인생의 책·연애 비책 상세 팝업 | feature-detail 정본 | 상품 Client 구매 전 소개·입력은 완료. 상세 팝업의 예시·제공 범위·가격 시각적 일치는 후속이며 과장된 리뷰·새 혜택 금지 |
| 마스터 연애 | app/master-love-codex/result/MasterLoveCodexResultClient.tsx | 관계 전략 보고서. 챕터 구조·단계별 조언, 저장 완료 후 공유 |
| 카르마 | app/karma-destiny-ai/result/KarmaDestinyAiResultClient.tsx | 성찰 기록. 정원 자산·반복 패턴·실행 노트, 완료/부분 결과 구분 |
| 서양 점성술 | app/astrology-ai/result/AstrologyAiResultClient.tsx | 천문 지도와 해설 기록. 실제 차트와 문장의 위계, 저장 요약 공유 |
| 베다 | app/vedic-ai/result/VedicAiResultClient.tsx 및 VedicAiClient.tsx | 두 결과 진입 모두 검토. 실제 체계·계산을 보존한 개인 해설서 |
| 작명·휴먼디자인·손금 | 기존 개별 결과 Client | 이름·바디그래프·손금 관찰이 중심인 상담별 기록. 동일한 장식 카드로 복제하지 않음 |
| 나크샤트라·초융합·자미두수·전문가 프레임 | 기존 공유 적용표 파일 목록 | 체계별 결과 구조·차트·요약을 먼저 읽고 개선. 아직 구현/검증 완료 아님 |

## 구매 전 화면·나머지 상담의 구체적 재개 위치

- 인생의 책 구매 전 **완료**: app/life-book-ai/LifeBookAiClient.tsx와 공통 PremiumConsultationIntro.module.css. 실제 책 표지·한국어 명조 소개·상담 범위·registry 가격·폼 이동을 연결했다. 준비 안내와 입력 폼의 폭을 교정했고 submit, 프로필 채우기, mode와 가격 데이터는 유지했다.
- 연애 비책 구매 전 **완료**: app/love-secret-ai/LoveSecretAiClient.tsx의 LoveSecretHero와 LoveSecretAiClient.module.css. 실제 봉투/편지 에셋과 reportTheme을 입력까지 연결했다. 폼을 넓은 열·안내를 좁은 열로 교정하고 기존 onStart/busy·단계 전환·소개·제공 범위를 유지했다. 밝고 어두운 테마의 입력·전역 뒤로가기 대비를 mock 브라우저에서 확인했다.
- 상세 팝업: public/feature-details/*.json과 lib/marketing/feature-visual-details.generated.json은 생성물이다. scripts/lib/build-visual-details.mjs는 index.html의 FEATURE_VISUAL_DETAILS와 D, app/_lib/serviceFeatureRegistry.ts를 읽는다. 정본을 수정하고 기존 생성 파이프라인을 사용한다. 표지 세로 에셋을 기존 가로 상품 포스터에 그대로 크롭해서 제목을 자르지 않는다.
- 마스터 연애의 실제 독서 UI는 route Client가 아니라 src/features/master-love-codex/components/CodexReader.tsx, CodexShell.tsx, styles/codex.module.css다. route가 전달하는 completed/sessionId와 부분 생성 재개 안내를 보존한다.
- 카르마는 app/karma-destiny-ai/result/_components/ResultStyles.tsx가 실제 스타일을 소유한다. html2canvas가 backdrop-filter를 지원하지 않는다는 기존 PDF 계약을 읽고 결과/PDF 모두 검사한다. 헤더의 전체 복사는 짧은 요약 공유와 다르다.
- 서양 점성술 결과는 RESULT_PANEL_CLASS와 실제 AstrologyChartWheel이 함께 쓰인다. 실제 천궁도를 중심으로 읽기 순서를 잡고 장식 이미지로 계산 차트를 대체하지 않는다.

위 두 구매 전 Client는 구현·mock 브라우저 검증을 완료했다. 상세 팝업과 다른 전문가 상담군은 소스 조사와 다음 구현 계획이며 아직 디자인 적용 또는 브라우저 검증 완료가 아니다.

## 생성 에셋과 출처

built-in image_gen 사용. 원본은 아래 Codex 생성 폴더에 보존했으며, 프로젝트에는 WebP 형식으로 저장했다. 외부 스톡·실제 상담사가 작성한 문서의 사진이 아니다.

- public/images/expert-consulting/life-book-cover-20260923.webp — 원본 exec-876b34b4-1c6b-4826-a94f-3418ac78c28b.png. 1086×1448, WebP quality 86.
- public/images/expert-consulting/love-letter-paper-20260923.webp — 원본 exec-865fa668-a453-4776-88cd-4487ab2d4de1.png. 1122×1402, WebP quality 86.
- 원본 폴더: C:\Users\user\.codex\generated_images\01a0c96a-30d9-7111-8a55-0c1750a7f2b2.

### 책 프롬프트

Create one production UI background asset, portrait 3:4. A straight-on, perfectly flat front view of a luxurious real clothbound hardback book, deep forest green fine linen, gently rounded corners, a narrow realistic bound spine at the left, subtle cream page edges along right and bottom, photographed in soft window light. Thin tasteful antique brass debossed border inset from the cover. An exquisite small hand-engraved botanical tree of life and subtle celestial chart motif occupies only the LOWER THIRD of the cover. The UPPER TWO THIRDS is quiet uninterrupted dark green fabric, reserved for Korean title text rendered separately in the app. High-end Korean literary publishing / collector's edition craftsmanship, tactile material detail, rich but restrained, realistic editorial product photography. Fill the full image with the book cover, minimal exterior margin, no oblique perspective, no table props, no text, no letters, no numbers, no logo, no badges, no UI. This is a texture/artwork to sit underneath actual interactive HTML book title and controls.

### 편지 프롬프트

Create one production UI artwork, portrait 4:5: a private love letter as beautiful tangible fine stationery, photographed straight down with zero perspective distortion. Large warm ivory cotton paper with subtly deckled edges, lying over a muted dusty mauve envelope on a quiet warm neutral writing surface. The sheet fills about 90% of the image. The central 75% and upper half of the paper are almost blank with only delicate paper grain and soft natural light, reserved for separately rendered Korean text in a web app. Along the bottom edge, tasteful small details: folded envelope flap peeking out, a real deep burgundy wax seal with an abstract botanical sprig imprint at bottom right, one narrow silk ribbon, a tiny pressed rose petal. The paper remains dominant; intimate, adult, sophisticated private correspondence, fine art editorial still life, expensive material realism. No hearts, no sparkles, no illustrated characters, no handwriting, no text, no letters, no numbers, no logos, no UI, no frames or fake controls.

## 검증 재개

로컬 Next는 mock API base로 실행한다. scripts/verify-book-card-sharing.mjs는 360/390/430/1280 light 및 390 dark에서 성공·legacy·실패·미저장 상태, 실제 PNG 생성·공개 링크·취소·터치 영역·넘침을 검사한다. 기존 styles/fonts-serif.css의 정확한 공개 서체 94개를 build-cache/premium-fonts/serif-kr 및 serif-latin에 읽기 전용으로 내려받아 캐시했다. 검사는 이 캐시만 읽으며 외부 API/유료 생성은 차단한다. 운영 R2의 CORS는 운영 출처를 허용하고 localhost는 허용하지 않으므로, 로컬 fixture 응답에만 CORS를 붙였다. 운영 설정은 바꾸지 않았다.

## 검증 결과와 한계

- mock 브라우저 기능 검사 35/35 통과. 이후 편지의 360px 봉인 겹침은 모바일 내부 여백만 조정하고 해당 화면을 다시 캡처했다.
- 독립 마감 검토: 종이 이미지 비율, 장별 편지 내지, 한글 서체·어두운 테마, 내비게이션과 스크롤 위치, 최종 360px 봉인 겹침 모두 해결 판정. 이번 두 결과 화면 범위의 disposition은 ship이다. 다른 전문가 상담 또는 전환율 검증을 뜻하지 않는다.
- check:fast 전체 실행은 종료 코드 0이었다. 다만 실행 도중 사용자의 새 시각 방향에 따른 수정이 이어졌으므로 최종 파일 집합의 단독 증거로 사용하지 않는다. 이후 변경 파일 lint(기존 경고만), typecheck, hero-contrast, mobile-detail-nonintrusive, sitemap-drift, handoff-contract, doc-freshness가 통과했다. 최종 코드 fc12eb6a5fd99a4931d93037ddd6e7ac8d0f1690의 main CI 35752264003에서 CI required success를 확인했다. 빌드·타입/린트·정적 가드가 성공했고 Critical checks는 변경 티어에 따라 skipped였다.
- 스크린샷·로그는 원본 main의 build-cache/premium-consultation-20260923/에 보존한다. 서체 캐시는 원본 main의 build-cache/premium-fonts/에 보존한다.
- 실결제·유료 LLM·운영 DB 쓰기·실제 카카오/단톡방 전송·운영 승격은 하지 않았다. 결과 카드의 소유자 이름 숨김/편집, 상세 팝업과 다른 상담 UI는 후속 범위다.

## 구매 전 소개·입력 확장 검증

- 코드 커밋: `981fadf0f3ce05ab6dfc1a767350826da6921d0b`. 결과 화면의 이전 CI 증거와 이번 입력 확장의 CI 증거를 혼동하지 않는다. 이번 main CI 확인은 전달 단계에서 별도 수행한다.
- `node scripts/verify-premium-consultation-entry.mjs`: 두 상품 × 360/390/430/1280px 한국어 light, 390px 한국어 dark, 390px 영어 light의 총 12/12 통과. API·외부 요청은 mock/차단이며 실제 유료 서비스로 폴백하지 않았다.
- 영어 SSR 초기값과 hydration 일치를 개선했고 console hydration 오류는 0이었다. 전역 뒤로가기 배경의 opacity를 바로잡아 대비를 확보했으며 책 입력 제목의 폭과 편지 폼의 넓은 열을 교정했다.
- 마지막 캡처는 `caret: 'initial'`로 Playwright의 캡처 중 DOM 변경을 피했다. 독립 finish 검토는 최종 수정 해결 후 이번 두 상품 구매 전·입력 범위의 disposition을 `ship`으로 판정했다. 실제 전환율이나 운영 배포 검증을 뜻하지 않는다.
- 증거 보존: `D:\Development\code-destiny\build-cache\premium-entry-20260923\premium-entry\`. 새 생성 에셋은 없으며 위 두 이미지의 원본·프롬프트를 그대로 재사용했다.
