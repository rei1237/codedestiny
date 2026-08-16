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
