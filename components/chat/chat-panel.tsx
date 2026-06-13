"use client";

import {
  RiErrorWarningLine,
  RiRobot2Line,
  RiSendPlane2Fill,
  RiStopCircleLine,
  RiUser3Line,
} from "@remixicon/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { streamChatMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface PersistedChat {
  threadId: string;
  messages: Message[];
}

const STORAGE_KEY = "personal-sensei-chat";

function readStoredChat(): PersistedChat | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === null ? null : (JSON.parse(raw) as PersistedChat);
  } catch {
    // localStorage missing (SSR) or corrupt — treat as no saved chat.
    return null;
  }
}

// Hydration-safe "are we on the client" flag: false during SSR and the first
// client render, true afterwards. Lets us restore messages without a mismatch.
const subscribeNoop = () => () => {
  // No external store to subscribe to; the snapshot never changes.
};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>(
    () => readStoredChat()?.messages.filter((message) => message.content !== "") ?? [],
  );
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isHydrated = useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot);

  const threadIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const threadId = () => {
    threadIdRef.current ??= readStoredChat()?.threadId ?? crypto.randomUUID();
    return threadIdRef.current;
  };

  // Persist the conversation whenever it changes.
  useEffect(() => {
    if (threadIdRef.current === null) {
      return;
    }
    try {
      const payload: PersistedChat = { threadId: threadIdRef.current, messages };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage unavailable or over quota — non-fatal.
    }
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (text === "" || isStreaming) {
      return;
    }

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: text },
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setInput("");
    setError(null);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    void streamChatMessage(text, threadId(), {
      signal: controller.signal,
      onToken: (token) => {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId ? { ...message, content: message.content + token } : message,
          ),
        );
      },
      onError: (message) => {
        setError(message);
        setIsStreaming(false);
      },
      onDone: () => {
        setIsStreaming(false);
      },
    });
  };

  const stop = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  const newChat = () => {
    abortRef.current?.abort();
    threadIdRef.current = null;
    setMessages([]);
    setError(null);
    setIsStreaming(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable — non-fatal.
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el !== null) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isStreaming]);

  // Render the empty state during SSR/hydration so restored messages (client
  // only) don't trigger a hydration mismatch.
  const conversationEmpty = !isHydrated || messages.length === 0;

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <RiRobot2Line className="size-5 text-primary" />
          <div className="flex flex-col">
            <h1 className="text-sm font-semibold tracking-tight">Personal Sensei</h1>
            <p className="text-xs text-muted-foreground">Your personal AI tutor</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={newChat}
          disabled={conversationEmpty && !isStreaming}
        >
          New chat
        </Button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
        {conversationEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <RiRobot2Line className="size-10 opacity-40" />
            <p className="text-sm">Ask me anything — I&apos;m here to help you learn.</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              streaming={isStreaming && message.id === messages[messages.length - 1]?.id}
            />
          ))
        )}

        {error !== null ? (
          <div className="flex items-center gap-2 border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <RiErrorWarningLine className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
        className="border-t border-border p-3"
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            placeholder="Message your sensei…  (Enter to send, Shift+Enter for a new line)"
            rows={1}
            className="max-h-40 min-h-9 flex-1 resize-none"
            disabled={isStreaming}
          />
          {isStreaming ? (
            <Button type="button" size="icon" variant="outline" onClick={stop}>
              <RiStopCircleLine className="size-4" />
              <span className="sr-only">Stop</span>
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={input.trim() === ""}>
              <RiSendPlane2Fill className="size-4" />
              <span className="sr-only">Send</span>
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message, streaming }: { message: Message; streaming: boolean }) {
  const isUser = message.role === "user";
  const showCaret = streaming && message.role === "assistant";

  return (
    <div className={cn("flex items-start gap-2.5", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center border border-border",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        {isUser ? <RiUser3Line className="size-4" /> : <RiRobot2Line className="size-4" />}
      </div>
      <div
        className={cn(
          "max-w-[80%] px-3 py-2 text-sm whitespace-pre-wrap",
          isUser
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-card text-card-foreground",
        )}
      >
        {message.content === "" && showCaret ? (
          <span className="text-muted-foreground">Sensei is thinking…</span>
        ) : (
          message.content
        )}
        {showCaret && message.content !== "" ? (
          <span className="ml-0.5 inline-block w-1.5 animate-pulse">▋</span>
        ) : null}
      </div>
    </div>
  );
}
