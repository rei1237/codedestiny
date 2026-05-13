"use client";

type LoginStatus = "idle" | "loading" | "success" | "error";

type StarlightLoginPortalProps = {
  status: LoginStatus;
  message?: string;
  error?: string | null;
  displayName?: string;
};

function statusTitle(status: LoginStatus) {
  if (status === "loading") return "별빛 포털을 여는 중...";
  if (status === "success") return "별빛 여정이 시작되었습니다.";
  if (status === "error") return "별빛 연결에 실패했습니다.";
  return "";
}

function statusDescription(status: LoginStatus, message?: string, error?: string | null) {
  if (status === "loading") {
    return message || "당신의 운명 데이터를 안전하게 불러오고 있습니다.";
  }
  if (status === "success") {
    return message || "잠시만 기다려 주세요. 메인 화면으로 이동합니다.";
  }
  if (status === "error") {
    return error || message || "입력 정보 또는 네트워크 상태를 확인해 주세요.";
  }
  return "";
}

function normalizeDisplayName(rawName?: string) {
  const name = String(rawName || "").trim();
  return name || "탐험가";
}

function displayInitial(name: string) {
  return name.slice(0, 1).toUpperCase();
}

export default function StarlightLoginPortal({ status, message, error, displayName }: StarlightLoginPortalProps) {
  if (status === "idle") return null;

  const title = statusTitle(status);
  const description = statusDescription(status, message, error);
  const resolvedName = normalizeDisplayName(displayName);
  const initial = displayInitial(resolvedName);

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_15%_10%,rgba(75,208,255,0.18),transparent_34%),radial-gradient(circle_at_85%_18%,rgba(255,205,92,0.14),transparent_36%),radial-gradient(circle_at_55%_82%,rgba(15,90,180,0.2),transparent_45%),linear-gradient(160deg,#030712_0%,#07162e_48%,#091e36_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_11%_17%,rgba(255,255,255,0.48)_0_1.2px,transparent_2px),radial-gradient(circle_at_48%_69%,rgba(255,255,255,0.38)_0_1px,transparent_2px),radial-gradient(circle_at_78%_28%,rgba(255,255,255,0.42)_0_1.1px,transparent_2px),radial-gradient(circle_at_90%_74%,rgba(255,255,255,0.34)_0_1px,transparent_2px)]" />
      <div className="pointer-events-none absolute -left-24 top-12 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-96 w-96 rounded-full bg-sky-700/30 blur-3xl" />

      <div className="relative mx-4 w-full max-w-md overflow-hidden rounded-[30px] border border-cyan-100/20 bg-slate-950/60 p-8 text-center shadow-[0_30px_95px_rgba(2,8,23,0.78)] backdrop-blur-xl">
        <div className="pointer-events-none absolute -inset-px rounded-[30px] bg-[conic-gradient(from_220deg_at_50%_50%,rgba(34,211,238,0.26),rgba(245,158,11,0.18),rgba(56,189,248,0.26),rgba(34,211,238,0.26))] opacity-65 blur-lg" />

        <div className="relative mx-auto mb-8 h-44 w-44">
          <div className={`absolute inset-0 rounded-full border ${status === "error" ? "border-rose-200/40" : "border-cyan-100/35"}`} />
          <div className={`absolute inset-2 rounded-full border border-dashed ${status === "error" ? "border-rose-200/45" : "border-cyan-200/45"} animate-[spin_18s_linear_infinite]`} />
          <div className={`absolute inset-6 rounded-full border ${status === "error" ? "border-rose-200/35" : "border-amber-200/35"} animate-[spin_12s_linear_infinite] [animation-direction:reverse]`} />

          <div className="absolute inset-0 animate-[spin_16s_linear_infinite]">
            <span className={`absolute left-1/2 top-1 h-3.5 w-3.5 -translate-x-1/2 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.65)] ${status === "error" ? "bg-rose-200" : "bg-cyan-100"}`} />
            <span className={`absolute right-2 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ${status === "error" ? "bg-rose-300" : "bg-amber-200"}`} />
          </div>

          <div className="absolute inset-0 animate-[spin_24s_linear_infinite] [animation-direction:reverse]">
            <span className={`absolute bottom-2 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full ${status === "error" ? "bg-rose-100" : "bg-sky-200"}`} />
            <span className={`absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ${status === "error" ? "bg-rose-300" : "bg-cyan-200"}`} />
          </div>

          <div className={`absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border text-white shadow-[0_0_35px_rgba(56,189,248,0.45)] ${status === "error" ? "border-rose-200/45 bg-rose-500/20" : "border-cyan-100/40 bg-cyan-400/20"}`}>
            <span className="text-2xl font-semibold leading-none">{initial}</span>
            <span className="mt-1 text-[11px] font-medium tracking-[0.04em] text-white/88">{resolvedName}</span>
          </div>
        </div>

        <p className="relative text-lg font-bold tracking-[0.01em] text-white">{title}</p>
        <p className={`relative mt-3 text-sm leading-6 ${status === "error" ? "text-rose-100/90" : "text-cyan-100/85"}`}>{description}</p>

        {status === "loading" ? (
          <p className="relative mt-4 text-xs font-semibold tracking-[0.16em] text-amber-100/90">COSMIC LOGIN GATE</p>
        ) : null}
      </div>
    </div>
  );
}

export type { LoginStatus };
