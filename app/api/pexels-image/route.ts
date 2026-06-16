import { NextRequest, NextResponse } from "next/server";
import { getPexelsSectionImage, type PexelsImageSectionKey } from "../../../lib/server/pexels";

const ALLOWED_SECTIONS = new Set<PexelsImageSectionKey>([
  "saju",
  "tarot",
  "astrology",
  "ziwei",
  "sukuyo",
  "vedic",
  "dream",
  "famous",
  "career",
  "love",
  "wealth",
  "health",
  "default",
]);

function normalizeSection(value: string | null): PexelsImageSectionKey {
  const section = String(value || "default").trim() as PexelsImageSectionKey;
  return ALLOWED_SECTIONS.has(section) ? section : "default";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const section = normalizeSection(searchParams.get("section"));
  const query = String(searchParams.get("query") || "").trim();
  const image = await getPexelsSectionImage(query, section);

  return NextResponse.json(image, {
    headers: {
      "Cache-Control": image.source === "pexels"
        ? "public, s-maxage=604800, stale-while-revalidate=86400"
        : "no-store",
    },
  });
}
