"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

import {
  Session,
  STORAGE_KEY,
  safeParseSessions,
  formatSecondsToMinutesLabel,
} from "../lib/sessionUtils";

type Project = {
  id: string;
  name: string;
  chips: string[];
  notes: string;
};

const SAMPLE_PROJECTS: Project[] = [
  {
    id: "retro-cab",
    name: "Retro Cabinet",
    chips: ["PIXEL", "UI"],
    notes: "Skin the cabinet UI for the focus pot.",
  },
  {
    id: "beans-lab",
    name: "Beans Lab",
    chips: ["RESEARCH", "CAFFEINE"],
    notes: "Experiment with new bean blends for focus.",
  },
  {
    id: "brew-sync",
    name: "Brew Sync",
    chips: ["SYNC", "MOBILE"],
    notes: "Plan the mobile companion app.",
  },
];

export default function ProjectsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    setSessions(safeParseSessions(raw));
  }, []);

  const totalMinutes = formatSecondsToMinutesLabel(
    sessions.reduce((acc, s) => acc + s.seconds, 0)
  );

  return (
    <div className="projects-shell">
      <div className="projects-nav">
        <div className="logo-chip logo-chip-ghost">Coffee Core</div>
        <h1>Projects</h1>
        <nav className="nav-links">
          <Link href="/" className="nav-link">
            Timer ↩
          </Link>
          <Link href="/stats" className="nav-link">
            Stats ↗
          </Link>
        </nav>
      </div>

      <section className="projects-header">
        <div>
          <p className="projects-tag">Active roster</p>
          <h2>Arcade board</h2>
        </div>
        <div className="projects-meter">
          <span>Total logged</span>
          <strong>{totalMinutes}</strong>
        </div>
      </section>

      <div className="projects-grid">
        {SAMPLE_PROJECTS.map((project) => (
          <article key={project.id} className="project-card">
            <div className="project-card-header">
              <h3>{project.name}</h3>
              <button type="button" className="btn btn-ghost project-btn">
                ➕ Task
              </button>
            </div>
            <div className="project-chips">
              {project.chips.map((chip) => (
                <span key={chip} className="project-chip">
                  {chip}
                </span>
              ))}
            </div>
            <p className="project-notes">{project.notes}</p>
            <div className="project-footer">
              <span>Milestones</span>
              <div className="project-squares">
                {[0, 1, 2, 3].map((idx) => (
                  <div key={idx} className="project-square" />
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
