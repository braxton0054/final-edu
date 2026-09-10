// Placeholder: resolve tenant from headers set in middleware.ts
export function getTenantSlug(headers: Headers): string | null {
  return headers.get("x-tenant-slug");
}
