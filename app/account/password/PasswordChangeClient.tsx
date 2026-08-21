"use client";

import Link from "next/link";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { getApiBaseUrl } from "../../_lib/api-config";
import {
  authFetch,
  isMobileAppRuntime,
  mobileAppAuthHeaders,
  persistMobileAppAccessToken,
  persistMobileAppRefreshToken,
} from "../../_lib/auth-client";
import { hydrateAuthSuccessUser } from "../../_lib/auth-store";

/** worker/lib/validation.js 의 MIN_NEW_PASSWORD_LENGTH 와 같은 값이어야 한다. */
const MIN_NEW_PASSWORD_LENGTH = 10;

type Copy = {
  title: string; description: string; current: string; next: string; confirm: string; hint: string;
  revokeNotice: string; submit: string; processing: string; show: string; hide: string; mismatch: string;
  tooShort: string; same: string; network: string; needLogin: string; done: string; back: string;
};

const EN: Copy = {
  title: "Change password",
  description: "Choose a new password you don't use anywhere else. Passwords found in known breaches can't be saved.",
  current: "Current password", next: "New password", confirm: "Confirm new password",
  hint: `At least ${MIN_NEW_PASSWORD_LENGTH} characters, and it can't contain your email or name.`,
  revokeNotice: "Changing your password signs you out on all other devices.",
  submit: "Change password", processing: "Changing…", show: "Show", hide: "Hide",
  mismatch: "The new password and confirmation don't match.",
  tooShort: `Your new password must be at least ${MIN_NEW_PASSWORD_LENGTH} characters.`,
  same: "Choose a value different from your current password.",
  network: "The connection is unstable, so we couldn't make the change. Please try again shortly.",
  needLogin: "Your session expired. Please log in again and try.",
  done: "Your password has been changed. You've been signed out on all other devices.",
  back: "Home",
};

