import * as vscode from 'vscode';
import { createAgent, getProviderConfig } from './agentRunner.js';

const PROMPT_TEMPLATES: Array<{ label: string; detail: string; prompt: string }> = [
  {
    label: 'Security Review',
    detail: 'Check for security vulnerabilities',
    prompt: `Review this code for security issues:
- SQL injection, XSS, CSRF
- Hardcoded secrets or API keys
- Insecure cryptography
- Missing input validation
- Authentication/authorization flaws
For each issue, explain the vulnerability and suggest a fix.`,
  },
  {
    label: 'Generate Unit Tests',
    detail: 'Write comprehensive unit tests',
    prompt: `Write comprehensive unit tests for this code. Use the project's existing testing framework.
- Cover happy path, edge cases, and error handling
- Mock external dependencies
- Include setup/teardown if needed
Return ONLY the test code in a code block.`,
  },
  {
    label: 'Add JSDoc / Documentation',
    detail: 'Add documentation comments',
    prompt: `Add JSDoc/TSDoc comments to all exported functions, classes, and interfaces.
Include @param, @returns, @throws, and @example where applicable.`,
  },
  {
    label: 'Refactor for Readability',
    detail: 'Improve code structure and clarity',
    prompt: `Refactor this code for better readability and maintainability:
- Extract complex expressions into well-named variables
- Break long functions into smaller ones
- Improve variable/function naming
- Add early returns to reduce nesting
- Remove dead code
Return the refactored code.`,
  },
  {
    label: 'Performance Optimization',
    detail: 'Find and fix performance issues',
    prompt: `Analyze this code for performance issues:
- N+1 queries or unnecessary loops
- Missing caching opportunities
- Memory leaks (event listeners, timers)
- Inefficient data structures
- Expensive operations in hot paths
For each issue, explain the impact and suggest an optimized version.`,
  },
  {
    label: 'Explain Code',
    detail: 'Explain what the code does in plain English',
    prompt: `Explain this code clearly and concisely:
- What does it do at a high level?
- Walk through the key logic step by step
- Identify any non-obvious patterns or edge cases
Use plain language suitable for a code review.`,
  },
  {
    label: 'Fix TypeScript Errors',
    detail: 'Fix TypeScript type and compilation errors',
    prompt: `Fix all TypeScript errors and warnings in this code:
- Add proper type annotations where missing
- Fix type mismatches
- Replace 'any' with specific types
- Ensure strict mode compatibility
Return the fixed code.`,
  },
  {
    label: 'Add Error Handling',
    detail: 'Add try-catch and error boundaries',
    prompt: `Add proper error handling to this code:
- Wrap risky operations in try-catch
- Add meaningful error messages
- Handle edge cases (null, undefined, empty arrays)
- Add fallback/retry logic where appropriate
Return the updated code.`,
  },
];

export async function handleShowPrompts(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('forge: No active editor.');
    return;
  }

  const picked = await vscode.window.showQuickPick(
    PROMPT_TEMPLATES.map((p) => ({ label: p.label, detail: p.detail, prompt: p.prompt })),
    { placeHolder: 'Select a prompt template', matchOnDetail: true },
  );

  if (!picked) return;

  const selection = editor.selection;
  const code = selection.isEmpty
    ? editor.document.getText()
    : editor.document.getText(selection);
  const language = editor.document.languageId;

  const fullPrompt = `${picked.prompt}\n\n## Code\n\`\`\`${language}\n${code}\n\`\`\``;

  if (!getProviderConfig()) {
    vscode.window.showErrorMessage('forge: No provider configured. Run "forge: Switch Provider" first.');
    return;
  }

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: `forge: ${picked.label}...`, cancellable: false },
    async () => {
      try {
        const { runtime } = await createAgent({});
        const result = await runtime.run(fullPrompt);

        if (result.success) {
          const doc = await vscode.workspace.openTextDocument({
            content: result.output,
            language: 'markdown',
          });
          await vscode.window.showTextDocument(doc, { preview: true });
        } else {
          vscode.window.showErrorMessage(`forge: ${result.error?.message || 'Unknown error'}`);
        }
      } catch (err) {
        vscode.window.showErrorMessage(`forge: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
