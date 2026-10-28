# 2026-10-18 공개 URL 전수 기술 검수

이 기록은 **변경 배포 전 운영 HTML** 관측이다. 검색엔진 색인·검색순위·유입 개선이나 원고 전체의 사람 검수를 뜻하지 않는다.

## 관측 범위와 결과

- 최초 관측: 2026-10-18 02:05:32~02:07:13 KST. 최종 확장 관측: **02:24:03~02:25:01 KST**. JSON의 `startedAt`~`finishedAt`과 행별 `observedAt`은 최종 관측 시각이다. 직전 관측 시각은 `previousObservedAt`, 직전 범위·해시는 `previousCapture`로 구분한다. 현재 HTML 필드·링크를 과거 시각에 수집한 것으로 표시하지 않는다.
- 사이트맵 작업 기준 리비전: `f11871f4cf9e344ad5c9484e81cc32351b5ebc3c`. 재관측 시 읽은 작업 트리 사이트맵은 승인 통합 5건을 제거한 1,022 URL이며, 미커밋 변경을 포함한다. 실제 XML 내용 해시는 JSON에 따로 기록했다.
- 요청: 비로그인 공개 HTML GET, 동시성 10, API·결제 실행·LLM·폼 제출·검색엔진 제출 없음. URL 쿼리와 fragment는 요청·저장 전에 제거했다.
- 요청 환경: `CodeDestinyPublicSeoAudit/1.0`, `Accept-Language: ko-KR`. 최초 응답의 Cloudflare edge는 LAX였고 확장 재관측의 edge는 각 행 `edgeColo`에 기록했다. 방문자/요청자 지역은 미확인이며 네이버 Yeti나 Googlebot 방문으로 간주하지 않는다.
- 최초 사이트맵 1,027 URL, 확장 재관측 사이트맵 1,022 URL에서 실제 HTML 내부 링크·hreflang를 따라 총 1,741 URL을 기록했다. 1,727개를 요청했고 모두 최종 HTTP 200이었다. 보호 경로 10개와 자산 4개는 요청하지 않았다. 대기 URL 0개로 해당 공개 HTML 경계의 순회를 마쳤다. 운영 HTML에는 아직 통합 전 링크가 있으므로 새 사이트맵에서 빠진 URL도 다시 발견됐다.
- 기존 `noindex` 675개는 유지 대상으로 분리했다. 주요 묶음은 날짜별 보관 361, 인사이트 150, 기능 소개 75, 심리테스트 22였다. noindex가 없다는 사실만으로 실제 색인을 확정하지 않는다.
- 모든 행의 검색엔진 색인 상태·유입·백링크는 **미확인**이다. HTML 내부 링크 수는 외부 백링크 수가 아니다.

근거: [행별 JSON](seo-url-inventory-2026-10-18.json), [검수 CSV](seo-url-inventory-2026-10-18.csv). JSON에는 응답 시각, 상태, 리디렉션 단계, canonical/robots, 부모의 숨김 상태를 반영한 H1, html lang, 이미지 alt·크기 속성 누락, hreflang와 역링크, 본문 길이·해시, 실제 내부 링크, 발견 출처를 저장했다. CSV는 유지·개선·통합 판정과 남은 확인을 정리한다.

JSON은 모든 URL·링크를 보존하면서 반복 문자열만 줄인 `columnar-v1` 형식이다. `columns`와 `records`가 행을, `urlDictionary`가 링크 ID를 설명한다. `scripts/seo-public-inventory.mjs`의 `unpackReport()`로 일반 `rows` 객체 배열을 복원할 수 있다. 빈 alt는 장식 이미지에 유효하므로 alt 속성 누락과 따로 센다. width/height 속성 누락은 CSS로 공간이 확보됐을 수 있으므로 실제 레이아웃 이동으로 단정하지 않는다.

## 본문 비교와 판정

