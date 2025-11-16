"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

import { formatSecondsToMinutesLabel } from "../lib/sessionUtils";
import {
  PROJECTS_STORAGE_KEY,
  ProjectRecord,
  safeParseProjects,
  seedProjects,
} from "../lib/projectUtils";

function formatNoteDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
    let parsed = safeParseProjects(raw);
    if (parsed.length === 0) {
      parsed = seedProjects();
      window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(parsed));
    }
    setProjects(parsed);
  }, []);

  const totalSeconds = useMemo(
    () =>
      projects.reduce(
        (acc, project) =>
          acc + project.tasks.reduce((taskSum, task) => taskSum + task.loggedSeconds, 0),
        0
      ),
    [projects]
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

      <div className="projects-grid">
        {projects.map((project) => {
          const projectSeconds = project.tasks.reduce(
            (acc, task) => acc + task.loggedSeconds,
            0
          );
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
                    <div
                      className="project-progress-fill"
                      style={{ transform: `scaleX(${progressRatio})` }}
                    />
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
                      {task.estimateMinutes && (
                        <span>{task.estimateMinutes} min est.</span>
                      )}
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
                  project.notes
                    .slice()
                    .reverse()
                    .slice(0, 3)
                    .map((note) => (
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
    </div>
  );
}
