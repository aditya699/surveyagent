// ---------------------------------------------------------------------------
// PDF export utilities — designed report layouts using jsPDF + autoTable
// ---------------------------------------------------------------------------
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Brand colors
const ACCENT = [196, 149, 106]; // #C4956A
const DARK = [26, 18, 16]; // #1A1210
const MUTED = [139, 115, 85]; // #8B7355
const LIGHT_BG = [250, 247, 242]; // #FAF7F2
const WHITE = [255, 255, 255];
const SUCCESS = [22, 163, 74]; // #16A34A
const ERROR = [220, 38, 38]; // #DC2626

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ---------------------------------------------------------------------------
// Shared layout helpers
// ---------------------------------------------------------------------------

function addHeader(doc, title, subtitle) {
  // Accent bar at top
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, 210, 3, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...DARK);
  doc.text(title, 15, 20);

  // Subtitle
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(subtitle, 15, 27);
  }

  // Thin line separator
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.3);
  doc.line(15, 31, 195, 31);

  return 35;
}

function addSectionTitle(doc, y, text) {
  if (y > 260) { doc.addPage(); y = 15; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text(text, 15, y);
  return y + 6;
}

function addParagraph(doc, y, text, { maxWidth = 175, fontSize = 9.5, color = DARK } = {}) {
  if (y > 265) { doc.addPage(); y = 15; }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, 15, y);
  return y + lines.length * (fontSize * 0.45) + 3;
}

function addKeyValue(doc, y, label, value) {
  if (y > 265) { doc.addPage(); y = 15; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(label, 15, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK);
  doc.text(String(value ?? '—'), 15 + doc.getTextWidth(label) + 3, y);
  return y + 5;
}

function addScoreBadge(doc, y, score, sentiment) {
  if (y > 260) { doc.addPage(); y = 15; }

  // Score circle
  const cx = 30;
  const cy = y + 10;
  const color = score >= 7 ? SUCCESS : score >= 5 ? ACCENT : ERROR;
  doc.setFillColor(...color);
  doc.circle(cx, cy, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...WHITE);
  doc.text(String(score), cx, cy + 1, { align: 'center' });

  // Score label
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('/ 10', cx + 10, cy + 1);

  // Sentiment badge
  if (sentiment) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...color);
    doc.text(sentiment.toUpperCase(), cx + 22, cy + 1);
  }

  return y + 24;
}

function addBulletList(doc, y, items, { titleKey = 'title', detailKey = 'detail' } = {}) {
  for (const item of items || []) {
    if (y > 265) { doc.addPage(); y = 15; }
    const title = typeof item === 'string' ? item : item[titleKey];
    const detail = typeof item === 'string' ? null : item[detailKey];

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(`•  ${title}`, 18, y);
    y += 4;

    if (detail) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      const lines = doc.splitTextToSize(detail, 168);
      doc.text(lines, 23, y);
      y += lines.length * 3.5 + 2;
    }
  }
  return y + 2;
}

function addFooter(doc) {
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(`SurveyAgent — Exported ${new Date().toLocaleDateString()}`, 15, 290);
    doc.text(`Page ${i} of ${pages}`, 195, 290, { align: 'right' });
  }
}

// ---------------------------------------------------------------------------
// Interview Analysis PDF
// ---------------------------------------------------------------------------

