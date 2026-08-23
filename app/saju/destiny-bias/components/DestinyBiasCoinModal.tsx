"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

interface DestinyBiasCoinModalCopy {
  dialogAriaLabel: string;
  requiredAmountPrefix: string;
  krwSuffix: string;
  loginContinue: string;
  close: string;
}

const DESTINY_BIAS_COIN_MODAL_EN: DestinyBiasCoinModalCopy = {
  dialogAriaLabel: "Payment notice modal",
  requiredAmountPrefix: "Amount needed: ",
  krwSuffix: " KRW",
  loginContinue: "Log in and continue",
  close: "Close",
};

const DESTINY_BIAS_COIN_MODAL_COPY: Partial<Record<LoadingLocale, DestinyBiasCoinModalCopy>> = {
  ko: { dialogAriaLabel: "결제 안내 모달", requiredAmountPrefix: "필요 금액: ", krwSuffix: "원", loginContinue: "로그인하고 계속하기", close: "닫기" },
  ja: { dialogAriaLabel: "決済案内モーダル", requiredAmountPrefix: "必要金額: ", krwSuffix: "ウォン", loginContinue: "ログインして続ける", close: "閉じる" },
  "zh-CN": { dialogAriaLabel: "付款提示弹窗", requiredAmountPrefix: "所需金额：", krwSuffix: "韩元", loginContinue: "登录后继续", close: "关闭" },
  "zh-TW": { dialogAriaLabel: "付款提示彈窗", requiredAmountPrefix: "所需金額：", krwSuffix: "韓元", loginContinue: "登入後繼續", close: "關閉" },
  vi: { dialogAriaLabel: "Hộp thoại thông báo thanh toán", requiredAmountPrefix: "Số tiền cần: ", krwSuffix: " KRW", loginContinue: "Đăng nhập và tiếp tục", close: "Đóng" },
  hi: { dialogAriaLabel: "भुगतान सूचना मोडल", requiredAmountPrefix: "आवश्यक राशि: ", krwSuffix: " KRW", loginContinue: "लॉगिन करके जारी रखें", close: "बंद करें" },
  es: { dialogAriaLabel: "Modal de aviso de pago", requiredAmountPrefix: "Monto necesario: ", krwSuffix: " KRW", loginContinue: "Iniciar sesión y continuar", close: "Cerrar" },
  fr: { dialogAriaLabel: "Fenêtre d'avis de paiement", requiredAmountPrefix: "Montant requis : ", krwSuffix: " KRW", loginContinue: "Se connecter et continuer", close: "Fermer" },
  de: { dialogAriaLabel: "Zahlungshinweis-Dialog", requiredAmountPrefix: "Benötigter Betrag: ", krwSuffix: " KRW", loginContinue: "Anmelden und fortfahren", close: "Schließen" },
  nl: { dialogAriaLabel: "Betalingsmelding-modaal", requiredAmountPrefix: "Benodigd bedrag: ", krwSuffix: " KRW", loginContinue: "Inloggen en doorgaan", close: "Sluiten" },
  ms: { dialogAriaLabel: "Modal notis pembayaran", requiredAmountPrefix: "Jumlah diperlukan: ", krwSuffix: " KRW", loginContinue: "Log masuk dan teruskan", close: "Tutup" },
};

function getDestinyBiasCoinModalCopy(locale: LoadingLocale): DestinyBiasCoinModalCopy {
  return DESTINY_BIAS_COIN_MODAL_COPY[locale] || DESTINY_BIAS_COIN_MODAL_EN;
}

function useDestinyBiasCoinModalCopy(): DestinyBiasCoinModalCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    document.addEventListener("cd:language-change", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      document.removeEventListener("cd:language-change", sync);
    };
  }, []);
  return getDestinyBiasCoinModalCopy(locale);
}

export default function DestinyBiasCoinModal({
  open,
  title,
  message,
  requiredCoins,
  onClose,
  loginRequired,
}: {
  open: boolean;
  title: string;
  message: string;
  requiredCoins?: number;
  onClose: () => void;
  loginRequired?: boolean;
}) {
  const copy = useDestinyBiasCoinModalCopy();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/65 p-4 md:items-center" role="dialog" aria-modal="true" aria-label={copy.dialogAriaLabel}>
      <div className="w-full max-w-md rounded-3xl border border-white/20 bg-[linear-gradient(145deg,rgba(24,10,46,0.96),rgba(9,8,32,0.94))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <p className="text-xs font-semibold tracking-[0.12em] text-cyan-200/90">DESTINY NOTICE</p>
        <h3 className="mt-2 text-xl font-black text-white">{title}</h3>
        <p className="mt-3 text-sm leading-7 text-white/85">{message}</p>
        {requiredCoins ? (
          <p className="mt-2 text-xs font-semibold text-amber-100/90">{copy.requiredAmountPrefix}{(requiredCoins * 100).toLocaleString("ko-KR")}{copy.krwSuffix}</p>
        ) : null}

        {/*
          결제 필요 안내에는 상점 링크를 두지 않는다. 결제 수단 선택(이용권/단건/월정석 3옵션)은
          공용 게이트가 이미 제시했고, 여기서 맨 `/points`(플랜·cdco 파라미터 없는 레거시 충전 페이지)로
          보내면 3옵션을 우회하는 막다른 경로가 된다. 닫고 분석을 다시 누르면 결제창이 다시 열린다.
        */}
        <div className="mt-5 flex flex-wrap gap-2">
          {loginRequired ? (
            <Link
              href="/login?next=%2Fsaju%2Fdestiny-bias"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-cyan-200/70 bg-cyan-300/20 px-4 text-sm font-bold text-cyan-50"
            >
              {copy.loginContinue}
            </Link>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/30 bg-white/10 px-4 text-sm font-semibold text-white/90"
          >
            {copy.close}
          </button>
        </div>
      </div>
    </div>
  );
}
