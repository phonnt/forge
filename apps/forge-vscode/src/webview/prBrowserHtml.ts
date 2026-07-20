import { loadHtml } from './htmlLoader.js';

export function prBrowserHtml(defaultRepo: string): string {
  return loadHtml('prBrowser.html', { defaultRepo });
}
