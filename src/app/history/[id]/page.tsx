"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { loadIdentity } from "@/lib/clientAuth";
import { SessionDTO } from "@/lib/types";
import MessageBubble from "@/components/MessageBubble";

export default function HistoryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionDTO | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = loadIdentity();
    if (!id) {
      router.replace("/");
      return;
    }
    setMemberId(id.memberId);
    fetch(`/api/session/${params.id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setSession(data.session);
      })
      .catch((err) => setError(err.message));
  }, [params.id, router]);

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-havruta-800">{session?.date ?? "대화 기록"}</h1>
        <Link href="/history" className="text-sm text-havruta-600 underline underline-offset-2">
          목록으로
        </Link>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {session?.topicImageUrl && (
        <img src={session.topicImageUrl} alt="" className="mb-3 w-full rounded-xl object-cover" />
      )}
      {session?.topic && <p className="mb-3 text-sm font-medium text-havruta-700">주제: {session.topic}</p>}

      <div className="space-y-1">
        {session?.messages.map((m) => (
          <MessageBubble key={m.id} message={m} isMe={m.memberId === memberId} />
        ))}
      </div>
    </main>
  );
}
