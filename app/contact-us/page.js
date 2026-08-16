import Link from "next/link";
import { generatePageMetadata } from "../../lib/generate-page-metadata";
import { BUSINESS_IDENTITY, SUPPORT_EMAIL, SUPPORT_MAILTO } from "../../lib/site-policy-config";
import ContactForm from "./ContactForm";

const CONTACT_US_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "Contact Us | 문의하기 — Code Destiny",
    description: "Code Destiny 문의 페이지입니다. 이메일 및 문의 폼으로 서비스 관련 문의를 접수할 수 있습니다.",
    keywords: ["Contact Us", "문의하기", "고객지원", "Code Destiny 문의"],
  },
  en: {
    title: "Contact Us | Code Destiny",
    description: "Contact Code Destiny by email or inquiry form for service support.",
    keywords: ["Contact Us", "Support", "Customer Support", "Code Destiny Contact"],
  },
  ja: {
    title: "お問い合わせ | Code Destiny",
    description: "Code Destinyへのサービス関連のお問い合わせを、メールまたはフォームで受け付けています。",
    keywords: ["お問い合わせ", "サポート", "カスタマーサポート", "Code Destiny お問い合わせ"],
  },
};

export function generateMetadata() {
  const copy = CONTACT_US_PAGE_TEXT_TRANSLATIONS.ko;
  const metadata = generatePageMetadata({
    path: "/contact",
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
  });

  return {
    ...metadata,
    alternates: {
      ...(metadata.alternates || {}),
      canonical: "https://code-destiny.com/contact",
    },
  };
}

export default function ContactUsPage() {
  return (
    <main className="policy-doc">
      <header className="policy-doc__head">
        <h1 className="policy-doc__title">문의하기</h1>
        <p className="policy-doc__meta">Contact Us · 영업일 기준 1~3일 내 회신</p>
        <p className="policy-doc__lede">
          서비스 이용 문의와 오류 신고, 개인정보 권리행사 요청, 제휴 문의를 받습니다. 아래 폼으로 메일 앱을 열거나 운영 이메일로 직접 보내주세요.
        </p>
      </header>

      <div className="policy-doc__single">
        <div className="policy-doc__body">
          <div className="policy-embed-body">
            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">이메일 문의</h2>
              <p>
                운영 이메일: <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>
                <br />
                평균 회신 시간: 영업일 기준 1~3일 / Typical response time: 1-3 business days.
              </p>
            </section>

            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">문의 유형과 처리 기한</h2>
              <p>
                아래 유형의 문의를 접수합니다. 제목에 유형을 함께 적어주시면 처리가 빨라집니다. Please include your request type in the subject line for faster handling.
              </p>
              <ul>
                <li>
                  <strong>일반 문의</strong> — 서비스 이용 방법, 오류 신고, 결과가 보이지 않는 문제. 영업일 기준 1~3일 내 회신합니다.
                </li>
                <li>
                  <strong>개인정보 요청</strong> — 열람, 정정, 삭제, 처리정지, 동의철회. 본인 확인 후 처리하며, 처리 결과를 회신 메일로 알려드립니다.
                </li>
                <li>
                  <strong>콘텐츠 정정 요청</strong> — 부정확한 설명, 과장 표현, 출처가 불명확한 내용. 확인 후 해당 문서를 수정하거나 보강하고, 수정 여부를 회신합니다. 제작·검수 기준은 <Link href="/editorial-policy">콘텐츠 제작 및 AI 활용 고지</Link>에 있습니다.
                </li>
                <li>
                  <strong>결제·환불 문의</strong> — 중복 결제, 결과 미제공, 청약철회. 환불 기준은 <Link href="/terms#refund-policy">이용약관의 환불 및 청약철회</Link>를 따릅니다.
                </li>
                <li>
                  <strong>권리침해 신고</strong> — 저작권, 초상권, 명예훼손. 침해 사실을 특정할 수 있는 URL 과 근거를 함께 보내주세요.
                </li>
                <li>
                  <strong>제휴 및 비즈니스 문의</strong> — 콘텐츠 제휴, 광고, 기타 협업.
                </li>
              </ul>
              <p>
                회신은 보내주신 메일 주소로만 드립니다. 영업일 기준 3일이 지나도 회신이 없으면 스팸함을 확인하신 뒤 다시 보내주세요.
              </p>
            </section>

            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">운영자 정보 / Operator</h2>
              <p>
                이 사이트를 운영하는 사업자 정보입니다. 전자상거래 등에서의 소비자보호에 관한 법률에 따라 표기합니다.
              </p>
              <ul>
                <li>상호명: {BUSINESS_IDENTITY.companyName}</li>
                <li>대표자: {BUSINESS_IDENTITY.representative}</li>
                <li>사업자등록번호: {BUSINESS_IDENTITY.registrationNumber}</li>
                <li>통신판매업 신고번호: {BUSINESS_IDENTITY.mailOrderNumber}</li>
                <li>사업장 주소: {BUSINESS_IDENTITY.address}</li>
                <li>
                  전화: <a href={`tel:${BUSINESS_IDENTITY.phone.replace(/[^0-9]/g, "")}`}>{BUSINESS_IDENTITY.phone}</a>
                </li>
                <li>
                  이메일: <a href={SUPPORT_MAILTO}>{BUSINESS_IDENTITY.email}</a>
                </li>
              </ul>
            </section>

            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">개인정보 요청 안내 / Privacy Request Guide</h2>
              <p>
                개인정보 관련 요청 시 본인 확인을 위해 최소한의 추가 정보를 요청할 수 있습니다. 법령상 보존 의무가 있는 데이터는 즉시 삭제가 제한될 수 있으며, 처리 결과를 회신 메일로 안내합니다. We will process valid requests as promptly as reasonably possible.
              </p>
              <p>
                계정 자체를 삭제하려면 <Link href="/account/delete">계정 삭제 안내</Link>를 확인해 주세요.
              </p>
            </section>
          </div>

          <section className="policy-panel policy-doc__form-panel">
            <h2 className="policy-panel__title">간단 문의 폼</h2>
            <p className="policy-doc__note policy-doc__note--lead">
              민감정보, 비밀번호, 결제정보 등 불필요한 개인정보는 입력하지 마세요. Please avoid sharing unnecessary sensitive data.
            </p>
            <ContactForm supportEmail={SUPPORT_EMAIL} />
          </section>

          <nav className="policy-doc__related" aria-label="관련 문서">
            <Link className="policy-doc__toc-link" href="/privacy">
              개인정보처리방침
            </Link>
            <Link className="policy-doc__toc-link" href="/terms">
              이용약관
            </Link>
            <Link className="policy-doc__toc-link" href="/account/delete">
              계정 삭제 안내
            </Link>
          </nav>
        </div>
      </div>
    </main>
  );
}
