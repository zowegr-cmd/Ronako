import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  size?: "sm" | "md";
  color?: "electric" | "mystic" | "success";
}

const colors = {
  electric: "bg-electric",
  mystic: "bg-mystic",
  success: "bg-success",
};

export function Toggle({ checked, onChange, label, size = "md", color = "electric" }: ToggleProps) {
  const isLg = size === "md";
  return (
    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none group">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative rounded-full transition-colors duration-200 focus:outline-none",
          isLg ? "w-10 h-6" : "w-8 h-5",
          checked ? colors[color] : "bg-crystal"
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
          className={cn(
            "absolute top-0.5 rounded-full bg-white shadow-sm",
            isLg ? "w-5 h-5" : "w-4 h-4",
            checked ? (isLg ? "left-[18px]" : "left-[14px]") : "left-0.5"
          )}
        />
      </button>
      {label && (
        <span className="text-sm text-silk/70 group-hover:text-silk transition-colors">
          {label}
        </span>
      )}
    </label>
  );
}
