---
status: done
implementationStatus: shipped-to-main
updated: 2026-10-01
next: 후속 과제(아래)는 사용자가 고를 때만 착수한다. 이 작업 자체는 완료.
---

# 영냥이 전용 이용권 리뉴얼 (2026-10-01)

## 결과

| 커밋 | 내용 |
|---|---|
| a7e0716dc | 🔴 가격·회수 교체: 전 어종 5·10·20회, 10/15/20% 할인, 30일, `-v2` id, policyVersion `yeongnyangi-pack-20261001` |
| 99183f6e5 | `/points#fish-packs` UI를 달빛 이용권(꽃돼지) 카드·결제 모달과 같은 구조로 |
| d69a959bd | 꽃돼지 Premium 카드에 연이 추천 장식 이미지 |

- 히어로: `yeoni-alliance-v1.webp`와 `paymentAllianceCopy`를 재사용한다. 월정석 카드의 1/N과 예시 줄은 `resolveServerFeaturePricing('yeongnyangi-saju-mackerel')`에서 계산한다(하드코딩 없음).
- 카드: 전역 `moon-plan-card`, `btn-moonlight`를 쓴다. 10회(가운데) 카드에는 "영냥이 추천" 배지와 `recommend-badge-v1.webp` 오버레이가 붙는다.
- 구매 모달: 꽃돼지 모달 순서를 따른다. 조건 → 선물 입력과 안내 → 환불 동의 → 카드 타일 1개 → 닫기.
  - 영냥이 세트는 prepare가 `card_general` 고정이라 결제 타일이 하나뿐이다.
  - Esc와 배경 클릭으로 닫는다. 결제 중에는 닫히지 않는다. 열면 제목으로 포커스가 가고, 닫으면 트리거로 돌아온다.
  - z-index는 `z-[1000]`이다. 하단 탭바 `.cd-mnav`가 z 960이다.
- 결제 실행 코드(`buy`/`resume`/`checkOrder`, `service-pack-client.ts`)는 변경하지 않았다.
- 이미지:
  - 생선 세트는 360px `-v2`로 다시 인코딩했다.
  - 추천 배지 2장은 codex image_gen으로 생성했다. 영냥이는 정본 외형(흰 장모·마법사 모자)이다. 출처는 각 폴더 `provenance.md`에 있다.
  - 원본 PNG는 `.tmp/recommend-badges/`에 있다(커밋하지 않음).

## 함정

- `/points`에는 전역 규칙 `body:has(main.moon-shop) header:not(.moon-shop-hero){display:none}`(styles/globals.css)이 있다. 섹션 안에 `<header>`를 쓰면 화면에서 사라진다. div를 쓴다.
- `service-pack-copy.ts`의 `COPY`는 테스트가 JSON.parse한다. 큰따옴표를 쓰고 후행 쉼표를 두지 않는다. 12개 로케일 전부에 키가 있어야 한다.
- 꽃돼지 모달(PointsClient)은 원래 `z-[180]`이라 하단 탭바 아래에 깔렸다. 후속 #1에서 `z-[1000]`으로 고쳤다. 토스트는 모달 위에 와야 해서 `z-[1010]`이다.

## 검증 (실측)

- `node --test __tests__/ui/service-pack-pending-resume.behavior.test.mjs`: 22/22 통과.
- 영냥이 세트 jest 2개 파일: 115/115 통과.
- `npm run check:fast`(critical): exit 0, jest 4864/4864 통과.
- 로컬 dev에서 카탈로그 API를 정책표로 스텁했다. 360/390/768/960 폭에서 visual-checker 판정을 받았다.
  - 통과: 구조 일치, 오버레이, 줄바꿈, 자가·선물 모달, 가로 넘침 없음.
  - 실결제는 하지 않았다.

## 후속 과제 (보고만, 미착수)

1. ~~꽃돼지 결제 모달이 하단 탭바(z 960)에 가려질 수 있다.~~ **완료(2026-10-01)**
   - 재현: 360×640에서 모달 맨 아래 "닫기"를 누르면 탭바의 "모든 운세" 링크가 눌렸다.
   - 수정: 모달 `z-[1000]`, 토스트 `z-[1010]`. 수정 후 닫기 버튼이 눌리고 배경이 탭바를 덮는다(DOM 실측과 visual-checker 판정).
2. ~~꽃돼지 Premium 칩 "일반 10,000원 이하 이용 가능"이 중복으로 보인다.~~ **완료(2026-10-01)**
   - 원인: 정책 칩(`formatSubscriptionPlanPolicy`)과 기능 칩 `under*` 키가 같은 문구를 냈다. Standard·VVIP도 같았다.
   - 수정: 카드 기능 칩에서 `under*`를 뺐다. 960 폭 DOM 실측에서 카드마다 해당 칩이 1개다.
   - 별건(미해결): `verify:sitemap-drift`가 이 수정 이전부터 실패한다. /dream·/love·/manse 등 16개 경로의 서명이 바뀌었다. 이 수정을 빼고 돌려도 실패한다.
3. 취소·실패 복귀가 다른 탭에서 일어나면 sessionStorage 스냅샷이 없어 구매 버튼이 잠길 수 있다(추정, 미재현).
4. 배포 시점에 남은 `-v1` 미완료 주문은 "이어가기"가 막힌다. "결제 확인"으로는 처리된다.
5. 영냥이 세트 결제수단은 카드만 된다. 간편결제를 붙이려면 결제 실행을 바꿔야 한다(RED).
6. 해외 원화 환산 안내(`useOverseasCharge`)가 세트 카드에 없다.
7. `SubscriptionSection`(PointsClient)이 `{false&&}` 안에 있어 죽은 코드다.

## 재개 정보

~~~text
D:\Development\code-destiny에서 docs\handoff\yeongnyangi-pack-ui-renewal-2026-10-01.md를 읽고, git status와 d69a959bd 이후 커밋을 확인한 뒤 사용자가 고른 후속 과제 하나만 진행하라.
~~~
