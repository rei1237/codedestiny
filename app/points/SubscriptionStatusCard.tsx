"use client";

/**
 * SubscriptionStatusCard.tsx
 * 이용권 이용권 상태를 시각적으로 표시하는 카드 컴포넌트
 */

type SubscriptionTier = "free" | "standard" | "premium" | "vvip" | "family";

type SubscriptionStatus = {
  tier: SubscriptionTier;
  isActive: boolean;
  expiresAt: string | null;
  profileLimit: number;
  durationMonths?: number;
  lowBalanceWarning?: boolean;
  cancelAtPeriodEnd?: boolean;
  cancelRequestedAt?: string | null;
};

type Props = {
  subscription: SubscriptionStatus;
  monthlyCredits?: number;
};

const TIER_META: Record<SubscriptionTier, {
  icon: string;
  label: string;
  coinValue: number;
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
    icon: "🌙",
    label: "무료 플랜",
    coinValue: 0,
    bg: "from-slate-950/95 via-[#151a3d]/92 to-[#281a4d]/90",
    border: "border-white/15",
    badge: "bg-white/10 text-slate-100 ring-1 ring-white/15",
    badgeText: "FREE",
    dot: "bg-slate-300",
    desc: "기본 운세 서비스를 무료로 이용 중입니다. 단건 결제 서비스는 코인 기준 결제로 이용할 수 있습니다.",
    profileMax: "1개",
    freeUpTo: null,
  },
  standard: {
    icon: "🌔",
    label: "스탠다드 달빛 이용권",
    coinValue: 115,
    bg: "from-[#111936]/95 via-[#27305d]/92 to-[#4a3a72]/90",
    border: "border-[#e9d18a]/45",
    badge: "bg-gradient-to-r from-[#d8bd72] to-[#f5df9d] text-[#1d1834]",
    badgeText: "STANDARD",
    dot: "bg-[#f5df9d]",
    desc: "일반 유료 서비스 30코인 이하 이용 · PDF 생성 30코인 할인 · 최대 3개 프로필",
    profileMax: "3개",
    freeUpTo: "일반 30코인 이하 · PDF 30코인 할인",
  },
  premium: {
    icon: "🌕",
    label: "프리미엄 달빛 이용권",
    coinValue: 360,
    bg: "from-[#101832]/95 via-[#352553]/92 to-[#604f88]/90",
    border: "border-[#cab8ff]/45",
    badge: "bg-gradient-to-r from-[#cab8ff] to-[#f2d48f] text-[#17142b]",
    badgeText: "PREMIUM",
    dot: "bg-[#cab8ff]",
    desc: "일반 유료 서비스 50코인 이하 이용 · PDF 생성 50코인 할인 · 최대 7개 프로필",
    profileMax: "7개",
    freeUpTo: "일반 50코인 이하 · PDF 50코인 할인",
  },
  vvip: {
    icon: "🌌",
    label: "VVIP 달빛 이용권",
    coinValue: 700,
    bg: "from-[#091126]/95 via-[#24164d]/92 to-[#42306f]/90",
    border: "border-[#f3dd9a]/55",
    badge: "bg-gradient-to-r from-[#f3dd9a] via-[#cab8ff] to-[#8cb8ff] text-[#11142a]",
    badgeText: "VVIP",
    dot: "bg-[#f3dd9a]",
    desc: "일반 유료 서비스 100코인 이하 이용 · PDF 생성 100코인 할인 · 최대 15개 프로필",
    profileMax: "15개",
    freeUpTo: "일반 100코인 이하 · PDF 100코인 할인",
  },
  family: {
    icon: "∞",
    label: "Code Destiny Family",
    coinValue: 3000,
    bg: "from-[#07150f]/95 via-[#123a2c]/92 to-[#374b2b]/90",
    border: "border-emerald-200/55",
    badge: "bg-gradient-to-r from-emerald-200 via-[#f3dd9a] to-[#8cb8ff] text-[#07150f]",
    badgeText: "FAMILY",
    dot: "bg-emerald-200",
    desc: "PDF 포함 모든 유료 서비스 무료 · 프로필 수정·삭제 무료, 제한 없음",
    profileMax: "무제한",
    freeUpTo: "모든 유료/PDF 서비스 무료",
  },
};

