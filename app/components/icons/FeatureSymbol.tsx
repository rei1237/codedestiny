import type { DestinyIconName } from "./DestinyIcon";
import DestinyIcon from "./DestinyIcon";
import { resolveRouteIcon } from "@/app/_lib/design/iconMap";

type FeatureSymbolProps = {
  route?: string;
  iconName?: DestinyIconName;
  size?: number;
  className?: string;
  variant?: "line" | "filled" | "soft" | "glow" | "badge";
};

export default function FeatureSymbol({
  route,
  iconName,
  size = 20,
  className,
  variant = "line",
}: FeatureSymbolProps) {
  const resolved = iconName || resolveRouteIcon(route, "sparkle");
  return <DestinyIcon name={resolved} size={size} className={className} variant={variant} />;
}
