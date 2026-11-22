import { useState } from "react";
import {
  Flower2,
  MoonStar,
  Brush,
  Umbrella,
  Music2,
  Wheat,
} from "lucide-react";
import { costumeArt, type Variant } from "./formation";
import s from "./collection.module.css";
const emblems: Record<string, typeof Flower2> = {
  yeon: Flower2,
  neo: MoonStar,
  yun: Brush,
  pje: Umbrella,
  moka: Music2,
  ln: Wheat,
};
export default function CharacterCard({
  variant: v,
  costume = "default",
}: {
  variant: Variant;
  costume?: string;
}) {
  const Emblem = emblems[v.baseCharacterId];
  const art = costumeArt(v, costume);
  const [failed, setFailed] = useState("");
  return (
    <div className={s.collectible} data-person={v.baseCharacterId}>
      {failed === art ? (
        <span className={s.missingArt}>원화 로드 실패</span>
      ) : (
        <img
          src={art}
          alt={v.name + " 소장 카드"}
          onError={() => setFailed(art)}
        />
      )}
      <div className={s.foil} aria-hidden="true" />
      <span className={s.emblem}>
        <Emblem size={18} />
      </span>
      <div className={s.caption}>
        <small aria-label={v.stars + "성"}>{"✦ ".repeat(v.stars)}</small>
        <b>{v.name}</b>
        <span>{v.role}</span>
      </div>
    </div>
  );
}
