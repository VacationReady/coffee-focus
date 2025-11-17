import { NextResponse } from "next/server";

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

export const GET = async (
  _request: Request,
  { params }: { params: { projectId: string } }
) => {
  try {
    const { userId } = await requireUser();
    const project = await fetchProjectOrThrow(params.projectId, userId);
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
};

export const PATCH = async (
  request: Request,
  { params }: { params: { projectId: string } }
) => {
  try {
    const { userId } = await requireUser();
    const body = await parseJson<UpdateProjectPayload>(request);
    const project = await fetchProjectOrThrow(params.projectId, userId);

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

export const DELETE = async (
  _request: Request,
  { params }: { params: { projectId: string } }
) => {
  try {
    const { userId } = await requireUser();
    await fetchProjectOrThrow(params.projectId, userId);
    await prisma.project.delete({ where: { id: params.projectId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
};
