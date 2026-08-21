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
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import WithdrawModal from "../../components/WithdrawModal";
import { readSanitizedAuthUser } from "../../_lib/auth-storage";

type SessionState = "checking" | "signed-in" | "signed-out";

type Copy = {
  actionsTitle: string; checkingSession: string; deleteButton: string; signedInLead: string;
  signedOutLead: string; loginAndDelete: string; emailRequestLink: string;
  signedOutNotePrefix: string; signedOutNoteSuffix: string; mailtoSubject: string;
  mailtoBodyEmailLabel: string; mailtoBodyReasonLabel: string;
};

const EN: Copy = {
  actionsTitle: "Delete account", checkingSession: "Checking your sign-in status.",
  deleteButton: "Start account deletion",
  signedInLead: "Tapping the button below starts the verification process. Once verification is complete, your account and data are deleted immediately and can't be recovered.",
  signedOutLead: "Please log in first to delete your account. This confirms it's really you.",
  loginAndDelete: "Log in and delete", emailRequestLink: "Request deletion by email",
  signedOutNotePrefix: "If you can't log in, please send your request to ",
  signedOutNoteSuffix: ". We'll process it after verifying your identity.",
  mailtoSubject: "[Code Destiny] Account deletion request",
  mailtoBodyEmailLabel: "Email address used to sign up:",
  mailtoBodyReasonLabel: "Reason you can't access your account:",
};

