import api from './client';
import { ENDPOINTS } from './constants';

export function submitFeedback(data) {
  return api.post(ENDPOINTS.FEEDBACK.SUBMIT, data);
}
