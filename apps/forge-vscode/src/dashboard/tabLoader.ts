import { loadHtml } from '../webview/htmlLoader.js';

export function getTabContent(tab: string): string {
  return loadHtml('../dashboard/' + tab + '.html');
}
