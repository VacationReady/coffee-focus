"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type TeamOption = {
  id: string;
  name: string;
};

type TeamsManagerMode = "full" | "manage";

type TeamsManagerProps = {
  mode?: TeamsManagerMode;
};

export function TeamsManager({ mode = "full" }: TeamsManagerProps) {
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [nameInput, setNameInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadTeams() {
      setIsLoading(true);
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
          setError(err instanceof Error ? err.message : "Unable to load teams");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
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

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed || isCreating) return;

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? "Unable to create team");
      }

      const payload = (await response.json()) as { team: TeamOption };
      setTeams((prev) => [...prev, payload.team]);
      setNameInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsCreating(false);
    }
  }

  const isFullMode = mode === "full";

  return (
    <div className="teams-manager">
      <div className="teams-header">
        <span className="teams-label">Teams</span>
        {isLoading ? <span className="teams-status">Loading…</span> : null}
      </div>
      {teams.length > 0 ? (
        <ul className="teams-list">
          {teams.map((team) => (
            <li key={team.id} className="teams-list-item">
              <Link href={`/teams/${team.id}`}>{team.name}</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="teams-empty">
          {isFullMode ? "No teams yet." : "No teams yet. Create your first team from the Teams page."}
        </p>
      )}
      {isFullMode ? (
        <form className="teams-form" onSubmit={handleCreate}>
          <input
            type="text"
            value={nameInput}
            onChange={(event) => setNameInput(event.target.value)}
            placeholder="Create a new team"
          />
          <button className="btn btn-secondary" type="submit" disabled={isCreating || !nameInput.trim()}>
            {isCreating ? "Creating…" : "Create team"}
          </button>
        </form>
      ) : (
        <div>
          <Link href="/teams" className="btn btn-ghost">
            Manage teams ↗
          </Link>
        </div>
      )}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
