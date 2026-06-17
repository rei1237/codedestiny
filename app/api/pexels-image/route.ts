import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getPexelsSectionImage, type PexelsImageSectionKey } from "../../../lib/server/pexels";

export const dynamic = "force-static";
export const runtime = "nodejs";
export const revalidate = false;

const PEXELS_SECTIONS = new Set<PexelsImageSectionKey>([
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

function resolveSection(value: string | null | undefined): PexelsImageSectionKey {
  const section = String(value || "default").trim().toLowerCase();
  return PEXELS_SECTIONS.has(section as PexelsImageSectionKey) ? (section as PexelsImageSectionKey) : "default";
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const section = resolveSection(url.searchParams.get("section"));
    const query = String(url.searchParams.get("query") || "").trim();

    const image = await getPexelsSectionImage(query, section);
    return NextResponse.json(image, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pexels image lookup failed";
    console.error("[api/pexels-image]", message);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
