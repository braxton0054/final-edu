import Link from "next/link";

// Tenant pages read live school data per request — never prerender.
export const dynamic = "force-dynamic";

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex" }}>
      <aside style={{ width: 220, borderRight: "1px solid #eee", padding: "1rem" }}>
        <strong>School Portal</strong>
        <nav style={{ display: "grid", gap: "0.5rem", marginTop: "1rem" }}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/settings/whatsapp">Settings → WhatsApp</Link>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: "1rem" }}>{children}</main>
    </div>
  );
}
