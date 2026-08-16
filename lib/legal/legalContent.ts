/**
 * 이용약관·개인정보처리방침의 비한국어(en/ja/zh-CN/zh-TW) 번역본.
 *
 * 정본은 여전히 `app/terms-of-service/TermsContent.jsx`,
 * `app/privacy-policy/PrivacyPolicyContent.jsx` (한국어, 회원가입 동의 화면과 공유)다.
 * 이 파일은 그 정본의 법적 실질(조항 순서·범위)을 그대로 유지한 번역본이며,
 * `app/[locale]/terms-of-service`, `app/[locale]/privacy-policy` (ko 제외 4개 로케일)에서만 쓰인다.
 *
 * 🔴 기계 보조 번역이다 — 원어민·법률 검토 전에는 PG사 제출·법적 근거로 단독 사용하지 말 것
 *    (`docs/INTERNATIONAL_MARKET_LOCALIZATION.md`의 LEGAL_REVIEW_REQUIRED 원칙과 동일).
 * 🔴 준거법은 번역 언어와 무관하게 항상 대한민국이다(각 문서 15조/11조 참고) — 언어 로케일이
 *    관할·준거법을 바꾸지 않는다는 원칙은 `lib/market-policy/context.js`와 동일.
 */
import { OPERATOR_NAME, SUPPORT_EMAIL } from "../site-policy-config";

export type NonKoLocale = "en" | "ja" | "zh" | "zh-TW";

export type LegalSection = {
  id: string;
  heading: string;
  paragraphs: string[];
};

export type LegalDocument = {
  effectiveDate: string;
  sections: LegalSection[];
};

const op = OPERATOR_NAME;
const mail = SUPPORT_EMAIL;

