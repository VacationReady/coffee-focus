import Link from "next/link";
import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TeamsPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return redirect("/login");
  }

  const teams = await prisma.team.findMany({
    where: { memberships: { some: { userId: session.user.id } } },
    orderBy: { createdAt: "asc" },
  });

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
        {teams.length === 0 ? (
          <p className="teams-empty">No teams yet. Create one from the Projects page header.</p>
        ) : (
          <ul className="teams-grid">
            {teams.map((team: { id: string; name: string }) => (
              <li key={team.id} className="teams-card">
                <div className="teams-card-main">
                  <h2>{team.name}</h2>
                </div>
                <Link href={`/teams/${team.id}`} className="nav-link nav-link-cta">
                  Open team ↗
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
