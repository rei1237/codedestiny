# 쿠팡 codedestiny 채널 전환 결과

- 운영 반영: 2026-10-23T18:47:34.677Z
- DB 재조회 검증: 2026-10-23T18:47:35.182Z
- 사용자 승인: 기존 32개 상품의 채널 링크 전환·운영 DB 반영·가격 빈값 유지. 발급 제한 상품 1개 비공개도 별도 승인.
- 결과: 31개 공식 codedestiny 링크 반영, dune-blue-lapis 1개 paused(비공개), 32개 price·priceVerifiedAt null.
- 기존 상품 ID·옵션 ID를 공식 간편 링크 화면에 입력했다. 매 발급마다 codedestiny 선택·입력 원문·발급 원문을 함께 기록했다. 제휴 링크 뒤에 임의 파라미터를 붙이지 않았다.
- dune-blue-lapis는 공식 포털이 법적 또는 판매자 요청에 따른 링크 생성 제한을 표시했다. 우회 발급하지 않고 기존 URL은 복구 기록용으로 보존한 채 공개를 중지했다.
- 변경 전 원본과 2026-10-16 스냅숏의 상품·옵션·사실 근거를 대조했다. 비도서의 비활성 book 기본값 3개(language/format/perspective) 외 차이 없음. 운영 원본의 기본값은 그대로 보존했다.
- 편집 시 cleanProduct로 검수를 해제한 뒤 계정·동일 상품 사실 근거·이미지 미사용·허용 분류를 재검수했다. 새 링크 검수는 상품 재고·상품 사실을 새로 확인했다는 의미가 아니므로 원래 verifiedAt·expiresAt을 보존했다. 30일 만료를 연장하지 않았다.
- 모든 상품명·추천 문구·이미지·순위·분류·재고 및 다른 상품 14개, 공개 설정 1개는 변경하지 않았다.
- 원본 전체 일치와 updatedAt 조건을 확인한 단일 MongoDB 트랜잭션으로 32개를 처리했다. 32개 수정 후 예상 문서와 정확히 일치함을 트랜잭션 안과 커밋 후 재조회에서 확인했다.
- 대상 컬렉션: code_destiny.recommendationproducts. 설정은 recommendationsettings 읽기 대조만 했다. DB 스키마·결제·인증·API 코드는 변경하지 않았다.
- 쿠팡 API·사이트 관리 API·실제 제휴 링크 클릭·유료 LLM·push·배포 없음. DB 연결은 기존 worker/lib/db.js의 connectDb 및 제한시간/majority 트랜잭션 설정을 재사용했다.
- SEO: 상품명·본문·공개 URL·canonical·robots·sitemap 구조 변경 없음. 제휴 목적지만 공식 채널 원문으로 바꾸고 발급 제한 상품의 노출을 중지했다.

## 검증과 보관

- 작업 스크립트 dry-run: PASS, 32건, 공식 링크 31건 고유, 제한 1건, 가격 빈값 32건.
- 운영 반영: matched/modified 32, 재조회 32 exact match, 다른 상품 14건과 설정 불변.
- 변경 전 원본: D:/codedestiny-qa/coupang-ctr-20261023/channel-20261024/before.ejson
- 변경 후 원본: D:/codedestiny-qa/coupang-ctr-20261023/channel-20261024/after.ejson
- 원본 SHA-256: c7eb9cdb44ed51470fe6cfdbe48e290aaf83efcd4ab647dc9a302eea55a5be48
- 상품별 이전/신규 URL과 상태: affiliate-codedestiny-channel-20261024.json (같은 문서 폴더).
- 발급별 DOM 근거: D:/codedestiny-qa/coupang-ctr-20261023/channel-20261024/channel-issued.json. 제한 화면: coupang-restricted-product.png. 마지막 발급 화면: coupang-32-channel-proof.png.
- 실제 클릭·주문·수익 귀속, 현재 재고는 이번에 확인하지 않았다. 이미지 입력은 기존 수동 시트 작업으로 남는다.

## 복구

복구가 필요하면 새 main 안전 워크트리에서 기존 연결 도우미로 before.ejson과 after.ejson을 읽는다. 각 대상의 현재 문서가 after.ejson과 정확히 같은지 확인하고, 이번에 변경한 affiliateUrl/linkSource/evidence 또는 status/evidence만 이전 값으로 되돌린다. updatedAt 조건과 단일 트랜잭션을 사용한다. 이후 변경이 있으면 자동 덮어쓰지 않는다. 복구 작업은 실행하지 않았다.

검증 완료: npm run check:fast -- --plan은 문서 4개만 분류했고, npm run check:fast는 종료 코드 0으로 공백·문서 최신성 검사를 통과했다. 런타임 코드 변경이 없어 기존 전체 스위트는 반복하지 않았다.
