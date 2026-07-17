import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export type WizardStep = 'select_provider' | 'enter_api_key' | 'select_model';
export type ProviderType = 'anthropic' | 'openai' | 'copilot' | 'opencode-zen' | 'opencode-go' | 'ollama' | 'gemini';

export const PROVIDER_LIST = [
  { id: 'anthropic' as const, name: 'Anthropic', desc: 'Claude Sonnet, Opus, Haiku' },
  { id: 'openai' as const, name: 'OpenAI', desc: 'GPT-4o, o1, o3-mini' },
  { id: 'copilot' as const, name: 'GitHub Copilot', desc: 'Via GitHub authentication' },
  { id: 'opencode-zen' as const, name: 'OpenCode Zen', desc: 'Premium models, pay-as-you-go' },
  { id: 'opencode-go' as const, name: 'OpenCode Go', desc: '$10/mo subscription, open models' },
  { id: 'ollama' as const, name: 'Ollama', desc: 'Local models' },
  { id: 'gemini' as const, name: 'Google Gemini', desc: 'Gemini 2.5 Pro, Flash' },
];

export const PROVIDER_DEFAULTS: Record<ProviderType, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  copilot: 'claude-sonnet-4',
  'opencode-zen': 'claude-sonnet-5',
  'opencode-go': 'deepseek-v4-pro',
  ollama: 'llama3.1',
  gemini: 'gemini-2.5-pro',
};

export const PROVIDER_MODELS: Record<ProviderType, string[]> = {
  anthropic: [
    'claude-sonnet-4-20250514',
    'claude-opus-4-20250514',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
  ],
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'o1',
    'o3-mini',
  ],
  copilot: [
    'claude-sonnet-4',
    'gpt-4o',
    'o1',
  ],
  'opencode-zen': [
    'claude-sonnet-5',
    'claude-opus-4-8',
    'gpt-5.6-sol',
    'gpt-5.6-terra',
    'gemini-3.5-flash',
    'deepseek-v4-pro',
    'qwen3.7-max',
  ],
  'opencode-go': [
    'deepseek-v4-pro',
    'deepseek-v4-flash',
    'qwen3.7-max',
    'qwen3.7-plus',
    'kimi-k3',
    'glm-5.2',
    'grok-4.5',
    'minimax-m3',
    'mimo-v2.5',
  ],
  ollama: [
    'llama3.1',
    'llama3.1:70b',
    'codellama',
    'mistral',
    'deepseek-coder-v2',
  ],
  gemini: [
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
  ],
};

export const PROVIDER_NAMES = PROVIDER_LIST.map((p) => p.id);

const AUTOCOMPLETE_COMMANDS = [
  '/review',
  '/connect',
  '/init',
  '/help',
  '/clear',
  '/quit',
  '/status',
];

interface WizardState {
  active: boolean;
  step: WizardStep;
  providerType: ProviderType | null;
  providerIndex: number;
  apiKey: string;
  modelName: string;
  modelIndex: number;
  detectedProviders: DetectedProviderInfo[];
}

let wizardGeneration = 0;

export function getWizardGeneration(): number {
  return wizardGeneration;
}

export type { WizardState };

export interface DetectedProviderInfo {
  id: string;
  name: string;
  desc: string;
  available: boolean;
  source: string;
  apiKey?: string;
  models?: string[];
}

interface ChatState {
  messages: ChatMessage[];
  inputValue: string;
  cursorPosition: number;
  autocompleteIndex: number;
  scrollOffset: number;
  inputFocused: boolean;
  commandHistory: string[];
  historyIndex: number;
  isExecuting: boolean;
  wizard: WizardState;

  addMessage: (role: ChatMessage['role'], content: string) => void;
  setInputValue: (value: string) => void;
  insertText: (text: string) => void;
  deleteChar: () => void;
  moveCursorLeft: () => void;
  moveCursorRight: () => void;
  autocompleteAccept: () => void;
  autocompleteNavigate: (direction: 'up' | 'down') => void;
  scrollUp: (amount?: number) => void;
  scrollDown: (amount?: number) => void;
  scrollToBottom: () => void;
  focusInput: () => void;
  blurInput: () => void;
  submitInput: () => string;
  clearInput: () => void;
  navigateHistory: (direction: 'up' | 'down') => void;
  setExecuting: (executing: boolean) => void;
  clearMessages: () => void;
  startWizard: (detected?: DetectedProviderInfo[]) => void;
  wizardNext: (value: string) => { done: boolean } | null;
  wizardNavigateProvider: (direction: 'up' | 'down') => void;
  wizardSelectProvider: () => { done: boolean } | null;
  wizardNavigateModel: (direction: 'up' | 'down') => void;
  wizardSelectModel: () => { done: boolean } | null;
  cancelWizard: () => void;
}

