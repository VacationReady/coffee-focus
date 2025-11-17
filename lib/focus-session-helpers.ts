import { ValidationError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export const FOCUS_SESSION_STATUSES = ["running", "completed", "cancelled"] as const;
export type FocusSessionStatusValue = (typeof FOCUS_SESSION_STATUSES)[number];

export const focusSessionInclude = {
  project: {
    select: {
      id: true,
      name: true,
    },
  },
  task: {
    select: {
      id: true,
      title: true,
    },
  },
};

export function normalizeFocusSessionStatus(value: unknown, fallback: FocusSessionStatusValue = "completed") {
  if (typeof value !== "string") return fallback;
  const next = value.toLowerCase();
  return FOCUS_SESSION_STATUSES.includes(next as FocusSessionStatusValue)
    ? (next as FocusSessionStatusValue)
    : fallback;
}

export function sanitizeDurationSeconds(value: unknown, fallback: number = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.round(value));
}

export function sanitizeSessionNote(value: unknown) {
  return typeof value === "string" ? value.slice(0, 600) : undefined;
}

export function parseDateInput(value: unknown) {
  if (typeof value !== "string") return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function resolveProjectContext(options: {
  projectId?: string | null;
  projectTaskId?: string | null;
  userId: string;
}) {
  const projectId = typeof options.projectId === "string" && options.projectId.length > 0 ? options.projectId : null;
  const taskId = typeof options.projectTaskId === "string" && options.projectTaskId.length > 0 ? options.projectTaskId : null;

  if (!projectId && !taskId) {
    return { projectId: null, projectTaskId: null };
  }

  if (taskId) {
    const task = await prisma.projectTask.findFirst({
      where: { id: taskId, project: { userId: options.userId } },
      select: { id: true, projectId: true },
    });
    if (!task) {
      throw new ValidationError("Invalid project task reference");
    }
    if (projectId && task.projectId !== projectId) {
      throw new ValidationError("Task does not belong to the provided project");
    }
    return { projectId: task.projectId, projectTaskId: task.id };
  }

  if (!projectId) {
    throw new ValidationError("Project reference required when no task is provided");
  }

  const project = await prisma.project.findFirst({ where: { id: projectId, userId: options.userId }, select: { id: true } });
  if (!project) {
    throw new ValidationError("Invalid project reference");
  }
  return { projectId: project.id, projectTaskId: null };
}
