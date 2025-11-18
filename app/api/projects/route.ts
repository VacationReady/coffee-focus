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
    where: {
      OR: [
        { userId },
        { team: { memberships: { some: { userId } } } },
      ],
    },
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
  teamId?: string;
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

async function resolveTeamForUser(teamId: unknown, userId: string) {
  if (typeof teamId !== "string") return null;
  const trimmed = teamId.trim();
  if (!trimmed) return null;

  const membership = await prisma.teamMembership.findFirst({
    where: { teamId: trimmed, userId },
  });

  if (!membership) {
    throw new ValidationError("You do not have access to this team");
  }

  return trimmed;
}

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

  const teamId = await resolveTeamForUser(body.teamId, userId);

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
      teamId,
      userId,
    },
    include: projectInclude,
  });

  return NextResponse.json({ project: serializeProject(project) }, { status: 201 });
});
