"use client";

import { FormEvent, useState } from "react";

type TeamMember = {
  membershipId: string;
  userId: string;
  name: string | null;
  email: string | null;
  role: string;
};

type TeamMembersManagerProps = {
  teamId: string;
  initialMembers: TeamMember[];
  canManage: boolean;
  currentUserId: string;
};

export function TeamMembersManager({
  teamId,
  initialMembers,
  canManage,
  currentUserId,
}: TeamMembersManagerProps) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [emailInput, setEmailInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = emailInput.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? "Unable to add member");
      }

      const payload = (await response.json()) as { member?: TeamMember };
      if (payload.member) {
        setMembers((prev) => {
          const existingIndex = prev.findIndex((m) => m.userId === payload.member!.userId);
          if (existingIndex === -1) {
            return [...prev, payload.member!];
          }
          const next = [...prev];
          next[existingIndex] = payload.member!;
          return next;
        });
      }
      setEmailInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove(membershipId: string) {
    if (!canManage) return;

    const previous = members;
    setMembers((prev) => prev.filter((member) => member.membershipId !== membershipId));

    try {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? "Unable to remove member");
      }
    } catch (err) {
      setMembers(previous);
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="team-members">
      <h3>Members</h3>
      {members.length === 0 ? (
        <p className="team-members-empty">No visible members.</p>
      ) : (
        <ul>
          {members.map((member) => {
            const isSelf = member.userId === currentUserId;
            const isOwner = member.role === "owner";
            return (
              <li key={member.membershipId} className="team-member-row">
                <span className="team-member-name">{member.name ?? member.email ?? "Unknown"}</span>
                {member.email ? <span className="team-member-email">{member.email}</span> : null}
                <span className="team-member-role">{member.role}</span>
                {canManage && !isSelf && !isOwner ? (
                  <button
                    type="button"
                    className="btn btn-ghost team-member-remove"
                    onClick={() => {
                      void handleRemove(member.membershipId);
                    }}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {canManage ? (
        <form className="team-members-form" onSubmit={handleInvite}>
          <label>
            <span>Invite member by email</span>
            <input
              type="email"
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              placeholder="teammate@example.com"
            />
          </label>
          <button className="btn btn-secondary" type="submit" disabled={isSubmitting || !emailInput.trim()}>
            {isSubmitting ? "Inviting…" : "Invite"}
          </button>
          {error ? <p className="form-error">{error}</p> : null}
        </form>
      ) : null}
    </div>
  );
}
