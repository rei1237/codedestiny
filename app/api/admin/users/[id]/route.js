import { proxyLegacyApiWithRewrite } from "../../../_lib/legacyApiProxy";

export const runtime = "nodejs";

// PATCH /api/admin/users/:id → Express PATCH /api/admin/users/:id/flower
export function PATCH(request, { params }) {
  const id = params?.id || "";
  return proxyLegacyApiWithRewrite(request, () => `/api/admin/users/${id}/flower`);
}

// DELETE /api/admin/users/:id → Express DELETE /api/admin/users/:id/flower
export function DELETE(request, { params }) {
  const id = params?.id || "";
  return proxyLegacyApiWithRewrite(request, () => `/api/admin/users/${id}/flower`);
}
