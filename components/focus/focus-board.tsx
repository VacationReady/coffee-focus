"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

import type { ProjectDTO, StickyNoteDTO } from "@/lib/serializers";

function formatSecondsToMMSS(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

const PROJECTS_KEY = "/api/projects";
const STICKY_NOTES_KEY = "/api/sticky-notes";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return (await response.json()) as T;
}

const projectsFetcher = () =>
  fetchJson<{ projects: ProjectDTO[] }>(PROJECTS_KEY).then((payload) => payload.projects);

const stickyNotesFetcher = () =>
  fetchJson<{ notes: StickyNoteDTO[] }>(STICKY_NOTES_KEY).then((payload) => payload.notes);

type FocusBoardProps = {
  initialProjects: ProjectDTO[];
  initialStickyNotes: StickyNoteDTO[];
  userName?: string | null;
};

type FocusIntent = {
  projectId: string;
  taskId: string;
  projectName: string;
  taskTitle: string;
  minutes: number;
  createdAt: string;
};

type ProjectSelection = {
  projectId: string;
  taskId: string;
  projectName: string;
  taskTitle: string;
};

type StickyNotePatchPayload = Partial<Pick<StickyNoteDTO, "text" | "x" | "y" | "projectId" | "completed">>;

export function FocusBoard({ initialProjects, initialStickyNotes, userName }: FocusBoardProps) {
  const [minutesInput, setMinutesInput] = useState(50);
  const [durationSeconds, setDurationSeconds] = useState(50 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(50 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [hasEverStarted, setHasEverStarted] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [focusIntent, setFocusIntent] = useState<FocusIntent | null>(null);
  const [showProjectPrompt, setShowProjectPrompt] = useState(false);
  const [selectedProjectTask, setSelectedProjectTask] = useState<ProjectSelection | null>(null);
  const [completionNote, setCompletionNote] = useState("");
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [pendingCompletionIntent, setPendingCompletionIntent] = useState<FocusIntent | null>(null);
  const [noteProjectPickerId, setNoteProjectPickerId] = useState<string | null>(null);
  const [noteProjectDraft, setNoteProjectDraft] = useState<string | null>(null);
  const [draggedNote, setDraggedNote] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const notePersistTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const notePersistPayloads = useRef<Record<string, StickyNotePatchPayload>>({});

  const { data: projects = initialProjects, mutate: mutateProjects } = useSWR<ProjectDTO[]>(
    PROJECTS_KEY,
    projectsFetcher,
    { fallbackData: initialProjects, revalidateOnFocus: false }
  );

  const { data: notes = initialStickyNotes, mutate: mutateNotes } = useSWR<StickyNoteDTO[]>(
    STICKY_NOTES_KEY,
    stickyNotesFetcher,
    { fallbackData: initialStickyNotes, revalidateOnFocus: false }
  );

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2200);
  }, []);

  const flushNoteUpdate = useCallback(
    async (noteId: string) => {
      const payload = notePersistPayloads.current[noteId];
      delete notePersistPayloads.current[noteId];
      if (!payload || Object.keys(payload).length === 0) {
        return;
      }
      try {
        const response = await fetch(`${STICKY_NOTES_KEY}/${noteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error("Failed to update note");
        }
        await mutateNotes();
      } catch (error) {
        console.error(error);
        await mutateNotes();
        showToast("Couldn't update note");
      }
    },
    [mutateNotes, showToast]
  );

  const scheduleNotePersist = useCallback(
    (noteId: string, patch: StickyNotePatchPayload, options?: { immediate?: boolean }) => {
      notePersistPayloads.current[noteId] = {
        ...(notePersistPayloads.current[noteId] ?? {}),
        ...patch,
      };
      const immediate = options?.immediate ?? false;
      if (immediate) {
        if (notePersistTimers.current[noteId]) {
          clearTimeout(notePersistTimers.current[noteId]);
          delete notePersistTimers.current[noteId];
        }
        flushNoteUpdate(noteId).catch(() => {
          // error handled in flushNoteUpdate
        });
        return;
      }
      if (notePersistTimers.current[noteId]) {
        clearTimeout(notePersistTimers.current[noteId]);
      }
      notePersistTimers.current[noteId] = setTimeout(() => {
        flushNoteUpdate(noteId).catch(() => {
          // error handled in flushNoteUpdate
        });
        delete notePersistTimers.current[noteId];
      }, 320);
    },
    [flushNoteUpdate]
  );

  useEffect(() => {
    const timers = notePersistTimers.current;
    return () => {
      Object.values(timers).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const projectTaskOptions = useMemo(() => {
    return projects.flatMap((project) =>
      project.tasks.map((task) => ({
        projectId: project.id,
        projectName: project.name,
        taskId: task.id,
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
    if (!showProjectPrompt || selectedProjectTask || projectTaskOptions.length === 0) {
      return;
    }
    setSelectedProjectTask(projectTaskOptions[0]);
  }, [projectTaskOptions, selectedProjectTask, showProjectPrompt]);

  const clearFocusIntent = useCallback(() => {
    setFocusIntent(null);
  }, []);

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

  const mutateNotesOptimistically = useCallback(
    (updater: (prev: StickyNoteDTO[]) => StickyNoteDTO[]) => {
      mutateNotes((prev) => updater(prev ?? []), false);
    },
    [mutateNotes]
  );

  const addNote = useCallback(
    async (overrides?: Partial<StickyNoteDTO>) => {
      const tempId = `temp-${Date.now()}`;
      const optimistic: StickyNoteDTO = {
        id: tempId,
        text: "",
        x: overrides?.x ?? 100,
        y: overrides?.y ?? 100,
        completed: false,
        createdAt: new Date().toISOString(),
        projectId: overrides?.projectId,
      };
      mutateNotesOptimistically((prev) => [optimistic, ...prev]);
      try {
        const response = await fetch(STICKY_NOTES_KEY, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: optimistic.text,
            x: optimistic.x,
            y: optimistic.y,
            projectId: optimistic.projectId ?? null,
          }),
        });
        if (!response.ok) {
          throw new Error("Failed to create note");
        }
        const payload = (await response.json()) as { note: StickyNoteDTO };
        mutateNotesOptimistically((prev) =>
          prev.map((note) => (note.id === tempId ? payload.note : note))
        );
        await mutateNotes();
      } catch (error) {
        console.error(error);
        await mutateNotes();
        showToast("Couldn't create note");
      }
    },
    [mutateNotes, mutateNotesOptimistically, showToast]
  );

  const updateNoteText = useCallback(
    (noteId: string, text: string) => {
      mutateNotesOptimistically((prev) =>
        prev.map((note) => (note.id === noteId ? { ...note, text } : note))
      );
      scheduleNotePersist(noteId, { text });
    },
    [mutateNotesOptimistically, scheduleNotePersist]
  );

  const attachNoteToProject = useCallback(
    (noteId: string, projectId: string | null) => {
      mutateNotesOptimistically((prev) =>
        prev.map((note) => (note.id === noteId ? { ...note, projectId: projectId ?? undefined } : note))
      );
      scheduleNotePersist(noteId, { projectId: projectId ?? undefined }, { immediate: true });
    },
    [mutateNotesOptimistically, scheduleNotePersist]
  );

  const completeNote = useCallback(
    (noteId: string) => {
      mutateNotesOptimistically((prev) =>
        prev.map((note) => (note.id === noteId ? { ...note, completed: true } : note))
      );
      scheduleNotePersist(noteId, { completed: true }, { immediate: true });
      showToast("Note completed!");
    },
    [mutateNotesOptimistically, scheduleNotePersist, showToast]
  );

  const deleteNote = useCallback(
    async (noteId: string) => {
      const previous = notes;
      mutateNotesOptimistically((prev) => prev.filter((note) => note.id !== noteId));
      try {
        const response = await fetch(`${STICKY_NOTES_KEY}/${noteId}`, { method: "DELETE" });
        if (!response.ok) {
          throw new Error("Failed to delete note");
        }
        await mutateNotes();
      } catch (error) {
        console.error(error);
        mutateNotes(previous);
        showToast("Couldn't delete note");
      }
    },
    [mutateNotes, mutateNotesOptimistically, notes, showToast]
  );

  const persistNotePosition = useCallback(
    (noteId: string, x: number, y: number) => {
      scheduleNotePersist(
        noteId,
        { x: Math.round(x), y: Math.round(y) },
        { immediate: true }
      );
    },
    [scheduleNotePersist]
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent, noteId: string) => {
      const note = notes.find((n) => n.id === noteId);
      if (!note) return;
      setDraggedNote(noteId);
      setDragOffset({ x: event.clientX - note.x, y: event.clientY - note.y });
    },
    [notes]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!draggedNote) return;
      const newX = event.clientX - dragOffset.x;
      const newY = event.clientY - dragOffset.y;
      mutateNotesOptimistically((prev) =>
        prev.map((note) => (note.id === draggedNote ? { ...note, x: newX, y: newY } : note))
      );
    },
    [dragOffset, draggedNote, mutateNotesOptimistically]
  );

  const handleMouseUp = useCallback(() => {
    if (!draggedNote) return;
    const note = notes.find((n) => n.id === draggedNote);
    setDraggedNote(null);
    if (note) {
      persistNotePosition(note.id, note.x, note.y);
    }
  }, [draggedNote, notes, persistNotePosition]);

  useEffect(() => {
    if (!draggedNote) return;
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggedNote, handleMouseMove, handleMouseUp]);

  const incrementTaskLoggedSeconds = useCallback(
    async (projectId: string, taskId: string, seconds: number) => {
      const targetProject = projects.find((project) => project.id === projectId);
      const targetTask = targetProject?.tasks.find((task) => task.id === taskId);
      if (!targetTask) {
        return;
      }
      const nextLoggedSeconds = Math.max(0, targetTask.loggedSeconds + seconds);
      mutateProjects(
        (prev) =>
          (prev ?? []).map((project) =>
            project.id !== projectId
              ? project
              : {
                  ...project,
                  tasks: project.tasks.map((task) =>
                    task.id === taskId ? { ...task, loggedSeconds: nextLoggedSeconds } : task
                  ),
                }
          ),
        false
      );

      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, loggedSeconds: nextLoggedSeconds }),
      });
      if (!response.ok) {
        await mutateProjects();
        throw new Error("Failed to update task log");
      }
      await mutateProjects();
    },
    [mutateProjects, projects]
  );

  const logSession = useCallback(
    async (seconds: number, attribution?: FocusIntent | null) => {
      const durationSecondsRounded = Math.max(1, Math.round(seconds));
      const response = await fetch("/api/focus-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationSeconds: durationSecondsRounded,
          status: "completed",
          projectId: attribution?.projectId ?? null,
          projectTaskId: attribution?.taskId ?? null,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to log session");
      }

      if (attribution) {
        await incrementTaskLoggedSeconds(attribution.projectId, attribution.taskId, durationSecondsRounded);
        setFocusIntent(null);
        showToast(`Logged to ${attribution.projectName} • ${attribution.taskTitle}`);
      } else {
        showToast("Logged to your cup history.");
      }
    },
    [incrementTaskLoggedSeconds, showToast]
  );

  const handleLoggedSessionSuccess = useCallback((intentSnapshot: FocusIntent | null) => {
    if (!intentSnapshot) return;
    setPendingCompletionIntent(intentSnapshot);
    setCompletionNote("");
    setShowCompletionModal(true);
  }, []);

  const completeTimer = useCallback(() => {
    setIsRunning(false);
    setRemainingSeconds(0);
    setHasEverStarted(true);
    const intentSnapshot = focusIntent;
    logSession(durationSeconds, intentSnapshot)
      .then(() => handleLoggedSessionSuccess(intentSnapshot))
      .catch(() => showToast("Unable to log session."));
  }, [durationSeconds, focusIntent, handleLoggedSessionSuccess, logSession, showToast]);

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
  }, [completeTimer, isRunning]);

  const handleStart = () => {
    if (durationSeconds <= 0) return;
    if (!hasEverStarted) {
      setRemainingSeconds(durationSeconds);
    }
    if (!focusIntent) {
      setShowProjectPrompt(true);
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
      logSession(worked, intentSnapshot)
        .then(() => handleLoggedSessionSuccess(intentSnapshot))
        .catch(() => showToast("Unable to log session."))
        .finally(() => {
          resetTimer();
        });
    } else {
      showToast("Too short to log.");
      resetTimer();
    }
  };

  const selectProjectTask = useCallback((selection: ProjectSelection | null) => {
    setSelectedProjectTask(selection);
    setNoteProjectPickerId(null);
  }, []);

  const handleProjectTaskChange = useCallback(
    (taskId: string) => {
      const nextSelection = projectTaskOptions.find((option) => option.taskId === taskId) ?? null;
      selectProjectTask(nextSelection);
    },
    [projectTaskOptions, selectProjectTask]
  );

  const confirmProjectPrompt = useCallback(
    (attach: boolean) => {
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
      }
      setShowProjectPrompt(false);
      setSelectedProjectTask(null);
      setIsRunning(true);
      setHasEverStarted(true);
    },
    [minutesInput, selectedProjectTask]
  );

  const openNoteProjectPicker = useCallback(
    (note: StickyNoteDTO) => {
      setNoteProjectPickerId(note.id);
      setNoteProjectDraft(note.projectId ?? projectOptions[0]?.id ?? null);
    },
    [projectOptions]
  );

  const applyNoteProjectSelection = useCallback(
    (noteId: string) => {
      attachNoteToProject(noteId, noteProjectDraft ?? null);
      setNoteProjectPickerId(null);
    },
    [attachNoteToProject, noteProjectDraft]
  );

  const dismissCompletionModal = useCallback(() => {
    setCompletionNote("");
    setShowCompletionModal(false);
    setPendingCompletionIntent(null);
  }, []);

  const finalizeCompletion = useCallback(
    async (noteBody: string) => {
      const intent = pendingCompletionIntent;
      if (!intent) {
        dismissCompletionModal();
        return;
      }
      try {
        const response = await fetch("/api/project-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: intent.projectId,
            body: noteBody || "Logged focus block",
            author: userName ?? "You",
          }),
        });
        if (!response.ok) {
          throw new Error("Failed to save project note");
        }
        await mutateProjects();
        showToast("Project note saved.");
      } catch (error) {
        console.error(error);
        showToast("Could not save project note.");
      } finally {
        dismissCompletionModal();
      }
    },
    [dismissCompletionModal, mutateProjects, pendingCompletionIntent, showToast, userName]
  );

  const notesToRender = notes.filter((note) => !note.completed);

  const ratio = durationSeconds > 0 ? Math.max(0, Math.min(1, remainingSeconds / durationSeconds)) : 0;
  const coffeeMaxHeight = 9;
  const coffeeBaseY = 23;
  const coffeeHeight = coffeeMaxHeight * ratio;
  const coffeeY = coffeeBaseY - coffeeHeight;

  const statusMode = isRunning ? "RUN" : remainingSeconds === durationSeconds ? "IDLE" : "PAUSE";

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
            <button className="btn btn-secondary" onClick={() => updateFromMinutes(focusIntent.minutes)}>
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
          <div className="arcade-header-left">
            <div className="logo-chip">
              <span className="logo-dot" />
              Coffee Focus
            </div>
            <div className={`status-pill status-pill-${statusMode.toLowerCase()}`}>{statusMode}</div>
          </div>
          <nav className="nav-links arcade-header-actions">
            <Link href="/projects" className="nav-link nav-link-cta">
              Projects
            </Link>
            <Link href="/notes" className="nav-link nav-link-cta">
              Notes
            </Link>
            <Link href="/stats" className="nav-link nav-link-cta">
              Stats
            </Link>
          </nav>
        </header>

        <div className="arcade-body">
          <section className="mug-stage">
            <div className="crt-frame">
              <div className="scanline" />
              <div className="pixel-pot" aria-hidden="true">
                <svg className="pixel-pot-svg" viewBox="0 0 32 32" role="presentation">
                  <rect x="4" y="3" width="24" height="3" fill="#5a2b15" />
                  <rect x="4" y="6" width="24" height="3" fill="#7c3a1b" />
                  <rect x="4" y="9" width="24" height="1" fill="#120601" />
                  <rect x="4" y="9" width="24" height="16" fill="#120601" />
                  <rect x="5" y="10" width="22" height="14" fill="#fef4db" />
                  <rect x="6" y="12" width="20" height="10" fill="#e0d2bb" />
                  <rect x="7" width="18" y={coffeeY} height={coffeeHeight} fill="#5e1d0f" />
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
                  onChange={(event) => updateFromMinutes(Number(event.target.value))}
                />
              </div>
            </div>

            <div className="button-row-main">
              <button type="button" className="btn btn-primary" onClick={handleStart}>
                {isRunning ? "▶ RUN" : hasEverStarted ? "▶ RESUME" : "▶ START"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handlePause} disabled={!isRunning}>
                ⏸ HOLD
              </button>
              <button type="button" className="btn btn-ghost" onClick={resetTimer} disabled={!hasEverStarted}>
                ⟲ RESET
              </button>
              <button type="button" className="btn btn-ghost" onClick={handleLogNow} disabled={!hasEverStarted}>
                ☕ LOG
              </button>
            </div>

            <div className="hud-pill">
              Block: {minutesInput}m
              {focusIntent ? (
                <span className="hud-pill-meta"> · {focusIntent.projectName}</span>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      {notesToRender.map((note) => (
        <div
          key={note.id}
          className="sticky-note"
          style={{
            left: `${note.x}px`,
            top: `${note.y}px`,
          }}
        >
          <div className="sticky-note-header" onMouseDown={(event) => handleMouseDown(event, note.id)}>
            <span className="sticky-note-drag-handle">⋮⋮</span>
            <button className="sticky-note-btn" onClick={() => deleteNote(note.id)} title="Delete">
              ×
            </button>
          </div>
          <textarea
            className="sticky-note-textarea"
            value={note.text}
            onChange={(event) => updateNoteText(note.id, event.target.value)}
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
                <button type="button" className="note-project-manage" onClick={() => openNoteProjectPicker(note)}>
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
                  onChange={(event) => setNoteProjectDraft(event.target.value || null)}
                >
                  <option value="">No project</option>
                  {projectOptions.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <div className="note-project-picker-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => applyNoteProjectSelection(note.id)}>
                    Apply
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setNoteProjectPickerId(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          <button className="sticky-note-complete" onClick={() => completeNote(note.id)}>
            ✓ Done
          </button>
        </div>
      ))}

      <div
        className={`toast ${toastMessage ? "toast-visible" : ""}`}
        role="status"
        aria-live="polite"
      >
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
              Time linked here is fully referenced inside <strong>/projects</strong> so everyone sees progress against the right task.
            </p>
            {projectTaskOptions.length > 0 ? (
              <div className="modal-field">
                <label htmlFor="projectTaskSelect">Select task</label>
                <select
                  id="projectTaskSelect"
                  value={selectedProjectTask?.taskId ?? ""}
                  onChange={(event) => handleProjectTaskChange(event.target.value)}
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
                No active project tasks yet. Create one in the /projects view to begin attribution.
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
              <button type="button" className="btn btn-ghost" onClick={() => confirmProjectPrompt(false)}>
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
              Quick recap for <strong>{pendingCompletionIntent.taskTitle}</strong>—what moved forward and what remains outstanding? This note is pinned to the project timeline inside /projects.
            </p>
            <textarea
              className="modal-textarea"
              value={completionNote}
              onChange={(event) => setCompletionNote(event.target.value)}
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
