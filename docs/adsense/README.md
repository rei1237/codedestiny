# AdSense Approval Readiness Report

감사 기준일: 2026-09-09 KST. **NOT READY**. 이 문서는 구현·검증 근거와 남은 승인 게이트를 구분한다. 운영 배포와 AdSense 재심사 제출은 실행하지 않았다.

## 1. 최초 점수

잠정 **67/100**: Content 18, Trust 12, UX 10, Index Hygiene 12, Policy 7, Technical 8. Google 점수나 승인 확률이 아니다. 전체 원고의 전문 심사는 미완료다.

## 2. 최초 Critical 문제

- 원본 HTML이 있다는 이유만으로 박병하 검수 완료를 출력했다. 사용자는 실제 검수 글을 별도로 선별해야 한다고 확인했다.
- 근거 없는 발행일·조회수 보정이 존재했다. 원고에 날짜가 없으면 빌드 시점에서 임의 과거 날짜를 만들었다.
- AdSense 실제 상태는 ‘가치가 별로 없는 콘텐츠’. 계정의 ads.txt ‘찾을 수 없음’과 공개 HTTP 200이 불일치한다. 원인은 미확정이다.
- 지목된 네 인사이트는 현재 본문 또는 정상 대체 기사로 연결된다. 과거 검색 스니펫을 현재 장애로 단정하지 않았다.

## 3. 실제 수정한 내용

- `lib/content/editorial-review.mjs`: 콘텐츠 형식과 검수 증거를 분리. 이름·실제 날짜·근거를 갖춘 확인 기록만 검수 표시 및 별도 광고 허용에 사용한다. 현재 확인 기록은 0건이다.
- `ContentIntegrityNote`, About, Methodology, Editorial Policy: 운영 책임과 원고별 완료 검수를 구분했다.
- 씨드 인사이트: 임의 날짜와 조회수 제거. 작성자가 없는 글을 운영자 실명으로 대체하지 않는다. Article schema의 조직/개인과 실제 날짜를 일치시킨다.
- 허브: 계산·해석·체계 비교·관계 기초의 20편 읽기 경로. 인기 조회수 대신 편집 추천. 실제 전문가 검수 완료 목록으로 표시하지 않는다.
- 계산 방법론 3편: 자정 보정의 산술 오류, 가상의 상담 경험 표현, 다른 유파를 오류로 단정하는 문장 수정. 엔진의 민용일/23시 경계/시주 계산을 대조했다.
- 홈 12개 언어: ‘제작·검수’ 대신 실제 운영자 소개. 공통 푸터는 주제별 펼침 메뉴로 정리하고 검색엔진용 설명 문구를 제거했다.
- 광고 스크립트: 기존 경로·canonical·robots·앱·광고제거 이용권 조건에 원고별 광고 검토를 추가했다. 미확인 경로가 접두사만으로 광고를 로드하지 않는다. 소유권 메타와 ads.txt는 유지한다.
- 자동 검사: 글자 수로 품질 합격을 판정하지 않는다. 본문 실체·빈 템플릿·사실 표시와 기존 정책 가드를 유지한다. React 스트리밍 본문과 JS 없는 가시성을 별도 측정한다.

## 4. INDEX 유지 페이지

새로운 일괄 index/noindex 변경은 없다. 홈·만세력·숙요 유입 URL을 보호했다. sitemap은 기존 488 URL 집합을 유지하며 생성기로 실제 변경 기록을 갱신했다. 자동 HTTP 검사는 A 승격의 근거로 사용하지 않는다.

## 5. 개선 후 INDEX 페이지

`how-we-calculate-saju`, `midnight-birth-day-pillar`, `why-saju-results-differ-between-services`의 본문 오류를 수정했다. 기존 index 상태를 유지하되 최종 전문가 검수는 남아 있다. 20편을 모두 품질 통과 A로 선언하지 않았다.

## 6. NOINDEX 페이지

감사 원장에 기존 C 86 URL을 기록했다. 로그인·계정·이용권·개인 결과 등은 기존 경로 정책을 유지한다. 실제 역할과 유입 증거 없이 새로 대량 noindex하지 않았다. noindex는 AdSense 심사에서 페이지를 숨기는 장치가 아니다.

## 7. 통합/삭제/리다이렉트 페이지

새 삭제·리다이렉트 0건. 원장 D 18건은 기존 redirect/404/410의 관찰이다. `/insights/daewoon-vs-sewoon/`과 `/insights/sukuyo-compatibility-rhythm-guide`의 정상 이동을 유지했다. 외부 링크 데이터가 미확인이므로 삭제하지 않았다. 정책 별칭의 canonical 정리는 현재 main 소스에 이미 존재하며 본 작업 성과로 계산하지 않는다.

## 8. 인사이트 정리 결과

- 일반 씨드 인사이트 기존 113편 → 기존 index 설정 113편 유지.
- 새 NOINDEX 0편, 새 삭제/통합 0편.
- 우선 검수 원고 20편, 실제 전문가 검수 확인 0편.
- 유명인·주제 허브·다국어 포함 `/insights/` URL 수와 113편은 서로 다른 집합이다.
- [원고 전문과 체크리스트](review/index.html), [원고 해시·검수 대기 목록](review/manuscripts.json).

## 9. 신뢰성 개선

실제 운영자 박병하·명리 10년 경력은 유지했다. 소스 작성 책임을 보존하면서 개인 작성/검수의 자동 추정을 제거했다. 별도 작성자 페이지 대신 `/about#author`와 `/methodology/`를 연결한다. 허위 경력·통계·후기는 추가하지 않았다. 검수 기록은 원고 해시와 회신 근거를 확인한 뒤에만 입력한다.

