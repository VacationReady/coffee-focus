
import Link from "next/link";
import { redirect } from "next/navigation";

import { AddProjectModal } from "@/components/projects/add-project-modal";
import { ProjectsBoard } from "@/components/projects/projects-board";
import { TeamsManager } from "@/components/projects/teams-manager";
import { getServerAuthSession } from "@/lib/auth";
import { projectInclude } from "@/lib/project-query";
import { prisma } from "@/lib/prisma";
import { serializeProject, type ProjectDTO } from "@/lib/serializers";

function formatSecondsToMinutesLabel(seconds: number): string {
  const totalMinutes = Math.round(Math.max(0, seconds) / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

export default async function ProjectsPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return redirect("/login");
  }

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { userId: session.user.id },
        { team: { memberships: { some: { userId: session.user.id } } } },
      ],
    },
    include: projectInclude,
    orderBy: { updatedAt: "desc" },
  });

  const serialized: ProjectDTO[] = projects.map(serializeProject);
  const totalSeconds = serialized.reduce(
    (acc, project) =>
      acc + project.tasks.reduce((sum, task) => sum + task.loggedSeconds, 0),
    0
  );

  return (
    <div className="projects-shell">
      <div className="projects-top-bar">
        <div className="projects-nav">
          <div className="logo-chip logo-chip-ghost">Coffee Focus</div>
          <h1>Projects</h1>
        </div>
        <nav className="nav-links">
          <Link href="/" className="nav-link">
            Timer ↩
          </Link>
          <Link href="/stats" className="nav-link">
            Stats ↗
          </Link>
        </nav>
      </div>

      <section className="projects-header">
        <div>
          <p className="projects-tag">Active roster</p>
          <h2>Arcade board</h2>
          <p className="projects-subcopy">{serialized.length === 0 ? "No active missions yet" : `${serialized.length} active missions`}</p>
        </div>
        <div className="projects-header-meta">
          <div className="projects-meter">
            <span>Total logged</span>
            <strong>{formatSecondsToMinutesLabel(totalSeconds)}</strong>
          </div>
          <TeamsManager />
          <AddProjectModal />
        </div>
      </section>

      <section className="projects-canvas">
        {serialized.length === 0 ? (
          <div className="projects-empty">
            <p>Everything starts here. Tap “Add Project” to spin up your first mission.</p>
          </div>
        ) : (
          <ProjectsBoard projects={serialized} />
        )}
      </section>
    </div>
  );
}
