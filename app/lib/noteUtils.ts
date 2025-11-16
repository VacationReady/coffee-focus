export type StickyNote = {
  id: string;
  text: string;
  x: number;
  y: number;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
};

export const NOTES_STORAGE_KEY = "peopleCoreNotes_v1";

export function safeParseNotes(raw: string | null): StickyNote[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (n) =>
          n &&
          typeof n === "object" &&
          typeof (n as StickyNote).id === "string" &&
          typeof (n as StickyNote).text === "string" &&
          typeof (n as StickyNote).x === "number" &&
          typeof (n as StickyNote).y === "number" &&
          typeof (n as StickyNote).completed === "boolean" &&
          typeof (n as StickyNote).createdAt === "string"
      )
      .map((n) => ({
        id: (n as StickyNote).id,
        text: (n as StickyNote).text,
        x: (n as StickyNote).x,
        y: (n as StickyNote).y,
        completed: (n as StickyNote).completed,
        createdAt: (n as StickyNote).createdAt,
        completedAt: (n as StickyNote).completedAt,
      }));
  } catch {
    return [];
  }
}

export function generateNoteId(): string {
  return `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
