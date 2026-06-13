interface ChatResponse {
  reply: string;
}

interface ErrorResponse {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
}

type StreamEvent =
  | { type: "token"; content: string }
  | { type: "error"; message: string }
  | { type: "done" };

interface StreamHandlers {
  onToken: (content: string) => void;
  onError: (message: string) => void;
  onDone: () => void;
  signal: AbortSignal;
}

/** Send a message to the tutor agent and resolve with its full reply. */
export async function sendChatMessage(message: string, threadId: string): Promise<string> {
  const response = await fetch("/api/v1/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, thread_id: threadId }),
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

/**
 * Stream the tutor agent's reply over SSE, invoking `onToken` for each text
 * delta. Never rejects: failures are reported through `onError`, and an aborted
 * request (via `signal`) resolves silently.
 */
export async function streamChatMessage(
  message: string,
  threadId: string,
  handlers: StreamHandlers,
): Promise<void> {
  const { onToken, onError, onDone, signal } = handlers;

  try {
    const response = await fetch("/api/v1/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, thread_id: threadId }),
      signal,
    });

    if (!response.ok || response.body === null) {
      onError(`Request failed (${String(response.status)})`);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const result = await reader.read();
      if (result.done) {
        break;
      }
      buffer += decoder.decode(result.value, { stream: true });

      // SSE frames are separated by a blank line — \n\n or \r\n\r\n.
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        const dataLine = frame.split("\n").find((line) => line.startsWith("data:"));
        if (dataLine === undefined) {
          continue;
        }
        const payload = dataLine.slice(dataLine.indexOf(":") + 1).trim();
        if (payload === "") {
          continue;
        }

        const event = JSON.parse(payload) as StreamEvent;
        if (event.type === "token") {
          onToken(event.content);
        } else if (event.type === "error") {
          onError(event.message);
          return;
        } else {
          onDone();
          return;
        }
      }
    }
    onDone();
  } catch (error) {
    if (signal.aborted) {
      return;
    }
    onError(error instanceof Error ? error.message : "Streaming failed.");
  }
}
