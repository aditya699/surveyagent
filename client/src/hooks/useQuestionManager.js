import { useState, useCallback } from 'react';

const EMPTY_QUESTION = { text: '', aiInstructions: '' };

export function useQuestionManager(initial = [EMPTY_QUESTION]) {
  const [questions, setQuestions] = useState(initial);

  const addQuestion = useCallback(() => {
    setQuestions((prev) => [...prev, { text: '', aiInstructions: '' }]);
  }, []);

  const updateQuestion = useCallback((index, value) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text: value };
      return updated;
    });
  }, []);

  const updateAiInstructions = useCallback((index, value) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], aiInstructions: value };
      return updated;
    });
  }, []);

  const removeQuestion = useCallback((index) => {
    setQuestions((prev) => {
      if (prev.length === 1) return [{ text: '', aiInstructions: '' }];
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  return { questions, setQuestions, addQuestion, updateQuestion, updateAiInstructions, removeQuestion };
}
