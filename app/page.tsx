"use client";

import React, { useEffect, useState, useCallback } from "react";

type Session = {
  seconds: number;
  date: string; // ISO string
};

const STORAGE_KEY = "coffeeFocusSessions_v1";

function safeParseSessions(raw: string | null): Session[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (s) =>
          s &&
          typeof s === "object" &&
          typeof s.seconds === "number" &&
          typeof s.date === "string"
      )
      .map((s) => ({
        seconds: Math.max(0, s.seconds),
        date: s.date,
      }));
  } catch {
    return [];
  }
}

function formatSecondsToMMSS(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function formatSecondsToMinutesLabel(seconds: number): string {
  const totalMin = Math.round(seconds / 60);
  if (totalMin < 60) return `${totalMin} min`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (mins === 0) return `${hours} h`;
  return `${hours} h ${mins} min`;
}

function getDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function HomePage() {
  // Timer state
  const [minutesInput, setMinutesInput] = useState<number>(60);
  const [durationSeconds, setDurationSeconds] = useState<number>(60 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(60 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [hasEverStarted, setHasEverStarted] = useState<boolean>(false);

  // History / stats
  const [sessions, setSessions] = useState<Session[]>([]);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load sessions from localStorage (client side only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    setSessions(safeParseSessions(raw));
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // ignore
    }
  }, [sessions]);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  }, []);

  const updateFromMinutes = useCallback(
    (minValue: number) => {
      const mins = Math.max(1, Math.min(480, Math.round(minValue || 0)));
      setMinutesInput(mins);
      const seconds = mins * 60;
      setDurationSeconds(seconds);
      if (!isRunning) {
        setRemainingSeconds(seconds);
      }
    },
    [isRunning]
  );

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setRemainingSeconds(durationSeconds);
    setHasEverStarted(false);
  }, [durationSeconds]);

  const addSession = useCallback(
    (seconds: number) => {
      const clamped = Math.max(1, Math.round(seconds));
      const now = new Date();
      setSessions((prev) => [
        ...prev,
        {
          seconds: clamped,
          date: now.toISOString(),
        },
      ]);
      showToast("Nice work — added to today's total.");
    },
    [showToast]
  );

  const completeTimer = useCallback(() => {
    setIsRunning(false);
    setRemainingSeconds(0);
    setHasEverStarted(true);
    // Log full block
    addSession(durationSeconds);
  }, [addSession, durationSeconds]);

  // Timer tick (runs while isRunning)
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = prev - 0.2; // 200ms steps
        if (next <= 0.3) {
          clearInterval(interval);
          // Let React schedule completeTimer
          setTimeout(() => {
            completeTimer();
          }, 0);
          return 0;
        }
        return next;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isRunning, completeTimer]);

  const handleStart = () => {
    if (durationSeconds <= 0) return;
    if (!hasEverStarted) {
      // Starting fresh block
      setRemainingSeconds(durationSeconds);
    }
    setIsRunning(true);
    setHasEverStarted(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleLogNow = () => {
    const worked = durationSeconds - remainingSeconds;
    if (worked > 0.5) {
      addSession(worked);
    } else {
      showToast("Timer too short to log a session.");
    }
    resetTimer();
  };

  // Stats calculation
  const now = new Date();
  const todayKey = getDayKey(now);

  const totalsByDay = new Map<string, number>();
  let totalAll = 0;

  sessions.forEach((s) => {
    const d = new Date(s.date);
    const key = getDayKey(d);
    const prev = totalsByDay.get(key) || 0;
    const val = prev + s.seconds;
    totalsByDay.set(key, val);
    totalAll += s.seconds;
  });

  const totalToday = totalsByDay.get(todayKey) || 0;

  const last7Keys: string[] = [];
  let total7 = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = getDayKey(d);
    last7Keys.push(key);
    total7 += totalsByDay.get(key) || 0;
  }

  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = getDayKey(d);
    const v = totalsByDay.get(key) || 0;
    if (v > 0) streak++;
    else break;
  }

  const statusText = (() => {
    if (isRunning) return "In progress – protect this focus.";
    if (remainingSeconds > 0 && remainingSeconds !== durationSeconds) {
      return "Paused – finish your cup when you’re ready.";
    }
    return "Idle – set your next block";
  })();

  const blockInfo = (() => {
    const mins = Math.round(durationSeconds / 60);
    return isRunning
      ? `Block running • ${mins} min configured`
      : `No block running • ${mins} min configured`;
  })();

  const ratio =
    durationSeconds > 0 ? Math.max(0, Math.min(1, remainingSeconds / durationSeconds)) : 0;

  const last7Values = last7Keys.map((key) => totalsByDay.get(key) || 0);
  const maxVal = Math.max(...last7Values, 1);

  const streakLabel =
    streak === 0
      ? "No streak yet – today’s a good start."
      : streak === 1
      ? "1-day streak – keep it going."
      : `${streak}-day streak – coffee-fuelled focus.`;

  return (
    <>
      <div className="app-shell">
        {/* LEFT PANEL */}
        <div className="left-panel">
          <header className="app-header">
            <div className="app-title-group">
              <div className="app-title-pill">
                <span className="app-title-pill-dot" />
                COFFEE FOCUS TIMER
              </div>
              <h1>Deep work in one cup ☕</h1>
              <p className="app-header-subtitle">
                Set a block, watch your coffee drain, and let the cup show you how
                focused your day really was.
              </p>
            </div>
            <div className="summary-chip-row">
              <div className="chip">
                <span className="chip-dot" />
                FOCUSED SPRINTS
              </div>
              <div className="chip">
                ☕ <span>{sessions.length}</span> sessions logged
              </div>
            </div>
          </header>

          <section className="coffee-card">
            <div className="coffee-card-inner">
              {/* Coffee visual */}
              <div className="coffee-visual-wrap">
                <div className="coffee-cup">
                  <div className="steam">
                    <div className="steam-line" />
                    <div className="steam-line" />
                    <div className="steam-line" />
                  </div>
                  <div
                    className="coffee-liquid"
                    style={{ height: `${ratio * 100}%` }}
                  />
                  <div className="coffee-glare" />
                </div>
              </div>

              {/* Timer controls */}
              <div className="timer-controls">
                <div className="timer-display">
                  <div className="time-caption">Time remaining</div>
                  <div className="time-main">{formatSecondsToMMSS(remainingSeconds)}</div>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{ transform: `scaleX(${ratio})` }}
                    />
                  </div>

                  <div className="pill-indicator">
                    <span
                      className={
                        "pill-indicator-dot " +
                        (!isRunning && remainingSeconds === durationSeconds
                          ? "pill-indicator-dot-idle"
                          : !isRunning
                          ? "pill-indicator-dot-paused"
                          : "")
                      }
                    />
                    <span>{statusText}</span>
                  </div>
                </div>

                <div className="field-row">
                  <div className="field-group">
                    <label htmlFor="minutesInput">Focus block length (minutes)</label>
                    <input
                      id="minutesInput"
                      type="number"
                      min={1}
                      max={480}
                      value={minutesInput}
                      onChange={(e) => updateFromMinutes(Number(e.target.value))}
                    />
                  </div>
                  <div className="field-group">
                    <label>Quick presets</label>
                    <div className="preset-row">
                      {[25, 50, 60, 90].map((m) => (
                        <button
                          key={m}
                          type="button"
                          className="preset-btn"
                          onClick={() => {
                            updateFromMinutes(m);
                            resetTimer();
                          }}
                        >
                          {m} min
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="button-row-main">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleStart}
                  >
                    {isRunning ? "▶ Running" : hasEverStarted ? "▶ Resume" : "▶ Start block"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handlePause}
                    disabled={!isRunning}
                  >
                    ⏸ Pause
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={resetTimer}
                    disabled={!hasEverStarted}
                  >
                    ⟲ Reset
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={handleLogNow}
                    disabled={!hasEverStarted}
                  >
                    ☕ Log now
                  </button>
                </div>

                <div className="pill-indicator" style={{ marginTop: 2 }}>
                  <span>{blockInfo}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT PANEL – Stats */}
        <div className="right-panel">
          <section className="stats-card">
            <div className="stats-header">
              <h2>Productivity over time</h2>
              <div className="badge">
                <span className="badge-dot" />
                <span>{streakLabel}</span>
              </div>
            </div>

            <div className="stats-summary-row">
              <div className="stat-pill">
                <div className="stat-label">Today</div>
                <div className="stat-value">
                  {formatSecondsToMinutesLabel(totalToday)}
                </div>
                <div className="stat-sub">Focused time</div>
              </div>
              <div className="stat-pill">
                <div className="stat-label">Last 7 days</div>
                <div className="stat-value">
                  {formatSecondsToMinutesLabel(total7)}
                </div>
                <div className="stat-sub">Total deep work</div>
              </div>
              <div className="stat-pill">
                <div className="stat-label">All time</div>
                <div className="stat-value">
                  {formatSecondsToMinutesLabel(totalAll)}
                </div>
                <div className="stat-sub">Logged via Coffee Focus</div>
              </div>
            </div>

            <div className="chart-wrapper">
              <div className="chart-header-row">
                <div className="chart-title">Last 7 days</div>
                <div className="chart-legend">
                  <div className="chart-legend-item">
                    <span className="legend-dot" /> Focused minutes per day
                  </div>
                </div>
              </div>
              <div className="chart-body">
                {last7Keys.map((key, idx) => {
                  const d = new Date(now);
                  d.setDate(d.getDate() - (6 - idx));
                  const weekdayShort = d
                    .toLocaleDateString(undefined, { weekday: "short" })
                    .toUpperCase();
                  const value = last7Values[idx];
                  const heightPercent = (value / maxVal) * 100;
                  const minutes = Math.round(value / 60);

                  return (
                    <div key={key} className="chart-bar-col">
                      <div
                        className={
                          "chart-bar " + (value <= 0 ? "chart-bar-empty" : "")
                        }
                        style={{ height: `${heightPercent}%` }}
                      />
                      <span>{weekdayShort}</span>
                      <strong>{minutes > 0 ? `${minutes}m` : "–"}</strong>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="sessions-note">
              Sessions are stored locally in your browser (<span>no account needed</span>).
              Close the tab and come back any time – your coffee history stays.
            </div>
          </section>
        </div>
      </div>

      {/* Toast */}
      <div className={`toast ${toastMessage ? "toast-visible" : ""}`}>
        <div className="toast-dot" />
        <div className="toast-label">Session saved</div>
        <div>{toastMessage || "Nice work — added to today's total."}</div>
      </div>
    </>
  );
}
