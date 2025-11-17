import Link from "next/link";
import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type FocusSessionRecord = Awaited<ReturnType<typeof prisma.focusSession.findMany>>[number];

function formatSecondsToMinutesLabel(seconds: number): string {
  const totalMinutes = Math.round(Math.max(0, seconds) / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

function getDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export default async function StatsPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return redirect("/login");
  }

  const sessions: FocusSessionRecord[] = await prisma.focusSession.findMany({
    where: { userId: session.user.id },
    orderBy: { startedAt: "desc" },
  });

  const now = new Date();
  const totalsByDay = new Map<string, number>();
  let totalAll = 0;

  sessions.forEach((session: FocusSessionRecord) => {
    const key = getDayKey(session.startedAt);
    const prev = totalsByDay.get(key) || 0;
    const val = prev + session.durationSeconds;
    totalsByDay.set(key, val);
    totalAll += session.durationSeconds;
  });

  const todayKey = getDayKey(now);
  const totalToday = totalsByDay.get(todayKey) || 0;

  const last7Keys: string[] = [];
  let total7 = 0;
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const key = getDayKey(date);
    last7Keys.push(key);
    total7 += totalsByDay.get(key) || 0;
  }

  let streak = 0;
  for (let i = 0; i < 30; i += 1) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const key = getDayKey(date);
    if ((totalsByDay.get(key) || 0) > 0) {
      streak += 1;
    } else {
      break;
    }
  }

  const streakLabel =
    streak === 0 ? "No streak yet — start today." : streak === 1 ? "1 day of focus" : `${streak} days of focus`;

  const last7Values = last7Keys.map((key) => totalsByDay.get(key) || 0);
  const maxVal = Math.max(...last7Values, 1);
  const hasAnySessions = sessions.length > 0;

  return (
    <div className="stats-shell">
      <div className="stats-nav">
        <div className="logo-chip logo-chip-ghost">Coffee Focus</div>
        <h1>Stats</h1>
        <Link href="/" className="nav-link">
          Back ↩
        </Link>
      </div>

      <div className="stats-summary-grid">
        <div className="stats-card">
          <div className="stat-label">Today</div>
          <div className="stat-value">{formatSecondsToMinutesLabel(totalToday)}</div>
          <div className="stat-sub">Focused time</div>
        </div>
        <div className="stats-card">
          <div className="stat-label">Last 7 days</div>
          <div className="stat-value">{formatSecondsToMinutesLabel(total7)}</div>
          <div className="stat-sub">Total deep work</div>
        </div>
        <div className="stats-card">
          <div className="stat-label">All time</div>
          <div className="stat-value">{formatSecondsToMinutesLabel(totalAll)}</div>
          <div className="stat-sub">Logged cups</div>
        </div>
        <div className="stats-card">
          <div className="stat-label">Streak</div>
          <div className="stat-value">{streakLabel}</div>
          <div className="stat-sub">Consecutive days</div>
        </div>
      </div>

      {hasAnySessions ? (
        <>
          <div className="stats-chart">
            <div className="chart-header-row">
              <div className="chart-title">Last 7 days</div>
              <div className="chart-legend">
                <div className="chart-legend-item">
                  <span className="legend-dot" /> Focused minutes
                </div>
              </div>
            </div>
            <div className="stats-chart-body">
              {last7Keys.map((key, idx) => {
                const date = new Date(now);
                date.setDate(date.getDate() - (6 - idx));
                const weekdayShort = date.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
                const value = last7Values[idx];
                const heightPercent = (value / maxVal) * 100;
                const minutes = Math.round(value / 60);

                return (
                  <div key={key} className="stats-chart-col">
                    <div className={`stats-chart-bar ${value <= 0 ? "stats-chart-bar-empty" : ""}`} style={{ height: `${heightPercent}%` }} />
                    <span>{weekdayShort}</span>
                    <strong>{minutes > 0 ? `${minutes}m` : "–"}</strong>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="stats-note">Sessions sync with your account. Log time from the timer ritual to watch this garden bloom.</div>
        </>
      ) : (
        <div className="stats-empty">
          <h2>No focus history yet</h2>
          <p>Start your first block from the timer screen and we’ll begin growing this view with your sessions.</p>
          <Link href="/" className="nav-link nav-link-cta">
            Jump to timer ↗
          </Link>
        </div>
      )}
    </div>
  );
}
