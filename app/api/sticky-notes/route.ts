import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { parseJson, requireUser, withRouteErrorHandling } from "@/lib/api-helpers";
import { serializeStickyNote } from "@/lib/serializers";
import {
  DEFAULT_STICKY_POSITION,
  assertProjectOwnership,
  sanitizeCoordinate,
  sanitizeNoteText,
} from "@/lib/sticky-note-helpers";

type CreateStickyNotePayload = {
  text?: string;
  x?: number;
  y?: number;
  projectId?: string | null;
};

export const GET = withRouteErrorHandling(async () => {
  const { userId } = await requireUser();
  const notes = await prisma.stickyNote.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ notes: notes.map(serializeStickyNote) });
});

export const POST = withRouteErrorHandling(async (request: Request) => {
  const { userId } = await requireUser();
  const body = await parseJson<CreateStickyNotePayload>(request);

  const text = sanitizeNoteText(body.text);
  const x = sanitizeCoordinate(body.x, DEFAULT_STICKY_POSITION);
  const y = sanitizeCoordinate(body.y, DEFAULT_STICKY_POSITION);
  const projectId = typeof body.projectId === "string" ? body.projectId : null;

  if (projectId) {
    await assertProjectOwnership(projectId, userId);
  }

  const note = await prisma.stickyNote.create({
    data: {
      text,
      x,
      y,
      projectId,
      userId,
    },
  });

  return NextResponse.json({ note: serializeStickyNote(note) }, { status: 201 });
});
