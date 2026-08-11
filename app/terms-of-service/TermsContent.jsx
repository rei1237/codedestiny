/**
 * 이용약관 정본 (시행일 2026-04-11)
 * — 이 파일이 약관 본문의 유일한 원본이다.
 *   독립 페이지(/terms, /terms-of-service)와 회원가입 동의 화면(app/signup/SignupClient.tsx)이
 *   모두 이 컴포넌트를 렌더하므로, 동의한 문서와 공개된 문서가 항상 일치한다.
 * — 12조는 과거 분기됐던 두 판(공개판/가입동의판)의 합집합이다. 어느 쪽에만 있던 조항도
 *   버리지 않았다: 공급시기·중복결제(구 가입동의판) + 7일 청약철회·표시광고 상이·환급기한·로그보관(구 공개판).
 * — TERMS_SECTIONS는 목차(policy-doc__toc)와 본문이 공유한다. 여기만 고치면 둘 다 따라온다.
 */
import { OPERATOR_NAME, SUPPORT_EMAIL } from "../../lib/site-policy-config";

export const TERMS_EFFECTIVE_DATE = "2026-04-11";

export const TERMS_SECTIONS = [
  {
    id: "purpose",
    heading: "1. 약관의 목적 / Purpose",
    body: (
      <p>
        본 약관은 Code Destiny가 제공하는 온라인 서비스의 이용 조건과 절차, 당사자 간 권리·의무 및 책임사항을 규정합니다. These terms govern access to and use of Code Destiny services, including rights, obligations, and liabilities.
      </p>
    ),
  },
  {
    id: "scope",
    heading: "2. 적용 대상 및 동의 / Scope and Acceptance",
    body: (
      <p>
        이용자가 서비스에 접속하거나 이용을 계속하는 경우 본 약관 및 관련 정책(개인정보처리방침 포함)에 동의한 것으로 봅니다. By accessing or using the service, you agree to these Terms and related policies.
      </p>
    ),
  },
  {
    id: "service",
    heading: "3. 서비스 내용 / Service Description",
    body: (
      <>
        <p>
          Code Destiny는 사주/타로/운세 기반의 해석 콘텐츠를 제공하며, 서비스 품질 향상을 위해 기능이 추가/변경/중단될 수 있습니다. We may update features, modify content, or suspend parts of the service without prior notice when reasonably required.
        </p>
        <p>
          서비스 주소: https://code-destiny.com
          <br />
          운영자: {OPERATOR_NAME}
        </p>
      </>
    ),
  },
  {
    id: "cookies-and-ads",
    heading: "4. 쿠키 및 제3자 광고 / Cookies and Third-Party Ads",
    body: (
      <p>
        서비스는 기능 제공, 이용 통계, 광고 제공을 위해 쿠키 및 유사 기술을 사용할 수 있습니다. Google AdSense를 포함한 제3자 광고 네트워크는 사용자 관심사 기반 광고를 위해 쿠키를 사용할 수 있으며, 이용자는 브라우저 설정 또는 Google 광고 설정에서 이를 관리할 수 있습니다.
      </p>
    ),
  },
  {
    id: "eligibility",
    heading: "5. 이용자 자격 및 책임 / Eligibility and User Responsibility",
    body: (
      <p>
        대한민국 관련 법령에 따라 만 14세 미만은 회원가입 및 본 서비스를 이용할 수 없으며, 이용자는 정확한 정보 입력 및 계정/기기 보안 관리 책임을 부담합니다. 법령 위반, 권리 침해, 자동화된 비정상 접근, 서비스 방해 행위를 해서는 안 됩니다. Users under 14 years of age are not permitted to register or use the service.
      </p>
    ),
  },
  {
    id: "prohibited",
    heading: "6. 금지행위 / Prohibited Conduct",
    body: (
      <p>
        (1) 서비스 역설계, 크롤링, 무단 자동화 접근 (2) 악성코드 유포 및 보안 취약점 악용 (3) 타인의 개인정보 무단 수집/도용 (4) 불법 콘텐츠 게시 (5) 운영을 방해하는 일체의 행위는 금지됩니다. We may block or suspend access for violations.
      </p>
    ),
  },
  {
    id: "fair-use",
    heading: "7. 공정이용 및 비정상 이용 제한 / Fair Use and Restriction of Abnormal Use",
    body: (
      <>
        <p>
          이용자는 유효한 이용권 계약기간 동안 아래에서 정하는 비정상 이용에 해당하지 않는 한 추가 요금 없이 <strong>해당 등급이 커버하는 금액 이하의 기능</strong>을 <strong>등급별 30일 누적 이용 한도 이내에서</strong> 횟수 제한 없이 이용할 수 있습니다(이하 &quot;정액 이용&quot;). 등급별 커버 금액과 30일 누적 한도(스탠다드 30,000원 · 프리미엄 100,000원 · VVIP 200,000원 · Code Destiny Family 500,000원)는 결제 화면에 표시됩니다. 누적 한도에 도달한 이후에는 남은 이용권 기간 동안 단건 결제 또는 월정석으로 계속 이용할 수 있으며, 서비스 이용이 차단되지 않습니다. Pass holders may use features priced at or below their tier&apos;s coverage amount without additional charge and without a per-use count limit, subject to each tier&apos;s 30-day cumulative usage cap (Standard KRW 30,000 · Premium KRW 100,000 · VVIP KRW 200,000 · Code Destiny Family KRW 500,000), shown on the payment screen. Once the cap is reached, the remaining pass period stays available via single payment or Moonlight Stones — access is never blocked.
        </p>
        <p>
          다만 <strong>Code Destiny Family 이용권은 1회 30,000원 이상인 전문가 상담 상품을 이용권 1기간(30일)당 10회까지, VVIP 꿀단지 이용권은 같은 조건의 상담을 30일당 3회까지</strong> 포함하며, 이를 초과하는 이용분은 단건 결제 또는 월정석으로 이용할 수 있습니다. 30,000원 미만 기능은 위 30일 누적 한도 이내에서 횟수 제한 없이 포함됩니다. 포함 횟수와 30일 누적 한도는 이용권을 새로 구매하면 다시 시작하고, 남은 횟수·한도는 결제 화면에서 확인할 수 있습니다. 포함 횟수 또는 누적 한도를 모두 사용해도 서비스 이용이 차단되지 않으며, 초과분에 대한 결제수단이 안내됩니다. <strong>이 포함 횟수와 누적 한도는 이 조에서 정하는 &quot;비정상 이용&quot;과 무관한 상품 구성이며, 모두 사용한 사실만으로는 어떠한 제재도 이루어지지 않습니다.</strong> The Code Destiny Family pass includes expert consultation products priced at KRW 30,000 or more up to 10 uses per 30-day pass period, and the VVIP Honey Jar pass includes the same up to 3 uses per 30 days; usage beyond that remains available via single payment or Moonlight Stones. Features under KRW 30,000 are included without a per-use count limit, subject to the 30-day cumulative cap above. Both the included-use count and the cumulative cap reset when a new pass is purchased, and remaining amounts are shown on the payment screen. This allowance is a product term, not a sanction, and exhausting it never blocks access.
        </p>
        <p>
          이용권은 <strong>계약자 1인이 사용하는 것을 전제로 제공되며, 제3자에게 양도·대여하거나 계정을 공유할 수 없습니다.</strong> 이는 정액 이용의 전제 조건이며, 이를 위반한 이용은 아래 비정상 이용 판단에서 함께 고려됩니다. A pass is provided for use by the contracting individual only and may not be transferred, lent, or shared.
        </p>
        <p>
          회사는 서비스 안정성과 자동화 남용 방지를 위해 <strong>모든 이용자에게 동일하게 적용되는 상시 기술 조치</strong>를 운영합니다. 여기에는 단위 시간당 요청 수 제한, 동일 요청의 중복 실행 방지, 생성 작업의 동시 실행 제한이 포함됩니다. 이는 특정 이용자를 겨냥한 제재가 아니라 서비스 운영 파라미터이므로 아래의 사전 통지·소명 절차 대상이 아니며, 정상적인 사람의 이용 속도에서는 도달하지 않는 수준으로 설정합니다. 일시적으로 이에 도달한 경우 이용이 차단되는 것이 아니라 잠시 후 다시 시도할 수 있다는 안내가 표시됩니다. We operate uniform, always-on technical safeguards — per-interval request limits, duplicate-execution prevention, and concurrency limits on generation jobs. These are operating parameters applied equally to all users, not user-specific sanctions, and therefore fall outside the notice-and-cure process below.
        </p>
        <p>
          비정상 이용이란 직전 30일간 이용자 1인의 서비스 이용 횟수가 같은 기간 전체 이용자 평균 이용 횟수의 10배 이상에 해당하면서, 동시에 다음 각 호 중 하나 이상의 사정이 객관적 자료로 확인되는 경우를 말합니다. 단순히 이용 횟수가 많다는 사정만으로는 비정상 이용으로 판단하지 않습니다. (1) 매크로, 스크립트, 봇 등 자동화 수단을 이용한 서비스 호출이 로그로 확인되는 경우 (2) 사람의 직접 조작으로는 도달하기 어려운 균일하고 반복적인 시간 간격으로 요청이 지속되는 경우 (3) 동일 계정으로 짧은 시간 내 다수의 IP 주소 또는 기기에서 반복 접속이 발생하는 경우 (4) 1인 이용자용 계정을 제3자와 공유·대여하여 다수인이 이용함으로써 제1호부터 제3호에 준하는 이상 트래픽이 발생하는 경우. Abnormal use means account activity at least 10 times the average per-user volume over the trailing 30 days, combined with objective evidence such as automation tools, bot-like request intervals, abnormal concurrent access from multiple IPs or devices, or account sharing — high volume alone is not sufficient.
        </p>
        <p>
          회사는 비정상 이용이 확인된 이용자에게 판단 근거와 시정 요청 사항을 이메일 또는 앱 내 알림으로 통지하고, 통지일로부터 7일 이상의 기간을 정하여 소명 기회를 부여합니다. 소명이 없거나 소명 후에도 비정상 이용이 반복되는 경우, 회사는 계약을 즉시 해지하지 않고 먼저 해당 기능의 이용 속도 제한 등 최소한의 조치를 시행합니다. 제한 조치 이후에도 비정상 이용이 반복·지속되어 정상적인 계약 목적 달성이 어려운 경우에 한하여, 7일 이상의 기간을 정한 시정 최고 후에도 시정되지 않으면 이용계약의 전부 또는 일부를 해지할 수 있습니다. Before any restriction, we notify the account holder of the basis for our determination and provide at least 7 days to respond. We apply rate-limiting or partial feature restriction before considering termination, and termination follows a further cure notice of at least 7 days.
        </p>
        <p>
          이용자는 경고, 제한 또는 해지 통지를 받은 날로부터 14일 이내에 고객센터를 통해 이의를 제기하고 소명자료를 제출할 수 있으며, 회사는 접수일로부터 5영업일 이내 검토 결과를 통지합니다. You may appeal any warning, restriction, or termination within 14 days of notice; we respond within 5 business days.
        </p>
        <p>
          이의제기 결과 정당한 사유 없는 제한으로 확인되는 경우, 회사는 지체 없이 제한을 해제하고 제한 기간에 상응하는 이용권 기간 연장 또는 아래 환불 및 청약철회 안내에 따른 부분·전액 환불 등으로 보상합니다. If a restriction is found unjustified, we promptly lift it and compensate the user via pass-period extension or refund under the Refund and Withdrawal section.
        </p>
      </>
    ),
  },
  {
    id: "intellectual-property",
    heading: "8. 지식재산권 / Intellectual Property",
    body: (
      <p>
        서비스와 관련된 텍스트, 디자인, 코드, 데이터 구성요소 등 일체의 권리는 Code Destiny 또는 정당한 권리자에게 귀속됩니다. You may not reproduce, distribute, or commercially exploit content without permission unless allowed by law.
      </p>
    ),
  },
  {
    id: "limitations",
    heading: "9. 서비스 성격 및 한계 / Nature and Limitations",
    body: (
      <p>
        운세/타로 결과는 오락 및 참고 목적의 정보이며, 법률/의료/투자/세무 등 전문 자문을 대체하지 않습니다. Fortune interpretations are informational entertainment content and do not guarantee outcomes. 특히 의료적 진단/치료 결과, 법률 분쟁 또는 형사 사건의 결과, 투자 수익 또는 손실 회피를 보장하지 않습니다. In particular, we do not guarantee medical outcomes, legal dispute or criminal case results, or investment returns.
      </p>
    ),
  },
  {
    id: "disclaimer",
    heading: "10. 면책 / Disclaimer",
    body: (
      <p>
        회사는 천재지변, 통신장애, 플랫폼/브라우저 문제, 제3자 서비스 중단 등 불가항력 사유로 인한 손해에 대해 책임을 지지 않습니다. We do not warrant uninterrupted, error-free service at all times.
      </p>
    ),
  },
  {
    id: "liability",
    heading: "11. 책임 제한 / Limitation of Liability",
    body: (
      <p>
        관련 법령이 허용하는 최대 범위 내에서 회사의 책임은 제한되며, 간접손해/특별손해/결과적 손해에 대한 책임은 배제될 수 있습니다. Nothing in these Terms excludes liability that cannot be excluded under applicable law.
      </p>
    ),
  },
  {
    id: "refund-policy",
    heading: "12. 환불 및 청약철회 안내 / Refund and Withdrawal Guide",
    body: (
      <>
        <p>
          Code Destiny의 유료 결제 상품은 30일 이용권과 상품별 원화 단건 결제입니다. 월정석은 이용권 또는 이벤트로 지급되는 보너스 혜택이며 별도 구매·충전 상품이 아니므로 현금 환불 대상 결제 상품으로 보지 않습니다.
        </p>
        <p>
          <strong>재화 등의 공급시기: 모든 유료 서비스는 결제(대금 지급)가 완료되어 승인이 확인되는 즉시 제공됩니다.</strong> 별도의 배송 절차 없이 결제 승인 시점부터 서비스 이용이 시작되며, 30일 이용권 역시 결제 검증이 완료된 시각부터 즉시 적용됩니다. Supply timing: all paid services are provided immediately upon confirmed payment approval, with no separate delivery step; the 30-day pass likewise takes effect immediately once payment is verified.
        </p>
        <p>
          월정석은 <strong>각 지급분이 지급된 날로부터 30일간만 유효</strong>하며, 그 기간 내에 사용하지 않은 지급분은 자동으로 소멸합니다. 여러 번 나눠 지급받은 월정석은 각 지급분이 자기 지급일을 기준으로 개별 만료하고, 사용 시에는 먼저 만료되는(오래된) 지급분부터 차감됩니다. 소멸된 월정석은 복구되지 않으며 현금 환불 대상이 아닙니다.
        </p>
        <p>
          30일 이용권은 서버 결제 검증 성공 시각부터 30일 동안 유지되는 일회성 디지털 이용권입니다. 자동결제 상품이 아니며 만료 후 사용자가 직접 다시 구매해야 합니다.
        </p>
        <p>
          이용권 또는 단건 결제 상품은 결제일 또는 계약내용을 받은 날부터 7일 이내 청약철회 요청이 가능합니다. 다만 콘텐츠 생성, PDF 렌더링, 유료 리딩 열람, 이용권 혜택 사용 등 디지털콘텐츠 또는 유료 서비스 제공이 개시된 경우에는 제공이 개시된 부분에 대한 청약철회가 제한될 수 있습니다.
        </p>
        <p>
          결제 완료 전에는 언제든 취소할 수 있습니다. 결제 완료 후에도 결과 생성, PDF 렌더링, 유료 리딩 열람, 이용권 혜택 사용이 시작되지 않았다면 고객센터를 통해 환불 요청이 가능합니다.
        </p>
        <p>
          개인 맞춤형 디지털 콘텐츠가 생성되었거나 결과 열람, PDF 렌더링, 유료 리딩 제공, 이용권 혜택 사용이 시작된 경우에는 디지털 콘텐츠 특성상 단순 변심 환불이 제한될 수 있습니다.
        </p>
        <p>
          30일 이용권을 사용한 뒤 중도 해지를 요청하는 경우에는 이미 제공된 기간, 이용한 유료 기능, 지급·사용된 혜택을 확인한 뒤 법령상 환급 대상이 되는 미제공 부분이 있을 때 결제수단으로 환급합니다.
        </p>
        <p>
          결제 후 결과가 제공되지 않았거나 시스템 오류로 정상 이용이 불가능한 경우에는 장애 내역 확인 후 재생성, 이용 기간 조정, 부분 환불 또는 전액 환불 중 적절한 방식으로 처리합니다.
        </p>
        <p>
          동일 상품의 중복 결제 또는 결제 오류가 확인된 경우에는 결제수단과 결제대행사 정책에 따라 중복 결제분을 환불 처리합니다.
        </p>
        <p>
          표시·광고 내용과 다르거나 계약내용과 다르게 이행된 경우에는 공급받은 날부터 3개월 이내, 그 사실을 안 날 또는 알 수 있었던 날부터 30일 이내 청약철회를 요청할 수 있습니다.
        </p>
        <p>
          환불 요청은 결제자 본인 확인 후 접수하며, 청약철회 또는 환급 대상임이 확인되면 관련 법령에 따라 3영업일 이내 결제 취소 또는 환급 절차를 진행합니다. 실제 카드사·결제대행사 반영 시점은 결제수단별 정책에 따라 달라질 수 있습니다. 환불 문의: {SUPPORT_EMAIL}
        </p>
        <p>
          회사는 분쟁 예방과 법령 준수를 위해 확인 시각, 콘텐츠 식별 정보, 계정 식별자, 접속 기록 등 필요한 범위의 로그를 보관할 수 있습니다.
        </p>
      </>
    ),
  },
  {
    id: "free-trial",
    heading: "13. 무료 체험 및 유료 이용권 이용 / Free Trial and Paid Pass Use",
    body: (
      <>
        <p>
          무료 체험 기간 중이라도 멤버십 전용 콘텐츠를 열람하여 서비스 이용이 개시된 경우, 이후 동일 콘텐츠 또는 유료 이용권에 대한 단순 변심 환불은 제한될 수 있습니다. If service use starts during the free trial, withdrawal for the same digital content or paid pass may be restricted.
        </p>
        <p>
          이용권 종류, 30일 이용 기간, 결제 금액, 만료일, 자동결제 여부와 환불 조건은 결제 화면에 고지되며, 이용자는 결제 완료 전 이를 확인할 책임이 있습니다.
        </p>
        <p>다만 강행규정에 따라 환불이 필요한 경우에는 관계 법령 및 결제대행사 정책에 따라 처리합니다.</p>
      </>
    ),
  },
  {
    id: "changes",
    heading: "14. 약관 변경 / Changes to Terms",
    body: (
      <p>
        약관이 변경될 경우 시행일과 주요 변경사항을 서비스 내 공지합니다. 변경 후 서비스를 계속 이용하면 개정 약관에 동의한 것으로 간주됩니다. Material changes will be announced with a reasonable prior notice period when required.
      </p>
    ),
  },
  {
    id: "governing-law",
    heading: "15. 준거법 및 관할 / Governing Law and Jurisdiction",
    body: (
      <p>
        본 약관은 대한민국 법령을 준거법으로 하며, 관련 분쟁은 관련 법령에 따른 관할 법원에 제기합니다. These Terms are governed by the laws of the Republic of Korea.
      </p>
    ),
  },
  {
    id: "contact",
    heading: "16. 문의 / Contact",
    body: (
      <p>
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
    ),
  },
];

export default function TermsContent() {
  return (
    <div className="policy-embed-body">
      <p className="policy-embed-date">
        시행일: {TERMS_EFFECTIVE_DATE} / Effective Date: {TERMS_EFFECTIVE_DATE}
      </p>

      {TERMS_SECTIONS.map((section) => (
        <section key={section.id} id={section.id} className="policy-embed-section">
          <h2 className="policy-embed-heading">{section.heading}</h2>
          {section.body}
        </section>
      ))}
    </div>
  );
}
