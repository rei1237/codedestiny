"use client";

import Link from "next/link";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { getApiBaseUrl } from "../../_lib/api-config";
import { authFetch, mobileAppAuthHeaders } from "../../_lib/auth-client";
import { formatKoreanPhoneInput, normalizeKoreanPhoneNumber } from "../../_lib/korean-phone";

type Copy = {
  title: string; description: string; current: string; none: string; next: string; consent: string;
  submit: string; processing: string; invalid: string; same: string; rateLimited: string; network: string;
  needLogin: string; done: string; back: string; privacyLinkText: string;
};

const EN: Copy = {
  title: "Change mobile number",
  description: "This number is used to verify your account and process card payments. Only Korean mobile numbers (010…) can be registered.",
  current: "Currently registered number", none: "No number registered.", next: "New mobile number",
  consent: "Collected: mobile number / Purpose: member identification, account management, payment processing / Retention: until account deletion (transaction records required by law are kept for that period)",
  submit: "Change number", processing: "Changing…", invalid: "Enter a valid mobile number.",
  same: "This is the same as your currently registered number.",
  rateLimited: "You've tried to change your number too often. Please try again shortly.",
  network: "The connection is unstable, so we couldn't make the change. Please try again shortly.",
  needLogin: "Your session expired. Please log in again and try.",
  done: "Your mobile number has been changed.", back: "Home", privacyLinkText: "Full Privacy Policy",
};

