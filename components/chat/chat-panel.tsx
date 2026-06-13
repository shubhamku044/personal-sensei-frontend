"use client";

import { RiErrorWarningLine, RiRobot2Line, RiSendPlane2Fill, RiUser3Line } from "@remixicon/react";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendChatMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const mutation = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: (reply) => {
      idRef.current += 1;
      setMessages((prev) => [
        ...prev,
        { id: String(idRef.current), role: "assistant", content: reply },
      ]);
    },
  });

  const send = () => {
    const text = input.trim();
    if (text === "" || mutation.isPending) {
      return;
    }
    idRef.current += 1;
    setMessages((prev) => [...prev, { id: String(idRef.current), role: "user", content: text }]);
    setInput("");
    mutation.mutate(text);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el !== null) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, mutation.isPending]);

  const isEmpty = messages.length === 0;

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <RiRobot2Line className="size-5 text-primary" />
        <div className="flex flex-col">
          <h1 className="text-sm font-semibold tracking-tight">Personal Sensei</h1>
          <p className="text-xs text-muted-foreground">Your personal AI tutor</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <RiRobot2Line className="size-10 opacity-40" />
            <p className="text-sm">Ask me anything — I&apos;m here to help you learn.</p>
          </div>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}

        {mutation.isPending ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RiRobot2Line className="size-4" />
            <span className="animate-pulse">Sensei is thinking…</span>
          </div>
        ) : null}

        {mutation.isError ? (
          <div className="flex items-center gap-2 border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <RiErrorWarningLine className="size-4 shrink-0" />
            <span>{mutation.error.message}</span>
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
            disabled={mutation.isPending}
          />
          <Button type="submit" size="icon" disabled={input.trim() === "" || mutation.isPending}>
            <RiSendPlane2Fill className="size-4" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

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
        {message.content}
      </div>
    </div>
  );
}
