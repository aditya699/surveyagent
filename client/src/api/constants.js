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
  },

  SURVEYS: {
    LIST:    `${PREFIX}/surveys`,
    CREATE:  `${PREFIX}/surveys`,
    DETAIL:  (id) => `${PREFIX}/surveys/${id}`,
    UPDATE:  (id) => `${PREFIX}/surveys/${id}`,
    DELETE:  (id) => `${PREFIX}/surveys/${id}`,
    PUBLISH: (id) => `${PREFIX}/surveys/${id}/publish`,
  },
};

export const FORM_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
};
