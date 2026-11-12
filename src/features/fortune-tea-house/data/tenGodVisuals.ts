import type { TenGodId } from "./tenGods";
export type TenGodVisualMeta = { tenGodId: TenGodId; type: "image"; src: string; alt: string };
export const tenGodVisualAlts: Record<TenGodId, string> = {
  bigeon: "나를 지키는 힘을 보여주는 거울과 꽃", geopjae: "경쟁과 협력을 살펴보는 나란한 두 찻잔",
  siksin: "꾸준히 만들어내는 힘을 보여주는 찻잎과 다과", sanggwan: "나답게 표현하는 힘을 보여주는 붓과 꽃잎",
  pyeonjae: "새로운 기회를 보여주는 열린 창과 갈라지는 길", jeongjae: "생활을 차곡차곡 쌓는 장부와 찻잎 보관함",
  pyeongwan: "압박 속에서도 유연하게 버티는 대나무", jeonggwan: "약속과 신뢰를 상징하는 반듯한 디딤돌",
  pyeonin: "다른 관점을 살펴보는 돋보기와 책", jeongin: "배움과 회복을 상징하는 책과 따뜻한 차",
};
const illustration = (tenGodId: TenGodId): TenGodVisualMeta => ({ tenGodId, type: "image", src: "/images/fortune-tea-house/reading/ten-gods/" + tenGodId + ".webp", alt: tenGodVisualAlts[tenGodId] });
export const tenGodVisualMap: Record<TenGodId, TenGodVisualMeta> = {
  bigeon: illustration("bigeon"), geopjae: illustration("geopjae"), siksin: illustration("siksin"), sanggwan: illustration("sanggwan"), pyeonjae: illustration("pyeonjae"), jeongjae: illustration("jeongjae"), pyeongwan: illustration("pyeongwan"), jeonggwan: illustration("jeonggwan"), pyeonin: illustration("pyeonin"), jeongin: illustration("jeongin"),
};
