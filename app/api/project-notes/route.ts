import { NextResponse } from "next/server";

import { parseJson, requireUser, ValidationError, withRouteErrorHandling } from "@/lib/api-helpers";
import { assertProjectOwnership } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";
import { serializeProjectNote } from "@/lib/serializers";

function sanitizeNoteBody(value: unknown) {
  if (typeof value !== "string") {
    throw new ValidationError("Note body is required");
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ValidationError("Note body cannot be empty");
  }
  return trimmed.slice(0, 600);
}

function sanitizeAuthor(value: unknown) {
  if (typeof value !== "string") {
    return "You";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "You";
  }
  return trimmed.slice(0, 120);
}

type CreateProjectNotePayload = {
  projectId?: string;
  body?: string;
  author?: string;
};

export const POST = withRouteErrorHandling(async (request: Request) => {
  const { userId } = await requireUser();
  const body = await parseJson<CreateProjectNotePayload>(request);

  if (!body.projectId) {
    throw new ValidationError("projectId is required");
  }

  await assertProjectOwnership(body.projectId, userId);

  const note = await prisma.projectNote.create({
    data: {
      projectId: body.projectId,
      body: sanitizeNoteBody(body.body),
      author: sanitizeAuthor(body.author),
    },
  });

  return NextResponse.json({ note: serializeProjectNote(note) }, { status: 201 });
});
