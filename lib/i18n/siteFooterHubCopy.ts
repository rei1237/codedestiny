import { Locale } from "./locales";

/**
 * 로케일 푸터(`app/components/LocaleFooterHub.jsx`)의 카피 정본.
 *
 * 왜 이 파일이 있나 — 2026-08-15 실측에서 `/ja`·`/zh`·`/zh-tw`·`/en` 페이지의 고유 본문은
 * 400~560자인데 `AppChrome` 이 붙이는 **공통 한국어 블록이 2,291자**였다. 로케일 페이지끼리
 * 12-shingle Jaccard 0.74~0.75 로 서로 near-duplicate 였고, Google 이 언어를 판정하지 못해
 * hreflang 이 무효화됐다(`/ja/today/` 의 한글 문자수 1,433자).
 *
 * 🔴 **삭제가 아니라 번역만이 통과 경로다.** `scripts/verify-adsense-readiness.mjs:28` 의
 * `minimumBlockedIndexableVisibleTextLength = 1800` 이 로케일 사이트맵 라우트 41개에 가시 텍스트
 * 1,800자를 강제한다. 푸터를 지우면 41개 중 28개가 FAIL 한다(`/ja/today` 2837→569).
 * 링크를 줄이거나 환불 정책을 요약본으로 바꾸면 그 마진이 사라진다.
 *
 * 🔴 **ko 폴백 연산자를 쓰지 말 것** — `verify-locale-table-coverage.mjs` 의 `FALLBACK_RE` 가
 * 논리합/널병합으로 `.ko` 를 읽는 표를 감지해 12개 로케일을 요구하므로 ratchet 이 깨진다.
 * (그 정규식은 원본 소스에 걸리므로 이 주석에도 해당 연산자를 문자 그대로 적지 않는다.)
 * 5개 로케일을 전부 명시적으로 채운다.
 *
 * 🔴 이 파일은 **UTF-8 BOM 없이** 저장한다(`verify-adsense-readiness.mjs:871,948` 의 모지바케 게이트).
 * `lib/i18n/` 경로에 둔 이유는 `verify-i18n-no-hardcoded-korean.mjs:69` 의 `EXCLUDED` 에
 * `/^lib\/i18n\//` 가 있어 하드코딩 한국어 ratchet 을 오염시키지 않기 때문이다.
 *
 * 환불 정책 **본문**은 여기 없다 — `lib/legal/legalContent.ts` 의 `TERMS_CONTENT[locale]`
 * `id:"refund-policy"` 섹션을 `getRefundSection()` 으로 그대로 읽는다. 새 법률 번역을 만들지 말 것.
 */

/**
 * 링크 구조(그룹 편성과 href)는 로케일과 무관하므로 여기 한 번만 둔다.
 * 🔴 `app/components/SiteFooterHub.jsx` 의 `SEO_LINK_GROUPS` 와 **같은 href 집합**이어야 한다 —
 * `__tests__/ui/locale-footer.static.test.js` 가 부분집합 관계를 단언한다.
 * 후행 슬래시가 붙은 항목은 의도다(`trailingSlash: true` 라 없으면 308 을 한 번 탄다).
 */
export const FOOTER_LINK_GROUPS = [
  {
    titleKey: "group.core",
    hrefs: [
      "/kkul-kkul-unse/",
      "/saju/",
      "/manse/",
      "/today/",
      "/fortune/today/",
      "/fortune/tomorrow/",
      "/fortune/weekly/",
      "/fortune/monthly/",
      "/compatibility/",
      "/premium/",
      "/saju/basic/",
      "/ziwei/chart/",
      "/astrology/cosmic/",
      "/saju/sibyl/",
      "/life-book-ai/",
      "/love-secret-ai/",
      "/fortune/",
      "/destiny-compass/",
      "/saju/destiny-meeting-place/",
      "/saju-guardian/",
    ],
  },
  {
    titleKey: "group.tarot",
    hrefs: [
      "/tarot/",
      "/physiognomy/",
      "/tarot/mingri/",
      "/tarot/love/",
      "/tarot/healing/",
      "/tarot/self-esteem/",
      "/tarot/reunion/",
      "/tarot/prompt-maker/",
      "/tarot/year/",
      "/tarot/mindscan/",
      "/tarot/crystal-soul/",
      "/animal/mbti/",
    ],
  },
  {
    titleKey: "group.oracle",
    hrefs: [
      "/ziwei/",
      "/astrology/",
      "/sukuyo/",
      "/vedic/",
      "/nakshatra/",
      "/dream/",
      "/oracle/hwatu-life/",
      "/oracle/ifa/",
      "/oracle/royal-tea/",
      "/oracle/rune/",
      "/oracle/sikojen-povailu/",
      "/guides/",
      "/flower/destiny/",
      "/flower/astrology/",
      "/flower/jamidusu/",
      "/flower/sukuyo/",
      "/fortune-tea-house/",
      "/karma-destiny-ai/",
      "/new-year-ai-consultation/",
      "/yeon-star-hug/",
    ],
  },
  {
    titleKey: "group.guides",
    hrefs: [
      "/insights/",
      "/guides/",
      "/guides/complete-guide-to-saju/",
      "/guides/how-tarot-actually-works/",
      "/guides/understanding-your-destiny/",
      "/insights/fusion/",
      "/stories/",
      "/reviews/",
      "/faq/",
      "/insights/sukuyo-basics/",
      "/insights/ziwei-basics/",
      "/fortune/prompt-hub/",
    ],
  },
] as const;

