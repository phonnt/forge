export const BASE_STYLES = `
*{margin:0;padding:0;box-sizing:border-box}
body{
  font-family:var(--vscode-font-family,-apple-system,sans-serif);
  font-size:var(--vscode-font-size,13px);
  color:var(--vscode-foreground);
  line-height:1.6;
}
input,textarea,select{
  background:var(--vscode-input-background);color:var(--vscode-input-foreground);
  border:1px solid var(--vscode-input-border);border-radius:4px;
  padding:6px 8px;font-family:inherit;font-size:12px;outline:none;
}
input:focus,textarea:focus,select:focus{border-color:var(--vscode-focusBorder)}
button{
  background:var(--vscode-button-background);color:var(--vscode-button-foreground);
  border:none;border-radius:4px;padding:6px 14px;cursor:pointer;font-size:12px;
}
button:hover{background:var(--vscode-button-hoverBackground)}
button.secondary{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground)}
button:disabled{opacity:0.5}
input.invalid{border-color:var(--vscode-inputValidation-errorBorder)}
`;

export const CHAT_STYLES = `
.chat-messages{flex:1;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:6px}
.chat-msg{padding:6px 10px;border-radius:6px;max-width:100%;word-break:break-word;white-space:pre-wrap;line-height:1.5;font-size:12px}
.chat-msg.user{background:var(--vscode-button-background);color:var(--vscode-button-foreground);align-self:flex-end}
.chat-msg.assistant{background:var(--vscode-editor-background);border:1px solid var(--vscode-panel-border);align-self:flex-start}
.chat-msg.system{color:var(--vscode-descriptionForeground);font-style:italic;font-size:11px;align-self:flex-start;padding:1px 6px}
.chat-input-area{display:flex;padding:8px;border-top:1px solid var(--vscode-panel-border);gap:6px}
.chat-input-area textarea{flex:1;resize:none;min-height:28px;line-height:1.4;font-family:var(--vscode-editor-font-family,monospace)}
`;

export const FINDING_STYLES = `
.finding{border:1px solid var(--vscode-panel-border);border-radius:6px;padding:10px;margin-bottom:8px}
.finding .sev{font-size:10px;padding:1px 6px;border-radius:3px;font-weight:600;text-transform:uppercase;margin-right:6px}
.finding .sev.critical{background:#f4877133;color:#f48771}
.finding .sev.major{background:#f4c97133;color:#f4c971}
.finding .sev.minor{background:#89d18533;color:#89d185}
.finding .sev.info{background:#75beff33;color:#75beff}
.finding .title{font-weight:600;font-size:12px}
.finding .file{font-size:11px;color:var(--vscode-descriptionForeground)}
.finding .desc{font-size:11px;margin:4px 0}
.finding .suggestion{font-size:11px;padding:4px 6px;background:var(--vscode-textCodeBlock-background);border-radius:4px}
.summary{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.stat{padding:8px 14px;border-radius:6px;text-align:center;min-width:60px}
.stat .num{font-size:20px;font-weight:700}
.stat .label{font-size:9px;text-transform:uppercase;opacity:.8}
.stat.critical{background:#5a1d1d;color:#f48771}
.stat.major{background:#5a4d1d;color:#f4c971}
.stat.minor{background:#1d5a3a;color:#89d185}
.stat.info{background:#1d3a5a;color:#75beff}
`;

export const CONTEXT_STYLES = `
.context{padding:10px 14px;border-radius:6px;background:var(--vscode-editorWidget-background);margin-bottom:16px;font-size:11px}
.context .row{display:flex;justify-content:space-between;align-items:center}
.context .provider{color:var(--vscode-charts-green);font-weight:600}
.context .services{font-size:10px;color:var(--vscode-descriptionForeground)}
.context .branch{color:var(--vscode-charts-yellow)}
`;

export const LIST_STYLES = `
.list-item{display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:4px;font-size:12px;cursor:pointer}
.list-item:hover{background:var(--vscode-list-hoverBackground)}
.list-item .num{font-weight:600;min-width:36px;color:var(--vscode-descriptionForeground)}
.list-item .title{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.list-item .meta{font-size:10px;color:var(--vscode-descriptionForeground);white-space:nowrap}
.state{font-size:10px;padding:1px 6px;border-radius:10px;font-weight:600}
.state.open,.state.opened{background:#1d5a3a;color:#89d185}
.state.merged{background:#5a2d82;color:#c586c0}
.state.closed{background:#5a1d1d;color:#f48771}
`;

export const PROGRESS_STYLES = `
.progress{padding:8px 12px;background:var(--vscode-editorWidget-background);border-radius:4px;margin-bottom:12px;font-size:12px;color:var(--vscode-descriptionForeground)}
.spinner{display:inline-block;animation:spin 1s linear infinite;margin-right:8px}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
`;

export const EMPTY_STYLES = `
.empty{text-align:center;padding:30px;color:var(--vscode-descriptionForeground);font-size:12px}
`;