export function exportInterviewAnalysisPDF(interview, analysis) {
  const respondent = interview.respondent || {};
  const name = respondent.name || respondent.email || 'Anonymous';
  const doc = new jsPDF();

  let y = addHeader(doc, interview.survey_title || 'Interview Analysis', `Interview with ${name}`);

  // Meta info row
  y = addKeyValue(doc, y, 'Status:', interview.status);
  y = addKeyValue(doc, y, 'Duration:', formatDuration(interview.duration_seconds));
  y = addKeyValue(doc, y, 'Date:', formatDate(interview.started_at));
  if (respondent.occupation) y = addKeyValue(doc, y, 'Occupation:', respondent.occupation);
  y += 3;

  // Score badge
  if (analysis?.overall_score != null) {
    y = addScoreBadge(doc, y, analysis.overall_score, analysis.sentiment);
  }

  // Executive summary
  if (analysis?.summary) {
    y = addSectionTitle(doc, y, 'Executive Summary');
    y = addParagraph(doc, y, analysis.summary);
    y += 2;
  }

  // Key themes
  if (analysis?.key_themes?.length) {
    y = addSectionTitle(doc, y, 'Key Themes');
    const themeText = analysis.key_themes.join('  ·  ');
    y = addParagraph(doc, y, themeText, { color: ACCENT });
    y += 2;
  }

  // Strengths
  if (analysis?.strengths?.length) {
    y = addSectionTitle(doc, y, 'Strengths');
    y = addBulletList(doc, y, analysis.strengths);
  }

  // Concerns
  if (analysis?.concerns?.length) {
    y = addSectionTitle(doc, y, 'Concerns');
    y = addBulletList(doc, y, analysis.concerns);
  }

  // Improvements
  if (analysis?.improvements?.length) {
    y = addSectionTitle(doc, y, 'Recommendations');
    y = addBulletList(doc, y, analysis.improvements);
  }

  // Question analysis table
  if (analysis?.question_analysis?.length) {
    if (y > 220) { doc.addPage(); y = 15; }
    y = addSectionTitle(doc, y, 'Question Analysis');

    autoTable(doc, {
      startY: y,
      head: [['#', 'Question', 'Status', 'Notes']],
      body: analysis.question_analysis.map((q) => [
        q.question_index,
        q.question_text,
        q.status?.replace(/_/g, ' ') || '',
        q.notes || '',
      ]),
      margin: { left: 15, right: 15 },
      styles: { fontSize: 8, cellPadding: 2.5, textColor: DARK, lineColor: [232, 224, 212] },
      headStyles: { fillColor: ACCENT, textColor: WHITE, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: LIGHT_BG },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 60 },
        2: { cellWidth: 28 },
        3: { cellWidth: 'auto' },
      },
    });
    y = doc.lastAutoTable?.finalY + 8 || y + 20;
  }

  // Transcript
  if (interview.conversation?.length) {
    if (y > 220) { doc.addPage(); y = 15; }
    y = addSectionTitle(doc, y, 'Transcript');

    autoTable(doc, {
      startY: y,
      head: [['Role', 'Message']],
      body: interview.conversation.map((msg) => [
        msg.role === 'assistant' ? 'Interviewer' : 'Respondent',
        msg.content || '',
      ]),
      margin: { left: 15, right: 15 },
      styles: { fontSize: 8, cellPadding: 2.5, textColor: DARK, lineColor: [232, 224, 212], overflow: 'linebreak' },
      headStyles: { fillColor: ACCENT, textColor: WHITE, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: LIGHT_BG },
      columnStyles: {
        0: { cellWidth: 22, fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
      },
    });
  }

  addFooter(doc);
  doc.save(`analysis-${slugify(name)}-${dateStamp()}.pdf`);
}

// ---------------------------------------------------------------------------
// Survey Analysis PDF
// ---------------------------------------------------------------------------

