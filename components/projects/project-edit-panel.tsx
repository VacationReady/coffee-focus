"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { ProjectDTO } from "@/lib/serializers";

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"] as const;

const CHIPS_PRESETS = ["Discovery", "Delivery", "Ops", "QA", "Client"];

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

function splitList(value: string) {
  return value
    .split(/[\,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function hydrateFormFromProject(project: ProjectDTO): FormFields {
  const priority = project.priority && (PRIORITY_OPTIONS as readonly string[]).includes(project.priority)
    ? (project.priority as (typeof PRIORITY_OPTIONS)[number])
    : "";

  return {
    name: project.name ?? "",
    summary: project.summary ?? "",
    objective: project.objective ?? "",
    owner: project.owner ?? "",
    priority,
    startDate: project.startDate ? formatDateForInput(project.startDate) : "",
    targetLaunchDate: project.targetLaunchDate ? formatDateForInput(project.targetLaunchDate) : "",
    successCriteria: project.successCriteria ?? "",
    budget: project.budget ?? "",
    focusGoalMinutes:
      typeof project.focusGoalMinutes === "number" && Number.isFinite(project.focusGoalMinutes)
        ? String(project.focusGoalMinutes)
        : "",
    chips: project.chips.join(", "),
    stakeholders: project.stakeholders.join(", "),
  };
}

type EditProjectPanelProps = {
  project: ProjectDTO;
  onSuccess?: () => void;
};

export function EditProjectPanel({ project, onSuccess }: EditProjectPanelProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormFields>(() => hydrateFormFromProject(project));
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [touched, setTouched] = useState<Partial<Record<keyof FormFields, boolean>>>({});

  useEffect(() => {
    setForm(hydrateFormFromProject(project));
    setTouched({});
    setStatus("idle");
    setError(null);
  }, [project]);

  const isSubmitDisabled = useMemo(() => {
    if (status === "saving") return true;
    return form.name.trim().length === 0 || form.summary.trim().length === 0;
  }, [form.name, form.summary, status]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 2600);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  function handleInputChange<T extends keyof FormFields>(field: T, value: FormFields[T]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function markTouched(field: keyof FormFields) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  const nameError = touched.name && form.name.trim().length === 0 ? "Give the project a name." : null;
  const summaryError = touched.summary && form.summary.trim().length === 0 ? "Add a short summary." : null;
  const focusGoalError =
    touched.focusGoalMinutes &&
    form.focusGoalMinutes &&
    (Number(form.focusGoalMinutes) <= 0 || Number.isNaN(Number(form.focusGoalMinutes)))
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
      objective: form.objective.trim(),
      owner: form.owner.trim(),
      priority: form.priority || "",
      startDate: form.startDate,
      targetLaunchDate: form.targetLaunchDate,
      successCriteria: form.successCriteria.trim(),
      budget: form.budget.trim(),
      focusGoalMinutes: form.focusGoalMinutes ? Number(form.focusGoalMinutes) : null,
      chips: splitList(form.chips),
      stakeholders: splitList(form.stakeholders),
    };

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? "Unable to update project");
      }

      setStatus("success");
      router.refresh();
      setToastMessage("Project updated");
      setTimeout(() => setStatus("idle"), 1800);
      onSuccess?.();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
      setTimeout(() => setStatus("idle"), 2400);
    }
  }

  function handleChipPresetClick(chip: string) {
    setForm((prev) => {
      const current = splitList(prev.chips);
      if (current.includes(chip)) {
        return prev;
      }
      return {
        ...prev,
        chips: [...current, chip].join(", "),
      };
    });
  }

  return (
    <div className="new-project-card">
      <div className="new-project-card-header">
        <div>
          <p className="projects-tag">Edit project</p>
          <h3>Fine-tune this mission</h3>
          <p className="new-project-subtext">
            Adjust scope, ownership, dates, and success criteria as your work evolves.
          </p>
        </div>
        {status === "success" ? <span className="pill-indicator">Saved</span> : null}
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
          <p className="field-hint">We will show these on the card for fast reference.</p>
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <button className="btn btn-primary" type="submit" disabled={isSubmitDisabled}>
          {status === "saving" ? "Saving..." : "Save changes"}
        </button>
      </form>

      <div className={`toast ${toastMessage ? "toast-visible" : ""}`} role="status" aria-live="polite">
        <span className="toast-dot" />
        <span className="toast-label">{toastMessage ?? ""}</span>
      </div>
    </div>
  );
}
