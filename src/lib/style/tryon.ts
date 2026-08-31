// 가상 피팅. FASHN.ai의 비동기 API를 쓴다.
//   POST https://api.fashn.ai/v1/run   { model_name, inputs: { model_image, garment_image, category } }
//     → { id, error }
//   GET  https://api.fashn.ai/v1/status/{id}
//     → { id, status: "starting|in_queue|processing|completed|failed", output: string[], error }
// 이미지 생성은 건당 과금이라, 호출 전에 반드시 사용자가 버튼을 눌러 의사를 밝히게 한다.

const HOST = process.env.FASHN_API_HOST ?? "https://api.fashn.ai";
const MODEL = process.env.FASHN_MODEL ?? "tryon-v1.6";

export type TryOnCategory = "auto" | "tops" | "bottoms" | "one-pieces";

export function isTryOnEnabled(): boolean {
  return Boolean(process.env.FASHN_API_KEY);
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.FASHN_API_KEY}`,
    "Content-Type": "application/json",
  };
}

type RunResponse = { id?: string; error?: unknown };
type StatusResponse = {
  id?: string;
  status?: "starting" | "in_queue" | "processing" | "completed" | "failed";
  output?: string[];
  error?: unknown;
};

function errorText(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return JSON.stringify(error).slice(0, 200);
}

export async function runTryOn(params: {
  /** 사람 전신 사진 (URL 또는 data URL) */
  modelImage: string;
  /** 입어볼 옷 이미지 (URL 또는 data URL) */
  garmentImage: string;
  category?: TryOnCategory;
  /** 폴링 최대 시간(ms) */
  timeoutMs?: number;
}): Promise<{ imageUrls: string[]; elapsedMs: number }> {
  if (!isTryOnEnabled()) throw new Error("FASHN_API_KEY가 설정되어 있지 않습니다.");

  const started = Date.now();
  const timeoutMs = params.timeoutMs ?? 55_000;

  const runResponse = await fetch(`${HOST}/v1/run`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model_name: MODEL,
      inputs: {
        model_image: params.modelImage,
        garment_image: params.garmentImage,
        category: params.category ?? "auto",
      },
    }),
    cache: "no-store",
  });

  const runText = await runResponse.text();
  if (!runResponse.ok) {
    throw new Error(`가상 피팅 요청 실패 (${runResponse.status}): ${runText.slice(0, 200)}`);
  }

  let run: RunResponse;
  try {
    run = JSON.parse(runText);
  } catch {
    throw new Error("가상 피팅 응답을 해석하지 못했습니다.");
  }
  if (!run.id) throw new Error(`가상 피팅 요청이 거절됐습니다: ${errorText(run.error) || "id 없음"}`);

  // 상태를 폴링한다. 보통 10~30초 걸린다.
  let delay = 2000;
  while (Date.now() - started < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(delay + 1000, 5000);

    const statusResponse = await fetch(`${HOST}/v1/status/${run.id}`, {
      headers: headers(),
      cache: "no-store",
    });
    if (!statusResponse.ok) continue;

    const status = (await statusResponse.json()) as StatusResponse;
    if (status.status === "completed" && status.output && status.output.length > 0) {
      return { imageUrls: status.output, elapsedMs: Date.now() - started };
    }
    if (status.status === "failed") {
      throw new Error(`가상 피팅에 실패했습니다: ${errorText(status.error) || "원인 미상"}`);
    }
  }

  throw new Error("가상 피팅이 제한 시간 안에 끝나지 않았습니다. 잠시 후 다시 시도해 주세요.");
}
