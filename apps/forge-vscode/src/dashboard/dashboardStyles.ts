import {
  BASE_STYLES,
  CHAT_STYLES,
  FINDING_STYLES,
  CONTEXT_STYLES,
  LIST_STYLES,
  PROGRESS_STYLES,
  EMPTY_STYLES,
} from '../webview/commonStyles.js';

export const STYLES = `
${BASE_STYLES}
.tabs{display:flex;border-bottom:1px solid var(--vscode-panel-border);flex-shrink:0;background:var(--vscode-editor-background)}
.tab{padding:8px 16px;cursor:pointer;font-size:12px;font-weight:600;color:var(--vscode-descriptionForeground);border-bottom:2px solid transparent}
.tab:hover{color:var(--vscode-foreground)}
.tab.active{color:var(--vscode-foreground);border-bottom-color:var(--vscode-focusBorder)}
.tab-content{flex:1;overflow-y:auto;padding:16px;display:none}
.tab-content.active{display:block}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
.stat-card{padding:14px;border-radius:8px;text-align:center}
.stat-card .num{font-size:26px;font-weight:700}
.stat-card .label{font-size:10px;text-transform:uppercase;opacity:.8;margin-top:2px}
.stat-card.prs{background:var(--vscode-button-background);color:var(--vscode-button-foreground)}
.stat-card.reviews{background:#1d5a3a;color:#89d185}
.stat-card.findings{background:#5a4d1d;color:#f4c971}
.section{margin-bottom:16px}
.section h2{font-size:13px;margin-bottom:8px;display:flex;justify-content:space-between}
.form-group{margin-bottom:12px}
.form-group label{display:block;font-weight:600;margin-bottom:4px;font-size:12px}
.form-group .hint{font-size:10px;color:var(--vscode-descriptionForeground)}
.radio-group{display:flex;gap:16px;margin-top:4px}
.radio-group label{font-weight:400;display:flex;align-items:center;gap:4px}
.radio-group input[type=radio]{width:auto}
.toolbar{display:flex;gap:8px;margin-bottom:12px;align-items:center}
.toolbar input{flex:1}
.toolbar select{font-size:12px}
.refresh{cursor:pointer;opacity:.6;font-size:14px}
.refresh:hover{opacity:1}
${CHAT_STYLES}
${FINDING_STYLES}
${CONTEXT_STYLES}
${LIST_STYLES}
${PROGRESS_STYLES}
${EMPTY_STYLES}
body{display:flex;flex-direction:column;height:100vh}
`;