export const TERMS_CONTENT: Record<NonKoLocale, LegalDocument> = {
  en: {
    effectiveDate: "2026-04-11",
    sections: [
      { id: "purpose", heading: "1. Purpose", paragraphs: [
        "These Terms govern the conditions and procedures for using the online services provided by Code Destiny, and set out the rights, obligations, and responsibilities between the parties.",
      ]},
      { id: "scope", heading: "2. Scope and Acceptance", paragraphs: [
        "By accessing or continuing to use the Service, you are deemed to agree to these Terms and related policies, including the Privacy Policy.",
      ]},
      { id: "service", heading: "3. Service Description", paragraphs: [
        "Code Destiny provides interpretive content based on Saju (Four Pillars), Tarot, and other fortune-telling systems. Features may be added, changed, or suspended as reasonably required to improve service quality, without prior notice.",
        `Service address: https://code-destiny.com\nOperator: ${op}`,
      ]},
      { id: "cookies-and-ads", heading: "4. Cookies and Third-Party Ads", paragraphs: [
        "The Service may use cookies and similar technologies to provide features, measure usage, and serve advertising. Third-party advertising networks, including Google AdSense, may use cookies to provide interest-based advertising, which you can manage through your browser settings or Google Ads Settings.",
      ]},
      { id: "eligibility", heading: "5. Eligibility and User Responsibility", paragraphs: [
        "Under applicable Korean law, users under the age of 14 may not register for or use this Service. Users are responsible for providing accurate information and securing their account and device. You must not violate laws, infringe on others' rights, access the Service through automated abnormal means, or interfere with its operation.",
      ]},
      { id: "prohibited", heading: "6. Prohibited Conduct", paragraphs: [
        "The following are prohibited: (1) reverse engineering, crawling, or unauthorized automated access to the Service; (2) distributing malware or exploiting security vulnerabilities; (3) unauthorized collection or misuse of others' personal information; (4) posting unlawful content; (5) any act that interferes with operations. We may block or suspend access for violations.",
      ]},
      { id: "fair-use", heading: "7. Fair Use and Restriction of Abnormal Use", paragraphs: [
        "While their pass remains valid, pass holders may use features priced at or below their tier's coverage amount without additional charge and without a usage-count limit (\"flat-rate use\"), unless their use qualifies as abnormal use under this section. Each tier's coverage amount is shown on the payment screen.",
        "For the Code Destiny Family pass specifically, **expert consultation products priced at KRW 30,000 or more per use are included up to 10 uses per 30-day pass period**; usage beyond that remains available via single payment or Moonlight Stones. Features priced under KRW 30,000 are included without a count limit. The included-use count resets to 10 whenever a new pass is purchased, and the remaining count can be checked on the payment screen. Exhausting the included count does not block further use of the Service; a payment method for the excess will be presented. **This allowance is a product term unrelated to \"abnormal use\" as defined in this section, and exhausting it alone never triggers any sanction.**",
        "A pass is **provided on the assumption that it is used by a single contracting individual, and may not be transferred, lent to a third party, or shared via a shared account.** This is a precondition of flat-rate use, and use in violation of it is considered together with the abnormal-use determination below.",
        "The Company operates **always-on technical safeguards applied equally to all users** to protect service stability and prevent automated abuse, including per-interval request limits, duplicate-execution prevention, and concurrency limits on generation jobs. These are operating parameters, not sanctions targeting a specific user, and are therefore not subject to the notice-and-cure process below; thresholds are set well above the pace of normal human use. Temporarily reaching a threshold does not block use — you will simply be asked to try again shortly.",
        "\"Abnormal use\" means a case where a single user's usage count over the trailing 30 days is at least 10 times the average usage count of all users over the same period, AND at least one of the following circumstances is confirmed by objective evidence. High usage volume alone is not sufficient to be judged abnormal use: (1) logs confirm that requests were made using automated means such as macros, scripts, or bots; (2) requests continue at uniform, repetitive intervals that are difficult to achieve through direct human operation; (3) repeated access occurs from numerous IP addresses or devices within a short period under the same account; (4) a single-user account is shared with or lent to third parties, causing abnormal traffic equivalent to items (1) through (3) due to use by multiple people.",
        "When abnormal use is confirmed, the Company notifies the user of the basis for the determination and any request for correction, by email or in-app notification, and provides at least 7 days from the date of notice for the user to respond. If there is no response, or if abnormal use continues after a response, the Company applies minimal measures such as rate-limiting on the relevant feature rather than immediately terminating the contract. Only if abnormal use continues or persists after such restriction, such that the ordinary purpose of the contract cannot reasonably be achieved, may the Company terminate all or part of the service agreement — and only after a further cure notice of at least 7 days goes uncorrected.",
        "You may raise an objection and submit supporting materials through customer support within 14 days of receiving a warning, restriction, or termination notice, and the Company will notify you of the review outcome within 5 business days of receipt.",
        "If the objection confirms that a restriction was applied without justified cause, the Company will promptly lift the restriction and provide compensation, such as extending the pass period by an amount corresponding to the restricted period, or a partial or full refund under the Refund and Withdrawal section below.",
      ]},
      { id: "intellectual-property", heading: "8. Intellectual Property", paragraphs: [
        "All rights in text, design, code, and data components related to the Service belong to Code Destiny or its rightful owners. You may not reproduce, distribute, or commercially exploit content without permission, except as allowed by law.",
      ]},
      { id: "limitations", heading: "9. Nature and Limitations of the Service", paragraphs: [
        "Fortune and Tarot results are informational content provided for entertainment and reference purposes and do not substitute for professional legal, medical, investment, or tax advice. In particular, we do not guarantee medical diagnosis or treatment outcomes, the outcome of legal disputes or criminal cases, or investment gains or avoidance of losses.",
      ]},
      { id: "disclaimer", heading: "10. Disclaimer", paragraphs: [
        "The Company is not liable for damages arising from force majeure events such as natural disasters, communication failures, platform or browser issues, or third-party service outages. We do not warrant that the Service will be available at all times without interruption or error.",
      ]},
      { id: "liability", heading: "11. Limitation of Liability", paragraphs: [
        "To the maximum extent permitted by applicable law, the Company's liability is limited, and liability for indirect, special, or consequential damages may be excluded. Nothing in these Terms excludes liability that cannot be excluded under applicable law.",
      ]},
      { id: "refund-policy", heading: "12. Refund and Withdrawal Guide", paragraphs: [
        "Code Destiny's paid products are the 30-day Pass and per-item KRW payments for individual products. Moonlight Stones are a bonus benefit granted with a pass or through events; they are not a separately purchased or top-up product and are therefore not treated as a paid product subject to cash refund.",
        "**Supply timing: all paid services are provided immediately once payment is confirmed and approved.** There is no separate delivery step; the 30-day pass likewise takes effect immediately once payment verification is complete.",
        "Each grant of Moonlight Stones is **valid only for 30 days from the date it was granted**, and any unused portion automatically expires at the end of that period. Where Moonlight Stones have been granted in multiple installments, each installment expires individually based on its own grant date, and usage is deducted from the installment expiring soonest (oldest) first. Expired Moonlight Stones are not restored and are not eligible for a cash refund.",
        "The 30-day Pass is a one-time digital pass that remains valid for 30 days from the moment server-side payment verification succeeds. It is not an auto-renewing subscription product, and users must manually purchase it again after it expires.",
        "For a Pass or a single-item payment, you may request withdrawal within 7 days of the payment date or the date you received the contract details. However, once provision of the digital content or paid service has begun — including content generation, PDF rendering, viewing a paid reading, or use of a pass benefit — withdrawal may be restricted for the portion already provided.",
        "You may cancel at any time before payment is completed. Even after payment is completed, if result generation, PDF rendering, viewing of a paid reading, or use of a pass benefit has not yet begun, you may request a refund through customer support.",
        "Once personalized digital content has been generated, or viewing of results, PDF rendering, provision of a paid reading, or use of a pass benefit has begun, refunds for simple change of mind may be restricted due to the nature of digital content.",
        "If you request early termination after having used the 30-day Pass, we will check the period already provided, the paid features used, and any benefits granted or used, and refund to your payment method any portion that is subject to a statutory refund and has not been provided.",
        "If results were not provided after payment, or normal use was not possible due to a system error, we will review the incident and handle it through an appropriate remedy: regeneration, adjustment of the usage period, a partial refund, or a full refund.",
        "If duplicate payment for the same product or a payment error is confirmed, the duplicate payment will be refunded in accordance with the payment method and payment processor's policy.",
        "If the service was provided in a way that differs from the displayed or advertised content, or differs from the contract terms, you may request withdrawal within 3 months from the date of supply, or within 30 days from the date you became aware, or could reasonably have become aware, of the fact.",
        `Refund requests are accepted after confirming the identity of the payer. Once eligibility for withdrawal or a refund is confirmed, we process cancellation or refund within 3 business days as required by applicable law. The actual timing of reflection by your card company or payment processor may vary depending on their own policies. Refund inquiries: ${mail}`,
        "To prevent disputes and comply with applicable law, the Company may retain necessary logs such as confirmation timestamps, content identifiers, account identifiers, and access records, within a reasonable scope.",
      ]},
      { id: "free-trial", heading: "13. Free Trial and Paid Pass Use", paragraphs: [
        "If you access membership-only content and thereby begin using the Service during a free trial period, withdrawal for the same digital content or paid pass may later be restricted on grounds of simple change of mind. The type of pass, its 30-day usage period, the amount charged, the expiration date, whether it auto-renews, and the refund conditions are all disclosed on the payment screen, and it is the user's responsibility to review this information before completing payment.",
        "Where a mandatory statutory refund is required, it will be handled under applicable law and payment processor policy.",
      ]},
      { id: "changes", heading: "14. Changes to Terms", paragraphs: [
        "If these Terms are changed, the effective date and key changes will be announced within the Service. Continuing to use the Service after a change is deemed acceptance of the amended Terms. Material changes will be announced with a reasonable prior notice period when required.",
      ]},
      { id: "governing-law", heading: "15. Governing Law and Jurisdiction", paragraphs: [
        "These Terms are governed by the laws of the Republic of Korea, and related disputes shall be brought before the court having jurisdiction under applicable law.",
      ]},
      { id: "contact", heading: "16. Contact", paragraphs: [
        `Service name: Code Destiny\nSite: https://code-destiny.com\nOperator: ${op}\nTerms inquiries: ${mail}`,
        "Business registration details (Republic of Korea):\nCompany name: 코드 데스티니 (Code Destiny)\nRepresentative: 박병하 (Park Byeong-ha)\nBusiness registration no.: 372-23-02329\nMail-order business registration no.: 제 2026-화성호-0264 호\nPhone: +82-50-6664-7398\nAddress: 경기도 화성시 효행구 비봉면 새비봉동로 37, 101동 1207호, Republic of Korea",
      ]},
    ],
  },
  ja: {
    effectiveDate: "2026-04-11",
    sections: [
      { id: "purpose", heading: "1. 目的", paragraphs: [
        "本規約は、Code Destinyが提供するオンラインサービスの利用条件および手続き、当事者間の権利・義務・責任事項を定めるものです。",
      ]},
      { id: "scope", heading: "2. 適用範囲および同意", paragraphs: [
        "利用者が本サービスにアクセスし、または利用を継続する場合、本規約および関連ポリシー（プライバシーポリシーを含む）に同意したものとみなされます。",
      ]},
      { id: "service", heading: "3. サービス内容", paragraphs: [
        "Code Destinyは、四柱推命・タロット等の運勢に基づく解釈コンテンツを提供します。サービス品質向上のため、合理的に必要な範囲で、事前の通知なく機能の追加・変更・停止を行う場合があります。",
        `サービスアドレス：https://code-destiny.com\n運営者：${op}`,
      ]},
      { id: "cookies-and-ads", heading: "4. Cookieおよび第三者広告", paragraphs: [
        "本サービスは、機能提供、利用統計、広告配信のためにCookieおよび類似技術を使用する場合があります。Google AdSenseを含む第三者広告ネットワークは、興味関心に基づく広告のためにCookieを使用する場合があり、利用者はブラウザ設定またはGoogle広告設定でこれを管理できます。",
      ]},
      { id: "eligibility", heading: "5. 利用資格および利用者の責任", paragraphs: [
        "韓国の関連法令により、満14歳未満の方は会員登録および本サービスの利用ができません。利用者は正確な情報の入力、およびアカウント・端末のセキュリティ管理について責任を負います。法令違反、権利侵害、自動化された不正アクセス、サービス妨害行為を行ってはなりません。",
      ]},
      { id: "prohibited", heading: "6. 禁止行為", paragraphs: [
        "以下の行為を禁止します。（1）サービスのリバースエンジニアリング、クローリング、無断の自動アクセス（2）マルウェアの配布およびセキュリティ脆弱性の悪用（3）他人の個人情報の無断収集・盗用（4）違法コンテンツの投稿（5）運営を妨害する一切の行為。違反があった場合、当社はアクセスを制限または停止することがあります。",
      ]},
      { id: "fair-use", heading: "7. 公正利用および異常利用の制限", paragraphs: [
        "パス保有者は、有効なパス契約期間中、本条で定める異常利用に該当しない限り、追加料金なしに、自身の等級がカバーする金額以下の機能を回数制限なく利用できます（以下「定額利用」）。等級ごとのカバー金額は決済画面に表示されます。",
        "ただし、**Code Destiny Familyパスの場合、1回30,000ウォン以上の専門家相談商品は、パス1期間（30日）あたり10回まで含まれ**、これを超える利用分は都度決済またはムーンストーンで利用できます。30,000ウォン未満の機能は回数制限なく含まれます。含まれる回数はパスを新たに購入すると再度10回にリセットされ、残り回数は決済画面で確認できます。含まれる回数をすべて使用してもサービス利用がブロックされることはなく、超過分の決済手段が案内されます。**この含まれる回数は、本条が定める「異常利用」とは無関係な商品構成であり、回数をすべて使用したという事実のみでは、いかなる制裁も行われません。**",
        "パスは、**契約者本人1名が使用することを前提に提供され、第三者への譲渡・貸与、またはアカウントの共有はできません。**これは定額利用の前提条件であり、これに違反する利用は、以下の異常利用の判断において併せて考慮されます。",
        "当社は、サービスの安定性確保および自動化された不正利用の防止のため、**すべての利用者に同一に適用される常時稼働の技術的措置**を運用します。これには、単位時間あたりのリクエスト数制限、同一リクエストの重複実行防止、生成処理の同時実行数制限が含まれます。これらは特定の利用者を対象とした制裁ではなく、サービス運営上のパラメータであるため、以下の事前通知・弁明手続きの対象とはなりません。正常な利用速度では到達しない水準に設定されており、一時的にこれに到達した場合でも利用がブロックされるのではなく、しばらくしてから再度お試しいただけるとの案内が表示されます。",
        "「異常利用」とは、直近30日間における利用者1名のサービス利用回数が、同期間における全利用者の平均利用回数の10倍以上に該当し、かつ次の各号のいずれか一つ以上の事情が客観的な資料により確認される場合をいいます。単に利用回数が多いという事情のみでは異常利用とは判断しません。（1）マクロ、スクリプト、ボット等の自動化手段によるサービス呼び出しがログにより確認される場合（2）人による直接操作では到達し難い、均一かつ反復的な時間間隔でリクエストが継続する場合（3）同一アカウントで短時間に多数のIPアドレスまたは端末から反復アクセスが発生する場合（4）1名利用者用のアカウントを第三者と共有・貸与し、複数人が利用することにより第1号から第3号に準ずる異常なトラフィックが発生する場合。",
        "当社は、異常利用が確認された利用者に対し、判断根拠および是正要請事項をメールまたはアプリ内通知により通知し、通知日から7日以上の期間を定めて弁明の機会を付与します。弁明がない場合、または弁明後も異常利用が繰り返される場合、当社は契約を直ちに解除するのではなく、まず当該機能の利用速度制限等、最小限の措置を実施します。制限措置後も異常利用が繰り返し・継続し、通常の契約目的の達成が困難な場合に限り、7日以上の期間を定めた是正の催告を経てもなお是正されないときは、利用契約の全部または一部を解除することができます。",
        "利用者は、警告、制限または解除の通知を受けた日から14日以内にカスタマーサポートを通じて異議を申し立て、弁明資料を提出することができ、当社は受付日から5営業日以内に検討結果を通知します。",
        "異議申立ての結果、正当な理由のない制限であったことが確認された場合、当社は遅滞なく制限を解除し、制限期間に相当するパス期間の延長、または以下の「返金および契約解除案内」に基づく一部・全額返金等により補償します。",
      ]},
      { id: "intellectual-property", heading: "8. 知的財産権", paragraphs: [
        "サービスに関連するテキスト、デザイン、コード、データ構成要素等、一切の権利はCode Destinyまたは正当な権利者に帰属します。法令により許容される場合を除き、無断で複製、配布、商業的利用をすることはできません。",
      ]},
      { id: "limitations", heading: "9. サービスの性質および限界", paragraphs: [
        "運勢・タロットの結果は、娯楽および参考目的の情報コンテンツであり、法律・医療・投資・税務等の専門的助言に代わるものではありません。特に、医療的診断・治療結果、法的紛争または刑事事件の結果、投資収益または損失回避を保証するものではありません。",
      ]},
      { id: "disclaimer", heading: "10. 免責事項", paragraphs: [
        "当社は、天災地変、通信障害、プラットフォーム・ブラウザの問題、第三者サービスの停止等、不可抗力事由による損害について責任を負いません。当社は、サービスが常に中断・エラーなく利用できることを保証するものではありません。",
      ]},
      { id: "liability", heading: "11. 責任の制限", paragraphs: [
        "関連法令が許容する最大限の範囲内で、当社の責任は制限され、間接損害・特別損害・結果的損害に対する責任は除外される場合があります。適用法令上除外できない責任は、本規約のいかなる規定によっても除外されません。",
      ]},
      { id: "refund-policy", heading: "12. 返金および契約解除案内", paragraphs: [
        "Code Destinyの有料決済商品は、30日パスおよび商品ごとのウォン建て都度決済です。ムーンストーンはパスまたはイベントにより付与されるボーナス特典であり、別途購入・チャージする商品ではないため、現金返金の対象となる決済商品とはみなしません。",
        "**商品等の供給時期：すべての有料サービスは、決済（代金支払い）が完了し承認が確認された時点で直ちに提供されます。**別途の配送手続きはなく、決済承認の時点からサービス利用が開始され、30日パスも決済検証が完了した時刻から直ちに適用されます。",
        "ムーンストーンは、**各付与分が付与された日から30日間のみ有効**であり、その期間内に使用しなかった付与分は自動的に消滅します。複数回に分けて付与されたムーンストーンは、各付与分がそれぞれの付与日を基準に個別に失効し、使用時には先に失効する（古い）付与分から順に差し引かれます。消滅したムーンストーンは復元されず、現金返金の対象にもなりません。",
        "30日パスは、サーバー側の決済検証が成功した時点から30日間維持される、一回限りのデジタルパスです。自動決済商品ではなく、有効期限後は利用者自身が改めて購入する必要があります。",
        "パスまたは都度決済商品は、決済日または契約内容を受け取った日から7日以内であれば契約解除の申出が可能です。ただし、コンテンツの生成、PDFのレンダリング、有料リーディングの閲覧、パス特典の使用等、デジタルコンテンツまたは有料サービスの提供が既に開始されている場合、提供が開始された部分については契約解除が制限される場合があります。",
        "決済完了前であれば、いつでもキャンセルできます。決済完了後であっても、結果の生成、PDFレンダリング、有料リーディングの閲覧、パス特典の使用が開始されていない場合は、カスタマーサポートを通じて返金を請求できます。",
        "個人向けにカスタマイズされたデジタルコンテンツが生成された場合、または結果の閲覧、PDFレンダリング、有料リーディングの提供、パス特典の使用が開始された場合は、デジタルコンテンツの性質上、単純な気変わりによる返金が制限される場合があります。",
        "30日パスを使用した後に中途解約を請求する場合は、既に提供された期間、利用した有料機能、付与・使用済みの特典を確認した上で、法令上返金の対象となる未提供部分がある場合に、決済手段に返金します。",
        "決済後に結果が提供されなかった場合、またはシステムエラーにより正常な利用ができなかった場合は、障害内容を確認した上で、再生成、利用期間の調整、一部返金、または全額返金のうち適切な方法で対応します。",
        "同一商品の重複決済または決済エラーが確認された場合は、決済手段および決済代行会社のポリシーに従い、重複決済分を返金処理します。",
        "表示・広告内容と異なる場合、または契約内容と異なる形で履行された場合は、供給を受けた日から3か月以内、その事実を知った日または知り得た日から30日以内に契約解除を請求できます。",
        `返金請求は決済者本人確認の後に受け付け、契約解除または返金の対象であることが確認された場合、関係法令に従い3営業日以内に決済取消または返金手続きを進めます。実際にカード会社・決済代行会社に反映される時期は、決済手段ごとのポリシーにより異なる場合があります。返金に関するお問い合わせ：${mail}`,
        "当社は、紛争予防および法令遵守のため、確認時刻、コンテンツ識別情報、アカウント識別子、アクセス記録等、必要な範囲のログを保管する場合があります。",
      ]},
      { id: "free-trial", heading: "13. 無料体験および有料パスの利用", paragraphs: [
        "無料体験期間中であっても、会員限定コンテンツを閲覧してサービス利用が開始された場合、その後、同一コンテンツまたは有料パスに関する単純な気変わりによる解除は制限される場合があります。パスの種類、30日間の利用期間、決済金額、有効期限、自動決済の有無および返金条件は決済画面に告知され、利用者は決済完了前にこれを確認する責任を負います。",
        "ただし、強行規定により返金が必要な場合は、関係法令および決済代行会社のポリシーに従って処理します。",
      ]},
      { id: "changes", heading: "14. 規約の変更", paragraphs: [
        "規約が変更される場合、施行日および主な変更事項をサービス内で告知します。変更後もサービスの利用を継続した場合、改定後の規約に同意したものとみなされます。重要な変更については、必要に応じて合理的な事前告知期間を設けてお知らせします。",
      ]},
      { id: "governing-law", heading: "15. 準拠法および管轄", paragraphs: [
        "本規約は大韓民国の法令を準拠法とし、関連する紛争は関係法令に従った管轄裁判所に提起するものとします。",
      ]},
      { id: "contact", heading: "16. お問い合わせ", paragraphs: [
        `サービス名：Code Destiny\nサイト：https://code-destiny.com\n運営者：${op}\n規約に関するお問い合わせ：${mail}`,
        "事業者情報（大韓民国）：\n商号：코드 데스티니（Code Destiny）\n代表者：박병하（パク・ビョンハ）\n事業者登録番号：372-23-02329\n通信販売業申告番号：第2026-火城湖-0264号\n電話番号：+82-50-6664-7398\n所在地：大韓民国 京畿道 華城市 孝行区 飛鳳面 セビボンドン路 37, 101棟 1207号\n\n特定商取引法に基づく表記は「特定商取引法に基づく表記」ページをご覧ください。",
      ]},
    ],
  },
  zh: {
    effectiveDate: "2026-04-11",
    sections: [
      { id: "purpose", heading: "1. 条款目的", paragraphs: [
        "本条款规定了 Code Destiny 提供的在线服务的使用条件与程序，以及双方之间的权利、义务与责任事项。",
      ]},
      { id: "scope", heading: "2. 适用范围与同意", paragraphs: [
        "用户访问服务或继续使用服务，即视为同意本条款及相关政策（包括隐私政策）。",
      ]},
      { id: "service", heading: "3. 服务内容", paragraphs: [
        "Code Destiny 提供基于八字、塔罗等命理体系的解读内容。为提升服务质量，公司可能在合理必要范围内，无需事先通知即可新增、变更或暂停部分功能。",
        `服务网址：https://code-destiny.com\n运营者：${op}`,
      ]},
      { id: "cookies-and-ads", heading: "4. Cookie 与第三方广告", paragraphs: [
        "本服务可能出于功能提供、使用统计、广告投放等目的使用 Cookie 及类似技术。包括 Google AdSense 在内的第三方广告网络可能使用 Cookie 提供基于兴趣的广告，用户可在浏览器设置或 Google 广告设置中进行管理。",
      ]},
      { id: "eligibility", heading: "5. 使用资格与用户责任", paragraphs: [
        "根据大韩民国相关法令，未满14周岁者不得注册会员及使用本服务。用户应对输入信息的准确性及账号、设备的安全管理负责，不得违反法令、侵害他人权利、以自动化方式进行异常访问或妨碍服务运行。",
      ]},
      { id: "prohibited", heading: "6. 禁止行为", paragraphs: [
        "禁止以下行为：（1）对服务进行逆向工程、爬取或未经授权的自动化访问；（2）传播恶意软件或利用安全漏洞；（3）未经授权收集或盗用他人个人信息；（4）发布违法内容；（5）任何妨碍运营的行为。如有违反，公司可限制或暂停相关账号的访问。",
      ]},
      { id: "fair-use", heading: "7. 公平使用与异常使用限制", paragraphs: [
        "在有效的通行证合约期内，只要不构成本条所定义的异常使用，通行证持有者可在**无需额外付费、无使用次数限制**的情况下，使用价格在其等级覆盖金额以下的功能（以下称\"定额使用\"）。各等级的覆盖金额将显示在结账页面。",
        "但**就 Code Destiny Family 通行证而言，单次30,000韩元以上的专家咨询商品，每个通行证周期（30天）内最多包含10次**，超出部分可通过单次付费或月光石使用。价格低于30,000韩元的功能不受次数限制地包含在内。包含次数会在重新购买通行证时重置为10次，剩余次数可在结账页面查看。用完包含次数并不会导致服务被封锁，系统会提示超出部分的付款方式。**该包含次数与本条所定义的\"异常使用\"无关，仅仅用完次数这一事实本身不会导致任何制裁。**",
        "通行证的提供**以由签约本人一人使用为前提，不得转让、出借予第三方或与他人共享账号。**这是定额使用的前提条件，违反该前提的使用行为将一并纳入下述异常使用的判断考量。",
        "为保障服务稳定性并防止自动化滥用，公司运行**适用于所有用户的统一常态化技术措施**，包括单位时间请求次数限制、防止同一请求重复执行、生成任务并发数限制。这些属于服务运营参数，而非针对特定用户的制裁措施，因此不适用下述事先通知与陈述程序；其阈值设定远高于正常人工操作速度，即使暂时达到该阈值，也不会导致服务被封锁，而是提示稍后重试。",
        "\"异常使用\"是指：过去30天内，单一用户的服务使用次数达到同期全体用户平均使用次数的10倍以上，且同时以客观资料确认存在以下任一情形。仅使用次数较多这一事实本身不构成异常使用的判断依据：（1）日志确认存在通过宏、脚本、机器人等自动化手段调用服务的记录；（2）请求以人工直接操作难以达到的、均匀且重复的时间间隔持续发生；（3）同一账号在短时间内从多个IP地址或设备反复访问；（4）将单一用户账号与第三方共享或出借，因多人使用而产生与第（1）至（3）项相当的异常流量。",
        "公司在确认异常使用后，将通过邮件或应用内通知方式，向用户告知判断依据及需要更正的事项，并给予自通知之日起至少7天的陈述期限。若用户未作陈述，或陈述后异常使用仍持续发生，公司不会立即解除合约，而是先对相关功能实施限速等最小化措施。仅当限制措施后异常使用仍反复、持续发生，导致合约的正常目的难以实现时，公司在经过至少7天的更正催告后仍未获更正的情况下，方可解除全部或部分服务合约。",
        "用户可在收到警告、限制或解约通知之日起14天内，通过客服提出异议并提交陈述资料，公司将在收到之日起5个工作日内告知审核结果。",
        "若异议审核确认相关限制缺乏正当理由，公司将立即解除限制，并以延长与限制期间相当的通行证期限，或按下述\"退款与撤回指引\"进行部分或全额退款等方式予以补偿。",
      ]},
      { id: "intellectual-property", heading: "8. 知识产权", paragraphs: [
        "与服务相关的文字、设计、代码、数据构成要素等一切权利归 Code Destiny 或正当权利人所有。除法令允许的情形外，未经许可不得复制、传播或用于商业目的。",
      ]},
      { id: "limitations", heading: "9. 服务性质与限制", paragraphs: [
        "运势、塔罗结果为娱乐及参考性质的信息内容，不能替代法律、医疗、投资、税务等专业咨询意见。公司特别不保证医疗诊断或治疗结果、法律纠纷或刑事案件的结果，也不保证投资收益或规避损失。",
      ]},
      { id: "disclaimer", heading: "10. 免责声明", paragraphs: [
        "对于因天灾、通信故障、平台或浏览器问题、第三方服务中断等不可抗力事由造成的损害，公司不承担责任。公司不保证服务在任何时候均可不间断、无错误地使用。",
      ]},
      { id: "liability", heading: "11. 责任限制", paragraphs: [
        "在相关法令允许的最大范围内，公司的责任受到限制，对间接损害、特别损害、后果性损害的责任可被排除。适用法律不允许排除的责任，不因本条款的任何规定而被排除。",
      ]},
      { id: "refund-policy", heading: "12. 退款与撤回指引", paragraphs: [
        "Code Destiny 的付费商品为30天通行证及各商品按韩元计价的单次付费。月光石是随通行证或活动赠送的奖励权益，并非单独购买或充值的商品，因此不视为可现金退款的付费商品。",
        "**商品等的供应时间：所有付费服务均在支付（付款）完成并确认核准后立即提供。**无需另行配送程序，自支付核准之时起即可开始使用服务，30天通行证同样在支付验证完成的时刻起立即生效。",
        "月光石**自各笔发放之日起仅30天内有效**，期限内未使用的部分将自动失效。分多次发放的月光石，各笔按各自发放日期单独到期，使用时优先扣减最早到期（较旧）的部分。已失效的月光石不予恢复，也不属于现金退款对象。",
        "30天通行证是自服务器端支付验证成功之时起维持30天的一次性数字通行证。并非自动扣款商品，到期后须由用户自行重新购买。",
        "通行证或单次付费商品，可在支付日或收到合约内容之日起7天内申请撤回。但若内容生成、PDF渲染、付费解读浏览、通行证权益使用等数字内容或付费服务已开始提供，则已提供部分可能限制撤回。",
        "支付完成前可随时取消。支付完成后，若结果生成、PDF渲染、付费解读浏览、通行证权益使用尚未开始，仍可通过客服申请退款。",
        "一旦已生成个人化数字内容，或已开始提供结果浏览、PDF渲染、付费解读、通行证权益使用，基于数字内容的性质，单纯因改变主意而要求退款可能受到限制。",
        "若在使用30天通行证后申请提前解约，公司将核实已提供的期间、已使用的付费功能、已发放或已使用的权益后，就依法应予退款的未提供部分，退回至支付方式。",
        "若支付后未提供结果，或因系统错误无法正常使用，公司将在核实故障情况后，以重新生成、调整使用期限、部分退款或全额退款等适当方式处理。",
        "若确认存在同一商品重复支付或支付错误，将依支付方式及支付代理机构政策，对重复支付部分予以退款。",
        "若服务提供内容与展示、广告内容不符，或与合约内容履行不一致，用户可自收到供应之日起3个月内，或自知悉或可得知悉该事实之日起30天内申请撤回。",
        `退款申请将在确认付款人本人身份后受理，一旦确认属于撤回或退款对象，公司将依相关法令在3个工作日内办理取消支付或退款手续。实际反映至发卡机构或支付代理机构的时间可能因各支付方式的政策而异。退款咨询：${mail}`,
        "为预防纠纷及遵守法令，公司可能在必要范围内保存确认时间、内容识别信息、账号识别符、访问记录等日志。",
      ]},
      { id: "free-trial", heading: "13. 免费试用与付费通行证的使用", paragraphs: [
        "即使在免费试用期间，若已浏览会员专属内容而开始使用服务，此后对同一内容或付费通行证以单纯改变主意为由的撤回可能受到限制。通行证类型、30天使用期限、支付金额、到期日、是否自动扣款以及退款条件均会在结账页面公示，用户有责任在完成支付前予以确认。",
        "若依强制性规定须予退款，将依相关法令及支付代理机构政策处理。",
      ]},
      { id: "changes", heading: "14. 条款变更", paragraphs: [
        "条款如有变更，将在服务内公告生效日期及主要变更内容。变更后继续使用服务，即视为同意修订后的条款。重大变更将在必要时提前合理期限予以公告。",
      ]},
      { id: "governing-law", heading: "15. 准据法与管辖", paragraphs: [
        "本条款以大韩民国法令为准据法，相关争议应向依相关法令具有管辖权的法院提起。",
      ]},
      { id: "contact", heading: "16. 联系方式", paragraphs: [
        `服务名称：Code Destiny\n网站：https://code-destiny.com\n运营者：${op}\n条款咨询：${mail}`,
        "工商登记信息（大韩民国）：\n公司名称：코드 데스티니（Code Destiny）\n代表人：박병하\n事业者登记编号：372-23-02329\n通讯销售业申报编号：第2026-火城湖-0264号\n电话：+82-50-6664-7398\n地址：大韩民国京畿道华城市孝行区飞凤面赛飞凤洞路37, 101栋1207号",
      ]},
    ],
  },
  "zh-TW": {
    effectiveDate: "2026-04-11",
    sections: [
      { id: "purpose", heading: "1. 條款目的", paragraphs: [
        "本條款規定了 Code Destiny 提供的線上服務之使用條件與程序，以及雙方之間的權利、義務與責任事項。",
      ]},
      { id: "scope", heading: "2. 適用範圍與同意", paragraphs: [
        "使用者存取服務或繼續使用服務，即視為同意本條款及相關政策（包括隱私權政策）。",
      ]},
      { id: "service", heading: "3. 服務內容", paragraphs: [
        "Code Destiny 提供以八字、塔羅等命理體系為基礎的解讀內容。為提升服務品質，公司可能在合理必要範圍內，無須事先通知即可新增、變更或暫停部分功能。",
        `服務網址：https://code-destiny.com\n營運者：${op}`,
      ]},
      { id: "cookies-and-ads", heading: "4. Cookie 與第三方廣告", paragraphs: [
        "本服務可能基於功能提供、使用統計、廣告投放等目的使用 Cookie 及類似技術。包括 Google AdSense 在內的第三方廣告網路可能使用 Cookie 提供以興趣為基礎的廣告，使用者可在瀏覽器設定或 Google 廣告設定中進行管理。",
      ]},
      { id: "eligibility", heading: "5. 使用資格與使用者責任", paragraphs: [
        "依大韓民國相關法令，未滿14歲者不得註冊會員及使用本服務。使用者應對輸入資訊之正確性及帳號、裝置之安全管理負責，不得違反法令、侵害他人權利、以自動化方式進行異常存取或妨礙服務運作。",
      ]},
      { id: "prohibited", heading: "6. 禁止行為", paragraphs: [
        "禁止下列行為：（1）對服務進行逆向工程、爬取或未經授權之自動化存取；（2）散布惡意軟體或利用資安漏洞；（3）未經授權蒐集或盜用他人個人資料；（4）發布違法內容；（5）任何妨礙營運之行為。如有違反，公司得限制或暫停相關帳號之存取。",
      ]},
      { id: "fair-use", heading: "7. 公平使用與異常使用限制", paragraphs: [
        "在有效的通行證合約期間內，只要不構成本條所定義之異常使用，通行證持有人得在**無須額外付費、無使用次數限制**之情形下，使用價格在其等級涵蓋金額以下之功能（以下稱「定額使用」）。各等級之涵蓋金額將顯示於結帳頁面。",
        "但**就 Code Destiny Family 通行證而言，單次30,000韓元以上之專家諮詢商品，每個通行證週期（30天）內最多包含10次**，超出部分可透過單次付款或月光石使用。價格低於30,000韓元之功能不受次數限制地包含在內。包含次數會於重新購買通行證時重設為10次，剩餘次數可於結帳頁面查看。用完包含次數並不會導致服務遭封鎖，系統會提示超出部分之付款方式。**此包含次數與本條所定義之「異常使用」無關，僅僅用完次數此一事實本身不會導致任何制裁。**",
        "通行證之提供**以由簽約本人一人使用為前提，不得轉讓、出借予第三方或與他人共用帳號。**這是定額使用之前提條件，違反該前提之使用行為將一併納入下述異常使用之判斷考量。",
        "為保障服務穩定性並防止自動化濫用，公司運行**適用於所有使用者之統一常態化技術措施**，包括單位時間請求次數限制、防止同一請求重複執行、生成作業並行數限制。這些屬於服務營運參數，而非針對特定使用者之制裁措施，因此不適用下述事先通知與陳述程序；其門檻設定遠高於正常人工操作速度，即使暫時達到該門檻，也不會導致服務遭封鎖，而是提示稍後再試。",
        "「異常使用」係指：過去30天內，單一使用者之服務使用次數達到同期全體使用者平均使用次數之10倍以上，且同時以客觀資料確認存在下列任一情形。僅使用次數較多此一事實本身不構成異常使用之判斷依據：（1）日誌確認存在透過巨集、腳本、機器人等自動化手段呼叫服務之紀錄；（2）請求以人工直接操作難以達到之、均勻且重複之時間間隔持續發生；（3）同一帳號於短時間內自多個IP位址或裝置反覆存取；（4）將單一使用者帳號與第三方共用或出借，因多人使用而產生與第（1）至（3）項相當之異常流量。",
        "公司於確認異常使用後，將透過電子郵件或應用程式內通知，向使用者告知判斷依據及需更正之事項，並給予自通知之日起至少7天之陳述期限。若使用者未提出陳述，或陳述後異常使用仍持續發生，公司不會立即解除合約，而是先對相關功能實施限速等最小化措施。僅當限制措施後異常使用仍反覆、持續發生，導致合約之正常目的難以達成時，公司於經過至少7天之更正催告後仍未獲更正之情形下，方得解除全部或部分服務合約。",
        "使用者得於收到警告、限制或解約通知之日起14天內，透過客服提出異議並提交陳述資料，公司將於收到之日起5個營業日內告知審核結果。",
        "若異議審核確認相關限制缺乏正當理由，公司將立即解除限制，並以延長與限制期間相當之通行證期限，或依下述「退款與撤回指引」進行部分或全額退款等方式予以補償。",
      ]},
      { id: "intellectual-property", heading: "8. 智慧財產權", paragraphs: [
        "與服務相關之文字、設計、程式碼、資料構成要素等一切權利歸 Code Destiny 或正當權利人所有。除法令允許之情形外，未經許可不得複製、散布或用於商業目的。",
      ]},
      { id: "limitations", heading: "9. 服務性質與限制", paragraphs: [
        "運勢、塔羅結果為娛樂及參考性質之資訊內容，不能替代法律、醫療、投資、稅務等專業諮詢意見。公司特別不保證醫療診斷或治療結果、法律糾紛或刑事案件之結果，亦不保證投資收益或規避損失。",
      ]},
      { id: "disclaimer", heading: "10. 免責聲明", paragraphs: [
        "對於因天災、通訊故障、平台或瀏覽器問題、第三方服務中斷等不可抗力事由所造成之損害，公司不承擔責任。公司不保證服務於任何時候均可不間斷、無錯誤地使用。",
      ]},
      { id: "liability", heading: "11. 責任限制", paragraphs: [
        "在相關法令允許之最大範圍內，公司之責任受到限制，對間接損害、特別損害、後果性損害之責任得予排除。適用法律不允許排除之責任，不因本條款之任何規定而被排除。",
      ]},
      { id: "refund-policy", heading: "12. 退款與撤回指引", paragraphs: [
        "Code Destiny 之付費商品為30天通行證及各商品按韓元計價之單次付款。月光石係隨通行證或活動贈送之獎勵權益，並非單獨購買或儲值之商品，因此不視為可現金退款之付費商品。",
        "**商品等之供應時間：所有付費服務均於付款完成並確認核准後立即提供。**無須另行配送程序，自付款核准之時起即可開始使用服務，30天通行證同樣於付款驗證完成之時刻起立即生效。",
        "月光石**自各筆發放之日起僅30天內有效**，期限內未使用之部分將自動失效。分多次發放之月光石，各筆按各自發放日期單獨到期，使用時優先扣減最早到期（較舊）之部分。已失效之月光石不予恢復，亦不屬於現金退款對象。",
        "30天通行證係自伺服器端付款驗證成功之時起維持30天之一次性數位通行證。並非自動扣款商品，到期後須由使用者自行重新購買。",
        "通行證或單次付款商品，得於付款日或收到合約內容之日起7天內申請撤回。但若內容生成、PDF渲染、付費解讀瀏覽、通行證權益使用等數位內容或付費服務已開始提供，則已提供部分可能限制撤回。",
        "付款完成前得隨時取消。付款完成後，若結果生成、PDF渲染、付費解讀瀏覽、通行證權益使用尚未開始，仍得透過客服申請退款。",
        "一旦已生成個人化數位內容，或已開始提供結果瀏覽、PDF渲染、付費解讀、通行證權益使用，基於數位內容之性質，單純因改變心意而要求退款可能受到限制。",
        "若於使用30天通行證後申請提前解約，公司將核實已提供之期間、已使用之付費功能、已發放或已使用之權益後，就依法應予退款之未提供部分，退回至付款方式。",
        "若付款後未提供結果，或因系統錯誤無法正常使用，公司將於核實故障情況後，以重新生成、調整使用期限、部分退款或全額退款等適當方式處理。",
        "若確認存在同一商品重複付款或付款錯誤，將依付款方式及支付代理機構政策，對重複付款部分予以退款。",
        "若服務提供內容與展示、廣告內容不符，或與合約內容履行不一致，使用者得自收到供應之日起3個月內，或自知悉或可得知悉該事實之日起30天內申請撤回。",
        `退款申請將於確認付款人本人身分後受理，一旦確認屬於撤回或退款對象，公司將依相關法令於3個營業日內辦理取消付款或退款手續。實際反映至發卡機構或支付代理機構之時間可能因各付款方式之政策而異。退款諮詢：${mail}`,
        "為預防糾紛及遵守法令，公司得於必要範圍內保存確認時間、內容識別資訊、帳號識別碼、存取紀錄等日誌。",
      ]},
      { id: "free-trial", heading: "13. 免費試用與付費通行證之使用", paragraphs: [
        "即使於免費試用期間，若已瀏覽會員專屬內容而開始使用服務，此後對同一內容或付費通行證以單純改變心意為由之撤回可能受到限制。通行證類型、30天使用期限、付款金額、到期日、是否自動扣款以及退款條件均會於結帳頁面公示，使用者有責任於完成付款前予以確認。",
        "若依強制性規定須予退款，將依相關法令及支付代理機構政策處理。",
      ]},
      { id: "changes", heading: "14. 條款變更", paragraphs: [
        "條款如有變更，將於服務內公告生效日期及主要變更內容。變更後繼續使用服務，即視為同意修訂後之條款。重大變更將於必要時提前合理期限予以公告。",
      ]},
      { id: "governing-law", heading: "15. 準據法與管轄", paragraphs: [
        "本條款以大韓民國法令為準據法，相關爭議應向依相關法令具有管轄權之法院提起。",
      ]},
      { id: "contact", heading: "16. 聯絡方式", paragraphs: [
        `服務名稱：Code Destiny\n網站：https://code-destiny.com\n營運者：${op}\n條款諮詢：${mail}`,
        "工商登記資訊（大韓民國）：\n公司名稱：코드 데스티니（Code Destiny）\n代表人：박병하\n事業者登記編號：372-23-02329\n通訊銷售業申報編號：第2026-火城湖-0264號\n電話：+82-50-6664-7398\n地址：大韓民國京畿道華城市孝行區飛鳳面賽飛鳳洞路37, 101棟1207號",
      ]},
    ],
  },
};

