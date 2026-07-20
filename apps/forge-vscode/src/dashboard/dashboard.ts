import * as vscode from 'vscode';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { getContextInfo, createAgent, ChatEventHandler, getCore } from '../agentRunner.js';
import { STYLES } from './dashboardStyles.js';
import { dashboardScript } from './dashboardScript.js';
import { loadHtml } from '../webview/htmlLoader.js';
import { getTabContent } from './tabLoader.js';

export async function handleDashboard(): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.splitEditorRight');

  const panel = vscode.window.createWebviewPanel(
    'forge.dashboard',
    'forge',
    { viewColumn: vscode.ViewColumn.Active, preserveFocus: false },
    { enableScripts: true, retainContextWhenHidden: true },
  );

  const ctx = getContextInfo();
  const repo = detectRepo();
  panel.webview.html = loadHtml('../dashboard/dashboard.html', {
    STYLES,
    OVERVIEW_TAB: getTabContent('tabOverview'),
    PRS_TAB: getTabContent('tabPRs'),
    REVIEW_TAB: getTabContent('tabReview'),
    CHAT_TAB: getTabContent('tabChat'),
    SCRIPT: dashboardScript(JSON.stringify(ctx), repo),
  });

  panel.webview.onDidReceiveMessage(async (data) => {
    switch (data.type) {
      case 'ready': {
        const stats = collectStats();
        const prs = getPRs(detectRepo(), 30);
        panel.webview.postMessage({ type: 'data', ...stats, prs });
        break;
      }
      case 'loadPRs': {
        const prs = getPRs(data.repo || detectRepo(), 30);
        panel.webview.postMessage({ type: 'prs', prs });
        break;
      }
      case 'submitReview': {
        try {
          const core = await getCore();
          const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
          const projectConfig = core.loadProjectConfig(workspaceRoot);
          const rulesPath = data.rulesFile || projectConfig.review?.rulesFile;
          const rules = rulesPath ? core.loadRulesFile(workspaceRoot) : '';

          const skills = new core.SkillRegistry();
          skills.register(core.createCodeReviewSkill(rules));

          const { runtime } = await createAgent({
            skills,
            skillContext: { url: data.url, outputPath: projectConfig.review?.outputPath },
            onEvent: (event: any) => {
              if (event.type === 'text_delta') {
                for (const line of event.text.split('\n')) {
                  const t = line.trim();
                  if (!t || t.startsWith('---')) continue;
                  if (t.startsWith('{') && (t.includes('"file"') || t.includes('"total"'))) {
                    try {
                      const f = JSON.parse(t);
                      if (f.file) panel.webview.postMessage({ type: 'finding', ...f });
                      else panel.webview.postMessage({ type: 'summary', ...f });
                    } catch {}
                  }
                }
              } else if (event.type === 'tool_call') {
                panel.webview.postMessage({ type: 'progress', message: `Analyzing: ${event.tool.name}...` });
              } else if (event.type === 'error') {
                panel.webview.postMessage({ type: 'reviewError', message: event.error.message });
              }
            },
          });

          const task = buildReviewTask(data.url);
          const result = await runtime.run(task);
          panel.webview.postMessage({ type: 'reviewDone', success: result.success });
        } catch (err) {
          panel.webview.postMessage({ type: 'reviewError', message: err instanceof Error ? err.message : String(err) });
        }
        break;
      }
      case 'sendChat': {
        try {
          const handler = new ChatEventHandler((role, content) => {
            panel.webview.postMessage({ type: 'chatMessage', role, content });
          });

          const editor = vscode.window.activeTextEditor;
          let prompt = data.text;
          if (editor) {
            const sel = editor.selection;
            prompt = `Context:\n- File: ${editor.document.uri.fsPath}\n- Language: ${editor.document.languageId}`;
            if (!sel.isEmpty) prompt += `\n- Selected code:\n\`\`\`${editor.document.languageId}\n${editor.document.getText(sel)}\n\`\`\``;
            prompt += `\n\nUser: ${data.text}`;
          }

          panel.webview.postMessage({ type: 'chatExecuting', executing: true });
          const { runtime } = await createAgent({ onEvent: (e: any) => handler.handle(e) });
          const result = await runtime.run(prompt);
          if (!result.success && result.error) {
            panel.webview.postMessage({ type: 'chatMessage', role: 'system', content: `\u274C ${result.error.message}` });
          }
          panel.webview.postMessage({ type: 'chatExecuting', executing: false });
        } catch (err) {
          panel.webview.postMessage({ type: 'chatMessage', role: 'system', content: `\u274C Error: ${err instanceof Error ? err.message : String(err)}` });
          panel.webview.postMessage({ type: 'chatExecuting', executing: false });
        }
        break;
      }
      case 'refresh': {
        panel.webview.postMessage({ type: 'context', ...getContextInfo() });
        panel.webview.postMessage({ type: 'data', ...collectStats() });
        break;
      }
    }
  });
}

function detectRepo(): string {
  try {
    const remote = execSync('git remote get-url origin', { encoding: 'utf-8', timeout: 5000 }).trim();
    const match = remote.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
    return match ? match[1] : '';
  } catch { return ''; }
}

function collectStats(): Record<string, unknown> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
  const forgeDir = path.join(workspaceRoot, '.forge');
  const reviews: Array<{ url: string; findings: number; date: string }> = [];
  try {
    const files = fs.readdirSync(forgeDir);
    for (const file of files) {
      if (file.startsWith('review-report-') && file.endsWith('.json')) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(forgeDir, file), 'utf-8'));
          if (data.findings) reviews.push({ url: data.url || '', findings: data.findings.length || data.summary?.total || 0, date: data.timestamp || '' });
        } catch {}
      }
    }
  } catch {}

  let prsOpen = 0;
  const repo = detectRepo();
  if (repo) {
    try {
      const out = execSync(`gh pr list --repo "${repo}" --state open --json number --limit 100 2>/dev/null`, { encoding: 'utf-8', timeout: 10000 });
      prsOpen = JSON.parse(out).length;
    } catch {}
  }
  let findingsTotal = 0;
  for (const r of reviews) findingsTotal += r.findings;
  return { prsOpen, reviewsTotal: reviews.length, findingsTotal, recentReviews: reviews.slice(-5).reverse() };
}

function getPRs(repo: string, limit: number): Array<Record<string, unknown>> {
  if (!repo) return [];
  try {
    const out = execSync(`gh pr list --repo "${repo}" --json number,title,state,author,createdAt,url --limit ${limit} 2>/dev/null`, { encoding: 'utf-8', timeout: 10000 });
    return JSON.parse(out).map((item: any) => ({
      number: String(item.number || ''), title: item.title || '', state: item.state || '',
      author: item.author?.login || '', time: item.createdAt || '', url: item.url || '',
    }));
  } catch { return []; }
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