/** 정책 링크. `/faq`·`/insights` 는 위 그룹에도 있지만 **라벨이 다르므로** 별도 표다. */
export const FOOTER_POLICY_HREFS = [
  "/privacy/",
  "/terms/",
  "/contact/",
  "/about/",
  "/disclaimer/",
  "/advertising-policy/",
  "/refund-policy/",
  "/faq/",
  "/methodology/",
  "/insights/",
] as const;

export type FooterGroupTitleKey = (typeof FOOTER_LINK_GROUPS)[number]["titleKey"];

export type SiteFooterHubCopy = {
  footerAriaLabel: string;
  hubAriaLabel: string;
  kicker: string;
  title: string;
  subtitle: string;
  linkNavSuffix: string;
  groupTitles: Record<FooterGroupTitleKey, string>;
  linkLabels: Record<string, string>;
  policyLabels: Record<string, string>;
  policyNavAriaLabel: string;
  /**
   * 같은 언어 목적지로 보내는 링크. 로케일 페이지에서 한국어 허브로만 나가면 그 언어의
   * 내부 링크 그래프가 생기지 않는다. 경로는 `lib/i18n/routes.ts` 의 `I18N_ROUTE_MAP` 에서 온다.
   * `tokushoho` 는 일본 특정상거래법 고지라 ja 에만 있다(다른 로케일에 넣으면 관련성 신호가 오염된다).
   */
  localeNavTitle: string;
  localeNavLabels: {
    home: string;
    ziwei: string;
    sukuyo: string;
    today: string;
    insights: string;
    tokushoho?: string;
  };
  refundAriaLabel: string;
  refundTitle: string;
  refundIntro: string;
  refundClosingPolicy: string;
  refundClosingMethod: string;
  /** 푸터 면책 고지 — 전문은 /disclaimer 에 있고 여기는 두 문장과 링크 라벨만 둔다(near-duplicate 방지). */
  disclaimerAriaLabel: string;
  disclaimerTitle: string;
  disclaimerBody: string;
  disclaimerLinkLabel: string;
  /**
   * `SocialFooter` 는 한국어 푸터와 로케일 푸터가 **함께 쓰는** 컴포넌트라 카피를 여기서 받는다.
   * `socialLinkAriaTemplate` 의 `{channel}` 이 각 채널 라벨로 치환된다.
   */
  social: {
    sectionAriaLabel: string;
    kicker: string;
    title: string;
    navAriaLabel: string;
    linkAriaTemplate: string;
    labels: {
      youtube: string;
      threads: string;
      instagram: string;
      naverBlog: string;
      x: string;
    };
  };
  businessAriaLabel: string;
  businessTitle: string;
  businessLabels: {
    name: string;
    representative: string;
    registrationNo: string;
    mailOrderNo: string;
    phone: string;
    email: string;
    address: string;
  };
  copyright: string;
};

