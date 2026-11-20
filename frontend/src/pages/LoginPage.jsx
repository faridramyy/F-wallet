import { useAuth } from "react-oidc-context";

export default function LoginPage() {
  const auth = useAuth();

  const handleLogin = () => {
    auth.signinRedirect();
  };

  return (
    <main className="min-h-screen bg-[#0b1220] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500 mb-5">
            <span className="text-2xl font-bold text-white">F</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white">
            F-Wallet
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Your finances, under control.
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-700 bg-[#111c2e] p-8 shadow-2xl">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white">Welcome back</h2>

            <p className="mt-2 text-sm text-slate-400">
              Sign in to access your personal finance dashboard.
            </p>
          </div>

          {auth.error && (
            <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {auth.error.message || "Unable to sign in. Please try again."}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={auth.isLoading}
            className="w-full rounded-xl bg-emerald-500 px-4 py-3.5 font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {auth.isLoading ? "Loading..." : "Sign in"}
          </button>

          <p className="mt-6 text-center text-xs text-slate-500">
            Secure authentication powered by AWS Cognito.
          </p>
        </div>

        <p className="mt-8 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} F-Wallet. All rights reserved.
        </p>
      </div>
    </main>
  );
}
