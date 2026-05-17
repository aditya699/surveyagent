import { API_URL, ENDPOINTS } from './constants';

/**
 * Stream a chatbot reply via Server-Sent Events.
 *
 * @param {Object}      data        - { message, history }
 * @param {Function}    onToken     - Called with each text token as it arrives
 * @param {Function}    onDone      - Called when the stream ends
 * @param {Function}    onError     - Called with an error message string
 * @param {AbortSignal} [signal]    - Optional AbortSignal for cancellation
 */
export async function streamChatMessage({ data, onToken, onDone, onError, onRateLimit, signal }) {
  const token = localStorage.getItem('access_token');

  try {
    const res = await fetch(`${API_URL}${ENDPOINTS.CHATBOT.MESSAGE}`, {
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
      if (res.status === 429) {
        onRateLimit?.(err.detail?.retry_after ?? null);
        return;
      }
      onError?.(typeof err.detail === 'string' ? err.detail : `HTTP ${res.status}`);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();

        if (payload === '[DONE]') {
          onDone?.();
          return;
        }

        try {
          const parsed = JSON.parse(payload);
          if (parsed.token) onToken?.(parsed.token);
          if (parsed.error) onError?.(parsed.error);
        } catch {
          // skip malformed JSON
        }
      }
    }

    onDone?.();
  } catch (err) {
    if (err.name === 'AbortError') return;
    onError?.(err.message || 'Chat request failed');
  }
}
