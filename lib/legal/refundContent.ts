/**
 * 환불/청약철회 정책 — 독립 페이지용.
 *
 * 실질 조항은 `legalContent.ts`의 이용약관 12조("Refund and Withdrawal Guide")와 동일하다
 * (같은 계약의 두 표현이 갈라지면 어느 쪽이 정본인지 다투게 되므로, 본문은 그 12조를 그대로
 * 재사용하고 이 파일은 도입부 + 국가별 참고 노트만 얹는다).
 *
 * 🔴 국가별 노트는 "이 서비스의 준거법이 바뀐다"는 뜻이 아니다 — 준거법은 항상 대한민국이다
 *    (`docs/INTERNATIONAL_MARKET_LOCALIZATION.md` Locale Separation 원칙). 노트는 그 나라 독자가
 *    자국 개념과 어떻게 다른지 이해하도록 돕는 참고 설명일 뿐이다.
 *
 * 🔴 기계 보조 번역 — 원어민·법률 검토 전 PG사 제출용 단독 근거로 쓰지 말 것.
 */
import { TERMS_CONTENT, NonKoLocale } from "./legalContent";

export type RefundJurisdictionNote = {
  heading: string;
  paragraphs: string[];
};

/**
 * 기계 보조 번역 고지. `app/[locale]/refund-policy/page.js` 와 로케일 푸터
 * (`app/components/LocaleFooterHub.jsx`)가 **같은 문장**을 써야 하므로 여기서 한 번만 정의한다.
 * 두 곳에 따로 적어 두면 한쪽만 고쳐졌을 때 어느 쪽이 정본인지 다투게 된다.
 */
export const LEGAL_TRANSLATION_NOTICE: Record<NonKoLocale, string> = {
  en: "This page is a machine-assisted translation for reference. In case of any discrepancy, the Korean-language original (Terms of Service, Section 12) governs.",
  ja: "本ページは参考用の機械補助翻訳です。内容に相違がある場合は、韓国語原文（利用規約12条）が優先します。",
  zh: "本页面为参考用的机器辅助翻译。如与韩语原文（服务条款第12条）存在出入，以韩语原文为准。",
  "zh-TW": "本頁面為參考用之機器輔助翻譯。如與韓語原文（服務條款第12條）有出入，以韓語原文為準。",
};

export const REFUND_INTRO: Record<NonKoLocale, string> = {
  en: "This page summarizes Code Destiny's refund and withdrawal terms for paid Passes and single-item payments. It is the same policy set out in Section 12 of the Terms of Service; this standalone page exists to make it easier to find and review.",
  ja: "このページは、有料パスおよび都度決済に関するCode Destinyの返金・契約解除条件をまとめたものです。内容は利用規約12条と同一であり、確認しやすいよう独立ページとして提供しています。",
  zh: "本页面汇总了 Code Destiny 针对付费通行证与单次付费的退款与撤回条款，内容与服务条款第12条一致，仅为方便查阅而独立成页。",
  "zh-TW": "本頁面彙整了 Code Destiny 針對付費通行證與單次付款之退款與撤回條款，內容與服務條款第12條一致，僅為方便查閱而獨立成頁。",
};

/**
 * 독립 환불 페이지에만 보이는 이용 안내다. 이용약관 12조의 조건을 복제하거나
 * 확장하지 않고, 문의 전에 확인할 사실과 이 페이지의 역할만 설명한다.
 */
