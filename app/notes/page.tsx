import Link from "next/link";
import { redirect } from "next/navigation";

import { NotesBoard } from "@/components/notes/notes-board";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeStickyNote, type StickyNoteDTO } from "@/lib/serializers";

export default async function NotesPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return redirect("/login");
  }

  const notes = await prisma.stickyNote.findMany({
    where: { userId: session.user.id },
    orderBy: [{ completed: "asc" }, { createdAt: "desc" }],
  });
  const serialized: StickyNoteDTO[] = notes.map(serializeStickyNote);

  return (
    <div className="notes-shell">
      <div className="notes-nav">
        <div className="logo-chip logo-chip-ghost">Coffee Focus</div>
        <h1>Notes</h1>
        <Link href="/" className="nav-link">
          Back ↩
        </Link>
      </div>

      <NotesBoard initialNotes={serialized} />

      <div className="notes-note">
        Notes sync with your cabin wall. Complete things from the timer page or directly from this notes view to archive them here.
      </div>
    </div>
  );
}
