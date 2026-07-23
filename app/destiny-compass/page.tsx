import type { Metadata } from "next";
import { CompassApp } from "./_components/CompassApp";

export const metadata: Metadata = {
  title: "운명의 나침반 하우스 | Code Destiny",
  description:
    "길을 잃었을 때, 사주와 자미두수를 종합해 오늘의 방향과 실행 한 걸음을 찾아주는 공간. 연이의 따뜻한 위로와 네오의 솔직한 팩폭이 함께합니다.",
};

export default function DestinyCompassPage() {
  return <CompassApp />;
}
