import { useCallback } from 'react';
import {
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  useMessagePartText,
  useComposerRuntime,
} from '@assistant-ui/react';
import { motion } from 'framer-motion';
import { SendHorizontal, Bot, ArrowDown, Mic } from 'lucide-react';
import { useSpeechToText } from '../../hooks';

const messageVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

function TextPart() {
  const { text } = useMessagePartText();
  return <span className="whitespace-pre-wrap">{text}</span>;
}

function TypingDots() {
  return (
    <span className="typing-dots items-center gap-1 pt-2">
      <span className="w-1.5 h-1.5 rounded-full bg-text-muted/40 animate-typing-dot typing-dot-1" />
      <span className="w-1.5 h-1.5 rounded-full bg-text-muted/40 animate-typing-dot typing-dot-2" />
      <span className="w-1.5 h-1.5 rounded-full bg-text-muted/40 animate-typing-dot typing-dot-3" />
    </span>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end mb-3">
      <motion.div
        variants={messageVariants}
        initial="hidden"
        animate="visible"
        className="max-w-[70%]"
      >
        <div className="bg-gradient-to-br from-accent to-accent-hover text-white rounded-2xl rounded-br-md px-4 py-3 text-sm font-sans leading-relaxed shadow-md">
          <MessagePrimitive.Content components={{ Text: TextPart }} />
        </div>
      </motion.div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-start mb-3 items-end gap-2.5">
      {/* Avatar */}
      <div className="shrink-0 w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center mb-0.5">
        <Bot className="w-3.5 h-3.5 text-accent" />
      </div>

      <motion.div
        variants={messageVariants}
        initial="hidden"
        animate="visible"
        className="max-w-[70%]"
      >
        <div className="bg-card-assistant border border-card-border rounded-2xl rounded-bl-md px-4 py-3 text-sm font-sans text-text-primary leading-relaxed shadow-sm">
          <MessagePrimitive.Content components={{ Text: TextPart }} />
          <TypingDots />
        </div>
      </motion.div>
    </MessagePrimitive.Root>
  );
}

function DictateButton() {
  const composerRuntime = useComposerRuntime();

  const onTranscript = useCallback(
    (text) => {
      const prev = composerRuntime.getState().text;
      composerRuntime.setText(prev ? prev + ' ' + text : text);
    },
    [composerRuntime],
  );

  const { isListening, isSupported, toggleListening } = useSpeechToText({ onTranscript });

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 ${
        isListening
          ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
          : 'bg-transparent hover:bg-accent/10 text-text-muted hover:text-accent'
      }`}
      title={isListening ? 'Stop dictating' : 'Dictate your reply'}
    >
      <Mic className="w-4 h-4" />
    </button>
  );
}

export default function ChatThread() {
  return (
    <ThreadPrimitive.Root className="flex flex-col h-full relative">
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full px-4 py-6">
          <ThreadPrimitive.Messages
            components={{
              UserMessage,
              AssistantMessage,
            }}
          />
        </div>
      </ThreadPrimitive.Viewport>

      {/* Scroll-to-bottom button */}
      <ThreadPrimitive.ScrollToBottom className="absolute bottom-20 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white border border-card-border shadow-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:shadow-xl transition-all z-10">
        <ArrowDown className="w-4 h-4" />
      </ThreadPrimitive.ScrollToBottom>

      {/* Composer */}
      <div className="shrink-0 bg-background px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <ComposerPrimitive.Root className="flex items-end gap-2 bg-white rounded-2xl border border-card-border shadow-lg px-3 py-2">
            <ComposerPrimitive.Input
              placeholder="Type your reply..."
              className="flex-1 resize-none bg-transparent px-2 py-2 text-sm font-sans text-text-primary placeholder:text-text-muted/50 focus:outline-none"
              autoFocus
            />
            <DictateButton />
            <ComposerPrimitive.Send className="shrink-0 w-9 h-9 rounded-xl bg-accent hover:bg-accent-hover text-white flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-md active:scale-95">
              <SendHorizontal className="w-4 h-4" />
            </ComposerPrimitive.Send>
          </ComposerPrimitive.Root>
        </div>
      </div>
    </ThreadPrimitive.Root>
  );
}
