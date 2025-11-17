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
      <div className="login-sky-glow" />
      <div className="login-window">
        <section className="login-atmosphere">
          <div className="cabin-shelf">
            <div className="coffee-cup">
              <div className="coffee-steam steam-1" />
              <div className="coffee-steam steam-2" />
              <div className="coffee-steam steam-3" />
              <div className="coffee-liquid" />
            </div>
            <div className="whiteboard">
              <span className="whiteboard-pin" />
              <div className="whiteboard-content">
                <p>Focus Ritual</p>
                <ul>
                  <li>☕️ Brew intention</li>
                  <li>✍️ Capture notes</li>
                  <li>🔥 Log focus blocks</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="fireplace">
            <div className="fireplace-mantle" />
            <div className="fireplace-chamber">
              <div className="flame flame-one" />
              <div className="flame flame-two" />
              <div className="flame flame-three" />
              <div className="ember ember-one" />
              <div className="ember ember-two" />
            </div>
            <div className="firewood">
              <span />
              <span />
              <span />
            </div>
          </div>
        </section>

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
