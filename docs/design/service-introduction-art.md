# 운세 기능 소개 장면

기능별 소개 원화 103개와 320·640·960·1536px WebP 412개를 사용한다. 전체 장면의 비율은 3:2이며 크기별 변환은 원화 구도를 보존한다. 이미지에는 가격·버튼·설명 문구를 넣지 않고 기존 HTML 문구를 유지한다.

## 정본

- `service-introduction-art.json`: 기능 ID, 담당 마스터, 실제 기능 근거, 장면, 생성 프롬프트, 캐릭터 참조, 원화 파일명, 이전 수정 이력, 저장 경로.
- `service-introduction-review.json`: 현재 원화와 320px 이미지의 캐릭터·기능·도구·손·문자 혼입 검수.
- `service-introduction-connections.json`: 레지스트리, DOM/접힌 컬렉션, 상세 및 상품 커버의 실제 연결 경로.
- `service-introduction-ui-review.json`: 브라우저 캡처 검수와 관찰 사항.
- `../../lib/marketing/service-introduction-art.json`: 앱과 정적 셸 생성기가 사용하는 이미지/대체텍스트 매핑.

`source`는 내장 image_gen이 반환한 PNG 파일명이다. 이 작업의 원화는 `C:/Users/user/.codex/generated_images/01a158d5-bbd7-7fb1-9132-e632b2b5d7aa/`에 보존되어 있다. 서비스는 이 로컬 경로에 의존하지 않으며 커밋된 WebP를 사용한다. 수정된 원화는 `editReference` 및 `previousAttempts`로 추적한다.

## 화면 반영

검색은 기능 전용 이미지 → 카드 이미지 → 체계별 이미지 → 명시된 마스터 초상 순으로 선택한다. 담당자가 확인되지 않은 기능에 임의의 마스터를 배정하지 않는다. 손금은 인간 연이와 펼친 손바닥을 함께 보여준다. 자미두수는 무성/사각 열두 궁, 숙요점은 서한비/두 달의 거리, 서양 점성술과 베다점은 윤달/각 체계의 서로 다른 도구로 구별한다.

찻집은 연이의 사주·사주 궁합·타로·숙요점과 연이/네오 공동 상담을 별도 장면으로 구별한다. 네오 전략실의 사주·베다·자미두수·서양 점성술 선택에도 각각 네오가 해당 도구를 다루는 장면을 사용한다. 영냥이 기본·융합 상담도 각각 별도 장면을 사용한다.

마스터 프로필 원본, 장식용 캐릭터 스프라이트, 실제 타로 카드 원화, 계산 결과 차트와 결과 리포트 내부 삽화는 보존한다. 소개 커버의 원래 제목·설명은 이미지 아래의 선택 가능한 HTML 텍스트로 유지한다.

가격·이용권·월정석·단건 결제·인증·API·DB·운세 계산·라우팅은 변경하지 않는다. 운영 배포는 이 작업 범위가 아니다.

## 생성과 검증

```powershell
node scripts/design/build-service-art-inventory.mjs
# 내장 image_gen으로 각 행의 prompt/references를 사용한 뒤:
node scripts/design/save-service-introduction-art.mjs <기능ID> <생성PNG절대경로>
node scripts/design/apply-service-introduction-art.mjs
npm run sync:public
node scripts/design/verify-service-introduction-art.mjs --record-connections
npm run verify:home-service-registry
npm run check:fast -- --plan
npm run check:fast
# 커밋된 트리에서:
npm run check:pre-push
```

동시 생성한 결과도 저장 명령은 순서대로 실행한다. 하나의 ledger를 공유하기 때문이다. `verify-service-introduction-art`는 103개 연결, 412개 WebP의 크기와 형식, 현재 원화의 검수 통과 여부, 생성 미러 커버 일치와 HTML 텍스트 보존을 검사한다.

브라우저 검사는 `verify-service-introduction-browser.mjs`와 `verify-service-art-consultation-entries.mjs`를 사용한다. 로컬 서버의 360·390·1440px 화면만 검사하며 외부 네트워크와 실 API 호출을 차단한다. 폰트는 로컬 대체 폰트를 사용한다. 결과 생성·결제·개인정보 입력을 수행하지 않는다.
