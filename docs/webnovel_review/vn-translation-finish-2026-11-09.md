# VN 직접 번역 마무리 · 2026-11-09

원고 정본은 episodes.source.json이며 번역 판정 기준은 파일 전체 SHA256와 화/비트 ID·순서·부가 문구의 완전성이다. 기존 해시 34490a1621a056bc7c4d9c4f625bd71b787a7711fc83a5790846b911dc731be0는 cc1ae9598 원고와 일치한다. 정확한 변경 목록은 vn-translation-delta-2026-11-09.json.

언어당 원문 변경1,302 + 신규209 =1,511비트. 일본어는 기존 tiger6비트 말투까지1,517. 기존 번역의 모든7,844비트는 사전 감사에서 누락·빈값·한국어·깨진 마커0을 확인했고 현재 원고의 미변경6,417비트를 재사용했다(일본어6개 추가교정으로6,411). 제목/태그 변경0. 새 점술 값·서비스 결제 정책은 추가하지 않았다.


# 영어 번역 결과
- 기준 sourceHash 34490a1621a056bc7c4d9c4f625bd71b787a7711fc83a5790846b911dc731be0 = cc1ae9598 원고.
- 현 원고 7928비트. 변경1302+신규209=1511 직접 번역, 변경없는6417비트는 기존 assembled 번역 그대로 보존. 삭제125비트 제거.
- authored en-prologue.json 신설로 공용 prologue 파일 경합 회피. 조립은 scripts/lib/novel-authored-merge.mjs의 assembleNovelAuthored 사용(실행기 (세션 임시 경로) en-assemble.mjs). 원문/hash 정확, 누락0.
- 용어집(기존판 추출): Yeoni(연이), Yeongnyangi(영냥이), Neo(네오), Park Byeongha(박병하), Hanbi/Seo Hanbi(서한비), Yundal(윤달), Saebyeok(새벽), Moka(모카), Luna(루나), Black Moon(흑월), the universe(우주 상담원), Island of Companions(비겁의 섬), Island of Expression(식상), Island of Wealth(재성), Library of Resources(인성), Day Master(일간), Four Pillars(사주), Influence(관성), Hurting Officer(상관), Eating God(식신), Eul Wood(乙목), Gyeong Metal(庚금), Lian Zhen(염정), Wu Qu(무곡), Obstruction Transformation(化忌), Prosperity Transformation(化祿), Void(공망), Bharani/Rohini/Jyeshtha/Krittika(바라니/로히니/제스타/크리티카).
- 호랑이: please/kindly·dear guest/Mr. Cat의 냉정한 정중체, 급박할 때 명령 힘 보존. 흑월: 고풍 명령과 thou 계열을 새 대사에 적용. 네오: 짧은 단답, 연이 앞 감정 장면은 부드럽게. 은발 인간 남성·희생형 유지.
- 직접 저작 TSV en-01~10.tsv, 1511개 모두 수작업 영어. 외부 번역 API 사용0.

# 일본어 직접 번역 결과 (2026-11-09)
- 기준 원고: b7029897a, 73화 7,928비트.
- 기존 번역 원문 기준: cc1ae9598 (sourceHash 34490a1621a056bc7c4d9c4f625bd71b787a7711fc83a5790846b911dc731be0).
- 원문 변경 1,302비트 + 신규209비트 = 직접 번역1,511비트. 삭제125비트 제거. 기존 원문 불변6비트는 호랑이 정중체/여성1인칭 보정. 총 직접 번역1,517비트, 나머지6,411비트 기존 번역 보존.
- 추가6개: ep-12a:21(僕→私), ep-33:44, ep-36a:3/8, ep-38:86/107. 모두 tiger 정중체.
- 공용 prologue-001/002/003/metadata 파일은 다른 언어와 공유하므로 수정하지 않음. 일본어 전용 ja-prologue.json을 신설, 73개 ja-*.json만 assembleNovelAuthored에 입력(공용 prologue는 조립에서 제외).
- 검증: source/sourceHash 전비트 정합 확인. assembleNovelAuthored 오프라인 조립7928/7928, missing0. 한국어/마커/빈 번역0. 자동번역 API 실행0.
- 조립은 scripts/lib/novel-authored-merge.mjs와 content/novel/ui-copy.json을 사용. 실행용 (세션 임시 경로) ja-apply.cjs는 정본 수정/번역 생성 기능 없이 직접 작성한 일본어문만 ID로 적용하고 해시/순서를 맞추는 도구.