function formatSubscriptionDurationLabel(months: unknown) {
  const numeric = Number(months);
  if (numeric === 12) return "1년";
  if (numeric === 1 || numeric === 3 || numeric === 6) return `${numeric}개월`;
  return "선택 기간";
}

export default function SubscriptionStatusCard({ subscription, monthlyCredits = 0 }: Props) {
  const effectiveTier: SubscriptionTier = subscription.isActive ? subscription.tier : "free";
  const meta = TIER_META[effectiveTier];
  const monthlyCreditBalance = Math.max(0, Math.floor(Number(monthlyCredits || 0)));
  const durationLabel = formatSubscriptionDurationLabel(subscription.durationMonths);

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
  const isActivePass = subscription.isActive && effectiveTier !== "free";
  const wonValue = meta.coinValue * 100;
  const singlePaymentCopy = effectiveTier === "family"
    ? "Family 이용권으로 모든 서비스가 무료 처리됩니다."
    : "일반 한도 초과 서비스는 코인 기준 단건 결제, PDF는 할인 후 잔액 결제됩니다.";

  return (
    <section
      aria-label="현재 이용권 상태"
      className={`rounded-[24px] border ${meta.border} bg-gradient-to-br ${meta.bg} overflow-hidden text-slate-100 shadow-[0_18px_46px_rgba(7,10,28,0.35)]`}
    >
      {/* 상태 바 */}
      <div
        className="h-[3px] w-full"
        style={{
          background: "linear-gradient(90deg, rgba(255,255,255,0), #f3dd9a 24%, #cab8ff 52%, #8cb8ff 76%, rgba(255,255,255,0))",
        }}
      />

      <div className="p-5">
        {/* 헤더 행 */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl leading-none">{meta.icon}</span>
            <div>
              <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-[#cab8ff]/80">나의 달빛 이용권 혜택</p>
              <p className="text-[16px] font-black text-white leading-tight">{meta.label}</p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-[11.5px] font-black shadow-sm ${meta.badge}`}>
            {meta.badgeText}
          </span>
        </div>

        {/* 상태 상세 */}
        {isActivePass ? (
          <div className="space-y-2">
            {/* 활성 상태 표시 */}
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${meta.dot} animate-pulse`} />
              <span className="text-[12.5px] font-bold text-[#f3dd9a]">현재 {meta.label} 이용 중 · 다음 갱신 전까지 이용 가능</span>
            </div>

            <div className="rounded-[14px] border border-white/12 bg-white/8 px-3.5 py-3">
              <p className="text-[13px] font-black text-white">
                {meta.label} · {meta.coinValue.toLocaleString("ko-KR")}코인 기준 / {durationLabel} · {wonValue.toLocaleString("ko-KR")}원 상당
              </p>
              <p className="mt-1 text-[11.5px] text-slate-200">
                기본 결제 단위는 코인이며 월정석은 이벤트 보너스로만 지급됩니다.
              </p>
            </div>

            {/* 만료일 / 잔여일 */}
            {expiresDate && (
              <div
                className={`rounded-[12px] px-3.5 py-2.5 flex items-center justify-between gap-2 ${
                  isExpiringSoon
                    ? "bg-orange-400/12 border border-orange-300/50"
                    : "bg-white/8 border border-white/12"
                }`}
              >
                <div>
                  <p className="text-[10.5px] font-bold text-slate-300">갱신/만료일</p>
                  <p className={`text-[13px] font-black ${isExpiringSoon ? "text-orange-100" : "text-white"}`}>
                    {expiresDate}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[12px] font-black ${
                    isExpiringSoon
                      ? "bg-orange-300/20 text-orange-100"
                      : "bg-emerald-300/15 text-emerald-100"
                  }`}
                >
                  {daysLeft}일 남음
                </span>
              </div>
            )}

            {/* 혜택 요약 */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="rounded-[12px] bg-white/8 border border-white/12 px-3 py-2">
                <p className="text-[10px] text-slate-300 font-bold">프로필 최대</p>
                <p className="text-[14px] font-black text-white">{meta.profileMax}</p>
              </div>
              {meta.freeUpTo && (
                <div className="rounded-[12px] bg-white/8 border border-white/12 px-3 py-2">
                  <p className="text-[10px] text-slate-300 font-bold">일반/PDF 정책</p>
                  <p className="text-[12px] font-black text-white">{meta.freeUpTo}</p>
                </div>
              )}
              <div className="rounded-[12px] bg-white/8 border border-white/12 px-3 py-2">
                <p className="text-[10px] text-slate-300 font-bold">이벤트 월정석</p>
                <p className="text-[14px] font-black text-white">{monthlyCreditBalance.toLocaleString("ko-KR")}개</p>
              </div>
            </div>

            <div className="rounded-[12px] bg-white/8 border border-white/12 px-3 py-2">
              <p className="text-[10px] text-slate-300 font-bold">단건 결제</p>
              <p className="text-[12px] font-black text-white">{singlePaymentCopy}</p>
            </div>

            {/* 이용권 혜택 범위 안내 */}
            {subscription.lowBalanceWarning && (
              <div className="rounded-[12px] border border-orange-300/50 bg-orange-400/12 px-3.5 py-2.5 flex items-start gap-2">
                <span className="text-orange-500 flex-shrink-0 mt-0.5">🔔</span>
                <p className="text-[11.5px] text-orange-100">
                  이용권 기간은 유지됩니다. 추가 유료 콘텐츠는 상품별 코인 기준 단건 결제로 이용할 수 있습니다.
                </p>
              </div>
            )}

            {/* 곧 만료 경고 */}
            {isExpiringSoon && (
              <div className="rounded-[12px] border border-orange-300/50 bg-orange-400/12 px-3.5 py-2.5 flex items-start gap-2">
                <span className="text-orange-500 flex-shrink-0 mt-0.5">⏰</span>
                <p className="text-[11.5px] text-orange-100">
                  이용권이 <strong>{daysLeft}일 후</strong> 만료됩니다. 계속 이용하려면 새 기간형 이용권을 결제해 주세요.
                </p>
              </div>
            )}

            {subscription.cancelAtPeriodEnd && (
              <div className="rounded-[12px] border border-violet-300/50 bg-violet-400/12 px-3.5 py-2.5 flex items-start gap-2">
                <span className="text-violet-500 flex-shrink-0 mt-0.5">🧭</span>
                <p className="text-[11.5px] text-violet-100">
                  현재 혜택은 만료일까지 유지됩니다. 이 이용권은 반복 결제되지 않습니다.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div>
            {isExpired ? (
              <div className="rounded-[12px] border border-rose-300/50 bg-rose-400/12 px-3.5 py-2.5 flex items-center gap-2">
                <span className="text-rose-500">⚠️</span>
                <p className="text-[12px] text-rose-100 font-bold">이용권이 만료되었습니다. 새 기간형 이용권을 결제해 주세요.</p>
              </div>
            ) : (
              <div className="rounded-[14px] border border-white/12 bg-white/8 px-3.5 py-3">
                <p className="text-[12.5px] text-slate-200">{meta.desc}</p>
                <p className="mt-1 text-[11.5px] text-[#f3dd9a]">단건 결제 가능 · 콘텐츠 가치 단위 1코인 = 100원</p>
                <p className="mt-1 text-[11.5px] font-bold text-[#cab8ff]">이벤트 월정석 {monthlyCreditBalance.toLocaleString("ko-KR")}개</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
