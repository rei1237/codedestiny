import manifest from "@/public/assets/talismans/catalog.json";

export const scenes = [
  { id: "yeongnyangi", ko: "영냥이 · 별빛의 길", ja: "ヨンニャンイ・星明かりの道", character: "yeongnyangi" },
  { id: "yeoni-lotus", ko: "연이 · 연꽃의 품", ja: "ヨニ・蓮のぬくもり", character: "yeoni" },
  { id: "yeoni-teahouse", ko: "연이 · 찻집의 평온", ja: "ヨニ・茶屋の安らぎ", character: "yeoni" },
] as const;
export const categories = [
  { id: "study", ko: "학업", ja: "学業" },
  { id: "wealth", ko: "재물", ja: "金運" },
  { id: "love", ko: "연애", ja: "恋愛" },
  { id: "contact", ko: "연락", ja: "連絡" },
  { id: "career", ko: "취업·합격", ja: "就職・合格" },
  { id: "peace", ko: "평온", ja: "安らぎ" },
  { id: "luck", ko: "행운", ja: "幸運" },
] as const;
export type Scene = typeof scenes[number]["id"];
export type Category = typeof categories[number]["id"];
export type Composition = "lock" | "home";
export type TalismanAsset = {
  id: string; scene: Scene; category: Category; composition: Composition;
  approval: "approved"; src: string; width: number; height: number; sha256: string;
};

// 시안은 이 목록에 넣지 않는다. 사용자 승인 후 원본과 해시를 함께 등록한다.
export function approvedAssets(input: unknown = manifest): TalismanAsset[] {
  const value = input as { version?: number; assets?: TalismanAsset[] } | null;
  if (value?.version !== 1 || !Array.isArray(value.assets)) return [];
  return value.assets.filter((asset) => asset?.approval === "approved" &&
    typeof asset.id === "string" && /^[a-z0-9-]+$/.test(asset.id) &&
    scenes.some((scene) => scene.id === asset.scene) &&
    categories.some((category) => category.id === asset.category) &&
    ["lock", "home"].includes(asset.composition) &&
    /^\/assets\/talismans\/originals\/[a-z0-9-]+\.png$/.test(asset.src) &&
    Number.isInteger(asset.width) && asset.width >= 1440 && asset.width <= 4096 &&
    Number.isInteger(asset.height) && asset.height >= 2560 && asset.height <= 8192 &&
    asset.width * asset.height <= 25_000_000 && /^[a-f0-9]{64}$/.test(asset.sha256));
}

export async function verifyOriginal(bytes: ArrayBuffer, asset: TalismanAsset): Promise<void> {
  if (bytes.byteLength < 33 || bytes.byteLength > 16 * 1024 * 1024) throw new Error("INVALID_IMAGE");
  const view = new DataView(bytes);
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((byte, index) => view.getUint8(index) === byte) ||
      view.getUint32(12) !== 0x49484452 ||
      view.getUint32(16) !== asset.width || view.getUint32(20) !== asset.height) throw new Error("INVALID_IMAGE");
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const actual = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
  if (actual !== asset.sha256) throw new Error("IMAGE_HASH_MISMATCH");
}
