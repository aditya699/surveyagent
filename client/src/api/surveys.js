// ---------------------------------------------------------------------------
// Survey API — CRUD + publish operations
// All endpoints accept/return JSON (not form data)
// ---------------------------------------------------------------------------

import api from './client';
import { ENDPOINTS } from './constants';

export function createSurvey(data) {
  return api.post(ENDPOINTS.SURVEYS.CREATE, data);
}

export function getSurveys() {
  return api.get(ENDPOINTS.SURVEYS.LIST);
}

export function getSurvey(id) {
  return api.get(ENDPOINTS.SURVEYS.DETAIL(id));
}

export function updateSurvey(id, data) {
  return api.put(ENDPOINTS.SURVEYS.UPDATE(id), data);
}

export function deleteSurvey(id) {
  return api.delete(ENDPOINTS.SURVEYS.DELETE(id));
}

export function publishSurvey(id) {
  return api.post(ENDPOINTS.SURVEYS.PUBLISH(id));
}
