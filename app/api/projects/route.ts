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
      userId,
    },
    include: projectInclude,
  });

  return NextResponse.json({ project: serializeProject(project) }, { status: 201 });
});
