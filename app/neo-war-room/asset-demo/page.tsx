import NeoWarRoomAssetImage from "@/src/features/neo-war-room/components/NeoWarRoomAssetImage";
import {
  getNeoWarRoomBackgroundAsset,
  getNeoWarRoomSpriteAsset,
  neoWarRoomAssets,
  neoWarRoomMethodAssets,
} from "@/src/features/neo-war-room/data/assets";

export const metadata = {
  title: "네오의 팩폭 작전실 자산 데모 | Code Destiny",
  description:
    "네오의 팩폭 작전실에 쓰이는 배경·스프라이트 자산을 한자리에서 확인하는 내부 데모 화면입니다. 검색 색인 대상이 아닙니다.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NeoWarRoomAssetDemoPage() {
  const desktopBackground = getNeoWarRoomBackgroundAsset("desktop");
  const mobileBackground = getNeoWarRoomBackgroundAsset("mobile");
  const expressionFrames = [
    getNeoWarRoomSpriteAsset("withBackground", 1),
    getNeoWarRoomSpriteAsset("withBackground", 4),
    getNeoWarRoomSpriteAsset("transparent", 2),
    getNeoWarRoomSpriteAsset("transparent", 5),
  ];

  return (
    <main style={{ minHeight: "100vh", background: "#090b13", color: "#fff7df", padding: 24 }}>
      <section style={{ display: "grid", gap: 18 }}>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "minmax(0, 1fr)", maxWidth: 1180, margin: "0 auto", width: "100%" }}>
          <NeoWarRoomAssetImage
            asset={desktopBackground}
            priority
            sizes="100vw"
            style={{ minHeight: 320, borderRadius: 8 }}
            imageClassName="object-cover"
          />
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <NeoWarRoomAssetImage asset={mobileBackground} style={{ aspectRatio: "9 / 14", borderRadius: 8 }} imageClassName="object-cover" />
            <NeoWarRoomAssetImage asset={neoWarRoomAssets.hero.portrait} style={{ aspectRatio: "4 / 5", borderRadius: 8 }} imageClassName="object-contain" />
            <NeoWarRoomAssetImage asset={neoWarRoomAssets.hero.fullbody} style={{ aspectRatio: "4 / 5", borderRadius: 8 }} imageClassName="object-contain" />
          </div>
        </div>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", maxWidth: 1180, margin: "0 auto", width: "100%" }}>
          {neoWarRoomMethodAssets.map((item) => (
            <article key={item.mode} style={{ display: "grid", gap: 8 }}>
              <NeoWarRoomAssetImage asset={item.asset} style={{ aspectRatio: "4 / 3", borderRadius: 8 }} imageClassName="object-cover" />
              <strong>{item.label}</strong>
            </article>
          ))}
        </div>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", maxWidth: 1180, margin: "0 auto", width: "100%" }}>
          {expressionFrames.map((asset) => (
            <NeoWarRoomAssetImage key={asset.objectKey} asset={asset} style={{ aspectRatio: "1 / 1", borderRadius: 8 }} imageClassName="object-contain" />
          ))}
          <NeoWarRoomAssetImage asset={neoWarRoomAssets.badges.grades} style={{ aspectRatio: "1 / 1", borderRadius: 8 }} imageClassName="object-contain" />
          <NeoWarRoomAssetImage asset={neoWarRoomAssets.badges.resultStamp} style={{ aspectRatio: "1 / 1", borderRadius: 8 }} imageClassName="object-contain" />
          <NeoWarRoomAssetImage asset={neoWarRoomAssets.decor.asset1} style={{ aspectRatio: "1 / 1", borderRadius: 8 }} imageClassName="object-contain" />
          <NeoWarRoomAssetImage asset={neoWarRoomAssets.decor.asset2} style={{ aspectRatio: "1 / 1", borderRadius: 8 }} imageClassName="object-contain" />
        </div>
      </section>
    </main>
  );
}
