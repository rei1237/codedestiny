disposition: ship

별도 승인 comp·QUALITY BAR 보드는 제공되지 않았다. 이번 검토는 `basic-entry-direction.md`의 code-led 기존 세계 확장과 새 캡처를 기준으로 한다. 구현 코드와 캡처를 수정하지 않은 fresh reviewer 검토이며, detector는 다시 실행하지 않았다. 최종 verdict의 `ship`은 앞선 전체 검토가 남긴 수정 1건과 그 수정에서 발생한 회귀만 채점한 결과다.

## persistence

pass — `PRODUCT.md`, `DESIGN.md`, 표면 방향 문서가 존재한다. 별도 새 세계가 아니므로 global 디자인 문서의 교체나 concept seed를 요구하지 않는다. `artifacts/fortune-consultation-ux/basic-entry-v1`의 필수 entry/form 32장, result/neo 8장 및 contact sheet 3장을 확인했다. entry/result는 component, form은 실제 기존 modal의 viewport 캡처로 구분된다. 갱신한 `astrology-form-360.png`에는 예시 질문, 포커스, 55/1000 카운터 및 상담 시작 버튼이 보여 이전 증거 불일치가 해결됐다. API mock·외부 origin 차단·결과 렌더링 fixture라는 검증 범위가 `metrics.json`에 기록돼 있다. 실결제·실 LLM·운영 DB·배포 증거로 해석하지 않는다.

## fidelity

| 요소/약속 | 판정 | 근거 |
| --- | --- | --- |
| TYPE | match | 기존 서체와 큰 제목→체계명→설명→가격→행동의 위계가 유지된다. 서양 desktop 제목은 2행이며 베다의 좁은 desktop 카드도 제목 2행이다. |
| MATERIAL | match | 체계별 연이 래스터 장면이 실제 초점 요소로 드러난다. 황동·천·달빛은 이미지가 담당하고 설명·입력·결과는 평평한 읽기 표면이다. 지도 문양을 계산 증거로 주장하지 않는다. |
| GROUND | match | 크림/로즈의 연이, 짙은 플럼과 밝은 본문의 네오·베다 표면이 방향과 일치한다. CSS 기본/placeholder 토큰의 배경 대비는 밝은 표면 7.36/7.62:1, 어두운 표면 10.75/9.66:1이다. 이는 선언된 토큰 계산이며 모든 기존 자손의 실측 명암비를 뜻하지 않는다. |
| STORY·체계 구분 | match | 자미두수 궁/별, 숙요 본명숙, 서양 행성/하우스/각도, 베다 라시/나크샤트라/다샤가 별도 설명·예시로 이어진다. |
| FIRST VIEWPORT·넓은 카드 분할 | match | 충분한 실제 카드 폭에서 설명과 장면을 좌우로 놓는다. `astrology-entry-1440.png`의 과도한 제목 줄바꿈이 해결됐다. |
| 좁은 desktop 베다 | adaptation | `@container fc-consultation (min-width: 680px)`로 실제 446px 카드에서는 세로 배치한다. 방향의 약 1:1 분할은 가용 폭에서 시행하며, 기존 modal을 보존하면서 읽기 폭·한 줄 CTA를 확보하기 위한 접근성 적응이다. |
| 모바일 CTA·폼 가용 폭 | match — resolved | 수정 후 동일 `astrology-entry-360.png`의 좌우 여백과 CTA 전체가 보이고, `astrology-form-360.png`에서 textarea 오른쪽 포커스 링·최소 5자 입력 안내·상담 시작 버튼이 모두 보인다. 390/430/1440px에서 새 잘림이나 위계 붕괴가 생기지 않았다. |
| signature interaction | match | helper가 기존 details를 열고 textarea에 포커스하며, 예시는 기존 input 이벤트를 발생시킨다. 16개 시나리오의 keyboardDisclosure/exampleInput 기록 및 실제 form 캡처에 적용 값·카운터·포커스가 있다. |
| Read 결과·검증 진실성 | match | 결과는 입력 disclosure 밖에 있고 제목·짧은 문단·행동 조언이 읽힌다. 네 result 캡처는 화면 검증용 대역이며 실제 상담/저장 결과가 아님을 표시한다. 가격은 registry fixture임이 기록돼 있다. |

## ceiling

이번 확장 범위의 시각적 수준에 도달했다. 실제 장면, 표면·문자색을 함께 바꾸는 테마, 명확한 제목과 한 줄 행동이 방향을 구현한다. 별도 QUALITY BAR가 없어 그것과의 비교 판정은 하지 않는다. 장식·모션·재브랜딩을 추가할 이유는 없다. detector의 CSS 타입 크기 advisory는 이번 방향의 실제 제목/입력 가독성과 함께 판단했으며 추가 수정 요구로 삼지 않는다. 기존 modal 주변의 아이콘·별도 상품 표면·레거시 명암 문제는 이 진입 카드 변경의 새 결함으로 분류하지 않는다.

## material_fixes

1. resolved — [Floor / FIRST VIEWPORT] `styles/basic-fortune-library.css:506`의 기존 `#astroModalOverlay #astroBodyWrap.fr-report` 단일 트랙에 `grid-template-columns:minmax(0,1fr)`를 적용해 부모 폭 283px 안에서 카드가 306px로 남던 원인을 수정했다. 동일 `astrology-entry-360.png`와 `astrology-form-360.png`에서 양쪽 여백·오른쪽 포커스 링·입력 보조문·CTA 전체가 보이는 것을 직접 확인했다. 390/430/1440px의 동일 서양 캡처에서 이 수정이 만든 새 회귀는 발견하지 않았다. 부모는 조상 clip bounding 검사까지 추가한 16/16 통과를 보고했으며, 검토자는 이 항목의 캡처와 소유 스타일을 직접 확인했다. 남은 항목은 clear다. 이는 남겨진 수정 1건의 resolved 판정이며 새 전체 품질 탐색은 하지 않았다.

## keep

연이의 체계별 래스터 장면, 크림/로즈와 플럼의 문자색 세트, 기존 modal/DOM ID/controller와 결제·이용권·월정석·단건 가격 출처·인증·API·DB·결과 복구 계약을 유지한다. 별도 `/…-ai` 상품과 계산·해석 품질로 범위를 확장하지 않는다.
