import OpenAI from "openai";
import { AGE_TIER_INFO, AgeTier, clampDepth, DEPTH_LADDER, DepthLevel } from "./depth";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY가 설정되어 있지 않습니다. .env 파일에 OPENAI_API_KEY를 추가해주세요."
    );
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

export type ConversationTurn = { speaker: string; role: "user" | "ai"; content: string };

function ladderText() {
  return (Object.entries(DEPTH_LADDER) as [string, (typeof DEPTH_LADDER)[DepthLevel]][])
    .map(([level, info]) => `${level}단계 (${info.label}): ${info.description}`)
    .join("\n");
}

export type NextQuestionResult = {
  question: string;
  depthLevel: DepthLevel;
  depthLabel: string;
};

/**
 * 오늘 있었던 일에 대한 가족의 이야기를 바탕으로, 하브루타 방식으로
 * 꼬리에 꼬리를 무는 다음 질문 하나를 생성한다. 아이의 나이대에 맞는
 * 깊이 범위 안에서, 이전 대화보다 한 단계씩 깊어지도록 유도한다.
 */
export async function generateFollowUpQuestion(params: {
  ageTier: AgeTier;
  nickname: string;
  topic: string | null;
  history: ConversationTurn[];
  lastDepth: DepthLevel | null;
}): Promise<NextQuestionResult> {
  const { ageTier, nickname, topic, history, lastDepth } = params;
  const tierInfo = AGE_TIER_INFO[ageTier];

  const nextTargetDepth = clampDepth((lastDepth ?? tierInfo.minDepth - 1) + 1);
  const boundedTarget = clampDepth(
    Math.min(tierInfo.maxDepth, Math.max(tierInfo.minDepth, nextTargetDepth))
  );

  const historyText = history
    .map((t) => `${t.role === "ai" ? "[질문]" : `[${t.speaker}]`} ${t.content}`)
    .join("\n");

  const system = `너는 유대인 하브루타(Havruta) 교육 방식으로 가족의 대화를 이끄는 진행자야.
하브루타는 정답을 알려주는 게 아니라, 짝과 눈을 마주치고 대화하며 스스로 생각을 넓히도록 "좋은 질문"을 던지는 방식이야.
아래 질문 층위(깊이) 사다리를 참고해서, 지금까지의 대화 흐름에 자연스럽게 이어지는 "꼬리질문" 딱 하나만 만들어줘.

[질문 층위 사다리]
${ladderText()}

[대화 상대 정보]
- 닉네임: ${nickname}
- 나이대: ${tierInfo.label}
- 이 나이대의 적정 질문 층위 범위: ${tierInfo.minDepth}~${tierInfo.maxDepth}단계
- 이번 질문의 목표 층위: ${boundedTarget}단계 (${DEPTH_LADDER[boundedTarget].label})

[규칙]
- 반드시 한국어 존댓말로, 짧고 다정하게 한 문장으로 질문할 것.
- 직전 답변의 구체적인 내용(사람, 사물, 감정 등)을 언급하며 자연스럽게 이어질 것.
- 정답이 정해진 질문이나 예/아니오로 끝나는 질문은 피하고, 생각을 이끌어내는 열린 질문으로 만들 것.
- 목표 층위를 벗어나지 말 것 (너무 갑자기 어려워지거나 너무 유치해지지 않게).
- 반드시 아래 JSON 형식으로만 응답할 것: {"question": string, "depthLevel": number(1~5), "depthLabel": string}`;

  const userContent = `오늘의 주제: ${topic ?? "(아직 없음, 지금 나온 이야기가 주제)"}\n\n지금까지의 대화:\n${
    historyText || "(아직 대화 없음, 방금 가족이 오늘 있었던 일을 처음 이야기함)"
  }`;

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.9,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { question?: string; depthLevel?: number; depthLabel?: string };

  const depthLevel = clampDepth(parsed.depthLevel ?? boundedTarget);
  return {
    question: parsed.question?.trim() || "오늘 그 일에서 가장 기억에 남는 순간은 언제였나요?",
    depthLevel,
    depthLabel: parsed.depthLabel || DEPTH_LADDER[depthLevel].label,
  };
}

export type RandomTopicResult = {
  theme: string;
  imagePrompt: string;
  openingQuestion: string;
  depthLevel: DepthLevel;
  depthLabel: string;
};

/**
 * 오늘 딱히 할 이야기가 없을 때, 가족이 함께 볼 무작위 이미지 주제와
 * 그 이미지로 시작하는 첫 하브루타 질문을 생성한다.
 */
export async function generateRandomTopic(params: { ageTier: AgeTier }): Promise<RandomTopicResult> {
  const { ageTier } = params;
  const tierInfo = AGE_TIER_INFO[ageTier];

  const system = `너는 가족 하브루타 대화를 위한 "오늘의 그림 주제"를 무작위로 만드는 역할이야.
아이 나이대는 ${tierInfo.label}이고, 상상력을 자극하되 무섭거나 폭력적이지 않은, 따뜻하고 흥미로운 장면을 골라줘.
(예: 우주를 여행하는 작은 배, 숲 속의 오래된 도서관, 구름 위 동물 마을 등 - 매번 다른 새로운 소재로)

반드시 아래 JSON 형식으로만 응답할 것:
{
  "theme": "장면을 한 문장으로 요약한 한국어 제목",
  "imagePrompt": "이미지 생성용 영어 프롬프트 (귀엽고 따뜻한 동화 삽화 스타일)",
  "openingQuestion": "이 그림을 보고 가족이 눈을 마주치며 이야기 나눌 수 있는 첫 질문 (한국어, ${tierInfo.minDepth}단계 수준의 쉬운 관찰/상상 질문)",
  "depthLevel": ${tierInfo.minDepth},
  "depthLabel": "질문 층위 이름"
}`;

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 1.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: "오늘의 무작위 그림 주제를 하나 만들어줘." },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<RandomTopicResult>;

  const depthLevel = clampDepth(parsed.depthLevel ?? tierInfo.minDepth);
  return {
    theme: parsed.theme || "구름 위 작은 마을",
    imagePrompt:
      parsed.imagePrompt ||
      "a cozy storybook illustration of a tiny village floating on clouds, warm colors, whimsical",
    openingQuestion: parsed.openingQuestion || "이 그림 속에서 가장 먼저 눈에 띄는 것은 무엇인가요?",
    depthLevel,
    depthLabel: parsed.depthLabel || DEPTH_LADDER[depthLevel].label,
  };
}

/** imagePrompt로 이미지를 생성해 base64 PNG 데이터를 반환한다. */
export async function generateTopicImage(imagePrompt: string): Promise<string> {
  const openai = getOpenAI();
  const result = await openai.images.generate({
    model: IMAGE_MODEL,
    prompt: imagePrompt,
    size: "1024x1024",
    n: 1,
  });
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("이미지 생성 결과가 비어 있습니다.");
  return b64;
}
