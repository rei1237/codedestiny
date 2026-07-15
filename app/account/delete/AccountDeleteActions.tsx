"use client";

/**
 * 계정 삭제 실행 경로 — 안내는 서버 컴포넌트(page.js)가 렌더하고, 여기서는 행동만 담당한다.
 *
 * 삭제 로직은 새로 만들지 않는다. 기존 WithdrawModal(POST /api/auth/withdraw)을 그대로 재사용하므로
 * 비밀번호 확인·"회원탈퇴" 입력·동의 절차가 /points의 탈퇴와 완전히 동일하다.
 *
 * 로그인 여부는 localStorage 캐시(readSanitizedAuthUser)로 낙관적으로 판단한다.
 * 캐시가 살아있는데 서버 세션이 만료된 경우에도 WithdrawModal이 서버 응답으로 오류를 표시하므로
 * 여기서 서버 왕복을 추가하지 않는다.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import WithdrawModal from "../../components/WithdrawModal";
import { readSanitizedAuthUser } from "../../_lib/auth-storage";

type SessionState = "checking" | "signed-in" | "signed-out";

export default function AccountDeleteActions({ supportEmail }: { supportEmail: string }) {
  const [session, setSession] = useState<SessionState>("checking");
  const [hasLocalAuth, setHasLocalAuth] = useState(true);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  useEffect(() => {
    const user = readSanitizedAuthUser();
    if (!user) {
      setSession("signed-out");
      return;
    }
    // hasLocalAuth가 캐시에 없으면 비밀번호 확인을 요구하는 쪽(true)으로 둔다 — /points와 동일한 기본값.
    setHasLocalAuth(user.hasLocalAuth !== false);
    setSession("signed-in");
  }, []);

  const mailtoHref = `mailto:${supportEmail}?subject=${encodeURIComponent("[Code Destiny] 계정 삭제 요청")}&body=${encodeURIComponent(
    "가입에 사용한 이메일 주소:\n\n계정에 로그인할 수 없는 사유:\n\n",
  )}`;

  return (
    <section className="policy-panel policy-panel--warn" aria-labelledby="account-delete-actions-title">
      <h2 className="policy-panel__title" id="account-delete-actions-title">
        계정 삭제 진행
      </h2>

      {session === "checking" ? (
        <>
          <p className="policy-doc__note policy-doc__note--lead">로그인 상태를 확인하고 있습니다.</p>
          <button className="policy-btn policy-btn--danger" type="button" disabled>
            계정 삭제 진행하기
          </button>
        </>
      ) : session === "signed-in" ? (
        <>
          <p className="policy-doc__note policy-doc__note--lead">
            아래 버튼을 누르면 확인 절차가 시작됩니다. 확인을 마치면 계정과 데이터가 즉시 삭제되며 되돌릴 수 없습니다.
          </p>
          <button className="policy-btn policy-btn--danger" type="button" onClick={() => setIsWithdrawOpen(true)}>
            계정 삭제 진행하기
          </button>
        </>
      ) : (
        <>
          <p className="policy-doc__note policy-doc__note--lead">
            계정을 삭제하려면 먼저 로그인해 주세요. 본인 계정임을 확인하기 위한 절차입니다.
          </p>
          <div className="policy-doc__actions">
            <Link className="policy-btn policy-btn--primary" href="/login">
              로그인하고 삭제하기
            </Link>
            <a className="policy-btn policy-btn--ghost" href={mailtoHref}>
              이메일로 삭제 요청
            </a>
          </div>
          <p className="policy-doc__note">
            계정에 로그인할 수 없다면 {supportEmail} 주소로 요청해 주세요. 본인 확인 후 처리해 드립니다.
          </p>
        </>
      )}

      <WithdrawModal isOpen={isWithdrawOpen} onClose={() => setIsWithdrawOpen(false)} hasLocalAuth={hasLocalAuth} />
    </section>
  );
}
