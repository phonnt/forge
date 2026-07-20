import * as vscode from 'vscode';
import type { ForgePanelChat } from './panelChat.js';
import { ReviewPanel } from './reviewPanel.js';
import { createAgent, getCore } from './agentRunner.js';

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  copilot: 'claude-sonnet-4',
  'opencode-zen': 'claude-sonnet-5',
  'opencode-go': 'deepseek-v4-pro',
  gemini: 'gemini-2.5-pro',
  ollama: 'llama3.1',
};

type ProviderConfig = {
  name: string;
  type: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
};

function getProvidersFromSettings(): ProviderConfig[] {
  const config = vscode.workspace.getConfiguration('forge');
  return (config.get<ProviderConfig[]>('providers') ?? []) as ProviderConfig[];
}

function saveProvidersToSettings(providers: ProviderConfig[], active: string): void {
  const config = vscode.workspace.getConfiguration('forge');
  config.update('providers', providers, vscode.ConfigurationTarget.Global);
  config.update('activeProvider', active, vscode.ConfigurationTarget.Global);
}

function getActiveFromSettings(): { providers: ProviderConfig[]; active: string | null } {
  const providers = getProvidersFromSettings();
  const config = vscode.workspace.getConfiguration('forge');
  const active = config.get<string>('activeProvider') || providers[0]?.name || null;
  return { providers, active };
}

import type { ExtensionContext } from 'vscode';

export async function handleReview(context: ExtensionContext): Promise<void> {
  const panel = new ReviewPanel(context);
  setupReviewSubmit(panel);
  await panel.show();
}

function setupReviewSubmit(panel: ReviewPanel): void {
  panel.onSubmit = async (options) => {
    try {
      const core = await getCore();
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
      const projectConfig = core.loadProjectConfig(workspaceRoot);
      const rulesPath = options.rulesFile || projectConfig.review?.rulesFile;
      const rules = rulesPath ? core.loadRulesFile(workspaceRoot) : '';

      const skills = new core.SkillRegistry();
      skills.register(core.createCodeReviewSkill(rules));

      const skillContext: Record<string, unknown> = { url: options.url, outputPath: projectConfig.review?.outputPath };
      if (options.model) skillContext['model'] = options.model;

      const agentOpts: any = {
        skills,
        skillContext,
        onEvent: (event: any) => {
          if (event.type === 'text_delta') {
            parseFindingsStream(event.text, panel);
          } else if (event.type === 'tool_call') {
            panel.addProgress(`Analyzing: ${event.tool.name}...`);
          } else if (event.type === 'error') {
            panel.setError(event.error.message);
          }
        },
      };

      if (options.model) {
        const providerConfig = getProviderConfigForReview(options.model);
        if (providerConfig) {
          const core2 = await getCore();
          const provider = core2.createProvider(providerConfig);
          const tools = new core2.ToolRegistry();
          tools.register(core2.bashTool);
          tools.register(core2.readFileTool);
          tools.register(core2.gitDiffTool);
          tools.register(core2.globTool);
          tools.register(core2.searchSymbolsTool);

          const runtime = new core2.AgentRuntime({ provider, skills, tools, workspaceRoot, skillContext });
          runtime.config.onEvent = agentOpts.onEvent;
          const result = await runtime.run(buildReviewTask(options.url));
          if (result.success) panel.setDone();
          else panel.setError(result.error?.message || 'Unknown error');
          return;
        }
      }

      const { runtime } = await createAgent(agentOpts);
      const result = await runtime.run(buildReviewTask(options.url));
      if (result.success) panel.setDone();
      else panel.setError(result.error?.message || 'Unknown error');
    } catch (err) {
      panel.setError(err instanceof Error ? err.message : String(err));
    }
  };
}

function getProviderConfigForReview(model: string): any {
  const config = vscode.workspace.getConfiguration('forge');
  const active = config.get<string>('activeProvider');
  const providers = config.get<Array<any>>('providers') ?? [];
  const provider = providers.find((p: any) => p.name === active);
  if (!provider) return null;
  return { ...provider, model };
}

