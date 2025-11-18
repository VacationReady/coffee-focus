import { ValidationError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { projectInclude } from "@/lib/project-query";

export async function assertProjectOwnership(projectId: string, userId: string) {
  const exists = await prisma.project.count({
    where: {
      id: projectId,
      OR: [
        { userId },
        { team: { memberships: { some: { userId } } } },
      ],
    },
  });
  if (exists === 0) {
    throw new ValidationError("Invalid project reference");
  }
}

export async function getProjectForUser(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { userId },
        { team: { memberships: { some: { userId } } } },
      ],
    },
    include: projectInclude,
  });
  if (!project) {
    throw new ValidationError("Project not found");
  }
  return project;
}
