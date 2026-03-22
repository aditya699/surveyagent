import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSurvey, getSurvey, updateSurvey, publishSurvey } from '../api';

export function useSurveyForm({ id, setQuestions }) {
  const isEdit = !!id;
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [context, setContext] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState(5);
  const [personalityTone, setPersonalityTone] = useState('friendly');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [existingStatus, setExistingStatus] = useState(null);

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [loadingExisting, setLoadingExisting] = useState(isEdit);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getSurvey(id);
        if (cancelled) return;
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
        if (!cancelled) setError(err.response?.data?.detail || 'Failed to load survey');
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, setQuestions]);

  const buildPayload = useCallback(
    (questions) => ({
      title: title.trim(),
      description: description.trim(),
      goal: goal.trim(),
      context: context.trim(),
      questions: questions.map((q) => q.trim()).filter(Boolean),
      estimated_duration: estimatedDuration,
      personality_tone: personalityTone,
      welcome_message: welcomeMessage.trim() || null,
    }),
    [title, description, goal, context, estimatedDuration, personalityTone, welcomeMessage],
  );

  const handleSave = useCallback(
    async (e, questions) => {
      e.preventDefault();
      setError('');
      setSaving(true);
      try {
        if (isEdit) {
          await updateSurvey(id, buildPayload(questions));
        } else {
          await createSurvey(buildPayload(questions));
        }
        navigate('/dashboard');
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to save survey');
      } finally {
        setSaving(false);
      }
    },
    [isEdit, id, buildPayload, navigate],
  );

  const handlePublish = useCallback(
    async (questions) => {
      setError('');
      setPublishing(true);
      try {
        let surveyId = id;
        if (isEdit) {
          await updateSurvey(id, buildPayload(questions));
        } else {
          const res = await createSurvey(buildPayload(questions));
          surveyId = res.data.survey.id;
        }
        await publishSurvey(surveyId);
        navigate(`/surveys/${surveyId}`);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to publish survey');
      } finally {
        setPublishing(false);
      }
    },
    [isEdit, id, buildPayload, navigate],
  );

  const handleTestChatbot = useCallback(
    async (questions) => {
      setError('');
      setTesting(true);
      try {
        let surveyId = id;
        if (isEdit) {
          await updateSurvey(id, buildPayload(questions));
        } else {
          const res = await createSurvey(buildPayload(questions));
          surveyId = res.data.survey.id;
        }
        window.open(`/interview/test/${surveyId}`, '_blank');
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to save survey');
      } finally {
        setTesting(false);
      }
    },
    [isEdit, id, buildPayload],
  );

  return {
    isEdit,
    title, setTitle,
    description, setDescription,
    goal, setGoal,
    context, setContext,
    estimatedDuration, setEstimatedDuration,
    personalityTone, setPersonalityTone,
    welcomeMessage, setWelcomeMessage,
    existingStatus,
    saving, publishing, testing, error,
    loadingExisting,
    handleSave, handlePublish, handleTestChatbot,
  };
}
