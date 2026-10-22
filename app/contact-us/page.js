import { policyPageClass } from "../components/PolicyGuide";
import Link from "next/link";
import Image from "next/image";
import { MessageCircle, Mail, Clock3, ArrowUpRight, ShieldCheck, ListChecks, Building2, FilePenLine, CircleHelp } from "lucide-react";
import { generatePageMetadata } from "../../lib/generate-page-metadata";
import { BUSINESS_IDENTITY, SUPPORT_EMAIL, SUPPORT_MAILTO } from "../../lib/site-policy-config";
import ContactForm from "./ContactForm";
import styles from "./contact.module.css";

const SUPPORT_CHANNEL_URL = "https://ooel6.channel.io/home";

const CONTACT_US_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "Contact Us | 문의하기 — 꿀꿀 운세",
    replyMeta: "Contact Us · 보통 영업일 기준 1~3일 내 회신",
    replyTiming: "문의는 보통 영업일 기준 1~3일 내 회신합니다. 문의 내용과 확인 절차에 따라 더 걸릴 수 있습니다.",
    generalInquiry: " — 서비스 이용 방법, 오류 신고, 결과가 보이지 않는 문제를 접수합니다.",
    description: "꿀꿀운세 문의 페이지입니다. 채널톡, 이메일 및 문의 폼으로 서비스 관련 문의를 접수할 수 있습니다.",
    keywords: ["Contact Us", "문의하기", "고객지원", "꿀꿀운세 문의"],
  },
  en: {
    title: "Contact Us | 꿀꿀 운세",
    description: "Contact 꿀꿀운세 by email or inquiry form for service support.",
    keywords: ["Contact Us", "Support", "Customer Support", "꿀꿀운세 Contact"],
  },
  ja: {
    title: "お問い合わせ | 꿀꿀 운세",
    description: "꿀꿀운세へのサービス関連のお問い合わせを、メールまたはフォームで受け付けています。",
    keywords: ["お問い合わせ", "サポート", "カスタマーサポート", "꿀꿀운세 お問い合わせ"],
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
  const copy = CONTACT_US_PAGE_TEXT_TRANSLATIONS.ko;
  return (
    <main className={`policy-doc ${policyPageClass} ${styles.page}`}>
      <header className={styles.hero}>
        <div>
          <h1>무엇을 도와드릴까요?</h1>
          <p>서비스 이용부터 결과 확인까지,<br />궁금한 점을 편하게 남겨주세요.</p>
          <p className={styles.caption}>Contact Us · 꽃돼지가 길을 안내할게요.</p>
        </div>
        <Image src="/icons/app-logo-512.webp" alt="연꽃을 쓴 꿀꿀운세 꽃돼지" width={512} height={512} sizes="(max-width: 600px) 72px, 112px" className={styles.mascot} priority />
      </header>

      <div className="policy-doc__single">
        <div className="policy-doc__body">
          <div className="policy-embed-body">
            <div className={styles.channels}>
              <section className={styles.chat} id="support-chat" aria-labelledby="chat-heading">
                <MessageCircle className={styles.channelIcon} aria-hidden="true" />
                <h2 id="chat-heading">채널톡으로 이야기해요</h2>
                <p>문의와 답변을 한 대화에서 이어가세요.<br />운영시간 밖에도 문의를 남길 수 있어요.</p>
                <div className={styles.hours}><Clock3 aria-hidden="true" /><span><strong>평일 13:00–18:00</strong><small>한국 시간 · 주말 휴무</small></span></div>
                <a className={styles.primaryAction} href={SUPPORT_CHANNEL_URL} target="_blank" rel="noopener noreferrer">
                  채널톡으로 문의하기 <ArrowUpRight aria-hidden="true" /><span className={styles.srOnly}>(새 창)</span>
                </a>
                <p className={styles.caption}>운영시간 밖의 문의는 다음 운영시간에 순서대로 확인합니다.</p>
              </section>
              <section className={styles.email} id="support-contact" aria-labelledby="email-heading">
                <Mail className={styles.channelIcon} aria-hidden="true" />
                <h2 id="email-heading">이메일로 남길게요</h2>
                <p>긴 설명이나 관련 자료를 정리해서 보내고 싶을 때 이용해 주세요.</p>
                <a className={styles.emailAddress} href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}<ArrowUpRight aria-hidden="true" /></a>
                <p className={styles.caption}>{copy.replyTiming}</p>
                <a className={styles.secondaryAction} href="#contact-form">문의 내용 작성하기 <FilePenLine aria-hidden="true" /></a>
              </section>
            </div>
            <aside className={styles.prepare} aria-labelledby="prepare-heading">
              <ShieldCheck aria-hidden="true" />
              <div><h2 id="prepare-heading">이렇게 남겨주시면 확인이 쉬워요</h2><p>이용한 기능 이름과 발생 상황을 알려주세요. 결제 문의에는 주문번호를, 오류 문의에는 개인정보를 가린 화면을 함께 남겨주세요.</p><p className={styles.caption}>비밀번호·카드번호·주민등록번호는 보내지 마세요.</p></div>
            </aside>
            <nav className={styles.quickLinks} aria-label="문의 전 도움말">
              <Link href="/faq"><CircleHelp aria-hidden="true" />자주 묻는 질문<ArrowUpRight aria-hidden="true" /></Link>
              <Link href="/refund-policy">환불·취소 안내<ArrowUpRight aria-hidden="true" /></Link>
              <Link href="/privacy#user-rights">개인정보 요청<ArrowUpRight aria-hidden="true" /></Link>
            </nav>

            <section className="policy-embed-section">
              <h2 className={styles.sectionHeading}><ListChecks aria-hidden="true" />문의 유형과 처리 기한</h2>
              <p>
                아래 유형의 문의를 접수합니다. 제목에 유형을 함께 적어주시면 처리가 빨라집니다. Please include your request type in the subject line for faster handling.
              </p>
              <ul>
                <li>
                  <strong>일반 문의</strong>{copy.generalInquiry}
                </li>
                <li>
                  <strong>개인정보 요청</strong> — 열람, 정정, 삭제, 처리정지, 동의철회. 본인 확인 후 처리하며, 처리 결과를 회신 메일로 알려드립니다.
                </li>
                <li>
                  <strong>콘텐츠 정정 요청</strong> — 부정확한 설명, 과장 표현, 출처가 불명확한 내용. 확인 후 해당 문서를 수정하거나 보강하고, 수정 여부를 회신합니다. 제작·검수 기준은 <Link href="/editorial-policy">콘텐츠 제작 및 AI 활용 고지</Link>에 있습니다.
                </li>
                <li id="payment-help">
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
                이메일 문의의 회신은 보내주신 메일 주소로 드립니다. 영업일 기준 3일이 지나도 회신이 없으면 스팸함을 확인하신 뒤 다시 보내주세요.
              </p>
            </section>

            <section className="policy-embed-section">
              <h2 className={styles.sectionHeading}><Building2 aria-hidden="true" />운영자 정보 / Operator</h2>
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
              <h2 className={styles.sectionHeading}><ShieldCheck aria-hidden="true" />개인정보 요청 안내 / Privacy Request Guide</h2>
              <p>
                개인정보 관련 요청 시 본인 확인을 위해 최소한의 추가 정보를 요청할 수 있습니다. 법령상 보존 의무가 있는 데이터는 즉시 삭제가 제한될 수 있으며, 처리 결과를 회신 메일로 안내합니다. We will process valid requests as promptly as reasonably possible.
              </p>
              <p>
                계정 자체를 삭제하려면 <Link href="/account/delete">계정 삭제 안내</Link>를 확인해 주세요.
              </p>
            </section>
          </div>

          <section className="policy-panel policy-doc__form-panel" id="contact-form">
            <h2 className={styles.sectionHeading}><FilePenLine aria-hidden="true" />간단 문의 폼</h2>
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
