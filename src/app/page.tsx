"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadIdentity, saveIdentity } from "@/lib/clientAuth";
import { parseJsonOrThrow } from "@/lib/api";

type Mode = "create" | "join";

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("create");
  const [familyName, setFamilyName] = useState("");
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [role, setRole] = useState<"parent" | "child">("parent");
  const [birthYear, setBirthYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const identity = loadIdentity();
    if (identity) {
      router.replace("/chat");
    } else {
      setChecked(true);
    }
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload =
        mode === "create"
          ? {
              action: "create",
              familyName,
              nickname,
              role,
              birthYear: birthYear ? Number(birthYear) : null,
            }
          : {
              action: "join",
              code: code.trim().toUpperCase(),
              nickname,
              role,
              birthYear: birthYear ? Number(birthYear) : null,
            };

      const res = await fetch("/api/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonOrThrow<{ family: any; member: any }>(res);

      saveIdentity({
        familyId: data.family.id,
        familyName: data.family.name,
        familyCode: data.family.code,
        memberId: data.member.id,
        nickname: data.member.nickname,
        role: data.member.role,
      });
      router.push("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (!checked) return null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <div className="text-4xl">🕯️</div>
        <h1 className="mt-2 text-2xl font-bold text-havruta-800">하브루타 톡</h1>
        <p className="mt-1 text-sm text-havruta-600">오늘 하루를 가족과 눈 마주치며 나누는 질문 대화</p>
      </div>

      <div className="mb-4 flex rounded-xl bg-havruta-100 p-1">
        <button
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
            mode === "create" ? "bg-white text-havruta-800 shadow" : "text-havruta-600"
          }`}
          onClick={() => setMode("create")}
          type="button"
        >
          가족 만들기
        </button>
        <button
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
            mode === "join" ? "bg-white text-havruta-800 shadow" : "text-havruta-600"
          }`}
          onClick={() => setMode("join")}
          type="button"
        >
          가족 코드로 참여
        </button>
      </div>

      <form onSubmit={submit} className="space-y-3 rounded-2xl bg-white/70 p-5 shadow-sm">
        {mode === "create" ? (
          <div>
            <label className="mb-1 block text-xs font-medium text-havruta-700">가족 이름</label>
            <input
              required
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="예: 최씨네 가족"
              className="w-full rounded-lg border border-havruta-200 px-3 py-2 text-sm outline-none focus:border-havruta-500"
            />
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-xs font-medium text-havruta-700">가족 코드</label>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="예: AB12CD"
              className="w-full rounded-lg border border-havruta-200 px-3 py-2 text-sm uppercase outline-none focus:border-havruta-500"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-havruta-700">내 이름(닉네임)</label>
          <input
            required
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="예: 엄마, 민준"
            className="w-full rounded-lg border border-havruta-200 px-3 py-2 text-sm outline-none focus:border-havruta-500"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-havruta-700">역할</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "parent" | "child")}
              className="w-full rounded-lg border border-havruta-200 px-3 py-2 text-sm outline-none focus:border-havruta-500"
            >
              <option value="parent">부모</option>
              <option value="child">아이</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-havruta-700">태어난 연도</label>
            <input
              type="number"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              placeholder="예: 2016"
              className="w-full rounded-lg border border-havruta-200 px-3 py-2 text-sm outline-none focus:border-havruta-500"
            />
          </div>
        </div>
        <p className="text-[11px] text-havruta-500">
          태어난 연도는 나이대에 맞는 질문 깊이를 정하는 데만 사용돼요.
        </p>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-havruta-600 py-2.5 text-sm font-semibold text-white transition hover:bg-havruta-700 disabled:opacity-60"
        >
          {loading ? "처리 중..." : mode === "create" ? "가족 만들고 시작하기" : "참여하기"}
        </button>
      </form>

      <a
        href="/glasses"
        className="mt-6 block text-center text-xs text-havruta-600 underline"
      >
        안경 추천 앱 &quot;아이핏&quot; 열기 &rarr;
      </a>
    </main>
  );
}
