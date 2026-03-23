// ---------------------------------------------------------------------------
// API constants — base URL, endpoint map, shared headers
// ---------------------------------------------------------------------------

export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

const PREFIX = '/api/v1';

export const ENDPOINTS = {
  AUTH: {
    REGISTER: `${PREFIX}/auth/register`,
    LOGIN:    `${PREFIX}/auth/login`,
    REFRESH:  `${PREFIX}/auth/refresh`,
    ME:       `${PREFIX}/auth/me`,
    UPDATE_PROFILE: `${PREFIX}/auth/update-profile`,
  },

  AI: {
    GENERATE_QUESTIONS: `${PREFIX}/ai/generate-questions`,
    ENHANCE_FIELD: `${PREFIX}/ai/enhance-field`,
    SYNTHESIZE_SPEECH: `${PREFIX}/ai/synthesize-speech`,
  },

  INTERVIEW: {
    INFO:    (token) => `${PREFIX}/interview/${token}/info`,
    START:   (token) => `${PREFIX}/interview/start/${token}`,
    MESSAGE: (sessionId) => `${PREFIX}/interview/${sessionId}/message`,
    TEST:    (surveyId) => `${PREFIX}/interview/test/${surveyId}`,
  },

  SURVEYS: {
    LIST:    `${PREFIX}/surveys`,
    CREATE:  `${PREFIX}/surveys`,
    DETAIL:  (id) => `${PREFIX}/surveys/${id}`,
    UPDATE:  (id) => `${PREFIX}/surveys/${id}`,
    DELETE:  (id) => `${PREFIX}/surveys/${id}`,
    PUBLISH: (id) => `${PREFIX}/surveys/${id}/publish`,
  },

  ANALYTICS: {
    OVERVIEW:          `${PREFIX}/analytics/surveys`,
    SURVEY:            (id) => `${PREFIX}/analytics/surveys/${id}`,
    INTERVIEWS:        (id) => `${PREFIX}/analytics/surveys/${id}/interviews`,
    INTERVIEW_DETAIL:  (id) => `${PREFIX}/analytics/interviews/${id}`,
    ANALYZE_INTERVIEW: (id) => `${PREFIX}/analytics/interviews/${id}/analyze`,
  },
};

export const FORM_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
};
