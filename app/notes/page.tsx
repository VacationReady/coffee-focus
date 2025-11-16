"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

import {
  StickyNote,
  NOTES_STORAGE_KEY,
  safeParseNotes,
} from "../lib/noteUtils";

export default function NotesPage() {
  const [notes, setNotes] = useState<StickyNote[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(NOTES_STORAGE_KEY);
    setNotes(safeParseNotes(raw));
  }, []);

  const completedNotes = notes.filter((note) => note.completed);
  const activeNotes = notes.filter((note) => !note.completed);

  const deleteNote = (id: string) => {
    const updatedNotes = notes.filter((note) => note.id !== id);
    setNotes(updatedNotes);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          NOTES_STORAGE_KEY,
          JSON.stringify(updatedNotes)
        );
      } catch {
        // ignore
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="notes-shell">
      <div className="notes-nav">
        <div className="logo-chip logo-chip-ghost">PeopleCore</div>
        <h1>Notes</h1>
        <Link href="/" className="nav-link">
          Back ↩
        </Link>
      </div>

      <div className="notes-summary">
        <div className="notes-stat">
          <span className="notes-stat-label">Active</span>
          <span className="notes-stat-value">{activeNotes.length}</span>
        </div>
        <div className="notes-stat">
          <span className="notes-stat-label">Completed</span>
          <span className="notes-stat-value">{completedNotes.length}</span>
        </div>
      </div>

      <section className="notes-section">
        <h2 className="notes-section-title">Completed Notes</h2>
        {completedNotes.length === 0 ? (
          <p className="notes-empty">No completed notes yet. Complete a note to see it here.</p>
        ) : (
          <div className="notes-grid">
            {completedNotes.map((note) => (
              <div key={note.id} className="note-card">
                <div className="note-card-header">
                  <span className="note-card-date">
                    {formatDate(note.completedAt || note.createdAt)}
                  </span>
                  <button
                    className="note-card-delete"
                    onClick={() => deleteNote(note.id)}
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
                <p className="note-card-text">
                  {note.text || "(Empty note)"}
                </p>
                <div className="note-card-footer">
                  <span className="note-card-badge">✓ Done</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="notes-section">
        <h2 className="notes-section-title">Active Notes</h2>
        {activeNotes.length === 0 ? (
          <p className="notes-empty">No active notes. Add a note from the timer page!</p>
        ) : (
          <div className="notes-grid">
            {activeNotes.map((note) => (
              <div key={note.id} className="note-card note-card-active">
                <div className="note-card-header">
                  <span className="note-card-date">
                    {formatDate(note.createdAt)}
                  </span>
                  <button
                    className="note-card-delete"
                    onClick={() => deleteNote(note.id)}
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
                <p className="note-card-text">
                  {note.text || "(Empty note)"}
                </p>
                <div className="note-card-footer">
                  <span className="note-card-badge note-card-badge-active">In Progress</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="notes-note">
        Notes are stored locally in your browser. Complete notes from the timer page to archive them here.
      </div>
    </div>
  );
}
