---
slug: today-yeoni
primaryTarget: app/today/TodayHubClient.tsx
relatedTargets:
  - app/today/DailyTarot.tsx
  - app/today/today-hub.module.css
  - app/today/daily-tarot.module.css
mode: Operate
---
# 연이와 오늘의 운세

운세별 기존/생성 연이 이미지로 사주·숙요·베다·수비학·타로를 구분한다. 한국어 일일 화면에 한정하며 기존 계산, 탭 키보드 이동, 프로필, 상세 지연 요청, 무료 타로 저장과 공유를 유지한다.

딥 로즈 배경과 명조 제목, 네 개의 이미지 선택 탭, 이미지와 해석을 나란히 읽는 데스크톱 결과 패널. 모바일은 그림 다음 해석으로 이어진다. 무료 타로는 크림색 찻집 테이블로 구분하며 22장 중 세 장 선택을 유지한다. 앞면은 찻집 canonical mapping의 major number, 뒷면은 찻집 앨범 공용 에셋. 장식 일러스트를 실제 뽑힌 카드처럼 표시하지 않는다.

새 이미지의 원본 프롬프트와 변환 기록은 public/images/today/*.provenance.md. 기존 시스템 이미지 원본은 수정하지 않는다. 전역 DESIGN.md나 다른 기능의 팔레트는 변경하지 않는다.
