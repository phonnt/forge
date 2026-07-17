import * as vscode from 'vscode';
import { generateWebviewHtml } from './webviewHtml.js';
import { getContextInfo } from './agentRunner.js';

export class ForgePanelChat {
  private _panel?: vscode.WebviewPanel;
  private _onSendMessage?: (text: string) => void;

  constructor(private readonly _context: vscode.ExtensionContext) {}

  set onSendMessage(handler: (text: string) => void) {
    this._onSendMessage = handler;
  }

  show(): void {
    if (this._panel) {
      this._panel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    this._panel = vscode.window.createWebviewPanel(
      'forge.chatPanel',
      'forge Chat',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [] },
    );

    this._panel.webview.html = generateWebviewHtml({
      background: 'var(--vscode-editor-background)',
      sidebarMode: false,
    });

    this._panel.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case 'ready': this._sendContext(); break;
        case 'sendMessage':
          if (data.text && this._onSendMessage) this._onSendMessage(data.text);
          break;
        case 'runCommand':
          if (data.command) this._handleCommand(data.command, data.args || '');
          break;
        case 'clearChat': this._panel!.webview.postMessage({ type: 'clear' }); break;
        case 'applyCode':
          if (data.code) vscode.commands.executeCommand('forge.applyDiff', data.code, data.language || '');
          break;
      }
    });

    this._panel.onDidDispose(() => { this._panel = undefined; });
  }

  addMessage(role: string, content: string): void {
    this._panel?.webview.postMessage({ type: 'message', role, content });
  }

  setExecuting(executing: boolean): void {
    this._panel?.webview.postMessage({ type: 'executing', executing });
  }

  updateContext(): void { this._sendContext(); }
  clear(): void { this._panel?.webview.postMessage({ type: 'clear' }); }

  private _sendContext(): void {
    const info = getContextInfo();
    this._panel?.webview.postMessage({ type: 'context', ...info });
  }

  private _handleCommand(command: string, args: string): void {
    switch (command) {
      case '/review': vscode.commands.executeCommand('forge.review'); break;
      case '/connect': vscode.commands.executeCommand('forge.connect'); break;
      case '/init': vscode.commands.executeCommand('forge.init'); break;
      case '/run':
        this.addMessage('system', 'Terminal agent: ' + (args || 'run a command'));
        if (this._onSendMessage) this._onSendMessage('Run the following command in the terminal: ' + (args || 'show current directory and git status'));
        break;
      case '/prompt': vscode.commands.executeCommand('forge.showPrompts'); break;
    }
  }
}
