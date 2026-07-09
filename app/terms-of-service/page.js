import { generatePageMetadata } from "../../lib/generate-page-metadata";
import { OPERATOR_NAME, SUPPORT_EMAIL } from "../../lib/site-policy-config";

const TERMS_OF_SERVICE_METADATA_COPY = {
  ko: {
    title: "Terms of Service | 이용약관 — Code Destiny",
    description:
      "Code Destiny 이용약관 페이지입니다. 서비스 이용 규칙, 면책, 책임 제한, 환불 정책 및 분쟁 처리 원칙을 안내합니다.",
    keywords: ["Terms of Service", "이용약관", "서비스 책임 제한", "면책", "환불 정책"],
  },
  en: {
    title: "Terms of Service | Code Destiny",
    description:
      "Code Destiny's terms of service explain service rules, disclaimers, liability limits, refund policy, and dispute handling principles.",
    keywords: ["Terms of Service", "service rules", "liability limits", "disclaimer", "refund policy"],
  },
  ja: {
    title: "利用規約 | Code Destiny",
    description:
      "Code Destinyの利用規約です。サービス利用ルール、免責、責任制限、返金ポリシー、紛争処理の原則を案内します。",
    keywords: ["利用規約", "サービス利用ルール", "責任制限", "免責", "返金ポリシー"],
  },
  zh: {
    title: "服务条款 | Code Destiny",
    description:
      "Code Destiny 服务条款说明服务使用规则、免责声明、责任限制、退款政策与争议处理原则。",
    keywords: ["服务条款", "使用规则", "责任限制", "免责声明", "退款政策"],
  },
};

export function generateMetadata() {
  const copy = TERMS_OF_SERVICE_METADATA_COPY.ko;
  const metadata = generatePageMetadata({
    path: "/terms",
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
  });

  return {
    ...metadata,
    alternates: {
      ...(metadata.alternates || {}),
      canonical: "https://code-destiny.com/terms",
    },
  };
}

const sectionStyle = {
  background:
    "linear-gradient(145deg, rgba(12, 18, 48, 0.88), rgba(22, 11, 44, 0.76))",
  border: "1px solid rgba(167, 139, 250, 0.24)",
  borderRadius: "16px",
  padding: "18px",
  boxShadow: "0 14px 34px rgba(2, 6, 23, 0.4), inset 0 0 0 1px rgba(255,255,255,0.03)",
  backdropFilter: "blur(8px)",
};

