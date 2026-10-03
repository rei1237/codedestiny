# 10장 캠페인 v2

- 최종 순서: manifest.json (1번은 기존 assets 원본 참조)
- 편집 원본: card-02.html ~ card-10.html
- 게시용: cards/02.jpg ~ cards/10.jpg
- 새 원화: art/*.png, built-in ImageGen 직접 생성
- 정확한 제작 프롬프트: generation-prompts.json
- 계정별 게시 본문: posts.json / 상위 captions.md
- 검증 기록: validation.json / layout-check.json

모든 HTML을 1080×1350 브라우저 뷰포트에서 열고 이미지 로딩 완료 후 CUA 스크린샷으로 출력했다. 6번은 실제 서비스 캡처, 7·8번은 실제 컴포넌트의 가상 입력 캡처다. UI를 재생성하지 않았다. 새 캐릭터 그림에는 네오가 없으며 1번 원본 및 이전 교체본은 보존했다.

예약은 2026-10-05 09:00 KST Codex heartbeat 10-5-threads. 실제 운영 가격/할인과 게시 대상 확인 후 게시한다. Threads 자체 예약 등록이나 운영 승격 완료를 뜻하지 않는다.

검증: 원본 SHA, 9개 이미지 크기, 11개 본문 500자 이하, 이미지 로딩·본문/푸터 겹침 없음 확인. npm run check:fast -- --plan 실행. check:fast는 doc-freshness와 다수 paid gate 통과 후 로컬 스위트에서 출력 정체로 중단하여 전체 통과로 표시하지 않는다. GitHub CI를 최종 게이트로 확인한다. 결제 API·가격·인증·DB 변경 없음.
