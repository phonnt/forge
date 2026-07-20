import * as vscode from 'vscode';
import { execSync } from 'node:child_process';
import { prBrowserHtml } from './webview/prBrowserHtml.js';

export async function handleBrowsePRs(): Promise<void> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
  let defaultRepo = '';
  try {
    const remote = execSync('git remote get-url origin', { cwd: workspaceRoot, encoding: 'utf-8', timeout: 5000 }).trim();
    const match = remote.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
    if (match) defaultRepo = match[1];
  } catch {}

  await vscode.commands.executeCommand('workbench.action.splitEditorRight');

  const panel = vscode.window.createWebviewPanel(
    'forge.prBrowser',
    'forge — Pull Requests',
    { viewColumn: vscode.ViewColumn.Active, preserveFocus: false },
    { enableScripts: true, retainContextWhenHidden: true },
  );

  panel.webview.html = prBrowserHtml(defaultRepo);

  panel.webview.onDidReceiveMessage(async (data) => {
    if (data.type === 'load') {
      const prs = fetchPRs(data.repo || defaultRepo, data.source || 'github');
      panel.webview.postMessage({ type: 'prs', prs });
    }
    if (data.type === 'review' && data.url) {
      panel.dispose();
      vscode.commands.executeCommand('forge.reviewFromUrl', data.url);
    }
  });
}

function fetchPRs(repo: string, source: string): Array<Record<string, unknown>> {
  try {
    if (source === 'gitlab') {
      const output = execSync(`glab mr list --repo "${repo}" --output json 2>/dev/null`, { encoding: 'utf-8', timeout: 15000 });
      return (JSON.parse(output) || []).map((item: any) => ({
        number: String(item.iid || item.id || ''),
        title: item.title || '',
        author: item.author?.username || item.author?.name || '',
        state: item.state || 'unknown',
        url: item.web_url || '',
        branch: item.source_branch || '',
        time: item.created_at || '',
      }));
    }
    const output = execSync(`gh pr list --repo "${repo}" --json number,title,author,state,url,headRefName,createdAt --limit 30 2>/dev/null`, { encoding: 'utf-8', timeout: 15000 });
    return (JSON.parse(output) || []).map((item: any) => ({
      number: String(item.number || ''),
      title: item.title || '',
      author: item.author?.login || '',
      state: item.state || 'unknown',
      url: item.url || '',
      branch: item.headRefName || '',
      time: item.createdAt || '',
    }));
  } catch {
    return [];
  }
}
