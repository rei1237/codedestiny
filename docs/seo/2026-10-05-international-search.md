# 해외 검색·AI 인용·CTR 최적화 — 2026-10-05

범위: 일본어 /ja/, 영어 /en/, 중국어 간체 /zh/, 번체 /zh-tw/. 기존 홈·사주·자미두수·숙요점 16개 페이지를 우선 보강했다. 신규 얇은 페이지나 라우트를 추가하지 않았다. 이 문서는 구현·로컬 검증 기록이며 운영 배포 또는 순위 상승의 증빙이 아니다.

## 작업 순서
1. 운영 curl 기준선, 기존 라우트·번역 원본, 검색 결과의 경쟁 도메인 조사.
2. 기존 i18n 키로 언어별 제목·설명·H1·직답 보강.
3. 실제 존재하는 현지어 허브 연결, FAQ·근거 표·원자료 링크, llms.txt 생성.
4. 생성 미러·사이트맵 갱신, 한정된 변경 커밋·main 전달.
5. 검증: 로컬 curl·모바일 화면·계약 검사와 exact-SHA main CI. 운영 승인 후 배포일 D 기준 재측정.

## 진단 레인
| 레인 | 진단 | 증거와 조치 |
|---|---|---|
| SEO | ⚠️ | 16개 운영 URL 모두 200, 정본·언어별 대체 링크 존재. 홈의 주요 허브 링크가 한국어로 이어져 현지어 링크로 교정. |
| AEO | ⚠️ | 기존 사주 소개 CTA는 긴 설명 아래. 직답·CTA를 첫 화면에 추가하고 자미두수·숙요점 8쪽에 라벨-값 표를 추가. |
| GEO | ⚠️ | llms.txt의 본문·주요 링크가 한국어 중심. 가시 현지어 홈 설명에서 파생한 4개 언어 섹션·16개 정본 링크 추가. 인용 실적은 미측정. |
| LLMO | ⚠️ | Code Destiny 브랜드를 유지하며 현지 용어를 제목 앞에 배치. 검색 없는 모델 인지도는 미측정. |
| NEO | — | 이번 묶음은 해외 유입 대상. 국내 두 입구의 기존 정책·측정 일정 유지. |
| 콘텐츠 | ⚠️ | 기존 소개를 보강하고 계산 기준 원자료에 연결. 전체 해외 서비스 화면·후기 원문의 번역 완료를 뜻하지 않음. |

## 언어별 전략과 남은 갭
| 언어 | 우선 의도 | 반영한 차별화 방향 | 남은 검증 |
|---|---|---|---|
| 일본어 | 四柱推命・本命宿・宿曜の相性 | 본명숙 입력과 관계 방향, 사주와 자미두수의 기준을 분리하고 같은 언어의 도구로 안내 | 일본 지역 Google/Yahoo 검색·CTR 및 실제 상담 일본어 품질 |
| 영어 | Korean Saju・BaZi・Day Master | Korean Saju를 첫 토큰에 놓고 Four Pillars 입력·Five Elements를 쉽게 설명, 계산 예시 원자료 연결 | 국가별 영어 검색 성과; 모든 국가 출생시간 처리를 검증했다고 주장하지 않음 |
| 간체 | 八字排盘・紫微斗数十二宫 | 입력값과 명궁·관록궁·재백궁의 읽는 순서, 체계 비교 | 중국 본토 접근성·Baidu 수집은 별도 실측 필요 |
| 번체 | 八字排盤・紫微斗數命盤 | 간체에서 물려주지 않고 번체 문구 유지, 궁위 읽기와 출생시각 불명 시 한계 | 대만·홍콩별 Google/Bing 성과 |

“여러 체계를 제공”하는 경쟁자도 있어 독점 기능이나 정확도 우위를 주장하지 않는다. 검색량·난이도는 계정 도구 없이 수치화하지 않았다.

