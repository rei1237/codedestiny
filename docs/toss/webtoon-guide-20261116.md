# 원본 웹툰 안내 이식과 QR20

## 사용 경로

비공개 버전 **20261116-20**에서 홈 → **어디로 갈지 고민되면, 이용 안내 웹툰** → 이야기 선택 → 마지막 상담 버튼을 누른다. 기본 안내5편, 대표6편, 전문7편, 흑월1편을 원본 그림·대사로 읽을 수 있다. 대표·전문 목록은 기본 접힘이며 기존 캐릭터 홈과 간편 입력은 유지한다.

PC 모의 미리보기는 `http://127.0.0.1:4333/preview`다. 이전 간편 UI의 `4330`도 유지하며 두 주소의 모의 기록은 별도다. 파일 사본과 재실행 안내는 `C:/Users/user/Downloads/CodeDestiny/20261116-webtoon-guide/`에 있다. 실제 결제·LLM·운영 DB 쓰기로 폴백하지 않는다.

## 재사용과 변경 범위

- 원본: `lib/brand/service-guide-webtoon.mjs`, `lib/brand/consultation-webtoons.mjs`, `app/consultations/home-stories.ts`, `app/components/webtoon/CutReader.tsx`.
- 토스: 기존 `StoryLibrary.tsx`와 가상 모듈을 확장했다. 원본 안내5편을 연결하고 기존14편의 인연의 서·작명 CTA도 복구했다. 전문 이야기에서 상담으로 이동했다가 돌아오면 읽던 이야기와 분류를 복원한다.
- 웹 주소와 토스 진입 차이만 명시 매핑: 사주→`/manse`, 오늘→`/today`, 타로→`/tarot-library`, 숙요→`/sukuyo`, 영냥이→`/yeongnyangi/`.
- 웹툰은 게스트 공개 설명이다. 창작 이야기이며 실제 결과·후기가 아니라는 원본 고지를 유지한다. 상담 화면의 로그인·상품 정책은 별도이며 이용권·월정석·단건 결제 가격/권리, 계정별·서비스별 보관함, 결과 소유권은 변경하지 않았다.
- 일반 AIT는 기존 원화 스트리밍 방식이다. 로컬 모의판만 원본 그림을 `__story-art`로 포함한다. 모의판의 136,665,394bytes는 업로드용 번들이 아니며 일반 AIT의100MB 게이트를 완화하지 않았다.

## 검증과 배포 증거

- 고정 source `3102ddaeb87e0bdb1bfdb17781ef2655923496a0`.
- 자동 main CI [43731345878](https://github.com/rei1237/codedestiny/actions/runs/43731345878) SUCCESS, 전체 Linux CI [43731375338](https://github.com/rei1237/codedestiny/actions/runs/43731375338) SUCCESS.
- AIT `C:/Users/user/Downloads/CodeDestiny/20261116-webtoon-guide/linux/ai-saju-studio.ait`.
- SHA256 `531d59f810442474741cf230c8e8111330bbcac8b1cc9037034b87375efcccc0`; archive87,859,808 / expanded99,112,664bytes. 휴대 가능한 Linux 경로·일반판 표시·원화 스트리밍 PASS. `__story-art`와 모의판 marker 미포함.
- 원본 이미지428 URL 읽기전용 GET 전부200/206 image/*, 부족자산0. 원본 데이터 단위2, 기존 자산 회귀4, Toss typecheck PASS.
- 웹툰 구현 check:fast 전체 PASS: paid77/lint/sitemap/typecheck/Node5104/정책/Worker dry build/encoding, Jest479 suites·8012tests PASS(1skip). pre-push PASS.
- 실제 동일 Linux AIT에서19편 모든 그림 디코딩·원문·CTA·360/390/430·브라우저 뒤로가기·모의 네이티브 뒤로가기·분류 복원 PASS. 홈/질문 복원/작은 화면 CTA와 기존 저장 원문·단절 복구·다른 계정 거부·추가과금0도 PASS.
- 일반판의 기존 `home_view` 분석 이벤트25건은 `/api/toss/events`와 event/fields를 엄격 검사한 뒤 모두 차단했다. 그 밖의 변경 POST0. 모의판의 모든 POST0과 구분한다. 초기 모든 POST0 단언을 수정한 테스트를 같은 AIT로 다시 통과시켰으며 제품 번들은 변경하지 않았다.
- 검증 로그/JSON/캡처는 위 폴더 `verification/`에 보존했다. 테스트 단언 수정b3ff46a97도 정식 check:fast 전체와 pre-push PASS(Node5104, Jest479 suites·8012tests,1skip) 후 main에 병합했다. 고정 AIT 런타임은 변경하지 않았다.

## 콘솔과 남은 확인

QR **20261116-20** 등록·빌드 완료, **검토 필요** 상태. URI는 `intoss-private://ai-saju-studio?_deploymentId=01a1dffc-1b66-760e-88a1-62497e6ae5cc&host=appsInTossHost`다. 같은 산출물 폴더에 QR png/svg·링크txt·콘솔상태json을 보관한다.

실결제·실LLM·운영 재배포·테스트 푸시·새 검토 제출·공개 출시를 실행하지 않았다. 실제 휴대폰의 그림 로딩·토스 뒤로가기·키보드는 사용자가 추가 확인한다. QR18의 로그인 확인을 QR20의 전체 실기기 검증으로 확대하지 않는다. 음악32MiB 원곡 저장과 신규 상품/SKU 운영 활성화 등 기존 출시 게이트는 별도 유지한다.
