import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SiteLogo from "../../components/SiteLogo";
import { readSessionToken } from "@/lib/auth/session";
import { AdminNav, AdminTopbar } from "./AdminNav";
import "./admin.css";

// Admin pages read live platform data per request — never prerender.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = await cookies();
  const session = readSessionToken(store.get("mtanda_session")?.value);
  if (!session || session.userType !== "PLATFORM_ADMIN") {
    redirect("/login?next=/admin/dashboard");
  }

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <div className="brand">
          <SiteLogo tone="light" height={36} />
          <div style={{ fontSize: "0.75rem", color: "#7d878f", marginTop: "0.35rem" }}>
            SUPER ADMIN
          </div>
        </div>
        <AdminNav />
      </aside>
      <div className="admin-main">
        <AdminTopbar email={session.email} />
        {children}
      </div>
    </div>
  );
}
