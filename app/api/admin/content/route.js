import { proxyLegacyApi } from "../../_lib/legacyApiProxy";
export const runtime = "nodejs";
const h = (r) => proxyLegacyApi(r);
export function GET() { return new Response(null, { status: 405 }); }
export { h as POST, h as PUT, h as PATCH, h as DELETE };