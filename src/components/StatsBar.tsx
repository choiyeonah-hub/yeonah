type Stats = {
  today: { avgDepth: number | null; questionCount: number };
  family: { avgDepth: number | null; totalQuestions: number; streakDays: number };
  member: { avgDepth: number | null; totalQuestions: number } | null;
};

export default function StatsBar({ stats }: { stats: Stats | null }) {
  if (!stats) return null;
  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      <div className="rounded-xl bg-white/70 px-2 py-2 shadow-sm">
        <div className="text-lg font-bold text-havruta-700">{stats.family.streakDays}일</div>
        <div className="text-[11px] text-havruta-600">연속 대화</div>
      </div>
      <div className="rounded-xl bg-white/70 px-2 py-2 shadow-sm">
        <div className="text-lg font-bold text-havruta-700">
          {stats.member?.avgDepth ? stats.member.avgDepth.toFixed(1) : "-"}
        </div>
        <div className="text-[11px] text-havruta-600">내 평균 질문 깊이</div>
      </div>
      <div className="rounded-xl bg-white/70 px-2 py-2 shadow-sm">
        <div className="text-lg font-bold text-havruta-700">{stats.family.totalQuestions}</div>
        <div className="text-[11px] text-havruta-600">가족 누적 질문</div>
      </div>
    </div>
  );
}
