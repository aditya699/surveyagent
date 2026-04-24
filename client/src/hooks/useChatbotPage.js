import { useEffect } from 'react';
import { useChatbotPageContext } from '../context/ChatbotPageContext';

/**
 * Register a plain-text page summary for the floating chatbot.
 * Pass any string — it gets prepended to the user's message so the AI
 * knows what data is currently on screen.
 * Automatically cleared when the component unmounts (page navigation).
 *
 * Usage:
 *   useChatbotPage(`Viewing survey '${survey.title}' — ${q} questions, status: ${survey.status}`);
 */
export function useChatbotPage(summary) {
  const { setPageContext } = useChatbotPageContext();

  useEffect(() => {
    if (summary) setPageContext(summary);
    return () => setPageContext('');
  }, [summary]); // eslint-disable-line react-hooks/exhaustive-deps
}
