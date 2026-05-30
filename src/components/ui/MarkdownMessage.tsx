import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownMessageProps {
  content: string;
  className?: string;
  compact?: boolean;
}

export function MarkdownMessage({ content, className, compact }: MarkdownMessageProps) {
  return (
    <div className={cn("markdown-prose", compact && "compact", className)}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Headings
        h1: ({ children }) => (
          <h1 className="text-sm font-bold text-silk mt-3 mb-1 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xs font-bold text-silk mt-2.5 mb-1 first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-xs font-semibold text-silk/80 mt-2 mb-0.5 first:mt-0">{children}</h3>
        ),
        // Paragraph
        p: ({ children }) => (
          <p className="text-xs leading-relaxed mb-1.5 last:mb-0">{children}</p>
        ),
        // Bold / italic
        strong: ({ children }) => (
          <strong className="font-semibold text-silk">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-silk/80">{children}</em>
        ),
        // Lists
        ul: ({ children }) => (
          <ul className="list-none pl-3 mb-1.5 space-y-0.5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-none pl-3 mb-1.5 space-y-0.5 counter-reset-list">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-xs leading-relaxed flex gap-1.5 before:content-['•'] before:text-electric/60 before:shrink-0 before:mt-px">
            <span>{children}</span>
          </li>
        ),
        // Code
        code: ({ children, className: cls }) => {
          const isBlock = cls?.includes("language-");
          return isBlock ? (
            <code className="block bg-onyx border border-crystal rounded-lg px-3 py-2 text-[10px] font-mono text-silk/80 overflow-x-auto whitespace-pre my-1.5">
              {children}
            </code>
          ) : (
            <code className="bg-onyx border border-crystal rounded px-1.5 py-0.5 text-[10px] font-mono text-electric/90">
              {children}
            </code>
          );
        },
        pre: ({ children }) => <>{children}</>,
        // Horizontal rule
        hr: () => (
          <hr className="border-0 border-t border-crystal/50 my-2" />
        ),
        // Blockquote
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-electric/40 pl-3 my-1.5 text-silk/60 italic">
            {children}
          </blockquote>
        ),
        // Links
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-electric underline underline-offset-2 hover:text-electric/70 transition-colors"
          >
            {children}
          </a>
        ),
        // Tables
        table: ({ children }) => (
          <div className="overflow-x-auto my-1.5">
            <table className="text-[10px] border-collapse w-full">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-crystal px-2 py-1 text-left font-semibold text-silk/70 bg-graphite-light">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-crystal px-2 py-1 text-silk/60">{children}</td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  );
}
