import * as vscode from 'vscode';
import { SectionViewProvider, SectionItem } from '../shared/sectionView.js';
import { isCliInstalled, checkAuth, authViaTerminal, listRepos, fetchPullRequests, detectRepo, MRFilter } from '../shared/gitService.js';

const REPO_KEY = 'forge.mr.repo';
const PROVIDER_KEY = 'forge.mr.provider';
const FILTER_KEY = 'forge.mr.filter';

let _view: SectionViewProvider | undefined;
let _context: vscode.ExtensionContext | undefined;
let _filter: MRFilter = { state: 'open' };

export function createMRView(): SectionViewProvider {
  _view = new SectionViewProvider([]);
  return _view;
}

export async function refreshMRList(): Promise<void> {
  if (!_view) return;

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();

  const detected = detectRepo(workspaceRoot);
  const provider = detected?.provider ?? (_context?.workspaceState.get<string>(PROVIDER_KEY) as 'github' | 'gitlab' | undefined);

  if (!provider) {
    _view.updateItems([{ label: 'Connect to Git Provider', command: 'forge.authGitProvider' }]);
    return;
  }

  if (!isCliInstalled(provider)) {
    _view.updateItems([{ label: `Install ${provider === 'github' ? 'GitHub' : 'GitLab'} CLI`, command: 'forge.installCLI' }]);
    return;
  }

  if (!checkAuth(provider)) {
    const label = provider === 'github' ? 'Connect to GitHub' : 'Connect to GitLab';
    _view.updateItems([{ label, command: 'forge.authGitProvider' }]);
    return;
  }

  const savedRepo = _context?.workspaceState.get<string>(REPO_KEY);

  if (!savedRepo) {
    _view.updateItems([{ label: 'Select Repository', command: 'forge.selectRepo' }]);
    return;
  }

  const prs = fetchPullRequests(savedRepo, provider, 30, _filter);
  if (prs.length === 0) {
    _view.updateItems([{ label: 'No pull requests found' }]);
    return;
  }
  _view.updateItems(prs.map((pr) => ({
    label: `#${pr.number} ${pr.title} \u2014 ${pr.state}`,
    url: pr.url,
  })));
}

export function setContext(ctx: vscode.ExtensionContext): void {
  _context = ctx;
}

export async function handleAuthProvider(): Promise<void> {
  const provider = await vscode.window.showQuickPick(
    [
      { label: 'GitHub', description: 'gh auth login', provider: 'github' as const },
      { label: 'GitLab', description: 'glab auth login', provider: 'gitlab' as const },
    ],
    { placeHolder: 'Select git provider to authenticate' },
  );
  if (!provider) return;

  if (!isCliInstalled(provider.provider)) {
    vscode.window.showErrorMessage(
      `${provider.label} CLI is not installed. Run "brew install ${provider.provider === 'github' ? 'gh' : 'glab'}" to install.`,
    );
    return;
  }

  await _context?.workspaceState.update(PROVIDER_KEY, provider.provider);
  const success = await authViaTerminal(provider.provider);
  if (success) {
    await refreshMRList();
  }
}

export async function handleInstallCLI(): Promise<void> {
  const provider = await vscode.window.showQuickPick(
    [
      { label: 'GitHub CLI (gh)', description: 'brew install gh' },
      { label: 'GitLab CLI (glab)', description: 'brew install glab' },
    ],
    { placeHolder: 'Which CLI do you want to install?' },
  );
  if (!provider) return;

  const cmd = provider.label.includes('GitHub') ? 'brew install gh' : 'brew install glab';
  const terminal = vscode.window.createTerminal('Forge — Install CLI');
  terminal.show();
  terminal.sendText(cmd);

  vscode.window.showInformationMessage(`Installing ${provider.label}... Reload window after installation and try again.`);
}

export async function handleSelectRepo(): Promise<void> {
  const provider = (_context?.workspaceState.get<string>(PROVIDER_KEY) as 'github' | 'gitlab' | undefined)
    ?? (await vscode.window.showQuickPick(
      [
        { label: 'GitHub', provider: 'github' as const },
        { label: 'GitLab', provider: 'gitlab' as const },
      ],
      { placeHolder: 'Select git provider' },
    ).then((r) => r?.provider));

  if (!provider) return;

  await _context?.workspaceState.update(PROVIDER_KEY, provider);

  const repos = await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Loading repositories...' },
    async () => listRepos(provider),
  );

  if (repos.length === 0) {
    vscode.window.showErrorMessage(`No repositories found. Make sure you have access to repositories via ${provider === 'github' ? 'gh' : 'glab'}.`);
    return;
  }

  const selected = await vscode.window.showQuickPick(
    repos.map((r) => ({ label: r.fullName, description: '', repo: r.fullName })),
    { placeHolder: 'Select a repository' },
  );
  if (!selected) return;

  await _context?.workspaceState.update(REPO_KEY, selected.repo);
  await refreshMRList();
}

export async function handleMRFilter(): Promise<void> {
  const state = await vscode.window.showQuickPick(
    [
      { label: 'Open', description: 'Show open PRs/MRs', state: 'open' },
      { label: 'Closed', description: 'Show closed PRs/MRs', state: 'closed' },
      { label: 'Merged', description: 'Show merged PRs/MRs', state: 'merged' },
      { label: 'All', description: 'Show all PRs/MRs', state: 'all' },
    ],
    { placeHolder: `Current: ${_filter.state || 'open'}. Select filter state:` },
  );
  if (!state) return;

  _filter.state = state.state;
  await _context?.workspaceState.update(FILTER_KEY, _filter);
  await refreshMRList();
}

export async function handleSwitchRepo(): Promise<void> {
  await _context?.workspaceState.update(REPO_KEY, undefined);
  await handleSelectRepo();
}

export async function handleSwitchGitProvider(): Promise<void> {
  await _context?.workspaceState.update(PROVIDER_KEY, undefined);
  await _context?.workspaceState.update(REPO_KEY, undefined);
  await handleAuthProvider();
}
