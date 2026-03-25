// ---------------------------------------------------------------------------
// AI API — streaming question generation + field enhancement via SSE
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

/**
 * Stream AI-enhanced content for a single survey field via SSE.
 *
 * @param {Object}   data       - { field_name, current_value, title, description, goal, context }
 * @param {Function} onToken    - Called with each text token as it arrives
 * @param {Function} onDone     - Called when enhancement is complete
 * @param {Function} onError    - Called with error message string
 * @param {AbortSignal} [signal] - Optional AbortSignal for cancellation
 */
/**
 * Stream AI analysis of an interview transcript via SSE.
 *
 * @param {string}  interviewId       - Interview session ID
 * @param {Function} onToken          - Called with each text token as it arrives
 * @param {Function} onDone           - Called when analysis is complete
 * @param {Function} onError          - Called with error message string
 * @param {AbortSignal} [signal]      - Optional AbortSignal for cancellation
 */
export async function streamAnalyzeInterview({ interviewId, onToken, onDone, onError, signal }) {
  const token = localStorage.getItem('access_token');

  try {
    const res = await fetch(`${API_URL}${ENDPOINTS.ANALYTICS.ANALYZE_INTERVIEW(interviewId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
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
    onError?.(err.message || 'Failed to analyze interview');
  }
}

/**
 * Synthesize speech from text via OpenAI TTS API.
 *
 * @param {Object}   params
 * @param {string}   params.text          - Text to convert to speech
 * @param {string}   [params.voice]       - Voice name (default "coral")
 * @param {AbortSignal} [params.signal]   - Optional AbortSignal for cancellation
 * @returns {Promise<Response>}           - Fetch Response with audio/mpeg body
 */
export async function synthesizeSpeech({ text, voice = 'coral', signal }) {
  const token = localStorage.getItem('access_token');

  const res = await fetch(`${API_URL}${ENDPOINTS.AI.SYNTHESIZE_SPEECH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ text, voice }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res;
}

/**
 * Stream aggregate AI analysis of all interviews for a survey via SSE.
 *
 * @param {string}  surveyId          - Survey ID
 * @param {Function} onToken          - Called with each text token as it arrives
 * @param {Function} onDone           - Called when analysis is complete
 * @param {Function} onError          - Called with error message string
 * @param {AbortSignal} [signal]      - Optional AbortSignal for cancellation
 */
export async function streamAnalyzeSurvey({ surveyId, onToken, onDone, onError, signal }) {
  const token = localStorage.getItem('access_token');

  try {
    const res = await fetch(`${API_URL}${ENDPOINTS.ANALYTICS.ANALYZE_SURVEY(surveyId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
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
    onError?.(err.message || 'Failed to analyze survey');
  }
}

export async function streamEnhanceField({ data, onToken, onDone, onError, signal }) {
  const token = localStorage.getItem('access_token');

  try {
    const res = await fetch(`${API_URL}${ENDPOINTS.AI.ENHANCE_FIELD}`, {
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
    onError?.(err.message || 'Failed to enhance field');
  }
}
