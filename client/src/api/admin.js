import api from './client';
import { ENDPOINTS } from './constants';

export function getAdminUsage() {
  return api.get(ENDPOINTS.ADMIN.USAGE);
}

export function getAdminFeedback(limit = 50) {
  return api.get(ENDPOINTS.ADMIN.FEEDBACK, { params: { limit } });
}

export function getAdminErrors(limit = 50) {
  return api.get(ENDPOINTS.ADMIN.ERRORS, { params: { limit } });
}

export function getAdminUsers({ page = 1, pageSize = 50, search = '' } = {}) {
  return api.get(ENDPOINTS.ADMIN.USERS, {
    params: { page, page_size: pageSize, ...(search ? { search } : {}) },
  });
}

export function getAdminUserDetail(userId) {
  return api.get(ENDPOINTS.ADMIN.USER_DETAIL(userId));
}
