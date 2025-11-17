import { ValidationError } from "@/lib/api-helpers";
import { assertProjectOwnership } from "@/lib/project-access";

export const TASK_STATUS_VALUES = ["backlog", "active", "blocked", "done"] as const;
export type TaskStatusValue = (typeof TASK_STATUS_VALUES)[number];

export function normalizeTaskStatus(value: unknown, fallback: TaskStatusValue = "backlog"): TaskStatusValue {
  if (typeof value !== "string") return fallback;
  const normalized = value.toLowerCase();
  return TASK_STATUS_VALUES.includes(normalized as TaskStatusValue)
    ? (normalized as TaskStatusValue)
    : fallback;
}

export function sanitizeTaskTitle(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 160) : "";
}

export function sanitizeTaskOwner(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 120) : null;
}

export function sanitizeEstimateMinutes(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}

export function sanitizeLoggedSeconds(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}

export async function ensureProjectAccess(projectId: string, userId: string) {
  if (!projectId) {
    throw new ValidationError("projectId is required");
  }
  await assertProjectOwnership(projectId, userId);
}

export function ensureTaskBelongsToUser(task: { projectId: string }, userId: string) {
  if (!task || !task.projectId) {
    throw new ValidationError("Invalid task reference");
  }
  return assertProjectOwnership(task.projectId, userId);
}
