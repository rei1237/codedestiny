"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import styles from "../styles/fortune-tea-house.module.css";

type TeaHouseButtonVariant = "primary" | "secondary" | "ghost";

type TeaHouseButtonProps = HTMLMotionProps<"button"> & {
  children: ReactNode;
  variant?: TeaHouseButtonVariant;
  loading?: boolean;
};

const variantClass: Record<TeaHouseButtonVariant, string> = {
  primary: styles.teaButtonPrimary,
  secondary: styles.teaButtonSecondary,
  ghost: styles.teaButtonGhost,
};

const variantToneClass: Record<TeaHouseButtonVariant, string> = {
  primary: "border-[#fff0ba]/80 bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.72),transparent_30%),linear-gradient(135deg,rgba(255,244,196,0.98),rgba(245,182,210,0.96)_58%,rgba(228,184,104,0.95))] text-[#221229] shadow-[0_18px_42px_rgba(28,12,48,0.34),0_0_28px_rgba(248,187,221,0.26),inset_0_1px_0_rgba(255,255,255,0.58)]",
  secondary: "border-[#f6d98a]/45 bg-[radial-gradient(circle_at_18%_0%,rgba(255,236,168,0.22),transparent_34%),linear-gradient(135deg,rgba(83,47,91,0.82),rgba(32,16,51,0.86))] text-[#fff6fa] shadow-[0_16px_34px_rgba(12,6,24,0.28),0_0_22px_rgba(248,187,221,0.14),inset_0_1px_0_rgba(255,255,255,0.14)]",
  ghost: "border-[#f1cf7a]/38 bg-[radial-gradient(circle_at_18%_0%,rgba(248,187,221,0.18),transparent_36%),linear-gradient(135deg,rgba(86,61,96,0.72),rgba(24,13,38,0.84))] text-[#fff4fb] shadow-[0_14px_28px_rgba(8,4,18,0.24),inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-10px_22px_rgba(0,0,0,0.12)]",
};

export default function TeaHouseButton({
  children,
  variant = "primary",
  loading = false,
  className = "",
  disabled,
  type = "button",
  ...props
}: TeaHouseButtonProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      className={[
        styles.teaButton,
        variantClass[variant],
        "group relative isolate inline-flex min-h-11 w-full min-w-0 max-w-full items-center justify-center gap-2 overflow-hidden rounded-[0.95rem] border px-4 py-2.5 text-center text-[0.95rem] font-semibold leading-tight tracking-[0] backdrop-blur-md transition-[border-color,box-shadow,filter] duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        "before:pointer-events-none before:absolute before:inset-px before:-z-10 before:rounded-[0.84rem] before:bg-[linear-gradient(180deg,rgba(255,255,255,0.24),rgba(255,255,255,0.025)_54%,rgba(0,0,0,0.08))]",
        "after:pointer-events-none after:absolute after:left-1/2 after:top-0 after:h-px after:w-[78%] after:-translate-x-1/2 after:bg-[linear-gradient(90deg,transparent,rgba(255,247,210,0.82),rgba(248,187,221,0.62),transparent)]",
        variantToneClass[variant],
        className,
      ].filter(Boolean).join(" ")}
      disabled={disabled || loading}
      whileHover={reduceMotion || disabled || loading ? undefined : { y: -2, scale: 1.012 }}
      whileTap={reduceMotion || disabled || loading ? undefined : { y: 1, scale: 0.985 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      type={type}
      {...props}
    >
      {loading ? <Loader2 className={`${styles.teaButtonIconSpin} shrink-0`} size={18} aria-hidden /> : <Sparkles className="shrink-0 drop-shadow-[0_0_8px_rgba(255,244,189,0.48)]" size={18} aria-hidden />}
      <span className="min-w-0 max-w-full whitespace-normal break-keep text-center [text-wrap:balance]">{children}</span>
    </motion.button>
  );
}
