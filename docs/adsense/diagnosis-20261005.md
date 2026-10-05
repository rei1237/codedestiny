# 2026-10-05 AdSense 재진단

## 확인한 현재 상태

- 사용자가 알려 준 이전 거절 사유: 가치가 별로 없는 콘텐츠.
- 2026-10-05 계정 상세 UI 실측: 준비 중 / 사이트의 광고 게재 가능 여부 검토 중 / 리뷰가 요청됨. 요청 시간은 2026-09-26 23:40 KST. 10월 5일 새 신청 접수는 화면에서 확인되지 않았다.
- 계정이 안내하는 레코드와 공개 ads.txt가 일치한다: `google.com, pub-9863227498729828, DIRECT, f08c47fec0942fa0`.
- HTTPS 루트 ads.txt: 200, text/plain; charset=utf-8. HTTP와 HTTPS www: 루트 HTTPS로 301 후 200. 현재 파일 누락·게시자 ID 불일치는 재현되지 않았다.
- robots.txt: 200, Mediapartners-Google 공개 경로 허용. 계정 ads.txt 상태는 여전히 찾을 수 없음. Google의 실제 IP/WAF 로그나 과거 크롤 결과는 미확인이다. 일반 요청 성공이 Googlebot 접근의 증명은 아니다.
- 상세 화면에는 ads.txt 재확인 버튼이 노출되지 않았다. 소유권 코드 안내만 열어 읽었으며, 사이트 삭제·재제출·약관·계정 설정 변경은 하지 않았다.

## 원인 판단

ads.txt 인식과 콘텐츠 심사는 별도 항목이다. 현재 파일을 다시 만들거나 게시자 ID를 바꿀 근거는 없다. Google 공식 안내는 ads.txt 반영에 며칠, 요청량이 적으면 최대 한 달이 걸릴 수 있다고 설명한다. 대기는 콘텐츠 품질 문제의 해결책을 대신하지 않는다.

과거 심사에서 어떤 URL이 원인이었는지는 계정이 제공하지 않아 확정할 수 없다. 확인된 품질 위험은 영친관계 글의 비교 통계 없는 우열·빈도·관계 지속성 주장이다. 운영 HTML과 정본에서 직접 확인했다. 검색 도구가 보여 준 오래된 페이지에는 과거 검수 고지가 섞여 있었으므로 검색 캐시를 현재 운영의 증거로 사용하지 않았다.

## 이번 수정

`app/insights/seo-growth-articles.js`의 기존 sukuyo-eishin 원고를 정정했다. 가장 이상적인 궁합, 갈등이 적음, 사업 파트너 성공·장기 지속에 유리하다는 주장을 제거했다. 입력·방향·거리 표지를 구분하고, 연락 부담의 가상 사례, 역할 분담과 동의 확인 질문, 해석의 한계를 추가했다. 새 글 양산이나 분량 채우기를 하지 않았다.

`seo-titles.js`, `seo-descriptions.js`와 숙요 공개 읽기 사본을 함께 맞췄다. AI 편집을 인간 검수로 등록하지 않았으며 CONTENT_REVIEWS와 광고 허용 게이트를 변경하지 않았다. 가격·이용권·월정석·단건 결제·인증·API·DB·계산 엔진·라우팅·noindex 정책은 유지했다.

추가로 `app/insights/articles.js`의 `sukuyo-three-group-types-guide`와 `saju-job-change-timing-checklist-2026`을 정정했다. 전자는 거리별 결혼·사업 우열과 감정 판독 주장을 제거하고, 후자는 운세별 임의 가감점과 퇴사·합격 단정을 제거했다. 직무·조건·채용 단계의 확인 상태와 가상 사례를 제시하고 메타 설명을 일치시켰다. 숙요 본문 사본 두 개는 기존 생성기가 내용 해시 파일명으로 교체했다.

## 접근성 표본 검사

