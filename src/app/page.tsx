import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Landing() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="font-semibold text-gray-900">Student Platform</div>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/signin" className="text-gray-700 hover:text-gray-900">Sign in</Link>
          <Link
            href="/signup"
            className="inline-flex items-center h-9 px-4 rounded-md bg-brand-600 text-white hover:bg-brand-700"
          >
            Get started
          </Link>
        </div>
      </header>

      <section className="flex-1 max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-gray-900 leading-tight">
          Plan your transfer. Track every requirement.
        </h1>
        <p className="mt-4 text-lg text-gray-700">
          Build an academic plan, see exactly which classes count toward your major prep at UC and CSU
          campuses (powered by ASSIST.org), and connect with classmates on the same path.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center h-11 px-6 rounded-md bg-brand-600 text-white hover:bg-brand-700"
          >
            Create an account
          </Link>
          <Link href="/signin" className="text-sm text-gray-700 hover:text-gray-900">
            Already have one? Sign in →
          </Link>
        </div>
        <p className="mt-10 text-xs text-gray-500">
          Demo credentials after seeding: <code className="font-mono">demo@student.local</code> /{" "}
          <code className="font-mono">demo1234</code>
        </p>
      </section>
    </main>
  );
}
