import type { LLMProvider } from '../types.js';
import type { ProviderConfig } from '../../config/schema.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';
import { OllamaProvider } from './ollama.js';

export { type LLMProvider, type ProviderConfig };

const OPENAI_COMPATIBLE = new Set(['openai', 'opencode-zen', 'opencode-go', 'gemini']);

const PROVIDER_BASE_URLS: Record<string, string> = {
  'opencode-zen': 'https://opencode.ai/zen/v1',
  'opencode-go': 'https://opencode.ai/zen/go/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
};

const PROVIDER_AUTH_HEADERS: Record<string, Record<string, string>> = {
  copilot: {
    'Authorization': 'Bearer {{token}}',
    'Copilot-Integration-Id': 'vscode-chat',
  },
};

export function createProvider(config: ProviderConfig): LLMProvider {
  if (config.type === 'anthropic') {
    return new AnthropicProvider(config);
  }

  if (config.type === 'ollama') {
    return new OllamaProvider(config);
  }

  if (config.type === 'copilot') {
    const resolved = { ...config };
    if (!resolved.baseUrl) {
      resolved.baseUrl = 'https://api.githubcopilot.com';
    }
    return new OpenAIProvider(resolved as any);
  }

  if (OPENAI_COMPATIBLE.has(config.type)) {
    const resolved = { ...config };
    if (PROVIDER_BASE_URLS[config.type] && !config.baseUrl) {
      resolved.baseUrl = PROVIDER_BASE_URLS[config.type];
    }
    return new OpenAIProvider(resolved);
  }

  throw new Error(`Unsupported provider type: ${config.type}`);
}
