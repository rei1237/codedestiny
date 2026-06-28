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
      className={`${styles.teaButton} ${variantClass[variant]} ${className}`}
      disabled={disabled || loading}
      whileHover={reduceMotion || disabled || loading ? undefined : { y: -2, scale: 1.012 }}
      whileTap={reduceMotion || disabled || loading ? undefined : { y: 1, scale: 0.985 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      type={type}
      {...props}
    >
      {loading ? <Loader2 className={styles.teaButtonIconSpin} size={18} aria-hidden /> : <Sparkles size={18} aria-hidden />}
      <span>{children}</span>
    </motion.button>
  );
}
