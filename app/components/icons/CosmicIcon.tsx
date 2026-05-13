import DestinyIcon, { type DestinyIconName, type DestinyIconProps } from "./DestinyIcon";

type CosmicIconName = Extract<DestinyIconName, "star" | "moon" | "sun" | "zodiac" | "palace" | "compass" | "sparkleLine">;

type CosmicIconProps = Omit<DestinyIconProps, "name"> & {
  name: CosmicIconName;
};

export default function CosmicIcon({ name, ...rest }: CosmicIconProps) {
  return <DestinyIcon name={name} {...rest} />;
}
