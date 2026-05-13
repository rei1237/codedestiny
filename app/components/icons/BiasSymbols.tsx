import DestinyIcon, { type DestinyIconProps } from "./DestinyIcon";

export type BiasSymbolName =
  | "photocard"
  | "lightstick"
  | "ribbon"
  | "heartGlow"
  | "stageLight"
  | "ticket"
  | "sparkleLine";

type BiasSymbolProps = Omit<DestinyIconProps, "name"> & {
  name: BiasSymbolName;
};

export default function BiasSymbol({ name, ...rest }: BiasSymbolProps) {
  return <DestinyIcon name={name} {...rest} />;
}
