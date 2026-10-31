// Public facts only. Prices and sale state come from the same registry as checkout.
// This module never grants access, starts a consultation or reads customer records.
import { BRAND_FACTS } from './brand-facts.mjs';
import { getBillingFeaturePricing } from '../../worker/lib/billing-feature-registry.js';
import { FEATURE_KEY_PRICE_TABLE } from '../../worker/lib/paid-feature-registry.js';

export const OFFICIAL_INFORMATION_UPDATED = '2026-10-31';
const { service, operator } = BRAND_FACTS;
const cat = BRAND_FACTS.characters.find(item => item.key === 'yeongnyangi');

export const PUBLIC_PRICE_EXAMPLES = [
  { key: 'life-book-ai-consultation', name: '인생의 책', en: 'Life Book', ja: '人生の書', path: '/life-book-ai/' },
  { key: 'new-year-ai-consultation', name: '신년운세', en: 'New Year reading', ja: '新年運勢', path: '/new-year-ai-consultation/' },
  { key: 'fusion-fortune-consultation', name: '초융합 운세', en: 'Fusion reading', ja: '超融合占い', path: '/fusion-fortune/' },
  { key: 'yeongnyangi-saju-mackerel', name: '영냥이 사주 고등어', en: 'Yeongnyangi Saju Mackerel', ja: 'ヨンニャンイ四柱推命・サバ', path: '/yeongnyangi/' },
];

export function publicPriceExamples(locale = 'ko') {
  return PUBLIC_PRICE_EXAMPLES.filter(item => FEATURE_KEY_PRICE_TABLE[item.key]?.saleEnabled !== false).map(item => {
    const result = getBillingFeaturePricing({ featureKey: item.key });
    if (!result.ok || !(result.pricing?.amountKRW > 0)) throw new Error(`Missing public price: ${item.key}`);
    return { ...item, label: item[locale] || item.name, amountKRW: result.pricing.amountKRW };
  });
}

