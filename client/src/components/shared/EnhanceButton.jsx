import { useState, useRef, useEffect } from 'react';
import { Sparkles, Loader2, Send } from 'lucide-react';

export default function EnhanceButton({ fieldName, enhancingField, enhanceBusy, onEnhance, onCancel }) {
  const [open, setOpen] = useState(false);
  const [instructions, setInstructions] = useState('');
  const popoverRef = useRef(null);
  const inputRef = useRef(null);

  const isEnhancing = enhancingField === fieldName;
  const disabled = enhanceBusy && !isEnhancing;

  // Close popover on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
        setInstructions('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus input when popover opens
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // Close popover when enhancement starts
  useEffect(() => {
    if (isEnhancing) {
      setOpen(false);
      setInstructions('');
    }
  }, [isEnhancing]);

  const handleEnhance = () => {
    onEnhance(fieldName, instructions);
  };

  if (isEnhancing) {
    return (
      <button
        type="button"
        onClick={onCancel}
        className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors font-sans"
      >
        <Loader2 className="w-3 h-3 animate-spin" /> Cancel
      </button>
    );
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors font-sans disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Sparkles className="w-3 h-3" /> Enhance with AI
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 bg-white border border-card-border rounded-lg shadow-lg p-2.5 w-72">
          <div className="flex gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleEnhance(); } }}
              placeholder="e.g., Make it crisp, Keep it formal..."
              className="flex-1 text-xs bg-background border border-card-border rounded-md px-2.5 py-1.5 font-sans text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent"
            />
            <button
              type="button"
              onClick={handleEnhance}
              className="flex items-center justify-center w-7 h-7 rounded-md bg-accent text-white hover:bg-accent-hover transition-colors shrink-0"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
