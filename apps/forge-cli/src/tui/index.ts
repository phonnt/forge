import { render } from 'ink';
import React from 'react';
import { execSync } from 'node:child_process';
import path from 'node:path';
import type { AgentRuntime } from 'forge-core';
import { findProjectRoot, loadForgeConfig, getActiveProvider, useChatStore } from 'forge-core';
import { ChatShell } from './components/ChatShell.js';
import { setupFullScreen } from './screen.js';

function buildWelcomeMessage(): string {
  const lines: string[] = [];
  lines.push('Welcome to forge — AI-powered development companion.');

  const projectRoot = findProjectRoot() ?? process.cwd();
  const folderName = path.basename(projectRoot);
  const gitBranch = getGitBranch(projectRoot);
  const displayPath = gitBranch
    ? `${projectRoot}  (${gitBranch})`
    : projectRoot;

  lines.push('');
  lines.push(`  Project : ${displayPath}`);

  try {
    const config = loadForgeConfig();
    const active = getActiveProvider(config);
    lines.push(`  Model   : ${active.model}  (${active.type})`);
  } catch {
    lines.push(`  Model   : not configured`);
  }

  lines.push('');
  lines.push('Type /help to see available commands.');
  return lines.join('\n');
}

function getGitBranch(cwd: string): string | null {
  try {
    return execSync('git branch --show-current', {
      cwd,
      encoding: 'utf-8',
      timeout: 3000,
    }).trim() || null;
  } catch {
    return null;
  }
}

export async function runTUIDashboard(): Promise<void> {
  const cleanup = setupFullScreen();
  process.on('exit', cleanup);

  try {
    useChatStore.getState().addMessage('system', buildWelcomeMessage());

    const { waitUntilExit } = render(React.createElement(ChatShell, {}));
    await waitUntilExit();
  } finally {
    cleanup();
  }
}

export async function runTUIReview(
  runtime: AgentRuntime,
  task: string,
  url: string,
): Promise<void> {
  const cleanup = setupFullScreen();
  process.on('exit', cleanup);

  try {
    const chatStore = useChatStore.getState();
    chatStore.addMessage('user', `/review ${url}`);
    chatStore.addMessage('system', `Starting review of: ${url}\n`);

    const { waitUntilExit } = render(React.createElement(ChatShell, {}));

    chatStore.setExecuting(true);

    runtime.config.onEvent = (event) => {
      switch (event.type) {
        case 'text_delta':
          break;
        case 'tool_call':
          chatStore.addMessage('system', `  🔧 ${event.tool.name}...`);
          break;
        case 'tool_result':
          chatStore.addMessage('system', `  ✓ done`);
          break;
      }
    };

    const result = await runtime.run(task);

    chatStore.setExecuting(false);

    if (result.success) {
      chatStore.addMessage('assistant', result.output);
      chatStore.addMessage('system', `\n✅ Review complete. Report saved to .forge/review-report.md`);
    } else {
      chatStore.addMessage('system', `\n❌ Review failed: ${result.error?.message}`);
    }

    await waitUntilExit();
  } finally {
    cleanup();
  }
}
