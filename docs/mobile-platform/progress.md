# 모바일 UX 개선 진행 보고 — 2026-09-08

**전체 완료 보고가 아니다.** 소스 전수 인벤토리와 일부 공통 기반·찻집 수정을 구현했다. 전체 기능 순회와 상세페이지 배포는 남아 있다.

## 1. 전체 진단

`inventory.json`에는 React 페이지 242개, 정적 HTML 원본/미러 52개, 마케팅 별칭 155개, 셸 action 145개, 이미지 966개를 기록했다. 중복 별칭과 생성 미러가 있으므로 이 숫자를 기능 수로 세지 않는다. 동적 route 실제 생성 대상과 런타임 검증은 추가 작업이다.

## 2. 모바일 UX

공유 버튼의 44px 터치 영역, 공유 실패 후 직접 복사 가능한 입력창, 찻집 단계 복귀 시 질문 초안 복원을 추가했다. 개인정보를 localStorage에 새로 저장하지 않는다.

## 3. 운명의 찻집

네 가지 상담 방식(타로·사주·사주 궁합·숙요)과 여섯 고민 찻잔은 서로 다른 선택이며 유지했다.

결과 대기 화면은 연이 스프라이트 뒤의 `로딩 화면.webp`와 페이지/패널의 장식 atlas가 겹쳤다. 브라우저 캡처에서 사각 일러스트와 영문 목업 문구가 비쳤다. 중첩 일러스트 마크업과 전용 미사용 CSS를 제거하고 대기 단계의 장식 atlas를 숨겼다. 기존 방 배경·연이·선택한 찻잔·진행 상태는 유지했다. 모바일의 남은 말풍선 여백과 연속 애니메이션·필터 비용을 줄였다.

## 4. 전문가 상담

`detail-prototype.html`에 찻집·인생의 책·운명의 동물 도감 시안이 있다. 인생의 책과 동물 도감은 실제 렌더러의 개인정보 없는 fixture 요약을 사용했다. 찻집 결과 fixture 캡처와 추천 매핑, 전 기능 확장은 미완료다.

## 5. 공유 시스템

`js/share-service.mjs`에 Kakao feed·Native Share·Clipboard 결과 처리를 공통화하고 React ShareWidget에 연결했다. 취소/실패/SDK 열림/복사 성공을 구분한다. SDK 미설정과 clipboard 거부 때 직접 선택 가능한 URL을 제공한다. 정적 셸 소비자 통합과 서버 공개 요약·OG 확장은 아직 적용하지 않았다.

## 6. Kakao Developers

공식 [SDK 다운로드](https://developers.kakao.com/docs/ko/javascript/download)의 2.8.3과 [공유 문서](https://developers.kakao.com/docs/ko/kakaotalk-share/js-link)를 확인했다. 공개 `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`를 필요할 때 읽으며 하드코딩한 키가 없다. 콘솔 설정·도메인 등록·실제 메시지 전송은 미검증이다. 공유 전용으로 OAuth Redirect URI를 추가하지 않았다.

## 7. 뒤로가기와 라우팅

AppChrome이 history.back 후 240ms 안에 이동하지 못하면 홈으로 강제 이동하던 타이머를 제거했다. 기존 진입 판단과 fallback은 유지한다. 찻집 입력→찻잔 선택→입력의 UI 복귀는 질문 초안 보존을 확인했다. Android gesture·전체 결제 복귀·다른 내비게이션 타이머는 미검증이다.

## 8. 이미지 최적화

대기 화면의 중첩 `로딩 화면.webp` 요청을 제거했다. 기존 모바일 연이 still WebP는 78,204 bytes이며 데스크톱 스프라이트를 모바일 최초 대기 화면에서 요청하지 않는 것을 확인했다. R2 파일 자체는 삭제하지 않았다. 시안용 결과 캡처는 WebP 8,750/40,882 bytes로 변환했다.

## 9. 성능

| 항목 | 변경 전 | 변경 후 |
| --- | --- | --- |
| 대기 캐릭터 뒤 별도 일러스트 | 요청·렌더 | 요청 없음 |
| 대기 패널 장식 atlas | 영문 목업 글씨 비침 | 레이어 없음 |
| 모바일 연이 float·필터 | 연속 float·drop-shadow | 없음 |
| 대기 비주얼 최소 높이 | 430px | 280px |

위는 코드·mock 브라우저 관찰값이다. LCP/INP/CLS·Slow 4G·총 전송량의 전후 수치는 측정하지 않았다. 중복 request 이벤트 수를 네트워크 전송 바이트로 간주하지 않았다.

## 10. 삭제 또는 정리한 코드

사용처가 없어진 loadingSceneAsset CSS와 해당 AssetImage import/렌더만 제거했다. 다른 화면의 이미지와 결제·인증·DB 구현은 유지한다. 공통 JS 추가에 따른 셸 cache key와 미러는 생성기로 동기화했다.

## 11. 테스트

- `check:fast`: 통과(Node 929개, Jest 218 suites / 2,417개). 이후 SDK 실패 재시도 테스트를 추가해 공유 관련 Node 5개 별도 통과.
- `tsc --noEmit --incremental`, 전체 lint: 통과(기존 lint 경고 있음).
- mock 브라우저: 찻집 초안 복귀, 인생의 책 fixture, 동물 로컬 계산 요약, Kakao 미설정·Native 취소·Clipboard 거부/직접 선택 통과.
- 대기 화면 320/360/375/390/412/430/768/1280px: 진행 상태 유지·가로 overflow 없음. 실기기 검증은 아니다.
- 시안 3종 390/960px: 이미지 누락·가로 overflow 없음. 불투명 읽기 표면의 대비는 본문 16.36:1, 보조 10.93:1, CTA 13.47:1.
- `verify:mobile-detail-nonintrusive`: 통과. `build`는 다른 작업 dev 서버를 감지한 사전 가드에서 차단, 성공으로 간주하지 않는다.

## 12. 남은 위험

전체 서비스 순회·모바일 backgesture·실제 결제/로그인/공유·실사용 성능은 미검증. 요약 공유 서버는 구현 전이다. 개인 결과를 통째로 공개하지 않는다. 공개 소개 URL은 query/hash를 제거하지만 정적 action 공유 매핑은 추가 설계가 필요하다.

## 13. 변경 파일

주요 정본: ScentLoadingScene, QuestionInputScene, fortune-tea-house.module.css, AppChrome, ShareWidget, lib/share.v2.ts, js/share-service.mjs. 조사·시안·검증 스크립트는 `docs/mobile-platform/`와 `scripts/*mobile*.mjs`에 있다. 전체 목록은 git diff가 정본이다.

## 14. 배포 전 체크

빌드/PR 검사 통과와 최신 main 중첩 확인이 필요하다. 상세페이지 목업 검토 후 공통 패널과 독립 URL을 구현하고 전 기능별 검증 원장을 채운다. 현재 변경만으로 전체 계획의 완료·운영 배포를 선언하지 않는다.
