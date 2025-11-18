import { NextResponse } from "next/server";

import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  parseJson,
  requireUser,
  withRouteErrorHandling,
} from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ teamId: string }>;
};

async function resolveTeamId(context: RouteContext) {
  const { teamId } = await context.params;
  return teamId;
}

type MemberDTO = {
  membershipId: string;
  userId: string;
  name: string | null;
  email: string | null;
  role: string;
};

function mapMembershipToDTO(membership: {
  id: string;
  role: string;
  user: { id: string; name: string | null; email: string | null } | null;
}): MemberDTO | null {
  if (!membership.user) return null;
  return {
    membershipId: membership.id,
    userId: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    role: membership.role,
  };
}

async function ensureCanManage(teamId: string, userId: string) {
  const membership = await prisma.teamMembership.findFirst({
    where: { teamId, userId },
  });

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    throw new UnauthorizedError("You do not have permission to manage this team");
  }

  return membership;
}

export const GET = withRouteErrorHandling(async (_request: Request, context: RouteContext) => {
  const { userId } = await requireUser();
  const teamId = await resolveTeamId(context);

  const team = await prisma.team.findFirst({
    where: { id: teamId, memberships: { some: { userId } } },
    include: {
      memberships: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!team) {
    throw new NotFoundError("Team not found");
  }

  const members: MemberDTO[] = team.memberships
    .map((membership: {
      id: string;
      role: string;
      user: { id: string; name: string | null; email: string | null } | null;
    }) => mapMembershipToDTO(membership))
    .filter((member: MemberDTO | null): member is MemberDTO => Boolean(member));

  return NextResponse.json({ members });
});

type AddMemberPayload = {
  email?: string;
  role?: string;
};

export const POST = withRouteErrorHandling(async (request: Request, context: RouteContext) => {
  const { userId } = await requireUser();
  const teamId = await resolveTeamId(context);
  const body = await parseJson<AddMemberPayload>(request);

  await ensureCanManage(teamId, userId);

  if (typeof body.email !== "string") {
    throw new ValidationError("email is required");
  }

  const email = body.email.trim().toLowerCase();
  if (!email) {
    throw new ValidationError("email is required");
  }

  const targetUser = await prisma.user.findUnique({ where: { email } });
  if (!targetUser) {
    throw new ValidationError("User with that email was not found");
  }

  const role = typeof body.role === "string" && body.role.trim() ? body.role.trim() : "member";

  const membership = await prisma.teamMembership.upsert({
    where: {
      userId_teamId: {
        userId: targetUser.id,
        teamId,
      },
    },
    update: { role },
    create: {
      userId: targetUser.id,
      teamId,
      role,
    },
    include: {
      user: true,
    },
  });

  const member = mapMembershipToDTO({
    id: membership.id,
    role: membership.role,
    user: membership.user,
  });

  if (!member) {
    throw new ValidationError("Unable to resolve member for created membership");
  }

  return NextResponse.json({ member }, { status: 201 });
});

type RemoveMemberPayload = {
  membershipId?: string;
};

export const DELETE = withRouteErrorHandling(async (request: Request, context: RouteContext) => {
  const { userId } = await requireUser();
  const teamId = await resolveTeamId(context);
  const body = await parseJson<RemoveMemberPayload>(request);

  await ensureCanManage(teamId, userId);

  if (!body.membershipId) {
    throw new ValidationError("membershipId is required");
  }

  const membership = await prisma.teamMembership.findFirst({
    where: { id: body.membershipId, teamId },
  });

  if (!membership) {
    throw new ValidationError("Membership not found");
  }

  await prisma.teamMembership.delete({ where: { id: membership.id } });

  return NextResponse.json({ ok: true });
});
