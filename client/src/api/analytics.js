import api from './client';
import { ENDPOINTS } from './constants';

export function getAnalyticsOverview() {
  return api.get(ENDPOINTS.ANALYTICS.OVERVIEW);
}

export function getSurveyAnalytics(surveyId) {
  return api.get(ENDPOINTS.ANALYTICS.SURVEY(surveyId));
}

export function getSurveyInterviews(surveyId, page = 1, pageSize = 20) {
  return api.get(ENDPOINTS.ANALYTICS.INTERVIEWS(surveyId), {
    params: { page, page_size: pageSize },
  });
}

export function getInterviewDetail(interviewId) {
  return api.get(ENDPOINTS.ANALYTICS.INTERVIEW_DETAIL(interviewId));
}
