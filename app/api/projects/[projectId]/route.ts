import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  NotFoundError,
  ValidationError,
  handleApiError,
  parseJson,
  requireUser,
} from "@/lib/api-helpers";
import { projectInclude } from "@/lib/project-query";
import { serializeProject } from "@/lib/serializers";

const sanitizeNullableString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const parseDateValue = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  if (value.trim().length === 0) {
    return null;
  }
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp);
};

async function fetchProjectOrThrow(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: projectInclude,
  });
  if (!project) {
    throw new NotFoundError("Project not found");
  }
  return project;
}

type RouteContext = { params: Promise<{ projectId: string }> };

async function resolveProjectId(context: RouteContext) {
  const { projectId } = await context.params;
  return projectId;
}

export const GET = async (_request: NextRequest, context: RouteContext) => {
  try {
    const { userId } = await requireUser();
    const projectId = await resolveProjectId(context);
    const project = await fetchProjectOrThrow(projectId, userId);
    return NextResponse.json({ project: serializeProject(project) });
  } catch (error) {
    return handleApiError(error);
  }
};

type UpdateProjectPayload = {
  name?: string;
  summary?: string;
  chips?: string[];
  focusGoalMinutes?: number | null;
  objective?: string | null;
  owner?: string | null;
  priority?: string | null;
  startDate?: string | null;
  targetLaunchDate?: string | null;
  successCriteria?: string | null;
  budget?: string | null;
  stakeholders?: string[];
};

export const PATCH = async (request: NextRequest, context: RouteContext) => {
  try {
    const { userId } = await requireUser();
    const body = await parseJson<UpdateProjectPayload>(request);
    const projectId = await resolveProjectId(context);
    const project = await fetchProjectOrThrow(projectId, userId);

    const data: Record<string, unknown> = {};

    if (typeof body.name === "string") {
      data.name = body.name.trim();
    }
    if (typeof body.summary === "string") {
      data.summary = body.summary.trim();
    }
    if (Array.isArray(body.chips)) {
      data.chips = body.chips.filter((chip): chip is string => typeof chip === "string");
    }
    if (body.focusGoalMinutes === null) {
      data.focusGoalMinutes = null;
    } else if (typeof body.focusGoalMinutes === "number" && Number.isFinite(body.focusGoalMinutes)) {
      data.focusGoalMinutes = Math.max(1, Math.round(body.focusGoalMinutes));
    }

    if (body.objective !== undefined) {
      data.objective = sanitizeNullableString(body.objective);
    }
    if (body.owner !== undefined) {
      data.ownerName = sanitizeNullableString(body.owner);
    }
    if (body.priority !== undefined) {
      data.priority = sanitizeNullableString(body.priority);
    }
    if (body.successCriteria !== undefined) {
      data.successCriteria = sanitizeNullableString(body.successCriteria);
    }
    if (body.budget !== undefined) {
      data.budget = sanitizeNullableString(body.budget);
    }
    if (body.startDate !== undefined) {
      const parsed = parseDateValue(body.startDate);
      if (parsed !== undefined) {
        data.startDate = parsed;
      }
    }
    if (body.targetLaunchDate !== undefined) {
      const parsed = parseDateValue(body.targetLaunchDate);
      if (parsed !== undefined) {
        data.targetLaunchDate = parsed;
      }
    }
    if (Array.isArray(body.stakeholders)) {
      data.stakeholders = body.stakeholders.filter(
        (name): name is string => typeof name === "string" && name.trim().length > 0
      );
    }

    if (Object.keys(data).length === 0) {
      throw new ValidationError("No valid project fields provided");
    }

    const updated = await prisma.project.update({
      where: { id: project.id },
      data,
      include: projectInclude,
    });

    return NextResponse.json({ project: serializeProject(updated) });
  } catch (error) {
    return handleApiError(error);
  }
};

export const DELETE = async (_request: NextRequest, context: RouteContext) => {
  try {
    const { userId } = await requireUser();
    const projectId = await resolveProjectId(context);
    await fetchProjectOrThrow(projectId, userId);
    await prisma.project.delete({ where: { id: projectId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
};