## 수정 전 운영 curl 기준선
Googlebot UA, JavaScript 실행 없음. HTML·응답 헤더 원본은 외부 증빙 폴더 baseline/에 저장했다. bodyChars는 script/style/숨김 속성·사이트 chrome을 제외하는 동일 검사기의 값이며 CSS 전체 가시성 판정은 아니다.
| URL | HTTP | JS 없는 본문 문자 | H1 |
|---|---:|---:|---|
| /ja/ | 200 | 13523 | 今日の気持ちを 少しずつほどこう 複雑な悩み、 次の一手を探そう |
| /ja/saju/ | 200 | 1302 | 四柱推命で、自分の選び方を見つめる |
| /ja/ziwei/ | 200 | 1247 | 紫微斗数の命盤鑑定 |
| /ja/sukuyo/ | 200 | 1222 | 宿曜占星術で読み解く相性と距離感 |
| /en/ | 200 | 25879 | A little clarity for your heart A tangled question, a clearer next step |
| /en/saju/ | 200 | 3996 | Read your patterns through Korean Saju |
| /en/ziwei/ | 200 | 3830 | Zi Wei Dou Shu Chart Reading |
| /en/sukuyo/ | 200 | 3803 | Sukuyo Compatibility and Relationship Reading |
| /zh/ | 200 | 11488 | 今天的心事 一起慢慢理清 纷乱的烦恼， 一起寻找下一步 |
| /zh/saju/ | 200 | 1087 | 用四柱命理观察自己的选择习惯 |
| /zh/ziwei/ | 200 | 1171 | 紫微斗数命盘解读 |
| /zh/sukuyo/ | 200 | 1142 | 宿曜相性与关系解读 |
| /zh-tw/ | 200 | 11511 | 今天的心事 一起慢慢理清 紛亂的煩惱， 一起尋找下一步 |
| /zh-tw/saju/ | 200 | 1088 | 用四柱命理觀察自己的選擇習慣 |
| /zh-tw/ziwei/ | 200 | 621 | 紫微斗數命盤解讀 |
| /zh-tw/sukuyo/ | 200 | 616 | 宿曜相性與關係解讀 |

4개 홈에 검사기 기준 한글 1,756자가 남아 있었다. 한국어 원문 후기·분석 인용과 일부 공용 UI가 포함된다. 원문 인용을 임의 번역하거나 숨기지 않았으며, 전체 현지화 완료로 보고하지 않는다.