const COPY: Partial<Record<LoadingLocale, Copy>> = {
  ko: {
    actionsTitle: "계정 삭제 진행", checkingSession: "로그인 상태를 확인하고 있습니다.",
    deleteButton: "계정 삭제 진행하기",
    signedInLead: "아래 버튼을 누르면 확인 절차가 시작됩니다. 확인을 마치면 계정과 데이터가 즉시 삭제되며 되돌릴 수 없습니다.",
    signedOutLead: "계정을 삭제하려면 먼저 로그인해 주세요. 본인 계정임을 확인하기 위한 절차입니다.",
    loginAndDelete: "로그인하고 삭제하기", emailRequestLink: "이메일로 삭제 요청",
    signedOutNotePrefix: "계정에 로그인할 수 없다면 ",
    signedOutNoteSuffix: " 주소로 요청해 주세요. 본인 확인 후 처리해 드립니다.",
    mailtoSubject: "[Code Destiny] 계정 삭제 요청",
    mailtoBodyEmailLabel: "가입에 사용한 이메일 주소:",
    mailtoBodyReasonLabel: "계정에 로그인할 수 없는 사유:",
  },
  ja: {
    actionsTitle: "アカウント削除を進める", checkingSession: "ログイン状態を確認しています。",
    deleteButton: "アカウント削除に進む",
    signedInLead: "下のボタンを押すと確認手続きが始まります。確認が完了すると、アカウントとデータは直ちに削除され、元に戻すことはできません。",
    signedOutLead: "アカウントを削除するには、まずログインしてください。ご本人確認のための手続きです。",
    loginAndDelete: "ログインして削除する", emailRequestLink: "メールで削除を依頼する",
    signedOutNotePrefix: "アカウントにログインできない場合は、",
    signedOutNoteSuffix: " 宛にご依頼ください。本人確認の後に対応いたします。",
    mailtoSubject: "[Code Destiny] アカウント削除依頼",
    mailtoBodyEmailLabel: "登録に使用したメールアドレス:",
    mailtoBodyReasonLabel: "アカウントにログインできない理由:",
  },
  "zh-CN": {
    actionsTitle: "继续删除账户", checkingSession: "正在确认登录状态。",
    deleteButton: "继续删除账户",
    signedInLead: "点击下方按钮将开始验证流程。验证完成后,账户和数据将立即删除且无法恢复。",
    signedOutLead: "要删除账户,请先登录。这是为了确认是您本人操作。",
    loginAndDelete: "登录并删除", emailRequestLink: "通过邮箱申请删除",
    signedOutNotePrefix: "如果无法登录账户,请发送邮件至 ",
    signedOutNoteSuffix: " 提出申请,我们将在核实身份后为您处理。",
    mailtoSubject: "[Code Destiny] 账户删除申请",
    mailtoBodyEmailLabel: "注册时使用的邮箱地址:",
    mailtoBodyReasonLabel: "无法登录账户的原因:",
  },
  "zh-TW": {
    actionsTitle: "繼續刪除帳戶", checkingSession: "正在確認登入狀態。",
    deleteButton: "繼續刪除帳戶",
    signedInLead: "點擊下方按鈕將開始驗證流程。驗證完成後,帳戶與資料將立即刪除且無法復原。",
    signedOutLead: "要刪除帳戶,請先登入。這是為了確認是您本人操作。",
    loginAndDelete: "登入並刪除", emailRequestLink: "透過電子郵件申請刪除",
    signedOutNotePrefix: "如果無法登入帳戶,請寄信至 ",
    signedOutNoteSuffix: " 提出申請,我們將在核實身分後為您處理。",
    mailtoSubject: "[Code Destiny] 帳戶刪除申請",
    mailtoBodyEmailLabel: "註冊時使用的電子郵件地址:",
    mailtoBodyReasonLabel: "無法登入帳戶的原因:",
  },
  vi: {
    actionsTitle: "Tiếp tục xóa tài khoản", checkingSession: "Đang kiểm tra trạng thái đăng nhập.",
    deleteButton: "Tiếp tục xóa tài khoản",
    signedInLead: "Nhấn nút bên dưới để bắt đầu quy trình xác minh. Sau khi xác minh xong, tài khoản và dữ liệu sẽ bị xóa ngay lập tức và không thể khôi phục.",
    signedOutLead: "Vui lòng đăng nhập trước khi xóa tài khoản. Đây là bước xác nhận đây đúng là tài khoản của bạn.",
    loginAndDelete: "Đăng nhập và xóa", emailRequestLink: "Yêu cầu xóa qua email",
    signedOutNotePrefix: "Nếu không thể đăng nhập, vui lòng gửi yêu cầu đến ",
    signedOutNoteSuffix: ". Chúng tôi sẽ xử lý sau khi xác minh danh tính.",
    mailtoSubject: "[Code Destiny] Yêu cầu xóa tài khoản",
    mailtoBodyEmailLabel: "Địa chỉ email đã dùng để đăng ký:",
    mailtoBodyReasonLabel: "Lý do không thể đăng nhập vào tài khoản:",
  },
  hi: {
    actionsTitle: "खाता हटाना जारी रखें", checkingSession: "लॉगिन स्थिति जाँची जा रही है।",
    deleteButton: "खाता हटाना जारी रखें",
    signedInLead: "नीचे दिया गया बटन दबाने पर पुष्टि प्रक्रिया शुरू होगी। पुष्टि पूर्ण होते ही खाता और डेटा तुरंत हटा दिया जाएगा और इसे वापस नहीं लाया जा सकता।",
    signedOutLead: "खाता हटाने के लिए कृपया पहले लॉग इन करें। यह पुष्टि करने के लिए है कि यह वास्तव में आपका खाता है।",
    loginAndDelete: "लॉग इन करें और हटाएँ", emailRequestLink: "ईमेल से हटाने का अनुरोध करें",
    signedOutNotePrefix: "यदि आप लॉग इन नहीं कर पा रहे हैं, तो कृपया ",
    signedOutNoteSuffix: " पर अनुरोध भेजें। पहचान सत्यापन के बाद हम इसे संसाधित करेंगे।",
    mailtoSubject: "[Code Destiny] खाता हटाने का अनुरोध",
    mailtoBodyEmailLabel: "साइन अप के लिए उपयोग किया गया ईमेल पता:",
    mailtoBodyReasonLabel: "खाते में लॉग इन न कर पाने का कारण:",
  },
  es: {
    actionsTitle: "Continuar con la eliminación de la cuenta", checkingSession: "Comprobando tu estado de inicio de sesión.",
    deleteButton: "Continuar con la eliminación de la cuenta",
    signedInLead: "Al pulsar el botón de abajo se iniciará el proceso de verificación. Una vez completada la verificación, tu cuenta y tus datos se eliminarán de inmediato y no podrán recuperarse.",
    signedOutLead: "Para eliminar tu cuenta, primero inicia sesión. Esto confirma que realmente eres tú.",
    loginAndDelete: "Iniciar sesión y eliminar", emailRequestLink: "Solicitar la eliminación por correo electrónico",
    signedOutNotePrefix: "Si no puedes iniciar sesión, envía tu solicitud a ",
    signedOutNoteSuffix: ". La procesaremos después de verificar tu identidad.",
    mailtoSubject: "[Code Destiny] Solicitud de eliminación de cuenta",
    mailtoBodyEmailLabel: "Correo electrónico usado para registrarte:",
    mailtoBodyReasonLabel: "Motivo por el que no puedes acceder a tu cuenta:",
  },
  fr: {
    actionsTitle: "Continuer la suppression du compte", checkingSession: "Vérification de votre statut de connexion.",
    deleteButton: "Continuer la suppression du compte",
    signedInLead: "En appuyant sur le bouton ci-dessous, la procédure de vérification commencera. Une fois la vérification terminée, votre compte et vos données seront supprimés immédiatement et de manière irréversible.",
    signedOutLead: "Pour supprimer votre compte, veuillez d'abord vous connecter. Cela permet de confirmer qu'il s'agit bien de vous.",
    loginAndDelete: "Se connecter et supprimer", emailRequestLink: "Demander la suppression par e-mail",
    signedOutNotePrefix: "Si vous ne pouvez pas vous connecter, veuillez envoyer votre demande à ",
    signedOutNoteSuffix: ". Nous la traiterons après vérification de votre identité.",
    mailtoSubject: "[Code Destiny] Demande de suppression de compte",
    mailtoBodyEmailLabel: "Adresse e-mail utilisée lors de l'inscription :",
    mailtoBodyReasonLabel: "Raison pour laquelle vous ne pouvez pas accéder à votre compte :",
  },
  de: {
    actionsTitle: "Kontolöschung fortsetzen", checkingSession: "Dein Anmeldestatus wird geprüft.",
    deleteButton: "Kontolöschung fortsetzen",
    signedInLead: "Durch Tippen auf die Schaltfläche unten beginnt der Verifizierungsprozess. Nach Abschluss der Verifizierung werden dein Konto und deine Daten sofort und unwiderruflich gelöscht.",
    signedOutLead: "Um dein Konto zu löschen, melde dich bitte zuerst an. Damit wird bestätigt, dass du es wirklich bist.",
    loginAndDelete: "Anmelden und löschen", emailRequestLink: "Löschung per E-Mail anfordern",
    signedOutNotePrefix: "Falls du dich nicht anmelden kannst, sende deine Anfrage bitte an ",
    signedOutNoteSuffix: ". Wir bearbeiten sie nach der Identitätsprüfung.",
    mailtoSubject: "[Code Destiny] Antrag auf Kontolöschung",
    mailtoBodyEmailLabel: "Bei der Registrierung verwendete E-Mail-Adresse:",
    mailtoBodyReasonLabel: "Grund, warum du dich nicht in dein Konto einloggen kannst:",
  },
  nl: {
    actionsTitle: "Doorgaan met account verwijderen", checkingSession: "Je inlogstatus wordt gecontroleerd.",
    deleteButton: "Doorgaan met account verwijderen",
    signedInLead: "Als je op de knop hieronder tikt, start het verificatieproces. Na afronding van de verificatie worden je account en gegevens onmiddellijk en definitief verwijderd.",
    signedOutLead: "Log eerst in om je account te verwijderen. Dit bevestigt dat jij het echt bent.",
    loginAndDelete: "Inloggen en verwijderen", emailRequestLink: "Verwijdering aanvragen per e-mail",
    signedOutNotePrefix: "Als je niet kunt inloggen, stuur je verzoek dan naar ",
    signedOutNoteSuffix: ". We verwerken het na verificatie van je identiteit.",
    mailtoSubject: "[Code Destiny] Verzoek tot verwijdering van account",
    mailtoBodyEmailLabel: "E-mailadres gebruikt bij aanmelding:",
    mailtoBodyReasonLabel: "Reden waarom je niet kunt inloggen op je account:",
  },
  ms: {
    actionsTitle: "Teruskan pemadaman akaun", checkingSession: "Menyemak status log masuk anda.",
    deleteButton: "Teruskan pemadaman akaun",
    signedInLead: "Menekan butang di bawah akan memulakan proses pengesahan. Setelah pengesahan selesai, akaun dan data anda akan dipadam serta-merta dan tidak boleh dipulihkan.",
    signedOutLead: "Untuk memadam akaun anda, sila log masuk dahulu. Ini mengesahkan bahawa ini benar-benar akaun anda.",
    loginAndDelete: "Log masuk dan padam", emailRequestLink: "Minta pemadaman melalui e-mel",
    signedOutNotePrefix: "Jika anda tidak dapat log masuk, sila hantar permintaan anda ke ",
    signedOutNoteSuffix: ". Kami akan memprosesnya selepas pengesahan identiti anda.",
    mailtoSubject: "[Code Destiny] Permintaan pemadaman akaun",
    mailtoBodyEmailLabel: "Alamat e-mel yang digunakan untuk mendaftar:",
    mailtoBodyReasonLabel: "Sebab anda tidak dapat log masuk ke akaun anda:",
  },
};

