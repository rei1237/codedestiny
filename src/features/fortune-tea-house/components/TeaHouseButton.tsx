"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2, Sparkles } from "lucide-react";
import styles from "../styles/fortune-tea-house.module.css";

type TeaHouseButtonVariant = "primary" | "secondary" | "ghost";

type TeaHouseButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: TeaHouseButtonVariant;
  loading?: boolean;
};

const variantClass: Record<TeaHouseButtonVariant, string> = {
  primary: styles.teaButtonPrimary,
  secondary: styles.teaButtonSecondary,
  ghost: styles.teaButtonGhost,
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
  return (
    <button
      className={`${styles.teaButton} ${variantClass[variant]} ${className}`}
      disabled={disabled || loading}
      type={type}
      {...props}
    >
      {loading ? <Loader2 className={styles.teaButtonIconSpin} size={18} aria-hidden /> : <Sparkles size={18} aria-hidden />}
      <span>{children}</span>
    </button>
  );
}
