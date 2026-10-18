# 숙요점 기본 해석의 서한비 안내

2026-10-18 사용자 승인: 기본 숙요점의 무료 해석·소액 상세·기본 AI 상담을 기존 마스터 서한비가 안내한다. 계산·상품·가격·이용권 정책은 그대로 유지한다. 나머지 기본 점술의 마스터 배정은 후속 작업이다.

## 캐릭터와 자산

- 정체성 정본: `components/fortune/master-profiles.ts`의 hanbi, `worker/lib/expert-character-persona-text.js`의 HANBI_PERSONA_KO.
- 기존 초상: `/images/master-profiles/hanbi-sukuyo-portrait.webp`. 첨부된 초융합 마스터 소개와 동일 인물이다.
- 신규 일러스트: `/images/master-profiles/hanbi-sukuyo-reading.webp`, 1200×800 WebP. 내장 imagegen으로 아래 프롬프트와 기존 초상을 참조해 생성한 뒤 sharp로 크기와 포맷만 변환했다. 새 외부 생성 API는 사용하지 않았다.
- 달은 장식적 상징이며 출생 당시 위상 자료가 아니다. 본명숙 카드의 이미지는 장식 처리하고 기존 위상 계산과 설명은 유지한다.
- 텍스트는 이미지에 넣지 않는다. 제목·개인 해석·서한비 안내는 실제 HTML로 표시한다.

## 생성 프롬프트

Create a new landscape illustration for Code Destiny's free Sukuyo reading screen featuring exactly the same adult Korean female master Seo Hanbi in the reference: long flowing black hair, dark rain-indigo high-neck embroidered coat dress with antique gold patterns, silver drop earrings, calm precise kind expression. Premium intricate Korean fantasy manhwa painting matching reference identity. Waist-up composition on the right half, she gently opens her moon-embossed ledger toward the viewer as if explaining their lunar mansion. Left half features a large finely textured luminous ivory moon reflected in tranquil dark blue water and thin antique-gold orbital motifs; background a quiet rain-washed observatory terrace, restrained warm lanterns, elegant ink-blue and champagne gold. Balanced subdued atmospheric lighting, face clearly legible on mobile, gorgeous polished editorial art. Wide 3:2 landscape composition. No text, no lettering, no UI, no logos, no additional people, no speech bubbles. Moon is decorative symbolism, not an astronomical chart.

## 후속 요청: 다른 기본 점술의 마스터 배정

이번 변경에는 사주·자미두수·점성술·베다점의 배정을 포함하지 않는다. 후속 구현에서 기존 마스터 정본을 확인하고 사주 네오, 자미두수 무성, 점성술 윤달의 기존 역할을 출발점으로 삼는다. 베다점은 현재 서비스의 역할 설정을 확인한 뒤 배정을 확정한다. 무료 결과·소액 해석·기본 AI 상담의 안내와 말투를 같은 마스터로 일관되게 연결하되, 각 점술의 계산 체계·프롬프트 데이터·가격은 섞거나 변경하지 않는다.

## 궁합 복구 구현과 mock 검증

최신 정본의 실제 ‘인연의 끈 궁합’은 `/api/saju/section`에서 결제 증빙과 두 사람의 계산 결과를 확인한 뒤 본문을 반환한다. 브라우저가 유료 본문을 독자적으로 계산한다는 과거 설명은 현재 구조에 적용하지 않는다.

- 중첩된 이용권 응답의 `accessMethod` 누락, 복원된 requestId가 새 후보 ID로 바뀌는 경로, 모바일 복귀가 결과 완료 전에 성공을 반환하는 경로를 수정했다.
- 결제 전에 입력을 확정하고 원래 요청으로 재시도한다. 결과 요청 중에는 결제 게이트를 다시 열지 않는다. 계정·프로필이 바뀌면 늦은 응답을 표시하거나 저장하지 않는다.
- 결과 표시와 아카이브 저장은 분리한다. 저장 재시도는 같은 증빙을 유지하며, 동일 결제에 다른 상대 입력으로 저장하면 409로 거부하고 최초 원본을 보존한다.
- 사용자 실제 거래를 조회하지 않았으므로 위 재현을 특정 사용자 거래의 확정 원인으로 단정하지 않는다.

검증 명령과 확인 범위:

```powershell
node --test __tests__/ui/sukuyo-legacy-delivery.behavior.test.js
npm run test:jest -- --runInBand __tests__/worker/sukuyo-result-archive.test.js __tests__/worker/saju-section.test.js
npm run test:jest -- --runInBand __tests__/worker/sukuyo-ai-prompt-domain-templates.test.js
node --require ./scripts/lib/mock-network-guard.cjs scripts/verify-sukuyo-legacy-delivery-browser.mjs
npm run sync:public
npm run check:pre-push
```

행동 테스트 6개, 서버 테스트 430개, 서한비 프롬프트 테스트 6개 통과. Chromium mock 검증에서 360·390·430·1280px 본문 겹침/가로 넘침 없음, 게이트 1회, 실패 후 동일 원본 requestId로 결과 요청 5회, 저장 실패 후 동일 requestId로 저장 요청 2회를 확인했다. 실제 이용권 차감, 실제 PG 복귀, 유료 모델의 실제 답변 품질은 이 mock 검증에 포함하지 않는다. 가격·한도·월정석·단건 정책·인증 구조·DB 스키마는 변경하지 않았다.

운영 승격은 공식 Release Cloudflare Pages and Worker의 production 모드와 필수 CI를 따른다. 회귀 시 이번 수정 커밋만 revert하고, 운영 장애 시 공식 rollback 모드로 배포 전 Pages·Worker 버전을 복원한 뒤 두 버전 엔드포인트를 확인한다.
