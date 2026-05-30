import { forwardRef, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "mystic" | "ghost" | "glass" | "danger" | "warning";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-electric text-white border border-electric/30 hover:shadow-glow-electric",
  mystic:
    "bg-mystic text-white border border-mystic/30 hover:shadow-glow-mystic",
  ghost:
    "bg-transparent text-silk/70 border border-crystal hover:bg-graphite-light hover:text-silk",
  glass:
    "bg-white/5 text-silk border border-white/10 backdrop-blur-sm hover:bg-white/8 hover:border-white/20",
  danger:
    "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20",
  warning:
    "bg-warning/10 text-warning border border-warning/30 hover:bg-warning/20",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-7 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-9 px-4 text-sm gap-2 rounded-xl",
  lg: "h-11 px-6 text-sm gap-2.5 rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "ghost", size = "md", loading, className, children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.96 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.15 }}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-medium select-none",
          "transition-all duration-200 cursor-pointer",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          children
        )}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
