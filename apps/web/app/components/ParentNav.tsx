"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/parent/home", label: "Home", icon: "🏠" },
  { href: "/parent/children", label: "Children", icon: "🧒" },
  { href: "/parent/fees", label: "Fees", icon: "💰" },
  { href: "/parent/inbox", label: "Messages", icon: "✉️" },
  { href: "/parent/profile", label: "Profile", icon: "👤" },
];

export default function ParentNav({ unread }: { unread: number }) {
  const pathname = usePathname();
  return (
    <nav className="parent-nav">
      {TABS.map((t) => {
        const active =
          pathname === t.href || (t.href !== "/parent/home" && pathname.startsWith(t.href));
        return (
          <Link key={t.href} href={t.href} className={active ? "active" : undefined}>
            <span className="ico">{t.icon}</span>
            {t.label}
            {t.href === "/parent/inbox" && unread > 0 && (
              <span className="parent-nav-badge">{unread}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
