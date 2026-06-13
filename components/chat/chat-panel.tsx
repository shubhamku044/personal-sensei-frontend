"use client";

import {
  RiErrorWarningLine,
  RiRobot2Line,
  RiSendPlane2Fill,
  RiStopCircleLine,
  RiUser3Line,
} from "@remixicon/react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { streamChatMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const idRef = useRef(0);
  const threadIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const nextId = () => {
    idRef.current += 1;
    return String(idRef.current);
  };

  const threadId = () => {
    threadIdRef.current ??= crypto.randomUUID();
    return threadIdRef.current;
  };

  const send = () => {
    const text = input.trim();
    if (text === "" || isStreaming) {
      return;
    }

    const assistantId = nextId();
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: "user", content: text },
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
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el !== null) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isStreaming]);

  const isEmpty = messages.length === 0;

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
        <Button variant="ghost" size="sm" onClick={newChat} disabled={isEmpty && !isStreaming}>
          New chat
        </Button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
        {isEmpty ? (
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
