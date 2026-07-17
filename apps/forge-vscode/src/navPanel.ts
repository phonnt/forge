import * as vscode from 'vscode';

export class NavPanel implements vscode.WebviewViewProvider {
  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [],
    };

    webviewView.webview.html = this._getHtml();

    webviewView.webview.onDidReceiveMessage((data) => {
      if (data.type === 'runCommand' && data.command) {
        vscode.commands.executeCommand(data.command);
      }
    });
  }

  reveal(): void {}

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
  <h2>forge</h2>

  <button class="btn primary" onclick="run('forge.openChatPanel')">
    <span class="icon">💬</span>
    <span class="label">Open Chat</span>
    <span class="shortcut">⌘L</span>
  </button>

  <div class="section">
    <div class="section-title">Actions</div>
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
    function run(cmd) {
      vscode.postMessage({ type: 'runCommand', command: cmd });
    }
  </script>
</body>
</html>`;
  }
}
