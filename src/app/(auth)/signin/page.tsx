"use client";

import { signIn, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

// useSearchParams() requires a Suspense boundary when the page is statically rendered.
export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInInner />
    </Suspense>
  );
}

function SignInInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stale = searchParams.get("stale") === "1";
  const [email, setEmail] = useState("demo@student.local");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If we landed here because the JWT pointed at a deleted user, clear the cookie so
  // it doesn't keep bouncing the user back on refresh.
  useEffect(() => {
    if (stale) signOut({ redirect: false }).catch(() => {});
  }, [stale]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) setError("Invalid email or password");
    else router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-3">
            {stale && (
              <div className="rounded bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                Your previous session was tied to an account that no longer exists.
                Please sign in again.
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-700 mb-1">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Password</label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Signing in…" : "Sign in"}
            </Button>
            <p className="text-xs text-gray-500 text-center pt-2">
              No account? <Link href="/signup" className="text-brand-600 hover:underline">Sign up</Link>
            </p>
          </form>
        </CardBody>
      </Card>
    </main>
  );
}
