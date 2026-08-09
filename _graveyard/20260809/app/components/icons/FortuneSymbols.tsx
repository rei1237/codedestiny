import DestinyIcon, { type DestinyIconProps } from "./DestinyIcon";

export type FortuneSymbolName =
  | "tarot"
  | "rune"
  | "zodiac"
  | "yinYang"
  | "palace"
  | "scroll"
  | "compass"
  | "coin";

type FortuneSymbolProps = Omit<DestinyIconProps, "name"> & {
  name: FortuneSymbolName;
};

export default function FortuneSymbol({ name, ...rest }: FortuneSymbolProps) {
  return <DestinyIcon name={name} {...rest} />;
}