`node scripts/adsense-crawl-audit.mjs https://code-destiny.com 60`: 60개 모두 HTTP 200, 404 0, 준비 중 페이지 문구 0, robots 허용 true. 단순 텍스트 길이 300자 미만은 11개였으나 로그인·개인 내역·클라이언트 도구가 포함된다. HTML 태그 제거 방식은 숨겨진 UI까지 셀 수 있어 읽을거리 품질 점수가 아니다.

추가 확인한 `/nakshatra/compat/`, `/nakshatra/muhurta/`, `/fortune-chat/`, `/astrology-ai/`는 운영 HTML에 이미 noindex가 있었다. 이를 근거로 대량 삭제·검색 제외를 하지 않았다. noindex는 애드센스 심사 회피 수단이 아니다. `/codedestiny-novel.html`은 별도 클라이언트 콘텐츠로 본문 렌더링 평가가 남는다.

Impeccable context와 원고 파일 detector를 실행했다. UI 전체 접근성·성능·반응형을 실측하지 않았으므로 20점 만점 점수나 전체 합격을 부여하지 않는다.

## 남은 확인

1. 수정 코드의 main CI 통과와 운영 승격은 구분한다. 운영 승격은 별도 명시 승인 후 수행한다.
2. 애드센스 계정의 ads.txt 재수집 및 진행 중인 심사 결과. 사이트를 삭제해 재등록하지 않는다.
3. 공개 원고 전체와 다국어 페이지의 질적 검토는 이번 60 URL 접근성 검사나 세 편 정정으로 완료되지 않는다. 실제 운영자가 원고·출처·계산 예를 확인한 경우에만 인간 검수 기록을 남긴다.
4. 거절이 다시 발생하면 당시 계정의 상세 사유를 보존하고, 해당 시점 운영 원고와 대조한다. 문구 정정이 승인 확률을 얼마나 높이는지 수치로 추정하지 않는다.

## 공식 근거

- https://support.google.com/adsense/answer/7679060?hl=ko
- https://support.google.com/adsense/answer/12170222?hl=ko
- https://support.google.com/publisherpolicies/answer/10502938?hl=ko

이번 결과는 문제 일부의 진단과 정정이며 Google 승인이나 사이트 전체 심사 준비 완료 판정이 아니다.

## 검증 기록

- 원고 회귀 `node --test __tests__/ui/phase3-insight-content.test.mjs`: 최종 원고 변경 후 7/7 통과.
- `node scripts/verify-editorial-manuscripts.mjs`: 기존 24편 해시·검수 상태 통과.
- `node scripts/build-sukuyo-reading-library.mjs --check`: 25편 공개 사본 일치.
- `node scripts/ensure-ads-txt.mjs --check`: root/public 레코드 일치.
- `npm run sitemap:generate`: 1,311 URL. 의미 품질이나 Google 색인 완료를 뜻하지 않는다.
- `npm run check:fast -- --plan`과 `npm run check:fast` 실행. 내용 해시 파일의 교체를 삭제로 판정하여 전체 mock 게이트로 자동 승격됨. 결과는 전달 시점에 별도 기록한다.

- 최종 변경 파일 ESLint: exit 0. 최신 원격 main 위 재적용 후 sitemap drift와 기존 편집 원장 재검증 통과.
- 확대된 check:fast는 npm test 통과(510.1초), profile-current-switch 통과까지 확인했다. 생성 사본 교체로 확대된 나머지 전체 로컬 검사는 중단했으며 check:fast 전체 통과로 기록하지 않는다. 공식 전체 판정은 main CI에서 확인한다.
- 공유 체크아웃 main의 fast-forward 시도는 기존 `.git/index.lock`으로 중단됐다. 다른 세션 잠금·미커밋·스테이징 변경은 보존했다. 최신 origin/main을 기반으로 격리 커밋을 재적용했으며 원격 main 전달은 강제 push 없이 수행한다.
