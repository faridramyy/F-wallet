import { useEffect } from "react";
import { useAuth } from "react-oidc-context";

import { BrandMark } from "../components/Logo";
import { Button } from "../components/ui/button";
import { useNotifications } from "../components/providers/useNotifications";

export default function LoginPage() {
  const auth = useAuth();
  const { toast } = useNotifications();
  const signInError = auth.error?.message;

  useEffect(() => {
    if (auth.error) {
      toast.error(signInError || "Unable to sign in. Please try again.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-10 text-center">
          <BrandMark className="mx-auto mb-5 size-16 rounded-2xl dark:p-1" />

          <h1 className="text-3xl font-bold tracking-tight">F-Wallet</h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Your finances, under control.
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-border bg-card p-8 text-card-foreground shadow-xl">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight">
              Welcome back
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Sign in to access your personal finance dashboard.
            </p>
          </div>

          <Button
            size="lg"
            className="h-12 w-full font-semibold"
            onClick={() => auth.signinRedirect()}
            disabled={auth.isLoading}
          >
            {auth.isLoading ? "Loading..." : "Sign in"}
          </Button>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs tracking-widest text-muted-foreground uppercase">
              Secure access
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
            Secure authentication powered by AWS Cognito.
          </p>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} F-Wallet. All rights reserved.
        </p>
      </div>
    </main>
  );
}
