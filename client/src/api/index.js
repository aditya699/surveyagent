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
export { streamGenerateQuestions, streamEnhanceField, streamAnalyzeInterview, synthesizeSpeech } from './ai';
export {
  getInterviewInfo,
  startInterview,
  startTestInterview,
  streamInterviewMessage,
  transcribeAudio,
  synthesizeInterviewSpeech,
} from './interview';
export {
  getAnalyticsOverview,
  getSurveyAnalytics,
  getSurveyInterviews,
  getInterviewDetail,
  exportSurveyInterviews,
} from './analytics';
export {
  getOrg,
  updateOrg,
  getOrgMembers,
  updateMemberRole,
  removeMember,
  transferOwnership,
  sendInvite,
  getInviteInfo,
} from './org';
export {
  getTeams,
  createTeam,
  getTeamDetail,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
} from './teams';
export { submitFeedback } from './feedback';
