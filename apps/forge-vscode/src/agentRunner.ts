import * as vscode from 'vscode';
import { execSync } from 'node:child_process';

let _core: any = null;

export async function getCore(): Promise<any> {
  if (!_core) _core = await import('forge-core');
  return _core;
}

export function getProviderConfig(): { name: string; type: string; model: string; apiKey?: string; baseUrl?: string } | null {
  const config = vscode.workspace.getConfiguration('forge');
  const active = config.get<string>('activeProvider');
  const providers = config.get<Array<any>>('providers') ?? [];
  return providers.find((p: any) => p.name === active) || null;
}

export function getContextInfo(): { projectPath: string; gitBranch: string | null; provider: string | null; ghConnected: boolean; glabConnected: boolean } {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();

  let gitBranch: string | null = null;
  try {
    gitBranch = execSync('git branch --show-current', {
      cwd: workspaceRoot, encoding: 'utf-8', timeout: 3000,
    }).trim() || null;
  } catch {}

  const config = vscode.workspace.getConfiguration('forge');
  const active = config.get<string>('activeProvider');
  const providers = config.get<Array<{ name: string; type: string; model: string }>>('providers') ?? [];
  const provider = providers.find((p) => p.name === active);

  const displayPath = gitBranch ? `${workspaceRoot}  (${gitBranch})` : workspaceRoot;

  let ghConnected = false;
  try {
    execSync('gh auth status', { encoding: 'utf-8', timeout: 3000 });
    ghConnected = true;
  } catch {}

  let glabConnected = false;
  try {
    execSync('glab auth status', { encoding: 'utf-8', timeout: 3000 });
    glabConnected = true;
  } catch {}

  return { projectPath: displayPath, gitBranch, provider: provider ? `${provider.type} / ${provider.model}` : null, ghConnected, glabConnected };
}

export async function createAgent(options: {
  skills?: any;
  skillContext?: Record<string, unknown>;
  onEvent?: (event: any) => void;
}): Promise<any> {
  const core = await getCore();
  const providerConfig = getProviderConfig();
  if (!providerConfig) throw new Error('No provider configured');

  const provider = core.createProvider(providerConfig);
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();

  const tools = new core.ToolRegistry();
  tools.register(core.bashTool);
  tools.register(core.readFileTool);
  tools.register(core.gitDiffTool);
  tools.register(core.globTool);
  tools.register(core.searchSymbolsTool);

  const skills = options.skills ?? new core.SkillRegistry();

  const runtime = new core.AgentRuntime({
    provider,
    skills,
    tools,
    workspaceRoot,
    skillContext: options.skillContext ?? {},
  });

  if (options.onEvent) {
    runtime.config.onEvent = options.onEvent;
  }

  return { core, runtime };
}

export class ChatEventHandler {
  constructor(private _addMessage: (role: 'assistant' | 'system' | 'user', content: string) => void) {}

  handle(event: any): void {
    switch (event.type) {
      case 'text_delta':
        this._addMessage('assistant', event.text);
        break;
      case 'tool_call':
        this._addMessage('system', `\u{1F527} ${event.tool.name}...`);
        break;
      case 'tool_result':
        this._addMessage('system', '  \u2713 done');
        break;
      case 'error':
        this._addMessage('system', `\u274C ${event.error.message}`);
        break;
    }
  }
}
