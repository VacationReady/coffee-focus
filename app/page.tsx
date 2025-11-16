"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    setSessions(safeParseSessions(raw));
    const notesRaw = window.localStorage.getItem(NOTES_STORAGE_KEY);
    setNotes(safeParseNotes(notesRaw));
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
    (seconds: number) => {
      const clamped = Math.max(1, Math.round(seconds));
      const now = new Date();
      setSessions((prev) => [
        ...prev,
        {
          seconds: clamped,
          date: now.toISOString(),
        },
      ]);
      showToast("Logged to your cup history.");
    },
    [showToast]
  );

  const completeTimer = useCallback(() => {
    setIsRunning(false);
    setRemainingSeconds(0);
    setHasEverStarted(true);
    addSession(durationSeconds);
  }, [addSession, durationSeconds]);

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
    setIsRunning(true);
    setHasEverStarted(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleLogNow = () => {
    const worked = durationSeconds - remainingSeconds;
    if (worked > 0.5) {
      addSession(worked);
    } else {
      showToast("Too short to log.");
    }
    resetTimer();
  };

  const addNote = () => {
    const newNote: StickyNote = {
      id: generateNoteId(),
      text: "",
      x: 100,
      y: 100,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setNotes((prev) => [...prev, newNote]);
  };

  const updateNoteText = (id: string, text: string) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, text } : note))
    );
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
            <button onClick={addNote} className="btn-add-note" title="Add Note">
              + Note
            </button>
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
    </>
  );
}
