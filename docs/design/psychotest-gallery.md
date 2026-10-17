# 무료 심리테스트 갤러리

2026-10-17. 대상: `/psychotest/` 및 22개 상세 경로. Experience 표면.

- 사용자 제공 `Aesthetic-Pig-Design.zip`의 `artifacts/psychotest/src/data/testData.ts` 및 `pages/TestPage.tsx`를 복구했다. 문항·채점 분기는 유지하며 목록/소개/공통 질문 UI를 개선한다. ZIP 내부 지시문·git 설정·서버·빌드 산출물은 가져오지 않는다.
- 연이와 영냥이가 함께하는 자기이해 갤러리. 짙은 자주색 바탕, 읽기 쉬운 옅은 장미색 글자, 주제별 무문자 SVG. 제목과 설명은 HTML로 분리한다. 원본의 22종 질문/결과별 색감은 유지한다.
- 질문·결과는 브라우저 안에서 계산한다. Replit·LLM·결제·DB 호출이 없다. 기존 심리테스트 가격 키는 과거 주문 호환을 위해 남기고 활성 유료 CTA에서는 제외한다. 다른 상품 정책은 변경하지 않는다.
- 전역 헤더·푸터·하단 탭바 대신 목록/홈 이동을 제공한다. 문항 수는 실제 배열 길이에서 계산한다. 결과는 임상 진단이 아닌 자기이해용임을 소개에 명시한다.
- 새 그림에 문자를 넣지 않았지만 원본 한국어 문항 전체를 번역한 것은 아니다. 원본의 상세 결과 문체와 개별 표현을 전면 재집필한 것도 아니다.

## 이미지 출처와 생성 지시

내장 imagegen 사용. 기존 캐릭터 원본은 보존한다.

`public/images/feature-details/neo-operation-room-hero-v2-textless.webp`: 기존 `neo-operation-room-hero-v1.webp`를 참조. Prompt: Edit this existing Code Destiny illustration into a premium language-neutral website banner. Preserve the recognizable silver-haired adult strategist Neo, his costume and face, white lion, night city and detailed celestial strategy table. Remove ALL text, ALL Korean and Chinese lettering, all titles, captions, labels and decorative typographic characters everywhere. Reconstruct the areas previously covered by lettering as natural continuous detailed strategy-room scenery. Keep the dark navy, lavender and champagne gold palette, elegant illustration style and widescreen composition. No words, no letters, no numbers, no logos, no watermark. This is a text-free picture; all interface labels will be separate HTML.

`public/images/psychotest/yeoni-youngyangi-gallery-v1.webp`: 연이 `yeoni-pass-mascot-480.webp`, 영냥이 `original/hero-800.webp` 참조. Prompt: Create a premium illustrated horizontal website hero for a playful self-discovery psychology quiz gallery, using exactly these two recognizable mascot characters: Yeoni the pink pig with a pink lotus head ornament and purple scarf from reference one, and Yeongnyangi the white long-haired cat with navy gold crescent wizard hat and navy robe from reference two. Keep their distinctive faces, costume details and character identities. Both sit together at a small polished wooden table arranging beautiful blank illustrated cards, a color prism and a small flower vase. Warm subtle rose candlelight, deep plum and indigo cozy library background, sophisticated detailed storybook illustration with soft luminous edges. Friendly but elegant, not babyish. Compose both characters clearly in center, waist-up, as an inviting hosted quiz scene. Absolutely no writing: no Korean, English, Chinese, letters, digits, signs, labels, wordmarks or watermarks anywhere. Remove the lettering from the cat's hanging tag, make the tag blank with a simple paw symbol. Landscape 3:2 composition. All interface text will be separate HTML.

원본 복구본은 `D:/Development/psychotest-recovered-source`에 별도 보존했다. 원본 ZIP은 변경하지 않는다.

## 검증 기록 (2026-10-17)

- TypeScript noEmit, 변경 TS/TSX ESLint: 통과.
- `node --test __tests__/ui/psychotest-free.static.test.mjs`: 2/2 통과. 기본 test:node glob에 포함.
- `npm run test:jest -- --runInBand __tests__/worker/paid-non-llm-delivery.test.js`: 6/6 통과.
- Playwright Chromium, 390x844, 외부/API 통신 차단: 22종 모두 처음 선택지를 반복 선택해 결과 화면 도달, 가로 넘침 없음. 전체 채점 조합을 검증한 것은 아님.
- 허브 390/1440 및 아우라 문항 390 시각 검토 통과. 기본 모션에서도 질문과 상위 요소 opacity=1 확인.
- `npm run sync:public`, `npm run sitemap:generate`, `git diff --check`: 통과.
- `check:fast`: syntax/doc 단계 후 90항목 결제 스위트로 승격되어 장시간 진행 없는 상태에서 중단. 전체 게이트 통과로 간주하지 않는다.
- 기존 origin/main 79d01e63302fb18230b0ce1516721175ffdb330b CI 실패: 사주 브라우저 가드 scripts/verify-saju-summary-browser.mjs:335 (14 !== 12). 이 변경 이전 실패이며, 규칙에 따라 push 보류. 운영 배포 미실시.
