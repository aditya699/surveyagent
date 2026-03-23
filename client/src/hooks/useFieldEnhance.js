import { useState, useRef, useCallback } from 'react';
import { streamEnhanceField } from '../api/ai';

const CONTEXT_HIERARCHY = {
  title: [],
  description: ['title'],
  goal: ['title', 'description'],
  context: ['title', 'description', 'goal'],
  welcome_message: ['title', 'description', 'goal', 'context'],
};

export function useFieldEnhance({
  title, description, goal, context, welcomeMessage,
  setTitle, setDescription, setGoal, setContext, setWelcomeMessage,
}) {
  const [enhancingField, setEnhancingField] = useState(null);
  const [enhanceError, setEnhanceError] = useState('');
  const abortRef = useRef(null);

  const setterMap = {
    title: setTitle,
    description: setDescription,
    goal: setGoal,
    context: setContext,
    welcome_message: setWelcomeMessage,
  };

  const valueMap = { title, description, goal, context, welcome_message: welcomeMessage };

  const enhanceField = useCallback(async (fieldName) => {
    setEnhanceError('');
    setEnhancingField(fieldName);

    const controller = new AbortController();
    abortRef.current = controller;

    const setter = setterMap[fieldName];
    const currentValue = valueMap[fieldName] || '';

    // Build context — only fields above the target in the hierarchy
    const contextData = {};
    for (const key of CONTEXT_HIERARCHY[fieldName]) {
      contextData[key] = (valueMap[key] || '').trim();
    }

    // Clear field to prepare for streaming
    setter('');

    await streamEnhanceField({
      data: {
        field_name: fieldName,
        current_value: currentValue.trim(),
        ...contextData,
      },
      onToken: (token) => {
        setter((prev) => prev + token);
      },
      onDone: () => {
        setEnhancingField(null);
        abortRef.current = null;
      },
      onError: (errMsg) => {
        setEnhanceError(errMsg || 'Failed to enhance field');
        setEnhancingField(null);
        abortRef.current = null;
      },
      signal: controller.signal,
    });
  }, [title, description, goal, context, welcomeMessage,
      setTitle, setDescription, setGoal, setContext, setWelcomeMessage]);

  const cancelEnhance = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setEnhancingField(null);
    setEnhanceError('');
  }, []);

  return { enhancingField, enhanceError, enhanceField, cancelEnhance };
}
