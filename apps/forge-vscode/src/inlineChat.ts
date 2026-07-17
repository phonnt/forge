import * as vscode from 'vscode';
import { createAgent, getProviderConfig } from './agentRunner.js';

function buildPrompt(code: string, language: string, instruction: string): string {
  return `You are an expert ${language} developer. Your task is to modify the following code.

## Instruction
${instruction}

## Code
\`\`\`${language}
${code}
\`\`\`

Return ONLY the modified code in a code block. Do not include explanations.`;
}

export async function handleInlineChat(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('forge: No active editor.');
    return;
  }

  const selection = editor.selection;
  const hasSelection = !selection.isEmpty;
  const range = hasSelection ? selection : new vscode.Range(0, 0, editor.document.lineCount - 1, editor.document.lineAt(editor.document.lineCount - 1).text.length);
  const code = editor.document.getText(range);
  const language = editor.document.languageId;

  const instruction = await vscode.window.showInputBox({
    prompt: hasSelection
      ? `Edit selected code (${code.split('\n').length} lines)...`
      : 'Edit entire file...',
    placeHolder: 'Add error handling',
    value: '',
  });

  if (!instruction) return;

  if (!getProviderConfig()) {
    vscode.window.showErrorMessage('forge: No provider configured. Run "forge: Switch Provider" first.');
    return;
  }

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'forge: Editing...', cancellable: false },
    async () => {
      try {
        const { runtime } = await createAgent({});
        const prompt = buildPrompt(code, language, instruction);
        const result = await runtime.run(prompt);

        if (result.success) {
          const modifiedCode = extractCodeBlock(result.output, language);
          if (modifiedCode) {
            await editor.edit((editBuilder) => { editBuilder.replace(range, modifiedCode); });
            vscode.window.showInformationMessage('forge: Code updated.');
          } else {
            showInNewEditor(result.output, language);
          }
        } else {
          vscode.window.showErrorMessage(`forge: ${result.error?.message || 'Unknown error'}`);
        }
      } catch (err) {
        vscode.window.showErrorMessage(`forge: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}

export async function handleExplain(): Promise<void> {
  await runCodeAction('Explain this code', 'Explain what this code does in clear terms. Be concise.');
}

export async function handleFix(): Promise<void> {
  await runCodeAction('Fix issues', 'Find and fix any bugs, logic errors, or potential issues in this code. Return the fixed code in a code block.');
}

export async function handleAddTests(): Promise<void> {
  await runCodeAction('Add unit tests', 'Write comprehensive unit tests for this code. Use the same testing framework as the project. Return ONLY the test code in a code block.');
}

export async function handleRefactor(): Promise<void> {
  await runCodeAction('Refactor', 'Refactor this code to improve readability, maintainability, and performance. Return the refactored code in a code block.');
}

async function runCodeAction(title: string, instruction: string): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('forge: No active editor.');
    return;
  }

  const selection = editor.selection;
  const hasSelection = !selection.isEmpty;
  const range = hasSelection ? selection : new vscode.Range(0, 0, editor.document.lineCount - 1, editor.document.lineAt(editor.document.lineCount - 1).text.length);
  const code = editor.document.getText(range);
  const language = editor.document.languageId;

  if (!getProviderConfig()) {
    vscode.window.showErrorMessage('forge: No provider configured. Run "forge: Switch Provider" first.');
    return;
  }

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: `forge: ${title}...`, cancellable: false },
    async () => {
      try {
        const { runtime } = await createAgent({});
        const prompt = buildPrompt(code, language, instruction);
        const result = await runtime.run(prompt);

        if (result.success) {
          showInNewEditor(result.output, language);
        } else {
          vscode.window.showErrorMessage(`forge: ${result.error?.message || 'Unknown error'}`);
        }
      } catch (err) {
        vscode.window.showErrorMessage(`forge: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}

function extractCodeBlock(output: string, language: string): string | null {
  const regex = new RegExp('```(?:' + language + ')?\\n?([\\s\\S]*?)```', 'i');
  const match = output.match(regex);
  return match ? match[1].trim() : null;
}

function showInNewEditor(content: string, language: string): void {
  const doc = vscode.workspace.openTextDocument({
    content,
    language,
  });
  doc.then((d) => vscode.window.showTextDocument(d, { preview: true }));
}

export function getEditorContext(): { filePath: string; language: string; selectedCode: string; fullContent: string } | null {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return null;

  const selection = editor.selection;
  const filePath = editor.document.uri.fsPath;
  const language = editor.document.languageId;
  const fullContent = editor.document.getText();
  const selectedCode = selection.isEmpty
    ? ''
    : editor.document.getText(selection);

  return { filePath, language, selectedCode, fullContent };
}

export async function handleApplyDiff(code: string, language: string): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('forge: No active editor to apply diff.');
    return;
  }

  const doc = await vscode.workspace.openTextDocument({
    content: code,
    language: language || editor.document.languageId,
  });

  await vscode.commands.executeCommand('vscode.diff',
    editor.document.uri,
    doc.uri,
    'forge: Proposed Change (left=current, right=proposed)',
  );
}
