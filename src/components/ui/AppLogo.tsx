/**
 * Logo Ronako — utilise le vrai PNG (fond transparent, généré depuis ronako-logo.png).
 * Fonctionne sur n'importe quel fond sombre.
 */
import logoUrl from "@/assets/logo-transparent.png?url";

interface AppLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function AppLogo({ size = 32, className, style }: AppLogoProps) {
  return (
    <img
      src={logoUrl}
      alt="Ronako"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: "contain", flexShrink: 0, ...style }}
      draggable={false}
    />
  );
}
