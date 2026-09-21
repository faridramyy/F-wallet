import { useState } from "react";

import { useApp } from "../store";
import BrandLogo from "../components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-row items-center gap-3">
          <BrandLogo />
          <div>
            <h1 className="text-lg font-bold tracking-tight">F-Wallet</h1>
            <p className="text-xs text-muted-foreground">Personal Finance</p>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>

              <div className="relative">
                <Input
                  id="password"
                  type={revealed ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  autoFocus
                  className="pr-10"
                />

                {/*
                  tabIndex -1 keeps the toggle out of the tab order, so tabbing
                  from the password field lands on Sign in rather than here.
                  aria-label changes with state so a screen reader announces what
                  the button will do, not what it did.
                */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setRevealed((current) => !current)}
                  tabIndex={-1}
                  aria-label={revealed ? "Hide password" : "Show password"}
                >
                  <i
                    className={`fa-solid ${revealed ? "fa-eye-slash" : "fa-eye"}`}
                  />
                </Button>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={busy || !password}
            >
              {busy ? "Checking..." : "Sign in"}
            </Button>

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              The first request after a quiet spell can take a few seconds while
              the server wakes up.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
