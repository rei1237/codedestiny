"use client";

/**
 * SubscriptionStatusCard.tsx
 * 이용권 이용권 상태를 시각적으로 표시하는 카드 컴포넌트
 */

type SubscriptionTier = "free" | "standard" | "premium" | "vvip";

type SubscriptionStatus = {
  tier: SubscriptionTier;
  isActive: boolean;
  expiresAt: string | null;
  profileLimit: number;
  lowBalanceWarning?: boolean;
  cancelAtPeriodEnd?: boolean;
  cancelRequestedAt?: string | null;
};

type Props = {
  subscription: SubscriptionStatus;
};

const TIER_META: Record<SubscriptionTier, {
  icon: string;
  label: string;
  bg: string;
  border: string;
  badge: string;
  badgeText: string;
  dot: string;
  desc: string;
  profileMax: string;
  freeUpTo: string | null;
}> = {
  free: {
    icon: "🆓",
    label: "무료 플랜",
    bg: "from-gray-50 to-white",
    border: "border-gray-200",
    badge: "bg-gray-200 text-gray-600",
    badgeText: "FREE",
    dot: "bg-gray-400",
    desc: "기본 운세 서비스를 무료로 이용 중입니다.",
    profileMax: "1개",
    freeUpTo: null,
  },
  standard: {
    icon: "🍯",
    label: "스탠다드 꿀",
    bg: "from-amber-50 to-yellow-50/60",
    border: "border-amber-300",
    badge: "bg-amber-500 text-white",
    badgeText: "STANDARD",
    dot: "bg-amber-500",
    desc: "30코인 이하 서비스 무료 · 최대 3개 프로필",
    profileMax: "3개",
    freeUpTo: "30코인 이하 무료",
  },
  premium: {
    icon: "🌹",
    label: "프리미엄 꿀",
    bg: "from-rose-50 to-amber-50/60",
    border: "border-rose-300",
    badge: "bg-rose-500 text-white",
    badgeText: "PREMIUM",
    dot: "bg-rose-500",
    desc: "50코인 이하 서비스 무료 · 최대 7개 프로필",
    profileMax: "7개",
    freeUpTo: "50코인 이하 무료",
  },
  vvip: {
    icon: "👑",
    label: "VVIP 꿀단지",
    bg: "from-purple-50 to-violet-50/60",
    border: "border-purple-300",
    badge: "bg-gradient-to-r from-purple-600 to-violet-500 text-white",
    badgeText: "VVIP",
    dot: "bg-purple-500",
    desc: "100코인 이하 서비스 무료 · 최대 15개 프로필",
    profileMax: "15개",
    freeUpTo: "100코인 이하 무료",
  },
};

