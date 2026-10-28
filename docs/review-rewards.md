# 후기 보상 — 2026-10-25 사용자 승인 정책

- 작성 시점과 계정·상품별 참여 횟수 제한 없음. 별도 신청마다 관리자 승인이 필요하다.
- 승인 건당 30,000원 상당 월정석. `worker/lib/review-reward.js`의 금액과 기존 `billing-policy.js`의 환산을 사용한다(현재 3,000개).
- 제출은 pending. 기존 관리자 인증을 통과한 승인 경로만 지급한다. 같은 신청 재승인·재시도는 기존 lot ID로 중복 지급을 막는다.
- 과거 완료된 100개 지급을 소급 증액하지 않는다. 부분 실패 복구도 기존 lot 금액을 원장에 반영한다.
- 기존 구매·이용 자격 검증, 월정석 지급일부터 30일 만료, 대상 상품·이용권 구매 제외·현금 교환 불가 정책은 유지한다.
- 별점이나 긍정적인 내용은 보상 조건이 아니다. SNS 문구는 보상 참여 사실을 먼저 표시한다.

## 화면과 공유

`/reviews/?write=1`에서 후기 작성, 공유 문구 복사, 이미지 저장, SNS 이동, 게시글 주소 제출을 제공한다. `/reviews/`에서 최근 신청·지급 내역을 조회한다. `/admin/reviews/`에서 SNS 링크·보상 참여 표시를 확인하고 승인·반려·지급 재시도한다.

네이버 블로그와 네이버 공유창은 [공식 블로그 가이드](https://developers.naver.com/docs/share/share/) 및 [네이버 공유 가이드](https://developers.naver.com/docs/share/navershare/)를 사용한다. 스레드는 [공식 Web Intents](https://developers.facebook.com/documentation/threads/threads-web-intents)의 post composer를 연다. 인스타그램·다음 카페는 문구 복사, 이미지 저장 후 직접 게시한다. 기기 공유창은 지원 기기에서 제공하며 게시 성공을 자동 판정하지 않는다.

SNS 주소는 본인과 관리자 응답에만 포함하며 공개 후기 응답에는 포함하지 않는다. 서버에서 해당 주소를 가져오지 않는다. 공유에는 공개 홈페이지 주소만 넣는다.

## 기존 DB 적용 순서 — 개발 중 실행하지 않음

`reviews`에 기존 `user_product_unique_nonadmin` 인덱스가 있으면 반복 신청은 아직 제한된다. 코드 선언만 바꿔서는 제거되지 않는다.

1. 명시적인 운영 변경 승인 후, 대상 DB를 지정해 읽기 전용 확인:
   `node scripts/migrations/20261025-repeat-review-submissions.mjs --db=<대상DB>`
2. 같은 대상에 `--apply`를 붙이면 작성자 조회 인덱스를 만든 뒤 이름·정의가 확인된 기존 unique 인덱스 하나만 제거한다. 후기 문서나 고객 잔액은 수정하지 않는다.
3. 승인된 코드 배포 후 같은 상품의 별도 후기 제출, 관리자 승인, 잔액·원장 일치를 운영 절차에 따라 확인한다. 실제 지급 검증도 별도 승인 대상이다.

롤백 시 기존 후기를 삭제하거나 unique 인덱스를 무작정 재생성하지 않는다. 반복 작성 데이터가 생긴 뒤에는 중복 계정·상품이 정상 데이터이므로, 코드 롤백과 데이터 보존 방안을 별도로 검토한다.

## 이미지 출처

사용자가 확인한 필수 원본 `public/images/home/illustrated/yeoni-character-800.webp`와 영냥이 원본 `public/assets/yeongnyangi/original/hero-480.webp`를 참조해 built-in image_gen으로 신규 제작했다. 원본은 수정하지 않았다.

적용 자산: `public/images/reviews/yeoni-yeongnyangi-moonstone-gift-v2.webp`(960×640, alpha 보존). 얼굴·큰 연꽃·보라 스카프·몸 비율과 영냥이의 흰 털·남색 모자·의상을 유지하고, 후기 편지와 월정석 선물 상자를 함께 건네는 장면이다. 글자·가격은 이미지에 넣지 않는다. 승인 원본 확인 전에 생성한 후보는 사용하지 않는다.

SEO: 기존 `/reviews/` URL·메타·canonical·공개 후기·관리자 색인 정책을 유지한다. 새로운 공개 경로를 만들지 않는다. 금액은 서버 보상 정책 응답으로 표시한다.
