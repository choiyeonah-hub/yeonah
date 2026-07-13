"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clearIdentity, loadIdentity, StoredIdentity } from "@/lib/clientAuth";
import { FamilyDTO, MessageDTO, SessionDTO } from "@/lib/types";
import { safeParseJson } from "@/lib/api";
import CurrentQuestionCard from "@/components/CurrentQuestionCard";
import MessageBubble from "@/components/MessageBubble";
import StatsBar from "@/components/StatsBar";

type Stats = {
  today: { avgDepth: number | null; questionCount: number };
  family: { avgDepth: number | null; totalQuestions: number; streakDays: number };
  member: { avgDepth: number | null; totalQuestions: number } | null;
};

export default function ChatPage() {
  const router = useRouter();
  const [identity, setIdentity] = useState<StoredIdentity | null>(null);
  const [family, setFamily] = useState<FamilyDTO | null>(null);
  const [session, setSession] = useState<SessionDTO | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [generatingTopic, setGeneratingTopic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = loadIdentity();
    if (!id) {
      router.replace("/");
      return;
    }
    setIdentity(id);
  }, [router]);

  async function refreshStats(familyId: string, memberId: string) {
    const res = await fetch(`/api/stats?familyId=${familyId}&memberId=${memberId}`);
    if (res.ok) {
      const data = await safeParseJson<Stats>(res);
      if (data) setStats(data);
    }
  }

  async function loadToday(id: StoredIdentity) {
    const res = await fetch(`/api/session/today?familyId=${id.familyId}`);
    const data = await safeParseJson<{ session: SessionDTO; family: FamilyDTO; error?: string }>(res);
    if (!res.ok || !data) {
      setError(data?.error || `불러오기에 실패했습니다 (HTTP ${res.status}).`);
      return;
    }
    setSession(data.session);
    setFamily(data.family);
    refreshStats(id.familyId, id.memberId);
  }

  useEffect(() => {
    if (identity) loadToday(identity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages.length]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!identity || !session || !input.trim()) return;
    setSending(true);
    setError(null);
    const content = input.trim();
    setInput("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, memberId: identity.memberId, content }),
      });
      const data = await safeParseJson<{ userMessage?: MessageDTO; aiMessage?: MessageDTO; error?: string }>(res);
      if (!data?.userMessage) {
        throw new Error(data?.error || `전송에 실패했습니다 (HTTP ${res.status}).`);
      }
      const userMessage = data.userMessage;

      setSession((prev) => {
        if (!prev) return prev;
        const next = { ...prev, messages: [...prev.messages, userMessage] };
        if (data.aiMessage) next.messages.push(data.aiMessage);
        return next;
      });
      if (data.error && !data.aiMessage) {
        setError(`답변은 저장했지만 질문 생성에 실패했어요: ${data.error}`);
      }
      refreshStats(identity.familyId, identity.memberId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  }

  async function requestRandomTopic() {
    if (!identity || !session) return;
    setGeneratingTopic(true);
    setError(null);
    try {
      const res = await fetch("/api/topic/random-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, memberId: identity.memberId }),
      });
      const data = await safeParseJson<{ session: SessionDTO; aiMessage: MessageDTO; error?: string }>(res);
      if (!res.ok || !data) throw new Error(data?.error || `주제 생성에 실패했습니다 (HTTP ${res.status}).`);

      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          topic: data.session.topic,
          topicImageUrl: data.session.topicImageUrl,
          topicSource: data.session.topicSource,
          messages: [...prev.messages, data.aiMessage],
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setGeneratingTopic(false);
    }
  }

  function logout() {
    clearIdentity();
    router.replace("/");
  }

  if (!identity || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center text-havruta-600">
        {error ? <p>{error}</p> : <p>불러오는 중...</p>}
      </main>
    );
  }

  const lastAiMessage = [...session.messages].reverse().find((m) => m.role === "ai") ?? null;
  const showRandomTopicButton = session.messages.length === 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-28 pt-4">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-havruta-800">🕯️ {family?.name ?? "우리 가족"}</h1>
          <p className="text-xs text-havruta-500">
            코드 {family?.code} · {identity.nickname}님
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Link href="/history" className="text-havruta-600 underline underline-offset-2">
            지난 기록
          </Link>
          <button onClick={logout} className="text-havruta-400">
            나가기
          </button>
        </div>
      </header>

      <div className="mb-3">
        <StatsBar stats={stats} />
      </div>

      <div className="mb-3 sticky top-0 z-10">
        <CurrentQuestionCard question={lastAiMessage} session={session} />
      </div>

      {showRandomTopicButton && (
        <button
          onClick={requestRandomTopic}
          disabled={generatingTopic}
          className="mb-3 w-full rounded-xl border border-dashed border-havruta-400 py-3 text-sm font-medium text-havruta-700 transition hover:bg-havruta-100 disabled:opacity-60"
        >
          {generatingTopic ? "그림 주제를 만드는 중... 🎨" : "🎨 오늘 얘깃거리가 없어요, 그림 주제로 시작할게요"}
        </button>
      )}

      <div className="flex-1 space-y-1">
        {session.messages.map((m: MessageDTO) => (
          <MessageBubble key={m.id} message={m} isMe={m.memberId === identity.memberId} />
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

      <form
        onSubmit={sendMessage}
        className="fixed bottom-0 left-0 right-0 mx-auto flex max-w-md gap-2 border-t border-havruta-200 bg-[#fffaf2]/95 p-3 backdrop-blur"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={showRandomTopicButton ? "오늘 있었던 일을 들려주세요..." : "함께 나눈 이야기를 적어보세요..."}
          className="flex-1 rounded-full border border-havruta-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-havruta-500"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-full bg-havruta-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {sending ? "..." : "보내기"}
        </button>
      </form>
    </main>
  );
}