## 10. Technical SEO

[URL CSV](baseline/urls.csv), [상세 JSON](baseline/urls.json), [HTTP 요약](baseline/summary.md).

- 프로덕션 공개 URL 599개, sitemap 488개, fetch 실패 0. 자동 원장: B 493(심사 대기, 저품질 확정 아님), C 86, D 18, robots/ads 텍스트 2개.
- 이 검사에서 빈 indexable 본문·sitemap 충돌·서버 오류 후보는 0. 전체 기사 질적 검토와 동의어 중복 심사가 완료됐다는 뜻은 아니다.
- 555 URL에서 React 스트리밍 표시 의존성을 식별했다. 서버 본문 존재와 JS 없는 가시성을 구분한다. 프로덕션 별 밝기 기사 본문은 실제 Chrome에서도 확인했다. Google URL 검사 결과를 대신하지 않는다.
- 로컬 mock에서 360/390/430/1280px × 허브·계산 방법론·별 밝기 12개 조합의 가로 넘침 없음, 기사 본문 존재, 검수 대기 표시, 푸터 키보드 펼침, 광고 요청 0을 확인했다. [검증 결과](browser-verification.json).
- 렌더링된 로컬 문서와 소스 검증은 운영 배포 증거가 아니다. 모든 locale의 사람 번역 검토도 미완료다.

## 11. AdSense Policy 검사

공식 [사이트 준비 안내](https://support.google.com/adsense/answer/7299563?hl=en), [Publisher Policies](https://support.google.com/publisherpolicies/answer/10502938?hl=en-GB), [People-First Content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), [생성형 AI 안내](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content), [스팸 정책](https://developers.google.com/search/docs/essentials/spam-policies), [noindex 안내](https://developers.google.com/search/docs/crawling-indexing/block-indexing)를 기준으로 사용했다. 커뮤니티 답변 본문을 확인하지 못한 사례는 정책 근거로 채택하지 않았다.

공개 ads.txt는 계정과 같은 게시자 ID를 포함한 HTTP 200이다. 계정 목록의 2026-08-29 21:07 KST는 최종 업데이트이며 마지막 심사일로 단정하지 않는다. [ads.txt 공식 안내](https://support.google.com/adsense/answer/12171612?hl=en)에 따라 계정 재확인·크롤 상태 확인이 필요하다. 재심사 버튼이나 소유권 설정은 변경하지 않았다.

## 12. 최종 점수

**운영 최종 점수는 아직 재산정 불가. 최초 잠정 67/100을 유지한다.** 미배포 코드를 운영 개선 점수로 합산하지 않는다.

| 항목 | 운영 잠정 점수 |
|---|---:|
| Content | 18/30 |
| Trust | 12/20 |
| UX | 10/15 |
| Index Hygiene | 12/15 |
| Policy | 7/10 |
| Technical | 8/10 |
| TOTAL | **67/100** |

Critical blockers: **0 선언 불가**. 운영의 부정확한 일괄 검수 표시 수정은 배포 대기이며, 실제 전문가 검수와 계정 불일치 해소도 남았다.

## 13. 현재 재심사 권장 여부

**NOT READY**. 코드 변경·자동검사만으로 재심사를 제출하지 않는다.

## 14. 남은 위험

1. 박병하 님이 검수 묶음에서 원고별 사실·출처·독창성을 확인하고 수정 요청과 실제 검수일을 제공해야 한다. 확인 전 검수 완료/광고 허용 기록을 생성하지 않는다.
2. ads.txt의 계정 인식 불일치 원인은 미확정이다. 정상 HTTP만으로 해결됐다고 하지 않는다.
3. PR 필수 CI 및 충돌 확인, 승인된 머지/배포 후 운영 재감사와 Google 렌더링 확인이 필요하다.
4. GSC 링크 보고서에서 외부 링크 2개(모두 홈, x.com·xploredomains.com), 내부 링크 2,479개를 추가 확인했다. 보고서에 없는 URL의 외부 링크를 0으로 단정하지 않는다. 원본 전체 페이지 내보내기와 모든 언어의 질적 심사는 남았다. [GSC 관찰 기록](search-console-observations.json).
5. noindex와 광고 제외만으로 공개 저품질 콘텐츠 문제가 해결되지는 않는다. 전체 원고의 전문성·인용 출처 검토를 이어가야 한다.

Google의 승인 여부는 Google이 결정한다. 점수나 URL 수를 맞추기 위해 미확인 검수 사실을 만들지 않는다.

### 유지 정책과 검증

결제 가격·30일 이용권·월정석·단건 결제·환불 조건·인증·공개 API·DB 스키마는 변경하지 않았다. 생성 미러의 캐시 키 변경은 `sync:public` 산출물이다. LLM/결제/DB 실호출 없이 기존 mock 및 네트워크 차단 검사를 사용한다.

실행 명령: `npm run check:fast -- --plan`, `npm run check:fast`, `npm run sync:public`, `npm run sitemap:generate`, `node --test __tests__/ui/publisher-integrity.test.mjs`, `node scripts/publisher-url-audit.mjs --output=docs/adsense/baseline`, `node scripts/build-editorial-review-packet.mjs`, `node scripts/verify-publisher-browser.mjs`. 최종 CI/검사 결과는 인수인계 문서에서 확인한다.
