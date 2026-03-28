"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { useState } from "react";

/**
 * Test-only auth page for E2E tests.
 * Signs up/in with Password provider (OTP skipped when IS_TEST=true).
 * After auth, bootstraps the user with role + teamId so requireAuth() passes.
 * All inputs have data-testid attributes for deterministic E2E access.
 */
export default function TestAuthPage() {
  const { signIn } = useAuthActions();
  const bootstrapTestUser = useMutation(api.testing.bootstrapTestUser);
  const [email, setEmail] = useState("admin@test.com");
  const [name, setName] = useState("Test Admin");
  const [role, setRole] = useState("admin");
  const [status, setStatus] = useState<string>("idle");
  const [error, setError] = useState<string | null>(null);

  const TEST_PASSWORD = "test-password-123";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("authenticating");
    setError(null);
    try {
      // Try sign up first (creates account), fallback to sign in
      try {
        await signIn("password", { email, password: TEST_PASSWORD, name, flow: "signUp" });
      } catch {
        await signIn("password", { email, password: TEST_PASSWORD, flow: "signIn" });
      }

      // Bootstrap the user with role + teamId so protected queries work
      await bootstrapTestUser({ role });

      setStatus("authenticated");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus("error");
    }
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Test Authentication</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="test-email" className="text-sm font-medium">Email</label>
            <input id="test-email" data-testid="test-auth-email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label htmlFor="test-name" className="text-sm font-medium">Name</label>
            <input id="test-name" data-testid="test-auth-name" type="text" value={name}
              onChange={(e) => setName(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label htmlFor="test-role" className="text-sm font-medium">Role</label>
            <select id="test-role" data-testid="test-auth-role" value={role}
              onChange={(e) => setRole(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2">
              <option value="admin">Admin</option>
              <option value="coach">Coach</option>
              <option value="analyst">Analyst</option>
              <option value="physio">Physio</option>
              <option value="player">Player</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          <button type="submit" data-testid="test-auth-submit"
            className="w-full rounded bg-blue-600 px-4 py-2 text-white">Sign In</button>
        </form>
        <div data-testid="test-auth-status" className="text-sm font-medium">
          {status === "authenticated" ? "Authenticated!"
            : status === "authenticating" ? "Authenticating..."
            : status === "error" ? `Error: ${error}`
            : "Ready"}
        </div>
      </div>
    </div>
  );
}
