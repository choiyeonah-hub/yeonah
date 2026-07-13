// res.json()은 응답 본문이 비어있으면(예: 서버리스 함수가 에러로 죽어 빈 응답을 보낼 때)
// "Unexpected end of JSON input"을 던지며 화면을 깨뜨린다. 항상 안전하게 파싱한다.
export async function safeParseJson<T = any>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// 상태코드가 실패이면 서버가 준 에러 메시지(또는 사람이 읽을 수 있는 기본 메시지)로 던진다.
export async function parseJsonOrThrow<T = any>(res: Response): Promise<T> {
  const data = await safeParseJson<any>(res);

  if (!res.ok) {
    const message = data?.error || `요청이 실패했습니다 (HTTP ${res.status}). 서버 설정을 확인해주세요.`;
    throw new Error(message);
  }

  if (data === null) {
    throw new Error("서버 응답이 비어 있습니다. 잠시 후 다시 시도해주세요.");
  }

  return data as T;
}
