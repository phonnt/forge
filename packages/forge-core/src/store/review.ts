import { create } from 'zustand';
import type { ReviewSession, ReviewFinding } from '../agent/review.js';

interface ReviewState {
  session: ReviewSession | null;
  isActive: boolean;

  startSession: (source: string, url: string) => void;
  updateProgress: (progress: string) => void;
  addFinding: (finding: ReviewFinding) => void;
  setSummary: (summary: string) => void;
  complete: () => void;
  setError: () => void;
  reset: () => void;
}

function createSession(source: string, url: string): ReviewSession {
  return {
    id: `review-${Date.now()}`,
    source,
    url,
    status: 'fetching',
    progress: 'Initializing...',
    findings: [],
    summary: '',
    startedAt: new Date(),
  };
}

export const useReviewStore = create<ReviewState>((set) => ({
  session: null,
  isActive: false,

  startSession: (source, url) =>
    set({ session: createSession(source, url), isActive: true }),

  updateProgress: (progress) =>
    set((state) => ({
      session: state.session ? { ...state.session, progress } : null,
    })),

  addFinding: (finding) =>
    set((state) => ({
      session: state.session
        ? { ...state.session, findings: [...state.session.findings, finding] }
        : null,
    })),

  setSummary: (summary) =>
    set((state) => ({
      session: state.session ? { ...state.session, summary } : null,
    })),

  complete: () =>
    set((state) => ({
      session: state.session
        ? { ...state.session, status: 'complete', completedAt: new Date() }
        : null,
    })),

  setError: () =>
    set((state) => ({
      session: state.session ? { ...state.session, status: 'error' } : null,
    })),

  reset: () => set({ session: null, isActive: false }),
}));
