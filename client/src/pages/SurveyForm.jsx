import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, LogOut, Plus, X, Sparkles, Loader2, MessageSquare, ChevronDown, ChevronRight, BotMessageSquare } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSurveyForm } from '../hooks/useSurveyForm';
import { useQuestionManager } from '../hooks/useQuestionManager';
import { useAiGeneration } from '../hooks/useAiGeneration';
import { useFieldEnhance } from '../hooks/useFieldEnhance';

export default function SurveyForm() {
  const { id } = useParams();
  const { logout } = useAuth();

  const { questions, setQuestions, addQuestion, updateQuestion, updateAiInstructions, removeQuestion } =
    useQuestionManager();
  const [expandedInstructions, setExpandedInstructions] = useState(new Set());

  const {
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
  } = useSurveyForm({ id, setQuestions });

  const {
    showAiPanel,
    aiNumQuestions, setAiNumQuestions,
    aiAdditionalInfo, setAiAdditionalInfo,
    aiGenerating, aiError,
    handleAiGenerate, handleAiCancel, toggleAiPanel,
  } = useAiGeneration({ title, description, goal, context, setQuestions });

  const {
    enhancingField, enhanceError,
    enhanceField, cancelEnhance,
  } = useFieldEnhance({
    title, description, goal, context, welcomeMessage,
    setTitle, setDescription, setGoal, setContext, setWelcomeMessage,
  });

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
                <button
                  type="button"
                  onClick={() => enhancingField === 'title' ? cancelEnhance() : enhanceField('title')}
                  disabled={enhanceBusy && enhancingField !== 'title'}
                  className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors font-sans disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {enhancingField === 'title' ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> Cancel</>
                  ) : (
                    <><Sparkles className="w-3 h-3" /> Enhance with AI</>
                  )}
                </button>
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
                <button
                  type="button"
                  onClick={() => enhancingField === 'description' ? cancelEnhance() : enhanceField('description')}
                  disabled={enhanceBusy && enhancingField !== 'description'}
                  className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors font-sans disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {enhancingField === 'description' ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> Cancel</>
                  ) : (
                    <><Sparkles className="w-3 h-3" /> Enhance with AI</>
                  )}
                </button>
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
                <button
                  type="button"
                  onClick={() => enhancingField === 'goal' ? cancelEnhance() : enhanceField('goal')}
                  disabled={enhanceBusy && enhancingField !== 'goal'}
                  className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors font-sans disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {enhancingField === 'goal' ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> Cancel</>
                  ) : (
                    <><Sparkles className="w-3 h-3" /> Enhance with AI</>
                  )}
                </button>
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
                <button
                  type="button"
                  onClick={() => enhancingField === 'context' ? cancelEnhance() : enhanceField('context')}
                  disabled={enhanceBusy && enhancingField !== 'context'}
                  className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors font-sans disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {enhancingField === 'context' ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> Cancel</>
                  ) : (
                    <><Sparkles className="w-3 h-3" /> Enhance with AI</>
                  )}
                </button>
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
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="welcomeMessage" className="text-sm font-sans text-text-muted">
                  Welcome Message
                </label>
                <button
                  type="button"
                  onClick={() => enhancingField === 'welcome_message' ? cancelEnhance() : enhanceField('welcome_message')}
                  disabled={enhanceBusy && enhancingField !== 'welcome_message'}
                  className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors font-sans disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {enhancingField === 'welcome_message' ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> Cancel</>
                  ) : (
                    <><Sparkles className="w-3 h-3" /> Enhance with AI</>
                  )}
                </button>
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

            {/* Questions */}
            <div>
              <label className="block text-sm font-sans text-text-muted mb-3">Questions</label>
              <div className="space-y-3">
                {questions.map((q, i) => {
                  const isExpanded = expandedInstructions.has(i) || !!q.aiInstructions;
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
    </div>
  );
}
