// ---------------------------------------------------------------------------
// Export utilities — CSV/JSON conversion and file download triggers
// ---------------------------------------------------------------------------

/**
 * Trigger a file download in the browser.
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Escape a value for safe CSV embedding.
 */
function escapeCSVField(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert an array of objects to a CSV string.
 * @param {Object[]} rows
 * @param {{ key: string, label: string }[]} headers
 */
function toCSV(rows, headers) {
  const headerLine = headers.map((h) => escapeCSVField(h.label)).join(',');
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCSVField(row[h.key])).join(',')
  );
  // BOM for Excel UTF-8 compatibility
  return '\uFEFF' + [headerLine, ...dataLines].join('\n');
}

/**
 * Sanitize text for use in filenames.
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Export functions for each data type
// ---------------------------------------------------------------------------

/**
 * Export interview transcript as CSV.
 */
export function exportInterviewTranscript(interview) {
  const respondent = interview.respondent || {};
  const name = respondent.name || respondent.email || 'anonymous';

  const headers = [
    { key: 'timestamp', label: 'Timestamp' },
    { key: 'role', label: 'Role' },
    { key: 'content', label: 'Content' },
  ];

  const rows = (interview.conversation || []).map((msg) => ({
    timestamp: msg.timestamp || '',
    role: msg.role || '',
    content: msg.content || '',
  }));

  const csv = toCSV(rows, headers);
  downloadFile(csv, `transcript-${slugify(name)}-${dateStamp()}.csv`, 'text/csv;charset=utf-8');
}

/**
 * Export interview AI analysis as JSON.
 */
export function exportInterviewAnalysis(interview, analysis) {
  const respondent = interview.respondent || {};
  const name = respondent.name || respondent.email || 'anonymous';

  const data = {
    export_date: new Date().toISOString(),
    interview_id: interview.id,
    survey_title: interview.survey_title,
    respondent_name: respondent.name || null,
    respondent_email: respondent.email || null,
    status: interview.status,
    duration_seconds: interview.duration_seconds,
    analysis,
  };

  const json = JSON.stringify(data, null, 2);
  downloadFile(json, `analysis-${slugify(name)}-${dateStamp()}.json`, 'application/json');
}

/**
 * Export survey-level aggregate analysis as JSON.
 */
export function exportSurveyAnalysis(surveyTitle, analysis) {
  const data = {
    export_date: new Date().toISOString(),
    survey_title: surveyTitle,
    analysis,
  };

  const json = JSON.stringify(data, null, 2);
  downloadFile(json, `survey-analysis-${slugify(surveyTitle)}-${dateStamp()}.json`, 'application/json');
}

/**
 * Export full survey definition as JSON.
 */
export function exportSurveyDefinition(survey) {
  const data = {
    export_date: new Date().toISOString(),
    title: survey.title,
    description: survey.description,
    goal: survey.goal,
    context: survey.context,
    questions: survey.questions,
    estimated_duration: survey.estimated_duration,
    welcome_message: survey.welcome_message,
    personality_tone: survey.personality_tone,
    status: survey.status,
    created_at: survey.created_at,
  };

  const json = JSON.stringify(data, null, 2);
  downloadFile(json, `survey-${slugify(survey.title)}-${dateStamp()}.json`, 'application/json');
}

/**
 * Export interview list as CSV (for bulk export from survey analytics).
 */
export function exportInterviewsList(interviews, surveyTitle) {
  const headers = [
    { key: 'respondent_name', label: 'Respondent Name' },
    { key: 'respondent_email', label: 'Respondent Email' },
    { key: 'status', label: 'Status' },
    { key: 'duration_seconds', label: 'Duration (seconds)' },
    { key: 'questions_covered_count', label: 'Questions Covered' },
    { key: 'started_at', label: 'Started At' },
    { key: 'completed_at', label: 'Completed At' },
  ];

  const rows = interviews.map((iv) => ({
    respondent_name: iv.respondent_name || '',
    respondent_email: iv.respondent_email || '',
    status: iv.status || '',
    duration_seconds: iv.duration_seconds ?? '',
    questions_covered_count: iv.questions_covered_count ?? '',
    started_at: iv.started_at || '',
    completed_at: iv.completed_at || '',
  }));

  const csv = toCSV(rows, headers);
  downloadFile(csv, `responses-${slugify(surveyTitle)}-${dateStamp()}.csv`, 'text/csv;charset=utf-8');
}

/**
 * Export analytics overview summary as CSV.
 */
export function exportSurveySummary(surveys) {
  const headers = [
    { key: 'title', label: 'Survey Title' },
    { key: 'status', label: 'Status' },
    { key: 'total_interviews', label: 'Total Interviews' },
    { key: 'completed', label: 'Completed' },
    { key: 'completion_rate', label: 'Completion Rate (%)' },
    { key: 'avg_duration_seconds', label: 'Avg Duration (seconds)' },
  ];

  const rows = surveys.map((s) => ({
    title: s.title || '',
    status: s.status || '',
    total_interviews: s.total_interviews ?? 0,
    completed: s.completed ?? 0,
    completion_rate: s.completion_rate ?? 0,
    avg_duration_seconds: s.avg_duration_seconds ?? '',
  }));

  const csv = toCSV(rows, headers);
  downloadFile(csv, `survey-summary-${dateStamp()}.csv`, 'text/csv;charset=utf-8');
}
