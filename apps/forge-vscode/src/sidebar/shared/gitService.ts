import { execSync, spawn } from 'node:child_process';
import * as vscode from 'vscode';

export interface PullRequest {
  number: string;
  title: string;
  author: string;
  state: string;
  url: string;
  branch: string;
  time: string;
  provider: 'github' | 'gitlab';
}

export interface RepoItem {
  name: string;
  owner: string;
  fullName: string;
}

export interface MRFilter {
  state?: string;
  author?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function cliName(provider: 'github' | 'gitlab'): string {
  return provider === 'github' ? 'gh' : 'glab';
}

export function isCliInstalled(provider: 'github' | 'gitlab'): boolean {
  try {
    execSync(`which ${cliName(provider)}`, { encoding: 'utf-8', timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

export function checkAuth(provider: 'github' | 'gitlab'): boolean {
  try {
    execSync(`${cliName(provider)} auth status`, { encoding: 'utf-8', timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

export async function authViaTerminal(provider: 'github' | 'gitlab'): Promise<boolean> {
  const cli = cliName(provider);
  const host = provider === 'github' ? 'github.com' : 'gitlab.com';

  const terminal = vscode.window.createTerminal(`Forge — ${provider === 'github' ? 'GitHub' : 'GitLab'} Auth`);
  terminal.show();
  terminal.sendText(`${cli} auth login --hostname ${host} --web`);

  return vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: `Waiting for ${provider === 'github' ? 'GitHub' : 'GitLab'} authentication...`, cancellable: true },
    async (_progress, token) => {
      for (let i = 0; i < 60; i++) {
        if (token.isCancellationRequested) return false;
        await sleep(2000);
        if (checkAuth(provider)) {
          vscode.window.showInformationMessage(`${provider === 'github' ? 'GitHub' : 'GitLab'} authenticated successfully`);
          return true;
        }
      }
      vscode.window.showWarningMessage(`Authentication timed out. Please try again.`);
      return false;
    },
  );
}

export async function listRepos(provider: 'github' | 'gitlab'): Promise<RepoItem[]> {
  const cli = cliName(provider);
  try {
    if (provider === 'gitlab') {
      const output = execSync(
        `${cli} repo list --output json 2>/dev/null`,
        { encoding: 'utf-8', timeout: 15000 },
      );
      return (JSON.parse(output) || []).slice(0, 100).map((item: any) => ({
        name: item.path || item.name || '',
        owner: item.namespace?.full_path || item.namespace?.path || '',
        fullName: item.path_with_namespace || `${item.namespace?.full_path}/${item.path}` || '',
      }));
    }
    const output = execSync(
      `${cli} repo list --json nameWithOwner --limit 100 2>/dev/null`,
      { encoding: 'utf-8', timeout: 15000 },
    );
    return (JSON.parse(output) || []).map((item: any) => {
      const parts = (item.nameWithOwner || '').split('/');
      return {
        name: parts[1] || '',
        owner: parts[0] || '',
        fullName: item.nameWithOwner || '',
      };
    });
  } catch {
    return [];
  }
}

export function fetchPullRequests(
  repo: string,
  provider: 'github' | 'gitlab',
  limit: number = 20,
  filter?: MRFilter,
): PullRequest[] {
  try {
    if (provider === 'gitlab') {
      let cmd = `glab mr list --repo "${repo}" --output json`;
      if (filter?.state && filter.state !== 'all') {
        cmd += ` --state ${filter.state}`;
      }
      if (filter?.author) {
        cmd += ` --author "${filter.author}"`;
      }
      const output = execSync(`${cmd} 2>/dev/null`, { encoding: 'utf-8', timeout: 15000 });
      return (JSON.parse(output) || []).slice(0, limit).map((item: any) => ({
        number: String(item.iid || item.id || ''),
        title: item.title || '',
        author: item.author?.username || item.author?.name || '',
        state: item.state || 'unknown',
        url: item.web_url || '',
        branch: item.source_branch || '',
        time: item.created_at || '',
        provider: 'gitlab' as const,
      }));
    }

    let cmd = `gh pr list --repo "${repo}" --json number,title,author,state,url,headRefName,createdAt --limit ${limit}`;
    if (filter?.state && filter.state !== 'all') {
      cmd += ` --state ${filter.state}`;
    }
    if (filter?.author) {
      cmd += ` --author "${filter.author}"`;
    }
    const output = execSync(`${cmd} 2>/dev/null`, { encoding: 'utf-8', timeout: 15000 });
    return (JSON.parse(output) || []).map((item: any) => ({
      number: String(item.number || ''),
      title: item.title || '',
      author: item.author?.login || '',
      state: item.state || 'unknown',
      url: item.url || '',
      branch: item.headRefName || '',
      time: item.createdAt || '',
      provider: 'github' as const,
    }));
  } catch {
    return [];
  }
}

export function detectRepo(cwd: string): { repo: string; provider: 'github' | 'gitlab' } | null {
  try {
    const remote = execSync('git remote get-url origin', { cwd, encoding: 'utf-8', timeout: 5000 }).trim();
    const match = remote.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
    if (!match) return null;

    const repo = match[1];
    const provider: 'github' | 'gitlab' = remote.includes('gitlab') ? 'gitlab' : 'github';
    return { repo, provider };
  } catch {
    return null;
  }
}
