"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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

type ProjectsBoardProps = {
  projects: ProjectDTO[];
};

export function ProjectsBoard({ projects }: ProjectsBoardProps) {
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(() => projects[0]?.id ?? null);

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

  return (
    <div className="projects-content">
      <div className="projects-grid">
          {projects.map((project) => {
            const projectSeconds = project.tasks.reduce((acc, task) => acc + task.loggedSeconds, 0);
            const progressRatio = project.focusGoalMinutes ? Math.min(projectSeconds / (project.focusGoalMinutes * 60), 1) : null;
            const isExpanded = expandedProjectId === project.id;

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

                {isExpanded && project.stakeholders.length > 0 ? (
                  <div className="project-stakeholders">
                    <span>Stakeholders</span>
                    <div className="project-stakeholders-list">
                      {project.stakeholders.map((person) => (
                        <span key={person}>{person}</span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {isExpanded ? (
                  <div className="project-task-list">
                    {project.tasks.map((task) => (
                      <div key={task.id} className="project-task">
                        <div className="project-task-main">
                          <p className="project-task-title">{task.title}</p>
                          <span className={`project-task-status project-task-status-${task.status}`}>{task.status}</span>
                        </div>
                        <div className="project-task-meta">
                          {task.estimateMinutes ? <span>{task.estimateMinutes} min est.</span> : null}
                          <span>{formatSecondsToMinutesLabel(task.loggedSeconds)} logged</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {isExpanded ? (
                  <div className="project-notes-feed">
                    <div className="project-notes-header">
                      <span>Project notes</span>
                      <Link href="/" className="note-project-jump">
                        Log another ↗
                      </Link>
                    </div>
                    {project.notes.length === 0 ? (
                      <p className="project-notes-empty">No notes yet. Finish a focus block to add one.</p>
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
