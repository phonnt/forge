import * as vscode from 'vscode';

export interface SectionItem {
  label: string;
  url?: string;
  command?: string;
}

export class SectionViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _items: SectionItem[];

  constructor(items: SectionItem[]) {
    this._items = items;
  }

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

    webviewView.webview.onDidReceiveMessage((data) => {
      if (data.type === 'openUrl' && data.url) {
        vscode.commands.executeCommand('forge.reviewFromUrl', data.url);
      }
      if (data.type === 'runCommand' && data.command) {
        vscode.commands.executeCommand(data.command);
      }
    });

    webviewView.webview.html = this._getHtml();
  }

  updateItems(items: SectionItem[]): void {
    this._items = items;
    this._view?.webview.postMessage({ type: 'updateItems', items });
  }

  private _getHtml(): string {
    const itemRows = this._renderItems(this._items);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family, -apple-system, sans-serif);
      font-size: 12px;
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      padding: 0;
    }
    .item {
      padding: 4px 10px;
      cursor: default;
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .item.clickable {
      cursor: pointer;
      border-radius: 4px;
    }
    .item.clickable:hover {
      background: var(--vscode-list-hoverBackground);
    }
    .item.action {
      color: var(--vscode-textLink-foreground);
    }
    .item.action:hover {
      color: var(--vscode-textLink-activeForeground);
    }
    .empty-msg {
      padding: 4px 10px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      font-style: italic;
      opacity: 0.7;
    }
  </style>
</head>
<body>
  <div id="list">
    ${itemRows}
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function renderItems(items) {
      var el = document.getElementById('list');
      if (!items || items.length === 0) {
        el.innerHTML = '<div class="empty-msg">No items</div>';
        return;
      }
      el.innerHTML = items.map(function(item) {
        var cls = 'item';
        var attrs = '';
        if (item.url) {
          cls += ' clickable';
          attrs = ' data-url="' + escAttr(item.url) + '"';
        } else if (item.command) {
          cls += ' clickable action';
          attrs = ' data-command="' + escAttr(item.command) + '"';
        }
        return '<div class="' + cls + '"' + attrs + '>' + escHtml(item.label) + '</div>';
      }).join('');
    }

    function escHtml(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function escAttr(s) {
      return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    }

    document.getElementById('list').addEventListener('click', function(e) {
      var el = e.target.closest('.clickable');
      if (!el) return;
      if (el.dataset.url) {
        vscode.postMessage({ type: 'openUrl', url: el.dataset.url });
      } else if (el.dataset.command) {
        vscode.postMessage({ type: 'runCommand', command: el.dataset.command });
      }
    });

    window.addEventListener('message', function(e) {
      if (e.data.type === 'updateItems') {
        renderItems(e.data.items);
      }
    });
  </script>
</body>
</html>`;
  }

  private _renderItems(items: SectionItem[]): string {
    if (items.length === 0) {
      return '<div class="empty-msg">No items</div>';
    }
    return items
      .map((item) => {
        let cls = 'item';
        const attrs: string[] = [];
        if (item.url) {
          cls += ' clickable';
          attrs.push(`data-url="${this._escAttr(item.url)}"`);
        } else if (item.command) {
          cls += ' clickable action';
          attrs.push(`data-command="${this._escAttr(item.command || '')}"`);
        }
        return `<div class="${cls}" ${attrs.join(' ')}>${this._escHtml(item.label)}</div>`;
      })
      .join('\n');
  }

  private _escHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  private _escAttr(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }
}