export default function SubscriptionStatusCard({ subscription }: Props) {
  const meta = TIER_META[subscription.tier];

  // Date validation: ensure expiresAt is a valid date string
  const toValidDate = (value: string | null | undefined): Date | null => {
    if (!value) return null;
    try {
      const date = new Date(value);
      return Number.isFinite(date.getTime()) ? date : null;
    } catch {
      return null;
    }
  };

  const validExpiresDate = toValidDate(subscription.expiresAt);
  const expiresDate = validExpiresDate
    ? validExpiresDate.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const daysLeft = validExpiresDate
    ? Math.max(0, Math.ceil((validExpiresDate.getTime() - Date.now()) / 86_400_000))
    : null;

  const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;
  const isExpired = daysLeft === 0 && subscription.isActive === false;

  return (
    <section
      aria-label="현재 이용권 상태"
      className={`rounded-[24px] border ${meta.border} bg-gradient-to-br ${meta.bg} overflow-hidden shadow-[0_6px_24px_rgba(0,0,0,0.07)]`}
    >
      {/* 상태 바 */}
      <div
        className="h-[3px] w-full"
        style={{
          background: subscription.tier === "free"
            ? "linear-gradient(90deg,#d1d5db,#9ca3af,#d1d5db)"
            : subscription.tier === "standard"
              ? "linear-gradient(90deg,#C9A84C,#FFE070,#C9A84C)"
              : subscription.tier === "premium"
                ? "linear-gradient(90deg,#f43f5e,#fb923c,#f43f5e)"
                : "linear-gradient(90deg,#7c3aed,#a78bfa,#7c3aed)",
        }}
      />

      <div className="p-5">
        {/* 헤더 행 */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl leading-none">{meta.icon}</span>
            <div>
              <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-gray-500">현재 이용권</p>
              <p className="text-[16px] font-black text-gray-800 leading-tight">{meta.label}</p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-[11.5px] font-black shadow-sm ${meta.badge}`}>
            {meta.badgeText}
          </span>
        </div>

        {/* 상태 상세 */}
        {subscription.isActive && subscription.tier !== "free" ? (
          <div className="space-y-2">
            {/* 활성 상태 표시 */}
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${meta.dot} animate-pulse`} />
              <span className="text-[12.5px] font-bold text-emerald-700">30일 이용권 활성화됨</span>
            </div>

            {/* 만료일 / 잔여일 */}
            {expiresDate && (
              <div
                className={`rounded-[12px] px-3.5 py-2.5 flex items-center justify-between gap-2 ${
                  isExpiringSoon
                    ? "bg-orange-50 border border-orange-300"
                    : "bg-white/70 border border-gray-200"
                }`}
              >
                <div>
                  <p className="text-[10.5px] font-bold text-gray-500">만료일</p>
                  <p className={`text-[13px] font-black ${isExpiringSoon ? "text-orange-700" : "text-gray-700"}`}>
                    {expiresDate}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[12px] font-black ${
                    isExpiringSoon
                      ? "bg-orange-100 text-orange-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {daysLeft}일 남음
                </span>
              </div>
            )}

            {/* 혜택 요약 */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="rounded-[12px] bg-white/70 border border-gray-200 px-3 py-2">
                <p className="text-[10px] text-gray-500 font-bold">프로필 최대</p>
                <p className="text-[14px] font-black text-gray-800">{meta.profileMax}</p>
              </div>
              {meta.freeUpTo && (
                <div className="rounded-[12px] bg-white/70 border border-gray-200 px-3 py-2">
                  <p className="text-[10px] text-gray-500 font-bold">무료 이용</p>
                  <p className="text-[12px] font-black text-gray-800">{meta.freeUpTo}</p>
                </div>
              )}
            </div>

            {/* 잔액 부족 경고 */}
            {subscription.lowBalanceWarning && (
              <div className="rounded-[12px] border border-orange-300 bg-orange-50 px-3.5 py-2.5 flex items-start gap-2">
                <span className="text-orange-500 flex-shrink-0 mt-0.5">🔔</span>
                <p className="text-[11.5px] text-orange-800">
                  이용권 기간은 유지됩니다. 추가 유료 콘텐츠는 상품별 단건 결제로 이용할 수 있습니다.
                </p>
              </div>
            )}

            {/* 곧 만료 경고 */}
            {isExpiringSoon && (
              <div className="rounded-[12px] border border-orange-300 bg-orange-50 px-3.5 py-2.5 flex items-start gap-2">
                <span className="text-orange-500 flex-shrink-0 mt-0.5">⏰</span>
                <p className="text-[11.5px] text-orange-800">
                  이용권이 <strong>{daysLeft}일 후</strong> 만료됩니다. 계속 이용하려면 새 30일 이용권을 결제해 주세요.
                </p>
              </div>
            )}

            {subscription.cancelAtPeriodEnd && (
              <div className="rounded-[12px] border border-violet-300 bg-violet-50 px-3.5 py-2.5 flex items-start gap-2">
                <span className="text-violet-500 flex-shrink-0 mt-0.5">🧭</span>
                <p className="text-[11.5px] text-violet-800">
                  현재 혜택은 만료일까지 유지됩니다. 이 이용권은 반복 결제되지 않습니다.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div>
            {isExpired ? (
              <div className="rounded-[12px] border border-rose-300 bg-rose-50 px-3.5 py-2.5 flex items-center gap-2">
                <span className="text-rose-500">⚠️</span>
                <p className="text-[12px] text-rose-800 font-bold">이용권이 만료되었습니다. 새 30일 이용권을 결제해 주세요.</p>
              </div>
            ) : (
              <p className="text-[12.5px] text-gray-500">{meta.desc}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
