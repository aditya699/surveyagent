import { useState } from 'react';

const FIELDS = [
  { key: 'name', label: 'Name', type: 'text', placeholder: 'Your name' },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
  { key: 'age', label: 'Age', type: 'number', placeholder: 'Your age' },
  {
    key: 'gender',
    label: 'Gender',
    type: 'select',
    options: ['', 'Male', 'Female', 'Non-binary', 'Prefer not to say'],
  },
  { key: 'occupation', label: 'Occupation', type: 'text', placeholder: 'Your occupation' },
  { key: 'phone_number', label: 'Phone', type: 'tel', placeholder: '+1 (555) 000-0000' },
];

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Hindi', 'Portuguese',
  'Mandarin Chinese', 'Japanese', 'Korean', 'Arabic', 'Italian', 'Dutch',
  'Russian', 'Turkish', 'Polish', 'Swedish', 'Thai', 'Vietnamese',
  'Indonesian', 'Bengali',
];

const inputClass =
  'w-full rounded-xl border border-card-border bg-background px-4 py-3 text-sm font-sans text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors';

export default function RespondentForm({ onSubmit, loading }) {
  const [form, setForm] = useState({});
  const [language, setLanguage] = useState('English');

  const update = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    // Strip empty strings, convert age to int
    const cleaned = {};
    for (const [k, v] of Object.entries(form)) {
      if (v === '' || v == null) continue;
      cleaned[k] = k === 'age' ? parseInt(v, 10) : v;
    }
    onSubmit(Object.keys(cleaned).length > 0 ? cleaned : null, language);
  };

  const handleSkip = () => onSubmit(null, language);

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div>
        <h3 className="text-lg font-serif text-text-primary mb-1">
          Before we begin
        </h3>
        <p className="text-sm font-sans text-text-muted">
          Share a bit about yourself (all fields are optional).
        </p>
      </div>

      {/* Language selector */}
      <div>
        <label className="block text-xs font-sans text-text-muted mb-1.5">
          Interview Language
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className={inputClass + ' sm:w-56'}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FIELDS.map(({ key, label, type, placeholder, options }) => (
          <div key={key}>
            <label className="block text-xs font-sans text-text-muted mb-1.5">
              {label}
            </label>
            {type === 'select' ? (
              <select
                value={form[key] || ''}
                onChange={(e) => update(key, e.target.value)}
                className={inputClass}
              >
                {options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt || 'Select...'}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={type}
                value={form[key] || ''}
                onChange={(e) => update(key, e.target.value)}
                placeholder={placeholder}
                className={inputClass}
                min={type === 'number' ? 1 : undefined}
                max={type === 'number' ? 150 : undefined}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary text-sm">
          {loading ? 'Starting...' : 'Start Interview'}
        </button>
        <button
          type="button"
          onClick={handleSkip}
          disabled={loading}
          className="btn-secondary text-sm"
        >
          Skip
        </button>
      </div>
    </form>
  );
}
