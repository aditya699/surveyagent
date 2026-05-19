// ---------------------------------------------------------------------------
// useFeedbackDashboard — debounced backend extraction on transcript change.
//
// Each time `transcript` updates, schedule a fresh extraction 1.5s later.
// If the transcript updates again before the timer fires, reset. If a
// request is in flight when a new one starts, abort the old one so stale
// responses never overwrite fresher state.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import { extractDashboard } from '../api';

const DEBOUNCE_MS = 1500;
const MIN_CHARS = 40; // don't bother extracting before there's real signal

const EMPTY_DASHBOARD = {
  overall_score: null,
  sentiment: null,
  summary: '',
  key_themes: [],
  strengths: [],
  concerns: [],
  improvements: [],
  quotes: [],
};

export function useFeedbackDashboard(transcript, { enabled = true } = {}) {
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [extracting, setExtracting] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const timerRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    if (!transcript || transcript.length < MIN_CHARS) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      if (abortRef.current) {
        try { abortRef.current.abort(); } catch {}
      }
      const controller = new AbortController();
      abortRef.current = controller;
      setExtracting(true);

      extractDashboard(transcript, controller.signal)
        .then((data) => {
          if (controller.signal.aborted) return;
          setDashboard({ ...EMPTY_DASHBOARD, ...data });
          setLastUpdatedAt(Date.now());
        })
        .catch((err) => {
          // Aborts are expected when a newer transcript supersedes this one.
          if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
          // eslint-disable-next-line no-console
          console.error('Dashboard extraction failed:', err);
        })
        .finally(() => {
          if (abortRef.current === controller) {
            setExtracting(false);
            abortRef.current = null;
          }
        });
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [transcript, enabled]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) {
        try { abortRef.current.abort(); } catch {}
      }
    };
  }, []);

  const reset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) {
      try { abortRef.current.abort(); } catch {}
    }
    setDashboard(EMPTY_DASHBOARD);
    setLastUpdatedAt(null);
    setExtracting(false);
  };

  return { dashboard, extracting, lastUpdatedAt, reset };
}
