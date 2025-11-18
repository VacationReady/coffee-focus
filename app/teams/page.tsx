import Link from "next/link";
import { redirect } from "next/navigation";

import { TeamsManager } from "@/components/projects/teams-manager";
import { getServerAuthSession } from "@/lib/auth";

export default async function TeamsPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return redirect("/login");
  }

  return (
    <div className="teams-shell">
      <div className="teams-top-bar">
        <div className="teams-nav">
          <div className="logo-chip logo-chip-ghost">Coffee Focus</div>
          <h1>Teams</h1>
        </div>
        <nav className="nav-links">
          <Link href="/projects" className="nav-link">
            Projects ↩
          </Link>
          <Link href="/stats" className="nav-link">
            Stats ↗
          </Link>
        </nav>
      </div>

      <section className="teams-list-section">
        <TeamsManager />
      </section>
    </div>
  );
}
