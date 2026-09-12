import { useState } from "react";

import { useApp } from "../store";
import BrandLogo from "../components/BrandLogo";

export default function Login() {
  const { login } = useApp();

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const submit = async (event) => {
    event.preventDefault();

    setError("");
    setBusy(true);

    try {
      await login(password);
    } catch (loginError) {
      setError(loginError.message);
      setBusy(false);
    }
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="mb-6 flex items-center gap-3">
          <BrandLogo />

          <div>
            <h1 className="text-lg font-bold tracking-tight">F-Wallet</h1>
            <p className="text-xs text-slate-400">Personal Finance</p>
          </div>
        </div>

        <label className="input-label" htmlFor="password">
          Password
        </label>

        <div className="password-field">
          <input
            id="password"
            className="input"
            type={revealed ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            autoFocus
          />

          {/*
            tabIndex -1 keeps the toggle out of the tab order, so tabbing
            from the password field lands on Sign in rather than here.
            aria-label changes with state so a screen reader announces what
            the button will do, not what it did.
          */}
          <button
            type="button"
            className="password-toggle"
            onClick={() => setRevealed((current) => !current)}
            tabIndex={-1}
            aria-label={revealed ? "Hide password" : "Show password"}
          >
            <i className={`fa-solid ${revealed ? "fa-eye-slash" : "fa-eye"}`} />
          </button>
        </div>

        {error && <p className="form-error">{error}</p>}

        <button
          type="submit"
          className="primary-button full-button mt-4"
          disabled={busy || !password}
        >
          {busy ? "Checking..." : "Sign in"}
        </button>

        <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
          The first request after a quiet spell can take a few seconds while the
          server wakes up.
        </p>
      </form>
    </div>
  );
}
