"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

import {
  Session,
  STORAGE_KEY,
  formatSecondsToMinutesLabel,
  safeParseSessions,
  getDayKey,
} from "../lib/sessionUtils";

export default function StatsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    setSessions(safeParseSessions(raw));
  }, []);

  const now = new Date();
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

  const todayKey = getDayKey(now);
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
    if ((totalsByDay.get(key) || 0) > 0) streak++;
    else break;
  }

  const streakLabel =
    streak === 0
      ? "No streak yet — start today."
      : streak === 1
      ? "1 day of focus"
      : `${streak} days of focus`;

  const last7Values = last7Keys.map((key) => totalsByDay.get(key) || 0);
  const maxVal = Math.max(...last7Values, 1);

  return (
    <div className="stats-shell">
      <div className="stats-nav">
        <div className="logo-chip logo-chip-ghost">
          Coffee Core
        </div>
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
            const d = new Date(now);
            d.setDate(d.getDate() - (6 - idx));
            const weekdayShort = d
              .toLocaleDateString(undefined, { weekday: "short" })
              .toUpperCase();
            const value = last7Values[idx];
            const heightPercent = (value / maxVal) * 100;
            const minutes = Math.round(value / 60);

            return (
              <div key={key} className="stats-chart-col">
                <div
                  className={`stats-chart-bar ${value <= 0 ? "stats-chart-bar-empty" : ""}`}
                  style={{ height: `${heightPercent}%` }}
                />
                <span>{weekdayShort}</span>
                <strong>{minutes > 0 ? `${minutes}m` : "–"}</strong>
              </div>
            );
          })}
        </div>
      </div>

      <div className="stats-note">
        Sessions live in your browser. No account. No sync. Just coffee.
      </div>
    </div>
  );
}
