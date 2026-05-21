import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(80),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { email, password, name } = parsed.data;
  const normalized = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email: normalized,
      name,
      passwordHash,
      profile: { create: {} },
      plans: { create: { name: "My Plan", isActive: true } },
    },
  });
  return NextResponse.json({ ok: true, userId: user.id });
}
