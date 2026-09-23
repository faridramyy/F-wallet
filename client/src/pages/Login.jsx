import { useState } from "react";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";

import { useApp } from "../store";
import BrandLogo from "../components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

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
      <Card className="w-full max-w-sm border shadow-sm">
        <CardHeader className="flex flex-row items-center gap-3 pb-4">
          <BrandLogo />
          <div>
            <CardTitle className="text-lg font-bold tracking-tight">
              F-Wallet
            </CardTitle>
            <CardDescription className="text-xs">
              Personal Finance
            </CardDescription>
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

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:bg-transparent"
                  onClick={() => setRevealed((current) => !current)}
                  tabIndex={-1}
                  aria-label={revealed ? "Hide password" : "Show password"}
                >
                  {revealed ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {error && (
                <p className="text-xs font-medium text-destructive">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={busy || !password}
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Sign in
                </>
              )}
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