## 기존 번역에서 추출한 용어집·문체
- 인물: Yeoni, Yeongnyangi, Neo, Park Byeongha, Seo Hanbi/Hanbi, Yundal, Saebyeok, Moka, Luna, Heukwol. 기존 일본어판의 로마자 이름 표기를 유지한다.
- 사주: 四柱, 命式, 日柱, 日干, 月柱, 年干, 時柱; 乙亥·丙午·壬午·庚辰 등 원문 한자 유지.
- 비겁 比劫 / 비견 比肩 / 겁재 劫財 / 식신 食神 / 상관 傷官 / 관성 官星 / 공망 空亡.
- 자미두수: 命盤, 命宮, 廉貞, 武曲, 囚星, 三方, 化忌, 化祿. 점성술 ハウス/出生図/アセンダント/リリス와 혼용하지 않는다.
- 베다: ローヒニー, ジェーシュター, ラーフ, ケートゥ, バラニー, クリッティカー. 별도체계 유지, 새 점술 수치 없음.
- 운명 고객센터 相談窓口 / 우주 宇宙 / 미수 未収 / 잔고 없음 残高なし / 별점 星.
- tiger: 私・お客様・猫さん, です/ます/ください. 독백도 정중체. 감정폭발에도 명령 강도를 높이고 존댓말 유지.
- Heukwol: わし/お前/器よ, 〜であろう/〜するがよい/〜てやろう 등 고풍 어법. Neo와 분리.
- Neo: 짧은 俺·단정형. 감정에서 부드러워지되 과시/새 정체 노출 없음. silver hair=銀髪/銀の髪, 인간 남성.
- Yeoni: 자연스러운 여성 대학생 구어. 内心은 괄호 유지. 返金/規則 등 소설 속 제도는 설정 의미만 보존, 서비스 가격/결제 정책 변화 없음.

## 커밋
- f66f2cde2 프롤로그·01·01A·02, 333비트.
- b2c475c50 03·05·06·06A 및 08~20, 361비트.
- 97c464c58 21~28D, 431비트.
- 최종 커밋은 git log에서 확인(30~53S, 386비트 + 기존6비트, ja.json 완결조립).

# 중국어 직접 번역 결과 (2026-11-09)
- baseline cc1ae9598 원고와 현 b7029897a 원고 대조. 두 언어 모두 변경1302+신규209=1511비트를 읽고 직접 개정. 삭제125비트 제거. 메타데이터 변경0.
- 현 73화 7928비트 모두 조립 완료. assembleNovelAuthored: zh-CN 7928/7928 missing0, zh-TW 7928/7928 missing0. 모든 authored 행 source/sourceHash는 현 원문과 일치.
- 미변경6417비트는 baseline assembled와 대조해 두 언어 모두 출력 변경0. 개정1511개 중 실제 문장 문자열 변경은 언어당1295+신규209=1504개(7개는 원문의 어순·문장부호 개정이므로 기존 중문과 동일 문장으로 직접 재확인).
- 외부 번역·LLM API/translate-novel.mjs 실행 없음. 간체를 직접 작성했고 번체는 로컬 OpenCC s2twp로 자형/대만 어휘 변환 후 이름·문장 확인. 로컬 의존성은 (세션 임시 경로) zh-tools에만 설치(패키지 설정 변경 없음).
- prologue는 공용 prologue-001/002/003와 중복하지 않도록 zh-prologue.json으로 zh만 독립. 조립시 zh-*.json만 읽음. zh 문서 73개 모두 sourceTitle/sourceTag가 존재하며 현 원문과 일치한다. 메모리 보완 없이 기존 조립 함수를 직접 호출해 두 언어 missing0을 재확인했다. 신규 zh-prologue metadata는 기존 공용 prologue-metadata에서 복사.
- 결제·인증·API·DB·라우팅·정본·생성물 변경 없음.

## 기존 용어집 근거 (git show cc1ae9598:content/novel/translations/zh-CN.json)
|원문|간체 / 번체|기존 비트 근거|
|윤달|闰月 / 閏月|ep-13:62 我叫闰月。在这座岛上是算命的…|
|모카|摩卡 / 摩卡|ep-08:9 介绍简短点。摩卡，水獭，厨师。|
|서한비|徐寒雨 / 徐寒雨|ep-28c:51 [ 收件人 · 徐寒雨 ]|
|흑월|黑月 / 黑月|ep-25:12 [ 黑月 · 吞噬光的月亮 ]|
|루나|露娜 / 露娜|ep-13:43 …我叫露娜。我和姐姐住在…|
|네오|Neo / Neo|ep-27:neo-return-9 …叫我Neo吧…|
|영냥이|Yeongnyangi / Yeongnyangi|기존 전반부 영문표기 유지|
|연이|Yeoni / Yeoni|기존 전 화 표기 유지|
|박병하|Park Byeongha / Park Byeongha|ep-42:28 Park。Byeong。Ha。와 ep-52:55 Park Byeongha。你呢？|
|바라니|婆罗尼 / 婆羅尼|ep-37:57 婆罗尼，怀抱之星。|
|로히니|罗希尼 / 羅希尼|ep-37:23 罗希尼。金牛座附近的月宿…|
|크리티카|克里提卡 / 克里提卡|ep-37:65 …与火相连的克里提卡…|
|제스타|杰耶什塔 / 傑耶什塔|ep-37:25 …对面的杰耶什塔…|
|공망|空亡 / 空亡|기존22회 표기 그대로|
|비겁|比劫 / 比劫|기존31회 표기 그대로|
- tiger: 您/请 중심 정중한 거리감, 독백도 차분한 의문형 유지. EP.28D 외침은 존칭을 지키며 명령의 힘 보존.
- 黑月: 吾/莫/便是/献 등 고풍 어휘를 필요한 곳에만 사용, 현대 농담 말투 금지.
- Neo: 짧은 단정, 연이 앞에서만 부드러운 구어. 인간형 은발 남성 유지, 모든 대가·보호는 연이를 향함.