export const REFUND_PAGE_GUIDANCE: Record<NonKoLocale, RefundJurisdictionNote> = {
  en: {
    heading: "How to use this page",
    paragraphs: [
      "Use this page to understand which published terms are relevant before contacting support. Keep the order reference, payment date, the feature involved and a short description of what occurred. These details help identify a payment record or a delivery issue, but providing them does not itself determine eligibility, create a new remedy, or change the conditions in Section 12.",
      "If a result does not appear after payment, avoid repeating the purchase while the original order is being checked. The applicable response depends on the verified record and the published terms: a case may involve confirming delivery, regenerating a result, adjusting access, or reviewing a refund request. This guidance is for navigation only; it does not promise a response time, a refund, or a particular outcome.",
    ],
  },
  ja: {
    heading: "このページの確認方法",
    paragraphs: [
      "お問い合わせの前に、注文番号、決済日、対象となる機能、発生した状況を簡潔に整理してください。これらの情報は決済記録や提供状況の確認に役立ちますが、情報を送るだけで返金対象が確定したり、利用規約12条の条件が変わったりするものではありません。",
      "決済後に結果が表示されない場合は、元の注文を確認している間に同じ購入を繰り返さないでください。確認された記録と公開済みの条件に応じて、提供状況の確認、結果の再生成、利用状況の調整、返金申請の確認などを行います。この案内は手続きの入口を示すものであり、回答期限、返金、特定の対応を約束するものではありません。",
    ],
  },
  zh: {
    heading: "如何阅读本页面",
    paragraphs: [
      "联系客户支持前，请整理订单编号、付款日期、涉及的功能以及实际发生的情况。这些信息有助于核对付款记录与服务提供状态，但提交这些信息本身并不意味着已经符合退款条件，也不会改变服务条款第12条所载的条件。",
      "如付款后未显示结果，请在核对原订单期间避免重复购买。后续处理会依据已核实的记录和已公布的条款，可能包括确认提供状态、重新生成结果、调整使用状态或审查退款申请。本说明仅帮助您找到合适的处理入口，不承诺固定回复时间、退款或任何特定结果。",
      "查看时请同时对照购买功能页面上的说明、订单记录以及当前公布的服务条款。本页只是帮助理解既有规则和联系路径，不会另行增加退款资格，也不会取代对实际付款与提供记录的核对。",
    ],
  },
  "zh-TW": {
    heading: "如何閱讀本頁",
    paragraphs: [
      "聯絡客服前，請整理訂單編號、付款日期、涉及的功能及實際發生的情況。這些資料有助於核對付款紀錄與服務提供狀態，但提交資料本身不代表已符合退款條件，也不會變更服務條款第12條所載的條件。",
      "若付款後未顯示結果，請在核對原訂單期間避免重複購買。後續處理會依已核實的紀錄與已公布的條款，可能包含確認提供狀態、重新生成結果、調整使用狀態或審查退款申請。本說明僅協助找到適當的處理入口，不承諾固定回覆時間、退款或任何特定結果。",
    ],
  },
};

export const REFUND_JURISDICTION_NOTES: Record<NonKoLocale, RefundJurisdictionNote | null> = {
  en: null,
  ja: {
    heading: "参考：日本の読者の方へ",
    paragraphs: [
      "本サービスは大韓民国の法令を準拠法として運営されており（利用規約15条）、このページの内容は日本の特定商取引法上の返品特約そのものではありません。特定商取引法に基づく表記事項（事業者情報、対価、支払時期、引渡時期、返品特約等）は別途「特定商取引法に基づく表記」ページでご確認いただけます。",
      "参考情報として、日本では一般に、デジタルコンテンツのようにその性質上、提供が開始されると全部または一部の返品・返金が制限される取引形態があります。本サービスの返金条件（上記12条）も、コンテンツ生成やPDFレンダリング等の提供開始後は同様の考え方で一部返金が制限される場合がある、という点で近い構造を持ちますが、適用される法令はあくまで大韓民国法です。",
    ],
  },
  zh: null,
  "zh-TW": {
    heading: "參考：給台灣讀者的說明",
    paragraphs: [
      "本服務以大韓民國法令為準據法營運（服務條款第15條），本頁內容並非依台灣消費者保護法所定之通訊交易解除權告知。",
      "僅供參考：台灣消費者保護法第19條原則上賦予消費者收受商品或服務後7天內無條件解除契約之權利，但已於同法施行細則中就「非以有形媒介提供之數位內容或一經提供即為完成之線上服務」等情形，於取得消費者事前同意並告知之情況下，訂有例外規定。本服務上述退款條款中「內容生成、PDF渲染、付費解讀瀏覽等已開始提供時可能限制撤回」之安排，即屬相近的概念，惟實際適用之法令仍為大韓民國法，如兩者有出入，仍以服務條款第15條所定準據法為準。",
    ],
  },
};

export function getRefundSection(locale: NonKoLocale) {
  const section = TERMS_CONTENT[locale].sections.find((item) => item.id === "refund-policy");
  if (!section) throw new Error(`refund-policy section missing for locale ${locale}`);
  return section;
}
