"use client";

import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "../../components/ThemeToggle";

const NAV: { label?: string; href?: string; title?: string }[] = [
  { title: "Dashboard", href: "/admin/dashboard" },
  { label: "Manage" },
  { title: "Schools", href: "/admin/schools" },
  { title: "Subscriptions", href: "/admin/subscriptions" },
  { title: "Platform Revenue", href: "/admin/revenue" },
  { title: "Users", href: "/admin/users" },
  { title: "Analytics", href: "/admin/analytics" },
  { label: "Platform" },
  { title: "Plans & Pricing", href: "/admin/plans" },
  { title: "Email Settings", href: "/admin/email" },
  { title: "Payment Settings", href: "/admin/payment-settings" },
  { title: "WhatsApp", href: "/admin/whatsapp" },
  { title: "Integrations", href: "/admin/integrations" },
  { title: "Domains", href: "/admin/domains" },
  { title: "Announcements", href: "/admin/announcements" },
  { title: "Support", href: "/admin/support" },
  { label: "Operations" },
  { title: "Security", href: "/admin/security" },
  { title: "System", href: "/admin/system" },
  { title: "My Account", href: "/admin/account" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav>
      {NAV.map((item, i) =>
        item.label ? (
          <div key={i} className="section-label">
            {item.label}
          </div>
        ) : (
          <a
            key={i}
            href={item.href}
            className={
              pathname === item.href || pathname?.startsWith(item.href + "/")
                ? "active"
                : undefined
            }
          >
            {item.title}
          </a>
        )
      )}
    </nav>
  );
}

export function AdminTopbar({ email }: { email: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="admin-util">
      <span className="admin-util-email">{email}</span>
      <ThemeToggle />
      <button type="button" className="admin-util-logout" onClick={logout}>
        Log out
      </button>
    </div>
  );
}
