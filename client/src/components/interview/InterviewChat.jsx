import { useMemo, useCallback, useRef } from 'react';
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
} from '@assistant-ui/react';
import ChatThread from './ChatThread';
import { useVoiceInterview } from '../../hooks';
import { API_URL, ENDPOINTS } from '../../api/constants';

// Strip partial/complete coverage and abuse tags during streaming so they never flash in the UI
const COVERAGE_RE = /\[COVERED:[\d,\s]*\]?$/;
const ABUSE_RE = /\[ABUSE:\s*true\s*\]?$/i;

/**
 * Creates a ChatModelAdapter that bridges assistant-ui to our SSE backend.
 * Accepts optional onToken/onStreamDone callbacks for voice mode TTS.
 */
function createAdapter(sessionId, onComplete, onTerminated, onToken, onStreamDone) {
  return {
    async *run({ messages, abortSignal }) {
      // Extract the latest user message
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      const text =
        lastUser?.content?.find((p) => p.type === 'text')?.text || '';

      const res = await fetch(
        `${API_URL}${ENDPOINTS.INTERVIEW.MESSAGE(sessionId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
          signal: abortSignal,
        },
      );

      // Session completed — backend returns 400
      if (res.status === 400) {
        onComplete?.();
        return {
          content: [{ type: 'text', text: 'This interview has been completed. Thank you for your time!' }],
        };
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let questionsCovered = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();

          try {
            const parsed = JSON.parse(payload);
            if (parsed.token) {
              fullText += parsed.token;
              onToken?.(parsed.token);
              yield {
                content: [{ type: 'text', text: fullText.replace(COVERAGE_RE, '').replace(ABUSE_RE, '') }],
              };
            }
            if (parsed.done) {
              fullText = parsed.clean_text || fullText;
              questionsCovered = parsed.questions_covered || [];
              onStreamDone?.();
              // Yield clean text (tag stripped) as final content
              yield {
                content: [{ type: 'text', text: fullText }],
              };
            }
            if (parsed.type === 'complete') {
              onComplete?.();
            }
            if (parsed.type === 'terminated') {
              onTerminated?.(parsed.reason);
            }
            if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue; // skip malformed JSON
            throw e;
          }
        }
      }

      // Yield final clean content
      return {
        content: [{ type: 'text', text: fullText }],
        metadata: { custom: { questionsCovered } },
      };
    },
  };
}

/**
 * Chat wrapper component — mounts only during CHATTING phase.
 * Calls useLocalRuntime unconditionally (hooks rules).
 */
export default function InterviewChat({ sessionId, welcomeMessage, onComplete, onTerminated, voiceMode = false }) {
  // Voice hook refs for token forwarding
  const voiceRef = useRef(null);

  const onToken = useCallback((token) => {
    voiceRef.current?.feedToken(token);
  }, []);

  const onStreamDone = useCallback(() => {
    voiceRef.current?.flushSpeech();
  }, []);

  const adapter = useMemo(
    () => createAdapter(
      sessionId, onComplete, onTerminated,
      voiceMode ? onToken : undefined,
      voiceMode ? onStreamDone : undefined,
    ),
    [sessionId, onComplete, onTerminated, voiceMode, onToken, onStreamDone],
  );

  const initialMessages = useMemo(
    () => [
      {
        role: 'assistant',
        content: [{ type: 'text', text: welcomeMessage }],
      },
    ],
    [welcomeMessage],
  );

  const runtime = useLocalRuntime(adapter, { initialMessages });

  // Voice mode: send transcript programmatically via the runtime
  const handleVoiceSend = useCallback((text) => {
    runtime.thread.append({
      role: 'user',
      content: [{ type: 'text', text }],
    });
  }, [runtime]);

  // Voice interview hook
  const voice = useVoiceInterview({
    sessionId,
    onSendMessage: handleVoiceSend,
  });

  // Keep ref in sync so token callbacks can access voice methods
  voiceRef.current = voice;

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ChatThread
        voiceMode={voiceMode}
        voiceState={voice.voiceState}
        onVoiceStart={voice.startVoice}
        onVoiceStop={voice.stopVoice}
        onVoiceFinish={voice.finishRecording}
      />
    </AssistantRuntimeProvider>
  );
}
