"use client";

type LoginStatus = "idle" | "loading" | "success" | "error";

type StarlightLoginPortalProps = {
  status: LoginStatus;
  message?: string;
  error?: string | null;
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

export default function StarlightLoginPortal({ status, message, error }: StarlightLoginPortalProps) {
  if (status === "idle") return null;

  const title = statusTitle(status);
  const description = statusDescription(status, message, error);

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
      </div>
    </div>
  );
}

export type { LoginStatus };
