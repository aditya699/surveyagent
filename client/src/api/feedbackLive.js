// ---------------------------------------------------------------------------
// Feedback Live API — ephemeral transcription token + dashboard extraction
// for the hidden /realtime_feedback demo.
// ---------------------------------------------------------------------------

import api from './client';
import { ENDPOINTS } from './constants';

/** Mint an ephemeral OpenAI Realtime token for transcription-only mode. */
export async function getFeedbackLiveToken() {
  const res = await api.post(ENDPOINTS.FEEDBACK_LIVE.TOKEN);
  return res.data;
}

/**
 * Send the running transcript and get back the structured dashboard JSON.
 * Accepts an AbortSignal so in-flight requests can be cancelled when a
 * newer transcript arrives.
 */
export async function extractDashboard(transcript, signal) {
  const res = await api.post(
    ENDPOINTS.FEEDBACK_LIVE.EXTRACT,
    { transcript },
    { signal },
  );
  return res.data;
}
