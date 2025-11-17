import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  ValidationError,
  parseJson,
  requireUser,
  withRouteErrorHandling,
} from "@/lib/api-helpers";
import { projectInclude } from "@/lib/project-query";
import { serializeProject } from "@/lib/serializers";

export const GET = withRouteErrorHandling(async () => {
  const { userId } = await requireUser();

  const projects = await prisma.project.findMany({
    where: { userId },
    include: projectInclude,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ projects: projects.map(serializeProject) });
});

type CreateProjectPayload = {
  name?: string;
  summary?: string;
  chips?: string[];
  focusGoalMinutes?: number | null;
  objective?: string;
  owner?: string;
  priority?: string;
  startDate?: string;
  targetLaunchDate?: string;
  successCriteria?: string;
  budget?: string;
  stakeholders?: string[];
};

const sanitizeNullableString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const parseDateValue = (value: unknown) => {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
};

export const POST = withRouteErrorHandling(async (request: Request) => {
  const { userId } = await requireUser();
  const body = await parseJson<CreateProjectPayload>(request);

  if (!body.name || !body.summary) {
    throw new ValidationError("name and summary are required");
  }

  const chips = Array.isArray(body.chips)
    ? body.chips.filter((chip): chip is string => typeof chip === "string")
    : [];

  const stakeholders = Array.isArray(body.stakeholders)
    ? body.stakeholders.filter((name): name is string => typeof name === "string" && name.trim().length > 0)
    : [];

  const focusGoalMinutes =
    typeof body.focusGoalMinutes === "number" && Number.isFinite(body.focusGoalMinutes)
      ? Math.max(1, Math.round(body.focusGoalMinutes))
      : null;

  const project = await prisma.project.create({
    data: {
      name: body.name.trim(),
      summary: body.summary.trim(),
      chips,
      focusGoalMinutes,
      objective: sanitizeNullableString(body.objective),
      ownerName: sanitizeNullableString(body.owner),
      priority: sanitizeNullableString(body.priority),
      startDate: parseDateValue(body.startDate),
      targetLaunchDate: parseDateValue(body.targetLaunchDate),
      successCriteria: sanitizeNullableString(body.successCriteria),
      budget: sanitizeNullableString(body.budget),
      stakeholders,
      userId,
    },
    include: projectInclude,
  });

  return NextResponse.json({ project: serializeProject(project) }, { status: 201 });
});
