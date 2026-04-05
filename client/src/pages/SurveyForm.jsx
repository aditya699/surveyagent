import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, LogOut, Plus, X, Play, Sparkles, Loader2, MessageSquare, ChevronDown, ChevronRight, BotMessageSquare, Cpu, Lock, Users, Building2, BarChart3 } from 'lucide-react';
import QuestionTestPanel from '../components/interview/QuestionTestPanel';
import { EnhanceButton } from '../components/shared';
import { useAuth } from '../hooks/useAuth';
import { useSurveyForm } from '../hooks/useSurveyForm';
import { useQuestionManager } from '../hooks/useQuestionManager';
import { useAiGeneration } from '../hooks/useAiGeneration';
import { useFieldEnhance } from '../hooks/useFieldEnhance';
import { getTeams } from '../api';

export default function SurveyForm() {
  const { id } = useParams();
  const { logout, user } = useAuth();

  const { questions, setQuestions, addQuestion, updateQuestion, updateAiInstructions, removeQuestion } =
    useQuestionManager();
  const [expandedInstructions, setExpandedInstructions] = useState(new Set());
  const [instructionsSeeded, setInstructionsSeeded] = useState(false);
  const [testingQuestion, setTestingQuestion] = useState(null);

  const {
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
  } = useSurveyForm({ id, setQuestions });

  const [teams, setTeams] = useState([]);
  useEffect(() => {
    getTeams().then((res) => setTeams(res.data.teams || [])).catch(() => {});
  }, []);

  const {
    showAiPanel,
    aiNumQuestions, setAiNumQuestions,
    aiAdditionalInfo, setAiAdditionalInfo,
    aiGenerating, aiError,
    handleAiGenerate, handleAiCancel, toggleAiPanel,
  } = useAiGeneration({ title, description, goal, context, setQuestions, llmProvider, llmModel });

  const {
    enhancingField, enhanceError,
    enhanceField, cancelEnhance,
  } = useFieldEnhance({
    title, description, goal, context, welcomeMessage,
    setTitle, setDescription, setGoal, setContext, setWelcomeMessage,
    llmProvider, llmModel,
  });

  // Auto-expand AI Instructions for questions that already have content (on initial load)
  useEffect(() => {
    if (!instructionsSeeded && questions.some((q) => q.aiInstructions)) {
      const indices = new Set();
      questions.forEach((q, i) => { if (q.aiInstructions) indices.add(i); });
      setExpandedInstructions(indices);
      setInstructionsSeeded(true);
    }
  }, [questions, instructionsSeeded]);

  if (loadingExisting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAlreadyPublished = existingStatus === 'published';
  const canSubmit = title.trim().length > 0 && !saving && !publishing && !testing && !enhancingField;
  const enhanceBusy = !!enhancingField || aiGenerating;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="bg-white border-b border-card-border px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <span className="text-card-border hidden sm:inline">|</span>
          <h1 className="text-lg sm:text-xl font-serif text-text-primary truncate">
            {isEdit ? 'Edit Survey' : 'Create Survey'}
          </h1>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </header>

      {/* Content */}
      <main className="container-max max-w-2xl section-padding">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <form onSubmit={(e) => handleSave(e, questions)} className="space-y-6">
            {/* Error */}
            {(error || enhanceError) && (
              <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-3 text-sm text-error font-sans">
                {error || enhanceError}
              </div>
            )}

            {/* Title */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="title" className="text-sm font-sans text-text-muted">
                  Title <span className="text-error">*</span>
                </label>
                <EnhanceButton fieldName="title" enhancingField={enhancingField} enhanceBusy={enhanceBusy} onEnhance={enhanceField} onCancel={cancelEnhance} />
              </div>
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
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="description" className="text-sm font-sans text-text-muted">
                  Description
                </label>
                <EnhanceButton fieldName="description" enhancingField={enhancingField} enhanceBusy={enhanceBusy} onEnhance={enhanceField} onCancel={cancelEnhance} />
              </div>
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
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="goal" className="text-sm font-sans text-text-muted">
                  Goal
                </label>
                <EnhanceButton fieldName="goal" enhancingField={enhancingField} enhanceBusy={enhanceBusy} onEnhance={enhanceField} onCancel={cancelEnhance} />
              </div>
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
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="context" className="text-sm font-sans text-text-muted">
                  Context
                </label>
                <EnhanceButton fieldName="context" enhancingField={enhancingField} enhanceBusy={enhanceBusy} onEnhance={enhanceField} onCancel={cancelEnhance} />
              </div>
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
                className="w-full sm:w-32 bg-white border border-card-border rounded-lg px-4 py-3 text-sm font-sans text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
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
                className="w-full sm:w-48 bg-white border border-card-border rounded-lg px-4 py-3 text-sm font-sans text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="casual">Casual</option>
                <option value="fun">Fun</option>
              </select>
            </div>

            {/* Interview Language */}
            <div>
              <label htmlFor="language" className="block text-sm font-sans text-text-muted mb-1.5">
                Interview Language
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full sm:w-48 bg-white border border-card-border rounded-lg px-4 py-3 text-sm font-sans text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
                <option value="Hindi">Hindi</option>
                <option value="Portuguese">Portuguese</option>
                <option value="Mandarin Chinese">Mandarin Chinese</option>
                <option value="Japanese">Japanese</option>
                <option value="Korean">Korean</option>
                <option value="Arabic">Arabic</option>
                <option value="Italian">Italian</option>
                <option value="Dutch">Dutch</option>
              </select>
            </div>

            {/* Welcome Message */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="welcomeMessage" className="text-sm font-sans text-text-muted">
                  Welcome Message
                </label>
                <EnhanceButton fieldName="welcome_message" enhancingField={enhancingField} enhanceBusy={enhanceBusy} onEnhance={enhanceField} onCancel={cancelEnhance} />
              </div>
              <textarea
                id="welcomeMessage"
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                rows={3}
                className="w-full bg-white border border-card-border rounded-lg px-4 py-3 text-sm font-sans text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all resize-none"
                placeholder="Leave blank for default: &quot;Hi! Thanks for taking the time. This survey is about {title}...&quot;"
              />
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-sans text-text-muted mb-1.5">Visibility</label>
              <div className="flex gap-2">
                {[
                  { value: 'private', icon: Lock, label: 'Private' },
                  { value: 'team', icon: Users, label: 'Team' },
                  { value: 'org', icon: Building2, label: 'Org' },
                ].map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setVisibility(value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-sans transition-all ${
                      visibility === value
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-card-border bg-white text-text-muted hover:border-accent/30'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
              <p
                className="mt-1 text-xs text-text-muted/60 font-sans"
                title={visibility === 'private' && isEdit && createdBy !== user?.user_id && createdByEmail
                  ? `Creator: ${createdByName} (${createdByEmail})`
                  : undefined}
              >
                {visibility === 'private' && (isEdit && createdBy !== user?.user_id
                  ? `Only ${createdByName || 'the creator'} and org admins can see this survey.`
                  : 'Only you and org admins can see this survey.')}
                {visibility === 'team' && 'Everyone in the selected teams can see this survey.'}
                {visibility === 'org' && 'Everyone in your organization can see this survey.'}
              </p>
            </div>

            {/* Team selector (when team visibility) */}
            {visibility === 'team' && (
              <div>
                <label className="block text-sm font-sans text-text-muted mb-1.5">
                  Select Teams
                </label>
                <div className="space-y-2">
                  {teams.length === 0 ? (
                    <p className="text-xs text-text-muted/60 font-sans">No teams found. Create teams in Settings first.</p>
                  ) : (
                    teams.map((team) => (
                      <div key={team.id}>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={teamIds.includes(team.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTeamIds([...teamIds, team.id]);
                              } else {
                                setTeamIds(teamIds.filter((id) => id !== team.id));
                              }
                            }}
                            className="rounded border-card-border text-accent focus:ring-accent"
                          />
                          <span className="text-sm text-text-primary font-sans">{team.name}</span>
                        </label>
                        {/* Sub-teams */}
                        {team.sub_teams?.map((sub) => (
                          <label key={sub.id} className="flex items-center gap-2 cursor-pointer ml-6 mt-1">
                            <input
                              type="checkbox"
                              checked={teamIds.includes(sub.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTeamIds([...teamIds, sub.id]);
                                } else {
                                  setTeamIds(teamIds.filter((id) => id !== sub.id));
                                }
                              }}
                              className="rounded border-card-border text-accent focus:ring-accent"
                            />
                            <span className="text-sm text-text-muted font-sans">{sub.name}</span>
                          </label>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Webhook URL */}
            <div>
              <label htmlFor="webhookUrl" className="block text-sm font-sans text-text-muted mb-1.5">
                Webhook URL <span className="text-text-muted/50">(optional)</span>
              </label>
              <input
                id="webhookUrl"
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full bg-white border border-card-border rounded-lg px-4 py-3 text-sm font-sans text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                placeholder="https://hooks.slack.com/services/..."
              />
              <p className="mt-1 text-xs text-text-muted/60 font-sans">
                We'll POST interview results to this URL when an interview completes.
              </p>
            </div>

            {/* Email notification toggle */}
            <div className="flex items-center gap-3">
              <input
                id="notifyOnCompletion"
                type="checkbox"
                checked={notifyOnCompletion}
                onChange={(e) => setNotifyOnCompletion(e.target.checked)}
                className="w-4 h-4 rounded border-card-border text-accent focus:ring-accent/30"
              />
              <label
                htmlFor="notifyOnCompletion"
                className="text-sm font-sans text-text-muted"
                title={isEdit && createdBy !== user?.user_id && createdByEmail
                  ? `Notification will be sent to ${createdByName} (${createdByEmail})`
                  : 'Notification will be sent to your email on completion'}
              >
                {isEdit && createdBy !== user?.user_id && createdByName
                  ? `Email ${createdByName} when someone completes this survey`
                  : 'Email me when someone completes this survey'}
              </label>
            </div>

            {/* LLM Configuration */}
            <div className="border border-card-border rounded-lg p-4 space-y-4 bg-white/50">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-accent" />
                <span className="text-sm font-sans font-medium text-text-primary">LLM Configuration</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="llmProvider" className="block text-sm font-sans text-text-muted mb-1.5">
                    Provider
                  </label>
                  <select
                    id="llmProvider"
                    value={llmProvider}
                    onChange={(e) => {
                      setLlmProvider(e.target.value);
                      setLlmModel('');
                    }}
                    className="w-full bg-white border border-card-border rounded-lg px-4 py-3 text-sm font-sans text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                  >
                    <option value="">OpenAI (Default)</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="gemini">Google Gemini</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="llmModel" className="block text-sm font-sans text-text-muted mb-1.5">
                    Model
                  </label>
                  <input
                    id="llmModel"
                    type="text"
                    value={llmModel}
                    onChange={(e) => setLlmModel(e.target.value)}
                    className="w-full bg-white border border-card-border rounded-lg px-4 py-3 text-sm font-sans text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                    placeholder={
                      llmProvider === 'anthropic' ? 'claude-sonnet-4-6' :
                      llmProvider === 'gemini' ? 'gemini-3.1-pro-preview' :
                      'gpt-5.4-mini'
                    }
                  />
                  <p className="mt-1 text-xs text-text-muted/60 font-sans">
                    Leave blank to use the default model for the selected provider.
                  </p>
                </div>
              </div>
            </div>

            {/* How to Evaluate Responses */}
            <div className="border border-card-border rounded-lg p-4 space-y-3 bg-white/50">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-accent" />
                <span className="text-sm font-sans font-medium text-text-primary">How should we evaluate responses?</span>
                <span className="text-xs text-text-muted/50 font-sans">(optional)</span>
              </div>
              <p className="text-xs text-text-muted/70 font-sans">
                Tell the AI what matters most when reviewing your interview results. This shapes how scores, themes, and insights are generated.
              </p>
              <textarea
                id="analyticsInstructions"
                value={analyticsInstructions}
                onChange={(e) => setAnalyticsInstructions(e.target.value)}
                rows={4}
                maxLength={2000}
                className="w-full bg-white border border-card-border rounded-lg px-4 py-3 text-sm font-sans text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all resize-none"
                placeholder={"Examples:\n• Score higher when respondents give specific examples\n• Pay close attention to any safety concerns mentioned\n• Focus on customer satisfaction, not technical details"}
              />
            </div>

            {/* Questions */}
            <div>
              <label className="block text-sm font-sans text-text-muted mb-3">Questions</label>
              <div className="space-y-3">
                {questions.map((q, i) => {
                  const isExpanded = expandedInstructions.has(i);
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-sm text-text-muted font-sans mt-3 w-6 text-right shrink-0">
                        {i + 1}.
                      </span>
                      <div className="flex-1 space-y-1">
                        <textarea
                          value={q.text}
                          onChange={(e) => updateQuestion(i, e.target.value)}
                          rows={2}
                          className="w-full bg-white border border-card-border rounded-lg px-4 py-3 text-sm font-sans text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all resize-none"
                          placeholder={`Question ${i + 1}`}
                        />
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedInstructions((prev) => {
                                const next = new Set(prev);
                                if (next.has(i)) next.delete(i);
                                else next.add(i);
                                return next;
                              });
                            }}
                            className="flex items-center gap-1 text-xs text-text-muted hover:text-accent transition-colors font-sans"
                          >
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            <BotMessageSquare className="w-3 h-3" />
                            AI Instructions
                          </button>
                          {isExpanded && (
                            <input
                              type="text"
                              value={q.aiInstructions}
                              onChange={(e) => updateAiInstructions(i, e.target.value)}
                              className="w-full mt-1 bg-accent/5 border border-accent/20 rounded-lg px-3 py-2 text-xs font-sans text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                              placeholder="e.g. Drill down on this topic, ask follow-ups / Don't probe, accept as-is"
                            />
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTestingQuestion(i)}
                        disabled={!q.text.trim()}
                        className="mt-2 p-1.5 text-text-muted/40 hover:text-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Test this question"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeQuestion(i)}
                        className="mt-2 p-1.5 text-text-muted/40 hover:text-error transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
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
                  onClick={toggleAiPanel}
                  disabled={!!enhancingField}
                  className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors font-sans disabled:opacity-40 disabled:cursor-not-allowed"
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
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={!canSubmit}
                className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save as Draft'}
              </button>
              <button
                type="button"
                onClick={() => handleTestChatbot(questions)}
                disabled={!canSubmit}
                className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4" />
                {testing ? 'Saving...' : 'Test Survey'}
              </button>
              {!isAlreadyPublished && (
                <button
                  type="button"
                  onClick={() => handlePublish(questions)}
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

      {/* Question Test Panel */}
      <AnimatePresence>
        {testingQuestion !== null && questions[testingQuestion] && (
          <QuestionTestPanel
            key={testingQuestion}
            question={questions[testingQuestion]}
            questionIndex={testingQuestion}
            surveyTitle={title}
            surveyGoal={goal}
            surveyContext={context}
            personalityTone={personalityTone}
            llmProvider={llmProvider}
            llmModel={llmModel}
            onClose={() => setTestingQuestion(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
