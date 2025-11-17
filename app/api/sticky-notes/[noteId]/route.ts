import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  NotFoundError,
  ValidationError,
  handleApiError,
  parseJson,
  requireUser,
} from "@/lib/api-helpers";
import { serializeStickyNote } from "@/lib/serializers";
import {
  DEFAULT_STICKY_POSITION,
  assertProjectOwnership,
  sanitizeCoordinate,
  sanitizeNoteText,
} from "@/lib/sticky-note-helpers";

type RouteContext = {
  params: Promise<{ noteId: string }>;
};

async function resolveNoteId(context: RouteContext) {
  const { noteId } = await context.params;
  return noteId;
}

type UpdateStickyNotePayload = {
  text?: string;
  x?: number;
  y?: number;
  projectId?: string | null;
  completed?: boolean;
};

async function fetchNoteOrThrow(noteId: string, userId: string) {
  const note = await prisma.stickyNote.findFirst({ where: { id: noteId, userId } });
  if (!note) {
    throw new NotFoundError("Sticky note not found");
  }
  return note;
}

export const GET = async (_request: NextRequest, context: RouteContext) => {
  try {
    const { userId } = await requireUser();
    const noteId = await resolveNoteId(context);
    const note = await fetchNoteOrThrow(noteId, userId);
    return NextResponse.json({ note: serializeStickyNote(note) });
  } catch (error) {
    return handleApiError(error);
  }
};

export const PATCH = async (request: NextRequest, context: RouteContext) => {
  try {
    const { userId } = await requireUser();
    const noteId = await resolveNoteId(context);
    const note = await fetchNoteOrThrow(noteId, userId);
    const body = await parseJson<UpdateStickyNotePayload>(request);

    const data: Record<string, unknown> = {};

    if ("text" in body) {
      data.text = sanitizeNoteText(body.text);
    }

    if ("x" in body) {
      data.x = sanitizeCoordinate(body.x, note.x ?? DEFAULT_STICKY_POSITION);
    }

    if ("y" in body) {
      data.y = sanitizeCoordinate(body.y, note.y ?? DEFAULT_STICKY_POSITION);
    }

    if ("projectId" in body) {
      if (typeof body.projectId === "string" && body.projectId.length > 0) {
        await assertProjectOwnership(body.projectId, userId);
        data.projectId = body.projectId;
      } else {
        data.projectId = null;
      }
    }

    if (typeof body.completed === "boolean") {
      data.completed = body.completed;
      data.completedAt = body.completed ? new Date() : null;
    }

    if (Object.keys(data).length === 0) {
      throw new ValidationError("No valid sticky note fields provided");
    }

    const updated = await prisma.stickyNote.update({
      where: { id: note.id },
      data,
    });

    return NextResponse.json({ note: serializeStickyNote(updated) });
  } catch (error) {
    return handleApiError(error);
  }
};

export const DELETE = async (_request: NextRequest, context: RouteContext) => {
  try {
    const { userId } = await requireUser();
    const noteId = await resolveNoteId(context);
    const note = await fetchNoteOrThrow(noteId, userId);
    await prisma.stickyNote.delete({ where: { id: note.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
};
