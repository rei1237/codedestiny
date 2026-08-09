import DestinyIcon, { type DestinyIconProps } from "./DestinyIcon";

export type OmikujiSymbolName = "torii" | "scroll" | "seal" | "ribbon" | "sparkleLine";

type OmikujiSymbolProps = Omit<DestinyIconProps, "name"> & {
  name: OmikujiSymbolName;
};

export default function OmikujiSymbol({ name, ...rest }: OmikujiSymbolProps) {
  return <DestinyIcon name={name} {...rest} />;
}
