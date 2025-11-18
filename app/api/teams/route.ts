import { NextResponse } from "next/server";

import { ValidationError, parseJson, requireUser, withRouteErrorHandling } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

type CreateTeamPayload = {
  name?: string;
};

function sanitizeTeamName(value: unknown) {
  if (typeof value !== "string") {
    throw new ValidationError("Team name is required");
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ValidationError("Team name cannot be empty");
  }
  return trimmed.slice(0, 120);
}

export const GET = withRouteErrorHandling(async () => {
  const { userId } = await requireUser();

  const teams = await prisma.team.findMany({
    where: { memberships: { some: { userId } } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  return NextResponse.json({ teams });
});

export const POST = withRouteErrorHandling(async (request: Request) => {
  const { userId } = await requireUser();
  const body = await parseJson<CreateTeamPayload>(request);

  const name = sanitizeTeamName(body.name);

  const team = await prisma.team.create({
    data: {
      name,
      memberships: {
        create: {
          userId,
          role: "owner",
        },
      },
    },
    select: { id: true, name: true },
  });

  return NextResponse.json({ team }, { status: 201 });
});
