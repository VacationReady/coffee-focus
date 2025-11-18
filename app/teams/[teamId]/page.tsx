import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProjectsBoard } from "@/components/projects/projects-board";
import { TeamMembersManager } from "@/components/teams/team-members-manager";
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

function formatDateLabel(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type TeamPageProps = {
  params: { teamId: string };
};

export default async function TeamDetailPage({ params }: TeamPageProps) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return redirect("/login");
  }

  const teamId = params.teamId;

  const team = await prisma.team.findFirst({
    where: { id: teamId, memberships: { some: { userId: session.user.id } } },
    include: {
      memberships: {
        include: {
          user: true,
        },
      },
      projects: {
        include: projectInclude,
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!team) {
    notFound();
  }

  const projects: ProjectDTO[] = team.projects.map(serializeProject);
  const totalSeconds = projects.reduce(
    (acc, project) =>
      acc + project.tasks.reduce((sum, task) => sum + task.loggedSeconds, 0),
    0,
  );

  const members = team.memberships
    .map(
      (membership: { user: { id: string; name: string | null; email: string | null } | null }) =>
        membership.user,
    )
    .filter(
      (user: { id: string; name: string | null; email: string | null } | null):
        user is { id: string; name: string | null; email: string | null } =>
        Boolean(user),
    );

  const initialMembers = team.memberships
    .map((membership) =>
      membership.user
        ? {
            membershipId: membership.id,
            userId: membership.user.id,
            name: membership.user.name,
            email: membership.user.email,
            role: membership.role as string,
          }
        : null,
    )
    .filter(
      (member):
        member is {
          membershipId: string;
          userId: string;
          name: string | null;
          email: string | null;
          role: string;
        } => Boolean(member),
    );

  const currentUserId = session.user.id;
  const managingMembership = team.memberships.find((membership) => membership.userId === currentUserId);
  const canManageMembers =
    managingMembership && (managingMembership.role === "owner" || managingMembership.role === "admin");

  const notes = projects.flatMap((project) =>
    project.notes.map((note) => ({
      id: note.id,
      projectId: note.projectId,
      projectName: project.name,
      body: note.body,
      author: note.author,
      createdAt: note.createdAt,
    })),
  );

  const recentNotes = notes
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 10);

  return (
    <div className="team-shell">
      <div className="team-top-bar">
        <div className="team-nav">
          <div className="logo-chip logo-chip-ghost">Coffee Focus</div>
          <h1>{team.name}</h1>
        </div>
        <nav className="nav-links">
          <Link href="/teams" className="nav-link">
            Teams ↩
          </Link>
          <Link href="/projects" className="nav-link">
            Projects ↗
          </Link>
        </nav>
      </div>

      <section className="team-header">
        <div className="team-header-main">
          <p className="projects-tag">Team overview</p>
          <h2>Collaboration hub</h2>
          <p className="projects-subcopy">
            {projects.length === 0
              ? "No projects yet for this team."
              : `${projects.length} active project${projects.length === 1 ? "" : "s"}.`}
          </p>
        </div>
        <div className="team-header-meta">
          <div className="team-meter">
            <span>Projects focus logged</span>
            <strong>{formatSecondsToMinutesLabel(totalSeconds)}</strong>
          </div>
          <div className="team-meter">
            <span>Members</span>
            <strong>{members.length}</strong>
          </div>
        </div>
      </section>

      <section className="team-layout">
        <div className="team-projects">
          {projects.length === 0 ? (
            <div className="projects-empty">
              <p>Spin up a mission from the Projects page and attach it to this team.</p>
            </div>
          ) : (
            <ProjectsBoard projects={projects} />
          )}
        </div>
        <aside className="team-sidebar">
          <TeamMembersManager
            teamId={teamId}
            initialMembers={initialMembers}
            canManage={Boolean(canManageMembers)}
            currentUserId={currentUserId}
          />
          <div className="team-activity">
            <h3>Recent recaps</h3>
            {recentNotes.length === 0 ? (
              <p className="team-activity-empty">No project notes yet. Complete focus blocks and add recaps from the timer.</p>
            ) : (
              <ul className="team-activity-list">
                {recentNotes.map((note) => (
                  <li key={note.id} className="team-activity-item">
                    <p className="team-activity-project">{note.projectName}</p>
                    <p className="team-activity-body">{note.body}</p>
                    <div className="team-activity-meta">
                      <span>{note.author}</span>
                      <time>{formatDateLabel(note.createdAt)}</time>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
