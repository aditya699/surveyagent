// ---------------------------------------------------------------------------
// Interview API — session management + SSE streaming
// Uses Axios for JSON endpoints, fetch for SSE streaming.
// ---------------------------------------------------------------------------

import api from './client';
import { API_URL, ENDPOINTS } from './constants';

/** Get survey info for the respondent landing page (public). */
export function getInterviewInfo(token) {
  return api.get(ENDPOINTS.INTERVIEW.INFO(token));
}

/** Start a new interview session for a published survey (public). */
export function startInterview(token, respondent = null, language = 'English') {
  return api.post(ENDPOINTS.INTERVIEW.START(token), { respondent, language });
}

/** Start an admin test interview session (requires Bearer auth). */
export function startTestInterview(surveyId) {
  return api.post(ENDPOINTS.INTERVIEW.TEST(surveyId), { respondent: null });
}

/** Transcribe audio via Whisper (public, session-gated). */
export async function transcribeAudio(sessionId, audioBlob) {
  // Use correct extension based on the blob's MIME type
  const ext = audioBlob.type?.includes('mp4') ? 'mp4' : 'webm';
  const form = new FormData();
  form.append('audio', audioBlob, `recording.${ext}`);
  const res = await fetch(`${API_URL}${ENDPOINTS.INTERVIEW.TRANSCRIBE(sessionId)}`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Transcription failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Synthesize speech for an active interview session (public, session-gated). */
export async function synthesizeInterviewSpeech(sessionId, text, voice = 'coral') {
  const res = await fetch(`${API_URL}${ENDPOINTS.INTERVIEW.SYNTHESIZE(sessionId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Speech synthesis failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res;
}

/** Request an ephemeral Realtime API token for a WebRTC session (public, session-gated). */
export async function getRealtimeToken(sessionId) {
  const res = await fetch(`${API_URL}${ENDPOINTS.INTERVIEW.REALTIME_TOKEN(sessionId)}`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to get realtime token' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Save a single conversation turn from a Realtime API session (public, session-gated). */
export async function saveRealtimeTurn(sessionId, { role, content, questions_covered, abuse_detected }) {
  const res = await fetch(`${API_URL}${ENDPOINTS.INTERVIEW.REALTIME_TURN(sessionId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, content, questions_covered, abuse_detected }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to save turn' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Stream an interview message via Server-Sent Events.
 *
 * @param {string}      sessionId  - Interview session ID
 * @param {string}      message    - Respondent message text
 * @param {Function}    onToken    - Called with each text delta
 * @param {Function}    onDone     - Called with { clean_text, questions_covered }
 * @param {Function}    onError    - Called with error message string
 * @param {AbortSignal} [signal]   - Optional AbortSignal for cancellation
 * @returns {Promise<Response>}    - The raw fetch Response (for status checking)
 */
export async function streamInterviewMessage({ sessionId, message, onToken, onDone, onError, signal }) {
  try {
    const res = await fetch(`${API_URL}${ENDPOINTS.INTERVIEW.MESSAGE(sessionId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
      signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Request failed' }));
      onError?.(err.detail || `HTTP ${res.status}`, res.status);
      return res;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();

        try {
          const parsed = JSON.parse(payload);
          if (parsed.token) {
            onToken?.(parsed.token);
          }
          if (parsed.done) {
            onDone?.({
              clean_text: parsed.clean_text,
              questions_covered: parsed.questions_covered,
            });
          }
          if (parsed.error) {
            onError?.(parsed.error);
          }
        } catch {
          // skip malformed JSON
        }
      }
    }

    return res;
  } catch (err) {
    if (err.name === 'AbortError') return;
    onError?.(err.message || 'Failed to send message');
  }
}