// 🔴 개인정보처리방침 2항의 이용 목적과 같은 범위여야 한다. 여기만 넓히면 고지 없는 수집이 된다(consent 문구 전 로케일 공통 원칙).
const COPY: Partial<Record<LoadingLocale, Copy>> = {
  ko: {
    title: "휴대폰 번호 변경",
    description: "계정 확인과 카드 결제 진행에 사용하는 번호예요. 국내 휴대폰 번호(010…)만 등록할 수 있어요.",
    current: "현재 등록된 번호", none: "등록된 번호가 없어요.", next: "새 휴대폰 번호",
    consent: "수집 항목 · 휴대폰 번호 / 이용 목적 · 회원 식별 및 계정 관리, 결제 진행 / 보유·이용 기간 · 회원 탈퇴 시까지(법령상 보존 의무가 있는 거래기록은 그 기간)",
    submit: "번호 변경", processing: "변경 중...", invalid: "휴대폰 번호를 정확히 입력해 주세요.",
    same: "지금 등록된 번호와 같아요.",
    rateLimited: "번호 변경을 너무 자주 시도했어요. 잠시 후 다시 시도해 주세요.",
    network: "연결이 불안정해 변경하지 못했어요. 잠시 후 다시 시도해 주세요.",
    needLogin: "로그인이 만료됐어요. 다시 로그인한 뒤 시도해 주세요.",
    done: "휴대폰 번호를 바꿨어요.", back: "홈으로", privacyLinkText: "개인정보처리방침 전문",
  },
  ja: {
    title: "携帯電話番号の変更",
    description: "アカウント確認とカード決済に使用する番号です。韓国の携帯電話番号(010…)のみ登録できます。",
    current: "現在登録されている番号", none: "登録された番号はありません。", next: "新しい携帯電話番号",
    consent: "収集項目 · 携帯電話番号 / 利用目的 · 会員識別及びアカウント管理、決済処理 / 保有・利用期間 · 退会まで(法令上の保存義務がある取引記録はその期間)",
    submit: "番号を変更", processing: "変更中…", invalid: "携帯電話番号を正しく入力してください。",
    same: "現在登録されている番号と同じです。",
    rateLimited: "番号変更の試行が多すぎます。しばらくしてから再度お試しください。",
    network: "接続が不安定なため変更できませんでした。しばらくしてから再度お試しください。",
    needLogin: "ログインが期限切れです。再度ログインしてからお試しください。",
    done: "携帯電話番号を変更しました。", back: "ホームへ", privacyLinkText: "個人情報処理方針全文",
  },
  "zh-CN": {
    title: "修改手机号码",
    description: "此号码用于账户验证和银行卡支付。仅可登记韩国手机号码(010开头)。",
    current: "目前登记的号码", none: "尚未登记号码。", next: "新手机号码",
    consent: "收集项目 · 手机号码 / 使用目的 · 会员身份识别及账户管理、支付处理 / 保留期限 · 至注销为止(法律要求保留的交易记录按该期限保留)",
    submit: "修改号码", processing: "修改中…", invalid: "请正确输入手机号码。",
    same: "与目前登记的号码相同。",
    rateLimited: "修改号码尝试过于频繁。请稍后重试。",
    network: "连接不稳定,未能完成修改。请稍后重试。",
    needLogin: "登录已过期,请重新登录后再试。",
    done: "手机号码已修改。", back: "返回首页", privacyLinkText: "隐私政策全文",
  },
  "zh-TW": {
    title: "修改手機號碼",
    description: "此號碼用於帳戶驗證與卡片付款。僅可登記韓國手機號碼(010開頭)。",
    current: "目前登記的號碼", none: "尚未登記號碼。", next: "新手機號碼",
    consent: "蒐集項目 · 手機號碼 / 使用目的 · 會員身分識別與帳戶管理、付款處理 / 保存期限 · 至退出會員為止(法令要求保存的交易紀錄按該期限保存)",
    submit: "修改號碼", processing: "修改中…", invalid: "請正確輸入手機號碼。",
    same: "與目前登記的號碼相同。",
    rateLimited: "修改號碼嘗試過於頻繁。請稍後再試。",
    network: "連線不穩定,未能完成變更。請稍後再試。",
    needLogin: "登入已逾期,請重新登入後再試。",
    done: "手機號碼已變更。", back: "回首頁", privacyLinkText: "隱私權政策全文",
  },
  vi: {
    title: "Đổi số điện thoại di động",
    description: "Số này được dùng để xác minh tài khoản và xử lý thanh toán thẻ. Chỉ có thể đăng ký số điện thoại di động Hàn Quốc (010…).",
    current: "Số hiện đang đăng ký", none: "Chưa đăng ký số nào.", next: "Số điện thoại di động mới",
    consent: "Thu thập · Số điện thoại di động / Mục đích · Xác định thành viên và quản lý tài khoản, xử lý thanh toán / Thời gian lưu giữ · Đến khi xóa tài khoản (hồ sơ giao dịch theo yêu cầu pháp luật được lưu trong thời gian đó)",
    submit: "Đổi số", processing: "Đang thay đổi…", invalid: "Vui lòng nhập đúng số điện thoại di động.",
    same: "Số này giống với số hiện đang đăng ký.",
    rateLimited: "Bạn đã thử đổi số quá nhiều lần. Vui lòng thử lại sau.",
    network: "Kết nối không ổn định nên không thể thay đổi. Vui lòng thử lại sau.",
    needLogin: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại rồi thử lại.",
    done: "Đã đổi số điện thoại di động.", back: "Về trang chủ", privacyLinkText: "Toàn văn Chính sách quyền riêng tư",
  },
  hi: {
    title: "मोबाइल नंबर बदलें",
    description: "यह नंबर खाता सत्यापन और कार्ड भुगतान के लिए उपयोग किया जाता है। केवल कोरियाई मोबाइल नंबर (010…) पंजीकृत किए जा सकते हैं।",
    current: "वर्तमान में पंजीकृत नंबर", none: "कोई नंबर पंजीकृत नहीं है।", next: "नया मोबाइल नंबर",
    consent: "संग्रह · मोबाइल नंबर / उद्देश्य · सदस्य पहचान और खाता प्रबंधन, भुगतान प्रक्रिया / अवधि · खाता हटाने तक (कानूनी रूप से आवश्यक लेनदेन रिकॉर्ड उस अवधि तक रखे जाते हैं)",
    submit: "नंबर बदलें", processing: "बदला जा रहा है…", invalid: "कृपया सही मोबाइल नंबर दर्ज करें।",
    same: "यह वर्तमान पंजीकृत नंबर जैसा ही है।",
    rateLimited: "आपने नंबर बदलने की बहुत बार कोशिश की है। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
    network: "कनेक्शन अस्थिर होने के कारण बदलाव नहीं हो सका। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
    needLogin: "लॉगिन समय समाप्त हो गया है। कृपया दोबारा लॉग इन करके प्रयास करें।",
    done: "मोबाइल नंबर बदल दिया गया है।", back: "होम पर जाएँ", privacyLinkText: "पूर्ण गोपनीयता नीति",
  },
  es: {
    title: "Cambiar número de móvil",
    description: "Este número se usa para verificar tu cuenta y procesar pagos con tarjeta. Solo se pueden registrar números de móvil coreanos (010…).",
    current: "Número registrado actualmente", none: "No hay ningún número registrado.", next: "Nuevo número de móvil",
    consent: "Recopilado: número de móvil / Finalidad: identificación de socio y gestión de cuenta, procesamiento de pagos / Conservación: hasta la eliminación de la cuenta (los registros de transacciones exigidos por ley se conservan durante ese período)",
    submit: "Cambiar número", processing: "Cambiando…", invalid: "Introduce un número de móvil válido.",
    same: "Es igual al número registrado actualmente.",
    rateLimited: "Has intentado cambiar el número demasiadas veces. Vuelve a intentarlo en breve.",
    network: "La conexión es inestable y no se pudo realizar el cambio. Vuelve a intentarlo en breve.",
    needLogin: "Tu sesión ha caducado. Vuelve a iniciar sesión e inténtalo de nuevo.",
    done: "Tu número de móvil ha sido cambiado.", back: "Ir al inicio", privacyLinkText: "Política de privacidad completa",
  },
  fr: {
    title: "Changer le numéro de mobile",
    description: "Ce numéro est utilisé pour vérifier votre compte et traiter les paiements par carte. Seuls les numéros de mobile coréens (010…) peuvent être enregistrés.",
    current: "Numéro actuellement enregistré", none: "Aucun numéro enregistré.", next: "Nouveau numéro de mobile",
    consent: "Collecte : numéro de mobile / Finalité : identification du membre et gestion du compte, traitement des paiements / Conservation : jusqu'à la suppression du compte (les registres de transactions exigés par la loi sont conservés pendant cette période)",
    submit: "Changer le numéro", processing: "Modification en cours…", invalid: "Veuillez saisir un numéro de mobile valide.",
    same: "C'est le même que le numéro actuellement enregistré.",
    rateLimited: "Vous avez essayé de changer le numéro trop souvent. Réessayez dans un instant.",
    network: "La connexion est instable, le changement n'a pas pu être effectué. Réessayez dans un instant.",
    needLogin: "Votre session a expiré. Reconnectez-vous puis réessayez.",
    done: "Votre numéro de mobile a été modifié.", back: "Retour à l'accueil", privacyLinkText: "Politique de confidentialité complète",
  },
  de: {
    title: "Mobilnummer ändern",
    description: "Diese Nummer wird zur Kontoprüfung und für Kartenzahlungen verwendet. Es können nur koreanische Mobilnummern (010…) registriert werden.",
    current: "Derzeit registrierte Nummer", none: "Keine Nummer registriert.", next: "Neue Mobilnummer",
    consent: "Erhebung: Mobilnummer / Zweck: Mitgliedsidentifikation und Kontoverwaltung, Zahlungsabwicklung / Speicherdauer: bis zur Kontolöschung (gesetzlich vorgeschriebene Transaktionsaufzeichnungen werden für diesen Zeitraum aufbewahrt)",
    submit: "Nummer ändern", processing: "Wird geändert…", invalid: "Bitte gib eine gültige Mobilnummer ein.",
    same: "Das ist dieselbe wie die derzeit registrierte Nummer.",
    rateLimited: "Du hast zu oft versucht, die Nummer zu ändern. Bitte versuche es in Kürze erneut.",
    network: "Die Verbindung ist instabil, die Änderung war nicht möglich. Bitte versuche es in Kürze erneut.",
    needLogin: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an und versuche es noch einmal.",
    done: "Deine Mobilnummer wurde geändert.", back: "Zur Startseite", privacyLinkText: "Vollständige Datenschutzrichtlinie",
  },
  nl: {
    title: "Mobiel nummer wijzigen",
    description: "Dit nummer wordt gebruikt om je account te verifiëren en kaartbetalingen te verwerken. Alleen Koreaanse mobiele nummers (010…) kunnen worden geregistreerd.",
    current: "Momenteel geregistreerd nummer", none: "Geen nummer geregistreerd.", next: "Nieuw mobiel nummer",
    consent: "Verzameld: mobiel nummer / Doel: identificatie van leden en accountbeheer, betalingsverwerking / Bewaartermijn: tot verwijdering van het account (wettelijk verplichte transactiegegevens worden gedurende die periode bewaard)",
    submit: "Nummer wijzigen", processing: "Bezig met wijzigen…", invalid: "Voer een geldig mobiel nummer in.",
    same: "Dit is hetzelfde als het momenteel geregistreerde nummer.",
    rateLimited: "Je hebt te vaak geprobeerd het nummer te wijzigen. Probeer het straks opnieuw.",
    network: "De verbinding is onstabiel, de wijziging is niet gelukt. Probeer het straks opnieuw.",
    needLogin: "Je sessie is verlopen. Log opnieuw in en probeer het nogmaals.",
    done: "Je mobiele nummer is gewijzigd.", back: "Naar de startpagina", privacyLinkText: "Volledig privacybeleid",
  },
  ms: {
    title: "Tukar nombor telefon bimbit",
    description: "Nombor ini digunakan untuk mengesahkan akaun anda dan memproses bayaran kad. Hanya nombor telefon bimbit Korea (010…) boleh didaftarkan.",
    current: "Nombor yang didaftarkan sekarang", none: "Tiada nombor didaftarkan.", next: "Nombor telefon bimbit baharu",
    consent: "Dikumpul · Nombor telefon bimbit / Tujuan · Pengenalan ahli dan pengurusan akaun, pemprosesan bayaran / Tempoh simpanan · Sehingga akaun dipadam (rekod transaksi yang dikehendaki oleh undang-undang disimpan untuk tempoh tersebut)",
    submit: "Tukar nombor", processing: "Sedang menukar…", invalid: "Sila masukkan nombor telefon bimbit yang sah.",
    same: "Ini sama dengan nombor yang didaftarkan sekarang.",
    rateLimited: "Anda telah cuba menukar nombor terlalu kerap. Sila cuba lagi sebentar lagi.",
    network: "Sambungan tidak stabil, penukaran tidak berjaya. Sila cuba lagi sebentar lagi.",
    needLogin: "Sesi log masuk anda telah tamat. Sila log masuk semula dan cuba lagi.",
    done: "Nombor telefon bimbit anda telah ditukar.", back: "Kembali ke laman utama", privacyLinkText: "Dasar Privasi Penuh",
  },
};

