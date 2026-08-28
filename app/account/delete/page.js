import Link from "next/link";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";
import { OPERATOR_NAME, SUPPORT_EMAIL, SUPPORT_MAILTO } from "../../../lib/site-policy-config";
import AccountDeleteActions from "./AccountDeleteActions";

const ACCOUNT_DELETE_METADATA_COPY = {
  ko: {
    title: "계정 삭제 안내 | Code Destiny",
    description:
      "Code Destiny 계정 삭제 절차 안내입니다. 삭제되는 데이터와 법령에 따라 보관되는 데이터, 삭제 요청 방법, 처리 기간을 확인할 수 있습니다.",
    keywords: ["계정 삭제", "회원 탈퇴", "데이터 삭제", "Code Destiny 계정", "개인정보 파기"],
  },
};

export function generateMetadata() {
  const copy = ACCOUNT_DELETE_METADATA_COPY.ko;
  const metadata = generatePageMetadata({
    path: "/account/delete",
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
  });

  return {
    ...metadata,
    alternates: {
      ...(metadata.alternates || {}),
      canonical: "https://code-destiny.com/account/delete",
    },
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export default function AccountDeletePage() {
  return (
    <main className="policy-doc">
      <header className="policy-doc__head">
        <h1 className="policy-doc__title">계정 삭제 안내</h1>
        <p className="policy-doc__meta">Account Deletion · {OPERATOR_NAME}</p>
        <p className="policy-doc__lede">
          Code Destiny 계정을 삭제하는 방법과, 삭제하면 어떤 데이터가 지워지고 어떤 데이터가 법령에 따라 남는지 안내합니다. 삭제는 되돌릴 수 없으니 아래 내용을 먼저 확인해 주세요.
        </p>
      </header>

      <div className="policy-doc__single">
        <div className="policy-doc__body">
          <div className="policy-embed-body">
            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">1. 삭제 절차</h2>
              <p>
                계정 삭제는 앱과 웹에서 동일하게 처리되며, 본인 확인을 거쳐 즉시 완료됩니다. 별도의 대기 기간이나 운영자 승인 절차는 없습니다.
              </p>
              <ul>
                <li>Code Destiny에 로그인합니다.</li>
                <li>이 페이지 아래의 &quot;계정 삭제 진행하기&quot; 버튼을 누릅니다. 앱에서는 이용권 상점 화면의 &quot;회원 탈퇴&quot; 버튼으로도 같은 절차를 시작할 수 있습니다.</li>
                <li>이메일과 비밀번호로 가입한 계정이라면 현재 비밀번호를 입력해 본인임을 확인합니다.</li>
                <li>확인란에 &quot;회원탈퇴&quot;를 정확히 입력합니다.</li>
                <li>삭제가 되돌릴 수 없다는 점과 결제 기록 보관에 동의한 뒤 삭제를 실행합니다.</li>
              </ul>
              <p>
                삭제가 완료되면 로그아웃되고 홈 화면으로 이동합니다. 이후 같은 계정으로는 로그인할 수 없습니다.
              </p>
            </section>

            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">2. 삭제되는 데이터</h2>
              <p>
                아래 정보는 삭제 요청이 처리되는 즉시 영구 삭제되며 복구할 수 없습니다. 운영자도 복원할 수단을 가지고 있지 않습니다.
              </p>
              <ul>
                <li>계정 정보 — 이메일, 이름, 프로필 이미지, 소셜 로그인 연결 정보</li>
                <li>운세 계산에 사용한 입력값 — 생년월일, 출생시간, 출생지, 성별</li>
                <li>저장된 운세 프로필과 생성된 상담·리포트 결과</li>
                <li>보유 중인 이용권, 월정석 잔액, 잠금 해제한 콘텐츠 기록</li>
                <li>서비스 이용 중 저장된 설정값과 기기 캐시</li>
              </ul>
              <p>
                남아 있는 이용권 기간이나 사용하지 않은 월정석이 있어도 삭제와 동시에 소멸하며 현금으로 환급되지 않습니다. 환불이 필요하다면 계정을 삭제하기 전에{" "}
                <Link href="/terms#refund-policy">이용약관의 환불 및 청약철회 안내</Link>를 확인하고 먼저 문의해 주세요.
              </p>
            </section>

            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">3. 법령에 따라 보관되는 데이터</h2>
              <p>
                계정을 삭제해도 아래 정보는 관계 법령이 사업자에게 보관을 의무화한 항목이므로 정해진 기간 동안 남습니다. 이 정보는 개인을 식별할 수 없도록 익명화한 상태로 보관하며, 법령이 정한 목적 외에는 사용하지 않습니다.
              </p>
              <ul>
                <li>결제 및 거래 기록 — 전자상거래 등에서의 소비자보호에 관한 법률에 따라 5년간 익명화 보관</li>
                <li>소비자 불만 또는 분쟁 처리 기록 — 최대 3년</li>
                <li>접속 로그 — 보안 점검과 부정 이용 방지를 위해 최대 3개월</li>
              </ul>
              <p>
                보관 기간이 끝나면 해당 기록도 지체 없이 파기합니다. 자세한 보유 기간 기준은{" "}
                <Link href="/privacy#retention">개인정보처리방침의 보관 기간 조항</Link>에서 확인할 수 있습니다.
              </p>
            </section>

            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">4. 삭제 전에 확인할 점</h2>
              <p>
                계정 삭제는 취소할 수 없습니다. 아래 내용을 미리 확인해 주세요.
              </p>
              <ul>
                <li>같은 이메일로 다시 가입해도 이전 데이터는 복구되지 않습니다. 새 계정으로 처음부터 시작하게 됩니다.</li>
                <li>보관하고 싶은 상담 결과나 리포트가 있다면 삭제 전에 PDF로 내려받아 주세요.</li>
                <li>결제 후 결과를 아직 받지 못했다면 삭제 전에 문의해 주세요. 삭제 이후에는 계정 확인이 어려워 처리에 시간이 더 걸립니다.</li>
              </ul>
            </section>

            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">5. 계정에 로그인할 수 없는 경우</h2>
              <p>
                비밀번호를 잊었거나 소셜 로그인 계정에 접근할 수 없어 직접 삭제할 수 없다면, 가입에 사용한 이메일 주소에서{" "}
                <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a> 앞으로 계정 삭제를 요청해 주세요.
              </p>
              <p>
                요청을 받으면 본인 확인을 위해 최소한의 추가 정보를 요청할 수 있으며, 확인이 끝나는 대로 위와 동일한 기준으로 계정과 데이터를 삭제합니다. 처리 결과는 회신 메일로 안내합니다. 접수부터 처리 완료까지는 영업일 기준 1~3일이 걸립니다.
              </p>
            </section>

            <section className="policy-embed-section">
              <h2 className="policy-embed-heading">6. 삭제가 완료된 뒤</h2>
              <p>
                삭제가 끝나면 화면에 완료 안내가 표시되고 자동으로 로그아웃됩니다. 기기에 남아 있던 로그인 정보와 임시 저장값도 함께 지워지므로, 별도로 캐시를 비우지 않아도 됩니다.
              </p>
              <p>
                삭제 후에도 예전 계정으로 로그인이 되거나 이전 데이터가 보인다면 브라우저 또는 앱에 오래된 화면이 남아 있는 경우입니다. 새로고침해도 같은 증상이 이어지면{" "}
                <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a> 앞으로 알려 주세요. 확인 후 남은 데이터를 직접 정리해 드립니다.
              </p>
              <p>
                구글 플레이나 카드사에 남는 결제 내역은 Code Destiny 계정과 별개로 각 결제 사업자가 보관하는 기록입니다. 이 기록은 계정 삭제로 지워지지 않으며, 해당 사업자의 정책에 따라 관리됩니다.
              </p>
            </section>
          </div>

          <AccountDeleteActions supportEmail={SUPPORT_EMAIL} />

          <nav className="policy-doc__related" aria-label="관련 문서">
            <Link className="policy-doc__toc-link" href="/privacy">
              개인정보처리방침
            </Link>
            <Link className="policy-doc__toc-link" href="/terms">
              이용약관
            </Link>
            <Link className="policy-doc__toc-link" href="/contact">
              문의하기
            </Link>
          </nav>
        </div>
      </div>
    </main>
  );
}
