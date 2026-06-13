"use client";

import {
  RiErrorWarningLine,
  RiRobot2Line,
  RiSendPlane2Fill,
  RiStopCircleLine,
  RiUser3Line,
} from "@remixicon/react";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Markdown } from "@/components/chat/markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSmoothText } from "@/hooks/use-smooth-text";
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
  const isHydrated = useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot);

  const threadIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const threadId = () => {
    threadIdRef.current ??= readStoredChat()?.threadId ?? crypto.randomUUID();
    return threadIdRef.current;
  };

  // The send lifecycle is a React Query mutation: it owns pending/error state
  // while the streamed deltas are appended to the assistant message.
  const chat = useMutation({
    mutationFn: ({ message, assistantId }: { message: string; assistantId: string }) =>
      new Promise<void>((resolve, reject) => {
        const controller = new AbortController();
        abortRef.current = controller;
        controller.signal.addEventListener("abort", () => {
          resolve();
        });
        void streamChatMessage(message, threadId(), {
          signal: controller.signal,
          onToken: (token) => {
            setMessages((prev) =>
              prev.map((message_) =>
                message_.id === assistantId
                  ? { ...message_, content: message_.content + token }
                  : message_,
              ),
            );
          },
          onError: (errorMessage) => {
            reject(new Error(errorMessage));
          },
          onDone: resolve,
        });
      }),
  });

  const isStreaming = chat.isPending;

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
    chat.mutate({ message: text, assistantId });
  };

  const stop = () => {
    abortRef.current?.abort();
  };

  const newChat = () => {
    abortRef.current?.abort();
    threadIdRef.current = null;
    setMessages([]);
    chat.reset();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable — non-fatal.
    }
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

  useEffect(() => {
    const el = scrollRef.current;
    if (el !== null) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isStreaming]);

  // Render the empty state during SSR/hydration so restored messages (client
  // only) don't trigger a hydration mismatch.
  const conversationEmpty = !isHydrated || messages.length === 0;
  const lastMessageId = messages[messages.length - 1]?.id;

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
              streaming={isStreaming && message.id === lastMessageId}
            />
          ))
        )}

        {chat.isError ? (
          <div className="flex items-center gap-2 border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <RiErrorWarningLine className="size-4 shrink-0" />
            <span>{chat.error.message}</span>
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
  const smoothed = useSmoothText(message.content, streaming && !isUser);
  const text = isUser ? message.content : smoothed;
  const showThinking = !isUser && streaming && text === "";

  const renderBody = () => {
    if (isUser) {
      return text;
    }
    if (showThinking) {
      return <span className="text-muted-foreground">Sensei is thinking…</span>;
    }
    return <Markdown content={text} />;
  };

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
          "max-w-[80%] px-3 py-2 text-sm",
          isUser
            ? "bg-primary whitespace-pre-wrap text-primary-foreground"
            : "border border-border bg-card text-card-foreground",
        )}
      >
        {renderBody()}
      </div>
    </div>
  );
}