const COPY: Partial<Record<LoadingLocale, Copy>> = {
  ko: {
    title: "비밀번호 변경",
    description: "새 비밀번호는 다른 사이트에서 쓰지 않는 값으로 정해 주세요. 이미 유출된 것으로 알려진 비밀번호는 저장되지 않습니다.",
    current: "현재 비밀번호", next: "새 비밀번호", confirm: "새 비밀번호 확인",
    hint: `${MIN_NEW_PASSWORD_LENGTH}자 이상, 이메일·이름을 포함하지 않아야 합니다.`,
    revokeNotice: "변경하면 다른 기기에 남아 있는 로그인이 모두 해제됩니다.",
    submit: "비밀번호 변경", processing: "변경 중...", show: "표시", hide: "숨김",
    mismatch: "새 비밀번호와 확인 값이 서로 달라요.",
    tooShort: `새 비밀번호는 ${MIN_NEW_PASSWORD_LENGTH}자 이상이어야 해요.`,
    same: "지금 쓰는 비밀번호와 다른 값을 정해 주세요.",
    network: "연결이 불안정해 변경하지 못했어요. 잠시 후 다시 시도해 주세요.",
    needLogin: "로그인이 만료됐어요. 다시 로그인한 뒤 시도해 주세요.",
    done: "비밀번호를 바꿨어요. 다른 기기의 로그인은 모두 해제됐습니다.",
    back: "홈으로",
  },
  ja: {
    title: "パスワード変更",
    description: "他のサイトで使っていない新しいパスワードを設定してください。漏えいが確認されているパスワードは保存できません。",
    current: "現在のパスワード", next: "新しいパスワード", confirm: "新しいパスワード(確認)",
    hint: `${MIN_NEW_PASSWORD_LENGTH}文字以上で、メールアドレスやお名前を含めないでください。`,
    revokeNotice: "変更すると他の端末でのログインはすべて解除されます。",
    submit: "パスワードを変更", processing: "変更中…", show: "表示", hide: "非表示",
    mismatch: "新しいパスワードと確認用の値が一致しません。",
    tooShort: `新しいパスワードは${MIN_NEW_PASSWORD_LENGTH}文字以上にしてください。`,
    same: "現在使用中のパスワードとは別の値にしてください。",
    network: "接続が不安定なため変更できませんでした。しばらくしてから再度お試しください。",
    needLogin: "ログインが期限切れです。再度ログインしてからお試しください。",
    done: "パスワードを変更しました。他の端末のログインはすべて解除されました。",
    back: "ホームへ",
  },
  "zh-CN": {
    title: "修改密码",
    description: "请设置一个未在其他网站使用过的新密码。已知曾泄露的密码将无法保存。",
    current: "当前密码", next: "新密码", confirm: "确认新密码",
    hint: `至少${MIN_NEW_PASSWORD_LENGTH}个字符,且不能包含您的邮箱或姓名。`,
    revokeNotice: "修改后,其他设备上的登录状态将全部失效。",
    submit: "修改密码", processing: "修改中…", show: "显示", hide: "隐藏",
    mismatch: "新密码与确认密码不一致。",
    tooShort: `新密码至少需要${MIN_NEW_PASSWORD_LENGTH}个字符。`,
    same: "请设置与当前密码不同的值。",
    network: "连接不稳定,未能完成修改。请稍后重试。",
    needLogin: "登录已过期,请重新登录后再试。",
    done: "密码已修改。其他设备上的登录状态已全部失效。",
    back: "返回首页",
  },
  "zh-TW": {
    title: "修改密碼",
    description: "請設定一個未在其他網站使用過的新密碼。已知曾外洩的密碼將無法儲存。",
    current: "目前密碼", next: "新密碼", confirm: "確認新密碼",
    hint: `至少${MIN_NEW_PASSWORD_LENGTH}個字元,且不能包含您的電子郵件或姓名。`,
    revokeNotice: "變更後,其他裝置上的登入狀態將全部失效。",
    submit: "變更密碼", processing: "變更中…", show: "顯示", hide: "隱藏",
    mismatch: "新密碼與確認密碼不一致。",
    tooShort: `新密碼至少需要${MIN_NEW_PASSWORD_LENGTH}個字元。`,
    same: "請設定與目前密碼不同的值。",
    network: "連線不穩定,未能完成變更。請稍後再試。",
    needLogin: "登入已逾期,請重新登入後再試。",
    done: "密碼已變更。其他裝置上的登入狀態已全部失效。",
    back: "回首頁",
  },
  vi: {
    title: "Đổi mật khẩu",
    description: "Hãy đặt mật khẩu mới mà bạn không dùng ở nơi khác. Mật khẩu từng bị rò rỉ sẽ không thể lưu.",
    current: "Mật khẩu hiện tại", next: "Mật khẩu mới", confirm: "Xác nhận mật khẩu mới",
    hint: `Ít nhất ${MIN_NEW_PASSWORD_LENGTH} ký tự và không được chứa email hoặc tên của bạn.`,
    revokeNotice: "Sau khi đổi, trạng thái đăng nhập trên các thiết bị khác sẽ bị hủy.",
    submit: "Đổi mật khẩu", processing: "Đang thay đổi…", show: "Hiện", hide: "Ẩn",
    mismatch: "Mật khẩu mới và xác nhận không khớp.",
    tooShort: `Mật khẩu mới phải có ít nhất ${MIN_NEW_PASSWORD_LENGTH} ký tự.`,
    same: "Vui lòng chọn giá trị khác với mật khẩu hiện tại.",
    network: "Kết nối không ổn định nên không thể thay đổi. Vui lòng thử lại sau.",
    needLogin: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại rồi thử lại.",
    done: "Đã đổi mật khẩu. Đăng nhập trên các thiết bị khác đã bị hủy.",
    back: "Về trang chủ",
  },
  hi: {
    title: "पासवर्ड बदलें",
    description: "एक नया पासवर्ड चुनें जो आप कहीं और उपयोग नहीं करते। ज्ञात रूप से लीक हुए पासवर्ड सहेजे नहीं जा सकते।",
    current: "मौजूदा पासवर्ड", next: "नया पासवर्ड", confirm: "नए पासवर्ड की पुष्टि करें",
    hint: `कम से कम ${MIN_NEW_PASSWORD_LENGTH} अक्षर, और इसमें आपका ईमेल या नाम नहीं होना चाहिए।`,
    revokeNotice: "बदलने पर अन्य डिवाइस पर लॉगिन स्वतः समाप्त हो जाएगा।",
    submit: "पासवर्ड बदलें", processing: "बदला जा रहा है…", show: "दिखाएँ", hide: "छिपाएँ",
    mismatch: "नया पासवर्ड और पुष्टि मेल नहीं खाते।",
    tooShort: `नया पासवर्ड कम से कम ${MIN_NEW_PASSWORD_LENGTH} अक्षर का होना चाहिए।`,
    same: "कृपया मौजूदा पासवर्ड से अलग मान चुनें।",
    network: "कनेक्शन अस्थिर होने के कारण बदलाव नहीं हो सका। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
    needLogin: "लॉगिन समय समाप्त हो गया है। कृपया दोबारा लॉग इन करके प्रयास करें।",
    done: "पासवर्ड बदल दिया गया है। अन्य डिवाइस पर लॉगिन समाप्त कर दिया गया है।",
    back: "होम पर जाएँ",
  },
  es: {
    title: "Cambiar contraseña",
    description: "Elige una nueva contraseña que no uses en otros sitios. No se pueden guardar contraseñas encontradas en filtraciones conocidas.",
    current: "Contraseña actual", next: "Nueva contraseña", confirm: "Confirmar nueva contraseña",
    hint: `Al menos ${MIN_NEW_PASSWORD_LENGTH} caracteres, y no puede contener tu correo electrónico ni tu nombre.`,
    revokeNotice: "Al cambiarla, se cerrará la sesión en todos los demás dispositivos.",
    submit: "Cambiar contraseña", processing: "Cambiando…", show: "Mostrar", hide: "Ocultar",
    mismatch: "La nueva contraseña y la confirmación no coinciden.",
    tooShort: `La nueva contraseña debe tener al menos ${MIN_NEW_PASSWORD_LENGTH} caracteres.`,
    same: "Elige un valor distinto de tu contraseña actual.",
    network: "La conexión es inestable y no se pudo realizar el cambio. Vuelve a intentarlo en breve.",
    needLogin: "Tu sesión ha caducado. Vuelve a iniciar sesión e inténtalo de nuevo.",
    done: "Tu contraseña ha sido cambiada. Se ha cerrado la sesión en todos los demás dispositivos.",
    back: "Ir al inicio",
  },
  fr: {
    title: "Changer le mot de passe",
    description: "Choisissez un nouveau mot de passe que vous n'utilisez sur aucun autre site. Les mots de passe compromis connus ne peuvent pas être enregistrés.",
    current: "Mot de passe actuel", next: "Nouveau mot de passe", confirm: "Confirmer le nouveau mot de passe",
    hint: `Au moins ${MIN_NEW_PASSWORD_LENGTH} caractères, sans votre e-mail ni votre nom.`,
    revokeNotice: "Le changement déconnectera tous les autres appareils.",
    submit: "Changer le mot de passe", processing: "Modification en cours…", show: "Afficher", hide: "Masquer",
    mismatch: "Le nouveau mot de passe et la confirmation ne correspondent pas.",
    tooShort: `Le nouveau mot de passe doit comporter au moins ${MIN_NEW_PASSWORD_LENGTH} caractères.`,
    same: "Choisissez une valeur différente de votre mot de passe actuel.",
    network: "La connexion est instable, le changement n'a pas pu être effectué. Réessayez dans un instant.",
    needLogin: "Votre session a expiré. Reconnectez-vous puis réessayez.",
    done: "Votre mot de passe a été modifié. Tous les autres appareils ont été déconnectés.",
    back: "Retour à l'accueil",
  },
  de: {
    title: "Passwort ändern",
    description: "Wähle ein neues Passwort, das du nirgendwo sonst verwendest. Passwörter aus bekannten Datenlecks können nicht gespeichert werden.",
    current: "Aktuelles Passwort", next: "Neues Passwort", confirm: "Neues Passwort bestätigen",
    hint: `Mindestens ${MIN_NEW_PASSWORD_LENGTH} Zeichen, ohne deine E-Mail-Adresse oder deinen Namen.`,
    revokeNotice: "Die Änderung meldet dich auf allen anderen Geräten ab.",
    submit: "Passwort ändern", processing: "Wird geändert…", show: "Anzeigen", hide: "Verbergen",
    mismatch: "Das neue Passwort und die Bestätigung stimmen nicht überein.",
    tooShort: `Das neue Passwort muss mindestens ${MIN_NEW_PASSWORD_LENGTH} Zeichen lang sein.`,
    same: "Wähle einen anderen Wert als dein aktuelles Passwort.",
    network: "Die Verbindung ist instabil, die Änderung war nicht möglich. Bitte versuche es in Kürze erneut.",
    needLogin: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an und versuche es noch einmal.",
    done: "Dein Passwort wurde geändert. Du wurdest auf allen anderen Geräten abgemeldet.",
    back: "Zur Startseite",
  },
  nl: {
    title: "Wachtwoord wijzigen",
    description: "Kies een nieuw wachtwoord dat je nergens anders gebruikt. Wachtwoorden die bekend zijn van datalekken kunnen niet worden opgeslagen.",
    current: "Huidig wachtwoord", next: "Nieuw wachtwoord", confirm: "Nieuw wachtwoord bevestigen",
    hint: `Minimaal ${MIN_NEW_PASSWORD_LENGTH} tekens en mag je e-mailadres of naam niet bevatten.`,
    revokeNotice: "Na het wijzigen word je op alle andere apparaten uitgelogd.",
    submit: "Wachtwoord wijzigen", processing: "Bezig met wijzigen…", show: "Tonen", hide: "Verbergen",
    mismatch: "Het nieuwe wachtwoord en de bevestiging komen niet overeen.",
    tooShort: `Het nieuwe wachtwoord moet minstens ${MIN_NEW_PASSWORD_LENGTH} tekens lang zijn.`,
    same: "Kies een andere waarde dan je huidige wachtwoord.",
    network: "De verbinding is onstabiel, de wijziging is niet gelukt. Probeer het straks opnieuw.",
    needLogin: "Je sessie is verlopen. Log opnieuw in en probeer het nogmaals.",
    done: "Je wachtwoord is gewijzigd. Je bent op alle andere apparaten uitgelogd.",
    back: "Naar de startpagina",
  },
  ms: {
    title: "Tukar kata laluan",
    description: "Pilih kata laluan baharu yang tidak anda gunakan di tempat lain. Kata laluan yang diketahui pernah bocor tidak boleh disimpan.",
    current: "Kata laluan semasa", next: "Kata laluan baharu", confirm: "Sahkan kata laluan baharu",
    hint: `Sekurang-kurangnya ${MIN_NEW_PASSWORD_LENGTH} aksara, dan tidak boleh mengandungi e-mel atau nama anda.`,
    revokeNotice: "Selepas ditukar, log masuk pada semua peranti lain akan dibatalkan.",
    submit: "Tukar kata laluan", processing: "Sedang menukar…", show: "Tunjuk", hide: "Sembunyi",
    mismatch: "Kata laluan baharu dan pengesahan tidak sepadan.",
    tooShort: `Kata laluan baharu mesti sekurang-kurangnya ${MIN_NEW_PASSWORD_LENGTH} aksara.`,
    same: "Sila pilih nilai yang berbeza daripada kata laluan semasa anda.",
    network: "Sambungan tidak stabil, penukaran tidak berjaya. Sila cuba lagi sebentar lagi.",
    needLogin: "Sesi log masuk anda telah tamat. Sila log masuk semula dan cuba lagi.",
    done: "Kata laluan anda telah ditukar. Anda telah dilog keluar daripada semua peranti lain.",
    back: "Kembali ke laman utama",
  },
};

