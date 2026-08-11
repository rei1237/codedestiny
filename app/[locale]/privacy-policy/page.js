import Link from "next/link";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";
import { LOCALE_CONFIG, PUBLIC_LOCALES, localeUrlSegment } from "../../../lib/i18n/locales";
import { PRIVACY_CONTENT } from "../../../lib/legal/legalContent";
import LegalDocumentBody from "../../components/LegalDocumentBody";
import { resolveLocale } from "../_lib";

const PAGE_COPY = {
  en: {
    title: "Privacy Policy | Code Destiny",
    description: "How Code Destiny collects, uses, retains, and protects personal information, including cookies and Google AdSense.",
    heading: "Privacy Policy",
    lede: "This document explains what personal information Code Destiny collects, why, for how long, and the rights you can exercise over it.",
    toc: "Table of Contents",
    tocAria: "Privacy Policy table of contents",
    related: "Related documents",
    terms: "Terms of Service",
    dateLabel: "Effective Date",
    translationNotice: "This page is a machine-assisted translation for reference. In case of any discrepancy, the Korean-language original at /privacy-policy governs.",
  },
  ja: {
    title: "プライバシーポリシー | Code Destiny",
    description: "Code Destinyが個人情報をどのように収集・利用・保管・保護するか、Cookie及びGoogle AdSenseの取り扱いを含めて説明します。",
    heading: "プライバシーポリシー",
    lede: "Code Destinyが処理する個人情報の項目、目的、保管期間、および利用者が行使できる権利を説明する文書です。",
    toc: "目次",
    tocAria: "プライバシーポリシー 目次",
    related: "関連文書",
    terms: "利用規約",
    dateLabel: "施行日",
    translationNotice: "本ページは参考用の機械補助翻訳です。内容に相違がある場合は、韓国語原文（/privacy-policy）が優先します。",
  },
  zh: {
    title: "隐私政策 | Code Destiny",
    description: "说明 Code Destiny 如何收集、使用、保存与保护个人信息，含 Cookie 与 Google AdSense 相关说明。",
    heading: "隐私政策",
    lede: "本文档说明 Code Destiny 处理哪些个人信息、出于何种目的、保存多久，以及用户可以行使的权利。",
    toc: "目录",
    tocAria: "隐私政策目录",
    related: "相关文档",
    terms: "服务条款",
    dateLabel: "生效日期",
    translationNotice: "本页面为参考用的机器辅助翻译。如与韩语原文（/privacy-policy）存在出入，以韩语原文为准。",
  },
  "zh-TW": {
    title: "隱私權政策 | Code Destiny",
    description: "說明 Code Destiny 如何蒐集、使用、保存與保護個人資料，含 Cookie 與 Google AdSense 相關說明。",
    heading: "隱私權政策",
    lede: "本文件說明 Code Destiny 處理哪些個人資料、基於何種目的、保存多久，以及使用者得行使之權利。",
    toc: "目錄",
    tocAria: "隱私權政策目錄",
    related: "相關文件",
    terms: "服務條款",
    dateLabel: "生效日期",
    translationNotice: "本頁面為參考用之機器輔助翻譯。如與韓語原文（/privacy-policy）有出入，以韓語原文為準。",
  },
};

export function generateStaticParams() {
  return PUBLIC_LOCALES.map((locale) => ({ locale: localeUrlSegment(locale) }));
}

export async function generateMetadata({ params }) {
  const locale = resolveLocale((await params).locale);
  const copy = PAGE_COPY[locale];
  return generatePageMetadata({
    path: `${LOCALE_CONFIG[locale].pathPrefix}/privacy-policy`,
    title: copy.title,
    description: copy.description,
    inLanguage: LOCALE_CONFIG[locale].htmlLang,
    hreflangPaths: {
      en: "/en/privacy-policy",
      ja: "/ja/privacy-policy",
      zh: "/zh/privacy-policy",
      "x-default": "/privacy-policy",
    },
  });
}

export default async function LocalePrivacyPolicyPage({ params }) {
  const locale = resolveLocale((await params).locale);
  const copy = PAGE_COPY[locale];
  const document = PRIVACY_CONTENT[locale];
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
            <Link className="policy-doc__toc-link" href={`${prefix}/terms-of-service`}>
              {copy.terms}
            </Link>
          </nav>
        </div>
      </div>
    </main>
  );
}
