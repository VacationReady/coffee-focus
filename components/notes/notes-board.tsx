"use client";

import { useEffect, useMemo, useState } from "react";

import type { StickyNoteDTO } from "@/lib/serializers";

type ProjectOption = {
  id: string;
  name: string;
};

type NotesBoardProps = {
  initialNotes: StickyNoteDTO[];
};

const STICKY_NOTES_BASE = "/api/sticky-notes";
const PROJECTS_BASE = "/api/projects";

type ProjectsResponse = {
  projects: { id: string; name: string }[];
};

async function fetchProjects(): Promise<ProjectOption[]> {
  const response = await fetch(PROJECTS_BASE);
  if (!response.ok) {
    throw new Error("Failed to load projects");
  }
  const data = (await response.json()) as ProjectsResponse;
  return data.projects.map((project) => ({ id: project.id, name: project.name }));
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotesBoard({ initialNotes }: NotesBoardProps) {
  const [notes, setNotes] = useState<StickyNoteDTO[]>(() => initialNotes);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(() => initialNotes[0]?.id ?? null);
  const [draftText, setDraftText] = useState<string>(() => initialNotes[0]?.text ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectDraft, setProjectDraft] = useState<string>(() => initialNotes[0]?.projectId ?? "");
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);

  const activeNotes = useMemo(() => notes.filter((note) => !note.completed), [notes]);
  const completedNotes = useMemo(() => notes.filter((note) => note.completed), [notes]);

  const selectedNote = useMemo(
    () => (selectedNoteId ? notes.find((note) => note.id === selectedNoteId) ?? null : null),
    [notes, selectedNoteId]
  );

  useEffect(() => {
    if (!selectedNote) {
      setDraftText("");
      setProjectDraft("");
      return;
    }
    setDraftText(selectedNote.text ?? "");
    setProjectDraft(selectedNote.projectId ?? "");
  }, [selectedNote]);

  useEffect(() => {
    let isCancelled = false;

    async function loadProjects() {
      try {
        const projects = await fetchProjects();
        if (!isCancelled) {
          setProjectOptions(projects);
        }
      } catch {
        if (!isCancelled) {
          setProjectOptions([]);
        }
      }
    }

    loadProjects().catch(() => {
      // handled above
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  function handleSelect(noteId: string) {
    setSelectedNoteId(noteId);
  }

  async function handleSave() {
    if (!selectedNote) return;

    const nextText = draftText ?? "";
    const nextProjectId = projectDraft || null;
    const noteId = selectedNote.id;
    const previousNotes = notes;

    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId ? { ...note, text: nextText, projectId: nextProjectId ?? undefined } : note
      )
    );
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`${STICKY_NOTES_BASE}/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: nextText, projectId: nextProjectId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? "Unable to update note");
      }

      const payload = (await response.json()) as { note: StickyNoteDTO };
      setNotes((prev) =>
        prev.map((note) => (note.id === payload.note.id ? payload.note : note))
      );
    } catch (err) {
      setNotes(previousNotes);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleComplete() {
    if (!selectedNote || selectedNote.completed) return;

    const nextText = draftText ?? "";
    const nextProjectId = projectDraft || null;
    const noteId = selectedNote.id;
    const previousNotes = notes;

    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId
          ? {
              ...note,
              text: nextText,
              projectId: nextProjectId ?? undefined,
              completed: true,
              completedAt: new Date().toISOString(),
            }
          : note
      )
    );
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`${STICKY_NOTES_BASE}/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: nextText, projectId: nextProjectId, completed: true }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? "Unable to complete note");
      }

      const payload = (await response.json()) as { note: StickyNoteDTO };
      setNotes((prev) =>
        prev.map((note) => (note.id === payload.note.id ? payload.note : note))
      );
    } catch (err) {
      setNotes(previousNotes);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
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

      {notes.length === 0 ? (
        <section className="notes-section">
          <h2 className="notes-section-title">Notes</h2>
          <p className="notes-empty">No notes yet. Add a note from the timer page!</p>
        </section>
      ) : (
        <div className="notes-content">
          <div className="notes-list">
            <section className="notes-section">
              <h2 className="notes-section-title">Active Notes</h2>
              {activeNotes.length === 0 ? (
                <p className="notes-empty">No active notes. Add a note from the timer page!</p>
              ) : (
                <div className="notes-grid">
                  {activeNotes.map((note) => (
                    <button
                      key={note.id}
                      type="button"
                      className={`note-card note-card-active${
                        selectedNoteId === note.id ? " note-card-selected" : ""
                      }`}
                      onClick={() => handleSelect(note.id)}
                    >
                      <div className="note-card-header">
                        <span className="note-card-date">{formatDate(note.createdAt)}</span>
                      </div>
                      <p className="note-card-text">{note.text || "(Empty note)"}</p>
                      <div className="note-card-footer">
                        <span className="note-card-badge note-card-badge-active">In Progress</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="notes-section">
              <h2 className="notes-section-title">Completed Notes</h2>
              {completedNotes.length === 0 ? (
                <p className="notes-empty">
                  No completed notes yet. Complete a note to see it here.
                </p>
              ) : (
                <div className="notes-grid">
                  {completedNotes.map((note) => (
                    <button
                      key={note.id}
                      type="button"
                      className={`note-card${
                        selectedNoteId === note.id ? " note-card-selected" : ""
                      }`}
                      onClick={() => handleSelect(note.id)}
                    >
                      <div className="note-card-header">
                        <span className="note-card-date">
                          {formatDate(note.completedAt ?? note.createdAt)}
                        </span>
                      </div>
                      <p className="note-card-text">{note.text || "(Empty note)"}</p>
                      <div className="note-card-footer">
                        <span className="note-card-badge">✓ Done</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="notes-editor">
            {selectedNote ? (
              <>
                <div className="notes-editor-header">
                  <p className="notes-editor-label">
                    {selectedNote.completed ? "Completed note" : "Active note"}
                  </p>
                  <p className="notes-editor-date">
                    {formatDate(
                      selectedNote.completed
                        ? selectedNote.completedAt ?? selectedNote.createdAt
                        : selectedNote.createdAt
                    )}
                  </p>
                </div>
                {projectOptions.length > 0 ? (
                  <div className="note-project-picker">
                    <label htmlFor="notes-project-select">Project</label>
                    <select
                      id="notes-project-select"
                      value={projectDraft}
                      onChange={(event) => setProjectDraft(event.target.value)}
                    >
                      <option value="">No project</option>
                      {projectOptions.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <textarea
                  className="notes-editor-textarea"
                  value={draftText}
                  onChange={(event) => setDraftText(event.target.value)}
                  rows={8}
                  maxLength={400}
                  placeholder="Type your note..."
                />
                {error ? <p className="notes-editor-error">{error}</p> : null}
                <div className="notes-editor-actions">
                  {!selectedNote.completed ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleComplete}
                      disabled={isSaving}
                    >
                      Mark complete
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </>
            ) : (
              <div className="notes-editor-placeholder">
                <p>Select a note on the left to edit its text.</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
