# 🌌 베다점 엔진 데이터 연동 및 전수 수정을 위한 마스터 프롬프트

아래 전체 블록을 **복사**하여 개발 AI(Composer, Claude, Cursor 등)에 붙여넣고,  
**관련 파일**(`public/vedic-astrology.html`, 루트 `vedic-astrology.html`, `app/api/vedic/planets/route.js`)을 함께 첨부하세요.

---

## 복사용 프롬프트 (아래부터 끝까지 복사)

```
Role: 너는 베다 점성술(Vedic Astrology) 계산 로직에 정통하고, 자바스크립트 엔진 최적화 및 보안 샌드박스(SES) 환경을 다루는 시니어 풀스택 개발자야.

Task Overview: 제공된 베다점 엔진 파일(vedic-astrology.html 등)을 분석하여, UI의 '프로필 카드'에서 입력받은 사용자의 생년월일(birthDate), 태어난 시간(birthTime), 태어난 장소(위도/경도/타임존) 데이터를 엔진의 함수와 100% 정확하게 연결하고, 현재 발생 중인 런타임/구문 오류를 수정해줘.

=== 1. 엔진 분석 및 데이터 매핑 (Data Integration) ===

• 입력 데이터 형식
  - 프로필 카드에서 전달되는 데이터: birthDate(YYYY-MM-DD 또는 year/month/day), birthTime(HH:mm 또는 hour/minute), birthLocation(위도 lat, 경도 lng/lon, 타임존 tzOffset 또는 baseTzOffset, 선택적 dstMinutes).
  - 엔진이 기대하는 형식: profileToForm(profile)에 넘길 수 있는 객체. 즉 profile.birth = { year, month, day, hour, minute }, profile.location = { lat, lng 또는 lon, tzOffset 또는 baseTzOffset, label, tz }.

• 브릿지 함수
  - birthDate(YYYY-MM-DD), birthTime(HH:mm), birthLocation(lat, lng, timezone) 형태로 들어오는 경우, 이를 profile.birth / profile.location 구조로 변환하는 브릿지 함수를 작성하거나 기존 normalizeProfileForVedic, _repairProfile과 연동해줘.
  - profile.birth가 없고 birthYear, birthMonth, birthDay 등 플랫 구조만 있는 경우 _repairProfile로 birth 객체를 재구성하도록 유지해줘.

• 핵심 함수 호출
  - 차트 생성·행성 위치 계산 흐름: profile → profileToForm(profile) → f → buildChart(f, lonsOverride). lonsOverride가 없으면 엔진 내부 calcPlanets(jd) 사용.
  - doCalculateFromProfile(profile)이 이 파이프라인의 진입점이므로, 프로필이 이 함수에 올바르게 전달되고 f가 buildChart에 넘어가는지 검증해줘.

=== 2. 치명적 오류 수정 (Debugging) ===

• SyntaxError 해결
  - "Unexpected token '='" 는 주로 기본 매개변수(예: function fn(a=1)) 또는 스코프 문제(함수 내 변수 미선언 재사용)에서 발생함.
  - 엔진 파일에서 기본 매개변수를 사용하는 함수(예: detailHeader(icon, title, sub=''))가 있으면, 본문에서 if(sub===undefined)sub=''; 방식으로 대체해줘.
  - _readProfileFromStorage 등에서 한 블록에서만 선언된 변수(예: raw)를 다른 블록에서 재사용할 경우, 함수 상단에 var raw; 선언해 스코프 오류를 제거해줘.

• SES 보안 대응
  - lockdown/SES가 Date, Math, JSON 등을 제거하면 엔진이 동작하지 않음. 스크립트 진입 시 이들이 존재하는지 검사하고, 없으면 초기화하지 말고 noprofile 화면 등에 "Math/Date/JSON 등 기본 기능이 필요합니다. 보안 환경(SES)에서 차단된 경우 관리자에게 문의하세요." 같은 안내를 표시해줘.
  - 엔진을 반드시 SES 내에서 실행해야 한다면, 해당 환경 문서에 맞춰 필수 intrinsic(Math, Date, JSON 등) 허용 설정을 권장하는 주석 또는 docs/SES-VEDIC-GUIDE.md 같은 가이드를 유지해줘.

=== 3. 기능 정상화 및 검증 (Functionality) ===

• 결과값 검증
  - 데이터 입력 후 엔진이 '성향(personality), 재물운(wealth), 천직(career), 차크라(chakra), 연애운(romance), 궁합(compat), 요가(yoga)' 등 모든 베다점 결과가 report/insights에 담기고 renderResult()로 화면에 나오는지 확인해줘.
  - API(/api/vedic/planets) 실패 시 로컬 calcPlanets(jd)로 폴백해 결과가 그대로 나오도록 유지해줘.

• 장소·시간 검증
  - 위도/경도가 타임존(UTC 오프셋) 및 서머타임(DST) 보정에 반영되도록 normalizeProfileForVedic, profileToForm에서 location.baseTzOffset, tzOffset, dstMinutes를 사용하는 현재 로직을 유지하고, 필요 시 단위(tz가 시간인지 분인지)가 일관되게 처리되는지 검증 코드나 주석을 추가해줘.
  - buildChart 내부에서 jd 계산이 utcH = f.hour + (f.minute||0)/60 - f.timezone 으로 되어 있으므로, timezone이 시간 단위(예: 9 for UTC+9)로 전달되는지 확인해줘.

=== 4. UI/UX 연동 (Frontend Connectivity) ===

• 상태 반영
  - doCalculateFromProfile 실행 후 buildChart → analyze → generateInsights까지 완료되면 G.chart, G.report, G.insights를 설정하고 renderResult()를 호출해 result-content에 결과를 채워줘. (이미 구현된 경우 동작만 검증.)

• 로딩 상태
  - 계산 시작 시 showPage('loading')으로 로딩 페이지를 보여줘. 로딩 문구는 기존 "별자리 계산 중…" 또는 "우주의 기운을 읽는 중…" 등으로 통일해줘.

• 에러 처리
  - API 실패·네트워크 오류 시 로컬 계산 폴백 후 결과 표시. 로컬도 실패하거나 프로필이 없으면 사용자에게 친절한 안내 메시지(예: error-box에 "연결을 확인해 주세요" 또는 noprofile 페이지의 "생년월일·시간 정보를 먼저 입력해 주세요")를 띄워줘.

=== Constraints ===

• 엔진 내부의 복잡한 점성술 계산 알고리즘(수학적 공식, 예: calcPlanets, ayanamsa, calcAscendant, dignity, Vimshottari 등)은 임의로 수정하지 말 것. 오직 데이터 입력 → 엔진 실행 → 결과 출력으로 이어지는 파이프라인과 환경/구문 오류만 수정할 것.

• 모바일 브라우저에서 스크롤 멈춤이나 레이아웃 깨짐이 없도록, 기존 CSS(overflow-x:hidden, tap-highlight 등)와 페이지 전환(showPage) 로직을 해치지 말고, 필요 시 스크롤/터치 관련 이슈만 최적화할 것.
```