function parseFindingsStream(text: string, panel: ReviewPanel): void {
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('---')) continue;

    if (trimmed.startsWith('{') && trimmed.includes('"file"')) {
      try {
        const f = JSON.parse(trimmed);
        panel.addFinding({
          file: f.file || '',
          lineStart: f.lineStart,
          lineEnd: f.lineEnd,
          severity: f.severity || 'info',
          category: f.category || 'other',
          title: f.title || '',
          description: f.description || '',
          suggestion: f.suggestion || '',
        });
      } catch {}
      continue;
    }

    if (trimmed.startsWith('{') && trimmed.includes('"total"')) {
      try {
        const s = JSON.parse(trimmed);
        panel.setSummary({
          total: s.total || 0,
          critical: s.critical || 0,
          major: s.major || 0,
          minor: s.minor || 0,
          info: s.info || 0,
        });
      } catch {}
    }
  }
}

export async function handleReviewFromClipboard(): Promise<void> {
  const clipboard = await vscode.env.clipboard.readText();
  const isGH = /github\.com\/[^/]+\/[^/]+\/pull\/\d+/.test(clipboard);
  const isGL = /gitlab\.com\/.+\/-\/merge_requests\/\d+/.test(clipboard);

  if (!isGH && !isGL) {
    vscode.window.showWarningMessage('Clipboard does not contain a valid PR/MR URL.');
    return;
  }

  await vscode.commands.executeCommand('forge.review');
}

export async function handleReviewFromUrl(context: ExtensionContext, url: string): Promise<void> {
  const panel = new ReviewPanel(context);
  setupReviewSubmit(panel);
  await panel.show();

  setTimeout(() => {
    (panel as any)._panel?.webview.postMessage({ type: 'fillUrl', url });
  }, 500);
}