function getCopy(locale: LoadingLocale): Copy { return COPY[locale] || EN; }

export default function AccountDeleteActions({ supportEmail }: { supportEmail: string }) {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const [session, setSession] = useState<SessionState>("checking");
  const [hasLocalAuth, setHasLocalAuth] = useState(true);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const copy = getCopy(locale);

  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    document.addEventListener("cd:language-change", sync);
    return () => { window.removeEventListener("languagechange", sync); document.removeEventListener("cd:language-change", sync); };
  }, []);

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

  const mailtoHref = `mailto:${supportEmail}?subject=${encodeURIComponent(copy.mailtoSubject)}&body=${encodeURIComponent(
    `${copy.mailtoBodyEmailLabel}\n\n${copy.mailtoBodyReasonLabel}\n\n`,
  )}`;

  return (
    <section className="policy-panel policy-panel--warn" aria-labelledby="account-delete-actions-title">
      <h2 className="policy-panel__title" id="account-delete-actions-title">
        {copy.actionsTitle}
      </h2>

      {session === "checking" ? (
        <>
          <p className="policy-doc__note policy-doc__note--lead">{copy.checkingSession}</p>
          <button className="policy-btn policy-btn--danger" type="button" disabled>
            {copy.deleteButton}
          </button>
        </>
      ) : session === "signed-in" ? (
        <>
          <p className="policy-doc__note policy-doc__note--lead">
            {copy.signedInLead}
          </p>
          <button className="policy-btn policy-btn--danger" type="button" onClick={() => setIsWithdrawOpen(true)}>
            {copy.deleteButton}
          </button>
        </>
      ) : (
        <>
          <p className="policy-doc__note policy-doc__note--lead">
            {copy.signedOutLead}
          </p>
          <div className="policy-doc__actions">
            <Link className="policy-btn policy-btn--primary" href="/login">
              {copy.loginAndDelete}
            </Link>
            <a className="policy-btn policy-btn--ghost" href={mailtoHref}>
              {copy.emailRequestLink}
            </a>
          </div>
          <p className="policy-doc__note">
            {copy.signedOutNotePrefix}{supportEmail}{copy.signedOutNoteSuffix}
          </p>
        </>
      )}

      <WithdrawModal isOpen={isWithdrawOpen} onClose={() => setIsWithdrawOpen(false)} hasLocalAuth={hasLocalAuth} />
    </section>
  );
}
