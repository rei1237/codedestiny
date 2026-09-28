# 기본 네 상담 — Chrome 및 iPhone 호환성 검토

2026-09-29 사용자의 Chrome 검토와 iPhone 최적화 요청을 반영한다. 기존 연이/네오 디자인, 입력 DOM ID와 상담 controller를 유지한다.

## 확인한 문제와 수정

- iPhone 13 설정의 WebKit에서 무료 계산 후 `inputPage`가 `display:none`이 되면 그 자손인 자미두수 모달과 상담 카드의 실측 크기가 0×0이었다. 기존 `__cdEnsureModalOverlaysInBody`의 이동 대상에 자미두수·숙요·서양 모달을 추가했다. 새 모달 또는 라우팅은 만들지 않는다.
- 숨겨진 모달에서 생성한 `loading=lazy` 그림은 WebKit에서 `complete=false`, `naturalWidth=0`으로 남았다. 모달 세 서비스의 그림은 생성 시 로드하고, 정적 베다 페이지의 lazy 설정은 유지한다. 크기·srcset·async decoding·원본 파일은 유지한다.
- 로컬 검증 서버의 `.mjs` MIME을 `text/javascript`로 바로잡았다. 잘못된 MIME으로 차단된 검증 환경을 제품 결함의 증거로 사용하지 않는다.

## 재현 및 검증 범위

```powershell
node scripts/verify-basic-consultation-entry-ux.mjs --chrome
node scripts/verify-basic-consultation-entry-ux.mjs --iphone
```

- `--chrome`: 설치된 Google Chrome, 360/390/430/1440px. Chromium 기본 모드는 유지한다.
- `--iphone`: Playwright WebKit + iPhone 13 설정, 320/375/390/430px 및 가로 844×390px. 터치로 입력을 펼치고 질문 예시를 선택한다.
- 폼 표시·1000자 제한·기존 카운터·16px 입력·44px 이상 버튼·200% 글자 확대·조상 잘림을 검사한다. iPhone 모드에서는 높이 320px로 줄인 뒤 버튼 전체가 화면 안으로 스크롤되는지도 확인한다.
- 캡처는 CSS px 크기로 저장한다. `CD_CONSULTATION_EVIDENCE_DIR`로 저장소 밖의 증거 경로를 지정할 수 있다. Windows Node의 간헐적인 `UNKNOWN` 파일쓰기 오류 때 제품에 우회 코드를 추가하지 않는다.
- 모든 API는 mock, 외부 origin은 차단, 프로필·결과는 fixture다. 결제창 호출이나 실제 결제·LLM·DB 전달을 검증한 결과가 아니다.

## 실기기에서 남은 확인

WebKit 에뮬레이션은 실기기 Safari가 아니다. iPhone 소프트 키보드, 주소창 접힘과 visual viewport, safe area, 실제 기기 Chrome 및 Safari에서의 결제창 전환은 별도로 확인해야 한다. 높이 축소 검사를 소프트 키보드 실측으로 보고하지 않는다.

결제 정책·가격·이용권·월정석·단건 결제 구조, 인증·API·DB·주문·결과 복구 계약은 수정하지 않았다. 별도 `/…-ai`, 영냥이, 운명의 섬도 대상에 포함하지 않는다.
