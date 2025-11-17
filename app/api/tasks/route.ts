import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  ValidationError,
  parseJson,
  requireUser,
  withRouteErrorHandling,
} from "@/lib/api-helpers";
import { serializeProjectTask } from "@/lib/serializers";
import {
  ensureProjectAccess,
  normalizeTaskStatus,
  sanitizeEstimateMinutes,
  sanitizeLoggedSeconds,
  sanitizeTaskOwner,
  sanitizeTaskTitle,
} from "@/lib/task-helpers";

type CreateTaskPayload = {
  projectId?: string;
  title?: string;
  status?: string;
  estimateMinutes?: number | null;
  owner?: string | null;
};

type UpdateTaskPayload = {
  title?: string;
  status?: string;
  estimateMinutes?: number | null;
  loggedSeconds?: number | null;
  owner?: string | null;
};

export const GET = withRouteErrorHandling(async () => {
  const { userId } = await requireUser();
  const tasks = await prisma.projectTask.findMany({
    where: { project: { userId } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tasks: tasks.map(serializeProjectTask) });
});

export const POST = withRouteErrorHandling(async (request: Request) => {
  const { userId } = await requireUser();
  const body = await parseJson<CreateTaskPayload>(request);

  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  await ensureProjectAccess(projectId, userId);

  const title = sanitizeTaskTitle(body.title);
  if (!title) {
    throw new ValidationError("Task title is required");
  }

  const task = await prisma.projectTask.create({
    data: {
      projectId,
      title,
      status: normalizeTaskStatus(body.status, "backlog"),
      estimateMinutes: sanitizeEstimateMinutes(body.estimateMinutes),
      owner: sanitizeTaskOwner(body.owner),
    },
  });

  return NextResponse.json({ task: serializeProjectTask(task) }, { status: 201 });
});

export const PATCH = withRouteErrorHandling(async (request: Request) => {
  const { userId } = await requireUser();
  const body = await parseJson<UpdateTaskPayload & { id?: string }>(request);

  if (!body.id) {
    throw new ValidationError("Task id is required");
  }

  const task = await prisma.projectTask.findUnique({ where: { id: body.id } });
  if (!task) {
    throw new ValidationError("Task not found");
  }

  await ensureProjectAccess(task.projectId, userId);

  const data: Record<string, unknown> = {};

  if (typeof body.title === "string") {
    data.title = sanitizeTaskTitle(body.title);
  }

  if (typeof body.status === "string") {
    data.status = normalizeTaskStatus(body.status, task.status);
  }

  if ("estimateMinutes" in body) {
    data.estimateMinutes = sanitizeEstimateMinutes(body.estimateMinutes);
  }

  if ("loggedSeconds" in body) {
    data.loggedSeconds = sanitizeLoggedSeconds(body.loggedSeconds) ?? task.loggedSeconds;
  }

  if ("owner" in body) {
    data.owner = sanitizeTaskOwner(body.owner);
  }

  if (Object.keys(data).length === 0) {
    throw new ValidationError("No task updates provided");
  }

  const updated = await prisma.projectTask.update({
    where: { id: task.id },
    data,
  });

  return NextResponse.json({ task: serializeProjectTask(updated) });
});

export const DELETE = withRouteErrorHandling(async (request: Request) => {
  const { userId } = await requireUser();
  const { id } = await parseJson<{ id?: string }>(request);

  if (!id) {
    throw new ValidationError("Task id is required");
  }

  const task = await prisma.projectTask.findUnique({ where: { id } });
  if (!task) {
    throw new ValidationError("Task not found");
  }

  await ensureProjectAccess(task.projectId, userId);
  await prisma.projectTask.delete({ where: { id } });

  return NextResponse.json({ ok: true });
});
