"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { ProjectDTO } from "@/lib/serializers";

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
  const [orderedProjects, setOrderedProjects] = useState(projects);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    setOrderedProjects(projects);
  }, [projects]);

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      return;
    }

    setOrderedProjects((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setDragIndex(null);
  }

  return (
    <>
      <div className="projects-board-hint">
        <span className="pill-indicator">
          <span className="pill-indicator-dot" /> Drag cards to prioritize
        </span>
      </div>
      <div className="projects-grid">
        {orderedProjects.map((project, index) => {
          const projectSeconds = project.tasks.reduce((acc, task) => acc + task.loggedSeconds, 0);
          const progressRatio = project.focusGoalMinutes ? Math.min(projectSeconds / (project.focusGoalMinutes * 60), 1) : null;
          const isDragging = dragIndex === index;

          return (
            <article
              key={project.id}
              className={`project-card ${isDragging ? "project-card-dragging" : ""}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(index)}
              onDragEnd={() => setDragIndex(null)}
            >
              <div className="project-card-header">
                <div>
                  <h3>{project.name}</h3>
                  <p className="project-summary">{project.summary}</p>
                </div>
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

              {project.objective ? <p className="project-objective">Objective: {project.objective}</p> : null}
              {project.successCriteria ? <p className="project-success">Success criteria: {project.successCriteria}</p> : null}

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
            </article>
          );
        })}
      </div>
    </>
  );
}
