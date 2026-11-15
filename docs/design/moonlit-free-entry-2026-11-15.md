# 달빛 예화 무료 운세 진입 · 대표 상담 복구

## 확인된 원인

- 무료 캠페인의 주요 CTA는 `#cdQuickServices`로 이동했고, 여러 기능은 실제 실행 대신 설명 랜딩으로 연결됐다. 타로 공통 진입 함수도 카드 뽑기 대신 타로 컬렉션을 열었다.
- 새 프로필 저장의 낙관적 `destinyProfileChanged` 이벤트가 선택한 기능을 저장 성공 전에 소비했다. 인증 실패 후 복귀 주소는 `/login?next=%2F`로 고정돼 있었다. 출생시간 폼 초기화는 숨긴 select만 지워 표시 시간과 실제 값이 달랐다. 로컬 브라우저에서 입력·저장·로그인 흐름으로 재현했다.
- 대표 상담은 `setupSignatureLetter`가 본문에 붙이는 `<details>` 편지였다. `94236d6c3`의 inline 편지 구현 이력을 확인했다. 팝업이 배경에 가려진 것이 아니라 모달 자체가 없었고, 유효한 숨김 날짜면 생성 전에 반환했으며 수동 재열기 버튼도 없었다.
- 흑월 `/heukwol/`과 `heukwol-warning-consultation` 상품은 존재했지만 홈 서비스/대표 상담 데이터에 빠져 있었다. 추가 후 브라우저 검수에서 공용 `data-pvw-paid` 미리보기가 자체 상세 페이지 이동을 가로채는 것도 확인해 흑월 진입점의 해당 마커를 제거했다. 실제 결제는 기존 흑월 페이지에서 처리한다.
- 흑월 분석은 기존 `calculateZiweiConsumerChart`와 네오 `buildNeoBasisPayload`/`sliceNeoBasisPayload`를 이미 사용했다. 그러나 원시 `{byPalace, core}`를 근거 구성기가 기대하는 `{lifePalace, core}`로 변환하지 않아 명궁 삼방사정 근거가 누락됐다. 네오 경로와 같은 어댑터를 적용했다.

## 구현

- 캠페인 정본 `lib/marketing/free-promo.mjs`: 기존 22개 유지, 대표 6개, 직접 실행 함수와 결과 섹션을 명시. 종료일은 기존 `2027-02-12T23:59:59+09:00` 유지. 날짜와 D-day는 한국 시간 기준으로 계산한다. 행사 표시는 접근 권한·가격 판정에 사용하지 않는다.
- React `FreePromoBanner`와 정적 `free-promo-shell`에 이미지 중심 카드 적용. 아이보리·남보라·얇은 골드 선, 기존 한글 제목 서체, 본문 15~16px, 44px 이상 주요 동작, reduced-motion 지원.
- `home-consultation-picker`와 서비스 레지스트리에서 흑월을 메인 고정 카드로 노출. 팝업은 같은 카드 데이터의 제목·설명·이미지·가격·주소를 사용하며 흑월이 첫 항목이다.
- `home-funnel.js`: native dialog, PC 중앙/모바일 85dvh 바텀시트, 세션당 자동 1회, 홈의 상시 수동 열기, 다른 모달·입력·결제 복귀와 중복 방지. Escape·초기 포커스·복귀·이동 후 잠금 해제 지원.
- `오늘 하루 보지 않기`: 기존 `cd_signature_consult_hide_until_v1`의 유효값 존중, 새 값은 다음 한국 시간 자정. 세션 키는 `cd_signature_consult_seen_v2`, 이전 세션 닫기 키만 한정 이관. 저장소 차단 시 메모리 폴백; 수동 열기는 자동 제한과 무관하다. 전체 저장소 삭제 없음.
- `destiny-profile.js`: 선택 기능·사주 하위 섹션 유지, 저장 성공 시 이어 열기, 허용된 기능만 로그인 next에 포함. 기존 저장·동의·인증 검증을 사용한다.
- 개발 mock 서버에 기존 프로필 UI 계약과 흑월 가격 fixture 추가. 메모리만 사용하며 미구현 경로는 501, 결제 대역은 402, 운영 연동 폴백 없음.

## 실제 연결

| 진입점 | 기존 기능 |
| --- | --- |
| 무료 기본 사주 | `/ggulggul/?action=cdOneStepFreeSajuEntry` |
| 명식·12신살 | 위 주소 + `section=sajuCard`, 결과의 해당 명식에 포커스 |
| 타로 | `cdHomeTarotEntry` → 기존 무료 카드 뽑기 |
| 자미두수 | `cdHomeZiweiEntry` → 기존 12궁 명반 모달 |
| 숙요점 | `cdHomeSukuyoEntry` → 기존 숙요점 결과 모달 |
| 베다점 | `cdHomeVedicEntry` → `/vedic-astrology.html?lang=ko` 기존 입력 |
| 오늘의 운세 | `/today/` |
| 흑월 메인·팝업 | `/heukwol/`, 상품 `heukwol-warning-consultation` |

