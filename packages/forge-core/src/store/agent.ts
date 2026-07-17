import { create } from 'zustand';
import type { AgentEvent, AgentResult } from '../agent/types.js';

interface AgentState {
  status: 'idle' | 'thinking' | 'executing' | 'done' | 'error';
  progress: string;
  events: AgentEvent[];
  result: AgentResult | null;
  error: string | null;
  abortController: AbortController | null;

  setStatus: (status: AgentState['status']) => void;
  setProgress: (progress: string) => void;
  addEvent: (event: AgentEvent) => void;
  setResult: (result: AgentResult) => void;
  setError: (error: string) => void;
  setAbortController: (ctrl: AbortController | null) => void;
  reset: () => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  status: 'idle',
  progress: '',
  events: [],
  result: null,
  error: null,
  abortController: null,

  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  addEvent: (event) =>
    set((state) => ({ events: [...state.events, event] })),
  setResult: (result) => set({ result, status: 'done' }),
  setError: (error) => set({ error, status: 'error' }),
  setAbortController: (ctrl) => set({ abortController: ctrl }),
  reset: () =>
    set({
      status: 'idle',
      progress: '',
      events: [],
      result: null,
      error: null,
      abortController: null,
    }),
}));
