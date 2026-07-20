import * as vscode from 'vscode';
import { reviewPanelHtml } from './webview/reviewPanelHtml.js';

export interface ReviewOptions {
  url: string;
  rulesFile?: string;
  model?: string;
  format: string;
}

export class ReviewPanel {
  private _panel?: vscode.WebviewPanel;
  private _onSubmit?: (options: ReviewOptions) => void;

  constructor(private readonly _context: vscode.ExtensionContext) {}

  set onSubmit(handler: (options: ReviewOptions) => void) {
    this._onSubmit = handler;
  }

  async show(): Promise<void> {
    await vscode.commands.executeCommand('workbench.action.splitEditorRight');

    this._panel = vscode.window.createWebviewPanel(
      'forge.review',
      'forge Review',
      { viewColumn: vscode.ViewColumn.Active, preserveFocus: false },
      { enableScripts: true, retainContextWhenHidden: true },
    );

    this._panel.webview.html = reviewPanelHtml();

    this._panel.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case 'submit':
          if (this._onSubmit) this._onSubmit({
            url: data.url || '',
            rulesFile: data.rulesFile || undefined,
            format: data.format || 'markdown',
          });
          break;
        case 'pickFile':
          vscode.window.showOpenDialog({
            canSelectFiles: true, canSelectFolders: false, canSelectMany: false,
            defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri,
          }).then((uris) => {
            if (uris && uris[0]) this._panel?.webview.postMessage({ type: 'filePicked', path: uris[0].fsPath });
          });
          break;
      }
    });

    this._panel.onDidDispose(() => { this._panel = undefined; });
  }

  addProgress(message: string): void {
    this._panel?.webview.postMessage({ type: 'progress', message });
  }

  addFinding(finding: Record<string, unknown>): void {
    this._panel?.webview.postMessage({ type: 'finding', ...finding });
  }

  setSummary(stats: Record<string, number>): void {
    this._panel?.webview.postMessage({ type: 'summary', ...stats });
  }

  setError(message: string): void {
    this._panel?.webview.postMessage({ type: 'error', message });
  }

  setDone(): void {
    this._panel?.webview.postMessage({ type: 'done' });
  }
}
