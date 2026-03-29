import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
} from '@assistant-ui/react';
import ChatThread from './ChatThread';
import { API_URL, ENDPOINTS } from '../../api/constants';

/**
 * Creates a ChatModelAdapter for the question-test SSE endpoint.
 * Sends full conversation history each turn (stateless backend).
 */
function createQuestionTestAdapter({
  questionText,
  aiInstructions,
  personalityTone,
  surveyTitle,
  surveyGoal,
  surveyContext,
  llmProvider,
  llmModel,
}) {
  return {
    async *run({ messages, abortSignal }) {
      // Build conversation history from all messages (skip the synthetic first assistant message)
      const conversation = messages
        .filter((m, i) => !(i === 0 && m.role === 'assistant'))
        .map((m) => ({
          role: m.role,
          content: m.content?.find((p) => p.type === 'text')?.text || '',
        }));

      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}${ENDPOINTS.INTERVIEW.TEST_QUESTION}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          question_text: questionText,
          ai_instructions: aiInstructions || null,
          personality_tone: personalityTone || 'friendly',
          survey_title: surveyTitle || null,
          survey_goal: surveyGoal || null,
          survey_context: surveyContext || null,
          conversation,
          llm_provider: llmProvider || null,
          llm_model: llmModel || null,
        }),
        signal: abortSignal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

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
              yield { content: [{ type: 'text', text: fullText }] };
            }
            if (parsed.done) {
              fullText = parsed.clean_text || fullText;
              yield { content: [{ type: 'text', text: fullText }] };
            }
            if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }

      return { content: [{ type: 'text', text: fullText }] };
    },
  };
}

/**
 * Slide-over panel for testing a single question with an inline chatbot.
 */
export default function QuestionTestPanel({
  question,
  questionIndex,
  surveyTitle,
  surveyGoal,
  surveyContext,
  personalityTone,
  llmProvider,
  llmModel,
  onClose,
}) {
  const adapter = useMemo(
    () =>
      createQuestionTestAdapter({
        questionText: question.text,
        aiInstructions: question.aiInstructions,
        personalityTone,
        surveyTitle,
        surveyGoal,
        surveyContext,
        llmProvider,
        llmModel,
      }),
    [question.text, question.aiInstructions, personalityTone, surveyTitle, surveyGoal, surveyContext, llmProvider, llmModel],
  );

  const initialMessages = useMemo(
    () => [
      {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: `Let's test this question. I'll interview you as if this were a real survey.\n\n${question.text}`,
          },
        ],
      },
    ],
    [question.text],
  );

  const runtime = useLocalRuntime(adapter, { initialMessages });

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed inset-y-0 right-0 w-[420px] max-w-full bg-background z-50 flex flex-col shadow-2xl border-l border-card-border"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-card-border bg-white">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-sans text-text-muted">Testing Question {questionIndex + 1}</p>
            <p className="text-sm font-sans text-text-primary truncate">{question.text}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat */}
        <div className="flex-1 min-h-0">
          <AssistantRuntimeProvider runtime={runtime}>
            <ChatThread />
          </AssistantRuntimeProvider>
        </div>
      </motion.div>
    </>
  );
}
