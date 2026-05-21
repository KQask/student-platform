"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Heart, MessageCircle } from "lucide-react";

export function PostInteractions({
  postId,
  commentCount,
  reactionCount,
}: {
  postId: string;
  commentCount: number;
  reactionCount: number;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(reactionCount);
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");

  async function toggleLike() {
    const res = await fetch(`/api/posts/${postId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "LIKE" }),
    });
    const data = await res.json();
    setLiked(data.active);
    setCount((c) => c + (data.active ? 1 : -1));
  }

  async function submitComment() {
    if (!comment.trim()) return;
    await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: comment.trim() }),
    });
    setComment("");
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
      <button onClick={toggleLike} className={`flex items-center gap-1 hover:text-red-600 ${liked ? "text-red-600" : ""}`}>
        <Heart size={14} fill={liked ? "currentColor" : "none"} />
        {count}
      </button>
      <button onClick={() => setOpen((x) => !x)} className="flex items-center gap-1 hover:text-brand-600">
        <MessageCircle size={14} />
        {commentCount}
      </button>
      {open && (
        <div className="flex-1 flex items-center gap-2">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write a comment…"
            className="flex-1 h-7 px-2 text-sm rounded border border-gray-300"
            onKeyDown={(e) => e.key === "Enter" && submitComment()}
          />
          <button onClick={submitComment} className="text-brand-600 hover:underline">Send</button>
        </div>
      )}
    </div>
  );
}
