"use client";

import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type LoginStatus = "idle" | "loading" | "success" | "error";

type StarlightLoginPortalProps = {
  status: LoginStatus;
  message?: string;
  error?: string | null;
};

const STARLIGHT_LOGIN_COPY: Record<LoadingLocale, {
  title: Record<Exclude<LoginStatus, "idle">, string>;
  description: Record<Exclude<LoginStatus, "idle">, string>;
}> = {
  ko: {
    title: { loading: "별빛 포털을 여는 중...", success: "별빛 여정이 시작되었습니다.", error: "별빛 연결에 실패했습니다." },
    description: { loading: "당신의 운명 데이터를 안전하게 불러오고 있습니다.", success: "잠시만 기다려 주세요. 메인 화면으로 이동합니다.", error: "입력 정보 또는 네트워크 상태를 확인해 주세요." },
  },
  en: {
    title: { loading: "Opening the starlight portal...", success: "Your starlight journey has begun.", error: "The starlight connection failed." },
    description: { loading: "Your destiny data is being loaded securely.", success: "Please wait while we move you to the main screen.", error: "Please check your input or network connection." },
  },
  ja: {
    title: { loading: "星明かりのポータルを開いています...", success: "星明かりの旅が始まりました。", error: "星明かりとの接続に失敗しました。" },
    description: { loading: "あなたの運命データを安全に読み込んでいます。", success: "しばらくお待ちください。メイン画面へ移動します。", error: "入力内容またはネットワーク状態をご確認ください。" },
  },
  "zh-CN": {
    title: { loading: "正在开启星光传送门...", success: "星光旅程已开始。", error: "星光连接失败。" },
    description: { loading: "正在安全加载你的命运数据。", success: "请稍候，即将前往主页面。", error: "请检查输入信息或网络状态。" },
  },
  "zh-TW": {
    title: { loading: "正在開啟星光傳送門...", success: "星光旅程已開始。", error: "星光連線失敗。" },
    description: { loading: "正在安全載入你的命運資料。", success: "請稍候，即將前往主畫面。", error: "請檢查輸入資訊或網路狀態。" },
  },
  vi: {
    title: { loading: "Đang mở cổng ánh sao...", success: "Hành trình ánh sao đã bắt đầu.", error: "Kết nối ánh sao thất bại." },
    description: { loading: "Dữ liệu vận mệnh của bạn đang được tải an toàn.", success: "Vui lòng chờ trong giây lát. Bạn sẽ được đưa về màn hình chính.", error: "Vui lòng kiểm tra thông tin đã nhập hoặc trạng thái mạng." },
  },
  hi: {
    title: { loading: "तारों का पोर्टल खुल रहा है...", success: "आपकी तारों भरी यात्रा शुरू हो गई है.", error: "तारों से कनेक्शन असफल रहा." },
    description: { loading: "आपका भाग्य डेटा सुरक्षित रूप से लोड हो रहा है.", success: "कृपया प्रतीक्षा करें. आपको मुख्य स्क्रीन पर ले जाया जा रहा है.", error: "कृपया दर्ज जानकारी या नेटवर्क स्थिति जांचें." },
  },
  es: {
    title: { loading: "Abriendo el portal estelar...", success: "Tu viaje estelar ha comenzado.", error: "Falló la conexión estelar." },
    description: { loading: "Tus datos de destino se están cargando de forma segura.", success: "Espera un momento. Te llevaremos a la pantalla principal.", error: "Revisa la información ingresada o el estado de la red." },
  },
  fr: {
    title: { loading: "Ouverture du portail stellaire...", success: "Votre voyage stellaire commence.", error: "La connexion stellaire a échoué." },
    description: { loading: "Vos données de destinée se chargent en toute sécurité.", success: "Veuillez patienter. Vous allez être redirigé vers l'écran principal.", error: "Vérifiez les informations saisies ou l'état du réseau." },
  },
  de: {
    title: { loading: "Das Sternenportal wird geöffnet...", success: "Deine Sternenreise hat begonnen.", error: "Die Sternenverbindung ist fehlgeschlagen." },
    description: { loading: "Deine Schicksalsdaten werden sicher geladen.", success: "Bitte warte kurz. Du wirst zur Hauptseite weitergeleitet.", error: "Bitte prüfe deine Eingaben oder die Netzwerkverbindung." },
  },
  nl: {
    title: { loading: "Het sterrenportaal wordt geopend...", success: "Je sterrenreis is begonnen.", error: "De sterrenverbinding is mislukt." },
    description: { loading: "Je lotsgegevens worden veilig geladen.", success: "Even geduld. Je gaat naar het hoofdscherm.", error: "Controleer je invoer of netwerkverbinding." },
  },
  ms: {
    title: { loading: "Membuka portal cahaya bintang...", success: "Perjalanan cahaya bintang anda telah bermula.", error: "Sambungan cahaya bintang gagal." },
    description: { loading: "Data takdir anda sedang dimuatkan dengan selamat.", success: "Sila tunggu sebentar. Anda akan dibawa ke skrin utama.", error: "Sila semak maklumat yang dimasukkan atau status rangkaian." },
  },
};

