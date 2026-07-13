import { MessageDTO } from "@/lib/types";
import DepthBadge from "./DepthBadge";

export default function MessageBubble({ message, isMe }: { message: MessageDTO; isMe: boolean }) {
  if (message.role === "ai") {
    return (
      <div className="flex flex-col items-start gap-1 py-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🕯️</span>
          <span className="text-xs font-medium text-havruta-700">하브루타 질문</span>
          <DepthBadge level={message.depthLevel} label={message.depthLabel} />
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-havruta-100 px-4 py-2 text-havruta-900 shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 py-1 ${isMe ? "items-end" : "items-start"}`}>
      {!isMe && <span className="px-1 text-xs text-havruta-600">{message.member?.nickname ?? "가족"}</span>}
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2 shadow-sm ${
          isMe ? "rounded-tr-sm bg-havruta-500 text-white" : "rounded-tl-sm bg-white text-havruta-900"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
