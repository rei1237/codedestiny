import { LEGAL_REVIEW_STATUS } from "../market-policy-registry.js";

export const LEGAL_DOCUMENT_TYPES = Object.freeze([
  "TERMS",
  "PAID_SERVICE_TERMS",
  "PRIVACY_POLICY",
  "REFUND_POLICY",
  "DIGITAL_CONTENT_NOTICE",
  "PAYMENT_TAX_NOTICE",
  "MINOR_NOTICE",
  "FORTUNE_AI_DISCLAIMER",
  "MARKETING_CONSENT",
  "INTERNATIONAL_TRANSFER_NOTICE",
]);

export const LEGAL_MARKET_PACKS_RESEARCHED_AT = "2026-08-06";

export const LEGAL_MARKET_PACKS = Object.freeze([
  pack("KR", "ko", "KR-DIGITAL-2026-08-DRAFT", [
    "https://www.law.go.kr/LSW/lsInfoP.do?ancNo=21312&ancYd=20260120&efYd=20260721&lsiSeq=282793",
    "https://www.law.go.kr/admRulLsInfoP.do?admRulSeq=2100000216089",
    "https://www.law.go.kr/LSW/admRulInfoP.do?admRulSeq=2100000237546&chrClsCd=010201&joNo=000600",
  ]),
  // 아래 4개는 별도 관할이 아니라 "KR 관할 약관의 언어 버전"이다 — 준거법은 여전히 대한민국이며
  // (lib/legal/legalContent.ts 상단 주석 참고), 실제 문서는 app/[locale]/terms-of-service 등에
  // 2026-08-11 배포됨. translationReviewStatus만 MACHINE_TRANSLATED로 올리고 legalReviewStatus는
  // 그대로 둔다 — 원어민·법률 검토가 아직 없으므로 승인 상태로 바꾸지 않는다.
  pack("KR", "en", "KR-DIGITAL-2026-08-DRAFT", [
    "https://www.law.go.kr/LSW/lsInfoP.do?ancNo=21312&ancYd=20260120&efYd=20260721&lsiSeq=282793",
  ], { translationReviewStatus: LEGAL_REVIEW_STATUS.MACHINE_TRANSLATED }),
  pack("KR", "ja", "KR-DIGITAL-2026-08-DRAFT", [
    "https://www.law.go.kr/LSW/lsInfoP.do?ancNo=21312&ancYd=20260120&efYd=20260721&lsiSeq=282793",
  ], { translationReviewStatus: LEGAL_REVIEW_STATUS.MACHINE_TRANSLATED }),
  pack("KR", "zh-CN", "KR-DIGITAL-2026-08-DRAFT", [
    "https://www.law.go.kr/LSW/lsInfoP.do?ancNo=21312&ancYd=20260120&efYd=20260721&lsiSeq=282793",
  ], { translationReviewStatus: LEGAL_REVIEW_STATUS.MACHINE_TRANSLATED }),
  pack("KR", "zh-TW", "KR-DIGITAL-2026-08-DRAFT", [
    "https://www.law.go.kr/LSW/lsInfoP.do?ancNo=21312&ancYd=20260120&efYd=20260721&lsiSeq=282793",
  ], { translationReviewStatus: LEGAL_REVIEW_STATUS.MACHINE_TRANSLATED }),
  pack("JP", "ja", "JP-DRAFT-2026-08-LEGAL", [
    "https://www.no-trouble.caa.go.jp/foreignlanguage/english/",
    "https://www.no-trouble.caa.go.jp/foreignlanguage/english/continuousservices/",
    "https://www.japaneselawtranslation.go.jp/en/laws/view/4241/en",
  ]),
  pack("US", "en", "US-DRAFT-2026-08-LEGAL", [
    "https://www.ftc.gov/legal-library/browse/rules/negative-option-rule",
    "https://consumer.ftc.gov/articles/getting-and-out-free-trials-auto-renewals-and-negative-option-subscriptions",
    "https://www.oag.ca.gov/news/press-releases/attorney-general-bonta-issues-consumer-alert-california%E2%80%99s-automatic-renewal-law",
    "https://www.oag.ca.gov/privacy/ccpa",
  ]),
  pack("EU", "en", "EU-DRAFT-2026-08-LEGAL", [
    "https://commission.europa.eu/law/law-topic/consumer-protection-law/consumer-contract-law/consumer-rights-directive_en",
    "https://taxation-customs.ec.europa.eu/taxation/vat/vat-directive/place-taxation_en",
    "https://vat-one-stop-shop.ec.europa.eu/one-stop-shop/register-oss_en",
    "https://www.edpb.europa.eu/documents/guideline/guidelines-052021-on-the-interplay-between-application-article-3-and_en",
  ]),
  pack("GB", "en", "GB-DRAFT-2026-08-LEGAL", [
    "https://www.legislation.gov.uk/uksi/2013/3134/contents",
    "https://www.legislation.gov.uk/ukpga/2024/13/notes/division/9/index.htm",
  ]),
  pack("CA", "en", "CA-DRAFT-2026-08-LEGAL", [
    "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/digital-economy.html",
    "https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/notice322/recovery-gst-hst-under-digital-economy-measures.html",
    "https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/",
  ]),
  pack("AU", "en", "AU-DRAFT-2026-08-LEGAL", [
    "https://softwaredevelopers.ato.gov.au/GSTintangibles",
    "https://www.oaic.gov.au/privacy/australian-privacy-principles/read-the-australian-privacy-principles",
    "https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-8-app-8-cross-border-disclosure-of-personal-information",
    "https://www.legislation.gov.au/C2004A00109/latest/text",
  ]),
  pack("NZ", "en", "NZ-DRAFT-2026-08-LEGAL", [
    "https://www.privacy.org.nz/privacy-principles/",
    "https://www.privacy.org.nz/privacy-principles/12/",
    "https://www.ird.govt.nz/special-supplies",
    "https://www.consumerprotection.govt.nz/general-help/ways-to-buy-and-pay/direct-debits-and-automatic-payments",
  ]),
  pack("SG", "en", "SG-DRAFT-2026-08-LEGAL", [
    "https://www.iras.gov.sg/taxes/goods-services-tax-%28gst%29/consumers/purchasing-remote-services-from-overseas-service-providers",
    "https://www.iras.gov.sg/taxes/goods-services-tax-%28gst%29/gst-and-digital-economy/overseas-businesses",
    "https://www.pdpc.gov.sg/overview-of-pdpa/the-legislation/personal-data-protection-act/data-protection-obligations",
  ]),
  pack("TW", "zh-TW", "TW-DRAFT-2026-08-LEGAL", [
    "https://law-out.mof.gov.tw/EngLawContent.aspx?id=20733&lan=E",
    "https://www.mof.gov.tw/eng/singlehtml/f48d641f159a4866b1d31c0916fbcc71?cntId=296b3868284a4d26a0cb74c04aab8d29",
    "https://law-out.mof.gov.tw/LawContent.aspx?id=GL010236&kw=%E5%A2%83%E5%A4%96%E9%9B%BB%E5%95%86",
  ]),
  pack("HK", "zh-TW", "HK-DRAFT-2026-08-LEGAL", [
    "https://www.pcpd.org.hk/english/resources_centre/publications/guidance/fact1_intro_1.html",
    "https://www.pcpd.org.hk/english/news_events/media_enquiry/enquiry_20200415.html",
    "https://www.pcpd.org.hk/english/news_events/media_statements/press_20220512.html",
    "https://www.elegislation.gov.hk/hk/cap362",
  ]),
  pack("CN", "zh-CN", "CN-DRAFT-2026-08-LEGAL", [
    "https://english.www.gov.cn/news/202510/18/content_WS68f33d41c6d00ca5f9a06e13.html",
    "https://english.www.gov.cn/policies/latestreleases/202403/19/content_WS65f974b2c6d0868f4e8e53d1.html",
    "https://www.chinatax.gov.cn/eng/c101269/c5246628/content.html",
    "https://www.chinatax.gov.cn/chinatax/c102449/c5239191/content.html",
  ]),
]);

function pack(marketCode, languageLocale, version, sourceUrls, overrides = {}) {
  return Object.freeze({
    marketCode,
    jurisdiction: marketCode,
    languageLocale,
    version,
    effectiveDate: null,
    researchedAt: LEGAL_MARKET_PACKS_RESEARCHED_AT,
    reviewedAt: null,
    reviewer: null,
    legalReviewStatus: LEGAL_REVIEW_STATUS.LEGAL_REVIEW_REQUIRED,
    translationReviewStatus: LEGAL_REVIEW_STATUS.LEGAL_REVIEW_REQUIRED,
    supersededBy: null,
    requiresReconsent: true,
    contentHash: null,
    sourceLawVersion: "official-source-research-required-before-publication",
    sourceUrls,
    documentTypes: LEGAL_DOCUMENT_TYPES,
    publicationAllowed: false,
    livePaymentAllowed: false,
    ...overrides,
  });
}

export function getLegalMarketPack(marketCode, languageLocale) {
  const market = String(marketCode || "").trim().toUpperCase();
  const locale = String(languageLocale || "").trim();
  return LEGAL_MARKET_PACKS.find((pack) => pack.marketCode === market && pack.languageLocale === locale) || null;
}
