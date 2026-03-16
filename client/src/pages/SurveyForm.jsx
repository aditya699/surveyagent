import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, LogOut, Plus, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { createSurvey, getSurvey, updateSurvey, publishSurvey } from '../api';

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
  const [existingStatus, setExistingStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [loadingExisting, setLoadingExisting] = useState(isEdit);

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

  const addQuestion = () => setQuestions([...questions, '']);

  const updateQuestion = (index, value) => {
    const updated = [...questions];
    updated[index] = value;
    setQuestions(updated);
  };

  const removeQuestion = (index) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  if (loadingExisting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAlreadyPublished = existingStatus === 'published';
  const canSubmit = title.trim().length > 0 && !saving && !publishing;

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
                      disabled={questions.length === 1}
                      className="mt-2 p-1.5 text-text-muted/40 hover:text-error transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addQuestion}
                className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors font-sans mt-3"
              >
                <Plus className="w-4 h-4" />
                Add question
              </button>
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
