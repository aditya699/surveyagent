import { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown } from 'lucide-react';

export default function ExportButton({ options, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!options || options.length === 0) return null;

  // Single option — render as a simple button
  if (options.length === 1) {
    return (
      <button
        onClick={options[0].onClick}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-medium border border-card-border text-text-muted hover:text-text-primary hover:bg-white transition-colors ${className}`}
      >
        <Download className="w-3.5 h-3.5" />
        {options[0].label}
      </button>
    );
  }

  // Multiple options — dropdown
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-medium border border-card-border text-text-muted hover:text-text-primary hover:bg-white transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        Export
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-card-border rounded-lg shadow-lg z-10 min-w-[180px] py-1">
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => {
                opt.onClick();
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-xs font-sans text-text-primary hover:bg-background transition-colors"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
