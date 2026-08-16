/**
 * 개인정보처리방침 정본 (시행일 2026-08-04)
 * — 이 파일이 방침 본문의 유일한 원본이다.
 *   독립 페이지(/privacy, /privacy-policy)와 회원가입 동의 화면(app/signup/SignupClient.tsx)이
 *   모두 이 컴포넌트를 렌더하므로, 동의한 문서와 공개된 문서가 항상 일치한다.
 * — PRIVACY_POLICY_SECTIONS는 목차(policy-doc__toc)와 본문이 공유한다. 여기만 고치면 둘 다 따라온다.
 */
import Link from "next/link";
import { OPERATOR_NAME, SUPPORT_EMAIL, SUPPORT_MAILTO } from "../../lib/site-policy-config";

// 🔴 worker/routes/auth.js 의 AUTH_PRIVACY_VERSION 과 **같은 값이어야 한다**(수동 동기화).
// 한쪽만 고치면 사용자가 본 방침과 DB 에 기록되는 동의 버전이 조용히 어긋난다.
export const PRIVACY_POLICY_EFFECTIVE_DATE = "2026-08-17";

export const PRIVACY_POLICY_SECTIONS = [
  {
    id: "principles",
    heading: "1. 기본 원칙",
    body: (
      <>
        <p>
          Code Destiny는 운세, 리포트, 상담형 콘텐츠를 제공하는 과정에서 필요한 개인정보를 최소한으로 처리하며, 수집 목적과 보관 기간을 명확히 알리기 위해 이 방침을 공개합니다.
        </p>
        <p>
          개인정보 처리자: {OPERATOR_NAME}
          <br />
          사이트: https://code-destiny.com
        </p>
      </>
    ),
  },
  {
    id: "collected-data",
    heading: "2. 수집 항목과 이용 목적",
    body: (
      <>
        <p>
          회원가입 시 이름, 이메일, 필수 동의 기록을 계정 관리, 고객 응대, 알림 발송과 부정 이용 방지를 위해 처리합니다. 휴대폰 번호는 가입 시 받지 않으며, 소셜 로그인 제공자(네이버·카카오)가 회원님의 동의를 받아 전달한 경우 또는 첫 카드 결제 시 회원님이 별도 동의와 함께 직접 입력한 경우에만 수집하고 목적은 결제 진행 하나입니다. 이 번호는 결제 대행사에 구매자 정보로 전달해야 하므로 삭제할 수 없는 대신, 서버에 저장할 때 AES-256 방식으로 암호화해 보관합니다. 이메일 가입 시에는 비밀번호 원문이 아닌 안전하게 해시된 값이 저장되며, 소셜 가입 시에는 선택한 인증 제공자의 계정 식별자가 연결됩니다. 생년월일, 성별, 출생시간, 출생지 등 운세 계산에 필요한 입력값은 가입 후 해당 운세 기능이나 프로필을 사용할 때 별도로 입력받아 결과 생성에 사용합니다.
        </p>
        <p>
          결제 정보는 결제 처리, 환불, 영수증 발행, 이용권 확인을 위해 결제 대행사와 함께 처리될 수 있으며, Code Destiny는 카드번호 전체와 같은 민감한 결제 원문을 직접 저장하지 않습니다.
        </p>
        <p>
          버그 제보실(/feedback)로 보내주신 제목, 내용, 첨부 이미지, 제보 대상 URL과 브라우저, 화면 크기, 언어, 시간대 등 환경 정보는 오류 재현과 수정, 회신을 위해 사용되며, 환경 정보 전송은 제보 화면에서 해제할 수 있습니다.
        </p>
      </>
    ),
  },
  {
    id: "automatic-data",
    heading: "3. 자동으로 처리되는 정보",
    body: (
      <p>
        접속 IP, 브라우저와 운영체제 정보, 접속 시간, 언어 설정, 기기 식별 정보, 쿠키와 로컬스토리지 값, 페이지 이용 기록이 서비스 안정성, 보안 점검, 오류 분석, 이용 통계 확인을 위해 처리될 수 있습니다.
      </p>
    ),
  },
  {
    id: "cookies-and-ads",
    heading: "4. 쿠키, 광고 식별자, Google AdSense 고지",
    body: (
      <>
        <p>
          Code Destiny는 로그인 유지, 보안, 이용 통계, 광고 제공을 위해 쿠키와 유사 기술을 사용할 수 있습니다. 웹 서비스에는 Google AdSense가 게재되며, Google AdSense를 포함한 제3자 광고 파트너는 광고 제공의 결과로 이용자의 브라우저에 쿠키를 저장하거나 읽을 수 있으며, 웹 비콘, IP 주소, 광고 식별자와 같은 정보를 사용할 수 있습니다.
        </p>
        <p>
          Google과 그 파트너는 이용자의 이전 방문 기록을 바탕으로 맞춤 광고를 제공할 수 있습니다. 이용자는 브라우저 설정, 기기 광고 설정,{" "}
          <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">
            Google 광고 설정
          </a>
          에서 맞춤 광고를 관리할 수 있습니다.
        </p>
        <p>
          Google이 파트너 사이트와 앱의 정보를 사용하는 방식은{" "}
          <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">
            Google 파트너 사이트/앱 데이터 사용 안내
          </a>
          에서 확인할 수 있습니다.
        </p>
      </>
    ),
  },
  {
    id: "third-party",
    heading: "5. 제3자 제공과 처리 위탁",
    body: (
      <>
        <p>
          Code Destiny는 이용자의 동의 없이 개인정보를 판매하지 않습니다. 다만 결제 처리, 클라우드 호스팅, 보안, 분석, 이메일 발송, 광고 제공처럼 서비스 운영에 필요한 경우에는 해당 목적에 필요한 범위에서 외부 처리자 또는 광고 파트너가 정보를 처리할 수 있습니다.
        </p>
        <p>
          결제 처리를 위해 아래와 같이 개인정보 처리를 위탁하고 있습니다. 위탁 업무 내용이나 수탁자가 변경되면 이 방침을 통해 알려드립니다.
        </p>
        <ul>
          <li>
            <strong>주식회사 포트원(PortOne)</strong> — 결제 요청·승인 중계 및 결제 내역 조회. 제공 항목: 이름, 휴대폰 번호, 이메일, 결제 정보
          </li>
          <li>
            <strong>KG이니시스</strong> — 신용카드 등 결제 수단 승인 및 매입. 제공 항목: 이름, 휴대폰 번호, 이메일, 결제 정보
          </li>
        </ul>
        <p>
          위탁받은 업체는 위탁 목적 범위에서만 정보를 처리하며, 보유 기간은 위탁 계약 종료 시 또는 관계 법령이 정한 기간까지입니다.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    heading: "6. 보관 기간",
    body: (
      <>
        <p>
          입력값과 결과 데이터는 서비스 제공, 재열람, 오류 대응에 필요한 기간 동안 보관되며, 이용자가 삭제를 요청하거나 목적이 달성되면 지체 없이 파기합니다. 문의 기록은 분쟁 대응을 위해 최대 3년, 접속 로그는 보안과 부정 이용 방지를 위해 최대 3개월, 결제 기록은 관계 법령이 요구하는 기간 동안 보관될 수 있습니다.
        </p>
        <p>
          휴대폰 번호는 회원 탈퇴 시까지 보관하며 탈퇴 시 지체 없이 파기합니다. 다만 전자상거래 등에서의 소비자보호에 관한 법률에 따라 보존 의무가 있는 거래기록(대금 결제 및 재화 등의 공급에 관한 기록 5년, 소비자의 불만 또는 분쟁 처리에 관한 기록 3년)에 포함된 경우에는 해당 기간 동안 보관합니다.
        </p>
      </>
    ),
  },
  {
    id: "user-rights",
    heading: "7. 이용자 권리",
    body: (
      <>
        <p>
          이용자는 개인정보 열람, 정정, 삭제, 처리 정지, 동의 철회를 요청할 수 있습니다. 요청은 합리적인 본인 확인 절차 후 관련 법령이 허용하는 범위에서 처리합니다.
        </p>
        <p>
          이용자는 선택 항목의 수집·이용 동의를 거부할 권리가 있습니다. 휴대폰 번호는 가입 시 받지 않는 선택 항목이며, 첫 카드 결제 화면에서 동의를 거부하시면 단건 결제와 이용권 구매를 포함한 카드 결제를 진행하실 수 없고 보유하신 월정석으로만 이용하실 수 있습니다. 필수 항목(이름, 이메일) 동의를 거부하는 경우에는 계정 생성이 불가능합니다.
        </p>
        <p>
          계정과 개인정보 삭제는{" "}
          <Link href="/account/delete">계정 삭제 페이지</Link>
          에서 직접 요청할 수 있으며, 아래 문의처로도 접수할 수 있습니다.
        </p>
      </>
    ),
  },
  {
    id: "children",
    heading: "8. 아동 개인정보",
    body: (
      <p>
        Code Destiny는 만 14세 미만 아동을 대상으로 하지 않으며, 회원가입 시 만 14세 이상임을 확인받아 가입을 제한합니다. 가입 단계에서는 연령 확인만을 목적으로 생년월일 전체를 수집하지 않습니다. 만 14세 미만 아동의 개인정보가 수집되었다고 판단되면 아래 문의처로 알려 주십시오. 확인 후 필요한 삭제 조치를 진행합니다.
      </p>
    ),
  },
  {
    id: "sensitive-interpretation",
    heading: "9. 민감한 해석과 광고 타겟팅",
    body: (
      <p>
        건강, 재정, 관계, 법률성 해석은 사용자의 자기 이해를 돕는 참고 콘텐츠로만 제공됩니다. Code Destiny는 이러한 민감한 해석 내용을 이용해 사용자를 불안하게 만들거나, 개인 맞춤 광고 타겟팅과 부적절하게 연결하지 않도록 주의합니다.
      </p>
    ),
  },
  {
    id: "security",
    heading: "10. 보안 조치",
    body: (
      <p>
        접근 권한 제한, 전송 구간 보호, 로그 점검, 부정 이용 탐지 등 합리적인 기술적·관리적 보호 조치를 적용합니다. 다만 인터넷 전송과 저장 방식은 절대적인 안전을 보장할 수 없으므로 지속적으로 개선합니다.
      </p>
    ),
  },
  {
    id: "changes",
    heading: "11. 방침 변경",
    body: (
      <p>
        이 방침은 법령, 서비스, 광고 파트너 정책 변경에 따라 개정될 수 있습니다. 중요한 변경 사항은 이 페이지에 반영하며, 필요한 경우 서비스 내 공지 또는 별도 안내로 알립니다.
      </p>
    ),
  },
  {
    id: "contact",
    heading: "12. 개인정보 문의",
    body: (
      <p>
        개인정보 열람, 정정, 삭제, 처리 정지, 광고·쿠키 관련 문의는 아래 이메일로 연락해 주십시오.
        <br />
        <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>
      </p>
    ),
  },
];

export default function PrivacyPolicyContent() {
  return (
    <div className="policy-embed-body">
      <p className="policy-embed-date">
        시행일: {PRIVACY_POLICY_EFFECTIVE_DATE} / Effective Date: {PRIVACY_POLICY_EFFECTIVE_DATE}
      </p>

      {PRIVACY_POLICY_SECTIONS.map((section) => (
        <section key={section.id} id={section.id} className="policy-embed-section">
          <h2 className="policy-embed-heading">{section.heading}</h2>
          {section.body}
        </section>
      ))}
    </div>
  );
}
