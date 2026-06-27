import type { FortuneTeaHouseConsultResponse } from "../data/consult";
import TarotAssetCard from "./TarotAssetCard";

type TarotCardFaceProps = {
  tarot: FortuneTeaHouseConsultResponse["tarot"];
  compact?: boolean;
  className?: string;
};

export default function TarotCardFace({ tarot, compact = false, className = "" }: TarotCardFaceProps) {
  return (
    <TarotAssetCard
      className={className}
      cardId={tarot.cardId}
      number={tarot.number}
      nameKo={tarot.nameKo}
      nameEn={tarot.nameEn}
      orientation={tarot.orientation}
      keywords={tarot.keywords}
      meaning={tarot.meaning}
      compact={compact}
    />
  );
}
