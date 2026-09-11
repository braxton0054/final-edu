"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; badge?: number };
type Group = { id: string; label: string; items: Item[] };

export default function TenantSidebar({
  schoolShortName,
  groups,
}: {
  schoolShortName: string;
  groups: Group[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [g.id, true]))
  );

  return (
    <>
      <div className="tenant-brand">
        <span className="tenant-brand-mark">
          {(schoolShortName || "M").slice(0, 2).toUpperCase()}
        </span>
        <span className="tenant-brand-name">{schoolShortName}</span>
      </div>

      <nav>
        {groups.map((group) => (
          <div key={group.id} className="tenant-nav-group">
            <button
              type="button"
              className="tenant-nav-toggle"
              onClick={() => setOpen((o) => ({ ...o, [group.id]: !o[group.id] }))}
              aria-expanded={Boolean(open[group.id])}
            >
              {group.label}
              <span className="chev">{open[group.id] ? "▾" : "▸"}</span>
            </button>
            {open[group.id] &&
              group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    pathname === item.href ? "tenant-nav-link active" : "tenant-nav-link"
                  }
                >
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="tenant-nav-badge">{item.badge}</span>
                  )}
                </Link>
              ))}
          </div>
        ))}
      </nav>
    </>
  );
}
