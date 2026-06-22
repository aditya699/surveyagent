import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, LogOut, Plus, X, Play, Sparkles, Loader2, MessageSquare,
  ChevronDown, ChevronRight, BotMessageSquare, Cpu, Lock, Users, Building2,
  BarChart3, FileText, SlidersHorizontal, Bell, ListChecks, HelpCircle,
} from 'lucide-react';
import QuestionTestPanel from '../components/interview/QuestionTestPanel';
import { EnhanceButton } from '../components/shared';
import { useAuth } from '../hooks/useAuth';
import { useSurveyForm } from '../hooks/useSurveyForm';
import { useQuestionManager } from '../hooks/useQuestionManager';
import { useAiGeneration } from '../hooks/useAiGeneration';
import { useFieldEnhance } from '../hooks/useFieldEnhance';
import { getTeams } from '../api';

// Shared input class to reduce repetition
const inputClass =
  'w-full bg-white border border-card-border rounded-lg px-4 py-3 text-sm font-sans text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all';

const textareaClass = `${inputClass} resize-none`;

function SectionCard({ icon: Icon, title, hint, children, className = '' }) {
  return (
    <section className={`bg-white border border-card-border rounded-2xl p-5 sm:p-6 ${className}`}>
      <div className="flex items-center gap-2 pb-3 mb-5 border-b border-card-border">
        <Icon className="w-4 h-4 text-accent" />
        <h2 className="text-base font-serif text-text-primary">{title}</h2>
        {hint && (
          <span className="text-xs text-text-muted/60 font-sans ml-auto hidden sm:inline">{hint}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ htmlFor, children, required, optional, enhance }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <label htmlFor={htmlFor} className="text-sm font-sans text-text-muted">
        {children}
        {required && <span className="text-error"> *</span>}
        {optional && <span className="text-text-muted/50"> (optional)</span>}
      </label>
      {enhance}
    </div>
  );
}

function HelpFab() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const tips = [
    { title: 'Start with the basics', body: 'A clear Title and Goal help the AI ask better questions.' },
    { title: 'Use AI to generate questions', body: 'Fill in Goal & Context, then click "AI Generate Questions".' },
    { title: 'Set the tone', body: 'Pick an Interviewer Tone that matches your audience.' },
    { title: 'Test before publishing', body: 'Use "Test Survey" to run a full mock interview yourself.' },
  ];

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-40">
      {/* Popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-14 right-0 w-72 bg-white border border-card-border rounded-2xl shadow-lg p-4"
          >
            <div className="flex items-center gap-2 pb-2 mb-3 border-b border-card-border">
              <HelpCircle className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-serif text-text-primary">Quick tips</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ml-auto text-text-muted/60 hover:text-text-primary transition-colors"
                aria-label="Close help"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <ul className="space-y-3">
              {tips.map((t, i) => (
                <li key={i} className="text-xs font-sans">
                  <p className="text-text-primary font-medium">{t.title}</p>
                  <p className="text-text-muted/80 leading-relaxed mt-0.5">{t.body}</p>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger button with hover tooltip */}
      <div className="relative group">
        {!open && (
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs font-sans bg-dark text-white px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
            Need help?
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-accent text-white shadow-lg hover:bg-accent-hover transition-all focus:outline-none focus:ring-2 focus:ring-accent/50"
          aria-label="Need help"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

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
      <header className="bg-white border-b border-card-border px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-30">
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
          {isEdit && (
            <span className={`hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-sans font-medium ${
              isAlreadyPublished ? 'bg-success/10 text-success' : 'bg-text-muted/10 text-text-muted'
            }`}>
              {isAlreadyPublished ? 'Published' : 'Draft'}
            </span>
          )}
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
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <form onSubmit={(e) => handleSave(e, questions)} className="space-y-6">
            {/* Error banner */}
            {(error || enhanceError) && (
              <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-3 text-sm text-error font-sans">
                {error || enhanceError}
              </div>
            )}

            {/* ─── Survey Details ─── */}
            <SectionCard icon={FileText} title="Survey Details" hint="The basics">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Title — full width */}
                <div className="md:col-span-2">
                  <FieldLabel
                    htmlFor="title"
                    required
                    enhance={<EnhanceButton fieldName="title" enhancingField={enhancingField} enhanceBusy={enhanceBusy} onEnhance={enhanceField} onCancel={cancelEnhance} />}
                  >
                    Title
                  </FieldLabel>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Customer Satisfaction Survey"
                  />
                </div>

                {/* Description — full width */}
                <div className="md:col-span-2">
                  <FieldLabel
                    htmlFor="description"
                    enhance={<EnhanceButton fieldName="description" enhancingField={enhancingField} enhanceBusy={enhanceBusy} onEnhance={enhanceField} onCancel={cancelEnhance} />}
                  >
                    Description
                  </FieldLabel>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className={textareaClass}
                    placeholder="Brief description of this survey"
                  />
                </div>

                {/* Goal | Context — 2 cols on md+ */}
                <div>
                  <FieldLabel
                    htmlFor="goal"
                    enhance={<EnhanceButton fieldName="goal" enhancingField={enhancingField} enhanceBusy={enhanceBusy} onEnhance={enhanceField} onCancel={cancelEnhance} />}
                  >
                    Goal
                  </FieldLabel>
                  <textarea
                    id="goal"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    rows={4}
                    className={textareaClass}
                    placeholder="What do you want to learn from this survey?"
                  />
                </div>

                <div>
                  <FieldLabel
                    htmlFor="context"
                    enhance={<EnhanceButton fieldName="context" enhancingField={enhancingField} enhanceBusy={enhanceBusy} onEnhance={enhanceField} onCancel={cancelEnhance} />}
                  >
                    Context
                  </FieldLabel>
                  <textarea
                    id="context"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    rows={4}
                    className={textareaClass}
                    placeholder="Target audience, tone, constraints..."
                  />
                </div>

                {/* Welcome — full width */}
                <div className="md:col-span-2">
                  <FieldLabel
                    htmlFor="welcomeMessage"
                    enhance={<EnhanceButton fieldName="welcome_message" enhancingField={enhancingField} enhanceBusy={enhanceBusy} onEnhance={enhanceField} onCancel={cancelEnhance} />}
                  >
                    Welcome Message
                  </FieldLabel>
                  <textarea
                    id="welcomeMessage"
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    rows={3}
                    className={textareaClass}
                    placeholder='Leave blank for default: "Hi! Thanks for taking the time. This survey is about {title}..."'
                  />
                </div>
              </div>
            </SectionCard>

            {/* ─── Interview Settings  |  Notifications ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard icon={SlidersHorizontal} title="Interview Settings" hint="Duration, tone, access">
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="estimatedDuration" className="block text-sm font-sans text-text-muted mb-1.5">
                        Duration <span className="text-text-muted/50">(min)</span>
                      </label>
                      <input
                        id="estimatedDuration"
                        type="number"
                        min={1}
                        max={60}
                        value={estimatedDuration}
                        onChange={(e) => setEstimatedDuration(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="personalityTone" className="block text-sm font-sans text-text-muted mb-1.5">
                        Interviewer Tone
                      </label>
                      <select
                        id="personalityTone"
                        value={personalityTone}
                        onChange={(e) => setPersonalityTone(e.target.value)}
                        className={inputClass}
                      >
                        <option value="professional">Professional</option>
                        <option value="friendly">Friendly</option>
                        <option value="casual">Casual</option>
                        <option value="fun">Fun</option>
                      </select>
                    </div>
                  </div>

                  {/* Visibility */}
                  <div>
                    <label className="block text-sm font-sans text-text-muted mb-1.5">Visibility</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'private', icon: Lock, label: 'Private' },
                        { value: 'team', icon: Users, label: 'Team' },
                        { value: 'org', icon: Building2, label: 'Org' },
                      ].map(({ value, icon: Icon, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setVisibility(value)}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-sans transition-all ${
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
                      className="mt-2 text-xs text-text-muted/60 font-sans"
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

                  {/* Team selector — conditional */}
                  {visibility === 'team' && (
                    <div>
                      <label className="block text-sm font-sans text-text-muted mb-1.5">
                        Select Teams
                      </label>
                      <div className="bg-background border border-card-border rounded-lg p-3 max-h-44 overflow-y-auto">
                        {teams.length === 0 ? (
                          <p className="text-xs text-text-muted/60 font-sans">No teams found. Create teams in Settings first.</p>
                        ) : (
                          <div className="space-y-2">
                            {teams.map((team) => (
                              <div key={team.id}>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={teamIds.includes(team.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) setTeamIds([...teamIds, team.id]);
                                      else setTeamIds(teamIds.filter((tid) => tid !== team.id));
                                    }}
                                    className="rounded border-card-border text-accent focus:ring-accent"
                                  />
                                  <span className="text-sm text-text-primary font-sans">{team.name}</span>
                                </label>
                                {team.sub_teams?.map((sub) => (
                                  <label key={sub.id} className="flex items-center gap-2 cursor-pointer ml-6 mt-1">
                                    <input
                                      type="checkbox"
                                      checked={teamIds.includes(sub.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) setTeamIds([...teamIds, sub.id]);
                                        else setTeamIds(teamIds.filter((tid) => tid !== sub.id));
                                      }}
                                      className="rounded border-card-border text-accent focus:ring-accent"
                                    />
                                    <span className="text-sm text-text-muted font-sans">{sub.name}</span>
                                  </label>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>

              <SectionCard icon={Bell} title="Notifications & Webhooks" hint="Optional">
                <div className="space-y-5">
                  <div>
                    <label htmlFor="webhookUrl" className="block text-sm font-sans text-text-muted mb-1.5">
                      Webhook URL <span className="text-text-muted/50">(optional)</span>
                    </label>
                    <input
                      id="webhookUrl"
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className={inputClass}
                      placeholder="https://hooks.slack.com/services/..."
                    />
                    <p className="mt-1.5 text-xs text-text-muted/60 font-sans">
                      We'll POST interview results to this URL when an interview completes.
                    </p>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-background border border-card-border">
                    <input
                      id="notifyOnCompletion"
                      type="checkbox"
                      checked={notifyOnCompletion}
                      onChange={(e) => setNotifyOnCompletion(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-card-border text-accent focus:ring-accent/30"
                    />
                    <label
                      htmlFor="notifyOnCompletion"
                      className="text-sm font-sans text-text-primary leading-snug cursor-pointer"
                      title={isEdit && createdBy !== user?.user_id && createdByEmail
                        ? `Notification will be sent to ${createdByName} (${createdByEmail})`
                        : 'Notification will be sent to your email on completion'}
                    >
                      {isEdit && createdBy !== user?.user_id && createdByName
                        ? `Email ${createdByName} when someone completes this survey`
                        : 'Email me when someone completes this survey'}
                      <span className="block mt-0.5 text-xs text-text-muted/60">
                        Sends a notification on each completed interview.
                      </span>
                    </label>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* ─── AI Configuration ─── */}
            <SectionCard icon={Cpu} title="AI Configuration" hint="Provider & evaluation">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                    className={inputClass}
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
                    className={inputClass}
                    placeholder={
                      llmProvider === 'anthropic' ? 'claude-sonnet-4-6' :
                      llmProvider === 'gemini' ? 'gemini-3.1-pro-preview' :
                      'gpt-5.4-mini'
                    }
                  />
                  <p className="mt-1.5 text-xs text-text-muted/60 font-sans">
                    Leave blank to use the default model for the selected provider.
                  </p>
                </div>

                {/* Evaluation instructions — full width inside card */}
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-accent" />
                    <label htmlFor="analyticsInstructions" className="text-sm font-sans text-text-muted">
                      How should we evaluate responses? <span className="text-text-muted/50">(optional)</span>
                    </label>
                  </div>
                  <p className="text-xs text-text-muted/70 font-sans mb-2">
                    Tell the AI what matters most when reviewing your interview results. Shapes scores, themes and insights.
                  </p>
                  <textarea
                    id="analyticsInstructions"
                    value={analyticsInstructions}
                    onChange={(e) => setAnalyticsInstructions(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    className={textareaClass}
                    placeholder={"Examples:\n• Score higher when respondents give specific examples\n• Pay close attention to any safety concerns mentioned\n• Focus on customer satisfaction, not technical details"}
                  />
                </div>
              </div>
            </SectionCard>

            {/* ─── Questions ─── */}
            <SectionCard icon={ListChecks} title="Questions" hint={`${questions.length} total`}>
              <div className="space-y-3">
                {questions.map((q, i) => {
                  const isExpanded = expandedInstructions.has(i);
                  return (
                    <div key={i} className="group flex items-start gap-2 p-3 rounded-lg border border-card-border bg-background hover:border-accent/30 transition-colors">
                      <span className="text-sm text-text-muted font-sans mt-3 w-6 text-right shrink-0">
                        {i + 1}.
                      </span>
                      <div className="flex-1 space-y-1 min-w-0">
                        <textarea
                          value={q.text}
                          onChange={(e) => updateQuestion(i, e.target.value)}
                          rows={2}
                          className={textareaClass}
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
                      <div className="flex flex-col gap-1 mt-1">
                        <button
                          type="button"
                          onClick={() => setTestingQuestion(i)}
                          disabled={!q.text.trim()}
                          className="p-1.5 text-text-muted/40 hover:text-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Test this question"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeQuestion(i)}
                          className="p-1.5 text-text-muted/40 hover:text-error transition-colors"
                          title="Remove"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-4">
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

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                            className="w-full bg-white border border-card-border rounded-lg px-3 py-2 text-sm font-sans text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                          />
                        </div>
                        <div className="sm:col-span-2">
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
            </SectionCard>

            {/* Inline actions */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleTestChatbot(questions)}
                disabled={!canSubmit}
                className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4" />
                {testing ? 'Saving...' : 'Test Survey'}
              </button>
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

      {/* Floating Help Button */}
      <HelpFab />

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
