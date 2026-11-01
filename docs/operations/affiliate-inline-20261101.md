# 사이트 내 제휴 광고 적용 — 2026-11-01

status: done

## 최종 구현
- 별도 서가·카테고리 페이지와 RecommendationBrowse, 전용 필터·복귀 저장·더 보기 링크를 제거했다. 기존 주소는 대표 홈301, /api/recommendations와 /admin/recommendations는 유지한다.
- 대표 홈과 꿀꿀운세 홈의 푸터 위, 완료된 결과의 저장·공유 영역 뒤에 검수한 상품 사진을 최대4개 표시한다. 관련 상품이 없거나 이미지 로딩에 실패하면 해당 카드·빈 영역을 숨긴다. 입력·생성·결제·정책·관리자·블로그에는 새 광고를 추가하지 않는다. 관리자 미리보기는 별도 검수 UI다.
- 승인된 달빛 예화 시안: 모바일·데스크톱2×2, 사진72×88/96×112px, 명조 제목·본문 서체·밤·아이보리·골드. 실제 상품명·짧은 추천 이유·판매처 버튼·제휴 고지를 정돈했다. 원본 상품 가격·링크·속성 데이터는 보존했다.
- 적격·이미지·검수·판매 상태·만료·관련성·판매처 공개 필터를 먼저 적용한 뒤 익명 일회성 seed로 무작위 선택한다. 새 방문·다른 상품 보기에서 새 선택, 같은 화면60초 공개설정 갱신에는 기존 선택 유지. seed는 개인 정보와 연결·저장·통계 전송하지 않는다. 기존 API 응답과 result/browse/footer 지표 호환 유지.
- 공용 하단 홈 아이콘을 연꽃으로 교체했다. 메뉴5개의 이름·순서·경로 유지. 대표 /는 기존 AppChrome 규칙대로 공용 메뉴가 없는 상태를 유지한다. /ggulggul/와 React /app/ 공용 메뉴의 실제 연꽃 표시를 확인했다.

## 이미지 등록과 미완료 항목
- 공식 쿠팡 상품·옵션과 이미지 사용 근거를 확인하여9개 이미지를 등록했다(관리자 저장·재검수1개, 전후 대조를 거친 이미지 필드만 원자적 보완8개). 나머지 가격·링크·사실 검수일·만료일 보존.
- 활성 쿠팡31개 중 공식 사진 보유25개. 알리 공개OFF, 기존 상품·실적 보존. 이번 UI 개선은 기존212px 공식 사진을 작게 표시하며 임의·AI 상품 사진을 추가하지 않았다.
- 공식 옵션 사진 미확보6개는 자동 노출 제외: dotline-amethyst-ch06, sunjin-moon-lamp, tamsa-focus-timer, tamsa-weekly-planner, warmon-steam-fireplace, zz-plant-large-120.

## 해결한 배포 차단
- 운영의 무버전 추천 CSS가 immutable 캐시에서 오래된 내용을 반환했다. 기존 생성기의 내용 해시 URL에 추천 CSS·공용 메뉴SVG·서체 로더를 연결했다. 운영의 추천 CSS build-18b9d8ddaaa5와 연꽃SVG build-bac850b915a2 실제 로딩 확인.
- 지연 import·URLSearchParams를 기존 VM mock이 지원하도록 테스트만 동기화했다. 실제 상담·결제 런타임 변경 없음.
- 기존 공용 유료 런타임 주소는 공식 restamp-paid-runtime-pins 생성기로 동기화했다. billing-client는 해당 로더 상수만 보완했고 공식 payment-freeze 절차로 해시를 갱신했다. 가격·차감·인증 정책 변경 없음.
- 마지막 CSS 수정 뒤 달라진 사이트맵 소스 지문은 기존 sitemap:generate로 갱신했다. 후속 전달 검사와 최종 CI 통과.

## 검사
- 관련 Node6파일55 passed, Worker mock API23 passed. 변경 파일 ESLint 오류0. payment-choice-parity·payment-freeze·mobile-bottom-nav-sync·js-module-graph 통과.
- check:pre-push 최종 전체 통과: 서비스 레지스트리63, public mirror fresh, sitemap1037, llms, SEO entity registry63.
- 최초 넓은 check:fast는90개 자동 승격 실행을 시도했으나 로컬 실행 정체로 중단했으며 통과로 보고하지 않는다. 공식 CI가 최종 판정이다.
- 광고 본체29a41c917 CI는 critical·type/lint·build 통과, static guard의 사이트맵 원장 실패는da6c26bc4에서 보완했다.
- 최종 서비스 커밋 bf38cbed59e4fa04ca083e6c0bb79f21b9a69f24의 필수 CI 성공: https://github.com/rei1237/codedestiny/actions/runs/41302211143 (선언된 실행 lane 모두 성공, critical lane은 해당 후속 범위에서skip).

## 공식 운영 반영과 실제 검수
- 승인된 production 배포를1회 요청, 성공: https://github.com/rei1237/codedestiny/actions/runs/41304026511
- Pages /version.json과 Worker /api/version 모두 bf38cbed59e4fa04ca083e6c0bb79f21b9a69f24.
- 실제 /와/ggulggul/ ×360·390·430·1280px8뷰: 사진4개·2열·72/96px·원본212px·실제Myeongjo fontface 로딩·제목25/31px·제휴고지·CTA44px hit-test·가로 넘침0·중복0·Ali0·JSerror0.
- 같은 seed의 선택 안정성, 서로 다른 seed의4개 고유 선택, 결과API 관련성, 서가301 6주소, 셔플2경로·이미지 실패숨김2경로 확인. 독립 운영 시각 검수SHIP, 공용 React 연꽃도 별도 확인.
- 결과의 실제 유료 상담 생성·실결제·실폰 검사는 하지 않았다. 결과 연결은 mock과 실제 공개 추천API로 검증했다. 구매율·수익 상승 증거로 확대하지 않는다.
- 결제 가격·이용권·월정석·단건결제·인증·운세 계산·상담 생성·결과 저장·DB 스키마 유지.

검증 근거·사진 등록 전후 자료: outputs/affiliate-inline-20261101. 최종 운영 캡처·CI/배포 영수증·시각 검수·변경파일·정리 결과: outputs/affiliate-moonlight-implementation-20261101.
