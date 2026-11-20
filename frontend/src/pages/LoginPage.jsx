import { BrandMark } from "@/components/Logo";
import { useAuth } from "react-oidc-context";

export default function LoginPage() {
  const auth = useAuth();

  const handleLogin = () => {
    auth.signinRedirect();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <BrandMark />
          </div>

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

          {auth.error && (
            <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {auth.error.message || "Unable to sign in. Please try again."}
            </div>
          )}

          <button
            type="button"
            onClick={handleLogin}
            disabled={auth.isLoading}
            className="flex h-12 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {auth.isLoading ? "Loading..." : "Sign in"}
          </button>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">SECURE ACCESS</span>
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
