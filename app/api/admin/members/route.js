import { proxyLegacyApi } from "@/app/api/_lib/legacyApiProxy";
export const runtime = "nodejs";
const h = (r) => proxyLegacyApi(r);
export { h as GET, h as POST, h as PUT, h as PATCH, h as DELETE };