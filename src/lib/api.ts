// Small helpers used across API route handlers.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function requireUserId(): Promise<string | NextResponse> {
  const session = await auth();
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return uid;
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function ok<T>(data: T) {
  return NextResponse.json(data);
}
