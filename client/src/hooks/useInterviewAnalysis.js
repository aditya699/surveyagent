import { useState, useRef, useCallback } from 'react';
import { streamAnalyzeInterview } from '../api/ai';

export function useInterviewAnalysis() {
  const [analysis, setAnalysis] = useState(null);
  const [rawStream, setRawStream] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const abortRef = useRef(null);

  const startAnalysis = useCallback(async (interviewId) => {
    setAnalysisError('');
    setAnalysis(null);
    setRawStream('');
    setAnalyzing(true);

    const controller = new AbortController();
    abortRef.current = controller;

    await streamAnalyzeInterview({
      interviewId,
      onToken: (token) => {
        setRawStream((prev) => prev + token);
      },
      onDone: () => {
        setAnalyzing(false);
        abortRef.current = null;
        // Parse the accumulated stream into structured analysis
        setRawStream((final) => {
          try {
            let clean = final.trim();
            if (clean.startsWith('```')) {
              clean = clean.split('\n').slice(1).join('\n');
            }
            if (clean.endsWith('```')) {
              clean = clean.slice(0, -3);
            }
            clean = clean.trim();
            setAnalysis(JSON.parse(clean));
          } catch {
            setAnalysisError('Failed to parse analysis. Try again.');
          }
          return final;
        });
      },
      onError: (errMsg) => {
        setAnalysisError(errMsg || 'Failed to analyze interview');
        setAnalyzing(false);
        abortRef.current = null;
      },
      signal: controller.signal,
    });
  }, []);

  const cancelAnalysis = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setAnalyzing(false);
    setAnalysisError('');
  }, []);

  const setAnalysisFromCache = useCallback((cached) => {
    setAnalysis(cached);
  }, []);

  return {
    analysis,
    rawStream,
    analyzing,
    analysisError,
    startAnalysis,
    cancelAnalysis,
    setAnalysisFromCache,
  };
}
