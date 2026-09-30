# 기본 사주 달빛 상담 개선

- 날짜: 2026-09-30
- 범위: 꿀꿀 기본 사주 상단, 대운·종합 풀이 소개, 대운 상세 읽기 안내.
- 방향: 연이는 로즈빛 편지, 네오는 달빛 전략실. 다른 상담자의 기준으로 읽는다는 혼합 문구를 제거한다.
- 계산·가격·권한: 기존 엔진, 서버 registry, 해금 컨트롤러 유지. 추가 해설은 기존 대운 간지·나이·평가와 다음 구간을 사용하며 별도 예측 계산이나 LLM 호출은 없다.
- 서체: 기존 R2 CodeDestinySerifKR unicode-range 청크와 font-display:swap 재사용. 본문은 기존 CodeDestinyBody 스택. 새 폰트와 R2 업로드 없음.

## 이미지 출처

- 도구: 내장 image_gen (CLI/API 호출 아님).
- 캐릭터 참고: public/images/saju/yeoni-clue-160.webp.
- 생성 원본: C:/Users/user/.codex/generated_images/01a0efe6-516d-7dd3-8aee-ccb1d3103cdf/exec-866b4855-077c-4156-878d-3b388eec4e9b.png.
- 적용: public/images/saju/yeoni-moonlight-reading.webp, 960×640, 149978 bytes. sharp WebP quality 82 변환. 종합 풀이·대운 소개에서 공용, lazy loading 및 크기 지정.
- 최종 프롬프트: Use case: illustration-story. Create a refined landscape storybook illustration for Korean saju reading. Reference image is the identity reference: preserve Yeoni the adorable pink pig, blossom on head, gentle big brown eyes. Yeoni sits reading an open traditional book at a small wooden desk beside a moonlit window and flowering branch. Warm rose cream and champagne gold, watercolor with delicate ink details, quiet premium Moonlight Yehwa mood. Cute immersive character clearly visible, no text, no letters, no watermark. Single complete landscape scene usable both for comprehensive saju and ten-year-cycle reading. Do not include another character.

## 검증 범위

- scripts/verify-saju-summary-browser.mjs: 외부 네트워크 차단. mock 권한으로 종합 풀이 기존/복원 상태 및 대운 잠금→본문 제공, 연도 10개, 모드 전환 시 권한 유지 검사. 360/390/430/1280px.
- 새 삽화와 기존 캐릭터 complete/naturalWidth로 실제 로딩 확인. 화면 캡처: 시스템 임시 디렉터리 cd-saju-moonlight.
- 외부 R2 폰트는 브라우저 mock 검증에서 차단하므로 원격 다운로드 성능 실측이 아니다.
- 실제 결제·실 LLM·운영 DB 쓰기·운영 배포·실물 모바일 검증 없음.

## 대운별 명식 상담 확장

- 대운 천간 오행·점수 구간으로만 고르던 대운 상세를, 일간·월지·원국 십성 반복·조후·억부·종격·대운 천간/지지의 십성·기존 합충 결과에 연결한 9개 항목으로 교체했다.
- 십성/getQuantumElType/_getDwHapResults는 기존 엔진 결과만 사용한다. 표시 모듈은 순수 데이터→상담문 변환이며 점수·달력·과금 계산을 추가하지 않는다.
- 출생시간 미상일 때 시주를 원국 반복 수와 관계 위치 표기에서 제외하고 정오 대입 계산의 한계를 알린다. 합을 곧 합화 확정으로 서술하거나 충을 사고·이별로 단정하지 않는다.
- 연이/네오 전환 시 이미 열어 둔 대운 상담의 목소리도 갱신한다. 결제된 대운인지 기존 게이트로 확인하고, 재계산/네트워크/추가 과금은 없다.
- 테스트: 같은 대운/다른 명식, 같은 명식/다른 대운, 비변이, HTML escape, 종격/시간미상, 9개 항목, 브라우저 대운 선택 및 모드 전환.
