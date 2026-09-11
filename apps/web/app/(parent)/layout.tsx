import Link from "next/link";
import { redirect } from "next/navigation";
import { requireParentActor } from "@/lib/auth/tenant-actor";

// Parent portal shell. Only PARENT sessions with a school attached render.
export const dynamic = "force-dynamic";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const parent = await requireParentActor();
  if (!parent.ok) {
    redirect("/login?next=/parent/inbox");
  }

  return (
    <div style={{ display: "flex" }}>
      <aside style={{ width: 220, borderRight: "1px solid #eee", padding: "1rem" }}>
        <strong>Parent Portal</strong>
        <nav style={{ display: "grid", gap: "0.5rem", marginTop: "1rem" }}>
          <Link href="/parent/inbox">Inbox</Link>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: "1rem" }}>{children}</main>
    </div>
  );
}
