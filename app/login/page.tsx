"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = form.get("email")?.toString() ?? "";
    const password = form.get("password")?.toString() ?? "";

    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/",
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("Invalid login. Check your details and try again.");
      return;
    }

    window.location.href = "/";
  };

  const handleGithubSignIn = () => {
    signIn("github", { callbackUrl: "/" });
  };

  return (
    <div className="login-scene">
      <div className="login-background login-background-top" aria-hidden="true" />
      <div className="login-background login-background-bottom" aria-hidden="true" />
      <div className="login-frame">
        <aside className="login-showcase">
          <div className="showcase-window" aria-hidden="true">
            <div className="window-frame">
              <div className="window-night">
                <span className="window-moon" />
                <span className="window-star star-one" />
                <span className="window-star star-two" />
                <span className="window-star star-three" />
                <span className="window-hill hill-one" />
                <span className="window-hill hill-two" />
              </div>
            </div>
            <div className="window-lamp">
              <span className="lamp-base" />
              <span className="lamp-light" />
            </div>
          </div>

          <div className="showcase-copy">
            <p className="eyebrow">BRAINSTORMING STATION</p>
            <h2>Bold ideas creates success</h2>
            <p>
              Track all activities through PeopleCore Focus, understand where time is better spent, what's going well
              and why
            </p>
          </div>

          <div className="ritual-card">
            <p className="ritual-title">Our Ethos</p>
            <ul>
              <li>
                <span className="ritual-icon ritual-icon-mug" aria-hidden="true">
                  <svg viewBox="0 0 48 48" role="presentation" focusable="false">
                    <rect x="10" y="14" width="20" height="20" rx="6" ry="6" />
                    <path d="M30 18h6a4 4 0 0 1 0 8h-6" strokeWidth="3" strokeLinecap="round" />
                    <path d="M18 10c0 2-2 3-2 5s2 3 2 5" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
                <div>
                  <strong>Build what matters.</strong>
                  <small>Improve it relentlessly</small>
                </div>
              </li>
              <li>
                <span className="ritual-icon ritual-icon-notes" aria-hidden="true">
                  <svg viewBox="0 0 48 48" role="presentation" focusable="false">
                    <rect x="12" y="10" width="24" height="32" rx="6" ry="6" />
                    <line x1="18" y1="20" x2="30" y2="20" strokeWidth="3" strokeLinecap="round" />
                    <line x1="18" y1="28" x2="30" y2="28" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="24" cy="14" r="2" />
                  </svg>
                </span>
                <div>
                  <strong>Serve the customer,</strong>
                  <small>simplify the complex.</small>
                </div>
              </li>
              <li>
                <span className="ritual-icon ritual-icon-flame" aria-hidden="true">
                  <svg viewBox="0 0 48 48" role="presentation" focusable="false">
                    <path d="M24 6c3 8-2 11-2 14s2 4 2 7-2 5-2 7c0 4 3 6 6 6 5 0 8-4 8-9 0-6-4-10-7-13-3-4-3-8-5-12z" />
                    <path d="M20 30c0 4 2 6 5 6 3 0 5-2 5-5 0-4-4-6-5-9-1 3-5 4-5 8z" />
                  </svg>
                </span>
                <div>
                  <strong>Ship boldly.</strong>
                  <small>Learn fast. Grow together.</small>
                </div>
              </li>
            </ul>
          </div>

          <div className="session-pill">
            <div>
              <p>Next focus window</p>
              <strong>08:00 PM · Cabin mode</strong>
            </div>
            <span className="session-pill-dot" aria-hidden="true" />
          </div>
        </aside>

        <section className="login-panel">
          <div className="login-card">
            <div className="login-card-header">
              <p className="login-tag">PeopleCore Coffee</p>
              <h1>Welcome back</h1>
              <p className="login-subtitle">
                The internal tool for monitoring all PeopleCore activity
              </p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <label className="login-field">
                <span>Email</span>
                <input name="email" type="email" placeholder="you@example.com" autoComplete="email" />
              </label>

              <label className="login-field">
                <span>Password</span>
                <input
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </label>

              {error ? <p className="login-error">{error}</p> : null}

              <button type="submit" className="login-submit" disabled={isSubmitting}>
                {isSubmitting ? "Lighting the fire..." : "Enter the cabin"}
              </button>
            </form>

            <div className="login-divider" aria-hidden="true">
              <span />
              <p>or continue with</p>
              <span />
            </div>

            <button type="button" className="login-social" onClick={handleGithubSignIn}>
              Sign in with GitHub
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
