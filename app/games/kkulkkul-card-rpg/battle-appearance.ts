const wardrobes: Record<string, string> = {
  "moka-apron": "moka",
  "yun-traveler": "yun",
  "pje-rain": "pje",
  "ln-festival": "ln",
};

export function wardrobeKey(
  baseCharacterId: string,
  battleVariantId: string,
  costumeId: string,
) {
  if (baseCharacterId === "moka" && battleVariantId === "moka-stage")
    return "moka-stage";
  return wardrobes[costumeId] === baseCharacterId ? costumeId : "";
}
