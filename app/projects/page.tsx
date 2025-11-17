
import Link from "next/link";
import { redirect } from "next/navigation";

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

function formatNoteDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ProjectsPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return redirect("/login");
  }

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
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
      <div className="projects-nav">
        <div className="logo-chip logo-chip-ghost">PeopleCore</div>
        <h1>Projects</h1>
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
        </div>
        <div className="projects-meter">
          <span>Total logged</span>
          <strong>{formatSecondsToMinutesLabel(totalSeconds)}</strong>
        </div>
      </section>

      {serialized.length === 0 ? (
        <div className="projects-empty">
          <p>No projects yet. Start a timer with a project intent to see it blossom here.</p>
          <Link href="/" className="btn btn-primary">
            Back to timer
          </Link>
        </div>
      ) : (
        <div className="projects-grid">
          {serialized.map((project) => {
            const projectSeconds = project.tasks.reduce((acc, task) => acc + task.loggedSeconds, 0);
            const progressRatio = project.focusGoalMinutes
              ? Math.min(projectSeconds / (project.focusGoalMinutes * 60), 1)
              : null;

            return (
              <article key={project.id} className="project-card">
                <div className="project-card-header">
                  <h3>{project.name}</h3>
                  <Link href="/" className="btn btn-ghost project-btn">
                    + Log time
                  </Link>
                </div>
                <div className="project-chips">
                  {project.chips.map((chip) => (
                    <span key={chip} className="project-chip">
                      {chip}
                    </span>
                  ))}
                </div>
                <p className="project-summary">{project.summary}</p>
                <div className="project-metrics">
                  <div>
                    <span>Logged</span>
                    <strong>{formatSecondsToMinutesLabel(projectSeconds)}</strong>
                  </div>
                  {project.focusGoalMinutes ? (
                    <div>
                      <span>Goal</span>
                      <strong>{project.focusGoalMinutes} min</strong>
                    </div>
                  ) : null}
                </div>
                {progressRatio !== null && (
                  <div className="project-progress">
                    <div className="project-progress-bar">
                      <div className="project-progress-fill" style={{ transform: `scaleX(${progressRatio})` }} />
                    </div>
                    <span>{Math.round(progressRatio * 100)}% of focus goal</span>
                  </div>
                )}
                <div className="project-task-list">
                  {project.tasks.map((task) => (
                    <div key={task.id} className="project-task">
                      <div className="project-task-main">
                        <p className="project-task-title">{task.title}</p>
                        <span className={`project-task-status project-task-status-${task.status}`}>
                          {task.status}
                        </span>
                      </div>
                      <div className="project-task-meta">
                        {task.estimateMinutes ? <span>{task.estimateMinutes} min est.</span> : null}
                        <span>{formatSecondsToMinutesLabel(task.loggedSeconds)} logged</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="project-notes-feed">
                  <div className="project-notes-header">
                    <span>Project notes</span>
                    <Link href="/" className="note-project-jump">
                      Log another ↗
                    </Link>
                  </div>
                  {project.notes.length === 0 ? (
                    <p className="project-notes-empty">
                      No notes yet. Finish a focus block to add one.
                    </p>
                  ) : (
                    project.notes.slice(0, 3).map((note) => (
                      <article key={note.id} className="project-note-card">
                        <p className="project-note-body">{note.body}</p>
                        <div className="project-note-meta">
                          <span>{note.author}</span>
                          <time>{formatNoteDate(note.createdAt)}</time>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
