/**
 * Logo Ronako — SVG vectoriel, transparent par nature (pas de fond).
 * Fonctionne sur n'importe quel fond.
 */
import logoSvg from "@/assets/logo.svg?url";

interface AppLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function AppLogo({ size = 32, className, style }: AppLogoProps) {
  return (
    <img
      src={logoSvg}
      alt="Ronako"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: "contain", flexShrink: 0, ...style }}
      draggable={false}
    />
  );
}
