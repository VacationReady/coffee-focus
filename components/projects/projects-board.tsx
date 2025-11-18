"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { ProjectDTO } from "@/lib/serializers";
import { EditProjectPanel } from "./project-edit-panel";

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

function formatDateLabel(dateString?: string) {
  if (!dateString) {
    return "—";
  }
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeDayLabel(date: Date) {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function bucketProjectNotes<T extends { createdAt: string }>(notes: T[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - 6);

  const today: T[] = [];
  const thisWeek: T[] = [];
  const earlier: T[] = [];

  notes.forEach((note) => {
    const createdAt = new Date(note.createdAt);
    if (createdAt >= startOfToday) {
      today.push(note);
    } else if (createdAt >= startOfWeek) {
      thisWeek.push(note);
    } else {
      earlier.push(note);
    }
  });

  return { today, thisWeek, earlier };
}

type ProjectsBoardProps = {
  projects: ProjectDTO[];
};

type ProjectTabKey = "overview" | "tasks" | "activity" | "team" | "docs";

export function ProjectsBoard({ projects }: ProjectsBoardProps) {
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(() => projects[0]?.id ?? null);
  const [activeTabs, setActiveTabs] = useState<Record<string, ProjectTabKey>>({});

  const session = useSession();
  const router = useRouter();
  const currentUserId = session.data?.user?.id ?? null;

  const editingProject = editingProjectId ? projects.find((project) => project.id === editingProjectId) ?? null : null;

  const closeEditModal = useCallback(() => {
    setEditingProjectId(null);
  }, []);

  useEffect(() => {
    if (!editingProject) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeEditModal();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeEditModal, editingProject]);

  const handleAssignToMe = useCallback(
    async (taskId: string) => {
      if (!currentUserId) return;
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, assigneeId: currentUserId }),
      });
      if (!response.ok) {
        // In a real app we might show a toast; for now rely on backend validation.
        return;
      }
      router.refresh();
    },
    [currentUserId, router]
  );

  const handleClearAssignee = useCallback(
    async (taskId: string) => {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, assigneeId: null }),
      });
      if (!response.ok) {
        return;
      }
      router.refresh();
    },
    [router]
  );

  return (
    <div className="projects-content">
      <div className="projects-grid">
        {projects.map((project) => {
          const projectSeconds = project.tasks.reduce((acc, task) => acc + task.loggedSeconds, 0);
          const progressRatio = project.focusGoalMinutes ? Math.min(projectSeconds / (project.focusGoalMinutes * 60), 1) : null;
          const isExpanded = expandedProjectId === project.id;
          const activeTab: ProjectTabKey = activeTabs[project.id] ?? "overview";
          const totalNotes = project.notes.length;
          const latestNote = totalNotes > 0 ? project.notes[0] : null;
          const remainingNotes = totalNotes > 0 ? project.notes.slice(1) : [];
          const stickyNotes = project.stickyNotes ?? [];
          const activeStickyNotes = stickyNotes.filter((note) => !note.completed);
          const stickyPreview = activeStickyNotes.slice(0, 5);

          const { today: todayNotes, thisWeek: weekNotes, earlier: earlierNotes } = bucketProjectNotes(remainingNotes);

          const updatedAtDate = new Date(project.updatedAt);
          let lastActivityDate = updatedAtDate;
          if (latestNote) {
            const latestNoteDate = new Date(latestNote.createdAt);
            if (latestNoteDate.getTime() > lastActivityDate.getTime()) {
              lastActivityDate = latestNoteDate;
            }
          }
          if (stickyNotes[0]) {
            const latestStickyDate = new Date(stickyNotes[0].createdAt);
            if (latestStickyDate.getTime() > lastActivityDate.getTime()) {
              lastActivityDate = latestStickyDate;
            }
          }

          const lastActivityLabel = formatRelativeDayLabel(lastActivityDate);

          const now = new Date();
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const startOfWeek = new Date(startOfToday);
          startOfWeek.setDate(startOfToday.getDate() - 6);

          let recentRecapCount = 0;
          for (const note of project.notes) {
            const created = new Date(note.createdAt);
            if (created >= startOfWeek) {
              recentRecapCount += 1;
            } else {
              break;
            }
          }

          const collaboratorNames = Array.from(
            new Set(
              project.tasks
                .map((task) => task.assigneeName)
                .filter((name): name is string => Boolean(name))
            )
          );

          return (
            <article
              key={project.id}
              className={`project-card project-card-clickable ${isExpanded ? "project-card-expanded" : "project-card-collapsed"}`}
              onClick={() => setEditingProjectId(project.id)}
            >
              <div className="project-card-header">
                <div className="project-card-header-main">
                  <h3>{project.name}</h3>
                  <p className="project-summary">{project.summary}</p>
                </div>
                <div className="project-card-header-actions">
                  <button
                    type="button"
                    className="project-toggle-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      setExpandedProjectId((current) => (current === project.id ? null : project.id));
                    }}
                  >
                    {isExpanded ? "Hide details" : "Show details"}
                  </button>
                  <Link
                    href="/"
                    className="btn btn-ghost project-btn"
                    onClick={(event) => event.stopPropagation()}
                  >
                    + Log time
                  </Link>
                </div>
              </div>

              <div className="project-chips">
                {project.chips.map((chip) => (
                  <span key={chip} className="project-chip">
                    {chip}
                  </span>
                ))}
              </div>

              {project.objective ? <p className="project-objective">Objective: {project.objective}</p> : null}
              {project.successCriteria ? <p className="project-success">Success criteria: {project.successCriteria}</p> : null}

              {isExpanded ? (
                <div
                  className="project-tabs"
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                >
                  <button
                    type="button"
                    className={`project-tab ${activeTab === "overview" ? "project-tab-active" : ""}`}
                    onClick={() =>
                      setActiveTabs((current) => ({
                        ...current,
                        [project.id]: "overview",
                      }))
                    }
                  >
                    Overview
                  </button>
                  <button
                    type="button"
                    className={`project-tab ${activeTab === "tasks" ? "project-tab-active" : ""}`}
                    onClick={() =>
                      setActiveTabs((current) => ({
                        ...current,
                        [project.id]: "tasks",
                      }))
                    }
                  >
                    Tasks
                  </button>
                  <button
                    type="button"
                    className={`project-tab ${activeTab === "activity" ? "project-tab-active" : ""}`}
                    onClick={() =>
                      setActiveTabs((current) => ({
                        ...current,
                        [project.id]: "activity",
                      }))
                    }
                  >
                    Activity
                  </button>
                  <button
                    type="button"
                    className={`project-tab ${activeTab === "team" ? "project-tab-active" : ""}`}
                    onClick={() =>
                      setActiveTabs((current) => ({
                        ...current,
                        [project.id]: "team",
                      }))
                    }
                  >
                    Team
                  </button>
                  <button
                    type="button"
                    className={`project-tab ${activeTab === "docs" ? "project-tab-active" : ""}`}
                    onClick={() =>
                      setActiveTabs((current) => ({
                        ...current,
                        [project.id]: "docs",
                      }))
                    }
                  >
                    Docs
                  </button>
                </div>
              ) : null}

              <div className="project-metrics">
                <div>
                  <span>Logged</span>
                  <strong>{formatSecondsToMinutesLabel(projectSeconds)}</strong>
                </div>
                {project.focusGoalMinutes ? (
                  <div>
                    <span>Goal progress</span>
                    <strong>{Math.round((projectSeconds / (project.focusGoalMinutes * 60 || 1)) * 100)}%</strong>
                  </div>
                ) : null}
              </div>
              {progressRatio !== null ? (
                <div className="project-progress">
                  <div className="project-progress-bar">
                    <div className="project-progress-fill" style={{ transform: `scaleX(${progressRatio})` }} />
                  </div>
                  <span>{Math.round(progressRatio * 100)}% of focus goal</span>
                </div>
              ) : null}

              {isExpanded ? (
                <>
                  {activeTab === "overview" ? (
                    <div className="project-meta-grid">
                      <div className="project-meta-item">
                        <span>Owner</span>
                        <strong>{project.owner ?? "Unassigned"}</strong>
                      </div>
                      <div className="project-meta-item">
                        <span>Priority</span>
                        <strong>{project.priority ?? "Triage"}</strong>
                      </div>
                      <div className="project-meta-item">
                        <span>Start</span>
                        <strong>{formatDateLabel(project.startDate)}</strong>
                      </div>
                      <div className="project-meta-item">
                        <span>Target launch</span>
                        <strong>{formatDateLabel(project.targetLaunchDate)}</strong>
                      </div>
                      <div className="project-meta-item">
                        <span>Budget</span>
                        <strong>{project.budget ?? "—"}</strong>
                      </div>
                      {project.focusGoalMinutes ? (
                        <div className="project-meta-item">
                          <span>Focus goal</span>
                          <strong>{project.focusGoalMinutes} min</strong>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {activeTab === "tasks" ? (
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
                            <span>{task.assigneeName ? `Assigned: ${task.assigneeName}` : "Unassigned"}</span>
                            {currentUserId ? (
                              <button
                                type="button"
                                className="btn btn-ghost project-task-assign-btn"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (task.assigneeId === currentUserId) {
                                    void handleClearAssignee(task.id);
                                  } else {
                                    void handleAssignToMe(task.id);
                                  }
                                }}
                              >
                                {task.assigneeId === currentUserId ? "Unassign me" : "Assign to me"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {activeTab === "activity" ? (
                    <div className="project-health-strip">
                      <div className="project-health-item">
                        <span>Last activity</span>
                        <strong>{lastActivityLabel}</strong>
                      </div>
                      <div className="project-health-item">
                        <span>Recaps (7d)</span>
                        <strong>{recentRecapCount}</strong>
                      </div>
                      <div className="project-health-item">
                        <span>Open inline notes</span>
                        <strong>{activeStickyNotes.length}</strong>
                      </div>
                    </div>
                  ) : null}

                  {activeTab === "team" ? (
                    <div className="project-team-panel">
                      <div className="project-team-header-row">
                        <div className="project-team-owner">
                          <span className="project-team-label">Owner</span>
                          <strong className="project-team-value">{project.owner ?? "Unassigned"}</strong>
                        </div>
                        <div className="project-team-summary">
                          <span className="project-team-pill">
                            {collaboratorNames.length === 0
                              ? "No active collaborators yet"
                              : `${collaboratorNames.length} active collaborator${collaboratorNames.length === 1 ? "" : "s"}`}
                          </span>
                        </div>
                      </div>
                      {collaboratorNames.length > 0 ? (
                        <div className="project-team-collaborators">
                          {collaboratorNames.map((name) => (
                            <span key={name} className="project-team-chip">
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {project.stakeholders.length > 0 ? (
                        <div className="project-stakeholders">
                          <span>Stakeholders</span>
                          <div className="project-stakeholders-list">
                            {project.stakeholders.map((person) => (
                              <span key={person}>{person}</span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {activeTab === "docs" ? (
                    <div className="project-notes-feed">
                      <div className="project-notes-header">
                        <span>Project notes</span>
                        <div className="project-notes-header-meta">
                          <span className="project-notes-count">
                            {totalNotes === 0
                              ? "No notes yet"
                              : `${totalNotes} note${totalNotes === 1 ? "" : "s"}`}
                          </span>
                          <Link href="/" className="note-project-jump">
                            Log from timer ↗
                          </Link>
                        </div>
                      </div>
                      {totalNotes === 0 && stickyPreview.length === 0 ? (
                        <p className="project-notes-empty">
                          No notes yet. Finish a focus block and add a quick recap.
                        </p>
                      ) : (
                        <div className="project-notes-body">
                          {totalNotes > 0 ? (
                            <div className="project-notes-recaps">
                              {latestNote ? (
                                <article className="project-note-card project-note-card-highlight">
                                  <p className="project-note-body">{latestNote.body}</p>
                                  <div className="project-note-meta">
                                    <span>{latestNote.author}</span>
                                    <time>{formatNoteDate(latestNote.createdAt)}</time>
                                  </div>
                                </article>
                              ) : null}
                              {todayNotes.length > 0 ? (
                                <div className="project-notes-section">
                                  <p className="project-notes-section-title">Today</p>
                                  <div className="project-notes-list">
                                    {todayNotes.map((note) => (
                                      <div key={note.id} className="project-notes-row">
                                        <p className="project-notes-row-body">{note.body}</p>
                                        <div className="project-notes-row-meta">
                                          <span>{note.author}</span>
                                          <time>{formatNoteDate(note.createdAt)}</time>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                              {weekNotes.length > 0 ? (
                                <div className="project-notes-section">
                                  <p className="project-notes-section-title">This week</p>
                                  <div className="project-notes-list">
                                    {weekNotes.map((note) => (
                                      <div key={note.id} className="project-notes-row">
                                        <p className="project-notes-row-body">{note.body}</p>
                                        <div className="project-notes-row-meta">
                                          <span>{note.author}</span>
                                          <time>{formatNoteDate(note.createdAt)}</time>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                              {earlierNotes.length > 0 ? (
                                <div className="project-notes-section">
                                  <p className="project-notes-section-title">Earlier</p>
                                  <div className="project-notes-list">
                                    {earlierNotes.map((note) => (
                                      <div key={note.id} className="project-notes-row">
                                        <p className="project-notes-row-body">{note.body}</p>
                                        <div className="project-notes-row-meta">
                                          <span>{note.author}</span>
                                          <time>{formatNoteDate(note.createdAt)}</time>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                          {stickyPreview.length > 0 ? (
                            <div className="project-inline-notes">
                              <div className="project-inline-notes-header">
                                <span>Inline notes</span>
                                <span className="project-inline-notes-count">
                                  {activeStickyNotes.length} open
                                </span>
                              </div>
                              <div className="project-inline-notes-list">
                                {stickyPreview.map((note) => (
                                  <div key={note.id} className="project-inline-note">
                                    <span className="project-inline-note-dot" />
                                    <p className="project-inline-note-body">
                                      {note.text || "(Empty note)"}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ) : null}
                </>
              ) : null}
            </article>
          );
        })}
      </div>

      <aside className="projects-side-panel">
        {editingProject ? (
          <EditProjectPanel project={editingProject} onSuccess={closeEditModal} />
        ) : (
          <div className="projects-side-placeholder">
            <p>Select a project card to edit its details.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
