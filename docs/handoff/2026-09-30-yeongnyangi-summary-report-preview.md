---
status: done
updated: 2026-09-30
next: superseded by docs/handoff/2026-09-30-fortune-report-external-ai-astra-handoff.md; follow the external AI prompt workflow
---

# 영냥이 운세 요약 보고서 프리뷰

이 프리뷰 방향은 종료됐다. 아래 내용은 당시 기록이며, 현재 구현과 검증은 [외부 AI 프롬프트 전환 문서](2026-09-30-fortune-report-external-ai-astra-handoff.md)를 따른다. 서비스 내 보고서 PNG 자동 생성은 제거했다.

## 작업 위치와 범위

- 작업 위치: `C:\Users\user\.codex\worktrees\fortune-summary-report\code-destiny` (동시 작업 중인 `D:\Development\code-destiny`의 기존 미커밋 변경 보존)
- 저장된 유료 결과의 차트와 상담 문장만 투영해 결과 상단에 보고서를 표시한다. 이 경로의 추가 LLM 호출은 0회다. 결제 정책과 가격은 바꾸지 않았다.
- 사주, 베다점, 서양 점성술, 자미두수, 타로, 숙요점에 서로 다른 동물을 연결했다. 타로의 상담 카드 그림과 탄생 상징 카드 그림은 기존 영냥이 타로 덱을 사용한다.
- 새 공유 URL은 명시적 동의 후 256비트 토큰으로 생성된다. 공개 페이지는 허용 필드만 저장하고 결제 접근권 및 차트 변경을 열람 시 다시 확인한다. 해제와 30일 만료를 지원한다.
- 상단에 잘린 발 모양이 있던 네오 원본 `public/images/fortune-chat/persona/neo-greet.webp`를 수정하고, 보고서에는 `public/assets/yeongnyangi/report/v1/ziwei-neo-clean.webp`를 사용한다.

## 모의 검증과 이미지

- `node --test __tests__/ui/yeongnyangi-summary-report.test.mjs __tests__/ui/yeongnyangi-birth-symbol.test.mjs __tests__/worker/yeongnyangi-report-share.test.mjs`: 10/10 통과.
- `npx tsc --noEmit --pretty false`: 통과.
- `npm run build:worker`: dry-run 통과.
- `node scripts/render-yeongnyangi-summary-fixtures.mjs <출력 경로>`: 다섯 운세의 1080×1350, 1080×1920, 분할 보고서 PNG 생성.
- `npm run check:fast`: 기존 `__tests__/worker/pass-consumption.refund.test.js` Family 환급 사례 1건 실패. **main 원본 체크아웃에서도 동일한 단일 테스트가 같은 값으로 실패했다.** 이 변경의 통과 증거로 간주하지 않는다.
- 이미지 및 화면 모의 시안: `C:\Users\user\.codex\visualizations\2026\09\29\01a0ef95-9d60-7e42-aa74-e18bad60e685\yeongnyangi-summary\`.

## 완료 전 확인할 항목

- 언어: 서비스 전체 지원 로케일에 맞춘 보고서·PNG·공유 페이지 문구와 범례 정리가 미완료다. 현재 신규 UI 문구는 한국어 중심이다.
- 차트: 사주 원국 표의 저장값 순서와 일주 강조는 구현했지만, 베다 D1·서양 원형 차트·자미 12궁을 각 체계의 완전한 도식으로 표현하는 단계는 남았다. 실제 구매 fixture로 원본 차트와 시각 비교가 필요하다.
- 요약: 현재 저장된 상담 문장만 결정적으로 추출한다. 근거 ID 연결과 별도 검증 스키마를 포함한 LLM 편집 생성은 아직 없다. 따라서 전문적인 성향·강점·주의 패턴이 모든 상품에서 완성됐다고 볼 수 없다.
- 타로 탄생 상징: 양력 수비학 v1 계산·8/11·22 매핑과 잘못된 날짜 검증은 있다. 음력 윤달 변환, 기존 생년월일의 활용 동의 확인, 계산 결과 영속 저장은 남았다.
- 자산: 캐릭터 시트는 같은 원본을 정면/보고서/아이콘 크기로 보여 준다. 별도 포즈와 아이콘 자산 제작은 남았다. 숙요 달토끼의 배경 투명도도 재작업이 필요하다.
- 공유: 공개 페이지와 모의 DB 경계는 테스트했지만, 운영 Kakao SDK/도메인/OG 크롤러/모바일 Web Share/실제 권한 DB·캐시 동작은 미검증이다. OG는 현재 정적 동물 이미지이며 개인별 공유 카드 이미지가 아니다.
- 제품: 실제 결제 후 결과·보관함·실기기·전체 다국어 회귀를 확인하지 않았다. 프로덕션 배포 및 실제 유료 LLM·결제는 실행하지 않았다.

## 다음 작업

1. 위의 미완료 항목을 해결하고 실제 저장 결과 fixture로 다섯 운세를 비교한다.
2. `npm run check:fast -- --plan` 후 `npm run check:fast`를 실행한다. Family 환급 테스트의 기존 실패는 소유 작업과 조율해 해결한다.
3. 사용자 승인된 범위와 저장소 전달 규칙을 확인한 뒤 main에 반영하고 main CI를 확인한다. 이 프리뷰는 아직 main에 반영되지 않았다.
