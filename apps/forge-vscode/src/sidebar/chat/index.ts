import * as vscode from 'vscode';
import { getContextInfo } from '../../agentRunner.js';

export class NavPanel implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [],
    };

    webviewView.webview.html = this._getHtml();

    webviewView.webview.onDidReceiveMessage((data) => {
      if (data.type === 'runCommand' && data.command) {
        vscode.commands.executeCommand(data.command);
      }
      if (data.type === 'ready') {
        this._sendContext();
      }
    });
  }

  updateContext(): void {
    this._sendContext();
  }

  reveal(): void {}

  private _sendContext(): void {
    const info = getContextInfo();
    this._view?.webview.postMessage({ type: 'context', ...info });
  }

  private _getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>forge</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family, -apple-system, sans-serif);
      font-size: 12px;
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      padding: 8px;
    }
    h2 {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 10px;
      color: var(--vscode-sideBarTitle-foreground);
    }
    .context {
      padding: 8px 10px;
      margin-bottom: 10px;
      border-radius: 4px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
    }
    .context .path {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .context .branch {
      font-size: 10px;
      color: var(--vscode-charts-yellow);
      margin-bottom: 2px;
    }
    .context .provider {
      font-size: 11px;
      color: var(--vscode-charts-green);
      font-weight: 600;
      margin-top: 4px;
    }
    .context .none {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      font-style: italic;
      opacity: 0.7;
    }
    .context .services {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
      opacity: 0.8;
    }
    .btn {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 7px 10px;
      margin-bottom: 4px;
      background: transparent;
      color: var(--vscode-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      font-size: 12px;
      text-align: left;
    }
    .btn:hover {
      background: var(--vscode-list-hoverBackground);
    }
    .btn .icon { font-size: 14px; width: 18px; text-align: center; }
    .btn .label { flex: 1; }
    .btn .shortcut { font-size: 10px; color: var(--vscode-descriptionForeground); opacity: 0.7; }
    .btn.primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      margin-bottom: 10px;
    }
    .btn.primary:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .section {
      margin-bottom: 12px;
    }
    .section-title {
      font-size: 10px;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
      padding: 4px 10px 6px;
      letter-spacing: 0.5px;
      opacity: 0.7;
    }

  </style>
</head>
<body>
  <div class="context" id="context">
    <div class="path" id="ctxPath"></div>
    <div class="branch" id="ctxBranch"></div>
    <div class="provider" id="ctxModel"></div>
    <div class="services" id="ctxServices"></div>
  </div>

  <div class="actions">
    <span class="icon">💬</span>
    <span class="label">Open Chat</span>
    <span class="shortcut">⌘L</span>
  </button>

  <div class="section">
    <div class="section-title">ACTIONS</div>
    <button class="btn" onclick="run('forge.dashboard')">
      <span class="icon">📊</span>
      <span class="label">Dashboard</span>
    </button>
    <button class="btn" onclick="run('forge.browsePRs')">
      <span class="icon">📋</span>
      <span class="label">Browse PRs/MRs</span>
    </button>
    <button class="btn" onclick="run('forge.review')">
      <span class="icon">🔍</span>
      <span class="label">Review PR/MR</span>
    </button>
    <button class="btn" onclick="run('forge.inlineChat')">
      <span class="icon">✏️</span>
      <span class="label">Edit with AI</span>
      <span class="shortcut">⌘I</span>
    </button>
    <button class="btn" onclick="run('forge.showPrompts')">
      <span class="icon">📋</span>
      <span class="label">Run Prompt</span>
    </button>
  </div>

  <div class="section">
    <div class="section-title">Setup</div>
    <button class="btn" onclick="run('forge.connect')">
      <span class="icon">⚙️</span>
      <span class="label">Switch Provider</span>
    </button>
    <button class="btn" onclick="run('forge.init')">
      <span class="icon">📝</span>
      <span class="label">Initialize Project</span>
    </button>
    <button class="btn" onclick="run('forge.configure')">
      <span class="icon">🔧</span>
      <span class="label">Open Settings</span>
    </button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    window.addEventListener('message', (e) => {
      if (e.data.type === 'context') {
        updateContext(e.data);
      }
    });

    function updateContext(info) {
      document.getElementById('ctxPath').textContent = info.projectPath ? '\u{1F4C1} ' + info.projectPath : 'No workspace';
      document.getElementById('ctxBranch').textContent = info.gitBranch ? '\u23C7 ' + info.gitBranch : '';
      const modelEl = document.getElementById('ctxModel');
      if (info.provider) {
        modelEl.textContent = info.provider;
        modelEl.className = 'provider';
      } else {
        modelEl.textContent = 'No provider configured';
        modelEl.className = 'none';
      }

      const services = [];
      services.push((info.ghConnected ? '\u2705' : '\u274C') + ' GitHub');
      services.push((info.glabConnected ? '\u2705' : '\u274C') + ' GitLab');
      document.getElementById('ctxServices').textContent = services.join('  ');
    }

    function run(cmd) {
      vscode.postMessage({ type: 'runCommand', command: cmd });
    }

    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
  }
}