| 묶음 | 실제 근거 | 판정 |
|---|---|---|
| `/kkul-kkul-unse/` | 별도 브랜드 이용 안내, 200/self-canonical | 승인대로 유용한 FAQ를 메인에 이전한 뒤 `/`로 301 |
| `/saju/basic/`, `/oracle/sukuyo/`, `/vedic/jyotish/`, `/astrology/cosmic/` | 안내 페이지에서 각각 기존 사주·숙요·베다·점성술 앱 기능으로 연결 | 승인대로 해당 핵심 허브에 고유 안내를 통합; 실제 계산 기능은 유지 |
| `/contact-us/`와 `/contact/` | 가시 main 본문 SHA 동일; 긴 별칭은 `/contact/` canonical, 사이트맵에는 짧은 정본만 | 긴 한국어 별칭을 `/contact/`로 301. 문의 기능과 정본이 import하는 원본 컴포넌트 보존 |
| `/privacy-policy/`와 `/privacy/` | 가시 main 본문 SHA 동일; 긴 별칭은 `/privacy/` canonical, 사이트맵은 정본만 | 긴 한국어 별칭을 `/privacy/`로 301. 정책 본문과 별도 다국어 정책 URL 보존 |
| `/terms-of-service/`와 `/terms/` | 가시 main 본문 SHA 동일; 긴 별칭은 `/terms/` canonical, 사이트맵은 정본만 | 긴 한국어 별칭을 `/terms/`로 301. 약관 본문과 기존 외부 링크 호환 보존 |
| `/ziwei/chart/`, `/ziwei/animal-destiny/` | 운영 HTML의 보이는 H1 0개. 소스에는 `sr-only` H1과 실제 ClientLoader가 있음 | 독립 기능 유지. 구현에서 가시 SSR 제목·짧은 소개와 입력 링크를 제공하고 장문을 details로 정리; 로컬 렌더·입력 확인 |
| `/oracle/rune/`, `/saju/animal-destiny/`, `/saju/destiny-meeting-place`와 후행 슬래시 표기 | 부모의 `sr-only`까지 반영한 최종 parser에서 가시 H1 부족 | 독립 기능 유지. 구현에서 가시 제목·소개와 접이식 해설을 제공; 로컬 390px 렌더·가로 넘침 없음 확인 |
| 날짜별 보관·개인 도구·미검수 소개 | 현재 noindex 관측 | 정책 유지. 검색용 장문을 억지로 추가하거나 색인을 확대하지 않음 |

첫 관측의 자동 구조 후보는 9 URL이었다. 최종 확장 관측에서는 이미지 속성 검토까지 포함한 후보 511 URL을 기록했다. 가시 H1 후보는 7 URL, hreflang 역링크 후보는 7 URL, 정책 본문 동일 후보는 3쌍이며 서로 겹칠 수 있다. 404·서버 오류·요청 실패·사이트맵 noindex 충돌은 없었다. 각 후보는 CSV `issues`에 기록하며 정상 HTTP 200은 내용 품질이나 검색 노출의 증명이 아니다.

이미지 크기 속성 누락 후보 497 URL 중 483 URL은 `app/fortune/[period]/YeoniPortrait.tsx`에서 Next Image `fill`과 부모의 명시적 width/height를 사용한다. 크기 속성만 없는 정상 레이아웃이므로 이미지 문제만으로 페이지를 삭제·통합하지 않는다. 나머지 14 URL 중 공통 궁합 예시는 `styles/fortune-ui-home.css:138`의 `aspect-ratio:16/9`를 사용한다. 숨겨진 미리보기·룬·포커·네오·인연의 장소의 실제 표시 시 크기와 CLS는 별도 브라우저 검증 대상이다.

hreflang 역링크 후보는 정책 별칭 3개와 `/en/fortune/`, `/ja/fortune/`, `/zh/fortune/`, `/zh-tw/fortune/` 4개다. 정책 별칭은 승인 301로 통합한다. 다국어 운세 허브는 한국어 정적 `/fortune/` 생성기에 대응 alternate가 빠져 있는 원인을 확인했으므로 생성기에서 보완한다. 언어 태그 누락·언어 경로 불일치·img alt 속성 누락은 확장 관측에서 없었다.

분량·유사도·낮은 유입만으로 삭제하지 않는다. 승인한 여덟 통합 외에는 삭제 판정이 없다. 각 원고의 사실성·검색 의도 만족도는 자동 행 검사와 별도의 편집 검수이며 CSV에 미확인 상태를 남겼다.

## 재현과 검증

기본 실행은 네트워크·파일 쓰기 없이 사이트맵 목록만 확인한다.

```powershell
node scripts/seo-public-inventory.mjs
node --test scripts/seo/public-inventory.test.mjs
```

운영 공개 HTML 관측을 의도적으로 다시 기록할 때만 다음을 사용한다. 원본 관측을 덮지 않도록 새 날짜/릴리스 파일명을 지정한다.

```powershell
node scripts/seo-public-inventory.mjs --live --capture --concurrency=10 --max-pages=5000 --output=docs/seo/seo-url-inventory-YYYY-MM-DD.json
```

요청 한도에 닿으면 `completeWithinPublicBoundary=false`와 대기 건수를 기록한다. JS 실행 후 생기는 링크, 로그인/개인 결과, 국가별 응답 차이, 검색엔진이 선택한 canonical은 이 도구의 검증 범위 밖이다. 새 배포 후 리디렉션 검증은 별도 릴리스 증거로 기록한다.
