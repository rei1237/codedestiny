---
status: done
updated: 2026-11-15
next: 개발·AIT 검수는 완료. 콘솔 버전17 검토 잠금 해제 후 새 AIT 등록/QR과 최신 UI 실기기 검수를 진행한다. 검토 취소·공개 출시는 승인하지 않았다.
---

## 첫 행동

이 작업을 다시 구현하거나 AIT를 중복 생성하지 않는다. 검증된 AIT source는 `61ca3cea186427cfa21d1578865a2ccee01280bf`다. 새 QR이 필요하면 콘솔 검토 잠금부터 확인한다. 기존 QR17은 새 CTA AIT가 아니다.

## 지금 상태

- UI 커밋 `5ac792a84`, 테스트 보정 `62e0b6d16`, AIT source `61ca3cea186427cfa21d1578865a2ccee01280bf` 모두 main 통합/push 완료.
- main CI [43704490985](https://github.com/rei1237/codedestiny/actions/runs/43704490985) SUCCESS.
- Linux 일반 AIT [43704490361](https://github.com/rei1237/codedestiny/actions/runs/43704490361) 전체 SUCCESS, artifact14157968806.
- 최종 문서 커밋은 위 AIT source 이후다. 문서 변경 때문에 검증된 AIT를 재생성하지 않는다.
- 작업 워크트리 `D:/Development/codedestiny-worktrees/toss-cta-ux-20261115-184310` / `wt/toss-cta-ux-20261115-184310`는 최종 문서 push 후 공식 remove 명령으로 배수한다. 다른 세션의 `.claude/skills/fire-your-seo-agency/` 및 다른 워크트리는 보존한다.
- 최종 전달 폴더: `C:/Users/user/Downloads/CodeDestiny/20261115-login-cta-ux`.
- AIT SHA256: `7f8d36bc3a500c7b75a0898050dc4ff89e8b5bc0f0d18f15e58d7bb038aa90fa`.
- AIT 87,847,349 bytes, 확장99,068,948 bytes, source1761개. 100,000,000 bytes 제한·portable·일반판·새 CTA5개 포함 검수 PASS.

## 승인 상태

2026-11-15 사용자: “로그인 버튼이라든지 버튼 CTA라고 하나? 이런게 사용자 경험상 좋지 않게 배치되어있어서 최고의 전문가로서 직관적이고 편리하게 UI/UX를 개선해줘”.

상위 작업 원문: “검증된 커밋으로 Linux AIT를 생성하고, 기존 축소 버전과 구분되는 새 비공개 테스트 QR을 준비해.”, “최종 CI 결과를 확인하고 ... 실제 AIT에서 홈 진입부터 ... 검증해줘”, “나머지 앱 론칭작업을 완료해줘”. AIT 산출물 확보와 최종 CI 확인은 명시된 납품 범위로 완료까지 추적했다.

이번 UI 작업의 운영 서버 배포는 없다. 실결제·실LLM·운영DB 쓰기·검토 취소/제출·공개 출시 금지. 기존 로그인 수정은 운영08103bec6와 QR17에서 사용자가 실기기 정상 확인했다. 신규 CTA AIT 실기기 확인과 새 QR은 콘솔 검토 잠금으로 남아 있다. 이름 불일치 문의는 사용자 담당이다.

## 작업 규칙과 함정

- 원본 캐릭터·일러스트, 가격·이용권·월정석·단건 결제 정책, 인증 callback·복귀 URL 허용목록·소유권·원문 재열람 보존. 공개웹 SEO 변경 없음.
- 초기 cde0b14ea CI43703512772는 제거된 중복 nav를 찾던 테스트5개에서 실패했다. 제품 코드가 아니라 4개 테스트 파일의 진입을 실제 캐릭터 카드로 보정했고, FPTI 공유 DOM의 시작 URL을 초기화했다. 관련7파일18/18 PASS 후 새 Linux 전체 Toss 계약도 PASS. 폐기된 cde AIT 요청43703521077 취소.
- 최초 check:fast Node5086/5087: 무시된 정적 일일 데이터가 새 워크트리에 없었다. 외부 호출 없는 fortune:build-data 후 해당 파일7/7 PASS, 남은 공식 단계 이어서 PASS. 마지막 Jest479 suites/8011 tests PASS,1 skipped. 최초 전체 실행을 PASS로 표현하지 않는다.
- pre-push는 최종 문서 커밋 전 dirty 문서 때문에 판정불가1회. 문서 커밋 뒤 exit0 PASS. 실질 CI 실패와 구분한다.
- Ego CDP init은 reload하는 round마다 재등록한다. mock fetch는 Request method/body를 보존하고 HTTP1에서 body stream 대신 arrayBuffer를 전달해야 한다. 초기 harness 실패를 이렇게 수정했으며 제품코드는 바꾸지 않았다.
- 과거 mock 메타가 누락된 숙요 결과는 원문 검수 근거로 사용하지 않는다. 이번 AIT는 기존 공식 fixture의 영냥이 사주 결과를 사용했다.
- 이전 로그인 작업의 외부 임시폴더 일괄 삭제는 자동승인검토에서 blocked by policy(세부 사유 없음)로 거절됐다. 이번 작업이 우회 삭제하지 않는다.

## 설계

홈 첫 화면은 두 캐릭터 카드로 공간을 선택하고 중복 탭은 생략했다. 공간 안의 이동 탭은 유지했다. 계정 버튼은 로그인 전 `토스 로그인`, 로그인 후 `내 보관함`이다.

SPA 및 직접/새로고침 로그인은 공통 LoginPanel을 사용한다. 큰 `토스로 로그인하기`, 복귀 안내, `지금은 둘러보기`, 펼치는 개인정보 안내로 역할을 구분했다. 보관함 구매 복구는 기록 아래, 설정 로그아웃은 보조 위계다. 상세 근거는 `docs/design/toss-cta-ux-2026-11-15.md`.

## 검증과 모바일 확인

- 타입·관련 통합 및 시각검수 PASS. 소스 화면360/390/430/1280px 넘침/겹침없음, 주CTA54px, 보조대비5.00:1/버튼7.35:1, 키보드focus PASS.
- 실제 Linux AIT entry 바이트를 변경 없이 로컬 서빙했다. SDK/API만 기존 createOfflineFixtureApi로 연결하고 외부 네트워크를 차단했다. 실기기 검증으로 표현하지 않는다.
- 홈→로그인→새로고침 동일 제목/버튼→mock로그인→보관함→저장원문→홈새로고침→내보관함→동일원문 재열람 PASS.
- login/session/library/results HTTP200. 이 재열람 중 orders/grant·generate HTTP 호출0. 결과는 명시적 테스트 예시다.
- 최종 실제AIT 화면: `screenshots/ait-home-360.png`, `ait-login-reload-360.png`, `ait-library-360.png`, `ait-original-reread-360.png`. 폰트 로딩 후 로그인 캡처를 사용한다.
- 전달 폴더 README에 모바일 버튼별 기대 결과, QR17/신규AIT 구분, 정책 불변 및 로그를 정리했다.
- Ego taskSpace13 finish 완료, 로컬 mock 서버4338 종료. 이전 소스검수 space11 및 dev서버도 종료됐다.

## 단계

- [x] UI 구현·행동 경계 보존·관련 타입/통합/시각검수
- [x] 테스트 진입 기대치 보정 및 관련18/18 PASS
- [x] main 통합/push 및 main CI SUCCESS
- [x] Linux 일반 AIT 생성·다운로드·해시·portable·새CTA 검수
- [x] 실제AIT의 외부차단 mock 로그인/원문 재열람 핵심경로 PASS
- [x] AIT/검증화면/README/로그 전달 폴더 정리
- [x] 개발 작업 완료 문서 닫기; 최종 문서 push 후 공식 워크트리 배수
- [ ] 외부 잔여: 콘솔 검토 잠금 해제 후 신규 QR와 최신 CTA AIT 실기기 확인(승인 없는 검토 취소·공개 출시 금지)
