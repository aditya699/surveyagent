import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, LogOut, Plus, X, Sparkles, Loader2, MessageSquare } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { createSurvey, getSurvey, updateSurvey, publishSurvey } from '../api';
import { streamGenerateQuestions } from '../api/ai';

export default function SurveyForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [context, setContext] = useState('');
  const [questions, setQuestions] = useState(['']);
  const [estimatedDuration, setEstimatedDuration] = useState(5);
  const [personalityTone, setPersonalityTone] = useState('friendly');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [existingStatus, setExistingStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [loadingExisting, setLoadingExisting] = useState(isEdit);

  // AI generation state
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiNumQuestions, setAiNumQuestions] = useState(5);
  const [aiAdditionalInfo, setAiAdditionalInfo] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    if (!id) return;
    const fetchSurvey = async () => {
      try {
        const res = await getSurvey(id);
        const s = res.data.survey;
        setTitle(s.title);
        setDescription(s.description);
        setGoal(s.goal);
        setContext(s.context);
        setQuestions(s.questions.length > 0 ? s.questions : ['']);
        setEstimatedDuration(s.estimated_duration ?? 5);
        setPersonalityTone(s.personality_tone ?? 'friendly');
        setWelcomeMessage(s.welcome_message ?? '');
        setExistingStatus(s.status);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load survey');
      } finally {
        setLoadingExisting(false);
      }
    };
    fetchSurvey();
  }, [id]);

  const buildPayload = () => ({
    title: title.trim(),
    description: description.trim(),
    goal: goal.trim(),
    context: context.trim(),
    questions: questions.map((q) => q.trim()).filter(Boolean),
    estimated_duration: estimatedDuration,
    personality_tone: personalityTone,
    welcome_message: welcomeMessage.trim() || null,
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isEdit) {
        await updateSurvey(id, buildPayload());
      } else {
        await createSurvey(buildPayload());
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save survey');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setError('');
    setPublishing(true);
    try {
      let surveyId = id;
      if (isEdit) {
        await updateSurvey(id, buildPayload());
      } else {
        const res = await createSurvey(buildPayload());
        surveyId = res.data.survey.id;
      }
      await publishSurvey(surveyId);
      navigate(`/surveys/${surveyId}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to publish survey');
    } finally {
      setPublishing(false);
    }
  };

  const [testing, setTesting] = useState(false);

  const handleTestChatbot = async () => {
    setError('');
    setTesting(true);
    try {
      let surveyId = id;
      if (isEdit) {
        await updateSurvey(id, buildPayload());
      } else {
        const res = await createSurvey(buildPayload());
        surveyId = res.data.survey.id;
      }
      window.open(`/interview/test/${surveyId}`, '_blank');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save survey');
    } finally {
      setTesting(false);
    }
  };

  const addQuestion = () => setQuestions([...questions, '']);

  const updateQuestion = (index, value) => {
    const updated = [...questions];
    updated[index] = value;
    setQuestions(updated);
  };

  const removeQuestion = (index) => {
    if (questions.length === 1) {
      // Last question — clear it instead of removing, so the input stays visible
      setQuestions(['']);
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  // Track abort controller for cancelling in-flight generation
  const abortRef = useRef(null);

  const handleAiGenerate = async () => {
    setAiError('');
    setAiGenerating(true);

    // Create abort controller for cancellation
    const controller = new AbortController();
    abortRef.current = controller;

    await streamGenerateQuestions({
      data: {
        num_questions: aiNumQuestions,
        title: title.trim(),
        description: description.trim(),
        goal: goal.trim(),
        context: context.trim(),
        additional_info: aiAdditionalInfo.trim(),
      },
      onQuestion: (question) => {
        setQuestions((prev) => {
          // Strip out any empty questions, then append the new one.
          // Pure function — safe under React StrictMode double-invocation.
          const nonEmpty = prev.filter((q) => q.trim() !== '');
          return [...nonEmpty, question];
        });
      },
      onDone: () => {
        setAiGenerating(false);
        setShowAiPanel(false);
        setAiAdditionalInfo('');
        abortRef.current = null;
      },
      onError: (errMsg) => {
        setAiError(errMsg || 'Failed to generate questions. Please try again.');
        setAiGenerating(false);
        abortRef.current = null;
      },
      signal: controller.signal,
    });
  };

  const handleAiCancel = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setAiGenerating(false);
    setShowAiPanel(false);
    setAiError('');
  };

  if (loadingExisting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAlreadyPublished = existingStatus === 'published';
  const canSubmit = title.trim().length > 0 && !saving && !publishing && !testing;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="bg-white border-b border-card-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <span className="text-card-border">|</span>
          <h1 className="text-xl font-serif text-text-primary">
            {isEdit ? 'Edit Survey' : 'Create Survey'}
          </h1>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </header>

      {/* Content */}
      <main className="container-max max-w-2xl section-padding">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <form onSubmit={handleSave} className="space-y-6">
            {/* Error */}
            {error && (
              <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-3 text-sm text-error font-sans">
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-sans text-text-muted mb-1.5">
                Title <span className="text-error">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white border border-card-border rounded-lg px-4 py-3 text-sm font-sans text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                placeholder="e.g. Customer Satisfaction Survey"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-sans text-text-muted mb-1.5">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-white border border-card-border rounded-lg px-4 py-3 text-sm font-sans text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all resize-none"
                placeholder="Brief description of this survey"
              />
            </div>

            {/* Goal */}
            <div>
              <label htmlFor="goal" className="block text-sm font-sans text-text-muted mb-1.5">
                Goal
              </label>
              <textarea
                id="goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={3}
                className="w-full bg-white border border-card-border rounded-lg px-4 py-3 text-sm font-sans text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all resize-none"
                placeholder="What do you want to learn from this survey?"
              />
            </div>

            {/* Context */}
            <div>
              <label htmlFor="context" className="block text-sm font-sans text-text-muted mb-1.5">
                Context
              </label>
              <textarea
                id="context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={3}
                className="w-full bg-white border border-card-border rounded-lg px-4 py-3 text-sm font-sans text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all resize-none"
                placeholder="Target audience, tone, constraints..."
              />
            </div>

            {/* Estimated Duration */}
            <div>
              <label htmlFor="estimatedDuration" className="block text-sm font-sans text-text-muted mb-1.5">
                Estimated Duration (minutes)
              </label>
              <input
                id="estimatedDuration"
                type="number"
                min={1}
                max={60}
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                className="w-32 bg-white border border-card-border rounded-lg px-4 py-3 text-sm font-sans text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
              />
            </div>

            {/* Personality Tone */}
            <div>
              <label htmlFor="personalityTone" className="block text-sm font-sans text-text-muted mb-1.5">
                Interviewer Tone
              </label>
              <select
                id="personalityTone"
                value={personalityTone}
                onChange={(e) => setPersonalityTone(e.target.value)}
                className="w-48 bg-white border border-card-border rounded-lg px-4 py-3 text-sm font-sans text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="casual">Casual</option>
                <option value="fun">Fun</option>
              </select>
            </div>

            {/* Welcome Message */}
            <div>
              <label htmlFor="welcomeMessage" className="block text-sm font-sans text-text-muted mb-1.5">
                Welcome Message
              </label>
              <textarea
                id="welcomeMessage"
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                rows={3}
                className="w-full bg-white border border-card-border rounded-lg px-4 py-3 text-sm font-sans text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all resize-none"
                placeholder="Leave blank for default: &quot;Hi! Thanks for taking the time. This survey is about {title}...&quot;"
              />
            </div>

            {/* Questions */}
            <div>
              <label className="block text-sm font-sans text-text-muted mb-3">Questions</label>
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-sm text-text-muted font-sans mt-3 w-6 text-right shrink-0">
                      {i + 1}.
                    </span>
                    <textarea
                      value={q}
                      onChange={(e) => updateQuestion(i, e.target.value)}
                      rows={2}
                      className="flex-1 bg-white border border-card-border rounded-lg px-4 py-3 text-sm font-sans text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all resize-none"
                      placeholder={`Question ${i + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeQuestion(i)}
                      className="mt-2 p-1.5 text-text-muted/40 hover:text-error transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3">
                <button
                  type="button"
                  onClick={addQuestion}
                  className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors font-sans"
                >
                  <Plus className="w-4 h-4" />
                  Add question
                </button>
                <button
                  type="button"
                  onClick={() => setShowAiPanel(!showAiPanel)}
                  className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors font-sans"
                >
                  <Sparkles className="w-4 h-4" />
                  AI Generate Questions
                </button>
              </div>

              {/* AI Generation Panel */}
              <AnimatePresence>
                {showAiPanel && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 border border-accent/30 bg-accent/5 rounded-lg p-4 space-y-3">
                      <p className="text-sm font-sans text-text-primary font-medium">
                        AI will use your survey title, goal, and context to generate relevant questions.
                      </p>

                      {aiError && (
                        <div className="bg-error/10 border border-error/20 rounded-lg px-3 py-2 text-xs text-error font-sans">
                          {aiError}
                        </div>
                      )}

                      <div>
                        <label htmlFor="ai-num" className="block text-xs font-sans text-text-muted mb-1">
                          Number of questions
                        </label>
                        <input
                          id="ai-num"
                          type="number"
                          min={1}
                          max={20}
                          value={aiNumQuestions}
                          onChange={(e) => setAiNumQuestions(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                          className="w-24 bg-white border border-card-border rounded-lg px-3 py-2 text-sm font-sans text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                        />
                      </div>

                      <div>
                        <label htmlFor="ai-info" className="block text-xs font-sans text-text-muted mb-1">
                          Additional info for AI (optional)
                        </label>
                        <textarea
                          id="ai-info"
                          value={aiAdditionalInfo}
                          onChange={(e) => setAiAdditionalInfo(e.target.value)}
                          rows={2}
                          className="w-full bg-white border border-card-border rounded-lg px-3 py-2 text-sm font-sans text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all resize-none"
                          placeholder="e.g. Focus on employee engagement, include rating-scale questions..."
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleAiGenerate}
                          disabled={aiGenerating}
                          className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                          {aiGenerating ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              Generate
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleAiCancel}
                          className="btn-secondary text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={!canSubmit}
                className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save as Draft'}
              </button>
              <button
                type="button"
                onClick={handleTestChatbot}
                disabled={!canSubmit}
                className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4" />
                {testing ? 'Saving...' : 'Test Survey'}
              </button>
              {!isAlreadyPublished && (
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={!canSubmit}
                  className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {publishing ? 'Publishing...' : 'Publish'}
                </button>
              )}
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
