// ---------------------------------------------------------------------------
// API constants — base URL, endpoint map, shared headers
// ---------------------------------------------------------------------------

export const API_URL = import.meta.env.VITE_API_URL || '';

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
    ANALYZE_SURVEY:    (id) => `${PREFIX}/analytics/surveys/${id}/analyze`,
    EXPORT_INTERVIEWS: (id) => `${PREFIX}/analytics/surveys/${id}/interviews/export`,
  },

  OTP: {
    VERIFY: `${PREFIX}/auth/verify-otp`,
    RESEND: `${PREFIX}/auth/resend-otp`,
  },

  INVITE: {
    SEND:     `${PREFIX}/auth/invite`,
    INFO:     (token) => `${PREFIX}/auth/invite/${token}`,
    REGISTER: `${PREFIX}/auth/register-invite`,
  },

  ORG: {
    GET:            `${PREFIX}/org`,
    UPDATE:         `${PREFIX}/org`,
    MEMBERS:        `${PREFIX}/org/members`,
    MEMBER_ROLE:    (userId) => `${PREFIX}/org/members/${userId}/role`,
    REMOVE_MEMBER:  (userId) => `${PREFIX}/org/members/${userId}`,
    TRANSFER:       `${PREFIX}/org/transfer-ownership`,
  },

  FEEDBACK: {
    SUBMIT: `${PREFIX}/feedback`,
  },

  TEAMS: {
    LIST:           `${PREFIX}/teams`,
    CREATE:         `${PREFIX}/teams`,
    DETAIL:         (id) => `${PREFIX}/teams/${id}`,
    UPDATE:         (id) => `${PREFIX}/teams/${id}`,
    DELETE:         (id) => `${PREFIX}/teams/${id}`,
    ADD_MEMBER:     (id) => `${PREFIX}/teams/${id}/members`,
    REMOVE_MEMBER:  (id, userId) => `${PREFIX}/teams/${id}/members/${userId}`,
  },
};

export const FORM_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
};
