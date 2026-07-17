import * as vscode from 'vscode';

interface ReviewFinding {
  file: string;
  lineStart?: number;
  lineEnd?: number;
  severity: string;
  category: string;
  title: string;
  description: string;
  suggestion: string;
}

interface ReviewStats {
  total: number;
  critical: number;
  major: number;
  minor: number;
  info: number;
}

export class ReviewPanel {
  private _panel?: vscode.WebviewPanel;

  show(url: string): void {
    this._panel = vscode.window.createWebviewPanel(
      'forge.review',
      'forge Review',
      { viewColumn: vscode.ViewColumn.Two, preserveFocus: false },
      { enableScripts: true, retainContextWhenHidden: true },
    );

    this._panel.webview.html = this._getLoadingHtml(url);

    this._panel.onDidDispose(() => {
      this._panel = undefined;
    });
  }

  addProgress(message: string): void {
    this._panel?.webview.postMessage({ type: 'progress', message });
  }

  addFinding(finding: ReviewFinding): void {
    this._panel?.webview.postMessage({ type: 'finding', ...finding });
  }

  setSummary(stats: ReviewStats): void {
    this._panel?.webview.postMessage({ type: 'summary', ...stats });
  }

  setError(message: string): void {
    this._panel?.webview.postMessage({ type: 'error', message });
  }

  setDone(): void {
    this._panel?.webview.postMessage({ type: 'done' });
  }

  dispose(): void {
    this._panel?.dispose();
    this._panel = undefined;
  }

  private _getLoadingHtml(url: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>forge Review</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family, -apple-system, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 16px;
      line-height: 1.6;
    }
    .header {
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .header h1 { font-size: 18px; margin-bottom: 4px; }
    .header .url { color: var(--vscode-descriptionForeground); font-size: 12px; word-break: break-all; }
    .progress {
      padding: 8px 12px;
      background: var(--vscode-editorWidget-background);
      border-radius: 4px;
      margin-bottom: 16px;
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }
    .spinner { display: inline-block; animation: spin 1s linear infinite; margin-right: 8px; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .summary {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .stat {
      padding: 8px 14px;
      border-radius: 6px;
      text-align: center;
      min-width: 70px;
    }
    .stat .num { font-size: 22px; font-weight: 700; }
    .stat .label { font-size: 10px; text-transform: uppercase; opacity: 0.8; }
    .stat.critical { background: #5a1d1d; color: #f48771; }
    .stat.major { background: #5a4d1d; color: #f4c971; }
    .stat.minor { background: #1d5a3a; color: #89d185; }
    .stat.info { background: #1d3a5a; color: #75beff; }
    .finding {
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 10px;
    }
    .finding-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
    }
    .finding-title { font-weight: 600; font-size: 13px; }
    .finding-meta { font-size: 11px; color: var(--vscode-descriptionForeground); display: flex; gap: 8px; flex-wrap: wrap; }
    .finding-desc { font-size: 12px; margin: 6px 0; color: var(--vscode-foreground); }
    .finding-suggestion { font-size: 12px; padding: 6px 8px; background: var(--vscode-textCodeBlock-background); border-radius: 4px; margin-top: 4px; }
    .badge {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge.critical { background: #f4877133; color: #f48771; }
    .badge.major { background: #f4c97133; color: #f4c971; }
    .badge.minor { background: #89d18533; color: #89d185; }
    .badge.info { background: #75beff33; color: #75beff; }
    .empty { text-align: center; padding: 40px; color: var(--vscode-descriptionForeground); }
    .error { color: #f48771; padding: 8px 12px; background: #5a1d1d; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Code Review</h1>
    <div class="url">${this._escapeHtml(url)}</div>
  </div>
  <div id="progress" class="progress"><span class="spinner">&#9696;</span> Analyzing changes...</div>
  <div id="summary" class="summary"></div>
  <div id="findings"></div>

  <script>
    const vscode = acquireVsCodeApi();
    const progressEl = document.getElementById('progress');
    const summaryEl = document.getElementById('summary');
    const findingsEl = document.getElementById('findings');
    let findings = [];

    const SEV_ICONS = { critical: '\u{1F534}', major: '\u{1F7E0}', minor: '\u{1F7E1}', info: '\u{1F535}' };

    window.addEventListener('message', (e) => {
      const d = e.data;
      switch (d.type) {
        case 'progress':
          progressEl.innerHTML = '<span class="spinner">&#9696;</span> ' + escapeHtml(d.message);
          break;
        case 'finding':
          findings.push(d);
          renderFinding(d);
          break;
        case 'summary':
          renderSummary(d);
          break;
        case 'error':
          progressEl.className = 'error';
          progressEl.textContent = '\u274C ' + d.message;
          break;
        case 'done':
          progressEl.style.display = 'none';
          if (findings.length === 0) {
            findingsEl.innerHTML = '<div class="empty">\u2705 No issues found. Great job!</div>';
          }
          break;
      }
    });

    function renderSummary(s) {
      summaryEl.innerHTML =
        '<div class="stat critical"><div class="num">' + (s.critical||0) + '</div><div class="label">Critical</div></div>' +
        '<div class="stat major"><div class="num">' + (s.major||0) + '</div><div class="label">Major</div></div>' +
        '<div class="stat minor"><div class="num">' + (s.minor||0) + '</div><div class="label">Minor</div></div>' +
        '<div class="stat info"><div class="num">' + (s.info||0) + '</div><div class="label">Info</div></div>';
    }

    function renderFinding(f) {
      const location = f.lineStart ? f.file + ':' + f.lineStart + (f.lineEnd ? '-' + f.lineEnd : '') : f.file;
      const div = document.createElement('div');
      div.className = 'finding';
      div.innerHTML =
        '<div class="finding-header">' +
          '<div class="finding-title">' + (SEV_ICONS[f.severity] || '') + ' <span class="badge ' + f.severity + '">' + f.severity + '</span> ' + escapeHtml(f.title) + '</div>' +
        '</div>' +
        '<div class="finding-meta">' +
          '<span>File: ' + escapeHtml(location) + '</span>' +
          '<span>Category: ' + escapeHtml(f.category) + '</span>' +
        '</div>' +
        '<div class="finding-desc">' + escapeHtml(f.description) + '</div>' +
        '<div class="finding-suggestion">Suggestion: ' + escapeHtml(f.suggestion) + '</div>';
      findingsEl.appendChild(div);
    }

    function escapeHtml(s) {
      return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
  }

  private _escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
