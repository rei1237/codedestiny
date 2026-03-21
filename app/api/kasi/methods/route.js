import { NextResponse } from "next/server";

const ALLOWED_METHODS = ["getLunCalInfo", "getSolCalInfo", "get24DivisionsInfo"];

export async function GET() {
  return NextResponse.json({ ok: true, methods: ALLOWED_METHODS });
}
