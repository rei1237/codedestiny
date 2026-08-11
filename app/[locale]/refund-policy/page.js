import Link from "next/link";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";
import { LOCALE_CONFIG, PUBLIC_LOCALES } from "../../../lib/i18n/locales";
import { TERMS_CONTENT } from "../../../lib/legal/legalContent";
import { REFUND_INTRO, REFUND_JURISDICTION_NOTES, getRefundSection } from "../../../lib/legal/refundContent";
import LegalDocumentBody from "../../components/LegalDocumentBody";
import { resolveLocale } from "../_lib";

const PAGE_COPY = {
  en: {
    title: "Refund Policy | Code Destiny",
    description: "Code Destiny's refund and withdrawal terms for the 30-day Pass and single-item payments, including the digital-content withdrawal exception.",
    heading: "Refund Policy",
    dateLabel: "Effective Date",
    related: "Related documents",
    terms: "Terms of Service",
    translationNotice: "This page is a machine-assisted translation for reference. In case of any discrepancy, the Korean-language original (Terms of Service, Section 12) governs.",
  },
  ja: {
    title: "返金ポリシー | Code Destiny",
    description: "30日パスおよび都度決済に関するCode Destinyの返金・契約解除条件（デジタルコンテンツの解除制限を含む）です。",
    heading: "返金ポリシー",
    dateLabel: "施行日",
    related: "関連文書",
    terms: "利用規約",
    translationNotice: "本ページは参考用の機械補助翻訳です。内容に相違がある場合は、韓国語原文（利用規約12条）が優先します。",
  },
  zh: {
    title: "退款政策 | Code Destiny",
    description: "Code Destiny 关于30天通行证与单次付费的退款与撤回条款，含数字内容撤回限制说明。",
    heading: "退款政策",
    dateLabel: "生效日期",
    related: "相关文档",
    terms: "服务条款",
    translationNotice: "本页面为参考用的机器辅助翻译。如与韩语原文（服务条款第12条）存在出入，以韩语原文为准。",
  },
  "zh-TW": {
    title: "退款政策 | Code Destiny",
    description: "Code Destiny 關於30天通行證與單次付款之退款與撤回條款，含數位內容撤回限制說明。",
    heading: "退款政策",
    dateLabel: "生效日期",
    related: "相關文件",
    terms: "服務條款",
    translationNotice: "本頁面為參考用之機器輔助翻譯。如與韓語原文（服務條款第12條）有出入，以韓語原文為準。",
  },
};

export function generateStaticParams() {
  return PUBLIC_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const locale = resolveLocale((await params).locale);
  const copy = PAGE_COPY[locale];
  return generatePageMetadata({
    path: `${LOCALE_CONFIG[locale].pathPrefix}/refund-policy`,
    title: copy.title,
    description: copy.description,
    inLanguage: LOCALE_CONFIG[locale].htmlLang,
    hreflangPaths: {
      en: "/en/refund-policy",
      ja: "/ja/refund-policy",
      zh: "/zh/refund-policy",
    },
  });
}

export default async function LocaleRefundPolicyPage({ params }) {
  const locale = resolveLocale((await params).locale);
  const copy = PAGE_COPY[locale];
  const section = getRefundSection(locale);
  const intro = REFUND_INTRO[locale];
  const note = REFUND_JURISDICTION_NOTES[locale];
  const prefix = LOCALE_CONFIG[locale].pathPrefix;

  const document = {
    effectiveDate: TERMS_CONTENT[locale].effectiveDate,
    sections: note
      ? [{ ...section, heading: copy.heading }, { id: "jurisdiction-note", heading: note.heading, paragraphs: note.paragraphs }]
      : [{ ...section, heading: copy.heading }],
  };

  return (
    <main className="policy-doc" lang={LOCALE_CONFIG[locale].htmlLang}>
      <header className="policy-doc__head">
        <h1 className="policy-doc__title">{copy.heading}</h1>
        <p className="policy-doc__meta">
          {copy.dateLabel}: {document.effectiveDate}
        </p>
        <p className="policy-doc__lede">{intro}</p>
        <p className="policy-doc__note policy-doc__note--lead">{copy.translationNotice}</p>
      </header>

      <div className="policy-doc__layout">
        <div className="policy-doc__body">
          <LegalDocumentBody document={document} dateLabel={copy.dateLabel} />

          <nav className="policy-doc__related" aria-label={copy.related}>
            <Link className="policy-doc__toc-link" href={`${prefix}/terms-of-service`}>
              {copy.terms}
            </Link>
          </nav>
        </div>
      </div>
    </main>
  );
}
