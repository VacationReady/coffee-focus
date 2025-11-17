import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  ValidationError,
  parseJson,
  requireUser,
  withRouteErrorHandling,
} from "@/lib/api-helpers";
import { serializeFocusSession } from "@/lib/serializers";
import {
  focusSessionInclude,
  normalizeFocusSessionStatus,
  parseDateInput,
  resolveProjectContext,
  sanitizeDurationSeconds,
  sanitizeSessionNote,
} from "@/lib/focus-session-helpers";

type CreateFocusSessionPayload = {
  durationSeconds?: number;
  status?: string;
  note?: string;
  startedAt?: string;
  completedAt?: string | null;
  projectId?: string | null;
  projectTaskId?: string | null;
};

type UpdateFocusSessionPayload = CreateFocusSessionPayload & {
  id?: string;
};

export const GET = withRouteErrorHandling(async () => {
  const { userId } = await requireUser();
  const sessions = await prisma.focusSession.findMany({
    where: { userId },
    include: focusSessionInclude,
    orderBy: { startedAt: "desc" },
  });

  return NextResponse.json({ sessions: sessions.map(serializeFocusSession) });
});

export const POST = withRouteErrorHandling(async (request: Request) => {
  const { userId } = await requireUser();
  const body = await parseJson<CreateFocusSessionPayload>(request);

  const durationSeconds = sanitizeDurationSeconds(body.durationSeconds, 0);
  const status = normalizeFocusSessionStatus(body.status, "completed");
  const startedAt = parseDateInput(body.startedAt) ?? new Date();
  const completedAtBase = parseDateInput(body.completedAt);
  const completedAt = status === "running" ? null : completedAtBase ?? (status === "completed" ? new Date() : null);
  const note = sanitizeSessionNote(body.note);

  const { projectId, projectTaskId } = await resolveProjectContext({
    projectId: body.projectId,
    projectTaskId: body.projectTaskId,
    userId,
  });

  const session = await prisma.focusSession.create({
    data: {
      durationSeconds,
      status,
      note,
      startedAt,
      completedAt,
      projectId,
      projectTaskId,
      userId,
    },
    include: focusSessionInclude,
  });

  return NextResponse.json({ session: serializeFocusSession(session) }, { status: 201 });
});

export const PATCH = withRouteErrorHandling(async (request: Request) => {
  const { userId } = await requireUser();
  const body = await parseJson<UpdateFocusSessionPayload>(request);

  if (!body.id) {
    throw new ValidationError("Focus session id is required");
  }

  const session = await prisma.focusSession.findFirst({
    where: { id: body.id, userId },
  });

  if (!session) {
    throw new ValidationError("Focus session not found");
  }

  const data: Record<string, unknown> = {};

  if ("durationSeconds" in body) {
    data.durationSeconds = sanitizeDurationSeconds(body.durationSeconds, session.durationSeconds);
  }

  if (typeof body.status === "string") {
    data.status = normalizeFocusSessionStatus(body.status, session.status);
  }

  if ("note" in body) {
    data.note = sanitizeSessionNote(body.note);
  }

  if ("startedAt" in body) {
    data.startedAt = parseDateInput(body.startedAt) ?? session.startedAt;
  }

  if ("completedAt" in body) {
    const nextCompleted = parseDateInput(body.completedAt ?? undefined);
    data.completedAt = nextCompleted ?? null;
  }

  if ("projectId" in body || "projectTaskId" in body) {
    const context = await resolveProjectContext({
      projectId: body.projectId ?? null,
      projectTaskId: body.projectTaskId ?? null,
      userId,
    });
    data.projectId = context.projectId;
    data.projectTaskId = context.projectTaskId;
  }

  if (Object.keys(data).length === 0) {
    throw new ValidationError("No focus session updates provided");
  }

  const updated = await prisma.focusSession.update({
    where: { id: session.id },
    data,
    include: focusSessionInclude,
  });

  return NextResponse.json({ session: serializeFocusSession(updated) });
});

export const DELETE = withRouteErrorHandling(async (request: Request) => {
  const { userId } = await requireUser();
  const { id } = await parseJson<{ id?: string }>(request);

  if (!id) {
    throw new ValidationError("Focus session id is required");
  }

  const session = await prisma.focusSession.findFirst({ where: { id, userId } });
  if (!session) {
    throw new ValidationError("Focus session not found");
  }

  await prisma.focusSession.delete({ where: { id } });

  return NextResponse.json({ ok: true });
});
