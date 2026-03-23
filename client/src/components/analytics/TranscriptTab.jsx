import { motion } from 'framer-motion';
import { formatTime } from '../../utils/formatters';

export default function TranscriptTab({ conversation }) {
  if (!conversation?.length) {
    return (
      <div className="card text-center py-12">
        <p className="text-sm text-text-muted font-sans">No messages in this conversation.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="card"
    >
      <div className="space-y-4">
        {conversation.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-accent/10 text-text-primary rounded-br-md'
                  : 'bg-background text-text-primary rounded-bl-md'
              }`}
            >
              <p className="text-sm font-sans leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </p>
              {msg.timestamp && (
                <p className="text-xs text-text-muted/60 mt-1 font-sans">
                  {formatTime(msg.timestamp)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