function statusTitle(status: LoginStatus, copy: (typeof STARLIGHT_LOGIN_COPY)[LoadingLocale]) {
  if (status === "loading" || status === "success" || status === "error") return copy.title[status];
  return "";
}

function statusDescription(status: LoginStatus, copy: (typeof STARLIGHT_LOGIN_COPY)[LoadingLocale], message?: string, error?: string | null) {
  if (status === "loading") {
    return message || copy.description.loading;
  }
  if (status === "success") {
    return message || copy.description.success;
  }
  if (status === "error") {
    return error || message || copy.description.error;
  }
  return "";
}

export default function StarlightLoginPortal({ status, message, error }: StarlightLoginPortalProps) {
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const copy = STARLIGHT_LOGIN_COPY[locale] || STARLIGHT_LOGIN_COPY.ko;

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());
  }, []);

  if (status === "idle") return null;

  const title = statusTitle(status, copy);
  const description = statusDescription(status, copy, message, error);

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_20%_12%,rgba(140,120,255,0.22),transparent_38%),radial-gradient(circle_at_80%_24%,rgba(37,99,235,0.22),transparent_42%),linear-gradient(155deg,#050914_0%,#090f22_42%,#1a1438_72%,#281748_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:radial-gradient(circle_at_10%_18%,rgba(255,255,255,0.4)_0_1.2px,transparent_2px),radial-gradient(circle_at_42%_72%,rgba(255,255,255,0.36)_0_1px,transparent_2px),radial-gradient(circle_at_78%_32%,rgba(255,255,255,0.38)_0_1.1px,transparent_2px),radial-gradient(circle_at_88%_76%,rgba(255,255,255,0.34)_0_1px,transparent_2px)]" />
      <div className="pointer-events-none absolute -left-16 top-20 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-12 bottom-20 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl" />

      <div className="relative mx-4 w-full max-w-md rounded-3xl border border-indigo-200/20 bg-slate-950/55 p-8 text-center shadow-[0_30px_80px_rgba(8,10,30,0.7)] backdrop-blur-xl">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center">
          <div className={`absolute h-24 w-24 rounded-full border ${status === "error" ? "border-rose-300/45" : "border-indigo-300/30"}`} />
          <div className={`absolute h-20 w-20 rounded-full border-t-2 ${status === "error" ? "border-rose-300/80" : "border-indigo-300/85"} animate-spin`} />
          <div
            className={`absolute h-14 w-14 rounded-full border-t-2 ${status === "error" ? "border-rose-200/85" : "border-amber-300/85"} animate-spin`}
            style={{ animationDuration: "1.35s", animationDirection: "reverse" }}
          />
          <span className={`text-2xl ${status === "error" ? "text-rose-200" : "text-amber-200"}`}>{status === "error" ? "✹" : "✶"}</span>
        </div>

        <p className="text-lg font-bold tracking-[0.01em] text-white">{title}</p>
        <p className={`mt-3 text-sm leading-6 ${status === "error" ? "text-rose-100/90" : "text-indigo-100/85"}`}>{description}</p>

        {status === "loading" ? (
          <p className="mt-4 text-xs font-semibold tracking-[0.16em] text-amber-200/85">STARLIGHT LOGIN PORTAL</p>
        ) : null}

        {status === "success" ? (
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="flex w-full items-center gap-3 rounded-2xl border border-violet-300/20 bg-violet-500/10 px-4 py-3 backdrop-blur-sm">
              <div className="h-10 w-10 flex-shrink-0 animate-pulse rounded-full bg-gradient-to-br from-violet-400/50 to-indigo-400/50" />
              <div className="flex flex-1 flex-col items-start gap-1.5">
                <div className="h-2.5 w-24 animate-pulse rounded-full bg-violet-300/40" />
                <div className="h-2 w-16 animate-pulse rounded-full bg-violet-300/25" />
              </div>
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-400/20">
                <span className="text-xs text-emerald-300">✓</span>
              </div>
            </div>
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300/60"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export type { LoginStatus };
