import { execSync } from 'node:child_process';

export interface DetectedProvider {
  id: string;
  name: string;
  desc: string;
  available: boolean;
  source: string;
  apiKey?: string;
  models?: string[];
}

const ENV_KEY_MAP: Record<string, string[]> = {
  anthropic: ['ANTHROPIC_API_KEY'],
  openai: ['OPENAI_API_KEY'],
  gemini: ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_GENAI_API_KEY'],
};

function getEnvKeys(id: string): string[] {
  return ENV_KEY_MAP[id] ?? [];
}

function detectEnvApiKey(id: string): string | undefined {
  for (const key of getEnvKeys(id)) {
    const val = process.env[key];
    if (val && val.length > 10) return val;
  }
  return undefined;
}

async function detectOllama(): Promise<DetectedProvider> {
  let models: string[] = [];
  try {
    const resp = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) });
    if (resp.ok) {
      const data = (await resp.json()) as { models?: { name: string }[] };
      models = (data.models ?? []).map((m: { name: string }) => m.name);
    }
  } catch {}

  return {
    id: 'ollama',
    name: 'Ollama',
    desc: models.length > 0 ? `${models.length} model${models.length > 1 ? 's' : ''} available` : 'Not running',
    available: models.length > 0,
    source: models.length > 0 ? 'localhost:11434' : 'not detected',
    models: models.length > 0 ? models : undefined,
  };
}

function detectCopilot(): DetectedProvider {
  let available = false;
  let apiKey: string | undefined;
  try {
    const token = execSync('gh auth token 2>/dev/null', { encoding: 'utf-8', timeout: 5000 }).trim();
    if (token && token.length > 10) {
      available = true;
      apiKey = token;
    }
  } catch {}

  return {
    id: 'copilot',
    name: 'GitHub Copilot',
    desc: available ? 'Authenticated via gh CLI' : 'Run gh auth login first',
    available,
    source: available ? 'gh auth token' : 'not authenticated',
    apiKey,
  };
}

function detectOpencode(id: string, name: string, desc: string): DetectedProvider {
  let available = false;
  let apiKey: string | undefined;

  const envKey = process.env['OPENCODE_API_KEY'] || process.env['ZEN_API_KEY'];
  if (envKey) {
    available = true;
    apiKey = envKey;
  } else {
    try {
      execSync('which opencode 2>/dev/null || true', { encoding: 'utf-8', timeout: 3000 });
      available = true;
    } catch {}
  }

  return {
    id,
    name,
    desc: apiKey ? 'API key detected' : available ? 'opencode CLI detected' : desc,
    available: available || !!apiKey,
    source: apiKey ? 'env variable' : available ? 'CLI installed' : 'not detected',
    apiKey,
  };
}

function detectEnvProvider(id: string, name: string, desc: string): DetectedProvider {
  const apiKey = detectEnvApiKey(id);
  return {
    id,
    name,
    desc: apiKey ? 'API key detected in environment' : desc,
    available: !!apiKey,
    source: apiKey ? 'env variable' : 'set env to enable',
    apiKey,
  };
}

export async function detectProviders(): Promise<DetectedProvider[]> {
  const results = await Promise.allSettled([
    Promise.resolve(detectEnvProvider('anthropic', 'Anthropic', 'Set ANTHROPIC_API_KEY')),
    Promise.resolve(detectEnvProvider('openai', 'OpenAI', 'Set OPENAI_API_KEY')),
    Promise.resolve(detectEnvProvider('gemini', 'Google Gemini', 'Set GEMINI_API_KEY')),
    detectOllama(),
    Promise.resolve(detectCopilot()),
    Promise.resolve(detectOpencode('opencode-zen', 'OpenCode Zen', 'Premium models, pay-as-you-go')),
    Promise.resolve(detectOpencode('opencode-go', 'OpenCode Go', '$10/mo subscription, open models')),
  ]);

  return results.map((r) => (r.status === 'fulfilled' ? r.value : null)).filter(Boolean) as DetectedProvider[];
}