export const PRIVACY_CONTENT: Record<NonKoLocale, LegalDocument> = {
  en: {
    effectiveDate: "2026-08-17",
    sections: [
      { id: "principles", heading: "1. Basic Principles", paragraphs: [
        "Code Destiny processes the minimum personal information necessary while providing fortune readings, reports, and consultation-style content, and publishes this policy to clearly explain the purpose of collection and the retention period.",
        `Personal information controller: ${op}\nSite: https://code-destiny.com`,
      ]},
      { id: "collected-data", heading: "2. Data Collected and Purpose of Use", paragraphs: [
        "At sign-up, we process your name, email, and required consent records for account management, customer support, sending notifications, and preventing fraudulent use. We do not ask for your mobile number at sign-up. We collect it only when your social login provider (Naver or Kakao) passes it on with your consent, or when you enter it yourself with separate consent at your first card checkout — and the only purpose is processing payments. Because the number must be provided to our payment processors as purchaser information it cannot be deleted, but it is encrypted with AES-256 when stored on our servers. For email sign-up, we store a securely hashed value rather than your plaintext password; for social sign-up, we link the account identifier from your chosen authentication provider. Inputs required for fortune calculations — such as date of birth, gender, birth time, and birthplace — are collected separately when you use the relevant fortune feature or profile after sign-up, and are used to generate results.",
        "Payment information may be processed together with our payment processor for payment processing, refunds, issuing receipts, and pass verification; Code Destiny does not directly store sensitive raw payment data such as full card numbers.",
        "The subject, content, attached images, and reported URL you submit through the bug report inbox (/feedback), along with environment information such as browser, screen size, language, and time zone, are used to reproduce and fix errors and to respond to you. You can opt out of sending environment information on the report screen.",
      ]},
      { id: "automatic-data", heading: "3. Automatically Processed Information", paragraphs: [
        "Access IP, browser and OS information, access time, language settings, device identifiers, cookie and local storage values, and page usage history may be processed for service stability, security checks, error analysis, and usage statistics.",
      ]},
      { id: "cookies-and-ads", heading: "4. Cookies, Advertising Identifiers, and Google AdSense Notice", paragraphs: [
        "Code Destiny may use cookies and similar technologies to keep you signed in, for security, usage statistics, and advertising. Our web service serves Google AdSense; third-party advertising partners, including Google AdSense, may store or read cookies in your browser as a result of serving ads, and may use information such as web beacons, IP addresses, and advertising identifiers.",
        "Google and its partners may serve personalized ads based on your prior visit history. You can manage personalized advertising through your browser settings, your device's ad settings, or Google Ads Settings (https://adssettings.google.com/).",
        "You can review how Google uses information from partner sites and apps at Google's Partner Sites/Apps data use notice (https://policies.google.com/technologies/partner-sites).",
      ]},
      { id: "third-party", heading: "5. Third-Party Disclosure and Processing Delegation", paragraphs: [
        "Code Destiny does not sell personal information without your consent. However, where necessary for operating the Service — such as payment processing, cloud hosting, security, analytics, sending email, and serving advertising — external processors or advertising partners may process information within the scope necessary for that purpose.",
      ]},
      { id: "retention", heading: "6. Retention Period", paragraphs: [
        "Input values and result data are retained for the period necessary to provide the Service, allow re-viewing, and respond to errors, and are destroyed without delay once you request deletion or the purpose has been achieved. Inquiry records may be retained for up to 3 years to respond to disputes, access logs for up to 3 months for security and fraud prevention, and payment records for the period required by applicable law.",
      ]},
      { id: "user-rights", heading: "7. User Rights", paragraphs: [
        "You may request access to, correction of, or deletion of your personal information, request that we stop processing it, or withdraw your consent. Requests are handled after a reasonable identity-verification procedure, within the scope permitted by applicable law.",
        "You can request deletion of your account and personal information directly from the account deletion page (/account/delete), or by contacting us at the address below.",
      ]},
      { id: "children", heading: "8. Children's Personal Information", paragraphs: [
        "Code Destiny does not target children under the age of 14, and restricts sign-up unless age 14 or older is confirmed at registration. We do not collect a full date of birth at the sign-up stage for any purpose other than age verification. If you believe we have collected personal information from a child under 14, please contact us at the address below; we will take the necessary deletion measures after confirming.",
      ]},
      { id: "sensitive-interpretation", heading: "9. Sensitive Interpretations and Ad Targeting", paragraphs: [
        "Interpretive content touching on health, finances, relationships, or legal matters is provided only as reference content to support your own self-understanding. Code Destiny takes care not to use such sensitive interpretive content to cause anxiety or to inappropriately link it to personalized ad targeting.",
      ]},
      { id: "security", heading: "10. Security Measures", paragraphs: [
        "We apply reasonable technical and administrative safeguards, including access restrictions, protection of data in transit, log review, and fraud detection. However, because no method of transmission over the internet or electronic storage can be guaranteed to be completely secure, we continually work to improve these measures.",
      ]},
      { id: "changes", heading: "11. Changes to This Policy", paragraphs: [
        "This policy may be revised in response to changes in law, our services, or our advertising partners' policies. Material changes will be reflected on this page and, where necessary, announced within the Service or through separate notice.",
      ]},
      { id: "contact", heading: "12. Privacy Contact", paragraphs: [
        `For inquiries about accessing, correcting, or deleting your personal information, stopping processing, or advertising and cookies, please contact us at the email address below.\n${mail}`,
      ]},
    ],
  },
  ja: {
    effectiveDate: "2026-08-17",
    sections: [
      { id: "principles", heading: "1. 基本原則", paragraphs: [
        "Code Destinyは、運勢、レポート、相談型コンテンツを提供する過程で必要な個人情報を最小限に処理し、収集目的と保管期間を明確にお知らせするため、本方針を公開します。",
        `個人情報処理者：${op}\nサイト：https://code-destiny.com`,
      ]},
      { id: "collected-data", heading: "2. 収集項目と利用目的", paragraphs: [
        "会員登録時、氏名、メールアドレス、必須同意記録を、アカウント管理、カスタマーサポート、通知の送信、不正利用防止のために処理します。携帯電話番号は会員登録時には収集しません。番号は、ソーシャルログイン提供者（ネイバー・カカオ）がお客様の同意を得て提供した場合、または初回のカード決済時にお客様が別途同意のうえ直接入力した場合にのみ収集し、利用目的は決済の遂行のみです。携帯電話番号は決済代行会社に購入者情報として提供する必要があるため削除できませんが、サーバーに保存する際はAES-256方式で暗号化して保管します。メール登録の場合はパスワードの原文ではなく安全にハッシュ化された値が保存され、ソーシャル登録の場合は選択した認証プロバイダーのアカウント識別子が連携されます。生年月日、性別、出生時刻、出生地等、運勢計算に必要な入力値は、登録後に該当する運勢機能またはプロフィールを使用する際に別途入力を受け、結果生成に使用します。",
        "決済情報は、決済処理、返金、領収書発行、パス確認のために決済代行会社と共に処理される場合があり、Code Destinyはカード番号全体のような機密性の高い決済原本情報を直接保存しません。",
        "不具合報告窓口（/feedback）にお送りいただいたタイトル、内容、添付画像、報告対象URLおよびブラウザ、画面サイズ、言語、タイムゾーン等の環境情報は、エラーの再現・修正・返信のために使用され、環境情報の送信は報告画面で解除できます。",
      ]},
      { id: "automatic-data", heading: "3. 自動的に処理される情報", paragraphs: [
        "接続IP、ブラウザおよびOS情報、接続時刻、言語設定、端末識別情報、Cookieおよびローカルストレージの値、ページ利用履歴が、サービスの安定性、セキュリティ点検、エラー分析、利用統計の確認のために処理される場合があります。",
      ]},
      { id: "cookies-and-ads", heading: "4. Cookie、広告識別子、Google AdSenseに関する告知", paragraphs: [
        "Code Destinyは、ログイン維持、セキュリティ、利用統計、広告配信のためにCookieおよび類似技術を使用する場合があります。ウェブサービスにはGoogle AdSenseが掲載されており、Google AdSenseを含む第三者広告パートナーは、広告提供の結果として利用者のブラウザにCookieを保存または読み取る場合があり、ウェブビーコン、IPアドレス、広告識別子等の情報を使用する場合があります。",
        "Googleおよびそのパートナーは、利用者の過去の訪問履歴に基づきパーソナライズ広告を提供する場合があります。利用者は、ブラウザ設定、端末の広告設定、Google広告設定（https://adssettings.google.com/）でパーソナライズ広告を管理できます。",
        "Googleがパートナーサイトおよびアプリの情報を使用する方法は、Googleパートナーサイト/アプリのデータ使用に関する説明（https://policies.google.com/technologies/partner-sites）でご確認いただけます。",
      ]},
      { id: "third-party", heading: "5. 第三者提供と処理委託", paragraphs: [
        "Code Destinyは、利用者の同意なく個人情報を販売しません。ただし、決済処理、クラウドホスティング、セキュリティ、分析、メール送信、広告配信等、サービス運営に必要な場合には、当該目的に必要な範囲で外部処理者または広告パートナーが情報を処理する場合があります。",
      ]},
      { id: "retention", heading: "6. 保管期間", paragraphs: [
        "入力値および結果データは、サービス提供、再閲覧、エラー対応に必要な期間保管され、利用者が削除を請求した場合、または目的が達成された場合は遅滞なく破棄します。問い合わせ記録は紛争対応のため最大3年間、接続ログはセキュリティおよび不正利用防止のため最大3か月間、決済記録は関係法令が要求する期間保管される場合があります。",
      ]},
      { id: "user-rights", heading: "7. 利用者の権利", paragraphs: [
        "利用者は、個人情報の閲覧、訂正、削除、処理停止、同意撤回を請求できます。請求は、合理的な本人確認手続きの後、関係法令が許容する範囲で処理します。",
        "アカウントおよび個人情報の削除は、アカウント削除ページ（/account/delete）から直接請求できるほか、以下のお問い合わせ先でも受け付けます。",
      ]},
      { id: "children", heading: "8. 児童の個人情報", paragraphs: [
        "Code Destinyは満14歳未満の児童を対象としておらず、会員登録時に満14歳以上であることを確認した上で登録を制限します。登録段階では年齢確認のみを目的として、生年月日の全体を収集することはありません。満14歳未満の児童の個人情報が収集されたと判断される場合は、以下のお問い合わせ先までご連絡ください。確認の上、必要な削除措置を行います。",
      ]},
      { id: "sensitive-interpretation", heading: "9. 機微な解釈と広告ターゲティング", paragraphs: [
        "健康、財政、人間関係、法律性のある解釈は、利用者の自己理解を助けるための参考コンテンツとしてのみ提供されます。Code Destinyは、このような機微な解釈内容を利用して利用者を不安にさせたり、パーソナライズ広告のターゲティングと不適切に結び付けたりしないよう注意します。",
      ]},
      { id: "security", heading: "10. セキュリティ対策", paragraphs: [
        "アクセス権限の制限、送信区間の保護、ログ点検、不正利用の検知等、合理的な技術的・管理的保護措置を適用します。ただし、インターネットを通じた送信および保存方式は絶対的な安全性を保証できないため、継続的に改善を行います。",
      ]},
      { id: "changes", heading: "11. 方針の変更", paragraphs: [
        "本方針は、法令、サービス、広告パートナーのポリシーの変更に応じて改定される場合があります。重要な変更事項は本ページに反映し、必要な場合はサービス内の告知または別途の案内によりお知らせします。",
      ]},
      { id: "contact", heading: "12. 個人情報に関するお問い合わせ", paragraphs: [
        `個人情報の閲覧、訂正、削除、処理停止、広告・Cookieに関するお問い合わせは、以下のメールアドレスまでご連絡ください。\n${mail}`,
      ]},
    ],
  },
  zh: {
    effectiveDate: "2026-08-17",
    sections: [
      { id: "principles", heading: "1. 基本原则", paragraphs: [
        "Code Destiny 在提供运势、报告、咨询型内容的过程中，仅处理必要的最小范围个人信息，并公开本方针以明确告知收集目的与保存期限。",
        `个人信息处理者：${op}\n网站：https://code-destiny.com`,
      ]},
      { id: "collected-data", heading: "2. 收集项目与使用目的", paragraphs: [
        "会员注册时，公司出于账号管理、客户服务、通知发送及防止不当使用等目的，处理姓名、邮箱及必要同意记录。会员注册时不收集手机号码。仅在社交登录提供商（Naver·Kakao）经您同意后提供、或您在首次银行卡结算时另行同意并亲自填写的情况下收集，且用途仅限于结算处理。由于手机号码须作为购买者信息提供给支付代理机构，故无法删除，但存储于服务器时将以AES-256方式加密保管。以邮箱注册时，保存的并非密码原文，而是经过安全哈希处理的数值；以社交账号注册时，将关联所选身份验证提供商的账号识别符。生辰、性别、出生时间、出生地等运势计算所需的输入值，将在注册后使用相应运势功能或个人资料时另行收集，并用于结果生成。",
        "支付信息可能出于支付处理、退款、开具收据、通行证确认等目的与支付代理机构共同处理，Code Destiny 不会直接存储完整卡号等敏感支付原始信息。",
        "通过错误反馈通道（/feedback）提交的标题、内容、附件图片、反馈对象网址，以及浏览器、屏幕尺寸、语言、时区等环境信息，将用于错误重现、修复与回复，环境信息的发送可在反馈页面中取消。",
      ]},
      { id: "automatic-data", heading: "3. 自动处理的信息", paragraphs: [
        "接入IP、浏览器及操作系统信息、接入时间、语言设置、设备识别信息、Cookie及本地存储数值、页面使用记录，可能出于服务稳定性、安全检查、错误分析、使用统计确认等目的被处理。",
      ]},
      { id: "cookies-and-ads", heading: "4. Cookie、广告识别符及 Google AdSense 告知", paragraphs: [
        "Code Destiny 可能出于保持登录状态、安全、使用统计、广告投放等目的使用 Cookie 及类似技术。本网站服务投放 Google AdSense 广告，包括 Google AdSense 在内的第三方广告合作伙伴可能因提供广告而在用户浏览器中存储或读取 Cookie，并可能使用网络信标、IP地址、广告识别符等信息。",
        "Google 及其合作伙伴可能根据用户过往访问记录提供个性化广告。用户可在浏览器设置、设备广告设置或 Google 广告设置（https://adssettings.google.com/）中管理个性化广告。",
        "关于 Google 如何使用合作伙伴网站及应用信息的方式，可参阅 Google 合作伙伴网站/应用数据使用说明（https://policies.google.com/technologies/partner-sites）。",
      ]},
      { id: "third-party", heading: "5. 第三方提供与处理委托", paragraphs: [
        "Code Destiny 未经用户同意不会出售个人信息。但在支付处理、云端托管、安全、数据分析、邮件发送、广告投放等服务运营所需的情形下，外部处理机构或广告合作伙伴可能在该目的所需范围内处理相关信息。",
      ]},
      { id: "retention", heading: "6. 保存期限", paragraphs: [
        "输入值及结果数据将在服务提供、再次查看、错误应对所需的期间内保存，用户请求删除或目的已达成时将及时销毁。咨询记录为应对纠纷最长保存3年，接入日志为安全及防止不当使用最长保存3个月，支付记录可能依相关法令要求的期限保存。",
      ]},
      { id: "user-rights", heading: "7. 用户权利", paragraphs: [
        "用户可请求查阅、更正、删除个人信息，请求停止处理，或撤回同意。相关请求将在合理的本人身份确认程序后，于相关法令允许的范围内处理。",
        "账号及个人信息的删除可在账号删除页面（/account/delete）直接申请，亦可通过以下联系方式受理。",
      ]},
      { id: "children", heading: "8. 儿童个人信息", paragraphs: [
        "Code Destiny 不以未满14周岁儿童为服务对象，会员注册时须确认已满14周岁方可注册。注册阶段仅为确认年龄，不会收集完整出生日期。如判断收集了未满14周岁儿童的个人信息，请通过以下联系方式告知，公司确认后将采取必要的删除措施。",
      ]},
      { id: "sensitive-interpretation", heading: "9. 敏感解读与广告定向", paragraphs: [
        "关于健康、财务、人际关系、法律性质的解读内容，仅作为帮助用户自我理解的参考内容提供。Code Destiny 将注意避免利用此类敏感解读内容使用户产生不安，或将其不当用于个性化广告定向。",
      ]},
      { id: "security", heading: "10. 安全措施", paragraphs: [
        "公司采取访问权限限制、传输区段保护、日志检查、不当使用检测等合理的技术性与管理性保护措施。但由于互联网传输及存储方式无法保证绝对安全，公司将持续改进相关措施。",
      ]},
      { id: "changes", heading: "11. 方针变更", paragraphs: [
        "本方针可能因法令、服务或广告合作伙伴政策的变更而修订。重大变更事项将反映于本页面，并在必要时通过服务内公告或另行通知告知用户。",
      ]},
      { id: "contact", heading: "12. 个人信息咨询", paragraphs: [
        `如有个人信息查阅、更正、删除、停止处理，或广告、Cookie相关咨询，请通过以下邮箱联系我们。\n${mail}`,
      ]},
    ],
  },
  "zh-TW": {
    effectiveDate: "2026-08-17",
    sections: [
      { id: "principles", heading: "1. 基本原則", paragraphs: [
        "Code Destiny 在提供運勢、報告、諮詢型內容的過程中，僅處理必要的最小範圍個人資料，並公開本政策以明確告知蒐集目的與保存期限。",
        `個人資料管理者：${op}\n網站：https://code-destiny.com`,
      ]},
      { id: "collected-data", heading: "2. 蒐集項目與使用目的", paragraphs: [
        "會員註冊時，公司基於帳號管理、客戶服務、通知發送及防止不當使用等目的，處理姓名、電子郵件及必要同意紀錄。會員註冊時不收集行動電話號碼。僅在社群登入提供商（Naver·Kakao）經您同意後提供、或您於首次信用卡結帳時另行同意並親自填寫的情況下收集，且用途僅限於結帳處理。由於行動電話號碼須作為購買者資訊提供予支付代理機構，故無法刪除，但儲存於伺服器時將以AES-256方式加密保管。以電子郵件註冊時，儲存的並非密碼原文，而是經過安全雜湊處理之數值；以社群帳號註冊時，將連結所選身分驗證提供商之帳號識別碼。出生年月日、性別、出生時間、出生地等運勢計算所需之輸入值，將於註冊後使用相應運勢功能或個人檔案時另行收集，並用於結果生成。",
        "付款資訊可能基於付款處理、退款、開立收據、通行證確認等目的與支付代理機構共同處理，Code Destiny 不會直接儲存完整卡號等敏感付款原始資訊。",
        "透過錯誤回報信箱（/feedback）提交之標題、內容、附件圖片、回報對象網址，以及瀏覽器、螢幕尺寸、語言、時區等環境資訊，將用於錯誤重現、修復與回覆，環境資訊之傳送可於回報畫面中取消。",
      ]},
      { id: "automatic-data", heading: "3. 自動處理之資訊", paragraphs: [
        "連線IP、瀏覽器及作業系統資訊、連線時間、語言設定、裝置識別資訊、Cookie及本機儲存數值、頁面使用紀錄，可能基於服務穩定性、安全檢查、錯誤分析、使用統計確認等目的被處理。",
      ]},
      { id: "cookies-and-ads", heading: "4. Cookie、廣告識別碼及 Google AdSense 告知", paragraphs: [
        "Code Destiny 可能基於維持登入狀態、安全、使用統計、廣告投放等目的使用 Cookie 及類似技術。本網站服務投放 Google AdSense 廣告，包括 Google AdSense 在內之第三方廣告合作夥伴可能因提供廣告而於使用者瀏覽器中儲存或讀取 Cookie，並可能使用網路信標、IP位址、廣告識別碼等資訊。",
        "Google 及其合作夥伴可能依使用者過往造訪紀錄提供個人化廣告。使用者可於瀏覽器設定、裝置廣告設定或 Google 廣告設定（https://adssettings.google.com/）中管理個人化廣告。",
        "關於 Google 如何使用合作夥伴網站及應用程式資訊之方式，可參閱 Google 合作夥伴網站/應用程式資料使用說明（https://policies.google.com/technologies/partner-sites）。",
      ]},
      { id: "third-party", heading: "5. 第三方提供與處理委託", paragraphs: [
        "Code Destiny 未經使用者同意不會出售個人資料。但於付款處理、雲端代管、安全、數據分析、電子郵件發送、廣告投放等服務營運所需之情形下，外部處理機構或廣告合作夥伴可能於該目的所需範圍內處理相關資訊。",
      ]},
      { id: "retention", heading: "6. 保存期限", paragraphs: [
        "輸入值及結果資料將於服務提供、重新檢視、錯誤應對所需之期間內保存，使用者請求刪除或目的已達成時將及時銷毀。詢問紀錄為應對糾紛最長保存3年，連線日誌為安全及防止不當使用最長保存3個月，付款紀錄可能依相關法令要求之期限保存。",
      ]},
      { id: "user-rights", heading: "7. 使用者權利", paragraphs: [
        "使用者得請求查閱、更正、刪除個人資料，請求停止處理，或撤回同意。相關請求將於合理之本人身分確認程序後，於相關法令允許之範圍內處理。",
        "帳號及個人資料之刪除得於帳號刪除頁面（/account/delete）直接申請，亦得透過以下聯絡方式受理。",
      ]},
      { id: "children", heading: "8. 兒童個人資料", paragraphs: [
        "Code Destiny 不以未滿14歲兒童為服務對象，會員註冊時須確認已滿14歲方得註冊。註冊階段僅為確認年齡，不會蒐集完整出生日期。如判斷蒐集了未滿14歲兒童之個人資料，請透過以下聯絡方式告知，公司確認後將採取必要之刪除措施。",
      ]},
      { id: "sensitive-interpretation", heading: "9. 敏感解讀與廣告定向", paragraphs: [
        "關於健康、財務、人際關係、法律性質之解讀內容，僅作為協助使用者自我理解之參考內容提供。Code Destiny 將注意避免利用此類敏感解讀內容使使用者產生不安，或將其不當用於個人化廣告定向。",
      ]},
      { id: "security", heading: "10. 安全措施", paragraphs: [
        "公司採取存取權限限制、傳輸區段保護、日誌檢查、不當使用偵測等合理之技術性與管理性保護措施。但由於網際網路傳輸及儲存方式無法保證絕對安全，公司將持續改善相關措施。",
      ]},
      { id: "changes", heading: "11. 政策變更", paragraphs: [
        "本政策可能因法令、服務或廣告合作夥伴政策之變更而修訂。重大變更事項將反映於本頁面，並於必要時透過服務內公告或另行通知告知使用者。",
      ]},
      { id: "contact", heading: "12. 個人資料相關詢問", paragraphs: [
        `個人資料之查閱、更正、刪除、停止處理，或廣告、Cookie相關詢問，請透過以下電子郵件與我們聯絡。\n${mail}`,
      ]},
    ],
  },
};
