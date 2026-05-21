import { prisma } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { FeedComposer } from "./FeedComposer";
import { PostInteractions } from "./PostInteractions";

export default async function FeedPage() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      author: { select: { id: true, name: true, image: true } },
      _count: { select: { comments: true, reactions: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Community feed</h1>
        <p className="text-sm text-gray-600">Ask questions, share advice, find study buddies.</p>
      </div>

      <FeedComposer />

      <div className="space-y-3">
        {posts.length === 0 ? (
          <Card><CardBody className="text-sm text-gray-600">No posts yet — be the first.</CardBody></Card>
        ) : (
          posts.map((p) => (
            <Card key={p.id}>
              <CardBody>
                <div className="flex items-start gap-3">
                  <Avatar name={p.author.name} image={p.author.image} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-900">{p.author.name}</span>
                      <span className="text-xs text-gray-500">{new Date(p.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">{p.body}</p>
                    {p.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.tags.map((t) => <Badge key={t} tone="info">#{t}</Badge>)}
                      </div>
                    )}
                    <PostInteractions postId={p.id} commentCount={p._count.comments} reactionCount={p._count.reactions} />
                  </div>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
