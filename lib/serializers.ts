import type { Project, ProjectNote, ProjectTask, StickyNote as PrismaStickyNote, FocusSession } from "@prisma/client";

import type { ProjectRecord } from "@/app/lib/projectUtils";
import type { StickyNote } from "@/app/lib/noteUtils";
import type { Session } from "@/app/lib/sessionUtils";

export function serializeProject(
  project: Project & { tasks: ProjectTask[]; notes: ProjectNote[] }
): ProjectRecord {
  return {
    id: project.id,
    name: project.name,
    summary: project.summary,
    chips: project.chips,
    focusGoalMinutes: project.focusGoalMinutes ?? undefined,
    updatedAt: project.updatedAt.toISOString(),
    tasks: project.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status as ProjectRecord["tasks"][number]["status"],
      estimateMinutes: task.estimateMinutes ?? undefined,
      loggedSeconds: task.loggedSeconds,
      owner: task.owner ?? undefined,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    })),
    notes: project.notes.map((note) => ({
      id: note.id,
      body: note.body,
      author: note.author,
      createdAt: note.createdAt.toISOString(),
    })),
  };
}

export function serializeStickyNote(note: PrismaStickyNote): StickyNote {
  return {
    id: note.id,
    text: note.text ?? "",
    x: note.x,
    y: note.y,
    completed: note.completed,
    createdAt: note.createdAt.toISOString(),
    completedAt: note.completedAt?.toISOString(),
    projectId: note.projectId ?? undefined,
  };
}

export function serializeFocusSession(session: FocusSession): Session {
  return {
    seconds: session.durationSeconds,
    date: session.startedAt.toISOString(),
  };
}
