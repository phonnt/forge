import * as vscode from 'vscode';
import { getContextInfo } from './agentRunner.js';

let statusBarItem: vscode.StatusBarItem;

export function createStatusBar(context: vscode.ExtensionContext, _panel: any): void {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'forge.showChat';
  statusBarItem.text = '$(hubot) forge';
  statusBarItem.tooltip = 'Open forge Chat';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
  updateStatusBar();
}

function updateStatusBar(): void {
  const info = getContextInfo();
  if (info.provider) {
    statusBarItem.text = `$(hubot) forge: ${info.provider}`;
    statusBarItem.tooltip = `forge - ${info.provider}`;
  } else {
    statusBarItem.text = '$(hubot) forge';
    statusBarItem.tooltip = 'forge - Click to configure';
  }
}
