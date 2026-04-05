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
  const [language, setLanguage] = useState('English');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [notifyOnCompletion, setNotifyOnCompletion] = useState(false);
  const [llmProvider, setLlmProvider] = useState('');
  const [llmModel, setLlmModel] = useState('');
  const [analyticsInstructions, setAnalyticsInstructions] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [teamIds, setTeamIds] = useState([]);
  const [existingStatus, setExistingStatus] = useState(null);
  const [createdBy, setCreatedBy] = useState(null);
  const [createdByName, setCreatedByName] = useState(null);
  const [createdByEmail, setCreatedByEmail] = useState(null);

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
        const normalized = (s.questions || []).map((q) =>
          typeof q === 'string'
            ? { text: q, aiInstructions: '' }
            : { text: q.text, aiInstructions: q.ai_instructions || '' }
        );
        setQuestions(normalized.length > 0 ? normalized : [{ text: '', aiInstructions: '' }]);
        setEstimatedDuration(s.estimated_duration ?? 5);
        setPersonalityTone(s.personality_tone ?? 'friendly');
        setLanguage(s.language ?? 'English');
        setWelcomeMessage(s.welcome_message ?? '');
        setWebhookUrl(s.webhook_url ?? '');
        setNotifyOnCompletion(s.notify_on_completion ?? false);
        setLlmProvider(s.llm_provider ?? '');
        setLlmModel(s.llm_model ?? '');
        setAnalyticsInstructions(s.analytics_instructions ?? '');
        setVisibility(s.visibility ?? 'private');
        setTeamIds(s.team_ids ?? []);
        setExistingStatus(s.status);
        setCreatedBy(s.created_by);
        setCreatedByName(s.created_by_name ?? null);
        setCreatedByEmail(s.created_by_email ?? null);
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
      questions: questions
        .filter((q) => q.text.trim())
        .map((q) => ({
          text: q.text.trim(),
          ai_instructions: q.aiInstructions?.trim() || null,
        })),
      estimated_duration: estimatedDuration,
      personality_tone: personalityTone,
      language,
      welcome_message: welcomeMessage.trim() || null,
      webhook_url: webhookUrl.trim() || null,
      notify_on_completion: notifyOnCompletion,
      llm_provider: llmProvider || null,
      llm_model: llmModel.trim() || null,
      analytics_instructions: analyticsInstructions.trim() || null,
      visibility,
      team_ids: visibility === 'team' ? teamIds : [],
    }),
    [title, description, goal, context, estimatedDuration, personalityTone, language, welcomeMessage, webhookUrl, notifyOnCompletion, llmProvider, llmModel, analyticsInstructions, visibility, teamIds],
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
    language, setLanguage,
    welcomeMessage, setWelcomeMessage,
    webhookUrl, setWebhookUrl,
    notifyOnCompletion, setNotifyOnCompletion,
    llmProvider, setLlmProvider,
    llmModel, setLlmModel,
    analyticsInstructions, setAnalyticsInstructions,
    visibility, setVisibility,
    teamIds, setTeamIds,
    existingStatus, createdBy, createdByName, createdByEmail,
    saving, publishing, testing, error,
    loadingExisting,
    handleSave, handlePublish, handleTestChatbot,
  };
}
