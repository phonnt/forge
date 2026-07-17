import * as vscode from 'vscode';
import { NavPanel } from './navPanel.js';
import { ForgePanelChat } from './panelChat.js';
import { createStatusBar } from './statusBar.js';
import { ForgeCodeActionProvider } from './codeActions.js';
import { createAgent, getProviderConfig, ChatEventHandler } from './agentRunner.js';

function wrapCommand(fn: () => Promise<void>, name: string): () => void {
  return () => {
    fn().catch((err) => {
      vscode.window.showErrorMessage(`forge [${name}]: ${err instanceof Error ? err.message : String(err)}`);
      console.error(`forge [${name}] error:`, err);
    });
  };
}

function setupChat(panel: ForgePanelChat): void {
  panel.onSendMessage = async (text: string) => {
    if (!getProviderConfig()) {
      panel.addMessage('system', 'No provider configured. Run "forge: Switch Provider" first.');
      return;
    }

    panel.setExecuting(true);

    try {
      const { getEditorContext } = await import('./inlineChat.js');
      const ctx = getEditorContext();
      let prompt = text;
      if (ctx) {
        prompt = `Context:\n- File: ${ctx.filePath}\n- Language: ${ctx.language}`;
        if (ctx.selectedCode) prompt += `\n- Selected code:\n\`\`\`${ctx.language}\n${ctx.selectedCode}\n\`\`\``;
        prompt += `\n\nUser: ${text}`;
      }

      const handler = new ChatEventHandler((role, content) => panel.addMessage(role, content));
      const { runtime } = await createAgent({ onEvent: (e: any) => handler.handle(e) });
      const result = await runtime.run(prompt);

      if (!result.success && result.error) {
        panel.addMessage('system', `\u274C ${result.error.message}`);
      }
    } catch (err) {
      panel.addMessage('system', `\u274C Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      panel.setExecuting(false);
    }
  };
}

export function activate(context: vscode.ExtensionContext) {
  const navPanel = new NavPanel();
  const panelChat = new ForgePanelChat(context);

  setupChat(panelChat);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('forge.chat', navPanel, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('forge.review', wrapCommand(() => import('./commands.js').then((m) => m.handleReview()), 'review')),
    vscode.commands.registerCommand('forge.reviewFromClipboard', wrapCommand(() => import('./commands.js').then((m) => m.handleReviewFromClipboard(panelChat)), 'reviewFromClipboard')),
    vscode.commands.registerCommand('forge.init', wrapCommand(() => import('./commands.js').then((m) => m.handleInit(panelChat)), 'init')),
    vscode.commands.registerCommand('forge.connect', wrapCommand(() => import('./commands.js').then((m) => m.handleConnect(panelChat)), 'connect')),
    vscode.commands.registerCommand('forge.showChat', () => navPanel.reveal()),
    vscode.commands.registerCommand('forge.openChatPanel', () => { panelChat.show(); setupChat(panelChat); }),
    vscode.commands.registerCommand('forge.configure', wrapCommand(() => import('./commands.js').then((m) => m.handleConfigure()), 'configure')),
    vscode.commands.registerCommand('forge.inlineChat', wrapCommand(() => import('./inlineChat.js').then((m) => m.handleInlineChat()), 'inlineChat')),
    vscode.commands.registerCommand('forge.explain', wrapCommand(() => import('./inlineChat.js').then((m) => m.handleExplain()), 'explain')),
    vscode.commands.registerCommand('forge.fix', wrapCommand(() => import('./inlineChat.js').then((m) => m.handleFix()), 'fix')),
    vscode.commands.registerCommand('forge.addTests', wrapCommand(() => import('./inlineChat.js').then((m) => m.handleAddTests()), 'addTests')),
    vscode.commands.registerCommand('forge.refactor', wrapCommand(() => import('./inlineChat.js').then((m) => m.handleRefactor()), 'refactor')),
    vscode.commands.registerCommand('forge.applyDiff', (code: string, language: string) => {
      import('./inlineChat.js').then((m) => m.handleApplyDiff(code, language));
    }),
    vscode.commands.registerCommand('forge.showPrompts', wrapCommand(() => import('./prompts.js').then((m) => m.handleShowPrompts()), 'showPrompts')),
    vscode.languages.registerCodeActionsProvider('*', new ForgeCodeActionProvider(), {
      providedCodeActionKinds: ForgeCodeActionProvider.providedCodeActionKinds,
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('forge')) {
        panelChat.updateContext();
      }
    }),
  );

  createStatusBar(context, panelChat);
  console.log('[forge] Extension activated successfully');
}

export function deactivate() {}
