import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AgentAvatarProps {
  colors: [string, string];
  name: string;
  size?: number;
  animated?: boolean;
  pulse?: boolean;
  className?: string;
}

export function AgentAvatar({
  colors,
  name,
  size = 48,
  animated = false,
  pulse = false,
  className,
}: AgentAvatarProps) {
  const initials = name.slice(0, 2).toUpperCase();
  const fontSize = Math.round(size * 0.36);

  return (
    <div
      className={cn("relative flex-shrink-0", className)}
      style={{ width: size, height: size }}
    >
      {/* Glow ring when pulse */}
      {pulse && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${colors[0]}60, transparent 70%)`,
          }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Main avatar */}
      <motion.div
        className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center select-none"
        animate={animated ? { rotate: 360 } : undefined}
        transition={animated ? { duration: 20, repeat: Infinity, ease: "linear" } : undefined}
        style={{ willChange: animated ? "transform" : "auto" }}
      >
        {/* Layered gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 30% 25%, ${colors[0]}ee 0%, transparent 55%),
              radial-gradient(ellipse at 75% 80%, ${colors[1]}cc 0%, transparent 50%),
              linear-gradient(135deg, ${colors[0]}88, ${colors[1]})
            `,
          }}
        />

        {/* Noise overlay for texture */}
        <div
          className="absolute inset-0 opacity-20 mix-blend-overlay"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
        />

        {/* Specular highlight */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(ellipse at 35% 25%, rgba(255,255,255,0.25) 0%, transparent 55%)",
          }}
        />

        {/* Initials */}
        <span
          className="relative z-10 font-bold text-white tracking-tight"
          style={{ fontSize }}
        >
          {initials}
        </span>
      </motion.div>
    </div>
  );
}
