"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Signup failed");
      setLoading(false);
      return;
    }
    await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Password (min 8 chars)</label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={8} required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating account…" : "Create account"}
            </Button>
            <p className="text-xs text-gray-500 text-center pt-2">
              Have one? <Link href="/signin" className="text-brand-600 hover:underline">Sign in</Link>
            </p>
          </form>
        </CardBody>
      </Card>
    </main>
  );
}
