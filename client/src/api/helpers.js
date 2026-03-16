// ---------------------------------------------------------------------------
// Request helpers — form-encoded POST / PUT for FastAPI Form(...) endpoints
// ---------------------------------------------------------------------------

import api from './client';
import { FORM_HEADERS } from './constants';

/**
 * Convert a plain JS object to URLSearchParams.
 * Skips null / undefined values.
 */
export function toFormParams(data) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      params.append(key, value);
    }
  }
  return params;
}

/**
 * POST form-encoded data (login, register, etc.)
 */
export function sendFormData(url, data, config = {}) {
  return api.post(url, toFormParams(data), {
    ...config,
    headers: { ...config.headers, ...FORM_HEADERS },
  });
}

/**
 * PUT form-encoded data (update-profile, etc.)
 */
export function sendFormPut(url, data, config = {}) {
  return api.put(url, toFormParams(data), {
    ...config,
    headers: { ...config.headers, ...FORM_HEADERS },
  });
}
