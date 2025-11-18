"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"] as const;

const CHIPS_PRESETS = ["Discovery", "Delivery", "Ops", "QA", "Client"];

type TeamOption = {
  id: string;
  name: string;
};

const formatDateForInput = (value: string) => {
  if (!value) return "";
  return value.split("T")[0] ?? value;
};

type FormFields = {
  name: string;
  summary: string;
  objective: string;
  owner: string;
  priority: (typeof PRIORITY_OPTIONS)[number] | "";
  startDate: string;
  targetLaunchDate: string;
  successCriteria: string;
  budget: string;
  focusGoalMinutes: string;
  chips: string;
  stakeholders: string;
};

const INITIAL_FORM: FormFields = {
  name: "",
  summary: "",
  objective: "",
  owner: "",
  priority: "Medium",
  startDate: "",
  targetLaunchDate: "",
  successCriteria: "",
  budget: "",
  focusGoalMinutes: "",
  chips: "",
  stakeholders: "",
};

function splitList(value: string) {
  return value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

type NewProjectPanelProps = {
  onSuccess?: () => void;
};

export function NewProjectPanel({ onSuccess }: NewProjectPanelProps = {}) {
  const router = useRouter();
  const [form, setForm] = useState<FormFields>(INITIAL_FORM);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [touched, setTouched] = useState<Partial<Record<keyof FormFields, boolean>>>({});
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  const isSubmitDisabled = useMemo(() => {
    if (status === "saving") return true;
    return form.name.trim().length === 0 || form.summary.trim().length === 0;
  }, [form.name, form.summary, status]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 2600);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    let isCancelled = false;

    async function loadTeams() {
      setIsLoadingTeams(true);
      try {
        const response = await fetch("/api/teams");
        if (!response.ok) {
          throw new Error("Failed to load teams");
        }
        const data = (await response.json()) as { teams?: TeamOption[] };
        if (!isCancelled) {
          setTeams(data.teams ?? []);
        }
      } catch (err) {
        if (!isCancelled) {
          setTeams([]);
          setTeamError(err instanceof Error ? err.message : "Unable to load teams");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingTeams(false);
        }
      }
    }

    loadTeams().catch(() => {
      // handled above
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  function handleInputChange<T extends keyof FormFields>(field: T, value: FormFields[T]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function markTouched(field: keyof FormFields) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  const nameError = touched.name && form.name.trim().length === 0 ? "Give the project a name." : null;
  const summaryError = touched.summary && form.summary.trim().length === 0 ? "Add a short summary." : null;
  const focusGoalError =
    touched.focusGoalMinutes && form.focusGoalMinutes && (Number(form.focusGoalMinutes) <= 0 || Number.isNaN(Number(form.focusGoalMinutes)))
      ? "Enter a positive number."
      : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitDisabled) return;

    setStatus("saving");
    setError(null);

    const payload = {
      name: form.name.trim(),
      summary: form.summary.trim(),
      objective: form.objective.trim() || undefined,
      owner: form.owner.trim() || undefined,
      priority: form.priority || undefined,
      startDate: form.startDate || undefined,
      targetLaunchDate: form.targetLaunchDate || undefined,
      successCriteria: form.successCriteria.trim() || undefined,
      budget: form.budget.trim() || undefined,
      focusGoalMinutes: form.focusGoalMinutes ? Number(form.focusGoalMinutes) : undefined,
      chips: splitList(form.chips),
      stakeholders: splitList(form.stakeholders),
      teamId: selectedTeamId || undefined,
    };

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message ?? "Unable to create project");
      }

      setStatus("success");
      setForm(INITIAL_FORM);
      setTouched({});
      router.refresh();
      setToastMessage("Project drafted");
      setTimeout(() => setStatus("idle"), 1800);
      onSuccess?.();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
      setTimeout(() => setStatus("idle"), 2400);
    }
  }

  function handleChipPresetClick(chip: string) {
    setForm((prev) => ({
      ...prev,
      chips: splitList(prev.chips).includes(chip)
        ? prev.chips
        : [...splitList(prev.chips), chip].join(", "),
    }));
  }

  return (
    <div className="new-project-card">
      <div className="new-project-card-header">
        <div>
          <p className="projects-tag">Create project</p>
          <h3>Spin up a mission</h3>
          <p className="new-project-subtext">
            Capture the essentials a project manager tracks—scope, ownership, dates, and success criteria—so focus
            logs have a home.
          </p>
        </div>
        {status === "success" ? <span className="pill-indicator">Saved ✓</span> : null}
      </div>

      <form className="new-project-form" onSubmit={handleSubmit}>
        <label>
          Name
          <input
            required
            value={form.name}
            onChange={(event) => handleInputChange("name", event.target.value)}
            onBlur={() => markTouched("name")}
            placeholder="e.g. Arcade Board Refresh"
            className={nameError ? "input-error" : undefined}
          />
          {nameError ? <p className="validation-message">{nameError}</p> : <p className="field-hint">Give the mission a memorable codename.</p>}
        </label>

        <label>
          Summary
          <textarea
            required
            value={form.summary}
            onChange={(event) => handleInputChange("summary", event.target.value)}
            onBlur={() => markTouched("summary")}
            placeholder="One-line pitch for the workstream"
            rows={2}
            className={summaryError ? "input-error" : undefined}
          />
          {summaryError ? (
            <p className="validation-message">{summaryError}</p>
          ) : (
            <p className="field-hint">Capture the why in a sentence.</p>
          )}
        </label>

        <label>
          Team
          <select
            value={selectedTeamId}
            onChange={(event) => setSelectedTeamId(event.target.value)}
            disabled={isLoadingTeams}
          >
            <option value="">Personal workspace</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <p className="field-hint">Choose which team should see this mission.</p>
          {teamError ? <p className="form-error">{teamError}</p> : null}
        </label>

        <label>
          Objective
          <textarea
            value={form.objective}
            onChange={(event) => handleInputChange("objective", event.target.value)}
            placeholder="What outcome are we chasing?"
            rows={2}
          />
        </label>

        <div className="field-row">
          <label>
            Owner
            <input value={form.owner} onChange={(event) => handleInputChange("owner", event.target.value)} placeholder="Dri name" />
          </label>
          <label>
            Priority
            <select
              value={form.priority}
              onChange={(event) => handleInputChange("priority", event.target.value as FormFields["priority"])}
            >
              <option value="">Set priority</option>
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="field-row">
          <label>
            Start date
            <input
              type="date"
              value={formatDateForInput(form.startDate)}
              onChange={(event) => handleInputChange("startDate", event.target.value)}
            />
          </label>
          <label>
            Target launch
            <input
              type="date"
              value={formatDateForInput(form.targetLaunchDate)}
              onChange={(event) => handleInputChange("targetLaunchDate", event.target.value)}
            />
          </label>
        </div>

        <label>
          Success criteria
          <textarea
            value={form.successCriteria}
            onChange={(event) => handleInputChange("successCriteria", event.target.value)}
            placeholder="How we know we shipped the right thing?"
            rows={2}
          />
        </label>

        <div className="field-row">
          <label>
            Budget / sprint scope
            <input
              value={form.budget}
              onChange={(event) => handleInputChange("budget", event.target.value)}
              placeholder="Optional notes on budget, sprints, or level of effort"
            />
          </label>
          <label>
            Focus goal (minutes)
            <input
              type="number"
              min="0"
              value={form.focusGoalMinutes}
              onChange={(event) => handleInputChange("focusGoalMinutes", event.target.value)}
              onBlur={() => markTouched("focusGoalMinutes")}
              placeholder="250"
              className={focusGoalError ? "input-error" : undefined}
            />
            {focusGoalError ? (
              <p className="validation-message">{focusGoalError}</p>
            ) : (
              <p className="field-hint">Used to show progress bars inside each card.</p>
            )}
          </label>
        </div>

        <label>
          Tags / chips
          <input
            value={form.chips}
            onChange={(event) => handleInputChange("chips", event.target.value)}
            placeholder="Comma separated tags"
          />
          <p className="field-hint">Add up to five themes like Delivery, Ops, QA.</p>
        </label>
        <div className="chips-preset-row">
          {CHIPS_PRESETS.map((chip) => (
            <button type="button" key={chip} className="chip-preset" onClick={() => handleChipPresetClick(chip)}>
              + {chip}
            </button>
          ))}
        </div>

        <label>
          Stakeholders
          <textarea
            value={form.stakeholders}
            onChange={(event) => handleInputChange("stakeholders", event.target.value)}
            placeholder="Comma or line separated list"
            rows={2}
          />
          <p className="field-hint">We’ll show these on the card for fast reference.</p>
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <button className="btn btn-primary" type="submit" disabled={isSubmitDisabled}>
          {status === "saving" ? "Saving…" : "Create project"}
        </button>
      </form>

      <div className={`toast ${toastMessage ? "toast-visible" : ""}`} role="status" aria-live="polite">
        <span className="toast-dot" />
        <span className="toast-label">{toastMessage ?? ""}</span>
      </div>
    </div>
  );
}