function getCopy(locale: LoadingLocale): Copy { return COPY[locale] || EN; }

type ChangePasswordPayload = {
  ok?: boolean;
  code?: string;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: { role?: string; [key: string]: unknown };
};

export default function PasswordChangeClient() {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const copy = getCopy(locale);

  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    document.addEventListener("cd:language-change", sync);
    return () => { window.removeEventListener("languagechange", sync); document.removeEventListener("cd:language-change", sync); };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;

    if (nextPassword.length < MIN_NEW_PASSWORD_LENGTH) { setError(copy.tooShort); return; }
    if (nextPassword !== confirmPassword) { setError(copy.mismatch); return; }
    if (nextPassword === currentPassword) { setError(copy.same); return; }

    setBusy(true);
    setError("");
    try {
      const apiBase = String(getApiBaseUrl() || "").trim();
      const response = await authFetch(`${apiBase}/api/auth/password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...mobileAppAuthHeaders() },
        body: JSON.stringify({ currentPassword, newPassword: nextPassword }),
      });
      const payload = await response.json().catch(() => ({})) as ChangePasswordPayload;
      if (!response.ok) {
        setError(response.status === 401 ? copy.needLogin : (payload.message || copy.network));
        return;
      }
      // 서버가 다른 세션을 전부 폐기하고 이 기기에만 새 세션을 발급했다 — 로그인 성공 경로와
      // 같은 방식으로 반영하지 않으면 다음 요청이 방금 폐기된 토큰을 쓴다.
      if (isMobileAppRuntime() && payload.accessToken) {
        persistMobileAppAccessToken(payload.accessToken);
        persistMobileAppRefreshToken(payload.refreshToken || "");
      }
      if (payload.user) hydrateAuthSuccessUser(payload.user);
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
      setDone(true);
    } catch {
      setError(copy.network);
    } finally {
      setBusy(false);
    }
  };

  return <main className="relative min-h-[100dvh] overflow-x-hidden bg-[#090b1a] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] text-white [color-scheme:dark] sm:px-6">
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(125,92,190,.32),transparent_42%),linear-gradient(180deg,#11132a_0%,#090b1a_72%)]" />
    <div className="relative mx-auto flex min-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2.5rem)] w-full max-w-[440px] items-center py-3">
      <section className="w-full rounded-[24px] border border-[#c9b7f0]/20 bg-[#12152b] p-5 shadow-[0_24px_70px_rgba(0,0,0,.38)] sm:p-7" aria-labelledby="password-title">
        <header className="text-center">
          <h1 id="password-title" className="text-balance text-[1.55rem] font-black tracking-[-0.025em]">{copy.title}</h1>
          <p className="mx-auto mt-2 max-w-[38ch] text-pretty text-sm leading-6 text-[#d8d0ea]">{copy.description}</p>
        </header>

        <div className="my-4 min-h-6" aria-live="polite">
          {error ? <p id="password-error" role="alert" className="rounded-xl border border-[#ff8ca5]/40 bg-[#421d2a] px-3 py-2.5 text-sm text-[#ffd7df]">{error}</p> : null}
          {done ? <p role="status" className="rounded-xl border border-[#8ce0b0]/40 bg-[#123326] px-3 py-2.5 text-sm text-[#d7ffe9]">{copy.done}</p> : null}
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate aria-describedby={error ? "password-error" : undefined}>
          <Field id="password-current" label={copy.current}>
            <input id="password-current" type={reveal ? "text" : "password"} autoComplete="current-password" minLength={8} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={inputClass} />
          </Field>
          <Field id="password-next" label={copy.next}>
            <div className="relative">
              <input id="password-next" type={reveal ? "text" : "password"} autoComplete="new-password" minLength={MIN_NEW_PASSWORD_LENGTH} value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} className={`${inputClass} pr-16`} />
              <button type="button" onClick={() => setReveal((value) => !value)} aria-label={reveal ? copy.hide : copy.show} className="absolute inset-y-0 right-0 min-w-12 px-3 text-xs font-bold text-[#d6c9eb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#dbc9ff]">{reveal ? copy.hide : copy.show}</button>
            </div>
            <p className="mt-1.5 text-xs leading-5 text-[#b9aecf]">{copy.hint}</p>
          </Field>
          <Field id="password-confirm" label={copy.confirm}>
            <input id="password-confirm" type={reveal ? "text" : "password"} autoComplete="new-password" minLength={MIN_NEW_PASSWORD_LENGTH} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} />
          </Field>

          <p className="rounded-xl border border-[#c9b7f0]/18 bg-[#0d1022] px-3 py-2.5 text-xs leading-5 text-[#cfc4e5]">{copy.revokeNotice}</p>

          <button type="submit" disabled={busy} aria-busy={busy} className="min-h-12 w-full rounded-xl border border-[#b89ae8]/45 bg-[#7c5cbf] px-4 text-sm font-black text-white shadow-[0_10px_28px_rgba(65,42,116,.36)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dbc9ff] disabled:opacity-55">{busy ? copy.processing : copy.submit}</button>
        </form>

        <p className="mt-5 text-center text-sm text-[#cfc4e1]">
          <Link href="/" className="min-h-11 font-black text-[#d7c1ff] underline underline-offset-4">{copy.back}</Link>
        </p>
      </section>
    </div>
  </main>;
}

const inputClass = "min-h-12 w-full rounded-xl border border-[#c9b7f0]/25 bg-[#090b1a] px-3 text-base text-white outline-none placeholder:text-[#8e84a2] focus:border-[#b89ae8] focus:ring-2 focus:ring-[#8f6ccc]/35";

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <div><label htmlFor={id} className="mb-1.5 block text-sm font-bold text-[#e7def7]">{label}</label>{children}</div>;
}
