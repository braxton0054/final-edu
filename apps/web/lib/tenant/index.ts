// The `x-tenant-slug` request header is injected by apps/web/proxy.ts from the
// request host (e.g. <school>.mtandaolabsedu.com -> "<school>").
export function getTenantSlug(headers: Headers): string | null {
  return headers.get("x-tenant-slug");
}