export const SITE_FOOTER_HUB_COPY: Record<Locale, SiteFooterHubCopy> = {
  ko: {
    footerAriaLabel: "서비스 하단 정책 정보",
    hubAriaLabel: "랜딩 페이지 내부 링크 허브",
    kicker: "Constellation Navigation",
    title: "서비스 링크 허브",
    subtitle:
      "주요 운세와 랜딩 페이지를 성좌 지도로 재배열해 탐색 흐름과 검색 신호를 함께 강화했습니다.",
    linkNavSuffix: "링크",
    groupTitles: {
      "group.core": "핵심 운세",
      "group.tarot": "타로 리딩",
      "group.oracle": "신탁 & 특화",
      "group.guides": "추천 가이드",
    },
    linkLabels: {
      "/kkul-kkul-unse/": "꿀꿀 운세 — 코드 데스티니 브랜드 안내",
      "/saju/": "무료 사주풀이 보기",
      "/manse/": "꿀꿀 만세력 확인하기",
      "/today/": "오늘의 운세 확인하기",
      "/fortune/today/": "오늘의 별자리·띠 운세 24종",
      "/fortune/tomorrow/": "내일의 별자리·띠 운세",
      "/fortune/weekly/": "이번 주 별자리·띠 운세",
      "/fortune/monthly/": "이번 달 별자리·띠 운세",
      "/compatibility/": "사주 궁합 분석하기",
      "/premium/": "프리미엄 운세 리포트",
      "/saju/basic/": "사주 만세력 기본 해석",
      "/ziwei/chart/": "자미두수 12궁 명반",
      "/astrology/cosmic/": "점성술 코즈믹 차트",
      "/saju/sibyl/": "시빌라 시스템",
      "/life-book-ai/": "인생의 책",
      "/love-secret-ai/": "연애 비책 AI 상담",
      "/fortune/": "별자리·띠 운세 허브",
      "/destiny-compass/": "운명의 나침반",
      "/saju/destiny-meeting-place/": "사주로 보는 인연의 장소",
      "/saju-guardian/": "사주 가디언 수호 인장",
      "/fortune-tea-house/": "운명 찻집 상담",
      "/karma-destiny-ai/": "운명의 업 전문가 상담",
      "/new-year-ai-consultation/": "신년운세 전문가 상담",
      "/yeon-star-hug/": "연이 별빛 포옹",
      "/insights/sukuyo-basics/": "숙요점 기초 가이드",
      "/insights/ziwei-basics/": "자미두수 기초 가이드",
      "/fortune/prompt-hub/": "운세 프롬프트 허브",
      "/tarot/": "명리학 타로 시작하기",
      "/physiognomy/": "동물관상 분석하기",
      "/tarot/mingri/": "명리학 타로",
      "/tarot/love/": "우리는 무슨 사이",
      "/tarot/healing/": "따뜻한 태양 회복 타로",
      "/tarot/self-esteem/": "자존감 레벨업 타로",
      "/tarot/reunion/": "재회운 타로",
      "/tarot/prompt-maker/": "타로 프롬프트 라이브러리",
      "/tarot/year/": "십이지신 천운 타로",
      "/tarot/mindscan/": "속마음 알아보기",
      "/tarot/crystal-soul/": "원석 소울 타로",
      "/animal/mbti/": "MBTI 동물 궁합 테스트",
      "/ziwei/": "무료 자미두수 12궁 명반 보기",
      "/astrology/": "무료 점성술 운세 출생차트 보기",
      "/sukuyo/": "무료 숙요점 27수 궁합 보기",
      "/vedic/": "무료 베다 점성술(베다점) 운세",
      "/nakshatra/": "숙요점 × 베다 점성술 통합 별자리",
      "/dream/": "꿈해몽 무료 해석",
      "/oracle/hwatu-life/": "화투 인생 패 테스트",
      "/oracle/ifa/": "IFA 오라클",
      "/oracle/royal-tea/": "로열 티 오라클",
      "/oracle/rune/": "스톤헨지 룬 오라클",
      "/oracle/sikojen-povailu/": "핀란드 주석점",
      "/guides/": "하이밸류 아카이브",
      "/flower/destiny/": "운명의 꽃 아틀리에",
      "/flower/astrology/": "점성술 운명의 꽃",
      "/flower/jamidusu/": "자미두수 운명의 꽃",
      "/flower/sukuyo/": "숙요 운명의 꽃",
      "/insights/": "운명 인사이트 허브",
      "/guides/complete-guide-to-saju/": "사주 완전 가이드",
      "/guides/how-tarot-actually-works/": "타로 리딩 구조 이해",
      "/guides/understanding-your-destiny/": "운명 해석 프레임",
      "/insights/fusion/": "초융합 운세 인사이트 허브",
      "/stories/": "연이의 운명 노벨",
      "/reviews/": "실시간 사용자 후기",
      "/faq/": "자주 묻는 질문",
    },
    policyLabels: {
      "/privacy/": "개인정보처리방침",
      "/terms/": "이용약관",
      "/contact/": "문의하기",
      "/about/": "서비스 소개",
      "/disclaimer/": "면책 고지",
      "/advertising-policy/": "광고 운영정책",
      "/refund-policy/": "교환/환불 정책",
      "/faq/": "FAQ",
      "/methodology/": "콘텐츠 방법론",
      "/insights/": "인사이트 아카이브",
    },
    policyNavAriaLabel: "정책 및 안내 링크",
    localeNavTitle: "한국어 바로가기",
    localeNavLabels: {
        home: "홈",
        ziwei: "자미두수",
        sukuyo: "숙요점",
        today: "오늘의 운세",
        insights: "인사이트",
      },
    refundAriaLabel: "환불 정책 안내",
    refundTitle: "디지털 운세 서비스 환불 안내",
    refundIntro:
      "유료 결제 상품은 30일 이용권과 상품별 원화 단건 결제이며, 월정석은 별도 구매·충전 상품이 아닙니다.",
    refundClosingPolicy:
      "본 안내는 이용약관 및 결제대행사 정책과 함께 적용되며, 강행규정과 충돌하는 경우 관계 법령을 우선합니다. 환불 접수는 문의하기 또는 고객지원 이메일을 통해 진행하시기 바랍니다.",
    refundClosingMethod: "환불 처리는 결제 수단(카드)으로만 가능합니다.",
    disclaimerAriaLabel: "면책 고지",
    disclaimerTitle: "면책 고지",
    disclaimerBody: "Code Destiny의 사주·타로·점성술 등 모든 운세 콘텐츠는 오락 및 자기 성찰 목적의 참고 정보이며, 확정된 미래를 예언하거나 결과의 정확성을 보장하지 않습니다. 의료·법률·투자·정신건강 등 중요한 결정은 반드시 해당 분야 전문가와 상담하시기 바랍니다.",
    disclaimerLinkLabel: "면책 고지 전문 보기",
    social: {
      sectionAriaLabel: "Code Destiny 공식 SNS 채널",
      kicker: "Official Channels",
      title: "Code Destiny 공식 채널",
      navAriaLabel: "Code Destiny SNS 바로가기",
      linkAriaTemplate: "Code Destiny 공식 {channel} 새 창으로 열기",
      labels: { youtube: "유튜브", threads: "쓰레드", instagram: "인스타그램", naverBlog: "블로그", x: "X" },
    },
    businessAriaLabel: "사업자 정보",
    businessTitle: "사업자 정보",
    businessLabels: {
      name: "상호명",
      representative: "대표자",
      registrationNo: "사업자등록번호",
      mailOrderNo: "통신판매업 신고번호",
      phone: "연락처",
      email: "이메일",
      address: "사업장 주소",
    },
    copyright: "© 2026 Code Destiny. 코드 데스티니 · 꿀꿀 만세력",
  },

  ja: {
    footerAriaLabel: "サービスフッターの規約情報",
    hubAriaLabel: "ランディングページ内部リンクハブ",
    kicker: "Constellation Navigation",
    title: "サービスリンクハブ",
    subtitle:
      "主要な占いとランディングページを星座マップとして並べ直し、回遊のしやすさと検索シグナルの両方を強めています。",
    linkNavSuffix: "リンク",
    groupTitles: {
      "group.core": "主要な占い",
      "group.tarot": "タロットリーディング",
      "group.oracle": "神託・専門占い",
      "group.guides": "おすすめガイド",
    },
    linkLabels: {
      "/kkul-kkul-unse/": "ククル運勢 — Code Destiny ブランド案内",
      "/saju/": "無料の四柱推命を見る",
      "/manse/": "万年暦を調べる",
      "/today/": "今日の運勢を見る",
      "/fortune/today/": "星座・干支24種の今日の運勢",
      "/fortune/tomorrow/": "星座・干支の明日の運勢",
      "/fortune/weekly/": "星座・干支の今週の運勢",
      "/fortune/monthly/": "星座・干支の今月の運勢",
      "/compatibility/": "四柱推命の相性を占う",
      "/premium/": "プレミアム運勢レポート",
      "/saju/basic/": "四柱推命・万年暦の基本解釈",
      "/ziwei/chart/": "紫微斗数 十二宮命盤",
      "/astrology/cosmic/": "西洋占星術コズミックチャート",
      "/saju/sibyl/": "シビラ・システム",
      "/life-book-ai/": "人生の書",
      "/love-secret-ai/": "恋愛秘策AI相談",
      "/fortune/": "星座・干支占いハブ",
      "/destiny-compass/": "運命の羅針盤",
      "/saju/destiny-meeting-place/": "四柱で見る縁の場所",
      "/saju-guardian/": "四柱推命ガーディアン 守護印",
      "/fortune-tea-house/": "運命の茶屋 相談",
      "/karma-destiny-ai/": "運命の業 専門相談",
      "/new-year-ai-consultation/": "新年運勢 専門相談",
      "/yeon-star-hug/": "ヨニの星あかりの抱擁",
      "/insights/sukuyo-basics/": "宿曜占星術の基礎",
      "/insights/ziwei-basics/": "紫微斗数の基礎",
      "/fortune/prompt-hub/": "占いプロンプトハブ",
      "/tarot/": "命理学タロットを始める",
      "/physiognomy/": "動物人相を占う",
      "/tarot/mingri/": "命理学タロット",
      "/tarot/love/": "二人はどんな関係？",
      "/tarot/healing/": "温かな太陽・回復のタロット",
      "/tarot/self-esteem/": "自己肯定感レベルアップ・タロット",
      "/tarot/reunion/": "復縁運タロット",
      "/tarot/prompt-maker/": "タロット・プロンプトライブラリ",
      "/tarot/year/": "十二支・天運タロット",
      "/tarot/mindscan/": "本音を読み解く",
      "/tarot/crystal-soul/": "原石ソウル・タロット",
      "/animal/mbti/": "MBTI動物相性診断",
      "/ziwei/": "無料の紫微斗数 十二宮命盤を見る",
      "/astrology/": "無料の西洋占星術・出生図を見る",
      "/sukuyo/": "無料の宿曜占星術・二十七宿の相性を見る",
      "/vedic/": "無料のヴェーダ占星術の運勢",
      "/nakshatra/": "宿曜 × ヴェーダ占星術の統合ナクシャトラ",
      "/dream/": "夢占い・無料診断",
      "/oracle/hwatu-life/": "花札・人生の手札テスト",
      "/oracle/ifa/": "IFAオラクル",
      "/oracle/royal-tea/": "ロイヤルティー・オラクル",
      "/oracle/rune/": "ストーンヘンジ・ルーンオラクル",
      "/oracle/sikojen-povailu/": "フィンランドの錫占い",
      "/guides/": "ハイバリュー・アーカイブ",
      "/flower/destiny/": "運命の花アトリエ",
      "/flower/astrology/": "占星術・運命の花",
      "/flower/jamidusu/": "紫微斗数・運命の花",
      "/flower/sukuyo/": "宿曜・運命の花",
      "/insights/": "運命インサイト・ハブ",
      "/guides/complete-guide-to-saju/": "四柱推命 完全ガイド",
      "/guides/how-tarot-actually-works/": "タロットリーディングの仕組み",
      "/guides/understanding-your-destiny/": "運命を読み解くフレーム",
      "/insights/fusion/": "超融合占いインサイト・ハブ",
      "/stories/": "ヨニの運命ノベル",
      "/reviews/": "リアルタイム利用者レビュー",
      "/faq/": "よくある質問",
    },
    policyLabels: {
      "/privacy/": "プライバシーポリシー",
      "/terms/": "利用規約",
      "/contact/": "お問い合わせ",
      "/about/": "サービス紹介",
      "/disclaimer/": "免責事項",
      "/advertising-policy/": "広告運営ポリシー",
      "/refund-policy/": "返金・交換ポリシー",
      "/faq/": "FAQ",
      "/methodology/": "コンテンツ方法論",
      "/insights/": "インサイト・アーカイブ",
    },
    policyNavAriaLabel: "ポリシー・案内リンク",
    localeNavTitle: "日本語のページ",
    localeNavLabels: {
        home: "ホーム",
        ziwei: "紫微斗数",
        sukuyo: "宿曜占星術",
        today: "今日の運勢",
        insights: "インサイト",
        tokushoho: "特定商取引法に基づく表記",
      },
    refundAriaLabel: "返金ポリシー案内",
    refundTitle: "デジタル占いサービスの返金案内",
    refundIntro:
      "有料決済商品は30日パスおよび商品ごとのウォン建て都度決済であり、ムーンストーンは別途購入・チャージする商品ではありません。",
    refundClosingPolicy:
      "本案内は利用規約および決済代行会社のポリシーと併せて適用され、強行規定と抵触する場合は関係法令が優先します。返金のお申し込みは、お問い合わせまたはカスタマーサポートのメールからお願いします。",
    refundClosingMethod: "返金は、決済に使用された手段（カード）へのみ行われます。",
    disclaimerAriaLabel: "免責事項",
    disclaimerTitle: "免責事項",
    disclaimerBody: "Code Destinyの四柱推命・タロット・占星術などすべての占いコンテンツは、娯楽および自己省察を目的とした参考情報であり、確定した未来を予言するものでも、結果の正確性を保証するものでもありません。医療・法律・投資・メンタルヘルスなど重要な決定は、必ず該当分野の専門家にご相談ください。",
    disclaimerLinkLabel: "免責事項の全文を見る",
    social: {
      sectionAriaLabel: "Code Destiny 公式SNSチャンネル",
      kicker: "Official Channels",
      title: "Code Destiny 公式チャンネル",
      navAriaLabel: "Code Destiny SNSへのショートカット",
      linkAriaTemplate: "Code Destiny 公式{channel}を新しいウィンドウで開く",
      labels: { youtube: "YouTube", threads: "Threads", instagram: "Instagram", naverBlog: "ブログ", x: "X" },
    },
    businessAriaLabel: "事業者情報",
    businessTitle: "事業者情報",
    businessLabels: {
      name: "商号",
      representative: "代表者",
      registrationNo: "事業者登録番号",
      mailOrderNo: "通信販売業申告番号",
      phone: "連絡先",
      email: "メール",
      address: "事業所所在地",
    },
    copyright: "© 2026 Code Destiny.",
  },

  zh: {
    footerAriaLabel: "服务页脚政策信息",
    hubAriaLabel: "落地页内部链接中心",
    kicker: "Constellation Navigation",
    title: "服务链接中心",
    subtitle:
      "我们把主要运势与落地页重新排布为星座地图，同时增强浏览动线与搜索信号。",
    linkNavSuffix: "链接",
    groupTitles: {
      "group.core": "核心运势",
      "group.tarot": "塔罗解读",
      "group.oracle": "神谕与特色占卜",
      "group.guides": "推荐指南",
    },
    linkLabels: {
      "/kkul-kkul-unse/": "咕咕运势 — Code Destiny 品牌介绍",
      "/saju/": "查看免费四柱八字解读",
      "/manse/": "查询万年历",
      "/today/": "查看今日运势",
      "/fortune/today/": "星座生肖24种今日运势",
      "/fortune/tomorrow/": "星座生肖明日运势",
      "/fortune/weekly/": "星座生肖本周运势",
      "/fortune/monthly/": "星座生肖本月运势",
      "/compatibility/": "分析四柱合婚",
      "/premium/": "高级运势报告",
      "/saju/basic/": "四柱与万年历基础解读",
      "/ziwei/chart/": "紫微斗数十二宫命盘",
      "/astrology/cosmic/": "占星宇宙星盘",
      "/saju/sibyl/": "西比拉系统",
      "/life-book-ai/": "人生之书",
      "/love-secret-ai/": "恋爱秘策 AI 咨询",
      "/fortune/": "星座生肖运势总览",
      "/destiny-compass/": "命运罗盘",
      "/saju/destiny-meeting-place/": "四柱看缘分之地",
      "/saju-guardian/": "四柱守护神印记",
      "/fortune-tea-house/": "命运茶馆咨询",
      "/karma-destiny-ai/": "命业专家咨询",
      "/new-year-ai-consultation/": "新年运势专家咨询",
      "/yeon-star-hug/": "缘伊星光拥抱",
      "/insights/sukuyo-basics/": "宿曜占星基础",
      "/insights/ziwei-basics/": "紫微斗数基础",
      "/fortune/prompt-hub/": "运势提示词中心",
      "/tarot/": "开始命理塔罗",
      "/physiognomy/": "分析动物面相",
      "/tarot/mingri/": "命理塔罗",
      "/tarot/love/": "我们是什么关系",
      "/tarot/healing/": "暖阳疗愈塔罗",
      "/tarot/self-esteem/": "提升自尊塔罗",
      "/tarot/reunion/": "复合运塔罗",
      "/tarot/prompt-maker/": "塔罗提示词库",
      "/tarot/year/": "十二生肖天运塔罗",
      "/tarot/mindscan/": "探知真心",
      "/tarot/crystal-soul/": "原石灵魂塔罗",
      "/animal/mbti/": "MBTI 动物合拍测试",
      "/ziwei/": "查看免费紫微斗数十二宫命盘",
      "/astrology/": "查看免费占星出生星盘",
      "/sukuyo/": "查看免费宿曜二十七宿合盘",
      "/vedic/": "免费吠陀占星运势",
      "/nakshatra/": "宿曜 × 吠陀占星整合星宿",
      "/dream/": "免费解梦",
      "/oracle/hwatu-life/": "花牌人生牌测试",
      "/oracle/ifa/": "IFA 神谕",
      "/oracle/royal-tea/": "皇家茶占神谕",
      "/oracle/rune/": "巨石阵卢恩神谕",
      "/oracle/sikojen-povailu/": "芬兰锡占",
      "/guides/": "高价值内容库",
      "/flower/destiny/": "命运之花工坊",
      "/flower/astrology/": "占星命运之花",
      "/flower/jamidusu/": "紫微斗数命运之花",
      "/flower/sukuyo/": "宿曜命运之花",
      "/insights/": "命运洞察中心",
      "/guides/complete-guide-to-saju/": "四柱八字完全指南",
      "/guides/how-tarot-actually-works/": "理解塔罗解读的结构",
      "/guides/understanding-your-destiny/": "命运解读框架",
      "/insights/fusion/": "超融合运势洞察中心",
      "/stories/": "Yeoni 的命运小说",
      "/reviews/": "实时用户评价",
      "/faq/": "常见问题",
    },
    policyLabels: {
      "/privacy/": "隐私政策",
      "/terms/": "服务条款",
      "/contact/": "联系我们",
      "/about/": "服务介绍",
      "/disclaimer/": "免责声明",
      "/advertising-policy/": "广告运营政策",
      "/refund-policy/": "退换与退款政策",
      "/faq/": "常见问题解答",
      "/methodology/": "内容方法论",
      "/insights/": "洞察归档",
    },
    policyNavAriaLabel: "政策与指南链接",
    localeNavTitle: "简体中文页面",
    localeNavLabels: {
        home: "首页",
        ziwei: "紫微斗数",
        sukuyo: "宿曜占星",
        today: "今日运势",
        insights: "洞察",
      },
    refundAriaLabel: "退款政策说明",
    refundTitle: "数字运势服务退款说明",
    refundIntro:
      "付费商品为30天通行证与各商品的韩元单次付款，月晶石并非另行购买或充值的商品。",
    refundClosingPolicy:
      "本说明与服务条款及支付服务商政策一并适用；如与强制性法规冲突，以相关法令为准。退款申请请通过联系我们或客服邮箱提出。",
    refundClosingMethod: "退款仅可退回至原支付方式（银行卡）。",
    disclaimerAriaLabel: "免责声明",
    disclaimerTitle: "免责声明",
    disclaimerBody: "Code Destiny 的四柱、塔罗、占星等全部运势内容仅供娱乐与自我反思参考，不预言既定的未来，也不保证结果的准确性。涉及医疗、法律、投资、心理健康等重要决定，请务必咨询相关领域的专业人士。",
    disclaimerLinkLabel: "查看完整免责声明",
    social: {
      sectionAriaLabel: "Code Destiny 官方社交渠道",
      kicker: "Official Channels",
      title: "Code Destiny 官方渠道",
      navAriaLabel: "Code Destiny 社交媒体快捷入口",
      linkAriaTemplate: "在新窗口打开 Code Destiny 官方{channel}",
      labels: { youtube: "YouTube", threads: "Threads", instagram: "Instagram", naverBlog: "博客", x: "X" },
    },
    businessAriaLabel: "企业信息",
    businessTitle: "企业信息",
    businessLabels: {
      name: "公司名称",
      representative: "法定代表人",
      registrationNo: "营业执照号码",
      mailOrderNo: "电子商务备案号",
      phone: "联系电话",
      email: "电子邮箱",
      address: "营业地址",
    },
    copyright: "© 2026 Code Destiny.",
  },

  "zh-TW": {
    footerAriaLabel: "服務頁尾政策資訊",
    hubAriaLabel: "到達頁內部連結中心",
    kicker: "Constellation Navigation",
    title: "服務連結中心",
    subtitle:
      "我們把主要運勢與到達頁重新排布為星座地圖，同時強化瀏覽動線與搜尋訊號。",
    linkNavSuffix: "連結",
    groupTitles: {
      "group.core": "核心運勢",
      "group.tarot": "塔羅解讀",
      "group.oracle": "神諭與特色占卜",
      "group.guides": "推薦指南",
    },
    linkLabels: {
      "/kkul-kkul-unse/": "咕咕運勢 — Code Destiny 品牌介紹",
      "/saju/": "查看免費四柱八字解讀",
      "/manse/": "查詢萬年曆",
      "/today/": "查看今日運勢",
      "/fortune/today/": "星座生肖24種今日運勢",
      "/fortune/tomorrow/": "星座生肖明日運勢",
      "/fortune/weekly/": "星座生肖本週運勢",
      "/fortune/monthly/": "星座生肖本月運勢",
      "/compatibility/": "分析四柱合婚",
      "/premium/": "高級運勢報告",
      "/saju/basic/": "四柱與萬年曆基礎解讀",
      "/ziwei/chart/": "紫微斗數十二宮命盤",
      "/astrology/cosmic/": "占星宇宙星盤",
      "/saju/sibyl/": "西比拉系統",
      "/life-book-ai/": "人生之書",
      "/love-secret-ai/": "戀愛祕策 AI 諮詢",
      "/fortune/": "星座生肖運勢總覽",
      "/destiny-compass/": "命運羅盤",
      "/saju/destiny-meeting-place/": "四柱看緣分之地",
      "/saju-guardian/": "四柱守護神印記",
      "/fortune-tea-house/": "命運茶館諮詢",
      "/karma-destiny-ai/": "命業專家諮詢",
      "/new-year-ai-consultation/": "新年運勢專家諮詢",
      "/yeon-star-hug/": "緣伊星光擁抱",
      "/insights/sukuyo-basics/": "宿曜占星基礎",
      "/insights/ziwei-basics/": "紫微斗數基礎",
      "/fortune/prompt-hub/": "運勢提示詞中心",
      "/tarot/": "開始命理塔羅",
      "/physiognomy/": "分析動物面相",
      "/tarot/mingri/": "命理塔羅",
      "/tarot/love/": "我們是什麼關係",
      "/tarot/healing/": "暖陽療癒塔羅",
      "/tarot/self-esteem/": "提升自尊塔羅",
      "/tarot/reunion/": "復合運塔羅",
      "/tarot/prompt-maker/": "塔羅提示詞庫",
      "/tarot/year/": "十二生肖天運塔羅",
      "/tarot/mindscan/": "探知真心",
      "/tarot/crystal-soul/": "原石靈魂塔羅",
      "/animal/mbti/": "MBTI 動物合拍測驗",
      "/ziwei/": "查看免費紫微斗數十二宮命盤",
      "/astrology/": "查看免費占星出生星盤",
      "/sukuyo/": "查看免費宿曜二十七宿合盤",
      "/vedic/": "免費吠陀占星運勢",
      "/nakshatra/": "宿曜 × 吠陀占星整合星宿",
      "/dream/": "免費解夢",
      "/oracle/hwatu-life/": "花牌人生牌測驗",
      "/oracle/ifa/": "IFA 神諭",
      "/oracle/royal-tea/": "皇家茶占神諭",
      "/oracle/rune/": "巨石陣盧恩神諭",
      "/oracle/sikojen-povailu/": "芬蘭錫占",
      "/guides/": "高價值內容庫",
      "/flower/destiny/": "命運之花工坊",
      "/flower/astrology/": "占星命運之花",
      "/flower/jamidusu/": "紫微斗數命運之花",
      "/flower/sukuyo/": "宿曜命運之花",
      "/insights/": "命運洞察中心",
      "/guides/complete-guide-to-saju/": "四柱八字完全指南",
      "/guides/how-tarot-actually-works/": "理解塔羅解讀的結構",
      "/guides/understanding-your-destiny/": "命運解讀框架",
      "/insights/fusion/": "超融合運勢洞察中心",
      "/stories/": "Yeoni 的命運小說",
      "/reviews/": "即時使用者評價",
      "/faq/": "常見問題",
    },
    policyLabels: {
      "/privacy/": "隱私權政策",
      "/terms/": "服務條款",
      "/contact/": "聯絡我們",
      "/about/": "服務介紹",
      "/disclaimer/": "免責聲明",
      "/advertising-policy/": "廣告營運政策",
      "/refund-policy/": "退換與退款政策",
      "/faq/": "常見問題解答",
      "/methodology/": "內容方法論",
      "/insights/": "洞察彙整",
    },
    policyNavAriaLabel: "政策與指南連結",
    localeNavTitle: "繁體中文頁面",
    localeNavLabels: {
        home: "首頁",
        ziwei: "紫微斗數",
        sukuyo: "宿曜占星",
        today: "今日運勢",
        insights: "洞察",
      },
    refundAriaLabel: "退款政策說明",
    refundTitle: "數位運勢服務退款說明",
    refundIntro:
      "付費商品為30天通行證與各商品的韓元單次付款，月晶石並非另行購買或儲值的商品。",
    refundClosingPolicy:
      "本說明與服務條款及金流服務商政策一併適用；如與強行規定衝突，以相關法令為準。退款申請請透過聯絡我們或客服信箱提出。",
    refundClosingMethod: "退款僅可退回至原支付方式（信用卡）。",
    disclaimerAriaLabel: "免責聲明",
    disclaimerTitle: "免責聲明",
    disclaimerBody: "Code Destiny 的四柱、塔羅、占星等全部運勢內容僅供娛樂與自我反思參考，不預言既定的未來，也不保證結果的準確性。涉及醫療、法律、投資、心理健康等重要決定，請務必諮詢相關領域的專業人士。",
    disclaimerLinkLabel: "查看完整免責聲明",
    social: {
      sectionAriaLabel: "Code Destiny 官方社群頻道",
      kicker: "Official Channels",
      title: "Code Destiny 官方頻道",
      navAriaLabel: "Code Destiny 社群媒體捷徑",
      linkAriaTemplate: "在新視窗開啟 Code Destiny 官方{channel}",
      labels: { youtube: "YouTube", threads: "Threads", instagram: "Instagram", naverBlog: "部落格", x: "X" },
    },
    businessAriaLabel: "營業人資訊",
    businessTitle: "營業人資訊",
    businessLabels: {
      name: "公司名稱",
      representative: "代表人",
      registrationNo: "營業登記號碼",
      mailOrderNo: "通訊販賣業申報號碼",
      phone: "聯絡電話",
      email: "電子郵件",
      address: "營業地址",
    },
    copyright: "© 2026 Code Destiny.",
  },

  en: {
    footerAriaLabel: "Site footer policy information",
    hubAriaLabel: "Landing page internal link hub",
    kicker: "Constellation Navigation",
    title: "Service Link Hub",
    subtitle:
      "The main readings and landing pages are laid out as a constellation map, strengthening both the browsing path and the search signal.",
    linkNavSuffix: "links",
    groupTitles: {
      "group.core": "Core Readings",
      "group.tarot": "Tarot Readings",
      "group.oracle": "Oracles & Specialties",
      "group.guides": "Recommended Guides",
    },
    linkLabels: {
      "/kkul-kkul-unse/": "Kkul-Kkul Fortune — about the Code Destiny brand",
      "/saju/": "See a free Saju reading",
      "/manse/": "Look up the Manse calendar",
      "/today/": "See today's fortune",
      "/fortune/today/": "Today by zodiac and Chinese sign",
      "/fortune/tomorrow/": "Tomorrow by zodiac and sign",
      "/fortune/weekly/": "This week by zodiac and sign",
      "/fortune/monthly/": "This month by zodiac and sign",
      "/compatibility/": "Analyse Saju compatibility",
      "/premium/": "Premium fortune report",
      "/saju/basic/": "Saju and Manse calendar basics",
      "/ziwei/chart/": "Zi Wei Dou Shu twelve-palace chart",
      "/astrology/cosmic/": "Cosmic astrology chart",
      "/saju/sibyl/": "The Sibylla system",
      "/life-book-ai/": "The Book of Life",
      "/love-secret-ai/": "Love strategy AI consultation",
      "/fortune/": "Zodiac and Chinese zodiac fortune hub",
      "/destiny-compass/": "Destiny compass",
      "/saju/destiny-meeting-place/": "Where you may meet your person",
      "/saju-guardian/": "Saju Guardian seal",
      "/fortune-tea-house/": "Destiny Tea House reading",
      "/karma-destiny-ai/": "Karma destiny expert consultation",
      "/new-year-ai-consultation/": "New year fortune consultation",
      "/yeon-star-hug/": "Yeoni starlight hug",
      "/insights/sukuyo-basics/": "Sukuyo astrology basics",
      "/insights/ziwei-basics/": "Zi Wei Dou Shu basics",
      "/fortune/prompt-hub/": "Fortune prompt hub",
      "/tarot/": "Start a Myeongri tarot reading",
      "/physiognomy/": "Animal face reading",
      "/tarot/mingri/": "Myeongri tarot",
      "/tarot/love/": "What are we to each other?",
      "/tarot/healing/": "Warm sun healing tarot",
      "/tarot/self-esteem/": "Self-esteem level-up tarot",
      "/tarot/reunion/": "Reunion tarot",
      "/tarot/prompt-maker/": "Tarot prompt library",
      "/tarot/year/": "Zodiac fortune tarot",
      "/tarot/mindscan/": "Read their true feelings",
      "/tarot/crystal-soul/": "Crystal soul tarot",
      "/animal/mbti/": "MBTI animal compatibility test",
      "/ziwei/": "See a free Zi Wei Dou Shu chart",
      "/astrology/": "See a free astrology birth chart",
      "/sukuyo/": "See free Sukuyo 27-mansion compatibility",
      "/vedic/": "Free Vedic astrology reading",
      "/nakshatra/": "Sukuyo x Vedic combined nakshatra",
      "/dream/": "Free dream interpretation",
      "/oracle/hwatu-life/": "Hwatu life-hand test",
      "/oracle/ifa/": "IFA Oracle",
      "/oracle/royal-tea/": "Royal Tea Oracle",
      "/oracle/rune/": "Stonehenge rune oracle",
      "/oracle/sikojen-povailu/": "Finnish tin divination",
      "/guides/": "High-value archive",
      "/flower/destiny/": "Flower of Destiny atelier",
      "/flower/astrology/": "Astrology Flower of Destiny",
      "/flower/jamidusu/": "Zi Wei Flower of Destiny",
      "/flower/sukuyo/": "Sukuyo Flower of Destiny",
      "/insights/": "Destiny insights hub",
      "/guides/complete-guide-to-saju/": "The complete guide to Saju",
      "/guides/how-tarot-actually-works/": "How tarot reading actually works",
      "/guides/understanding-your-destiny/": "A framework for reading destiny",
      "/insights/fusion/": "Fusion fortune insights hub",
      "/stories/": "Yeoni's Destiny Novel",
      "/reviews/": "Live user reviews",
      "/faq/": "Frequently asked questions",
    },
    policyLabels: {
      "/privacy/": "Privacy Policy",
      "/terms/": "Terms of Service",
      "/contact/": "Contact",
      "/about/": "About",
      "/disclaimer/": "Disclaimer",
      "/advertising-policy/": "Advertising Policy",
      "/refund-policy/": "Refund Policy",
      "/faq/": "FAQ",
      "/methodology/": "Content Methodology",
      "/insights/": "Insights Archive",
    },
    policyNavAriaLabel: "Policy and information links",
    localeNavTitle: "Pages in English",
    localeNavLabels: {
        home: "Home",
        ziwei: "Zi Wei Dou Shu",
        sukuyo: "Sukuyo astrology",
        today: "Today's fortune",
        insights: "Insights",
      },
    refundAriaLabel: "Refund policy information",
    refundTitle: "Refund guide for digital fortune services",
    refundIntro:
      "The paid products are the 30-day Pass and per-item single payments in KRW. Moonstones are not a separately purchased or topped-up product.",
    refundClosingPolicy:
      "This guide applies together with the Terms of Service and the payment provider's policies; where it conflicts with mandatory law, the applicable statutes prevail. Refund requests can be made through Contact or the customer support email.",
    refundClosingMethod: "Refunds can only be issued to the original payment method (card).",
    disclaimerAriaLabel: "Disclaimer",
    disclaimerTitle: "Disclaimer",
    disclaimerBody: "All fortune content on Code Destiny, including Saju, tarot, and astrology, is provided for entertainment and self-reflection only; it does not predict a fixed future and its accuracy is not guaranteed. For important medical, legal, financial, or mental-health decisions, always consult a qualified professional.",
    disclaimerLinkLabel: "Read the full disclaimer",
    social: {
      sectionAriaLabel: "Code Destiny official social channels",
      kicker: "Official Channels",
      title: "Code Destiny official channels",
      navAriaLabel: "Shortcuts to Code Destiny social media",
      linkAriaTemplate: "Open the official Code Destiny {channel} in a new window",
      labels: { youtube: "YouTube", threads: "Threads", instagram: "Instagram", naverBlog: "Blog", x: "X" },
    },
    businessAriaLabel: "Business information",
    businessTitle: "Business information",
    businessLabels: {
      name: "Business name",
      representative: "Representative",
      registrationNo: "Business registration no.",
      mailOrderNo: "Mail-order business no.",
      phone: "Phone",
      email: "Email",
      address: "Business address",
    },
    copyright: "© 2026 Code Destiny.",
  },
};