export function exportSurveyAnalysisPDF(surveyTitle, analysis) {
  const doc = new jsPDF();

  let y = addHeader(doc, surveyTitle, 'Survey Analysis Report');

  // Meta
  if (analysis?.total_interviews_analyzed) {
    y = addKeyValue(doc, y, 'Interviews Analyzed:', analysis.total_interviews_analyzed);
  }
  y += 2;

  // Score
  if (analysis?.overall_score != null) {
    y = addScoreBadge(doc, y, analysis.overall_score, analysis.dominant_sentiment);
  }

  // Summary
  if (analysis?.summary) {
    y = addSectionTitle(doc, y, 'Executive Summary');
    y = addParagraph(doc, y, analysis.summary);
    y += 2;
  }

  // Key themes
  if (analysis?.key_themes?.length) {
    y = addSectionTitle(doc, y, 'Key Themes');
    y = addParagraph(doc, y, analysis.key_themes.join('  ·  '), { color: ACCENT });
    y += 2;
  }

  // Consensus
  if (analysis?.consensus_points?.length) {
    y = addSectionTitle(doc, y, 'Consensus Points');
    y = addBulletList(doc, y, analysis.consensus_points);
  }

  // Divergence
  if (analysis?.divergence_points?.length) {
    y = addSectionTitle(doc, y, 'Divergence Points');
    y = addBulletList(doc, y, analysis.divergence_points);
  }

  // Strengths
  if (analysis?.strengths?.length) {
    y = addSectionTitle(doc, y, 'Strengths');
    y = addBulletList(doc, y, analysis.strengths);
  }

  // Concerns
  if (analysis?.concerns?.length) {
    y = addSectionTitle(doc, y, 'Concerns');
    y = addBulletList(doc, y, analysis.concerns);
  }

  // Improvements
  if (analysis?.improvements?.length) {
    y = addSectionTitle(doc, y, 'Recommendations');
    y = addBulletList(doc, y, analysis.improvements);
  }

  // Question analysis table
  if (analysis?.question_analysis?.length) {
    if (y > 200) { doc.addPage(); y = 15; }
    y = addSectionTitle(doc, y, 'Question Analysis');

    autoTable(doc, {
      startY: y,
      head: [['#', 'Question', 'Quality', 'Coverage', 'Key Findings']],
      body: analysis.question_analysis.map((q) => [
        q.question_index,
        q.question_text,
        q.avg_quality?.replace(/_/g, ' ') || '',
        q.coverage_rate != null ? `${q.coverage_rate}%` : '',
        q.key_findings || '',
      ]),
      margin: { left: 15, right: 15 },
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: DARK, lineColor: [232, 224, 212], overflow: 'linebreak' },
      headStyles: { fillColor: ACCENT, textColor: WHITE, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: LIGHT_BG },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 40 },
        2: { cellWidth: 24 },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 'auto' },
      },
    });
    y = doc.lastAutoTable?.finalY + 8 || y + 20;
  }

  // Respondent patterns
  if (analysis?.respondent_patterns) {
    if (y > 250) { doc.addPage(); y = 15; }
    y = addSectionTitle(doc, y, 'Respondent Patterns');
    if (analysis.respondent_patterns.engagement_distribution) {
      y = addParagraph(doc, y, analysis.respondent_patterns.engagement_distribution);
    }
    if (analysis.respondent_patterns.notable_outliers) {
      y = addParagraph(doc, y, analysis.respondent_patterns.notable_outliers, { color: MUTED });
    }
  }

  addFooter(doc);
  doc.save(`survey-analysis-${slugify(surveyTitle)}-${dateStamp()}.pdf`);
}

// ---------------------------------------------------------------------------
// Survey Definition PDF
// ---------------------------------------------------------------------------

export function exportSurveyDefinitionPDF(survey) {
  const doc = new jsPDF();

  let y = addHeader(doc, survey.title, 'Survey Definition');

  // Meta
  y = addKeyValue(doc, y, 'Status:', survey.status);
  y = addKeyValue(doc, y, 'Duration:', `${survey.estimated_duration ?? 5} minutes`);
  y = addKeyValue(doc, y, 'Tone:', survey.personality_tone || 'friendly');
  y = addKeyValue(doc, y, 'Created:', formatDate(survey.created_at));
  y += 4;

  // Description
  if (survey.description) {
    y = addSectionTitle(doc, y, 'Description');
    y = addParagraph(doc, y, survey.description);
    y += 2;
  }

  // Goal
  if (survey.goal) {
    y = addSectionTitle(doc, y, 'Goal');
    y = addParagraph(doc, y, survey.goal);
    y += 2;
  }

  // Context
  if (survey.context) {
    y = addSectionTitle(doc, y, 'Context');
    y = addParagraph(doc, y, survey.context);
    y += 2;
  }

  // Welcome message
  if (survey.welcome_message) {
    y = addSectionTitle(doc, y, 'Welcome Message');
    y = addParagraph(doc, y, survey.welcome_message, { color: MUTED });
    y += 2;
  }

  // Questions
  if (survey.questions?.length) {
    y = addSectionTitle(doc, y, 'Questions');

    const rows = survey.questions.map((q, i) => {
      const text = typeof q === 'string' ? q : q.text;
      const instructions = typeof q === 'string' ? '' : (q.ai_instructions || '');
      return [i + 1, text, instructions];
    });

    autoTable(doc, {
      startY: y,
      head: [['#', 'Question', 'AI Instructions']],
      body: rows,
      margin: { left: 15, right: 15 },
      styles: { fontSize: 9, cellPadding: 3, textColor: DARK, lineColor: [232, 224, 212], overflow: 'linebreak' },
      headStyles: { fillColor: ACCENT, textColor: WHITE, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: LIGHT_BG },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 95 },
        2: { cellWidth: 'auto', fontStyle: 'italic', textColor: MUTED },
      },
    });
  }

  addFooter(doc);
  doc.save(`survey-${slugify(survey.title)}-${dateStamp()}.pdf`);
}
