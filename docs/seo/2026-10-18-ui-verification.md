# 2026-10-18 검색 유입 화면 검수

## 검수 환경과 경계

- 대상: SEO 개선 작업 트리의 로컬 mock 서버 `http://localhost:21274/`, 재시작 뒤 `http://127.0.0.1:21274/`.
- 브라우저: 연결된 Chrome을 CUA로 직접 조작했다. 운영 계정 입력, 실결제, 실 LLM 호출, 운영 데이터 변경은 하지 않았다.
- 날짜: 2026-10-18 KST. 캡처·실측 원본은 저장소 밖 `D:/Development/seo-search-evidence-20261018/`에 보관한다.
- 화면 폭은 브라우저 viewport 요청값이다. 이 환경의 세로 스크롤바가 15px를 차지하므로 실제 document clientWidth는 요청값보다 15px 작았다.
- 메인과 서비스의 기존 그림·색상 토큰·캐릭터 구성을 유지하고, 공개 제목·입력 정보·이용 범위·시작 동선을 검수했다.

## 확인한 화면

| 경로 | 요청 폭 | 실측 clientWidth / scrollWidth | 확인 결과 |
| --- | --- | --- | --- |
| `/` | 360, 390, 430, 1440 | 345/345, 375/375, 415/415, 1425/1425 | H1, 서비스 소개, 두 캐릭터 카드와 시작 문구 정상. 가로 넘침 없음 |
| `/saju/` | 360, 390, 430, 1440 | 345/345, 375/375, 415/415, 1425/1425 | 제목·준비 정보·기본/유료 범위 구분과 시작 링크 정상. 가로 넘침 없음 |
| `/sukuyo/` | 390 | 375/375 | 본명숙과 관계 궁합의 범위 구분, 입력 안내, 시작 링크 정상 |
| `/vedic/` | 390 | 375/375 | 라그나·나크샤트라·다샤와 출생정보 안내 정상 |
| `/astrology/` | 390 | 375/375 | 출생차트·태양·달·상승궁 설명과 입력 안내 정상 |
| `/tarot/` | 390 | 375/375 | 질문 중심 설명, 출생정보 불필요 안내, 기본/상담 범위 구분 정상 |
| `/ziwei/` | 390 | 375/375 | 12궁 기본 명반과 심화 상담 구분, 시작 링크 정상 |
| `/ziwei/chart/` | 390 | 375/375 | 가시 H1 `자미두수 심화 상담`, 실제 유료 심화 기능 안내와 입력 anchor 정상 |
| `/naming-ai/` | 390 | 375/375 | 무료 초안/유료 작명 구분, 한국어 입력 6개, AI 제작 방식 표시 정상 |
| `/ziwei/animal-destiny/` | 390 | 375/375 | 가시 H1·설명·FAQ와 한국어 입력 7개 정상 |
| `/fortune/tomorrow/`, `/fortune/tomorrow/rat/` | 390 | 각 375/375 | 24개 선택 링크, 2026-10-19 날짜, 개인 운세 후속 링크 정상 |
| `/fortune/monthly/`, `/fortune/monthly/rat/` | 390 | 각 375/375 | 24개 선택 링크, 2026년 10월 기간, 개인 운세 후속 링크 정상 |
| `/oracle/rune/` | 390 | 375/375 | 가시 H1·소개와 룬 배열 선택 UI 렌더. 발견한 무료/가격 문구 충돌은 후속 수정 후 재검수 완료 |
| `/saju/animal-destiny/` | 390 | 375/375 | 가시 소개·details와 실제 입력 3개 렌더 정상 |
| `/saju/destiny-meeting-place/` | 390 | 375/375 | 가시 소개·details와 실제 입력 3개·기존 유료 안내 렌더 정상 |

사주·숙요점·베다점·점성술·타로·자미두수의 모바일 기본 CTA는 실측 높이 약 52.3px였고, 모두 첫 844px 화면 안에서 보였다. 390px 표본의 CTA 상단은 약 430~483px였다. 심화 자미두수의 입력 anchor는 높이 48px였다.

## 실제 동작 확인

