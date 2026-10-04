"use client";

import type { ReactNode } from "react";
import { m, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import styles from "../styles/tea-button.module.css";

type TeaHouseButtonVariant = "primary" | "secondary" | "ghost";

type TeaHouseButtonProps = HTMLMotionProps<"button"> & {
  children: ReactNode;
  variant?: TeaHouseButtonVariant;
  loading?: boolean;
};

const variantClass: Record<TeaHouseButtonVariant, string> = {
  primary: styles.primary,
  secondary: styles.secondary,
  ghost: styles.ghost,
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
    <m.button
      className={[styles.button, variantClass[variant], className].filter(Boolean).join(" ")}
      disabled={disabled || loading}
      whileHover={reduceMotion || disabled || loading ? undefined : { y: -1 }}
      whileTap={reduceMotion || disabled || loading ? undefined : { y: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      type={type}
      {...props}
    >
      {loading ? <Loader2 className={`${styles.spin} shrink-0`} size={18} aria-hidden /> : <Sparkles className="shrink-0" size={18} aria-hidden />}
      <span className="min-w-0 max-w-full whitespace-normal break-keep text-center [text-wrap:balance]">{children}</span>
    </m.button>
  );
}
