---
status: done
updated: 2026-10-05
next: "다음 세션에서 함께 제공된 프롬프트를 읽고, 달빛 예화 정본과 서비스별 기존 결과 UI를 조사한 뒤 기록 보관함·상담 허브·저장 결과 화면을 개선한다."
---

# 기록 보관함·상담 허브 달빛 예화 UI 인수인계

문서 작성·전달은 완료했다. **다음 세션의 UI 구현은 아직 시작하지 않았다.**

## 요청과 첫 행동

사용자는 스테이징 반영을 확인했으나 UI에 불만족하며 ‘달빛 예화’ 스타일을 원한다. 추가 요구: **기록을 열 때 각 운세 기능의 원래 화면과 톤앤매너에 맞는 UI/UX로 보여야 한다.**

`docs/prompts/2026-10-05-records-consultations-yehwa-ui-prompt.md`가 실행 프롬프트다. 먼저 `CLAUDE.md`, `docs/context/design-canon.md`, `DESIGN.md`의 달빛 예화·표면 계열을 읽고 실제 코드와 비교한다. 기능 검사 통과를 디자인 승인으로 간주하지 않는다.

## 현재 기준

- 작업 디렉터리: `D:\Development\code-destiny`, 전달 대상 `main`, PR 없음.
- 마지막 기능 구현 SHA: `d0953b251b202fbe441e68d8c3638e451c9750ea`; [main CI](https://github.com/rei1237/codedestiny/actions/runs/37234443442) 전체 성공, 340개 suite/5,084개 테스트. 이 수치를 새 UI 검증 결과로 재사용하지 않는다.
- 스테이징 반영은 **사용자 확인**이다. 이번 문서 작성에서는 URL·배포 SHA·실제 화면을 다시 검증하지 않았다.

현재 main에는 다른 세션의 HTML·CSS·RSS·marketing 변경과 9개 staged 파일이 있다. 초기 `git status --short`로 재확인하고 절대 섞지 않는다. 동시 작업은 현행 안전 워크트리 절차를 따른다. 기존 작업 워크트리는 제거됐으므로 옛 경로로 재개하지 않는다.

## 구현 대상과 정본

| 대상 | 실제 진입점 |
| --- | --- |
| 나의 기록 보관함 `/records/` | `app/records/RecordsClient.tsx`, `RecordFrame.tsx` |
| 상담 허브 `/consultations/` | `app/consultations/ConsultationHub.tsx` |
| 기록 상세 `/records/view/` | `app/records/view/SavedRecordClient.tsx`, `StoredReading.tsx` |
| 서비스·문구 | `lib/records/service-registry.js`, `lib/records/copy.ts` |

달빛 예화: `DESIGN.md` §달빛 예화(月花), `styles/theme-tokens.css`의 `--cd-yehwa-*`, `scripts/design/gen-yehwa-motifs.mjs` → `styles/yehwa-motifs.css`. 생성물은 직접 수정하지 않는다. 기존 운명 찻집의 `QuestionInputScene.tsx`, `styles/tea-question.module.css`, `tea-button.module.css`도 참고한다. 영냥이 `--yn-*`와 꿀꿀 `--cd-*`는 별도다.

## 남은 작업과 완료 기준

- [ ] 보관함·허브 2화면을 달빛 예화로 재구성: 정보 위계·이미지·타이포·간격·선택 상태를 함께 개선한다.
- [ ] 저장 결과의 **전체 25개 어댑터 및 공통 저장 25개 상품 유형**에 대해 원래 결과 화면·톤·재사용 컴포넌트를 연결표로 확인한다. 숫자는 저장 경로/상품 수이지 50개 독립 서비스라는 뜻이 아니다.
- [ ] 전용 리더는 보존하고, 현재 `StoredReading.Structure`로 표시하는 유형은 해당 서비스의 기존 결과 표현을 재사용하는 읽기 전용 어댑터로 개선한다. 서비스명을 붙이거나 배경만 바꾸는 것으로 완료 처리하지 않는다.
- [ ] 완료·과거·부분 결과에서 전체 저장 챕터와 명식/명반/카드/표/대화가 유지되며, 직접 URL·새로고침·뒤로 가기가 동작한다.
- [ ] 360/390/430px+데스크탑 실제 렌더, 예화·텍스트 대비, 44px 터치, 마지막 카드/CTA 좌표, reduced-motion을 검증한다. 실제 캡처는 visual-checker가 독립 검토한다.

## 반드시 보존할 경계

`GET /api/records`, `GET /api/records/detail`의 소유권·페이지네이션·부분 실패 계약과 검색/필터/스크롤 복원을 보존한다. 완료 재열람에서 결제·이용권 차감·LLM·계산·복구 POST는 0회여야 한다. 기존 생성 페이지 전체를 마운트해 재현하지 않는다.

가격은 기존 PriceBadge/상품 레지스트리, 공식 명칭은 ‘마스터 인연의 서’다. 영냥이 자동 복구→최종 실패 환불 로직은 이번 디자인 범위에서 변경하지 않는다. 데이터 이동도 없다. TTL 삭제·미저장·요약만 저장한 과거 결과는 UI로 전체 결과를 만들어낼 수 없다.

상세 근거: `docs/records-service-inventory.md`, `docs/records-consultation-work.md`, `docs/yeongnyangi-terminal-refund.md`. 로컬 기존 mock 자료: `build-cache/records-hub/verification.json`, `archive-360.png`, `hub-360.png`(git에 없음; 재생성 가능).

## 검증·재개

```powershell
Set-Location -LiteralPath 'D:\Development\code-destiny'
git status --short
git rev-parse HEAD
git merge-base --is-ancestor d0953b251b202fbe441e68d8c3638e451c9750ea HEAD
Get-Content -LiteralPath 'D:\Development\code-destiny\docs\prompts\2026-10-05-records-consultations-yehwa-ui-prompt.md'
npm run check:fast -- --plan
```

다음 행동은 원본 서비스별 결과 화면 조사와 읽기 전용 렌더러 대응표 작성이다. 그 뒤 자율 구현→변경 기반 검사→실제 화면 검증→main 전달·정확한 SHA CI 확인까지 진행한다. 실결제·실환불·실LLM·운영 DB·운영 승격은 승인 범위가 아니다.
