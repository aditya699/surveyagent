// ---------------------------------------------------------------------------
// Axios interceptors — token attachment + 401 refresh queue
// ---------------------------------------------------------------------------

import axios from 'axios';
import { API_URL, ENDPOINTS, FORM_HEADERS } from './constants';

// State for the refresh-token queue
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Attach both interceptors to the given axios instance.
 * Called once at app bootstrap from index.js.
 */
export function attachInterceptors(api) {
  // ---- Request: attach Bearer token from localStorage ----
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // ---- Response: handle 401 with token refresh + request queuing ----
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Only attempt refresh for 401 errors on non-auth endpoints
      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        !originalRequest.url?.includes('/auth/login') &&
        !originalRequest.url?.includes('/auth/register') &&
        !originalRequest.url?.includes('/auth/refresh')
      ) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(error);
        }

        try {
          // Use raw axios (not the api instance) to avoid recursive interception
          const params = new URLSearchParams();
          params.append('refresh_token', refreshToken);

          const response = await axios.post(
            `${API_URL}${ENDPOINTS.AUTH.REFRESH}`,
            params,
            { headers: FORM_HEADERS }
          );

          const { access_token, refresh_token: newRefreshToken } = response.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', newRefreshToken);

          processQueue(null, access_token);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );
}
