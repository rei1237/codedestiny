import MingriTarot from "../../../components/MingriTarot";

export const metadata = {
  title: "재회운 타로 - 관계 재접점 리딩 | Code Destiny",
  description:
    "재회운 카테고리에 집중한 타로 리딩을 전체화면에서 확인하세요.",
};

export default function TarotReunionPlayPage() {
  return (
    <MingriTarot
      initialMode="three"
      initialCategory="reunion"
      lockCategory
      heading="재회운 타로"
      subtitle="재회운 카테고리에 고정된 3카드 리딩 페이지입니다. 카드를 뽑고 관계 흐름을 확인하세요."
    />
  );
}
