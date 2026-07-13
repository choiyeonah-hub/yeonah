import { MessageDTO, SessionDTO } from "@/lib/types";
import DepthBadge from "./DepthBadge";

export default function CurrentQuestionCard({
  question,
  session,
}: {
  question: MessageDTO | null;
  session: SessionDTO | null;
}) {
  if (!question) {
    return (
      <div className="rounded-2xl bg-havruta-600 px-5 py-6 text-center text-havruta-50 shadow-md">
        <p className="text-sm opacity-90">오늘은 무슨 이야기를 나눠볼까요?</p>
        <p className="mt-1 text-lg font-semibold">아이와 눈을 마주치고, 오늘 있었던 일을 먼저 들려주세요 🙂</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-havruta-600 text-havruta-50 shadow-md">
      {session?.topicImageUrl && (
        <img src={session.topicImageUrl} alt={session.topic ?? "오늘의 주제 그림"} className="h-40 w-full object-cover" />
      )}
      <div className="px-5 py-4 text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <span className="text-xs opacity-80">지금 이 질문을 함께 읽고, 눈을 마주치며 이야기해보세요</span>
        </div>
        <p className="text-xl font-bold leading-snug">{question.content}</p>
        <div className="mt-2 flex justify-center">
          <DepthBadge level={question.depthLevel} label={question.depthLabel} />
        </div>
      </div>
    </div>
  );
}
