import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

const components: Components = {
  p: ({ node: _node, className, ...props }) => (
    <p className={cn("leading-relaxed", className)} {...props} />
  ),
  a: ({ node: _node, className, ...props }) => (
    <a
      className={cn("text-primary underline underline-offset-2", className)}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  strong: ({ node: _node, className, ...props }) => (
    <strong className={cn("font-semibold", className)} {...props} />
  ),
  em: ({ node: _node, className, ...props }) => (
    <em className={cn("italic", className)} {...props} />
  ),
  ul: ({ node: _node, className, ...props }) => (
    <ul className={cn("list-disc space-y-1 pl-5", className)} {...props} />
  ),
  ol: ({ node: _node, className, ...props }) => (
    <ol className={cn("list-decimal space-y-1 pl-5", className)} {...props} />
  ),
  li: ({ node: _node, className, ...props }) => (
    <li className={cn("leading-relaxed", className)} {...props} />
  ),
  h1: ({ node: _node, className, ...props }) => (
    <h1 className={cn("mt-4 mb-2 text-lg font-semibold", className)} {...props} />
  ),
  h2: ({ node: _node, className, ...props }) => (
    <h2 className={cn("mt-4 mb-2 text-base font-semibold", className)} {...props} />
  ),
  h3: ({ node: _node, className, ...props }) => (
    <h3 className={cn("mt-3 mb-2 text-sm font-semibold", className)} {...props} />
  ),
  blockquote: ({ node: _node, className, ...props }) => (
    <blockquote
      className={cn("border-l-2 border-border pl-3 text-muted-foreground", className)}
      {...props}
    />
  ),
  hr: ({ node: _node, className, ...props }) => (
    <hr className={cn("my-3 border-border", className)} {...props} />
  ),
  table: ({ node: _node, className, ...props }) => (
    <div className="overflow-x-auto">
      <table className={cn("border-collapse border-border", className)} {...props} />
    </div>
  ),
  th: ({ node: _node, className, ...props }) => (
    <th
      className={cn("border border-border bg-muted px-2 py-1 text-left font-semibold", className)}
      {...props}
    />
  ),
  td: ({ node: _node, className, ...props }) => (
    <td className={cn("border border-border px-2 py-1", className)} {...props} />
  ),
  pre: ({ node: _node, className, ...props }) => (
    <pre className={cn("overflow-x-auto rounded-md bg-muted p-3 text-xs", className)} {...props} />
  ),
  code: ({ node: _node, className, ...props }) => (
    <code
      className={cn(
        "rounded bg-muted px-1 py-0.5 font-mono text-xs",
        "[pre_&]:bg-transparent [pre_&]:p-0",
        className,
      )}
      {...props}
    />
  ),
};

export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div
      className={cn("space-y-2 text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
