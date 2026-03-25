const DEFAULT_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'themes', label: 'Themes & Insights' },
  { key: 'questions', label: 'Questions' },
  { key: 'transcript', label: 'Transcript' },
];

export default function TabBar({ activeTab, onChange, messageCount, tabs }) {
  const tabList = tabs || DEFAULT_TABS;
  return (
    <div className="flex border-b border-card-border bg-white overflow-x-auto">
      {tabList.map((tab) => {
        const isActive = activeTab === tab.key;
        const label = tab.key === 'transcript' && messageCount != null
          ? `${tab.label} (${messageCount})`
          : tab.label;

        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`px-5 py-3 text-sm font-sans whitespace-nowrap transition-colors border-b-2 ${
              isActive
                ? 'text-accent border-accent font-medium'
                : 'text-text-muted border-transparent hover:text-text-primary'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
