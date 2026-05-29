import { cn } from "@/lib/utils";

interface SliderProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  color?: "electric" | "mystic";
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  label,
  showValue = true,
  color = "electric",
}: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-1.5">
      {(label || showValue) && (
        <div className="flex justify-between items-center">
          {label && <span className="text-xs text-silk/50">{label}</span>}
          {showValue && (
            <span className="text-xs font-medium text-silk/70">{value}%</span>
          )}
        </div>
      )}
      <div className="relative h-5 flex items-center">
        <div className="w-full h-1.5 bg-crystal rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-150",
              color === "electric" ? "bg-electric" : "bg-mystic"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
        <div
          className={cn(
            "absolute w-4 h-4 rounded-full shadow-lg pointer-events-none",
            "border-2 border-white/80",
            color === "electric" ? "bg-electric" : "bg-mystic"
          )}
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
    </div>
  );
}
