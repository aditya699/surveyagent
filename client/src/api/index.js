// ---------------------------------------------------------------------------
// Barrel export — single entry point for the entire API layer
//
// Usage:
//   import api, { sendFormData, sendFormPut, ENDPOINTS } from '../api';
// ---------------------------------------------------------------------------

import api from './client';
import { attachInterceptors } from './interceptors';

// Wire up interceptors once at import time
attachInterceptors(api);

// Re-export everything consumers need
export { default as default } from './client';
export { API_URL, ENDPOINTS, FORM_HEADERS } from './constants';
export { sendFormData, sendFormPut, toFormParams } from './helpers';
export {
  createSurvey,
  getSurveys,
  getSurvey,
  updateSurvey,
  deleteSurvey,
  publishSurvey,
} from './surveys';
