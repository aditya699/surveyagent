// ---------------------------------------------------------------------------
// Translation API — ephemeral token minting for /realtime_translation demo
// ---------------------------------------------------------------------------

import api from './client';
import { ENDPOINTS } from './constants';

/** Request an ephemeral Realtime Translation token (Bearer auth required). */
export async function getTranslationToken(targetLanguage) {
  const res = await api.post(ENDPOINTS.TRANSLATION.TOKEN, {
    target_language: targetLanguage,
  });
  return res.data;
}
