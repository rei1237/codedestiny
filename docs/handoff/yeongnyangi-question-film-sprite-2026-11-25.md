---
status: done
updated: 2026-11-25
next: 없음(완료). 운영 배포는 미승인 — 별도 요청 때만
---

# 신년운세 네오 영상 중복 제거 + 영냥이 질문 화면 영상·생성 화면 스프라이트

요청 원문(2026-11-25): "아직도 꿀꿀 신년운세에 네오 영상이 2개로 중복되고 대기화면은 생성 대기가 아니라 질문 입력화면의 각 사주부터 타로 자미두수 이런 화면에서 영냥이가 동적으로 나오도록하라는것이었고 생성화면은 스프라이트 시트를 통해서 영냥이가 운세를 봐주고 있다고 진행상황 그래프와 함께 부드럽게 나오도록 만들어줘 컨텍스트가 너무 길면 프롬프트를 만들어서 진행해주도록해줘"

계획 원본: `C:\Users\user\.claude\plans\compiled-snacking-rabin-of-9acd63da-0701-4724-b657-4975fb0eb732.md`

## 첫 행동
이 문서의 `next` 단계부터. 워크트리에서만 편집한다(루트 체크아웃에는 옆 세션 미커밋 변경).

## 지금 상태
- 워크트리: `D:\Development\codedestiny-worktrees\yn-film-sprite-20261125-130603`
- 브랜치: `wt/yn-film-sprite-20261125-130603` (base origin/main 6f4d59f064)

## 승인 상태
main push까지 승인(2026-11-25 계획 승인), 운영 배포 미승인.

## 작업 규칙과 함정
- 과금 LLM·실결제 금지. 생성 화면 검증은 mock 주문 상태로.
- 가짜 진행률 % 금지(ReadingLoading.tsx 주석). 그래프는 manifest·saved/total 로만.
- `question-checkout.module.css` 의 `.entry img{88px}` 규칙이 영상 포스터 img 에도 걸린다 — 범위 한정 필요.
- 질문형 흐름은 domain==='fusion' 이면 열리지 않는다. domainFixed 가 아니면(체계 미지정) fusion 영상.
- 생성 파일 충돌은 `npm run sitemap:generate`·`npm run sync:public` 으로 재생성, 손 머지 금지.

## 설계
1. 신년운세: `status==="reading"` 동안 히어로 `MasterRoomScene` 미렌더 → 생성 중 영상은 GenerationProgress 1편.
2. 영냥이 질문 입력(`QuestionEntry`): `domain` prop → `YeongnyangiRoomScene shot="intro"`. QuestionCheckout 이 전달, Experience 빠른 진입은 fusion.
3. 영냥이 생성(`ReadingLoading`): 대기 영상 대신 `YeongnyangiReadingSprite`(`{domain}-loading-sprite-v1.webp`, 4×2=8프레임, 2172×724, 두 레이어 교차 페이드). reduced motion=첫 프레임 정지, 화면 밖 정지, 로드 실패 시 기존 정지 그림. manifest/total 이 있으면 장 수만큼 칸 그래프(완료 채움·현재 장 은은한 애니메이션·N/M장), 없으면 기존 흐름 막대. Result.tsx `<progress>`와 중복 정리.
4. 문서: docs/design/consultation-room-media.md 표에 신년·영냥이 질문/생성 행.

## 단계
- [x] ① 신년운세 중복 제거 — b3af99b346 (생성 중 상태는 mock 에서 재현 불가, 코드로만 확인)
- [x] ② 영냥이 질문 화면 상담별 영상 — bb124704a2
- [x] ③ 생성 화면 스프라이트 + 칸 그래프 — 1d7746aeba
- [x] ④ 문서 표 — e961709595
- [x] 실화면 검증 390·1280 (visual-checker 3회: 빈 진행 카드·현재 칸 구분 지적 반영 후 통과)
- [x] origin/main 머지(이동 없음, 불필요) → sync:public → check:fast → check:pre-push → CI 확인 → push
- [x] 정리(문서 done, 워크트리 배수, 스크래치)
