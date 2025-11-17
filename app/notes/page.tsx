import Link from "next/link";
import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Note = Awaited<ReturnType<typeof prisma.stickyNote.findMany>>[number];

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

export default async function NotesPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return redirect("/login");
  }

  const notes: Note[] = await prisma.stickyNote.findMany({
    where: { userId: session.user.id },
    orderBy: [{ completed: "asc" }, { createdAt: "desc" }],
  });

  const activeNotes = notes.filter((note: Note) => !note.completed);
  const completedNotes = notes.filter((note: Note) => note.completed);

  return (
    <div className="notes-shell">
      <div className="notes-nav">
        <div className="logo-chip logo-chip-ghost">Coffee Focus</div>
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
                  <span className="note-card-date">{formatDate(note.completedAt?.toISOString() ?? note.createdAt.toISOString())}</span>
                </div>
                <p className="note-card-text">{note.text || "(Empty note)"}</p>
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
                  <span className="note-card-date">{formatDate(note.createdAt.toISOString())}</span>
                </div>
                <p className="note-card-text">{note.text || "(Empty note)"}</p>
                <div className="note-card-footer">
                  <span className="note-card-badge note-card-badge-active">In Progress</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="notes-note">
        Notes sync with your cabin wall. Complete things from the timer page to archive them here.
      </div>
    </div>
  );
}