let nextId = 1;

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [
    {
      id: String(nextId++),
      role: 'system',
      content: 'Welcome to forge — AI-powered development companion.\n\nType /help to see available commands.',
      timestamp: new Date(),
    },
  ],
  inputValue: '',
  cursorPosition: 0,
  autocompleteIndex: 0,
  scrollOffset: 0,
  inputFocused: true,
  commandHistory: [],
  historyIndex: -1,
  isExecuting: false,
  wizard: {
    active: false,
    step: 'select_provider',
    providerType: null,
    providerIndex: 0,
    apiKey: '',
    modelName: '',
    modelIndex: 0,
    detectedProviders: [],
  },

  startWizard: (detected?) => {
    wizardGeneration++;
    return set({
      inputValue: '',
      cursorPosition: 0,
      wizard: {
        active: true,
        step: 'select_provider',
        providerType: null,
        providerIndex: 0,
        apiKey: '',
        modelName: '',
        modelIndex: 0,
        detectedProviders: detected ?? [],
      },
    });
  },

  wizardNext: (value: string) => {
    const state = get();
    const w = { ...state.wizard };
    const trimmed = value.trim();

    if (!trimmed) return null;

    switch (w.step) {
      case 'select_provider': {
        const match = PROVIDER_LIST.find(
          (p) => p.id === trimmed.toLowerCase() || p.name.toLowerCase().includes(trimmed.toLowerCase()),
        );
        if (!match) return null;
        w.providerType = match.id;
        w.providerIndex = PROVIDER_LIST.findIndex((p) => p.id === match.id);
        w.step = 'enter_api_key';
        const models = PROVIDER_MODELS[match.id];
        w.modelIndex = 0;
        w.modelName = models[0];
        set({ wizard: w, inputValue: '', cursorPosition: 0 });
        return { done: false };
      }
      case 'enter_api_key': {
        w.apiKey = trimmed;
        w.step = 'select_model';
        set({ wizard: w, inputValue: '', cursorPosition: 0 });
        return { done: false };
      }
      case 'select_model': {
        w.modelName = trimmed || w.modelName;
        w.step = 'select_provider';
        w.active = false;
        set({ wizard: w, inputValue: '', cursorPosition: 0 });
        return { done: true };
      }
    }
    return null;
  },

  wizardNavigateProvider: (direction) => {
    const { wizard } = get();
    if (wizard.step !== 'select_provider') return;
    let idx = wizard.providerIndex;
    if (direction === 'up') idx = Math.max(0, idx - 1);
    else idx = Math.min(PROVIDER_LIST.length - 1, idx + 1);
    set({
      wizard: {
        ...wizard,
        providerIndex: idx,
        providerType: null,
      },
    });
  },

  wizardSelectProvider: () => {
    const { wizard } = get();
    if (wizard.step !== 'select_provider') return null;
    const detected = wizard.detectedProviders[wizard.providerIndex];
    if (!detected) return null;
    const w = { ...wizard };
    w.providerType = detected.id as ProviderType;
    const models = PROVIDER_MODELS[detected.id as ProviderType] ?? [];
    w.modelIndex = 0;
    w.modelName = models[0] ?? '';
    if (detected.apiKey) {
      w.apiKey = detected.apiKey;
      w.step = 'select_model';
    } else {
      w.step = 'enter_api_key';
    }
    set({ wizard: w, inputValue: '' });
    return { done: false };
  },

  wizardNavigateModel: (direction) => {
    const { wizard } = get();
    if (!wizard.providerType || wizard.step !== 'select_model') return;

    const models = PROVIDER_MODELS[wizard.providerType];
    if (models.length === 0) return;

    let idx = wizard.modelIndex;
    if (direction === 'up') idx = (idx - 1 + models.length) % models.length;
    else idx = (idx + 1) % models.length;

    set({
      wizard: {
        ...wizard,
        modelIndex: idx,
        modelName: models[idx],
      },
    });
  },

  wizardSelectModel: () => {
    const { wizard } = get();
    if (!wizard.providerType || wizard.step !== 'select_model') return null;

    const w = { ...wizard };
    w.step = 'select_provider';
    w.active = false;
    set({ wizard: w, inputValue: '' });
    return { done: true };
  },

  cancelWizard: () =>
    set({
      inputValue: '',
      cursorPosition: 0,
      wizard: {
        active: false,
        step: 'select_provider',
        providerType: null,
        providerIndex: 0,
        apiKey: '',
        modelName: '',
        modelIndex: 0,
        detectedProviders: [],
      },
    }),

  addMessage: (role, content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { id: String(nextId++), role, content, timestamp: new Date() },
      ],
      scrollOffset: 0,
    })),

  setInputValue: (value) => set({ inputValue: value, cursorPosition: value.length }),

  insertText: (text) => {
    const { inputValue, cursorPosition } = get();
    const before = inputValue.slice(0, cursorPosition);
    const after = inputValue.slice(cursorPosition);
    const newValue = before + text + after;
    set({
      inputValue: newValue,
      cursorPosition: cursorPosition + text.length,
    });
  },

  deleteChar: () => {
    const { inputValue, cursorPosition } = get();
    if (cursorPosition <= 0) return;
    const before = inputValue.slice(0, cursorPosition - 1);
    const after = inputValue.slice(cursorPosition);
    set({
      inputValue: before + after,
      cursorPosition: cursorPosition - 1,
    });
  },

  moveCursorLeft: () => {
    const { cursorPosition } = get();
    if (cursorPosition > 0) {
      set({ cursorPosition: cursorPosition - 1 });
    }
  },

  moveCursorRight: () => {
    const { inputValue, cursorPosition } = get();
    if (cursorPosition < inputValue.length) {
      set({ cursorPosition: cursorPosition + 1 });
    }
  },

  autocompleteAccept: () => {
    const { inputValue, autocompleteIndex } = get();
    if (!inputValue.startsWith('/') || inputValue.includes(' ')) return;
    const matches = AUTOCOMPLETE_COMMANDS.filter((c) => c.startsWith(inputValue));
    if (matches.length === 0) return;
    const match = matches[Math.min(autocompleteIndex, matches.length - 1)] ?? matches[0];
    set({
      inputValue: match + ' ',
      cursorPosition: match.length + 1,
      autocompleteIndex: 0,
    });
  },

  autocompleteNavigate: (direction) => {
    const { inputValue, autocompleteIndex } = get();
    const matches = AUTOCOMPLETE_COMMANDS.filter((c) => c.startsWith(inputValue));
    if (matches.length === 0) return;
    let idx = autocompleteIndex;
    if (direction === 'up') idx = (idx - 1 + matches.length) % matches.length;
    else idx = (idx + 1) % matches.length;
    set({ autocompleteIndex: idx });
  },

  scrollUp: (amount = 5) => {
    set((state) => ({
      scrollOffset: state.scrollOffset + amount,
    }));
  },

  scrollDown: (amount = 5) => {
    set((state) => ({
      scrollOffset: Math.max(0, state.scrollOffset - amount),
    }));
  },

  scrollToBottom: () => {
    set({ scrollOffset: 0 });
  },

  focusInput: () => set({ inputFocused: true }),
  blurInput: () => set({ inputFocused: false }),

  submitInput: () => {
    const { inputValue, commandHistory } = get();
    const trimmed = inputValue.trim();
    if (!trimmed) return '';

    const history = commandHistory.filter((h) => h !== trimmed);
    set({
      inputValue: '',
      cursorPosition: 0,
      commandHistory: [trimmed, ...history].slice(0, 100),
      historyIndex: -1,
    });

    return trimmed;
  },

  clearInput: () => set({ inputValue: '', cursorPosition: 0, historyIndex: -1 }),

  navigateHistory: (direction) => {
    const { commandHistory, historyIndex } = get();
    if (commandHistory.length === 0) return;

    const newIndex =
      direction === 'up'
        ? Math.min(historyIndex + 1, commandHistory.length - 1)
        : Math.max(historyIndex - 1, -1);

    set({
      historyIndex: newIndex,
      inputValue: newIndex >= 0 ? commandHistory[newIndex] : '',
    });
  },

  setExecuting: (executing) => set({ isExecuting: executing }),

  clearMessages: () =>
    set({
      messages: [
        {
          id: String(nextId++),
          role: 'system',
          content: 'Cleared.',
          timestamp: new Date(),
        },
      ],
    }),
}));