export async function handleInit(panel: ForgePanelChat): Promise<void> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    vscode.window.showErrorMessage('forge: No workspace folder open.');
    return;
  }

  try {
    const core = await getCore();
    const forgeDir = core.initProjectConfig(workspaceRoot);
    panel.show();
    panel.addMessage('system', '\u2705 Project initialized!');
    panel.addMessage('system', `Created: ${forgeDir}`);
  } catch (err) {
    vscode.window.showErrorMessage(`forge: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function handleConnect(panel: ForgePanelChat): Promise<void> {
  panel.show();
  panel.addMessage('system', '\u{1F50D} Scanning for available providers...');

  let detected: Array<{ id: string; name: string; desc: string; available: boolean; source: string; apiKey?: string }> = [];
  try {
    const core = await getCore();
    const results = await core.detectProviders();
    detected = results.map((r: any) => ({
      id: r.id,
      name: r.name,
      desc: r.desc,
      available: r.available,
      source: r.source,
      apiKey: r.apiKey,
    }));
  } catch {}

  const available = detected.filter((d) => d.available);
  if (available.length > 0) {
    panel.addMessage('system', `Found ${available.length} provider${available.length > 1 ? 's' : ''}: ${available.map((d) => d.name).join(', ')}`);

    const quickPickItems: Array<{
      label: string;
      detail: string;
      description: string;
      provider: (typeof available)[0] | null;
    }> = available.map((d) => ({
      label: `$(pass) ${d.name}`,
      detail: d.desc,
      description: d.source,
      provider: d,
    }));

    quickPickItems.push({
      label: '$(add) Add manually...',
      detail: 'Configure a provider not auto-detected',
      description: '',
      provider: null,
    });

    const picked = await vscode.window.showQuickPick(quickPickItems, {
      placeHolder: 'Select a detected provider or add manually',
      matchOnDetail: true,
    });

    if (!picked) return;

    if (picked.provider) {
      const d = picked.provider;
      const name = d.id;
      const type = d.id as ProviderConfig['type'];
      const models = d.id === 'ollama' ? (d as any).models ?? [] : [];

      let model = '';
      if (models.length > 0) {
        const modelPick = await vscode.window.showQuickPick(models, {
          placeHolder: `Select model for ${d.name}`,
        });
        if (!modelPick) return;
        model = modelPick;
      } else {
        model = await vscode.window.showInputBox({
          prompt: `Model name for ${d.name}`,
          value: DEFAULT_MODELS[type] || '',
        }) || DEFAULT_MODELS[type] || '';
      }

      const newProvider: ProviderConfig = {
        name,
        type,
        model,
        apiKey: d.apiKey,
      };

      const existing = getProvidersFromSettings().filter((p) => p.name !== name);
      const updated = [...existing, newProvider];
      saveProvidersToSettings(updated, name);
      panel.addMessage('system', `\u2705 Connected to ${name} (${type}/${model})`);
      return;
    }
  }

  const providers = getProvidersFromSettings();
  const existingNames = providers.map((p) => p.name);

  const action = await vscode.window.showQuickPick(
    [
      ...(existingNames.length > 0
        ? [{ label: '$(plug) Select Existing Provider', detail: 'Switch to a configured provider' }]
        : []),
      { label: '$(add) Add New Provider', detail: 'Configure a new AI provider' },
    ],
    { placeHolder: 'Select action' },
  );

  if (!action) return;

  if (action.label.includes('Select Existing')) {
    const name = await vscode.window.showQuickPick(existingNames, { placeHolder: 'Select provider' });
    if (!name) return;

    const config = vscode.workspace.getConfiguration('forge');
    config.update('activeProvider', name, vscode.ConfigurationTarget.Global);

    const provider = providers.find((p) => p.name === name);
    panel.addMessage('system', `\u2705 Connected to ${name} (${provider?.type}/${provider?.model})`);
    return;
  }

  const type = await vscode.window.showQuickPick(
    [
      { label: 'anthropic', detail: 'Claude Sonnet, Opus, Haiku' },
      { label: 'openai', detail: 'GPT-4o, o1, o3-mini' },
      { label: 'ollama', detail: 'Local models (Llama, Mistral, etc.)' },
      { label: 'copilot', detail: 'GitHub Copilot' },
      { label: 'opencode-zen', detail: 'Premium models, pay-as-you-go' },
      { label: 'opencode-go', detail: '$10/mo subscription' },
      { label: 'gemini', detail: 'Gemini 2.5 Pro, Flash' },
    ],
    { placeHolder: 'Select provider type' },
  );
  if (!type) return;

  const name = await vscode.window.showInputBox({
    prompt: 'Provider name (e.g. "my-openai")',
    placeHolder: type.label,
    value: type.label,
  });
  if (!name) return;

  const apiKey = await vscode.window.showInputBox({
    prompt: `API key for ${type.label}`,
    password: true,
    placeHolder: 'sk-...',
  });
  if (!apiKey) return;

  const model = await vscode.window.showInputBox({
    prompt: 'Model name',
    value: DEFAULT_MODELS[type.label] || '',
  });
  if (!model) return;

  const newProvider: ProviderConfig = { name, type: type.label, model, apiKey };
  const updated = [...providers, newProvider];
  saveProvidersToSettings(updated, name);

  panel.addMessage('system', `\u2705 Added and connected to ${name} (${newProvider.type}/${newProvider.model})`);
}

export async function handleConfigure(): Promise<void> {
  vscode.commands.executeCommand('workbench.action.openSettings', 'forge');
}

function buildReviewTask(url: string): string {
  return `Review the code changes at this URL: ${url}

First, use the git_diff tool to fetch the diff and changed files. Then analyze each file against the review rules.

For each issue you find, output a JSONL line with the finding. Use this exact format:
{"file":"<path>","lineStart":<number>,"lineEnd":<number>,"severity":"critical|major|minor|info","category":"security|performance|bug|style|maintainability|naming|other","title":"<short title>","description":"<detailed description>","suggestion":"<actionable fix>"}

After reviewing all files, output:
---SUMMARY---
{"total":<n>,"critical":<n>,"major":<n>,"minor":<n>,"info":<n>}

Be thorough - check every changed file and every line of the diff.`;
}