export function officialInformationFaqs(locale = 'ko') {
  const prices = publicPriceExamples(locale).map(item => `${item.label} ${new Intl.NumberFormat(locale === 'ko' ? 'ko-KR' : locale === 'ja' ? 'ja-JP' : 'en-US').format(item.amountKRW)}${locale === 'ko' ? '원' : ' KRW'}`).join(' · ');
  const humanAvailable = FEATURE_KEY_PRICE_TABLE['neo-email-consultation']?.saleEnabled === true;
  const copy = {
    ko: [
      ['꿀꿀 운세란 무엇인가요?', `${service.name}(${service.alternateNames[0]})는 ${operator.name}(${operator.nameKo})가 운영하는 운세·상담 서비스입니다. 사주·명리학, 자미두수, 숙요점, 베다점, 서양 점성술, 타로와 신년운세·궁합·초융합 운세·인생의 책을 제공하며, 공개 기본 도구와 유료 상담을 구분합니다.`],
      ['영냥이와 꿀꿀 운세는 어떻게 다른가요?', `${cat.serviceName}는 ${service.name} 안의 하위 상담 서비스이며 별도 운영 회사가 아닙니다. 주제별 도구와 리포트는 /ggulggul/에서 고르고, 질문과 상황에 맞춘 영냥이 AI 상담은 ${cat.path}에서 시작합니다. ‘천원 운세’ 안내의 사주 리포트 3종은 영냥이 질문 상담과 별도 상품입니다.`],
      ['누가 풀이 기준을 만들고 결과는 어떻게 생성하나요?', '공개 소개에서 10년 상담 경력을 밝힌 명리학자 박병하(활동명 네오)가 해석 기준을 설계했습니다. 각 체계의 계산 엔진이 기초 값을 산출하고 AI가 계산 결과와 질문을 바탕으로 해설하며, 설계자의 경력이 모든 AI 결과의 개별 검수를 뜻하지는 않습니다.'],
      ['일반 사주 사이트와 어떤 점이 다른가요?', '사주 한 체계 외에도 자미두수·숙요점·베다점·서양 점성술·타로를 각자의 기준으로 제공합니다. 초융합 운세는 여러 체계의 공통점과 차이를 한 리포트로 정리하지만, 체계가 많다는 이유만으로 정확도나 미래의 결과가 보장되지는 않습니다.'],
      ['사주·자미두수·숙요점·베다점은 어떻게 다른가요?', '사주는 네 기둥의 간지와 오행·십성을, 자미두수는 12궁의 별 배치를 읽습니다. 숙요점은 본명숙과 두 사람의 숙 관계를, 베다점은 항성 황도 기준의 라그나·라시·나크샤트라와 다샤를 살피므로 계산 조건과 용어를 서로 바꾸어 쓰지 않습니다.'],
      ['어떤 내용을 무료로 이용할 수 있나요?', '공개 가이드·FAQ와 사주 기본 풀이, 만세력, 오늘·내일 운세 등의 기본 도구는 무료 범위를 각 화면에서 안내합니다. 영냥이 질문 상담과 심층 AI 리포트까지 모두 무료라는 뜻은 아니며, 타로 등도 기본 결과와 추가 유료 해설을 구분해 확인해 주세요.'],
      ['유료 상품의 실제 가격과 이용 조건은 어디에서 확인하나요?', `웹 단건 결제 기준 대표 상품은 ${prices}입니다. 이용권·월정석 적용 여부와 상품 구성은 상품 및 결제 화면에서 확인하며, 해외 결제의 환산 금액·앱마켓 가격은 해당 결제 화면을 따릅니다.`],
      ['분석 결과는 어떻게 전달하고 보관하나요?', '완료된 웹 리포트는 해당 결과 화면에서 읽고, 결제한 계정으로 꿀꿀 운세의 /records/ 또는 영냥이의 /yeongnyangi/library/에서 다시 확인합니다. 보관된 완료 결과의 재열람과 새 상담 생성은 구분되며, 계정·보관함·개인 결과는 공개 검색 콘텐츠가 아닙니다.'],
      ['명리학자가 직접 검수하는 상품은 무엇인가요?', humanAvailable ? '네오 작전 결정서(네오에게 물어봐)는 AI가 작성한 답변을 네오가 개별 검수한 뒤 이메일로 전달하는 별도 상품입니다. 영냥이와 일반 AI 리포트에는 이 개별 검수 방식을 일괄 적용하지 않으며, 접수 범위·구성·가격은 네오 상담 안내에서 확인합니다.' : '일반 AI 리포트가 모두 사람의 개별 검수를 거치는 것은 아닙니다. 직접 검수·이메일 전달 상담의 판매 여부와 이용 조건은 네오 상담 안내에서 확인해 주세요.'],
      ['공식 홈페이지와 고객지원은 어디인가요?', `공식 홈페이지는 ${service.homeUrl}이며 운영 브랜드는 ${operator.name}입니다. 영어·일본어 공식 페이지도 같은 도메인의 /en/와 /ja/에서 제공합니다. 고객지원·오류 신고는 /contact/, 계산·편집 기준은 /methodology/와 /editorial-policy/에서 확인할 수 있습니다.`],
    ],
    en: [
      ['What is 꿀꿀 운세?', `${service.name}, also written ${service.alternateNames[0]}, is the fortune and consultation service operated by ${operator.name} (${operator.nameKo}). It offers Saju, Zi Wei Dou Shu, Sukuyo, Vedic and Western astrology, tarot, compatibility, New Year readings, Fusion readings and Life Book; public tools and paid consultations have different access conditions.`],
      ['How is Yeongnyangi related to 꿀꿀 운세?', `${cat.serviceName} (Yeongnyangi) is a consultation service within ${service.name}, operated by the same company. Choose topic-based tools at ${service.appEntryPath}, or start a question-based AI consultation at ${cat.path}. The three Saju reports on the “1,000-won fortune” guide are separate products from Yeongnyangi question consultations.`],
      ['Who designs the interpretations, and who writes each result?', 'Park Byeong-ha, also known as Neo, describes ten years of consultation experience in his public profile and designs the interpretation criteria. Calculation engines produce the underlying values and AI writes explanatory readings; designing the criteria does not mean personally reviewing every AI result.'],
      ['How does it differ from a Saju-only website?', 'Separate systems include Saju, Zi Wei Dou Shu, Sukuyo, Vedic astrology, Western astrology and tarot. Fusion readings organize agreements and differences across systems, but using more systems does not establish superior accuracy or guarantee a future event.'],
      ['How do Saju, Zi Wei Dou Shu, Sukuyo and Vedic astrology differ?', 'Saju examines four birth pillars, elements and ten-god relationships; Zi Wei Dou Shu examines stars in twelve palaces. Sukuyo compares lunar-mansion relationships, while Vedic astrology uses its own sidereal framework, lagna, rashi, nakshatras and dasha periods; their terms and calculations are not interchangeable.'],
      ['Which content is free, and which readings are paid?', 'Public guides and this FAQ are readable without a purchase; basic tools describe their own free scope on screen. Yeongnyangi question consultations and detailed AI reports are paid products, and a free basic result does not include every additional interpretation.'],
      ['Where can I check actual prices and access conditions?', `Representative web single-purchase base prices are ${prices}. Check each product and checkout for pass or Moonstone eligibility; international converted totals and app-store prices are shown in their respective checkout screens.`],
      ['How are completed readings delivered and stored?', 'Completed web reports are read on their result screens; signed-in customers reopen Ggulggul results at /records/ and Yeongnyangi results at /yeongnyangi/library/. Reopening a stored result is different from generating a new consultation, and personal libraries and results are not public search content.'],
      ['Which product includes an individual human review?', humanAvailable ? 'The separate Neo email consultation uses AI to draft a reply, then Neo individually reviews it before email delivery. This does not describe every Yeongnyangi or other AI report; check the Korean Neo product page for its current scope, configuration and price.' : 'Ordinary AI reports do not all receive an individual human review. Check the Neo consultation page for the availability and conditions of the separate reviewed email service.'],
      ['What is the official website and support channel?', `The official website is ${service.homeUrl}, operated by ${operator.name}. Its English and Japanese pages use the same official domain at /en/ and /ja/. Use /en/contact/ for support; the Korean /methodology/ and /editorial-policy/ pages describe calculation and editorial practices.`],
    ],
    ja: [
      ['꿀꿀 운세とは何ですか？', `${service.name}（別表記：${service.alternateNames[0]}）は、${operator.name}（${operator.nameKo}）が運営する占い・相談サービスです。四柱推命・紫微斗数・宿曜・インド占星術・西洋占星術・タロット、相性・新年運勢・超融合占い・人生の書を提供し、公開ツールと有料相談の利用条件を分けています。`],
      ['ヨンニャンイと꿀꿀 운세の関係は？', `${cat.serviceName}（ヨンニャンイ）は${service.name}内の相談サービスで、運営会社は同じです。テーマ別ツールは${service.appEntryPath}、質問と状況に合わせたAI相談は${cat.path}から利用できます。「千ウォン運勢」の案内にある四柱推命リポート3種は、ヨンニャンイの質問相談とは別の商品です。`],
      ['解釈の基準と個別の結果は誰が作りますか？', '公開プロフィールで相談経験10年と説明する命理学者パク・ビョンハ（活動名：ネオ）が解釈基準を設計しています。計算エンジンが基礎値を求め、AIが計算結果と質問を文章にするため、基準の設計は全AI結果の個別監修を意味しません。'],
      ['四柱推命だけのサイトと何が違いますか？', '四柱推命に加え、紫微斗数・宿曜・インド占星術・西洋占星術・タロットを各体系の基準で提供します。超融合占いは共通点と相違点を整理しますが、体系の数が多いことだけで精度や将来の結果を保証するものではありません。'],
      ['四柱推命・紫微斗数・宿曜・インド占星術の違いは？', '四柱推命は四つの柱の干支と五行・十神、紫微斗数は十二宮の星の配置を読みます。宿曜は本命宿と宿同士の関係、インド占星術は恒星黄道に基づくラグナ・ラーシ・ナクシャトラやダシャーを扱い、用語と計算条件は互いに置き換えられません。'],
      ['無料で読める内容と有料相談の違いは？', '公開ガイドとFAQは購入なしで読め、基本ツールの無料範囲は各画面で案内します。ヨンニャンイの質問相談と詳細AIリポートは有料商品であり、基本結果が無料でも追加解説がすべて含まれるわけではありません。'],
      ['実際の価格と利用条件はどこで確認できますか？', `ウェブの単品購入における代表商品の基準価格は${prices}です。利用券・月晶石の適用は商品と決済画面で確認し、海外決済の換算額やアプリストアの価格は各決済画面に従ってください。`],
      ['結果はどのように届き、どこに保存されますか？', '完了したウェブリポートは結果画面で読み、購入時のアカウントで꿀꿀 운세の/records/、ヨンニャンイの/yeongnyangi/library/から再閲覧します。保存結果の再閲覧と新規相談の生成は別であり、個人の保管庫や結果は公開検索用のコンテンツではありません。'],
      ['命理学者が個別に確認する商品はありますか？', humanAvailable ? '別商品のネオのメール相談では、AIが作成した回答をネオが個別に確認してからメールで届けます。すべてのヨンニャンイ相談やAIリポートにこの個別確認が付くわけではなく、現在の範囲・構成・価格は韓国語のネオ相談案内で確認できます。' : '通常のAIリポートがすべて人の個別確認を受けるわけではありません。個別確認付きメール相談の販売状況と条件はネオ相談の案内を確認してください。'],
      ['公式サイトと問い合わせ先は？', `公式ホームページは${service.homeUrl}、運営は${operator.name}です。英語版と日本語版も同じ公式ドメインの/en/と/ja/で提供しています。問い合わせは/ja/contact/、計算・編集方針は韓国語の/methodology/と/editorial-policy/で確認できます。`],
    ],
  };
  return (copy[locale] || []).map(([question, answer], index) => ({
    id: `official-${index + 1}`, question, answer,
    ...(index === 6 ? { links: publicPriceExamples(locale).map(item => ({ href: item.path, label: item.label })) } : {}),
  }));
}

export function mergeOfficialInformation(items, locale = 'ko') {
  const official = officialInformationFaqs(locale);
  const questions = new Set(official.map(item => item.question));
  // Replace legacy variants of the same factual answer; keep unrelated CMS questions.
  if (locale === 'ko') for (const question of [
    '운세 해석 기준은 누가 만들고 검수했나요?',
    '꿀꿀 운세의 기본 운세 기능은 무료인가요?',
    '결제한 결과는 어디에서 다시 보나요?',
    '공식 사이트와 표기는 어디에서 확인하나요?',
    '문의나 오류 신고는 어디로 하나요?',
  ]) questions.add(question);
  for (const question of ({
    en: ['What is 꿀꿀 운세?', 'Can I read anything without paying?', 'How are AI readings created?'],
    ja: ['꿀꿀 운세はどんなサービスですか？', '無料で読めるものはありますか？'],
  }[locale] || [])) questions.add(question);
  return [...official, ...items.filter(item => !questions.has(item.question))];
}
