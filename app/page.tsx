"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  Session,
  STORAGE_KEY,
  formatSecondsToMMSS,
  safeParseSessions,
} from "./lib/sessionUtils";
import {
  StickyNote,
  NOTES_STORAGE_KEY,
  safeParseNotes,
  generateNoteId,
} from "./lib/noteUtils";
import {
  FocusIntent,
  FOCUS_INTENT_KEY,
  PROJECTS_STORAGE_KEY,
  addSecondsToProjectTask,
  generateProjectNoteId,
  safeParseFocusIntent,
  safeParseProjects,
  seedProjects,
} from "./lib/projectUtils";
import type { ProjectRecord } from "./lib/projectUtils";

type ProjectSelection = {
  projectId: string;
  taskId: string;
  projectName: string;
  taskTitle: string;
};

export default function HomePage() {
  const [minutesInput, setMinutesInput] = useState<number>(50);
  const [durationSeconds, setDurationSeconds] = useState<number>(50 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(50 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [hasEverStarted, setHasEverStarted] = useState<boolean>(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [draggedNote, setDraggedNote] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [focusIntent, setFocusIntent] = useState<FocusIntent | null>(null);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [showProjectPrompt, setShowProjectPrompt] = useState(false);
  const [selectedProjectTask, setSelectedProjectTask] = useState<ProjectSelection | null>(null);
  const [completionNote, setCompletionNote] = useState("");
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [noteProjectPickerId, setNoteProjectPickerId] = useState<string | null>(null);
  const [pendingCompletionIntent, setPendingCompletionIntent] = useState<FocusIntent | null>(null);
  const [noteProjectDraft, setNoteProjectDraft] = useState<string | null>(null);

  const applyProjectsToStorage = useCallback((next: ProjectRecord[]) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const projectTaskOptions = useMemo(() => {
    return projects.flatMap((project) =>
      project.tasks.map((task) => ({
        projectId: project.id,
        taskId: task.id,
        projectName: project.name,
        taskTitle: task.title,
      }))
    );
  }, [projects]);

  const projectOptions = useMemo(
    () => projects.map((project) => ({ id: project.id, name: project.name })),
    [projects]
  );

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((project) => {
      map.set(project.id, project.name);
    });
    return map;
  }, [projects]);

  useEffect(() => {
    if (!noteProjectPickerId) {
      setNoteProjectDraft(null);
    }
  }, [noteProjectPickerId]);

  useEffect(() => {
    if (!showProjectPrompt || selectedProjectTask || projectTaskOptions.length === 0) return;
    setSelectedProjectTask(projectTaskOptions[0]);
  }, [projectTaskOptions, selectedProjectTask, showProjectPrompt]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    setSessions(safeParseSessions(raw));
    const notesRaw = window.localStorage.getItem(NOTES_STORAGE_KEY);
    setNotes(safeParseNotes(notesRaw));
    const focusRaw = window.localStorage.getItem(FOCUS_INTENT_KEY);
    const parsedIntent = safeParseFocusIntent(focusRaw);
    if (parsedIntent) {
      setFocusIntent(parsedIntent);
      updateFromMinutes(parsedIntent.minutes);
    }
    const projectsRaw = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
    let parsedProjects = safeParseProjects(projectsRaw);
    if (parsedProjects.length === 0) {
      parsedProjects = seedProjects();
      window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(parsedProjects));
    }
    setProjects(parsedProjects);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // ignore
    }
  }, [sessions]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch {
      // ignore
    }
  }, [notes]);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  }, []);

  const clearFocusIntent = useCallback(() => {
    setFocusIntent(null);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(FOCUS_INTENT_KEY);
    } catch {
      // ignore
    }
  }, []);

  const syncProjectsWithLog = useCallback(
    (intent: FocusIntent | null, seconds: number) => {
      if (!intent || typeof window === "undefined") return;
      const rawProjects = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
      const parsedProjects = rawProjects ? safeParseProjects(rawProjects) : projects;
      if (parsedProjects.length === 0) return;
      const nextProjects = addSecondsToProjectTask(
        parsedProjects,
        intent.projectId,
        intent.taskId,
        seconds
      );
      if (nextProjects === parsedProjects) return;
      setProjects(nextProjects);
      applyProjectsToStorage(nextProjects);
    },
    [applyProjectsToStorage, projects]
  );

  const updateFromMinutes = useCallback(
    (minValue: number) => {
      const mins = Math.max(1, Math.min(480, Math.round(minValue || 0)));
      setMinutesInput(mins);
      const seconds = mins * 60;
      setDurationSeconds(seconds);
      if (!isRunning) {
        setRemainingSeconds(seconds);
      }
    },
    [isRunning]
  );

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setRemainingSeconds(durationSeconds);
    setHasEverStarted(false);
  }, [durationSeconds]);

  const addSession = useCallback(
    (seconds: number, attribution?: FocusIntent | null) => {
      const clamped = Math.max(1, Math.round(seconds));
      const now = new Date();
      setSessions((prev) => [
        ...prev,
        {
          seconds: clamped,
          date: now.toISOString(),
        },
      ]);
      const intentForLog = attribution ?? focusIntent;
      if (intentForLog) {
        syncProjectsWithLog(intentForLog, clamped);
        showToast(`Logged to ${intentForLog.projectName} • ${intentForLog.taskTitle}`);
        if (focusIntent) {
          clearFocusIntent();
        }
      } else {
        showToast("Logged to your cup history.");
      }
    },
    [clearFocusIntent, focusIntent, showToast, syncProjectsWithLog]
  );

  const dismissCompletionModal = useCallback(() => {
    setCompletionNote("");
    setShowCompletionModal(false);
    setPendingCompletionIntent(null);
  }, []);

  const finalizeCompletion = useCallback(
    (noteBody: string) => {
      const intent = pendingCompletionIntent;
      if (!intent || typeof window === "undefined") {
        dismissCompletionModal();
        return;
      }
      const rawProjects = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
      const parsedProjects = rawProjects ? safeParseProjects(rawProjects) : projects;
      const timestamp = new Date().toISOString();
      const nextProjects = parsedProjects.map((project) => {
        if (project.id !== intent.projectId) return project;
        const noteId = generateProjectNoteId();
        const note = {
          id: noteId,
          body: noteBody || "Logged focus block",
          author: "You",
          createdAt: timestamp,
        };
        return {
          ...project,
          notes: [...project.notes, note],
          updatedAt: timestamp,
        };
      });
      setProjects(nextProjects);
      applyProjectsToStorage(nextProjects);
      dismissCompletionModal();
    },
    [applyProjectsToStorage, dismissCompletionModal, pendingCompletionIntent, projects]
  );

  const completeTimer = useCallback(() => {
    setIsRunning(false);
    setRemainingSeconds(0);
    setHasEverStarted(true);
    const intentSnapshot = focusIntent;
    addSession(durationSeconds, intentSnapshot);
    if (intentSnapshot) {
      setPendingCompletionIntent(intentSnapshot);
      setCompletionNote("");
      setShowCompletionModal(true);
    }
  }, [addSession, durationSeconds, focusIntent]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = prev - 0.2;
        if (next <= 0.3) {
          clearInterval(interval);
          setTimeout(() => {
            completeTimer();
          }, 0);
          return 0;
        }
        return next;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isRunning, completeTimer]);

  const handleStart = () => {
    if (durationSeconds <= 0) return;
    if (!hasEverStarted) {
      setRemainingSeconds(durationSeconds);
    }
    if (!focusIntent) {
      openProjectPrompt();
      return;
    }
    setIsRunning(true);
    setHasEverStarted(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleLogNow = () => {
    const worked = durationSeconds - remainingSeconds;
    if (worked > 0.5) {
      const intentSnapshot = focusIntent;
      addSession(worked, intentSnapshot);
      if (intentSnapshot) {
        setPendingCompletionIntent(intentSnapshot);
        setCompletionNote("");
        setShowCompletionModal(true);
      }
    } else {
      showToast("Too short to log.");
    }
    resetTimer();
  };

  const addNote = (overrides?: Partial<StickyNote>) => {
    const newNote: StickyNote = {
      id: generateNoteId(),
      text: "",
      x: 100,
      y: 100,
      completed: false,
      createdAt: new Date().toISOString(),
      projectId: overrides?.projectId,
    };
    setNotes((prev) => [...prev, newNote]);
  };

  const updateNoteText = (id: string, text: string) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, text } : note))
    );
  };

  const selectProjectTask = (selection: ProjectSelection | null) => {
    setSelectedProjectTask(selection);
    setNoteProjectPickerId(null);
  };

  const handleProjectTaskChange = (taskId: string) => {
    const nextSelection = projectTaskOptions.find((option) => option.taskId === taskId) || null;
    selectProjectTask(nextSelection);
  };

  const openProjectPrompt = () => {
    if (projects.length === 0) {
      const seeded = seedProjects();
      setProjects(seeded);
      applyProjectsToStorage(seeded);
    }
    setShowProjectPrompt(true);
  };

  const confirmProjectPrompt = (attach: boolean) => {
    if (attach && selectedProjectTask) {
      const intent: FocusIntent = {
        projectId: selectedProjectTask.projectId,
        taskId: selectedProjectTask.taskId,
        projectName: selectedProjectTask.projectName,
        taskTitle: selectedProjectTask.taskTitle,
        minutes: minutesInput,
        createdAt: new Date().toISOString(),
      };
      setFocusIntent(intent);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(FOCUS_INTENT_KEY, JSON.stringify(intent));
        } catch {
          // ignore
        }
      }
    }
    setShowProjectPrompt(false);
    setSelectedProjectTask(null);
    setIsRunning(true);
    setHasEverStarted(true);
  };

  const attachNoteToProject = (id: string, projectId: string | null) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, projectId: projectId || undefined } : note))
    );
  };

  const openNoteProjectPicker = (note: StickyNote) => {
    setNoteProjectPickerId(note.id);
    setNoteProjectDraft(note.projectId ?? projectOptions[0]?.id ?? null);
  };

  const applyNoteProjectSelection = (noteId: string) => {
    attachNoteToProject(noteId, noteProjectDraft ?? null);
    setNoteProjectPickerId(null);
  };

  const completeNote = (id: string) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id
          ? { ...note, completed: true, completedAt: new Date().toISOString() }
          : note
      )
    );
    showToast("Note completed!");
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  };

  const handleMouseDown = (e: React.MouseEvent, noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    setDraggedNote(noteId);
    setDragOffset({
      x: e.clientX - note.x,
      y: e.clientY - note.y,
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggedNote) return;
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      setNotes((prev) =>
        prev.map((note) =>
          note.id === draggedNote ? { ...note, x: newX, y: newY } : note
        )
      );
    },
    [draggedNote, dragOffset]
  );

  const handleMouseUp = useCallback(() => {
    setDraggedNote(null);
  }, []);

  useEffect(() => {
    if (draggedNote) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [draggedNote, handleMouseMove, handleMouseUp]);

  const ratio =
    durationSeconds > 0 ? Math.max(0, Math.min(1, remainingSeconds / durationSeconds)) : 0;
  const coffeeMaxHeight = 9;
  const coffeeBaseY = 23;
  const coffeeHeight = coffeeMaxHeight * ratio;
  const coffeeY = coffeeBaseY - coffeeHeight;

  const statusMode = isRunning
    ? "RUN"
    : remainingSeconds === durationSeconds
    ? "IDLE"
    : "PAUSE";

  return (
    <>
      {focusIntent && (
        <div className="focus-intent-banner">
          <div>
            <p className="focus-intent-label">Focus Target</p>
            <h4>
              {focusIntent.projectName} · {focusIntent.taskTitle}
            </h4>
            <p className="focus-intent-meta">{focusIntent.minutes} min planned</p>
          </div>
          <div className="focus-intent-actions">
            <button
              className="btn btn-secondary"
              onClick={() => updateFromMinutes(focusIntent.minutes)}
            >
              Load Block
            </button>
            <button className="btn btn-ghost" onClick={clearFocusIntent}>
              Clear
            </button>
          </div>
        </div>
      )}
      <div className="floating-note-launcher">
        <button onClick={() => addNote()} className="btn-add-note" title="Add Note">
          + Note
        </button>
      </div>
      <div className="arcade-shell">
        <header className="arcade-header">
          <div className="logo-chip">
            <span className="logo-dot" />
            PeopleCore
          </div>
          <div className={`status-pill status-pill-${statusMode.toLowerCase()}`}>
            {statusMode}
          </div>
          <nav className="nav-links">
            <Link href="/projects" className="nav-link">
              Projects ↗
            </Link>
            <Link href="/notes" className="nav-link">
              Notes ↗
            </Link>
            <Link href="/stats" className="nav-link">
              Stats ↗
            </Link>
          </nav>
        </header>

        <section className="mug-stage">
          <div className="crt-frame">
            <div className="scanline" />
            <div className="pixel-pot" aria-hidden="true">
              <svg
                className="pixel-pot-svg"
                viewBox="0 0 32 32"
                role="presentation"
              >
                <rect x="4" y="3" width="24" height="3" fill="#5a2b15" />
                <rect x="4" y="6" width="24" height="3" fill="#7c3a1b" />
                <rect x="4" y="9" width="24" height="1" fill="#120601" />
                <rect x="4" y="9" width="24" height="16" fill="#120601" />
                <rect x="5" y="10" width="22" height="14" fill="#fef4db" />
                <rect x="6" y="12" width="20" height="10" fill="#e0d2bb" />
                <rect
                  x="7"
                  width="18"
                  y={coffeeY}
                  height={coffeeHeight}
                  fill="#5e1d0f"
                />
                <rect x="6" y="15" width="20" height="2" fill="#f8ecda" />
                <rect x="6" y="22" width="20" height="2" fill="#cbbba4" />
                <rect x="24" y="11" width="5" height="12" fill="#5a2717" />
                <rect x="25" y="12" width="3" height="10" fill="#341109" />
                <rect x="4" y="25" width="24" height="2" fill="#100601" />
                <rect x="6" y="26" width="20" height="2" fill="#fef4db" />
                <rect x="7" y="27" width="18" height="2" fill="#f4e5cc" />
                <rect x="8" y="28" width="16" height="1" fill="#ffffff" opacity="0.4" />
                <rect x="9" y="11" width="8" height="2" fill="#ffffff" opacity="0.5" />
                <rect x="10" y="13" width="4" height="1" fill="#ffffff" opacity="0.5" />
              </svg>
            </div>
          </div>
        </section>

        <section className="hud-panel">
          <div className="hud-clock">
            <span className="time-caption">TIME</span>
            <div className="time-main">{formatSecondsToMMSS(remainingSeconds)}</div>
          </div>

          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ transform: `scaleX(${ratio})` }} />
          </div>

          <div className="hud-row">
            <div className="field-group">
              <label htmlFor="minutesInput">Minutes</label>
              <input
                id="minutesInput"
                type="number"
                min={1}
                max={480}
                value={minutesInput}
                onChange={(e) => updateFromMinutes(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="button-row-main">
            <button type="button" className="btn btn-primary" onClick={handleStart}>
              {isRunning ? "▶ RUN" : hasEverStarted ? "▶ RESUME" : "▶ START"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handlePause}
              disabled={!isRunning}
            >
              ⏸ HOLD
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={resetTimer}
              disabled={!hasEverStarted}
            >
              ⟲ RESET
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleLogNow}
              disabled={!hasEverStarted}
            >
              ☕ LOG
            </button>
          </div>

          <div className="hud-pill">Block: {minutesInput}m</div>
        </section>
      </div>

      {notes
        .filter((note) => !note.completed)
        .map((note) => (
          <div
            key={note.id}
            className="sticky-note"
            style={{
              left: `${note.x}px`,
              top: `${note.y}px`,
            }}
          >
            <div
              className="sticky-note-header"
              onMouseDown={(e) => handleMouseDown(e, note.id)}
            >
              <span className="sticky-note-drag-handle">⋮⋮</span>
              <button
                className="sticky-note-btn"
                onClick={() => deleteNote(note.id)}
                title="Delete"
              >
                ×
              </button>
            </div>
            <textarea
              className="sticky-note-textarea"
              value={note.text}
              onChange={(e) => updateNoteText(note.id, e.target.value)}
              placeholder="Type your note..."
              maxLength={200}
            />
            <div className="sticky-note-project">
              {note.projectId ? (
                <div className="note-project-chip">
                  <span>
                    Linked to {projectNameById.get(note.projectId) || "project"} ·
                    <Link href="/projects" className="note-project-jump">
                      /projects
                    </Link>
                  </span>
                  <button
                    type="button"
                    className="note-project-manage"
                    onClick={() => openNoteProjectPicker(note)}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="note-project-add"
                  onClick={() => openNoteProjectPicker(note)}
                  disabled={projectOptions.length === 0}
                >
                  Add to project
                </button>
              )}

              {noteProjectPickerId === note.id && (
                <div className="note-project-picker">
                  <label htmlFor={`project-select-${note.id}`}>Choose project</label>
                  <select
                    id={`project-select-${note.id}`}
                    value={noteProjectDraft ?? ""}
                    onChange={(e) => setNoteProjectDraft(e.target.value || null)}
                  >
                    <option value="">No project</option>
                    {projectOptions.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  <div className="note-project-picker-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => applyNoteProjectSelection(note.id)}
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setNoteProjectPickerId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              className="sticky-note-complete"
              onClick={() => completeNote(note.id)}
            >
              ✓ Done
            </button>
          </div>
        ))}

      <div className={`toast ${toastMessage ? "toast-visible" : ""}`}>
        <div className="toast-dot" />
        <div className="toast-label">Session</div>
        <div>{toastMessage || "Logged to your cup history."}</div>
      </div>

      {showProjectPrompt && (
        <div className="modal-scrim" role="dialog" aria-modal="true">
          <div className="modal-card">
            <p className="modal-kicker">Before you start…</p>
            <h3>Attribute this block to a project?</h3>
            <p className="modal-copy">
              Time linked here is fully referenced inside <strong>/projects</strong> so everyone sees
              progress against the right task.
            </p>
            {projectTaskOptions.length > 0 ? (
              <div className="modal-field">
                <label htmlFor="projectTaskSelect">Select task</label>
                <select
                  id="projectTaskSelect"
                  value={selectedProjectTask?.taskId ?? ""}
                  onChange={(e) => handleProjectTaskChange(e.target.value)}
                >
                  {projectTaskOptions.map((option) => (
                    <option key={option.taskId} value={option.taskId}>
                      {option.projectName} • {option.taskTitle}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="modal-empty">
                No active project tasks yet. Seed a project in the /projects view to begin attribution.
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => confirmProjectPrompt(true)}
                disabled={!selectedProjectTask}
              >
                Yes, track this block
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => confirmProjectPrompt(false)}
              >
                No thanks
              </button>
            </div>
          </div>
        </div>
      )}

      {showCompletionModal && pendingCompletionIntent && (
        <div className="modal-scrim" role="dialog" aria-modal="true">
          <div className="modal-card">
            <p className="modal-kicker">Log a project note</p>
            <h3>{pendingCompletionIntent.projectName}</h3>
            <p className="modal-copy">
              Quick recap for <strong>{pendingCompletionIntent.taskTitle}</strong>—what moved forward and
              what remains outstanding? This note is pinned to the project timeline inside /projects.
            </p>
            <textarea
              className="modal-textarea"
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              placeholder="Achieved: …\nOutstanding: …"
              maxLength={400}
            />
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => finalizeCompletion(completionNote.trim())}
              >
                Save to /projects
              </button>
              <button type="button" className="btn btn-ghost" onClick={dismissCompletionModal}>
                Skip for now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
