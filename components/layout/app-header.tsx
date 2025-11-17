"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const NAV_LINKS = [
  { href: "/", label: "Timer" },
  { href: "/projects", label: "Projects" },
  { href: "/notes", label: "Notes" },
  { href: "/stats", label: "Stats" },
];

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((segment) => segment[0]?.toUpperCase())
      .join("")
      .slice(0, 2);
  }
  return email ? email[0]?.toUpperCase() ?? "?" : "?";
}

export function AppHeader() {
  const pathname = usePathname();
  const session = useSession();

  const isAuthed = session.status === "authenticated" && Boolean(session.data?.user?.id);
  const initials = isAuthed ? getInitials(session.data?.user?.name, session.data?.user?.email) : undefined;

  if (!isAuthed) {
    return null;
  }

  return (
    <header className="app-header">
      <div className="app-header-left">
        <Link href="/" className="app-header-logo">
          <span className="logo-dot" />
          PeopleCore
        </Link>
        <nav className="app-header-nav">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`app-header-link ${pathname === link.href ? "app-header-link-active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="app-header-right">
        <div className="app-header-user">
          <div className="app-header-avatar">{initials}</div>
          <div className="app-header-user-meta">
            <span className="app-header-user-name">{session.data?.user?.name ?? "Cabin Crew"}</span>
            <span className="app-header-user-email">{session.data?.user?.email}</span>
          </div>
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    </header>
  );
}
