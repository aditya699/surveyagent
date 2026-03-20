// ---------------------------------------------------------------------------
// AI API — streaming question generation via SSE
// Uses fetch (not Axios) because Axios doesn't support readable streams.
// ---------------------------------------------------------------------------

import { API_URL, ENDPOINTS } from './constants';

/**
 * Stream AI-generated questions via Server-Sent Events.
 *
 * @param {Object}   data              - Request payload (num_questions, title, etc.)
 * @param {Function} onQuestion        - Called with each question string as it arrives
 * @param {Function} onDone            - Called when generation is complete
 * @param {Function} onError           - Called with error message string
 * @param {AbortSignal} [signal]       - Optional AbortSignal for cancellation
 */
export async function streamGenerateQuestions({ data, onQuestion, onDone, onError, signal }) {
  const token = localStorage.getItem('access_token');

  try {
    const res = await fetch(`${API_URL}${ENDPOINTS.AI.GENERATE_QUESTIONS}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
      signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Request failed' }));
      onError?.(err.detail || `HTTP ${res.status}`);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from the buffer
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();

        if (payload === '[DONE]') {
          onDone?.();
          return;
        }

        try {
          const parsed = JSON.parse(payload);
          if (parsed.question) {
            onQuestion?.(parsed.question);
          }
          if (parsed.error) {
            onError?.(parsed.error);
          }
        } catch {
          // skip malformed JSON
        }
      }
    }

    // If we exit the loop without [DONE], still notify
    onDone?.();
  } catch (err) {
    if (err.name === 'AbortError') return;
    onError?.(err.message || 'Failed to generate questions');
  }
}
