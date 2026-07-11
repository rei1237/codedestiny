/**
 * 이용약관 콘텐츠 전용 컴포넌트
 * — iframe 없이 회원가입 페이지에서 인라인으로 임베드하기 위한 컴포넌트
 * — 독립 페이지(/terms-of-service)에서도 재사용 가능
 */
import { OPERATOR_NAME, SUPPORT_EMAIL } from "../../lib/site-policy-config";

export default function TermsContent() {
  return (
    <div className="policy-embed-body">
      <p className="policy-embed-date">시행일: 2026-04-11 / Effective Date: 2026-04-11</p>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">1. 약관의 목적 / Purpose</h3>
        <p>
          본 약관은 Code Destiny가 제공하는 온라인 서비스의 이용 조건과 절차, 당사자 간 권리·의무 및 책임사항을 규정합니다. These terms govern access to and use of Code Destiny services, including rights, obligations, and liabilities.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">2. 적용 대상 및 동의 / Scope and Acceptance</h3>
        <p>
          이용자가 서비스에 접속하거나 이용을 계속하는 경우 본 약관 및 관련 정책(개인정보처리방침 포함)에 동의한 것으로 봅니다.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">3. 서비스 내용 / Service Description</h3>
        <p>
          Code Destiny는 사주/타로/운세 기반의 해석 콘텐츠를 제공하며, 서비스 품질 향상을 위해 기능이 추가/변경/중단될 수 있습니다.
        </p>
        <p>서비스 주소: https://code-destiny.com / 운영자: {OPERATOR_NAME}</p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">4. 쿠키 및 제3자 광고 / Cookies and Third-Party Ads</h3>
        <p>
          서비스는 기능 제공, 이용 통계, 광고 제공을 위해 쿠키 및 유사 기술을 사용할 수 있습니다. Google AdSense를 포함한 제3자 광고 네트워크는 사용자 관심사 기반 광고를 위해 쿠키를 사용할 수 있으며, 이용자는 브라우저 설정에서 이를 관리할 수 있습니다.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">5. 이용자 자격 및 책임 / Eligibility and User Responsibility</h3>
        <p>
          이용자는 정확한 정보 입력 및 계정/기기 보안 관리 책임을 부담하며, 법령 위반, 권리 침해, 자동화된 비정상 접근, 서비스 방해 행위를 해서는 안 됩니다.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">6. 금지행위 / Prohibited Conduct</h3>
        <p>
          (1) 서비스 역설계, 크롤링, 무단 자동화 접근 (2) 악성코드 유포 및 보안 취약점 악용 (3) 타인의 개인정보 무단 수집/도용 (4) 불법 콘텐츠 게시 (5) 운영을 방해하는 일체의 행위는 금지됩니다.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">7. 공정이용 및 비정상 이용 제한 / Fair Use and Restriction of Abnormal Use</h3>
        <p>
          이용자는 유효한 이용권 계약기간 동안 아래에서 정하는 비정상 이용에 해당하지 않는 한 추가 요금 없이 이용권이 적용되는 서비스를 이용할 수 있습니다(이하 &quot;정액 무제한 이용&quot;). Pass holders may use covered services without additional charge for the pass validity period, unless their use qualifies as abnormal use under this section.
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
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">8. 지식재산권 / Intellectual Property</h3>
        <p>
          서비스와 관련된 텍스트, 디자인, 코드, 데이터 구성요소 등 일체의 권리는 Code Destiny 또는 정당한 권리자에게 귀속됩니다.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">9. 서비스 성격 및 한계 / Nature and Limitations</h3>
        <p>
          운세/타로 결과는 오락 및 참고 목적의 정보이며, 법률/의료/투자/세무 등 전문 자문을 대체하지 않습니다. Fortune interpretations are informational entertainment content and do not guarantee outcomes.
          특히 의료적 진단/치료 결과, 법률 분쟁 또는 형사 사건의 결과, 투자 수익 또는 손실 회피를 보장하지 않습니다. In particular, we do not guarantee medical outcomes, legal dispute or criminal case results, or investment returns.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">10. 면책 / Disclaimer</h3>
        <p>
          회사는 천재지변, 통신장애, 플랫폼/브라우저 문제, 제3자 서비스 중단 등 불가항력 사유로 인한 손해에 대해 책임을 지지 않습니다.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">11. 책임 제한 / Limitation of Liability</h3>
        <p>
          관련 법령이 허용하는 최대 범위 내에서 회사의 책임은 제한되며, 간접손해/특별손해/결과적 손해에 대한 책임은 배제될 수 있습니다.
        </p>
      </section>

      <section id="refund-policy" className="policy-embed-section" style={{ scrollMarginTop: "116px" }}>
        <h3 className="policy-embed-h3">12. 환불 및 청약철회 안내 / Refund and Withdrawal Guide</h3>
        <p>
          Code Destiny의 유료 결제 상품은 30일 이용권과 상품별 원화 단건 결제입니다. 월정석은 이용권 또는 이벤트로 지급되는 보너스 혜택이며 별도 구매·충전 상품이 아니므로 현금 환불 대상 결제 상품으로 보지 않습니다.
        </p>
        <p>
          월정석은 <strong>각 지급분이 지급된 날로부터 30일간만 유효</strong>하며, 그 기간 내에 사용하지 않은 지급분은 자동으로 소멸합니다. 여러 번 나눠 지급받은 월정석은 각 지급분이 자기 지급일을 기준으로 개별 만료하고, 사용 시에는 먼저 만료되는(오래된) 지급분부터 차감됩니다. 소멸된 월정석은 복구되지 않으며 현금 환불 대상이 아닙니다.
        </p>
        <p>
          결제 완료 전에는 언제든 취소할 수 있습니다. 결제 완료 후에도 결과 생성, PDF 렌더링, 유료 리딩 열람, 이용권 혜택 사용이 시작되지 않았다면 고객센터를 통해 환불 요청이 가능합니다.
        </p>
        <p>
          개인 맞춤형 디지털 콘텐츠가 생성되었거나 결과 열람, PDF 렌더링, 유료 리딩 제공, 이용권 혜택 사용이 시작된 경우에는 디지털 콘텐츠 특성상 단순 변심 환불이 제한될 수 있습니다.
        </p>
        <p>
          결제 후 결과가 제공되지 않았거나 시스템 오류로 정상 이용이 불가능한 경우에는 장애 내역 확인 후 재생성, 이용 기간 조정, 부분 환불 또는 전액 환불 중 적절한 방식으로 처리합니다.
        </p>
        <p>
          동일 상품의 중복 결제 또는 결제 오류가 확인된 경우에는 결제수단과 결제대행사 정책에 따라 중복 결제분을 환불 처리합니다.
        </p>
        <p>
          30일 이용권은 서버 결제 검증 성공 시각부터 30일 동안 유지되는 일회성 디지털 이용권이며 자동결제 상품이 아닙니다. 이미 사용된 이용권 횟수, 기간, 월정석 혜택은 사용분을 기준으로 확인한 뒤 처리합니다.
        </p>
        <p>
          환불 요청은 결제자 본인 확인 후 접수하며, 환급 대상임이 확인되면 관련 법령과 결제대행사 정책에 따라 처리합니다. 실제 카드사 반영 시점은 결제수단별 정책에 따라 달라질 수 있습니다. 환불 문의: {SUPPORT_EMAIL}
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">13. 무료 체험 및 이용권 이용 / Free Trial and Paid Pass Use</h3>
        <p>
          무료 체험 기간 중이라도 유료 기능 또는 이용권 혜택 사용이 시작된 경우, 동일 콘텐츠 또는 이용권에 대한 단순 변심 환불은 제한될 수 있습니다.
        </p>
        <p>
          이용권 종류, 30일 이용 기간, 결제 금액, 만료일, 자동결제 여부와 환불 조건은 결제 완료 전 화면에 표시됩니다. 법률 자문이 필요한 최종 약관 문구는 별도 검토 후 갱신될 수 있습니다.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">14. 약관 변경 / Changes to Terms</h3>
        <p>
          약관이 변경될 경우 시행일과 주요 변경사항을 서비스 내 공지합니다. 변경 후 서비스를 계속 이용하면 개정 약관에 동의한 것으로 간주됩니다.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">15. 준거법 및 관할 / Governing Law</h3>
        <p>
          본 약관은 대한민국 법령을 준거법으로 하며, 관련 분쟁은 관련 법령에 따른 관할 법원에 제기합니다.
        </p>
      </section>

      <section className="policy-embed-section">
        <h3 className="policy-embed-h3">16. 문의 / Contact</h3>
        <p>
          서비스명: Code Destiny<br />
          사이트: https://code-destiny.com<br />
          운영자: {OPERATOR_NAME}<br />
          약관 문의: {SUPPORT_EMAIL}
        </p>
      </section>
    </div>
  );
}