- 메인 서비스 목록의 사주 링크를 눌러 `/saju/` 랜딩에 도달했다.
- 사주 랜딩의 `생년월일로 사주 보기`를 눌러 `/ggulggul/?action=cdOneStepFreeSajuEntry`에 도달했다. 이름·생년월일·달력 종류·출생시간·장소·성별 입력과 무료 사주 분석 버튼이 실제 DOM에 나타났다. 입력값을 제출하지 않았다.
- 타로의 `질문에 맞는 타로 고르기`는 `action=cdHomeTarotEntry`를 유지하며 무료/유료 타로 컬렉션을 열었다.
- 숙요점·베다점·점성술의 기본 CTA는 각각 `cdHomeSukuyoEntry`, `cdHomeVedicEntry`, `cdHomeAstroEntry` action을 유지하며 한국어 공통 출생정보 입력 화면을 열었다. 프로필 없는 상태의 실제 진입을 확인했으며 결과 계산은 제출하지 않았다.
- `/ziwei/chart/`의 `심화 상담 입력하기`로 `#ziwei-chart-input`에 도달했다. 한국어 주제·생년월일시·장소 등의 입력이 나타났고, target의 화면 상단 위치는 약 80px였다. 최초 검수에서는 서버 종료로 입력 캡처를 저장하지 못했으나 재시작 뒤 정상 캡처를 확보했다.
- `/ziwei/animal-destiny/`의 시작 링크로 `#ziwei-animal-input`에 도달했다. 한국어 입력 7개, target 상단 약 80px를 확인했다.
- 작명 안내의 시작 링크로 `#naming-start`에 도달했다. target 상단 0px와 실제 입력 6개를 확인했다. 실제 client에 남아 있던 `전문가가 직접 이름을 짓고`라는 문구를 AI가 구성하는 방식과 무료/유료 범위로 수정하고 HMR 화면에서 재확인했다.
- 월간 허브의 쥐띠 링크를 눌러 `/fortune/monthly/rat/`에 도달한 뒤 `나의 사주 기본 결과 보기`로 `/saju/`에 도달했다.
- 내일 허브의 쥐띠 링크로 `/fortune/tomorrow/rat/`에 도달했다. 날짜 마커는 `2026-10-19`/표시 `2026년 10월 19일 (월)`, 월간 마커는 `2026-10-01`/표시 `2026년 10월`로 일치했다. 두 상세 페이지의 후속 CTA는 각각 해당 period/sign source와 사주·영냥이 target을 가진다.
- 룬 후속 재검수는 `/oracle/rune/` 한 경로에서만 수행했다. 한국어 H1은 `룬 점 — 엘더 푸타르크 24룬 오라클`, 메타 설명은 유료 리딩이며, 펼친 이용 안내·FAQ에 무료 주장이 없었다. 1·3·5·12룬 버튼은 모두 기존 서버 가격 정본과 같은 3,000원으로 표시됐고 1,000원 버튼은 0개였다. 배열을 선택하거나 결제를 실행하지 않았다.

## 캡처와 실측 파일

저장소 밖 evidence 디렉터리의 성공 증거:

- `home-final-360.jpg`, `home-final-390.jpg`, `home-final-430.jpg`, `home-final-1440.jpg`
- `saju-final-360.jpg`, `saju-final-390.jpg`, `saju-final-430.jpg`, `saju-final-1440.jpg`
- `saju-input-entry-430.jpg`
- `sukuyo-final-390.jpg`, `vedic-final-390.jpg`, `astrology-final-390.jpg`, `tarot-final-390.jpg`, `ziwei-final-390.jpg`
- `ziwei-chart-final-390.jpg`
- 한국어/재시작 검수: `naming-final-ko-390.jpg`, `ziwei-chart-final-ko-390.jpg`, `ziwei-chart-input-ko-390.jpg`, `ziwei-animal-final-ko-390.jpg`
- 날짜별/추가 SSR: `fortune-monthly-final-390.jpg`, `fortune-tomorrow-final-ko-390.jpg`, `saju-animal-ssr-390.jpg`, `destiny-meeting-ssr-390.jpg`
- `rune-ssr-390.jpg`는 무료 문구 충돌을 발견한 시점의 캡처이며 수정 완료 증거가 아니다.
- `rune-final-verification.json`은 후속 수정 뒤 한국어 제목·메타 설명·무료 주장 부재·4개 버튼의 3,000원 표시를 확인한 최종 DOM 증거다.
- `visual-metrics-final.json` — DOM 실측 기록. 사주 데스크톱 및 자미두수 입력 anchor 일부 실측은 도구 실행 출력과 캡처로 확인했다.

