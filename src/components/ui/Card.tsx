import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLMotionProps<"div"> {
  glow?: "electric" | "mystic" | "none";
  hoverable?: boolean;
}

export function Card({ className, glow = "none", hoverable = false, children, ...props }: CardProps) {
  return (
    <motion.div
      className={cn(
        "bg-graphite border border-crystal rounded-2xl shadow-card",
        glow === "electric" && "shadow-glow-subtle border-electric/20",
        glow === "mystic" && "shadow-[0_0_30px_rgba(162,89,255,0.1)] border-mystic/20",
        hoverable && "cursor-pointer",
        className,
      )}
      whileHover={
        hoverable
          ? { borderColor: "rgba(162,89,255,0.3)", y: -2 }
          : undefined
      }
      transition={{ duration: 0.2 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
