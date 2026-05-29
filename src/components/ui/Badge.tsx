import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "electric" | "mystic" | "success" | "warning" | "danger" | "ghost";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
  style?: CSSProperties;
}

const variants: Record<BadgeVariant, string> = {
  electric: "bg-electric/15 text-electric border border-electric/25",
  mystic: "bg-mystic/15 text-mystic border border-mystic/25",
  success: "bg-success/15 text-success border border-success/25",
  warning: "bg-warning/15 text-warning border border-warning/25",
  danger: "bg-danger/15 text-danger border border-danger/25",
  ghost: "bg-white/5 text-silk/60 border border-crystal",
};

const dotColors: Record<BadgeVariant, string> = {
  electric: "bg-electric",
  mystic: "bg-mystic",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  ghost: "bg-silk/40",
};

export function Badge({ children, variant = "ghost", dot, className, style }: BadgeProps) {
  return (
    <span
      style={style}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium leading-none",
        variants[variant],
        className,
      )}
    >
      {dot && (
        <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse-glow", dotColors[variant])} />
      )}
      {children}
    </span>
  );
}
