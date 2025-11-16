"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";

import {
  Session,
  STORAGE_KEY,
  formatSecondsToMMSS,
  safeParseSessions,
} from "./lib/sessionUtils";

export default function HomePage() {
  const [minutesInput, setMinutesInput] = useState<number>(50);
  const [durationSeconds, setDurationSeconds] = useState<number>(50 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(50 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [hasEverStarted, setHasEverStarted] = useState<boolean>(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    setSessions(safeParseSessions(raw));
  }, []);

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
      showToast("Logged to your cup history.");
    },
    [showToast]
  );

  const completeTimer = useCallback(() => {
    setIsRunning(false);
    setRemainingSeconds(0);
    setHasEverStarted(true);
    addSession(durationSeconds);
  }, [addSession, durationSeconds]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = prev - 0.2;
        if (next <= 0.3) {
          clearInterval(interval);
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
      showToast("Too short to log.");
    }
    resetTimer();
  };

  const ratio =
    durationSeconds > 0 ? Math.max(0, Math.min(1, remainingSeconds / durationSeconds)) : 0;
  const fillPercent = ratio * 100;

  const statusMode = isRunning
    ? "RUN"
    : remainingSeconds === durationSeconds
    ? "IDLE"
    : "PAUSE";

  return (
    <>
      <div className="arcade-shell">
        <header className="arcade-header">
          <div className="logo-chip">
            <span className="logo-dot" />
            Coffee Core
          </div>
          <div className={`status-pill status-pill-${statusMode.toLowerCase()}`}>
            {statusMode}
          </div>
          <Link href="/stats" className="nav-link">
            Stats ↗
          </Link>
        </header>

        <section className="mug-stage">
          <div className="crt-frame">
            <div className="scanline" />
            <div className="coffee-cup">
              <div className="coffee-lip" />
              <div
                className="coffee-liquid"
                style={{ height: `${fillPercent}%` }}
              />
              <div className="coffee-foam" />
              <div className="coffee-glare" />
              <div className="coffee-handle" />
            </div>
            <div className="steam">
              <div className="steam-line" />
              <div className="steam-line" />
              <div className="steam-line" />
            </div>
            <div className="mug-plate" />
          </div>
        </section>

        <section className="hud-panel">
          <div className="hud-clock">
            <span className="time-caption">TIME</span>
            <div className="time-main">{formatSecondsToMMSS(remainingSeconds)}</div>
          </div>

          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ transform: `scaleX(${ratio})` }} />
          </div>

          <div className="hud-row">
            <div className="field-group">
              <label htmlFor="minutesInput">Minutes</label>
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
              <label>Presets</label>
              <div className="preset-row">
                {[25, 45, 60, 90].map((m) => (
                  <button
                    key={m}
                    type="button"
                    className="preset-btn"
                    onClick={() => {
                      updateFromMinutes(m);
                      resetTimer();
                    }}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="button-row-main">
            <button type="button" className="btn btn-primary" onClick={handleStart}>
              {isRunning ? "▶ RUN" : hasEverStarted ? "▶ RESUME" : "▶ START"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handlePause}
              disabled={!isRunning}
            >
              ⏸ HOLD
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={resetTimer}
              disabled={!hasEverStarted}
            >
              ⟲ RESET
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleLogNow}
              disabled={!hasEverStarted}
            >
              ☕ LOG
            </button>
          </div>

          <div className="hud-pill">Block: {minutesInput}m</div>
        </section>
      </div>

      <div className={`toast ${toastMessage ? "toast-visible" : ""}`}>
        <div className="toast-dot" />
        <div className="toast-label">Session</div>
        <div>{toastMessage || "Logged to your cup history."}</div>
      </div>
    </>
  );
}