## 경쟁 페이지 표본
2026-10-05 도구 검색에서 발견한 상위 후보 중 언어별 독립 도메인 5곳. 국가 고정 Google의 순위표가 아니다. H1·H2 목차·details 문구·schema를 직접 curl 수집했다. 아래 details 수는 FAQ 수와 같지 않으며, 0도 FAQ 부재를 뜻하지 않는다. 스트리밍/CSR 문서의 문자 수가 작아도 품질 열위로 단정하지 않는다.
| 언어 | 직접 읽은 페이지 | HTTP | 본문 문자 | H2 수 | details 수 |
|---|---|---:|---:|---:|---:|
| en | [lumisaju.com](https://lumisaju.com/en/korean-saju) | 200 | 2619 | 5 | 4 |
| en | [saju.dosa-han.com](https://saju.dosa-han.com/en/) | 200 | 2512 | 5 | 0 |
| en | [starsandsaju.com](https://starsandsaju.com/saju-calculator) | 시간 초과 | 미확인 | 미확인 | 미확인 |
| en | [sajumoon.com](https://sajumoon.com/en/saju) | 200 | 20 | 8 | 6 |
| en | [www.hongsimdang.kr](https://www.hongsimdang.kr/en) | 200 | 7136 | 11 | 7 |
| ja | [www.senjutsu.jp](https://www.senjutsu.jp/labo/shukuyo-calc) | 200 | 9915 | 11 | 0 |
| ja | [omajinai.co.jp](https://omajinai.co.jp/shukuyo/) | 200 | 8094 | 17 | 0 |
| ja | [tools.digrart.jp](https://tools.digrart.jp/shukuyo-calculator/) | 200 | 14308 | 6 | 2 |
| ja | [www.stellica.jp](https://www.stellica.jp/diagnosis/sukuyo) | 200 | 6849 | 15 | 10 |
| ja | [koyomimori.com](https://koyomimori.com/shukuyo/) | 200 | 17234 | 9 | 40 |
| zh | [www.ziweilogy.com](https://www.ziweilogy.com/) | 200 | 1662 | 2 | 0 |
| zh | [fateforge.me](https://fateforge.me/zh/atlas/ziwei-doushu) | 200 | 0 | 10 | 5 |
| zh | [www.shizher.com](https://www.shizher.com/ziwei-paipan/) | 200 | 968 | 29 | 0 |
| zh | [zwds365.cn](https://zwds365.cn/) | 200 | 4 | 0 | 0 |
| zh | [18888.net.cn](https://18888.net.cn/) | 200 | 479 | 3 | 0 |
| zh-tw | [mingshu.tw](https://mingshu.tw/tool/ziwei) | 200 | 1125 | 4 | 4 |
| zh-tw | [fortunecloud.co](https://fortunecloud.co/ziwei-doushu-calculator) | 200 | 3227 | 10 | 0 |
| zh-tw | [m-calc.com](https://m-calc.com/ziwei) | 200 | 2543 | 2 | 0 |
| zh-tw | [www.yuanyucore.com](https://www.yuanyucore.com/zh-TW/zi-wei-dou-shu-calculator) | 200 | 2413 | 7 | 0 |
| zh-tw | [www.kaucim.ai](https://www.kaucim.ai/ziwei) | 200 | 4105 | 13 | 14 |

일본어 경쟁자는 도구·27숙 설명·달력·관계 분류를 이미 두껍게 제공한다. 영어 경쟁자도 Day Master, BaZi와의 차이, 입력과 유료 범위를 설명한다. 중국어 경쟁자는 출생시각·十二宮·四化·계산 규약을 갖추고 있다. 따라서 빈칸은 경쟁자 모두에게 없는 기능이라고 과장할 것이 아니라, 우리 페이지에서 빠진 입력 전제·읽는 순서·원자료 출처부터 채우는 것으로 판단했다. 영어 1개 표본의 curl 시간 초과는 미확인으로 남겼다.

## 구현 before / after
- 홈: 일반 무료 운세 나열·브랜드 선두 또는 감성 H1 → 언어별 체계 용어 선두, 질문에 맞는 도구 선택 설명. 무조건 무료·정확성·성과 보장은 추가하지 않았다.
- 링크: 한국어 주요 허브 → 번역·라우트가 실제 있는 경우에만 같은 언어 허브. data-action·쿼리·결제 복귀·인증·명반 도구 URL은 유지.
- 사주 4쪽: 긴 소개 뒤 CTA → 상단 직답·CTA. 실제 변경일 2026-10-05만 표기하고 계산 기준·23시/자정 예시·체계 비교 원자료(한국어임을 표시)에 연결.
- 자미두수·숙요점 8쪽: 일반 소개 → 입력 조건·궁위/관계 역할 표, 출생시간 불명 한계·체계 차이 FAQ. FAQ 본문과 JSON-LD는 같은 기존 배열에서 렌더.
- llms.txt: 한국어 위주 → 같은 i18n 가시 문구에서 파생하는 4언어 안내. llms.txt는 선택적 안내이며 Google AI 기능이나 다른 모델의 인용 필수조건이라고 주장하지 않음.
- 사이트맵: 새 URL 없이 기존 콘텐츠 서명 원장으로 변경 반영. canonical·hreflang·robots 정책·운영 홈 리다이렉트는 변경하지 않음.

## 수정 파일
- lib/seo/i18nKeywords.ts: 언어별 홈·자미두수·숙요점 keyed copy와 사실 표.
- lib/i18n/feature-introductions.mjs: 사주 4언어 메타·직답·원자료.
- lib/i18n/localized-hub-links.mjs: 존재하는 번역 허브만 연결하는 빌드용 변환.
- app/components/I18nSeoPageTemplate.jsx: SSR 사실 표; PublicFeatureIntroduction.jsx 및 .module.css: 상단 직답·CTA·출처.
- i18n/authored/shellCopy-13.json, public/i18n/{en,ja,zh-cn,zh-tw}.json: 기존 키 현지어 카피.
- scripts/sync-legacy-static-to-public.mjs 및 public/{en,ja,zh,zh-tw}/index.html: 현지어 메타·허브 링크 미러.
- scripts/generate-llms-txt.mjs, llms.txt, public/llms.txt: 다국어 AI 안내.
- config/sitemap-lastmod.json 및 생성 사이트맵: 콘텐츠 서명 갱신.
- __tests__/ui/international-hub-links.test.mjs: 없는 번역·결제/인증/도구 상태 오변경 방지.

## 검증 기록과 한계
- node --test __tests__/ui/international-hub-links.test.mjs: 4/4 통과. 최초 테스트의 “번체 Vedic 미존재” 가정은 실제 번역·라우트 확인으로 폐기하고, 실제 미번역 Tea House를 검증 대상으로 바꿈.
- node scripts/generate-llms-txt.mjs --check: 통과. i18n public parity 검사 통과.
- npm run check:fast -- --plan 실행, npm run check:fast 실행. 자동 승격된 결제/인증 포함 88개 전체 스위트의 첫 npm test가 장시간 실행되어 중단했으며 통과로 기록하지 않는다. 공식 완료 판정은 main CI aggregate다.
- 미커밋 상태의 verify:public-mirror-fresh는 검사기의 계약상 판정 불가. 커밋 후 clean 상태에서 실행해야 한다.
- 로컬 curl: 기존 postbuild 번역 패스를 적용한 홈과 Next 개발 SSR 허브를 Googlebot/Bingbot으로 조회. 배포 HTML 증거와 구분하며 최종 raw 응답은 after-local/summary.json.
- 개발 SSR의 html lang=ko와 일부 스트리밍은 기존 빌드 후처리 전 상태. 운영 기준선에는 현지 lang이 확인됨. 이번 코드가 배포된 산출물의 lang·본문·정본은 운영 승격 후 재확인 필요.
- 390px 일본어 사주·영어 자미두수·번체 숙요점, 1280px 영어 자미두수: 수평 넘침 없음. 일본어 상단 CTA y=404px, 영어 y=547px, 번체 y=659px. API·외부 네트워크 차단한 로컬 화면 검증.
- 전체 해외 상담·결제 기능의 실운영 테스트, Core Web Vitals 개선, AI 인용 증가·CTR 상승은 이번 확인으로 주장하지 않는다.

## 측정
외부 도구 검색에서는 /ja/, /en/, /zh/, /zh-tw/가 각각 발견됐다. 실제 Google/Bing 국가별 1페이지 노출, GSC 노출·클릭·CTR, AI 답변 인용은 접근 가능한 계정/플랫폼에서 미측정이다. 미측정을 0 또는 X로 치환하지 않는다.

- 일본 질문: Code Destiny 四柱推命 / 宿曜 本命宿 調べ方 / 紫微斗数 四柱推命 違い.
- 영어 질문: Code Destiny Saju / Korean Saju birth chart in English / Sukuyo versus Vedic nakshatra.
- 간체 질문: Code Destiny 八字 / 紫微斗数 十二宫 怎么看 / 宿曜 本命宿 查询.
- 번체 질문: Code Destiny 八字 / 紫微斗數 十二宮 怎麼看 / 宿曜 本命宿 查詢.
- D=이 변경을 포함한 운영 Pages·Worker 배포일. D+14·D+30에 URL×국가×검색어 그룹별 비교. 국내 기존 10/19·11/4 일정과 혼동하지 않는다.
- 최근 3일은 집계 지연으로 비교에서 제외. 메타 카피 교체는 언어×페이지 그룹별 최소 14일 간격.
- CTR 분모는 실제 impressions. site: 결과 수나 도구 검색 결과 수를 색인 수로 쓰지 않는다. 노출이 적으면 A/B 승자를 선언하지 않는다.

## 계정에서 필요한 작업
- GSC/Bing: sitemap index 제출 확인. 현지어 홈 → 사주·자미두수·숙요점 순 URL 검사, 최근 28일 국가·페이지·쿼리별 노출/클릭/CTR 내보내기.
- 국가 구분: 일본, 영어 주요 유입국, 대만·홍콩, 중국 본토를 구분. UI 언어를 방문 국가의 대용값으로 사용하지 않음.
- Cloudflare: 실제 검증된 Googlebot/Bingbot/AI 크롤러 방문과 WAF/챌린지 분류. UA 스푸핑 curl 통과는 실제 봇 접근 로그와 다름.
- 중국 본토: 현지 접속·Baidu 수집은 별도 확인. 이번 외부 네트워크의 curl로 본토 접근성을 단정하지 않음.

## 하지 않은 것
백링크 구매·숨김 텍스트·클로킹·가짜 후기·평점·대량 템플릿 페이지·근거 없는 무료/정확성 약속·해외 엔진 시간 보정 변경·결제/인증/DB 수정·무승인 운영 승격을 하지 않았다. 번역이 없는 경로는 만들었다고 가장하지 않았다.

## 기준 출처
- Google localized versions: https://developers.google.com/search/docs/specialty/international/localized-versions — 서로 돌아오는 언어 링크와 실제 콘텐츠 언어.
- Google AI features: https://developers.google.com/search/docs/appearance/ai-features — 기본 색인·스니펫 자격, 텍스트 콘텐츠·가시 정보와 구조화 데이터 일치; 별도 AI 파일 필수 아님.
- 공개 검색 발견: https://code-destiny.com/ja/ · https://code-destiny.com/en/ · https://code-destiny.com/zh/ · https://code-destiny.com/zh-tw/. 검색 결과 시점의 기존 문구이지 수정 후 반영 증거가 아님.

## 전 서비스 언어 전달 추가 점검 (사용자 후속 요청)
- 언어를 제거하지 않는다. 런타임은 한국어·영어·일본어·간체·번체·베트남어·힌디어·스페인어·프랑스어·독일어·네덜란드어·말레이어 12개다. 영어를 최우선 품질 기준으로 하고 일본어·중국어를 집중 보강한다. 나머지는 실제 국가별 이용·전환 데이터 없이 폐기하지 않는다.
- `node scripts/i18n-check.mjs`: 12개 사전 13,402개 키 일치, native marker 1,679개 전 언어 해석, serviceMap 현지어 문구 통과.
- `node scripts/verify-i18n-public-parity.mjs en.json ja.json zh-cn.json zh-tw.json`: 통과. 키 존재·한글 잔류 검사이며 번역의 원어민 품질을 보증하지 않는다.
- `node scripts/audit-ai-locale-calls.mjs --check`: 56개 호출 관련 파일·133개 근거 지점의 현재 인벤토리 일치. 코드 탐색 증거이며 56개 실서비스 실행 성공을 뜻하지 않는다.
- `node scripts/verify-ai-locale-pipeline.mjs`: 14개 불변식 통과. 12개 출력 언어, 한국어 고정 지시 우선순위, 비한국어 후처리 손상 방지 포함.
- `node scripts/verify-ai-locale-browser-contract.mjs`: 브라우저 언어 선택·별칭·저장소 불가·standalone 실제 요청 함수의 12개 언어 전달 통과(fetch stub).
- `node --experimental-strip-types --no-warnings scripts/verify-ai-locale-provider-contract.mjs`: 12개 언어의 Gemini·폴백·캐시 격리·동시 요청 컨텍스트 통과. 모든 전송은 가짜이며 실 LLM 비용·운영 DB 쓰기 없음. 처음 시도한 `--import tsx`는 패키지 부재로 실행되지 않아 CI와 같은 Node strip-types 명령으로 검증했다.
- 영냥이 all-locales/reading-locale 모의 검사와 링크 검사 25개 통과. 이후 FAQ 중복 회귀 검사 추가로 링크 검사는 4개 통과. 사이트 영어 상태에서 별도 결과 언어를 선택해도 실제 요청 빌더가 선택한 언어를 유지함을 확인했다.
- 현재 LLM 전달 설정은 이미 12개 언어를 지원하므로 불필요한 프롬프트·가격·결제·인증·엔진 변경을 하지 않았다. 실제 생성 문장의 유창함·모든 화면의 완역은 별도 품질 검증 대상이다.

### 누락 검사에서 확인한 한계
- locale-table 검사: 82개 테이블 중 35개가 12개 언어 전체를 선언하지 않음. 6,157개는 **정적 후보 수**이며 실제 미번역 개수로 해석하지 않는다. 기존 기준선 대비 +761로 실패했다. 기준선을 올리거나 검사를 우회하지 않았다.
- 이 검사는 legacy `zh` 별칭과 한국어 전용 SEO 콘텐츠도 `zh-CN/zh-TW` 부재로 센다. 예: animal-totem은 선언 뒤 `zh` 문구를 추가한다. 따라서 6,157개를 자동 번역하거나 “영어가 전부 누락”이라고 결론 내리지 않았다.
- `verify-fortune-locale-completeness`는 이 작업 트리에 발행 산출물 `fortune/data`가 없어 실행 불가. 일일 콘텐츠 생성/발행으로 검사를 우회하지 않았다.
- 사주 엔진 내부 문구(`app/saju/destiny-bias/engine/birthEnergy.ts`, `lib/fpti/fpti-engine.ts`, `js/iching-engine.js`)와 결제 인접 문구(`lib/payment/pass-eligibility.ts`, `app/points/history/PointHistoryClient.tsx`) 후보는 기존 별도 승인 경계 때문에 수정하지 않았다. 실제 언어 분기·호출부 확인 뒤 필요한 건만 별도 승인 대상으로 분리한다.
- 남은 일: 모든 서비스 실제 입력→결과 화면의 언어별 표본 확인, legacy `zh`와 번체 구분, 국가별 이용 지표, 승인된 경우 실 LLM 소수 표본의 원어민 품질 확인. 이 묶음을 전 서비스 완역 완료로 표현하지 않는다.
