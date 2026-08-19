"use client";

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import React, { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";

interface EmailSubscriptionSectionProps {
  birthYear?: number;
}

const EMAIL_SUBSCRIPTION_COPY: Record<LoadingLocale, {
  badge: string;
  headingPrefix: string;
  headingHighlight: string;
  description: string;
  placeholder: string;
  submitting: string;
  subscribe: string;
  privacyNote: string;
  success: string;
  error: string;
  serverError: string;
  birthToggle: string;
  birthHint: string;
  calSolar: string;
  calLunar: string;
}> = {
  ko: {
    badge: "매일 오전 7시 배달",
    headingPrefix: "내 운명을 바꾸는",
    headingHighlight: "오늘의 맞춤 운세 레터",
    description: "매일 아침, 당신만을 위한 행운 가이드를 이메일로 보내드립니다.",
    placeholder: "운세를 받을 이메일 주소",
    submitting: "신청 중...",
    subscribe: "구독하기",
    privacyNote: "* 구독 해지는 언제든 가능하며, 개인정보는 운세 발송용으로만 사용됩니다.",
    success: "구독 신청이 완료되었습니다! 내일부터 맞춤 운세를 보내드릴게요.",
    error: "구독 신청 중 오류가 발생했습니다.",
    serverError: "서버와 통신 중 오류가 발생했습니다.",
    birthToggle: "맞춤 운세를 위한 생년정보 입력 (선택)",
    birthHint: "생년월일·태어난 시각을 등록하면 사주 기반 개인 운세로 보내드려요. 비워두면 오늘의 운세를 보내드립니다.",
    calSolar: "양력",
    calLunar: "음력",
  },
  en: {
    badge: "Delivered daily at 7 AM",
    headingPrefix: "A daily letter to shift your destiny",
    headingHighlight: "Personalized Fortune Letter",
    description: "Every morning, receive a luck guide written just for you.",
    placeholder: "Email address for your fortune",
    submitting: "Submitting...",
    subscribe: "Subscribe",
    privacyNote: "* You can unsubscribe anytime. Personal information is used only to send your fortune letter.",
    success: "Your subscription is complete. Your personalized fortune letter starts tomorrow.",
    error: "Something went wrong while subscribing.",
    serverError: "Could not reach the server.",
    birthToggle: "Add birth details for a personalized reading (optional)",
    birthHint: "Register your birth date and time for a saju-based personal fortune. Leave blank to receive today's general fortune.",
    calSolar: "Solar",
    calLunar: "Lunar",
  },
  ja: {
    badge: "毎朝7時にお届け",
    headingPrefix: "運命の流れを整える",
    headingHighlight: "今日のパーソナル占いレター",
    description: "毎朝、あなただけの幸運ガイドをメールでお届けします。",
    placeholder: "占いレターを受け取るメールアドレス",
    submitting: "申請中...",
    subscribe: "登録する",
    privacyNote: "* 配信停止はいつでも可能です。個人情報は占いレターの送信にのみ使用されます。",
    success: "登録が完了しました。明日からパーソナル占いレターをお届けします。",
    error: "登録中にエラーが発生しました。",
    serverError: "サーバーとの通信中にエラーが発生しました。",
    birthToggle: "パーソナル占いのための生年情報入力（任意）",
    birthHint: "生年月日と生まれた時刻を登録すると四柱推命に基づく個人占いをお届けします。未入力の場合は今日の占いをお送りします。",
    calSolar: "新暦",
    calLunar: "旧暦",
  },
  "zh-CN": {
    badge: "每天上午7点送达",
    headingPrefix: "改变命运节奏的",
    headingHighlight: "今日个性化运势信",
    description: "每天早晨，把只属于你的幸运指南发送到邮箱。",
    placeholder: "接收运势的邮箱地址",
    submitting: "提交中...",
    subscribe: "订阅",
    privacyNote: "* 可随时取消订阅，个人信息仅用于发送运势邮件。",
    success: "订阅已完成！明天起将发送你的个性化运势信。",
    error: "订阅申请时发生错误。",
    serverError: "与服务器通信时发生错误。",
    birthToggle: "填写出生信息以获得个性化运势（可选）",
    birthHint: "登记出生日期与时辰后，将发送基于八字的个人运势。留空则发送今日运势。",
    calSolar: "阳历",
    calLunar: "阴历",
  },
  "zh-TW": {
    badge: "每天上午7點送達",
    headingPrefix: "改變命運節奏的",
    headingHighlight: "今日個人化運勢信",
    description: "每天早晨，把只屬於你的幸運指南寄到信箱。",
    placeholder: "接收運勢的電子郵件",
    submitting: "提交中...",
    subscribe: "訂閱",
    privacyNote: "* 可隨時取消訂閱，個人資料僅用於寄送運勢郵件。",
    success: "訂閱已完成！明天起將寄送你的個人化運勢信。",
    error: "訂閱申請時發生錯誤。",
    serverError: "與伺服器通訊時發生錯誤。",
    birthToggle: "填寫出生資訊以獲得個人化運勢（選填）",
    birthHint: "登記出生日期與時辰後，將寄送基於八字的個人運勢。留空則寄送今日運勢。",
    calSolar: "陽曆",
    calLunar: "陰曆",
  },
  vi: {
    badge: "Gửi mỗi ngày lúc 7 giờ sáng",
    headingPrefix: "Lá thư giúp đổi nhịp vận mệnh",
    headingHighlight: "Bản tin vận may cá nhân hôm nay",
    description: "Mỗi sáng, chúng tôi gửi đến bạn một chỉ dẫn may mắn được viết riêng.",
    placeholder: "Email nhận vận may",
    submitting: "Đang gửi...",
    subscribe: "Đăng ký",
    privacyNote: "* Bạn có thể hủy bất cứ lúc nào. Thông tin cá nhân chỉ dùng để gửi bản tin vận may.",
    success: "Đăng ký hoàn tất. Từ ngày mai bạn sẽ nhận bản tin vận may cá nhân.",
    error: "Đã xảy ra lỗi khi đăng ký.",
    serverError: "Đã xảy ra lỗi khi liên lạc với máy chủ.",
    birthToggle: "Nhập thông tin ngày sinh để cá nhân hóa (tùy chọn)",
    birthHint: "Đăng ký ngày giờ sinh để nhận vận may cá nhân dựa trên tứ trụ. Để trống sẽ nhận vận may hôm nay.",
    calSolar: "Dương lịch",
    calLunar: "Âm lịch",
  },
  hi: {
    badge: "हर दिन सुबह 7 बजे",
    headingPrefix: "भाग्य की दिशा बदलने वाला",
    headingHighlight: "आज का व्यक्तिगत भाग्य पत्र",
    description: "हर सुबह आपके लिए लिखा गया सौभाग्य मार्गदर्शन ईमेल से मिलेगा.",
    placeholder: "भाग्य पत्र पाने का ईमेल",
    submitting: "भेजा जा रहा है...",
    subscribe: "सदस्यता लें",
    privacyNote: "* आप कभी भी सदस्यता समाप्त कर सकते हैं. निजी जानकारी केवल भाग्य पत्र भेजने के लिए उपयोग होगी.",
    success: "सदस्यता पूरी हुई. कल से आपका व्यक्तिगत भाग्य पत्र भेजा जाएगा.",
    error: "सदस्यता के दौरान त्रुटि हुई.",
    serverError: "सर्वर से संचार में त्रुटि हुई.",
    birthToggle: "व्यक्तिगत भाग्य के लिए जन्म विवरण दर्ज करें (वैकल्पिक)",
    birthHint: "जन्म तिथि व समय दर्ज करें और साजू आधारित व्यक्तिगत भाग्य पाएं. खाली छोड़ने पर आज का भाग्य भेजा जाएगा.",
    calSolar: "सौर",
    calLunar: "चंद्र",
  },
  es: {
    badge: "Entrega diaria a las 7 AM",
    headingPrefix: "Una carta para mover tu destino",
    headingHighlight: "Carta de fortuna personalizada",
    description: "Cada mañana recibirás una guía de suerte escrita para ti.",
    placeholder: "Email para recibir tu fortuna",
    submitting: "Enviando...",
    subscribe: "Suscribirse",
    privacyNote: "* Puedes cancelar cuando quieras. Tus datos solo se usan para enviar la carta de fortuna.",
    success: "Suscripción completada. Desde mañana recibirás tu carta personalizada.",
    error: "Ocurrió un error al suscribirte.",
    serverError: "Ocurrió un error al comunicarse con el servidor.",
    birthToggle: "Añade tus datos de nacimiento para personalizar (opcional)",
    birthHint: "Registra tu fecha y hora de nacimiento para una fortuna personal basada en saju. Déjalo vacío para la fortuna de hoy.",
    calSolar: "Solar",
    calLunar: "Lunar",
  },
  fr: {
    badge: "Livré chaque jour à 7 h",
    headingPrefix: "La lettre qui éclaire votre destinée",
    headingHighlight: "Lettre de fortune personnalisée",
    description: "Chaque matin, recevez un guide de chance écrit pour vous.",
    placeholder: "Email pour recevoir votre fortune",
    submitting: "Envoi...",
    subscribe: "S'abonner",
    privacyNote: "* Vous pouvez vous désabonner à tout moment. Vos données servent uniquement à envoyer la lettre.",
    success: "Abonnement confirmé. Votre lettre personnalisée commencera demain.",
    error: "Une erreur est survenue pendant l'abonnement.",
    serverError: "Erreur de communication avec le serveur.",
    birthToggle: "Ajoutez vos infos de naissance pour personnaliser (facultatif)",
    birthHint: "Renseignez votre date et heure de naissance pour une fortune personnelle basée sur le saju. Laissez vide pour la fortune du jour.",
    calSolar: "Solaire",
    calLunar: "Lunaire",
  },
  de: {
    badge: "Täglich um 7 Uhr",
    headingPrefix: "Ein Brief, der dein Schicksal bewegt",
    headingHighlight: "Persönlicher Tagesglücksbrief",
    description: "Jeden Morgen erhältst du deinen persönlichen Glücksrat per E-Mail.",
    placeholder: "E-Mail-Adresse für dein Horoskop",
    submitting: "Wird gesendet...",
    subscribe: "Abonnieren",
    privacyNote: "* Du kannst jederzeit kündigen. Persönliche Daten werden nur für den Versand verwendet.",
    success: "Abo abgeschlossen. Dein persönlicher Glücksbrief startet morgen.",
    error: "Beim Abonnieren ist ein Fehler aufgetreten.",
    serverError: "Fehler bei der Kommunikation mit dem Server.",
    birthToggle: "Geburtsdaten für ein persönliches Horoskop (optional)",
    birthHint: "Gib Geburtsdatum und -zeit an für ein Saju-basiertes persönliches Horoskop. Leer lassen für das heutige Horoskop.",
    calSolar: "Solar",
    calLunar: "Lunar",
  },
  nl: {
    badge: "Dagelijks om 7 uur",
    headingPrefix: "Een brief die je lot in beweging zet",
    headingHighlight: "Persoonlijke geluksbrief van vandaag",
    description: "Elke ochtend ontvang je een persoonlijke geluksgids per e-mail.",
    placeholder: "E-mailadres voor je geluksbrief",
    submitting: "Verzenden...",
    subscribe: "Abonneren",
    privacyNote: "* Je kunt altijd opzeggen. Persoonsgegevens worden alleen gebruikt voor verzending.",
    success: "Abonnement voltooid. Je persoonlijke geluksbrief start morgen.",
    error: "Er is een fout opgetreden bij het abonneren.",
    serverError: "Er is een fout opgetreden bij de servercommunicatie.",
    birthToggle: "Voeg geboortegegevens toe voor personalisatie (optioneel)",
    birthHint: "Registreer je geboortedatum en -tijd voor een persoonlijk saju-horoscoop. Laat leeg voor het horoscoop van vandaag.",
    calSolar: "Zonne",
    calLunar: "Maan",
  },
  ms: {
    badge: "Dihantar setiap hari jam 7 pagi",
    headingPrefix: "Surat yang mengubah aliran takdir",
    headingHighlight: "Surat nasib peribadi hari ini",
    description: "Setiap pagi, panduan tuah khas untuk anda dihantar melalui e-mel.",
    placeholder: "Alamat e-mel untuk menerima nasib",
    submitting: "Menghantar...",
    subscribe: "Langgan",
    privacyNote: "* Langganan boleh dihentikan bila-bila masa. Maklumat peribadi hanya digunakan untuk penghantaran.",
    success: "Langganan selesai. Surat nasib peribadi anda bermula esok.",
    error: "Ralat berlaku semasa melanggan.",
    serverError: "Ralat berlaku semasa berhubung dengan pelayan.",
    birthToggle: "Isi maklumat kelahiran untuk peribadikan (pilihan)",
    birthHint: "Daftar tarikh dan masa lahir untuk nasib peribadi berdasarkan saju. Biarkan kosong untuk nasib hari ini.",
    calSolar: "Suria",
    calLunar: "Qamari",
  },
};

export default function EmailSubscriptionSection({ birthYear }: EmailSubscriptionSectionProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const [showBirth, setShowBirth] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [calType, setCalType] = useState<"solar" | "lunar">("solar");
  const copy = EMAIL_SUBSCRIPTION_COPY[locale] || EMAIL_SUBSCRIPTION_COPY.ko;
  const { seed } = useAiProfileSeed();

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());
  }, []);

  // 프로필 카드에서 생년정보 자동 프리필 — 빈 값만 채우고 사용자 입력은 덮어쓰지 않음
  useEffect(() => {
    if (!seed) return;
    if (seed.birthDate) {
      setBirthDate((prev) => prev || seed.birthDate || "");
      setShowBirth(true);
    }
    if (!seed.birthTimeUnknown && seed.birthTime) {
      setBirthTime((prev) => prev || seed.birthTime || "");
    }
    if (seed.calendarType) {
      setCalType((prev) => (prev === "solar" ? (seed.calendarType as "solar" | "lunar") : prev));
    }
  }, [seed]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setStatus("idle");

    const payload: Record<string, unknown> = {
      email,
      birthYear,
      source: "kkulkkul-main",
      subDaily: true,
    };
    // 생년정보가 있으면 서버가 사주 스냅샷을 계산해 개인화 발송, 없으면 범용 오늘의 운세로 폴백
    if (birthDate) {
      payload.birthDate = birthDate;
      payload.calendarType = calType;
      if (birthTime) {
        const [hh, mm] = birthTime.split(":");
        payload.birthHour = Number(hh);
        payload.birthMinute = Number(mm || 0);
        payload.birthTimeUnknown = false;
      } else {
        payload.birthTimeUnknown = true;
      }
      if (seed?.gender) payload.gender = seed.gender;
    }

    try {
      const response = await fetch("/api/subscriptions/daily-fortune", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(copy.success);
        setEmail("");
      } else {
        setStatus("error");
        const serverMessage = String(data.message || "");
        setMessage(serverMessage && (locale === "ko" || !/[가-힣]/.test(serverMessage)) ? serverMessage : copy.error);
      }
    } catch {
      setStatus("error");
      setMessage(copy.serverError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-8 rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 shadow-sm">
      <div className="flex flex-col items-center text-center md:flex-row md:text-left md:justify-between gap-6">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            {copy.badge}
          </div>
          <h2 className="text-2xl font-black text-indigo-900 leading-tight">
            {copy.headingPrefix} <br className="md:hidden" />
            <span className="text-purple-600">{copy.headingHighlight}</span>
          </h2>
          <p className="mt-2 text-sm text-indigo-700/80 font-medium">
            {copy.description}
          </p>
        </div>

        <div className="w-full max-w-sm">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <input
                type="email"
                placeholder={copy.placeholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || status === "success"}
                className="w-full rounded-2xl border-2 border-indigo-100 bg-white px-5 py-4 text-sm font-medium focus:border-indigo-500 focus:outline-none disabled:bg-indigo-50/50"
              />
              <button
                type="submit"
                disabled={loading || status === "success"}
                className="absolute right-2 top-2 bottom-2 rounded-xl bg-indigo-600 px-6 text-sm font-black text-white transition-all hover:bg-indigo-700 disabled:bg-neutral-300"
              >
                {loading ? copy.submitting : copy.subscribe}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowBirth((v) => !v)}
              disabled={loading || status === "success"}
              aria-expanded={showBirth}
              className="flex w-full items-center justify-center gap-1 text-xs font-bold text-indigo-500 transition-colors hover:text-indigo-700 disabled:text-indigo-300"
            >
              <span>{copy.birthToggle}</span>
              <span className={`transition-transform ${showBirth ? "rotate-180" : ""}`}>▾</span>
            </button>

            {showBirth && (
              <div className="space-y-2 rounded-2xl border border-indigo-100 bg-white/70 p-3">
                <div className="flex gap-2">
                  <input {...birthDateTextInputProps(birthDate, (nextBirthDate) => setBirthDate(nextBirthDate))} disabled={loading || status === "success"} aria-label={copy.birthToggle} className="min-w-0 flex-1 rounded-xl border border-indigo-100 bg-white px-3 py-2.5 text-sm font-medium focus:border-indigo-500 focus:outline-none" />
                  <input
                    type="time"
                    value={birthTime}
                    onChange={(e) => setBirthTime(e.target.value)}
                    disabled={loading || status === "success"}
                    aria-label={copy.birthToggle}
                    className="w-28 rounded-xl border border-indigo-100 bg-white px-3 py-2.5 text-sm font-medium focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  {(["solar", "lunar"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setCalType(type)}
                      disabled={loading || status === "success"}
                      className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                        calType === type
                          ? "bg-indigo-600 text-white"
                          : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                      }`}
                    >
                      {type === "solar" ? copy.calSolar : copy.calLunar}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] leading-relaxed text-indigo-400">{copy.birthHint}</p>
              </div>
            )}

            {status === "success" && (
              <p className="text-center text-xs font-bold text-emerald-600 animate-pulse">
                ✓ {message}
              </p>
            )}
            {status === "error" && (
              <p className="text-center text-xs font-bold text-rose-500">
                ⚠ {message}
              </p>
            )}
            <p className="text-center text-[10px] text-indigo-400">
              {copy.privacyNote}
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
