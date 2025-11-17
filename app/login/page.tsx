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
            <p className="eyebrow">Coffee Focus</p>
            <h2>Settle back in.</h2>
            <p>
              Cozy rituals, guided prompts, and warm lighting cues keep your workflow gentle and intentional.
            </p>
          </div>

          <div className="ritual-card">
            <p className="ritual-title">Tonight&apos;s ritual</p>
            <ul>
              <li>
                <span>☕</span>
                <div>
                  <strong>Brew intention</strong>
                  <small>Savor a pour-over while writing what matters.</small>
                </div>
              </li>
              <li>
                <span>🗂️</span>
                <div>
                  <strong>Capture notes</strong>
                  <small>Park stray thoughts in your project notebook.</small>
                </div>
              </li>
              <li>
                <span>🔥</span>
                <div>
                  <strong>Log focus blocks</strong>
                  <small>Protect two deep work windows tonight.</small>
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
              <p className="login-tag">PeopleCore Cabin</p>
              <h1>Welcome back</h1>
              <p className="login-subtitle">
                Log in to sync your focus sessions, sticky notes, and project rituals.
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

            <div className="login-divider">
              <span />
              <p>or</p>
              <span />
            </div>

            <button type="button" className="login-social" onClick={handleGithubSignIn}>
              Sign in with GitHub
            </button>

            <div className="login-hint">
              <p>Seed account</p>
              <code>michael.dowdle@hotmail.com / Admin123!</code>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
