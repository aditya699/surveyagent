import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const components = {
  // Paragraphs
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed text-sm">{children}</p>
  ),

  // Bold / italic
  strong: ({ children }) => (
    <strong className="font-semibold text-inherit">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-inherit">{children}</em>
  ),

  // Code block wrapper
  pre: ({ children }) => (
    <pre className="bg-dark/8 border border-card-border rounded-lg px-3 py-2.5 my-2 overflow-x-auto text-xs leading-relaxed">
      {children}
    </pre>
  ),

  // Inline code vs block code
  code: ({ className, children }) => {
    const isBlock = !!className;
    if (isBlock) {
      return (
        <code className="font-mono text-text-primary whitespace-pre">
          {children}
        </code>
      );
    }
    return (
      <code className="bg-accent/12 text-accent px-1.5 py-0.5 rounded text-xs font-mono">
        {children}
      </code>
    );
  },

  // Lists
  ul: ({ children }) => (
    <ul className="list-disc list-outside pl-4 space-y-1 mb-2 text-sm">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside pl-4 space-y-1 mb-2 text-sm">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed">{children}</li>
  ),

  // Headings — keep compact inside a chat bubble
  h1: ({ children }) => <p className="font-semibold text-base mb-1 mt-2 first:mt-0">{children}</p>,
  h2: ({ children }) => <p className="font-semibold text-sm mb-1 mt-2 first:mt-0">{children}</p>,
  h3: ({ children }) => <p className="font-medium text-sm mb-1 mt-1.5 first:mt-0">{children}</p>,

  // Links
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent hover:underline underline-offset-2 break-all"
    >
      {children}
    </a>
  ),

  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-accent/40 pl-3 my-2 text-text-muted italic text-sm">
      {children}
    </blockquote>
  ),

  // Tables (remark-gfm)
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="text-xs w-full border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-card-border">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-card-border/50 last:border-0">{children}</tr>,
  th: ({ children }) => (
    <th className="text-left px-2 py-1 font-semibold text-text-primary">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-2 py-1 text-text-muted">{children}</td>
  ),

  // Horizontal rule
  hr: () => <hr className="border-card-border my-3" />,
};

export default function ChatMarkdown({ content }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
