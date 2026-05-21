import { badRequest, ok, requireUserId } from "@/lib/api";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  body: z.string().min(1).max(5000),
  tags: z.array(z.string()).optional(),
  mediaUrls: z.array(z.string().url()).optional(),
});

export async function GET() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      author: { select: { id: true, name: true, image: true } },
      _count: { select: { comments: true, reactions: true } },
    },
  });
  return ok(posts);
}

export async function POST(req: Request) {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid input");
  const post = await prisma.post.create({
    data: { authorId: uid, body: parsed.data.body, tags: parsed.data.tags ?? [], mediaUrls: parsed.data.mediaUrls ?? [] },
  });
  return ok(post);
}
