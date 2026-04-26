import { useState, useEffect, useCallback } from 'react';

const RATE_LIMIT = 20;
const WARNING_AT = 3;                          // show warning when this many messages remain
const WINDOW_MS  = 60 * 60 * 1000;            // 1 hour
const BLOCK_MS   = 2 * 60 * 60 * 1000;        // 2 hours (fallback if backend omits retry_after)

function storageKey(userId) {
  // Key per-user so different accounts on the same browser don't share state
  return userId ? `sa_chat_rate_${userId}` : null;
}

function loadData(userId) {
  const key = storageKey(userId);
  if (!key) return { windowStart: Date.now(), count: 0, blockedUntil: null };
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { windowStart: Date.now(), count: 0, blockedUntil: null };
    return JSON.parse(raw);
  } catch {
    return { windowStart: Date.now(), count: 0, blockedUntil: null };
  }
}

function persist(data, userId) {
  const key = storageKey(userId);
  if (!key) return;
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

function formatCountdown(ms) {
  if (ms <= 0) return '';
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function useChatRateLimit(userId) {
  const [data, setData] = useState(() => loadData(userId));
  const [countdown, setCountdown] = useState('');

  // Re-load when userId resolves (e.g. on login)
  useEffect(() => {
    setData(loadData(userId));
  }, [userId]);

  // Persist whenever data changes
  useEffect(() => { persist(data, userId); }, [data, userId]);

  // Countdown tick — also auto-unblocks when timer hits zero
  useEffect(() => {
    if (!data.blockedUntil) { setCountdown(''); return; }

    const tick = () => {
      const remaining = data.blockedUntil - Date.now();
      if (remaining <= 0) {
        setData({ windowStart: Date.now(), count: 0, blockedUntil: null });
        setCountdown('');
      } else {
        setCountdown(formatCountdown(remaining));
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [data.blockedUntil]);

  // Derive values (re-check window expiry on each render)
  const now = Date.now();
  const windowExpired  = now - data.windowStart > WINDOW_MS;
  const effectiveCount = windowExpired ? 0 : data.count;
  const remaining      = Math.max(0, RATE_LIMIT - effectiveCount);
  const isBlocked      = !!(data.blockedUntil && data.blockedUntil > now);
  const showWarning    = !isBlocked && remaining <= WARNING_AT && remaining > 0;

  // Called on every completed or errored request (server counted it either way)
  const incrementCount = useCallback(() => {
    setData((prev) => {
      const now = Date.now();
      if (now - prev.windowStart > WINDOW_MS) {
        return { windowStart: now, count: 1, blockedUntil: null };
      }
      return { ...prev, count: prev.count + 1 };
    });
  }, []);

  // Called when the backend returns 429
  const handleRateLimit = useCallback((retryAfterUnix) => {
    const blockedUntil = retryAfterUnix
      ? retryAfterUnix * 1000
      : Date.now() + BLOCK_MS;
    setData((prev) => ({ ...prev, blockedUntil }));
  }, []);

  return { isBlocked, showWarning, remaining, countdown, incrementCount, handleRateLimit };
}
