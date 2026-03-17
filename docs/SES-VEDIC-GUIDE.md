# 베다 점성술 엔진 — SES(Secure EcmaScript) 환경 대응 가이드

## 1. 현상

- **SyntaxError: Unexpected token '='**  
  기본 매개변수(`function fn(a=1)`) 또는 일부 ES6+ 문법이 SES/구형 파서에서 파싱 오류를 일으킬 수 있음.
- **SES Removing unpermitted intrinsics**  
  `lockdown`(또는 `lockdown-install.js`)이 적용된 환경에서 `Math`, `Date`, `JSON` 등이 제거되면 베다 엔진이 동작하지 않음.
- **생년월일 입력 후 결과 미출력**  
  위 문법/런타임 오류로 스크립트가 중단되어, 입력값이 API까지 전달되지 않거나 결과가 UI에 반영되지 않을 수 있음.

## 2. 코드 측 수정 사항(적용됨)

- **문법 호환**
  - 기본 매개변수 제거: `function detailHeader(icon,title,sub='')` → 함수 본문에서 `if(sub===undefined)sub='';` 로 처리.
  - `_readProfileFromStorage` 내 `raw` 변수는 함수 상단에 `var raw;` 선언 후 사용해 스코프/엄격 모드 오류 방지.
- **실행 전 검사**
  - 스크립트 진입 시 `Math`, `Date`, `JSON` 존재 여부 확인. 없으면 초기화 중단하고 noprofile 화면에 안내 문구 표시.
- **데이터 흐름**
  - 프로필은 `localStorage` → `sessionStorage` → `window.FORTUNE_APP_VEDIC_PAYLOAD` 순으로 읽고, `_repairProfile`로 `birth` 구조 정규화 후 API 호출.  
  문법/런타임 오류가 제거되면 생년월일 입력 → API → 결과 렌더링이 정상 동작함.

## 3. SES / lockdown 설정 가이드

프로젝트에 `lockdown-install.js`(또는 `@agoric/lockdown` / `ses`)가 포함되어 있고, **베다 점성술 페이지(/vedic, vedic-astrology.html)도 그 영향을 받는 경우** 아래 중 하나를 적용하세요.

### 옵션 A: 베다 페이지는 lockdown 밖에서 실행(권장)

- 베다 페이지를 로드하는 경로에서는 `lockdown()` 또는 `harden()`을 호출하지 않거나,  
  베다 전용 HTML/스크립트는 lockdown이 적용되기 **이전**에 로드되도록 배치.
- 예: 메인 앱만 lockdown 적용하고, `/vedic`는 별도 정적 HTML로 서빙해 같은 윈도우에서 lockdown 미적용.

### 옵션 B: lockdown 적용 후 필수 내장 객체 허용

lockdown을 반드시 적용해야 한다면, **엔진이 사용하는 내장 객체를 제거 대상에서 제외**하도록 설정합니다.

- **필수 intrinsic 예시**  
  `Math`, `Date`, `JSON`, `Number`, `String`, `Array`, `Object`, `Promise`, `Error`, `parseInt`, `parseFloat`, `isNaN`, `isFinite`, `decodeURIComponent`, `encodeURIComponent`, `fetch`(또는 XMLHttpRequest).
- **설정 방법**  
  사용 중인 SES/lockdown 버전의 문서를 참고해, “whitelist”/“permitted intrinsics”/“save options” 등에 위 목록을 추가.  
  예시(Agoric lockdown):  
  `lockdown({ saveOptions: { ... } })` 또는 `repairIntrinsics` 등에서 제거하지 않을 intrinsic 목록 지정.

### 옵션 C: 베다 엔진만 별도 iframe에서 실행

- 베다 페이지를 `iframe`으로 띄우고, 해당 iframe에는 lockdown을 적용하지 않음.
- 부모 창과는 `postMessage`로 생년월일/프로필과 결과만 주고받도록 하면, SES 정책을 유지하면서 엔진만 일반 환경에서 실행할 수 있음.

## 4. 폴리필 / 하위 호환

- 베다 엔진 코드는 **점성술 알고리즘을 변경하지 않고**, 실행 환경·인터페이스만 수정함.
- 이미 다음을 적용해 두었음:
  - 기본 매개변수 제거 → ES5 스타일로 대체.
  - `var raw` 등 함수 스코프 정리로 strict/SES에서도 파싱/실행 오류 방지.
- 필요 시 `Array.isArray`, `Object.keys`, `String.prototype.trim` 등은 대부분 SES 환경에서 그대로 제공되므로, 추가 폴리필은 **실제로 누락된 intrinsic이 있을 때만** 해당 환경 문서에 맞춰 적용하면 됨.

## 5. 정리

| 항목 | 조치 |
|------|------|
| **vedic:937 SyntaxError** | 기본 매개변수 제거 및 `raw` 스코프 수정으로 해결(public/vedic-astrology.html, 루트 vedic-astrology.html 반영). |
| **SES Removing unpermitted intrinsics** | 베다 페이지는 lockdown 밖에서 실행하거나, Math/Date/JSON 등 필수 intrinsic 허용 설정 적용. |
| **생년월일 입력 후 결과 없음** | 위 문법/런타임 오류 제거로 스크립트가 끝까지 실행되어 데이터 흐름 복구됨. |
| **코드 안정성** | ES5 호환 방식으로 정리해 두었으며, 엔진 계산 로직은 변경하지 않음. |

추가로 `lockdown-install.js`를 프로젝트에서 직접 수정할 수 있다면, 해당 파일 내에서 “unpermitted intrinsics” 제거 목록에 `Math`, `Date`, `JSON` 등이 포함되어 있는지 확인하고, 위 옵션 B에 맞게 허용 목록에 넣으면 됩니다.
