const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:8000";

interface ChatResponse {
  reply: string;
}

interface ErrorResponse {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
}

/** Send a message to the tutor agent and resolve with its reply. */
export async function sendChatMessage(message: string): Promise<string> {
  const response = await fetch(`${API_URL}/api/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    let detail = `Request failed (${String(response.status)})`;
    try {
      const body = (await response.json()) as ErrorResponse;
      if (body.message !== undefined && body.message !== "") {
        detail = body.message;
      }
    } catch {
      // Non-JSON error body; keep the generic message.
    }
    throw new Error(detail);
  }

  const data = (await response.json()) as ChatResponse;
  return data.reply;
}