---

## 참고: 주요 파일·함수명

| 구분 | 파일/함수 |
|------|-----------|
| 엔진 페이지 | `public/vedic-astrology.html`, 루트 `vedic-astrology.html` |
| API | `app/api/vedic/planets/route.js` (POST, 행성 경도 반환) |
| 프로필 → 폼 | `normalizeProfileForVedic(profile)`, `profileToForm(profile)` |
| 프로필 복구/저장소 | `_repairProfile(profile)`, `_readProfileFromStorage()` |
| 계산 파이프라인 | `doCalculateFromProfile(profile)` → `buildChart(f, lonsOverride)` → `analyze(chart)` → `generateInsights(chart, report)` |
| 로컬 행성 계산 | `calcPlanets(jd)` (lonsOverride 없을 때 buildChart 내부 사용) |
| UI 상태 | `showPage('noprofile'|'loading'|'result'|'detail')`, `G.chart`, `G.report`, `G.insights`, `renderResult()` |
| SES 가이드 | `docs/SES-VEDIC-GUIDE.md` |

---

## 사용 방법

1. 위 **복사용 프롬프트** 블록(``` 로 둘러싸인 부분) 전체를 복사한다.
2. 개발 AI 채팅에 붙여넣고, 다음 파일들을 컨텍스트로 첨부한다.
   - `public/vedic-astrology.html`
   - (동일 구조라면) 루트 `vedic-astrology.html`
   - 필요 시 `app/api/vedic/planets/route.js`, `docs/SES-VEDIC-GUIDE.md`
3. "위 프롬프트대로 베다점 엔진 데이터 연동과 오류 수정을 진행해줘" 라고 요청한다.

이 문서는 바이브 코딩용 마스터 프롬프트로, 프로필 연동·구문 오류·SES 대응·기능 검증·UI 연동을 한 번에 지시하기 위한 것이다.
