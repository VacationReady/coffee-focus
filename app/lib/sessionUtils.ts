export type Session = {
  seconds: number;
  date: string;
};

export const STORAGE_KEY = "coffeeFocusSessions_v1";

export function safeParseSessions(raw: string | null): Session[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (s) =>
          s &&
          typeof s === "object" &&
          typeof (s as Session).seconds === "number" &&
          typeof (s as Session).date === "string"
      )
      .map((s) => ({
        seconds: Math.max(0, (s as Session).seconds),
        date: (s as Session).date,
      }));
  } catch {
    return [];
  }
}

export function formatSecondsToMMSS(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function formatSecondsToMinutesLabel(seconds: number): string {
  const totalMin = Math.round(seconds / 60);
  if (totalMin < 60) return `${totalMin} min`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (mins === 0) return `${hours} h`;
  return `${hours} h ${mins} min`;
}

export function getDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