계정 정보가 보이는 운영 화면 캡처는 이 문서나 저장소에 넣지 않는다. 실패한 오프라인 화면 캡처는 성공 증거에서 제외했다.

## 소스 및 접근성 확인

- 메인 `app/page.js`와 `app/home-main.module.css`: H1 → 두 서비스 카드 → 8개 분야 → 고민별 링크 → 실제 공개 기질 해설 예시 → 체계 차이 → FAQ 순서 확인.
- 메인 가격은 기존 결제 catalogue에서 읽으며, FAQ는 같은 데이터로 화면과 JSON-LD를 만든다. 탐색 링크·FAQ summary는 기존 토큰과 44px 이상 목표 영역을 사용한다.
- 공통 서비스 hero는 준비할 정보, 기본 제공 범위와 별도 유료 범위를 CTA 인근에 표시한다. 모바일에서는 주요 문구와 시작 CTA가 그림보다 먼저 나온다.
- 관련 링크의 CTA 위치·서비스 마커는 부모 목록이 아닌 실제 anchor에 있다. 기간 운세의 화면 날짜에는 `time`과 `data-cd-fortune-range-marker`를 사용한다.
- 관찰한 화면에서 P0/P1/P2 시각 결함은 발견하지 못했다. 전체 접근성 자동 검사나 전 페이지 전수 시각검사 통과를 의미하지 않는다.

## 검증 명령 결과

- `node --test __tests__/ui/core-landing-calculation-examples.test.mjs __tests__/ui/saju-service-catalog.static.test.mjs` — 11/11 PASS.
- `node scripts/verify-naming-prompt-flow.mjs` — PASS.
- 담당 변경 소스 11개 파일 ESLint — exit 0.
- 최종 `SeoLandingTemplate.jsx`와 `SignFortuneView.tsx` ESLint 재검사 — 오류 0, 기존 `PERIOD_LABEL` 미사용 경고 1.
- `npx eslint app/naming-ai/NamingAiClient.tsx` — 작명 제작 방식 2개 문구 수정 후 exit 0.
- Impeccable 대상 UI 8개 파일 detector — 결과 `[]`.
- `git diff --check` — 오류 없음.

## 제한과 남은 확인

- 검수 중 로컬 개발 서버가 메모리 commit 부족으로 종료됐다. 이를 서비스 워커 또는 서비스 제품 결함의 증거로 보지 않는다.
- 전체 페이지 캡처는 브라우저 capture timeout으로 저장하지 못했다. 메인 하단은 DOM과 소스 구조를 확인했으며, 하단 전체 육안 확인은 아직 완료하지 않았다.
- 초기 localhost 화면에서 한국어 본문과 중문 내비게이션·입력 UI가 함께 보였다. 재시작 후 새 127.0.0.1 탭에서 UI의 한국어 버튼을 선택한 뒤 `html lang=ko`, 한국어 메뉴·입력을 확인했다. locale 소스는 변경하지 않았다. 과거 혼합 화면은 한국어 설정 후의 최종 증거와 구분한다.
- 재시작 직후 기존 탭에서 공통 layout chunk 구문 오류가 한 번 관찰됐다. 서버 원문 검사 통과 및 새 탭 재검수에서 실제 client 입력을 확인했으며, 이를 해결하기 위한 제품 코드 우회는 추가하지 않았다.
- 룬 페이지의 기존 무료 주장과 1,000원 UI 표시는 오류였다. root가 기존 서버 정본 3,000원을 가격 표시의 소스로 연결하고 무료 주장을 제거했다. 후속 브라우저 재검수에서 한국어 제목·설명·FAQ와 네 배열의 3,000원 표시를 확인했으며 이 항목은 닫았다. 실제 결제는 검수 범위에 포함하지 않았다.
- 로컬 전체 `check:fast`는 메모리 부족으로 중단됐다. 공식 GitHub CI 결과는 별도 전달 검증에서 확인해야 한다.
- 배포, 검색봇 재수집, 색인 반영, 순위·노출·전환 상승은 이 로컬 검수의 완료 범위가 아니다.
