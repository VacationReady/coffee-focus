import { assertProjectOwnership as assertProjectOwnershipBase } from "@/lib/project-access";

export const DEFAULT_STICKY_POSITION = 100;
export const MIN_STICKY_POSITION = 0;
export const MAX_STICKY_POSITION = 2400;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function sanitizeCoordinate(value: unknown, fallback: number = DEFAULT_STICKY_POSITION) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.round(clamp(value, MIN_STICKY_POSITION, MAX_STICKY_POSITION));
}

export function sanitizeNoteText(value: unknown) {
  return typeof value === "string" ? value.slice(0, 400) : "";
}

export function assertProjectOwnership(projectId: string, userId: string) {
  return assertProjectOwnershipBase(projectId, userId);
}