function getCopy(locale: LoadingLocale): Copy { return COPY[locale] || EN; }

type PhonePayload = {
  ok?: boolean;
  code?: string;
  message?: string;
  updated?: boolean;
  hasPhone?: boolean;
  maskedPhone?: string;
};

export default function PhoneChangeClient() {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const [maskedPhone, setMaskedPhone] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const copy = getCopy(locale);

  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    window.addEventListener("cd:locale-ready", sync);
    return () => { window.removeEventListener("languagechange", sync); window.removeEventListener("cd:locale-ready", sync); };
  }, []);

  // 현재 번호는 마스킹된 형태로만 받아 화면에 띄운다(원문을 굳이 이 화면까지 끌고 오지 않는다).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const apiBase = String(getApiBaseUrl() || "").trim();
        const response = await authFetch(`${apiBase}/api/auth/me/payment-phone`, {
          credentials: "include",
          headers: { ...mobileAppAuthHeaders() },
        });
        const payload = await response.json().catch(() => ({})) as PhonePayload;
        if (!cancelled && response.ok) setMaskedPhone(String(payload.maskedPhone || ""));
      } catch {
        /* 현재 번호를 못 읽어도 변경 자체는 할 수 있다 — 조회 실패로 화면을 막지 않는다 */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;

    const normalized = normalizeKoreanPhoneNumber(phone);
    if (!normalized) { setError(copy.invalid); setDone(false); return; }

    setBusy(true);
    setError("");
    setDone(false);
    try {
      const apiBase = String(getApiBaseUrl() || "").trim();
      const response = await authFetch(`${apiBase}/api/auth/me/phone-number`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...mobileAppAuthHeaders() },
        body: JSON.stringify({ phoneNumber: normalized }),
      });
      const payload = await response.json().catch(() => ({})) as PhonePayload;
      if (!response.ok) {
        if (response.status === 401) setError(copy.needLogin);
        else if (response.status === 429) setError(copy.rateLimited);
        else setError(payload.message || copy.network);
        return;
      }
      setMaskedPhone(String(payload.maskedPhone || ""));
      setPhone("");
      if (payload.updated === false) setError(copy.same);
      else setDone(true);
    } catch {
      setError(copy.network);
    } finally {
      setBusy(false);
    }
  };

  return <main className="relative min-h-[100dvh] overflow-x-hidden bg-[#090b1a] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] text-white [color-scheme:dark] sm:px-6">
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(125,92,190,.32),transparent_42%),linear-gradient(180deg,#11132a_0%,#090b1a_72%)]" />
    <div className="relative mx-auto flex min-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2.5rem)] w-full max-w-[440px] items-center py-3">
      <section className="w-full rounded-[24px] border border-[#c9b7f0]/20 bg-[#12152b] p-5 shadow-[0_24px_70px_rgba(0,0,0,.38)] sm:p-7" aria-labelledby="phone-title">
        <header className="text-center">
          <h1 id="phone-title" className="text-balance text-[1.55rem] font-black tracking-[-0.025em]">{copy.title}</h1>
          <p className="mx-auto mt-2 max-w-[38ch] text-pretty text-sm leading-6 text-[#d8d0ea]">{copy.description}</p>
        </header>

        <div className="my-4 min-h-6" aria-live="polite">
          {error ? <p id="phone-error" role="alert" className="rounded-xl border border-[#ff8ca5]/40 bg-[#421d2a] px-3 py-2.5 text-sm text-[#ffd7df]">{error}</p> : null}
          {done ? <p role="status" className="rounded-xl border border-[#8ce0b0]/40 bg-[#123326] px-3 py-2.5 text-sm text-[#d7ffe9]">{copy.done}</p> : null}
        </div>

        <p className="rounded-xl border border-[#c9b7f0]/18 bg-[#0d1022] px-3 py-2.5 text-sm leading-6 text-[#cfc4e5]">
          <span className="font-bold text-[#e7def7]">{copy.current}</span>{" · "}
          <span>{loaded ? (maskedPhone || copy.none) : "…"}</span>
        </p>

        <form onSubmit={submit} className="mt-4 space-y-4" noValidate aria-describedby={error ? "phone-error" : undefined}>
          <Field id="phone-next" label={copy.next}>
            <input id="phone-next" type="tel" inputMode="numeric" autoComplete="tel" maxLength={13} placeholder="010-1234-5678" value={phone} onChange={(event) => setPhone(formatKoreanPhoneInput(event.target.value))} className={inputClass} />
          </Field>

          <p className="rounded-xl border border-[#c9b7f0]/18 bg-[#0d1022] px-3 py-2.5 text-xs leading-5 text-[#cfc4e5]">{copy.consent}</p>

          <button type="submit" disabled={busy} aria-busy={busy} className="min-h-12 w-full rounded-xl border border-[#b89ae8]/45 bg-[#7c5cbf] px-4 text-sm font-black text-white shadow-[0_10px_28px_rgba(65,42,116,.36)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dbc9ff] disabled:opacity-55">{busy ? copy.processing : copy.submit}</button>
        </form>

        <p className="mt-5 text-center text-sm text-[#cfc4e1]">
          <Link href="/privacy" target="_blank" className="min-h-11 font-black text-[#d7c1ff] underline underline-offset-4">{copy.privacyLinkText}</Link>
          <span className="mx-2 text-[#8e84a2]">·</span>
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
