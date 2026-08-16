import AdminTrigger from "./AdminTrigger";
import styles from "./LegalUi.module.css";

const FOOTER_LEGAL_TEXT_TRANSLATIONS = {
  ko: {
    highlight: "⚠️ 면책 조항 (Disclaimer)",
    body1Prefix: "Code Destiny의 모든 사주·타로·운세·자미두수·베다 점성술·풍수 콘텐츠는",
    purpose: " 오락 및 자기 성찰 목적",
    body1Suffix: "으로만 제공됩니다. 제공되는 정보는 확정된 미래 예언이 아니며, 결과의 정확성을 보장하지 않습니다.",
    body2: "의료·법률·투자·정신건강 등 중요한 사항에 대한 결정은 반드시 해당 분야의 전문가와 상담하시기 바랍니다. 본 서비스의 콘텐츠를 근거로 내린 결정에 대한 책임은 이용자 본인에게 있습니다.",
    privacy: "개인정보처리방침",
    terms: "이용약관",
    contact: "문의하기",
    disclaimer: "면책 고지",
    advertising: "광고 운영정책",
  },
  en: {
    highlight: "⚠️ Disclaimer",
    body1Prefix: "All Code Destiny Saju, tarot, fortune, Zi Wei Dou Shu, Vedic astrology, and feng shui content is provided only for",
    purpose: " entertainment and self-reflection",
    body1Suffix: ". The information is not a confirmed prediction of the future, and accuracy is not guaranteed.",
    body2: "For important matters such as medical, legal, investment, or mental-health decisions, please consult a qualified professional in the relevant field. Users are responsible for decisions made based on this service's content.",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    contact: "Contact",
    disclaimer: "Disclaimer",
    advertising: "Advertising Policy",
  },
  ja: {
    highlight: "⚠️ 免責事項",
    body1Prefix: "Code Destinyの四柱推命、タロット、運勢、紫微斗数、ヴェーダ占星術、風水コンテンツは",
    purpose: " 娯楽および自己省察目的",
    body1Suffix: "でのみ提供されます。提供情報は確定した未来予言ではなく、結果の正確性を保証するものではありません。",
    body2: "医療、法律、投資、メンタルヘルスなど重要事項の決定は、必ず該当分野の専門家にご相談ください。本サービスのコンテンツに基づく決定の責任は利用者本人にあります。",
    privacy: "プライバシーポリシー",
    terms: "利用規約",
    contact: "お問い合わせ",
    disclaimer: "免責事項",
    advertising: "広告運営ポリシー",
  },
  zh: {
    highlight: "⚠️ 免责声明",
    body1Prefix: "Code Destiny 的所有四柱、塔罗、运势、紫微斗数、吠陀占星与风水内容仅用于",
    purpose: " 娱乐与自我觉察",
    body1Suffix: "。所提供信息并非确定的未来预言，也不保证结果准确性。",
    body2: "涉及医疗、法律、投资、心理健康等重要事项的决定，请务必咨询相关领域专业人士。基于本服务内容作出的决定，其责任由用户本人承担。",
    privacy: "隐私政策",
    terms: "服务条款",
    contact: "联系我们",
    disclaimer: "免责声明",
    advertising: "广告运营政策",
  },
};

function footerLegalText(key) {
  return FOOTER_LEGAL_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}

/**
 * FooterLegal — 푸터 법적 고지 HTML 스니펫
 * 저장 경로: app/components/FooterLegal.jsx
 *
 * 사용법:
 *   import FooterLegal from "@/app/components/FooterLegal";
 *   <FooterLegal />
 */

export default function FooterLegal() {
  return (
    <div className={styles.footerLegal}>
      <p className={styles.legalHighlight}>
        {footerLegalText("highlight")}
      </p>
      <p>
        {footerLegalText("body1Prefix")}
        <strong>{footerLegalText("purpose")}</strong>{footerLegalText("body1Suffix")}
      </p>
      <p>
        {footerLegalText("body2")}
      </p>
      <p>
        © 2026 Code Destiny. All rights reserved. <AdminTrigger /> &nbsp;·&nbsp;
        <a href="/privacy/">{footerLegalText("privacy")}</a>
        &nbsp;·&nbsp;
        <a href="/terms/">{footerLegalText("terms")}</a>
        &nbsp;·&nbsp;
        <a href="/contact/">{footerLegalText("contact")}</a>
        &nbsp;·&nbsp;
        <a href="/disclaimer/">{footerLegalText("disclaimer")}</a>
        &nbsp;·&nbsp;
        <a href="/advertising-policy/">{footerLegalText("advertising")}</a>
      </p>
    </div>
  );
}