나머지 22개 전체 목록의 주소/액션/결과 섹션은 캠페인 정본과 회귀 테스트로 대조했다. 모두를 브라우저에서 개별 완주한 것은 아니다.

## 이미지 출처와 적용

공식 참조: `docs/design/character-references/yeoni-profile-v1.png`. 내장 imagegen으로 기존 얼굴·연분홍 몸·분홍 연꽃·보라 스카프 비율을 참조했다. 제작 방향은 달빛 정원의 운세책을 펼친 연이, 크림색 종이·연분홍 꽃·절제된 금빛 장식이다. 흑월은 어두운 달·금빛 별자리·운세책으로 제작했다. 이미지 안의 글자·날짜·가격·버튼은 없고 모두 HTML이다. 영냥이 캐릭터를 교체하지 않았다.

- `public/images/home/free-garden-yeoni-v1-{480,960}.webp`
- `public/images/service-introductions/heukwol-{320,640}.webp`, `heukwol.webp`
- 대표 6개는 기존 기능별 WebP 삽화 재사용. 명시적 크기, 정적 셸의 반응형 source, 아래쪽 lazy loading 적용.

## 실제 검증

- 로컬 mock 브라우저 360/390/768/1280px: 가로 넘침 없음, 무료 삽화 모두 로드, 연이 얼굴·책 크롭 및 텍스트·CTA 확인. 모바일 팝업의 단어 중간 줄바꿈과 기본 dialog 최대 폭을 수정 후 재검수.
- 대표 6개 첫 클릭: 명식 결과의 명식 섹션 포커스, 타로 뽑기, 자미두수 명반, 숙요점 결과, 베다 입력, 오늘 운세 페이지 확인. `/` React 배너의 주 CTA도 직접 사주로 이동.
- 가상 계정으로 로그인 전 자미두수 선택 → 로그인 next 보존 → 프로필 저장 → 실제 자미두수 명반 표시 확인. URL 새로고침 후 같은 명반 복원 확인.
- 신규 자동 팝업, 당일 숨김 후 일반 홈 재방문 비노출, 수동 재열기, Escape와 포커스 복귀, 흑월 이동 후 dialog/스크롤 잠금 없음 확인. KST 자정 경계·다른 모달·저장소 차단은 자동 테스트로 확인.
- 흑월 메인/팝업 → 실제 상세/입력 이동, 기존 가격 정본의 50,000원, 저장 프로필 선택 UI 확인. 결제 실행은 하지 않았다.
- UI 회귀 27개 통과. 최종 팝업/흑월 연결 재검사 10개 통과. mock 서버 4개 통과.
- 흑월 Jest 2개 suite, 33개 통과: 기존 네오 근거와의 일치, 실제 LLM 요청에 전달되는 사주/자미두수 근거를 mock으로 캡처, 챕터 저장·재개·소유권·결제 증빙 회귀 확인.
- `npm run check:fast`: 결제 회귀 가드 77/77, 변경 lint 및 전체 lint 통과. sitemap drift에서 중단되어 정본 재생성 후 해당 검사 통과. `npm run typecheck`는 기존 무시된 `outputs/` 백업 TSX의 상대 import 오류로 실패. 해당 백업만 제외한 임시 tsconfig의 전체 서비스 소스 검사는 통과했다. 백업 파일을 지우거나 검사를 통과했다고 표시하지 않는다.

캡처 원본: `D:/moonlit-review-20261115/` (`garden-360.jpg`, `garden-390.jpg`, `garden-768.jpg`, `home-1280.jpg`, `popup-360.jpg`, `popup-1280.jpg`, `heukwol-home-390.jpg`, `heukwol-home-1280.jpg`, `ziwei-after-login-390.jpg`, `heukwol-input-360.jpg`, `root-garden-360.jpg`). 저장소에는 캡처를 추가하지 않는다.

## 유지한 경계와 미검증

가격·이용권·월정석·단건 결제·무료 대상 정책, 운영 DB 스키마, 사주/자미두수 계산 알고리즘 및 결과 보관 정책은 유지했다. `billing-client.ts`는 변경된 공용 프로필 스크립트의 캐시 URL만 갱신했으며 동결 manifest도 같은 변경을 기록한다. 인증 방식은 그대로이고 로그인 복귀 목적지만 보존한다. 공개 경로·canonical·robots 정책 변경 없음; 설명 랜딩은 삭제하지 않았고 사이트맵은 기존 생성기로 갱신한다.

실제 유료 LLM의 생성 문장 품질, 실제 결제·운영 DB·프로덕션 승격은 수행하지 않았다. 흑월의 이번 검증은 기존 계산 결과가 LLM에 전달되는 계약과 mock 결과 저장 흐름에 한정된다.
