import { useState, useCallback } from 'react';

export function useQuestionManager(initial = ['']) {
  const [questions, setQuestions] = useState(initial);

  const addQuestion = useCallback(() => {
    setQuestions((prev) => [...prev, '']);
  }, []);

  const updateQuestion = useCallback((index, value) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }, []);

  const removeQuestion = useCallback((index) => {
    setQuestions((prev) => {
      if (prev.length === 1) return [''];
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  return { questions, setQuestions, addQuestion, updateQuestion, removeQuestion };
}
