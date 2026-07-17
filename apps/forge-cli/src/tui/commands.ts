import {
  useChatStore,
  PROVIDER_LIST,
  getWizardGeneration,
  useAgentStore,
  loadForgeConfig,
  setActiveProvider,
  initProjectConfig,
} from 'forge-core';
import type { DetectedProviderInfo } from 'forge-core';
import { detectProviders } from '../tui/detector.js';
import { createReviewRuntime } from '../cli/commands/review.js';

interface CommandResult {
  type: 'message' | 'review';
  message: string;
  data?: unknown;
}

const COMMANDS: Record<string, { desc: string; usage: string }> = {
  '/review': { desc: 'Review a pull request or merge request', usage: '/review <url>' },
  '/connect': { desc: 'Switch active LLM provider', usage: '/connect <name>' },
  '/init': { desc: 'Initialize forge in current project', usage: '/init' },
  '/help': { desc: 'Show available commands', usage: '/help' },
  '/clear': { desc: 'Clear chat messages', usage: '/clear' },
  '/quit': { desc: 'Exit forge', usage: '/quit' },
  '/exit': { desc: 'Exit forge', usage: '/exit' },
  '/status': { desc: 'Show current configuration', usage: '/status' },
};

export async function handleCommand(input: string): Promise<CommandResult> {
  const trimmed = input.trim();

  if (!trimmed.startsWith('/')) {
    return {
      type: 'message',
      message: `Unknown command: ${trimmed}\nType /help to see available commands.`,
    };
  }

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');

  switch (cmd) {
    case '/review':
      return handleReview(args);

    case '/connect':
      return handleConnect(args);

    case '/init':
      return handleInit();

    case '/help':
      return handleHelp();

    case '/clear':
      useChatStore.getState().clearMessages();
      return { type: 'message', message: '' };

    case '/quit':
    case '/exit':
      process.exit(0);

    case '/status':
      return handleStatus();

    default:
      return {
        type: 'message',
        message: `Unknown command: ${cmd}\nType /help to see available commands.`,
      };
  }
}

async function handleReview(url: string): Promise<CommandResult> {
  if (!url) {
    return {
      type: 'message',
      message: 'Usage: /review <url>\n\nExample: /review https://github.com/owner/repo/pull/42',
    };
  }

  const chatStore = useChatStore.getState();

  chatStore.addMessage('system', `Starting review of: ${url}\n`);

  try {
    const { runtime } = await createReviewRuntime(url, {});

    chatStore.setExecuting(true);

    runtime.config.onEvent = (event) => {
      switch (event.type) {
        case 'text_delta':
          useAgentStore.getState().addEvent(event);
          break;
        case 'tool_call':
          chatStore.addMessage('system', `  🔧 ${event.tool.name}...`);
          break;
        case 'tool_result':
          chatStore.addMessage('system', `  ✓ done`);
          break;
      }
    };

    const task = `Review the code changes at this URL: ${url}

First, use the git_diff tool to fetch the diff and changed files. Then analyze each file against the review rules. 

For each issue you find, output a JSONL line with the finding. Use this exact format:
{"file":"<path>","lineStart":<number>,"lineEnd":<number>,"severity":"critical|major|minor|info","category":"security|performance|bug|style|maintainability|naming|other","title":"<short title>","description":"<detailed description>","suggestion":"<actionable fix>"}

After reviewing all files, output:
---SUMMARY---
{"total":<n>,"critical":<n>,"major":<n>,"minor":<n>,"info":<n>}

Be thorough - check every changed file and every line of the diff.`;

    const result = await runtime.run(task);

    chatStore.setExecuting(false);

    if (result.success) {
      chatStore.addMessage('assistant', result.output);
      chatStore.addMessage('system', `\n✅ Review complete. Report saved to .forge/review-report.md`);
    } else {
      chatStore.addMessage('system', `\n❌ Review failed: ${result.error?.message}`);
    }

    return { type: 'message', message: '' };
  } catch (err) {
    chatStore.setExecuting(false);
    return {
      type: 'message',
      message: `❌ Error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function handleConnect(name: string): CommandResult {
  if (name) {
    try {
      setActiveProvider(name);
      const config = loadForgeConfig();
      const provider = config.providers.find((p) => p.name === name);
      return {
        type: 'message',
        message: `✅ Connected to ${name} (${provider?.type}/${provider?.model})`,
      };
    } catch (err) {
      return {
        type: 'message',
        message: `❌ ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  const store = useChatStore.getState();
  store.addMessage('system', '🔍 Scanning for available providers...');

  const gen = getWizardGeneration();

  detectProviders().then((detected) => {
    if (getWizardGeneration() !== gen) {
      return;
    }

    const available = detected.filter((p) => p.available);
    const all = detected.length > 0 ? detected : PROVIDER_LIST.map((p) => ({
      id: p.id,
      name: p.name,
      desc: p.desc,
      available: false,
      source: 'not detected',
    } as DetectedProviderInfo));

    if (available.length === 0) {
      store.addMessage('system', 'No providers auto-detected. Showing all options.');
    } else {
      store.addMessage('system', `✅ Found ${available.length} provider${available.length > 1 ? 's' : ''}: ${available.map((p) => p.name).join(', ')}`);
    }

    store.startWizard(all);
  });

  return { type: 'message', message: '' };
}

function handleInit(): CommandResult {
  try {
    const forgeDir = initProjectConfig();
    return {
      type: 'message',
      message: `✅ Project initialized!\n\nCreated:\n  ${forgeDir}/config.yaml\n  ${forgeDir}/rules.md\n  ${forgeDir}/skills.yaml\n\nNext: Edit .forge/rules.md to customize review rules.`,
    };
  } catch (err) {
    return {
      type: 'message',
      message: `❌ ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function handleHelp(): CommandResult {
  let output = 'Available commands:\n\n';
  for (const [cmd, info] of Object.entries(COMMANDS)) {
    output += `  ${cmd.padEnd(12)} ${info.desc}\n`;
  }
  output += `\nTip: Run forge without arguments to open this interactive dashboard.\n`;
  output += `     Run forge review <url> for quick CLI review.`;
  return { type: 'message', message: output };
}

function handleStatus(): CommandResult {
  try {
    const config = loadForgeConfig();
    const active = config.active ?? config.providers[0]?.name;
    const provider = config.providers.find((p) => p.name === active);

    let output = 'Current configuration:\n\n';
    output += `  Active provider: ${active}\n`;
    if (provider) {
      output += `  Type:  ${provider.type}\n`;
      output += `  Model: ${provider.model}\n`;
    }
    output += `\nProviders:\n`;
    for (const p of config.providers) {
      output += `  ${p.name === active ? '●' : '○'} ${p.name} (${p.type}/${p.model})\n`;
    }
    return { type: 'message', message: output };
  } catch {
    return {
      type: 'message',
      message: 'No configuration found.\nCreate ~/.forge/config.yaml to configure providers.',
    };
  }
}
