import * as vscode from 'vscode';

export class ForgeCodeActionProvider implements vscode.CodeActionProvider {
  static readonly providedCodeActionKinds = [vscode.CodeActionKind.RefactorRewrite];

  provideCodeActions(
    _document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    _context: vscode.CodeActionContext,
    _token: vscode.CancellationToken,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const explainAction = new vscode.CodeAction('forge: Explain this code', vscode.CodeActionKind.RefactorRewrite);
    explainAction.command = { command: 'forge.explain', title: 'Explain this code' };
    actions.push(explainAction);

    const fixAction = new vscode.CodeAction('forge: Fix issues', vscode.CodeActionKind.QuickFix);
    fixAction.command = { command: 'forge.fix', title: 'Fix issues' };
    actions.push(fixAction);

    const testAction = new vscode.CodeAction('forge: Add unit tests', vscode.CodeActionKind.RefactorRewrite);
    testAction.command = { command: 'forge.addTests', title: 'Add unit tests' };
    actions.push(testAction);

    const refactorAction = new vscode.CodeAction('forge: Refactor', vscode.CodeActionKind.RefactorRewrite);
    refactorAction.command = { command: 'forge.refactor', title: 'Refactor' };
    actions.push(refactorAction);

    return actions;
  }
}
