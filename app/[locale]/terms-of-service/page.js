import Link from "next/link";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";
import { LOCALE_CONFIG, PUBLIC_LOCALES } from "../../../lib/i18n/locales";
import { TERMS_CONTENT } from "../../../lib/legal/legalContent";
import LegalDocumentBody from "../../components/LegalDocumentBody";
import { resolveLocale } from "../_lib";

const PAGE_COPY = {
  en: {
    title: "Terms of Service | Code Destiny",
    description:
      "Code Destiny's Terms of Service: service rules, disclaimers, liability limits, refund and withdrawal policy, and dispute handling principles.",
    heading: "Terms of Service",
    lede: "This document sets out the conditions for using Code Destiny, the refund and withdrawal terms for paid products, and the rights and obligations of the Company and users.",
    toc: "Table of Contents",
    tocAria: "Terms of Service table of contents",
    related: "Related documents",
    privacy: "Privacy Policy",
    refund: "Refund Policy",
    dateLabel: "Effective Date",
    translationNotice: "This page is a machine-assisted translation for reference. In case of any discrepancy, the Korean-language original at /terms-of-service governs.",
  },
  ja: {
    title: "利用規約 | Code Destiny",
    description: "Code Destinyの利用規約です。サービス利用ルール、免責、責任制限、返金・契約解除ポリシー、紛争処理の原則を案内します。",
    heading: "利用規約",
    lede: "本サービスの利用条件、有料商品の返金・契約解除基準、当社と利用者の権利・義務を整理した文書です。",
    toc: "目次",
    tocAria: "利用規約 目次",
    related: "関連文書",
    privacy: "プライバシーポリシー",
    refund: "返金ポリシー",
    dateLabel: "施行日",
    translationNotice: "本ページは参考用の機械補助翻訳です。内容に相違がある場合は、韓国語原文（/terms-of-service）が優先します。",
  },
  zh: {
    title: "服务条款 | Code Destiny",
    description: "Code Destiny 服务条款说明服务使用规则、免责声明、责任限制、退款与撤回政策与争议处理原则。",
    heading: "服务条款",
    lede: "本文档说明 Code Destiny 服务的使用条件、付费商品的退款与撤回标准，以及公司与用户之间的权利义务。",
    toc: "目录",
    tocAria: "服务条款目录",
    related: "相关文档",
    privacy: "隐私政策",
    refund: "退款政策",
    dateLabel: "生效日期",
    translationNotice: "本页面为参考用的机器辅助翻译。如与韩语原文（/terms-of-service）存在出入，以韩语原文为准。",
  },
  "zh-TW": {
    title: "服務條款 | Code Destiny",
    description: "Code Destiny 服務條款說明服務使用規則、免責聲明、責任限制、退款與撤回政策與爭議處理原則。",
    heading: "服務條款",
    lede: "本文件說明 Code Destiny 服務之使用條件、付費商品之退款與撤回標準，以及公司與使用者之間之權利義務。",
    toc: "目錄",
    tocAria: "服務條款目錄",
    related: "相關文件",
    privacy: "隱私權政策",
    refund: "退款政策",
    dateLabel: "生效日期",
    translationNotice: "本頁面為參考用之機器輔助翻譯。如與韓語原文（/terms-of-service）有出入，以韓語原文為準。",
  },
};

export function generateStaticParams() {
  return PUBLIC_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const locale = resolveLocale((await params).locale);
  const copy = PAGE_COPY[locale];
  return generatePageMetadata({
    path: `${LOCALE_CONFIG[locale].pathPrefix}/terms-of-service`,
    title: copy.title,
    description: copy.description,
    inLanguage: LOCALE_CONFIG[locale].htmlLang,
    hreflangPaths: {
      en: "/en/terms-of-service",
      ja: "/ja/terms-of-service",
      zh: "/zh/terms-of-service",
      "x-default": "/terms-of-service",
    },
  });
}

export default async function LocaleTermsOfServicePage({ params }) {
  const locale = resolveLocale((await params).locale);
  const copy = PAGE_COPY[locale];
  const document = TERMS_CONTENT[locale];
  const prefix = LOCALE_CONFIG[locale].pathPrefix;

  return (
    <main className="policy-doc" lang={LOCALE_CONFIG[locale].htmlLang}>
      <header className="policy-doc__head">
        <h1 className="policy-doc__title">{copy.heading}</h1>
        <p className="policy-doc__meta">{document.effectiveDate}</p>
        <p className="policy-doc__lede">{copy.lede}</p>
        <p className="policy-doc__note policy-doc__note--lead">{copy.translationNotice}</p>
      </header>

      <div className="policy-doc__layout">
        <nav className="policy-doc__toc" aria-label={copy.tocAria}>
          <p className="policy-doc__toc-title">{copy.toc}</p>
          <ul className="policy-doc__toc-list">
            {document.sections.map((section) => (
              <li key={section.id}>
                <a className="policy-doc__toc-link" href={`#${section.id}`}>
                  {section.heading}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="policy-doc__body">
          <LegalDocumentBody document={document} dateLabel={copy.dateLabel} />

          <nav className="policy-doc__related" aria-label={copy.related}>
            <Link className="policy-doc__toc-link" href={`${prefix}/privacy-policy`}>
              {copy.privacy}
            </Link>
            <Link className="policy-doc__toc-link" href={`${prefix}/refund-policy`}>
              {copy.refund}
            </Link>
          </nav>
        </div>
      </div>
    </main>
  );
}