export default function TermsOfServicePage() {
  return (
    <main
      style={{
        maxWidth: "920px",
        margin: "0 auto",
        padding: "28px 16px 42px",
        color: "#e2e8f0",
        background:
          "radial-gradient(640px 280px at 12% 2%, rgba(124,58,237,.2), transparent 60%), radial-gradient(520px 260px at 86% 8%, rgba(78,205,196,.16), transparent 64%)",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(1.8rem, 4vw, 2.2rem)",
          fontWeight: 800,
          marginBottom: "8px",
          lineHeight: 1.28,
          letterSpacing: "0.01em",
          color: "#f8fafc",
          textShadow: "0 0 18px rgba(244, 206, 120, 0.2)",
        }}
      >
        이용약관 (Terms of Service)
      </h1>
      <p style={{ opacity: 0.92, lineHeight: 1.82, marginBottom: "20px", color: "#dbe5ff", wordBreak: "keep-all" }}>
        시행일: 2026-04-11 / Effective Date: 2026-04-11
      </p>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>1. 약관의 목적 / Purpose</h2>
        <p style={{ lineHeight: 1.75 }}>
          본 약관은 Code Destiny가 제공하는 온라인 서비스의 이용 조건과 절차, 당사자 간 권리·의무 및 책임사항을 규정합니다.
          These terms govern access to and use of Code Destiny services, including rights, obligations, and liabilities.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>2. 적용 대상 및 동의 / Scope and Acceptance</h2>
        <p style={{ lineHeight: 1.75 }}>
          이용자가 서비스에 접속하거나 이용을 계속하는 경우 본 약관 및 관련 정책(개인정보처리방침 포함)에 동의한 것으로 봅니다.
          By accessing or using the service, you agree to these Terms and related policies.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>3. 서비스 내용 / Service Description</h2>
        <p style={{ lineHeight: 1.75 }}>
          Code Destiny는 사주/타로/운세 기반의 해석 콘텐츠를 제공하며, 서비스 품질 향상을 위해 기능이 추가/변경/중단될 수 있습니다.
          We may update features, modify content, or suspend parts of the service without prior notice when reasonably required.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          서비스 주소: https://code-destiny.com
          <br />
          운영자: {OPERATOR_NAME}
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>4. 쿠키 및 제3자 광고 / Cookies and Third-Party Ads</h2>
        <p style={{ lineHeight: 1.75 }}>
          서비스는 기능 제공, 이용 통계, 광고 제공을 위해 쿠키 및 유사 기술을 사용할 수 있습니다. Google AdSense를 포함한 제3자 광고 네트워크는
          사용자 관심사 기반 광고를 위해 쿠키를 사용할 수 있으며, 이용자는 브라우저 설정 또는 Google 광고 설정에서 이를 관리할 수 있습니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>5. 이용자 자격 및 책임 / Eligibility and User Responsibility</h2>
        <p style={{ lineHeight: 1.75 }}>
          이용자는 정확한 정보 입력 및 계정/기기 보안 관리 책임을 부담하며, 법령 위반, 권리 침해, 자동화된 비정상 접근, 서비스 방해
          행위를 해서는 안 됩니다. Users are responsible for lawful and fair use of the service.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>6. 금지행위 / Prohibited Conduct</h2>
        <p style={{ lineHeight: 1.75 }}>
          (1) 서비스 역설계, 크롤링, 무단 자동화 접근 (2) 악성코드 유포 및 보안 취약점 악용 (3) 타인의 개인정보 무단 수집/도용
          (4) 불법 콘텐츠 게시 (5) 운영을 방해하는 일체의 행위는 금지됩니다. We may block or suspend access for violations.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>7. 공정이용 및 비정상 이용 제한 / Fair Use and Restriction of Abnormal Use</h2>
        <p style={{ lineHeight: 1.75 }}>
          이용자는 유효한 이용권 계약기간 동안 아래에서 정하는 비정상 이용에 해당하지 않는 한 추가 요금 없이 이용권이 적용되는 서비스를 이용할 수 있습니다(이하 &quot;정액 무제한 이용&quot;).
          Pass holders may use covered services without additional charge for the pass validity period, unless their use qualifies as abnormal use under this section.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          비정상 이용이란 직전 30일간 이용자 1인의 서비스 이용 횟수가 같은 기간 전체 이용자 평균 이용 횟수의 10배 이상에 해당하면서, 동시에 다음 각 호 중 하나 이상의 사정이 객관적 자료로 확인되는 경우를 말합니다.
          단순히 이용 횟수가 많다는 사정만으로는 비정상 이용으로 판단하지 않습니다.
          (1) 매크로, 스크립트, 봇 등 자동화 수단을 이용한 서비스 호출이 로그로 확인되는 경우 (2) 사람의 직접 조작으로는 도달하기 어려운 균일하고 반복적인 시간 간격으로 요청이 지속되는 경우
          (3) 동일 계정으로 짧은 시간 내 다수의 IP 주소 또는 기기에서 반복 접속이 발생하는 경우 (4) 1인 이용자용 계정을 제3자와 공유·대여하여 다수인이 이용함으로써 제1호부터 제3호에 준하는 이상 트래픽이 발생하는 경우.
          Abnormal use means account activity at least 10 times the average per-user volume over the trailing 30 days, combined with objective evidence such as automation tools,
          bot-like request intervals, abnormal concurrent access from multiple IPs or devices, or account sharing — high volume alone is not sufficient.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          회사는 비정상 이용이 확인된 이용자에게 판단 근거와 시정 요청 사항을 이메일 또는 앱 내 알림으로 통지하고, 통지일로부터 7일 이상의 기간을 정하여 소명 기회를 부여합니다.
          소명이 없거나 소명 후에도 비정상 이용이 반복되는 경우, 회사는 계약을 즉시 해지하지 않고 먼저 해당 기능의 이용 속도 제한 등 최소한의 조치를 시행합니다.
          제한 조치 이후에도 비정상 이용이 반복·지속되어 정상적인 계약 목적 달성이 어려운 경우에 한하여, 7일 이상의 기간을 정한 시정 최고 후에도 시정되지 않으면 이용계약의 전부 또는 일부를 해지할 수 있습니다.
          Before any restriction, we notify the account holder of the basis for our determination and provide at least 7 days to respond.
          We apply rate-limiting or partial feature restriction before considering termination, and termination follows a further cure notice of at least 7 days.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          이용자는 경고, 제한 또는 해지 통지를 받은 날로부터 14일 이내에 고객센터를 통해 이의를 제기하고 소명자료를 제출할 수 있으며, 회사는 접수일로부터 5영업일 이내 검토 결과를 통지합니다.
          You may appeal any warning, restriction, or termination within 14 days of notice; we respond within 5 business days.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          이의제기 결과 정당한 사유 없는 제한으로 확인되는 경우, 회사는 지체 없이 제한을 해제하고 제한 기간에 상응하는 이용권 기간 연장 또는 아래 환불 및 청약철회 안내에 따른 부분·전액 환불 등으로 보상합니다.
          If a restriction is found unjustified, we promptly lift it and compensate the user via pass-period extension or refund under the Refund and Withdrawal section.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>8. 지식재산권 / Intellectual Property</h2>
        <p style={{ lineHeight: 1.75 }}>
          서비스와 관련된 텍스트, 디자인, 코드, 데이터 구성요소 등 일체의 권리는 Code Destiny 또는 정당한 권리자에게 귀속됩니다.
          You may not reproduce, distribute, or commercially exploit content without permission unless allowed by law.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>9. 서비스 성격 및 한계 / Nature and Limitations</h2>
        <p style={{ lineHeight: 1.75 }}>
          운세/타로 결과는 오락 및 참고 목적의 정보이며, 법률/의료/투자/세무 등 전문 자문을 대체하지 않습니다.
          Fortune interpretations are informational entertainment content and do not guarantee outcomes.
          특히 의료적 진단/치료 결과, 법률 분쟁 또는 형사 사건의 결과, 투자 수익 또는 손실 회피를 보장하지 않습니다.
          In particular, we do not guarantee medical outcomes, legal dispute or criminal case results, or investment returns.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>10. 면책 / Disclaimer</h2>
        <p style={{ lineHeight: 1.75 }}>
          회사는 천재지변, 통신장애, 플랫폼/브라우저 문제, 제3자 서비스 중단 등 불가항력 사유로 인한 손해에 대해 책임을 지지 않습니다.
          We do not warrant uninterrupted, error-free service at all times.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>11. 책임 제한 / Limitation of Liability</h2>
        <p style={{ lineHeight: 1.75 }}>
          관련 법령이 허용하는 최대 범위 내에서 회사의 책임은 제한되며, 간접손해/특별손해/결과적 손해에 대한 책임은 배제될 수 있습니다.
          Nothing in these Terms excludes liability that cannot be excluded under applicable law.
        </p>
      </section>

      <section id="refund-policy" style={{ ...sectionStyle, marginBottom: "14px", scrollMarginTop: "116px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>12. 환불 및 청약철회 안내 / Refund and Withdrawal Guide</h2>
        <p style={{ lineHeight: 1.75 }}>
          Code Destiny의 유료 결제 상품은 30일 이용권과 상품별 원화 단건 결제입니다.
          월정석은 이용권 또는 이벤트로 지급되는 보너스 혜택이며 별도 구매·충전 상품이 아니므로 현금 환불 대상 결제 상품으로 보지 않습니다.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          30일 이용권은 서버 결제 검증 성공 시각부터 30일 동안 유지되는 일회성 디지털 이용권입니다.
          자동결제 상품이 아니며 만료 후 사용자가 직접 다시 구매해야 합니다.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          이용권 또는 단건 결제 상품은 결제일 또는 계약내용을 받은 날부터 7일 이내 청약철회 요청이 가능합니다.
          다만 콘텐츠 생성, PDF 렌더링, 유료 리딩 열람, 이용권 혜택 사용 등 디지털콘텐츠 또는 유료 서비스 제공이 개시된 경우에는
          제공이 개시된 부분에 대한 청약철회가 제한될 수 있습니다.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          30일 이용권을 사용한 뒤 중도 해지를 요청하는 경우에는 이미 제공된 기간, 이용한 유료 기능, 지급·사용된 혜택을 확인한 뒤
          법령상 환급 대상이 되는 미제공 부분이 있을 때 결제수단으로 환급합니다.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          단건 결제 상품은 콘텐츠 생성 또는 결과 제공이 시작되기 전에는 취소·환불 요청이 가능합니다.
          생성이 시작되었거나 결과가 정상 제공된 뒤에는 디지털 콘텐츠 특성상 단순 변심 환불이 제한될 수 있습니다.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          표시·광고 내용과 다르거나 계약내용과 다르게 이행된 경우에는 공급받은 날부터 3개월 이내,
          그 사실을 안 날 또는 알 수 있었던 날부터 30일 이내 청약철회를 요청할 수 있습니다.
          시스템 오류, 중복 결제, 결과 미제공 건은 재생성, 미제공 부분 환급 또는 전액 환급 중 적절한 방식으로 처리합니다.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          환불 요청은 결제자 본인 확인 후 접수하며, 청약철회 또는 환급 대상임이 확인되면 관련 법령에 따라 3영업일 이내 결제 취소 또는 환급 절차를 진행합니다.
          실제 카드사·결제대행사 반영 시점은 결제수단별 정책에 따라 달라질 수 있습니다.
          환불 문의: {SUPPORT_EMAIL}
        </p>
        <p style={{ lineHeight: 1.75 }}>
          회사는 분쟁 예방과 법령 준수를 위해 확인 시각, 콘텐츠 식별 정보, 계정 식별자, 접속 기록 등 필요한 범위의 로그를 보관할 수 있습니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>13. 무료 체험 및 유료 이용권 이용 / Free Trial and Paid Pass Use</h2>
        <p style={{ lineHeight: 1.75 }}>
          무료 체험 기간 중이라도 멤버십 전용 콘텐츠를 열람하여 서비스 이용이 개시된 경우,
          이후 동일 콘텐츠 또는 유료 이용권에 대한 단순 변심 환불은 제한될 수 있습니다.
          If service use starts during the free trial, withdrawal for the same digital content or paid pass may be restricted.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          이용권 종류, 30일 이용 기간, 결제 금액, 만료일, 자동결제 여부와 환불 조건은 결제 화면에 고지되며,
          이용자는 결제 완료 전 이를 확인할 책임이 있습니다.
        </p>
        <p style={{ lineHeight: 1.75 }}>
          다만 강행규정에 따라 환불이 필요한 경우에는 관계 법령 및 결제대행사 정책에 따라 처리합니다.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>14. 약관 변경 / Changes to Terms</h2>
        <p style={{ lineHeight: 1.75 }}>
          약관이 변경될 경우 시행일과 주요 변경사항을 서비스 내 공지합니다. 변경 후 서비스를 계속 이용하면 개정 약관에 동의한 것으로 간주됩니다.
          Material changes will be announced with a reasonable prior notice period when required.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginBottom: "14px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>15. 준거법 및 관할 / Governing Law and Jurisdiction</h2>
        <p style={{ lineHeight: 1.75 }}>
          본 약관은 대한민국 법령을 준거법으로 하며, 관련 분쟁은 관련 법령에 따른 관할 법원에 제기합니다.
          These Terms are governed by the laws of the Republic of Korea.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>16. 문의 / Contact</h2>
        <p style={{ lineHeight: 1.75 }}>
          서비스명: Code Destiny
          <br />
          사이트: https://code-destiny.com
          <br />
          운영자: {OPERATOR_NAME}
          <br />
          약관 문의: {SUPPORT_EMAIL}
          <br />
          Terms inquiries: {SUPPORT_EMAIL}
        </p>
      </section>
    </main>
  );
}
