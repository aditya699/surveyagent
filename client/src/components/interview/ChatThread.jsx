import {
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  useMessagePartText,
} from '@assistant-ui/react';
import { SendHorizontal } from 'lucide-react';

function TextPart() {
  const { text } = useMessagePartText();
  return <span className="whitespace-pre-wrap">{text}</span>;
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end mb-4">
      <div className="max-w-[80%] bg-accent text-white rounded-2xl rounded-br-md px-4 py-3 text-sm font-sans leading-relaxed">
        <MessagePrimitive.Content components={{ Text: TextPart }} />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-start mb-4">
      <div className="max-w-[80%] bg-white border border-card-border rounded-2xl rounded-bl-md px-4 py-3 text-sm font-sans text-text-primary leading-relaxed shadow-sm">
        <MessagePrimitive.Content components={{ Text: TextPart }} />
      </div>
    </MessagePrimitive.Root>
  );
}

export default function ChatThread() {
  return (
    <ThreadPrimitive.Root className="flex flex-col h-full">
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto px-4 py-6">
        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            AssistantMessage,
          }}
        />
      </ThreadPrimitive.Viewport>

      <div className="border-t border-card-border bg-white px-4 py-3">
        <ComposerPrimitive.Root className="flex items-end gap-2">
          <ComposerPrimitive.Input
            placeholder="Type your reply..."
            className="flex-1 resize-none rounded-xl border border-card-border bg-background px-4 py-3 text-sm font-sans text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
            autoFocus
          />
          <ComposerPrimitive.Send className="shrink-0 w-10 h-10 rounded-xl bg-accent hover:bg-accent-hover text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <SendHorizontal className="w-4 h-4" />
          </ComposerPrimitive.Send>
        </ComposerPrimitive.Root>
      </div>
    </ThreadPrimitive.Root>
  );
}
