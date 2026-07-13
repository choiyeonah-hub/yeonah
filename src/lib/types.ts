export type MemberDTO = {
  id: string;
  nickname: string;
  role: "parent" | "child";
  birthYear: number | null;
};

export type MessageDTO = {
  id: string;
  sessionId: string;
  memberId: string | null;
  member: MemberDTO | null;
  role: "user" | "ai";
  content: string;
  depthLevel: number | null;
  depthLabel: string | null;
  createdAt: string;
};

export type SessionDTO = {
  id: string;
  familyId: string;
  date: string;
  topic: string | null;
  topicImageUrl: string | null;
  topicSource: "user" | "ai-random";
  messages: MessageDTO[];
};

export type FamilyDTO = {
  id: string;
  name: string;
  code: string;
  members: MemberDTO[];
};
