import { useState, useRef, useCallback } from 'react';
import { streamGenerateQuestions } from '../api/ai';

export function useAiGeneration({ title, description, goal, context, setQuestions }) {
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiNumQuestions, setAiNumQuestions] = useState(5);
  const [aiAdditionalInfo, setAiAdditionalInfo] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const abortRef = useRef(null);

  const handleAiGenerate = useCallback(async () => {
    setAiError('');
    setAiGenerating(true);

    const controller = new AbortController();
    abortRef.current = controller;

    await streamGenerateQuestions({
      data: {
        num_questions: aiNumQuestions,
        title: title.trim(),
        description: description.trim(),
        goal: goal.trim(),
        context: context.trim(),
        additional_info: aiAdditionalInfo.trim(),
      },
      onQuestion: (question) => {
        setQuestions((prev) => {
          const nonEmpty = prev.filter((q) => q.text.trim() !== '');
          return [...nonEmpty, { text: question, aiInstructions: '' }];
        });
      },
      onDone: () => {
        setAiGenerating(false);
        setShowAiPanel(false);
        setAiAdditionalInfo('');
        abortRef.current = null;
      },
      onError: (errMsg) => {
        setAiError(errMsg || 'Failed to generate questions. Please try again.');
        setAiGenerating(false);
        abortRef.current = null;
      },
      signal: controller.signal,
    });
  }, [aiNumQuestions, aiAdditionalInfo, title, description, goal, context, setQuestions]);

  const handleAiCancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setAiGenerating(false);
    setShowAiPanel(false);
    setAiError('');
  }, []);

  const toggleAiPanel = useCallback(() => {
    setShowAiPanel((prev) => !prev);
  }, []);

  return {
    showAiPanel,
    aiNumQuestions,
    setAiNumQuestions,
    aiAdditionalInfo,
    setAiAdditionalInfo,
    aiGenerating,
    aiError,
    handleAiGenerate,
    handleAiCancel,
    toggleAiPanel,
  };
}
