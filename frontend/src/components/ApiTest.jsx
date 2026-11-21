import { useState } from "react";
import { useAuth } from "react-oidc-context";

export default function ApiTest() {
  const auth = useAuth();
  const [result, setResult] = useState("Ready to test.");
  const [loading, setLoading] = useState(false);

  const testApi = async () => {
    if (!auth.isAuthenticated || !auth.user) {
      setResult("You are not signed in.");
      return;
    }

    setLoading(true);
    setResult("Calling backend...");

    try {
      const response = await fetch("http://localhost:3000/api/v1/users/me", {
        headers: {
          Authorization: `Bearer ${auth.user.access_token}`,
          "X-ID-Token": auth.user.id_token,
        },
      });

      const body = await response.json();

      setResult(`HTTP ${response.status}\n\n${JSON.stringify(body, null, 2)}`);
    } catch (error) {
      setResult(`Request failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-[360px] rounded-xl border bg-card p-4 shadow-xl">
      <h2 className="mb-2 font-semibold">Temporary API Test</h2>

      <button
        type="button"
        onClick={testApi}
        disabled={loading || !auth.isAuthenticated}
        className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
      >
        {loading ? "Testing..." : "Test GET /users/me"}
      </button>

      <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">
        {result}
      </pre>
    </div>
  );
}
