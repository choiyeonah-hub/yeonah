"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadIdentity } from "@/lib/clientAuth";

type SessionSummary = {
  id: string;
  date: string;
  topic: string | null;
  topicSource: "user" | "ai-random";
  messageCount: number;
  avgDepth: number | null;
};

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);

  useEffect(() => {
    const id = loadIdentity();
    if (!id) {
      router.replace("/");
      return;
    }
    fetch(`/api/session/list?familyId=${id.familyId}`)
      .then((res) => res.json())
      .then((data) => setSessions(data.sessions ?? []));
  }, [router]);

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-havruta-800">지난 대화 기록</h1>
        <Link href="/chat" className="text-sm text-havruta-600 underline underline-offset-2">
          오늘로 돌아가기
        </Link>
      </div>

      {sessions === null && <p className="text-sm text-havruta-500">불러오는 중...</p>}
      {sessions?.length === 0 && (
        <p className="text-sm text-havruta-500">아직 기록이 없어요. 오늘 첫 대화를 시작해보세요!</p>
      )}

      <ul className="space-y-2">
        {sessions?.map((s) => (
          <li key={s.id}>
            <Link
              href={`/history/${s.id}`}
              className="flex items-center gap-3 rounded-xl bg-white/70 p-3 shadow-sm transition hover:bg-white"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-havruta-100 text-xl">
                {s.topicSource === "ai-random" ? "🎨" : "💬"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-havruta-500">{s.date}</p>
                <p className="truncate text-sm font-medium text-havruta-800">{s.topic || "(주제 없음)"}</p>
                <p className="text-xs text-havruta-500">
                  대화 {s.messageCount}개 {s.avgDepth ? `· 평균 깊이 ${s.avgDepth.toFixed(1)}단계` : ""}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