## 커밋
- 226379f10: 초반407비트
- 6dd53b33d: 중반755비트
- 2e7946687: 잔여349비트+기존 용어집 정합 교정
- 최종 조립본 커밋은 git log 확인.

## 조립 재현성 재확인 (부모 후속 요청)
- zh-*.json 73개 자체 sourceTitle/sourceTag를 확인: 누락0·불일치0. baseline cc1ae9598 대비 현 title/tag 동일73화 확인.
- 앞선 메모의 “미변경 문서의 메타 누락을 메모리에서 보완”은 방어적 ??= 코드 설명이며 실제 보완된 파일은0개였다. 모든73파일이 이미 sourceTitle/sourceTag를 포함한다.
- 메모리 보완 코드를 전혀 사용하지 않고 assembleNovelAuthored(raw, zhDocuments, locale, uiCopy)를 직접 실행: zh-CN/TW 각각7928/7928·missing0. 재현성 추가 수정·커밋 불필요. 번역/assembled/생성물 변경 없음.

## 재조립 규칙

- scripts/lib/novel-authored-merge.mjs의 assembleNovelAuthored(sourceRaw, documents, locale, uiCopy)를 사용한다.
- documents는 en은 authored/en-*.json, ja는 authored/ja-*.json, zh-CN/zh-TW는 authored/zh-*.json만 선택한다. uiCopy는 content/novel/ui-copy.json이다. 기존 공용 prologue-*.json을 함께 넣으면 중복이므로 넣지 않는다.
- 반환값 missing이 비어 있고 translatedBeats===totalBeats인지 확인한 뒤 translation만 content/novel/translations/<locale>.json에 UTF-8 JSON으로 쓴다. sourceHash를 임의로 인증하지 않는다.
- npm run novel:build → node scripts/verify-novel-locale-completeness.mjs → npm run verify:story-sync. 생성물은 빌드로만 쓴다. manifest.availableLocales에 ko/en/ja/zh-CN/zh-TW가 모두 있어야 한다.

## 수정 파일 범위와 운영 실측

- content/novel/episodes.source.json: 호랑이14화134대사와37/47/50의선택·대가장면.
- content/novel/translations/authored/en-*.json / ja-*.json / zh-*.json 및 en.json/ja.json/zh-CN.json/zh-TW.json: 직접 번역 원고와 오프라인 조립본. README.md는현재게시상태로갱신.
- public/data/novel/**, lib/stories/vn/episodes.generated.json, content/novel/scene-matrix.generated.json: 생성기로만갱신.
- docs/webnovel_review/SAJU_SERIES_BIBLE.md와번역delta/용어집, docs/handoff/vn-oh-story-rewrite-2026-11-08.md: 규칙·근거·승인·결과.
- scripts/verify-novel-runtime.mjs: EXPECTED_BEAT_COUNT를개고후7,928로동기화(검사약화없음).
- config/sitemap-lastmod.json 및 루트/public sitemap*.xml: 최신main원장기준생성. 앞3단계개고의lib/stories/vn/index.ts로그라인변경도같이전달.
- 결제정책/가격/이용권/월정석/단건결제구조, 인증/API/DB/라우팅로직은변경하지않음.

운영릴리스42505123236은72fed768472e292055df9c29a5bec27ee9e0e934로성공. 운영 /version.json·/api/version은200과같은SHA를반환했다. 소설manifest는200, sourceHash1822d08b1cf0edd0475c92c0afa22fe040cec6e8e632f2e40817de52b7dfdd2e, 7,928비트와ko/en/ja/zh-CN/zh-TW게시를반환했다. 브라우저화면검증은handoff의최종상태를확인한다.

## 운영 화면 검증 완료 (2026-11-09)

- EP.01·42·52의 대사 진행, 저장, 새로고침 뒤 이어 읽기를 실제 운영 브라우저에서 확인했다. 복원 ID는 ep-01:2 / ep-42:2 / ep-52:reply-2다.
- 언어 선택 UI의 영어·일본어·간체·번체 전환 모두 같은 북마크를 유지했으며 실제 표시 본문은 해당 언어의 번역 비트와 일치했다. UI 제목도 함께 바뀌었다.
- 운영 manifest의 원고 해시와 다섯 언어 게시 상태를 확인했고, EP.52의 화면 배치도 스크린샷으로 확인했다.
- 기존 읽기 위치와 소설 언어 설정을 복원하고 검증 브라우저를 종료했다. 실결제·실 LLM·운영 DB 쓰기는 수행하지 않았다.
