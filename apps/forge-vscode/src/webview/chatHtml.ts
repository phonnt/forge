export interface WebviewOptions {
  background: string;
  sidebarMode: boolean;
}

export function chatCommands(): Record<string, { desc: string; usage: string }> {
  return {
    '/review':  { desc: 'Review a pull request or merge request', usage: '/review <url>' },
    '/connect': { desc: 'Switch active LLM provider', usage: '/connect' },
    '/init':    { desc: 'Initialize forge in current project', usage: '/init' },
    '/run':     { desc: 'Run a terminal command via AI agent', usage: '/run <command>' },
    '/prompt':  { desc: 'Use a saved prompt template', usage: '/prompt' },
    '/help':    { desc: 'Show available commands', usage: '/help' },
    '/clear':   { desc: 'Clear chat messages', usage: '/clear' },
    '/status':  { desc: 'Show current configuration', usage: '/status' },
  };
}

export function generateWebviewHtml(options: WebviewOptions): string {
  const bg = options.background;
  const emptyState = options.sidebarMode
    ? `Type a message to chat with the AI agent.<br/>Type <strong>/</strong> for commands.`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>forge Chat</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family, -apple-system, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-foreground);
      background: ${bg};
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .path-bar {
      padding: 3px 10px;
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      border-bottom: 1px solid var(--vscode-panel-border);
      flex-shrink: 0;
      display: flex;
      justify-content: space-between;
      opacity: 0.7;
    }
    .path-bar .branch { color: var(--vscode-charts-yellow); }
    #messages {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .message {
      padding: 6px 10px;
      border-radius: 6px;
      max-width: 100%;
      word-break: break-word;
      white-space: pre-wrap;
      line-height: 1.5;
      font-size: 12px;
    }
    .message.user {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      align-self: flex-end;
    }
    .message.assistant {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      align-self: flex-start;
    }
    .message.system {
      color: var(--vscode-descriptionForeground);
      font-style: italic;
      font-size: 11px;
      align-self: flex-start;
      padding: 1px 6px;
    }
    .input-area {
      display: flex;
      padding: 6px 8px;
      border-top: 1px solid var(--vscode-panel-border);
      gap: 6px;
      flex-shrink: 0;
      align-items: flex-end;
    }
    .input-wrapper { position: relative; flex: 1; }
    #input {
      width: 100%;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      padding: 6px 8px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
      outline: none;
      resize: none;
      min-height: 28px;
      line-height: 1.4;
    }
    #input:focus { border-color: var(--vscode-focusBorder); }
    .executing #input { border-color: var(--vscode-charts-yellow); }
    #sendBtn {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      padding: 6px 12px;
      cursor: pointer;
      font-size: 12px;
    }
    #sendBtn:hover { background: var(--vscode-button-hoverBackground); }
    #sendBtn:disabled { opacity: 0.5; }
    .status-bar {
      display: flex;
      justify-content: space-between;
      padding: 2px 10px 4px;
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      flex-shrink: 0;
      opacity: 0.85;
    }
    .status-bar .provider { color: var(--vscode-charts-green); }
    .code-block-wrapper { position: relative; margin: 4px 0; }
    .apply-btn {
      position: absolute; top: 4px; right: 4px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none; border-radius: 3px;
      padding: 2px 8px; font-size: 10px;
      cursor: pointer; display: none; z-index: 5;
    }
    .code-block-wrapper:hover .apply-btn { display: block; }
    .message .code-block {
      background: var(--vscode-textCodeBlock-background);
      border-radius: 4px; padding: 8px; margin: 4px 0;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 11px; white-space: pre; overflow-x: auto;
    }
    .autocomplete {
      position: absolute; bottom: 100%; left: 0; right: 0;
      background: var(--vscode-dropdown-background);
      border: 1px solid var(--vscode-dropdown-border);
      border-radius: 4px 4px 0 0;
      max-height: 160px; overflow-y: auto;
      display: none; z-index: 100; margin-bottom: 2px;
    }
    .autocomplete.visible { display: block; }
    .autocomplete-item {
      padding: 4px 10px; cursor: pointer; font-size: 12px;
      display: flex; justify-content: space-between;
    }
    .autocomplete-item.selected {
      background: var(--vscode-list-activeSelectionBackground);
      color: var(--vscode-list-activeSelectionForeground);
    }
    .autocomplete-item .desc { color: var(--vscode-descriptionForeground); font-size: 11px; }
    .autocomplete-item.selected .desc { color: inherit; opacity: 0.8; }
    ${options.sidebarMode ? `
    .context-menu {
      position: fixed;
      background: var(--vscode-menu-background);
      border: 1px solid var(--vscode-menu-border);
      border-radius: 4px;
      padding: 4px 0;
      z-index: 100;
      display: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      min-width: 150px;
    }
    .context-menu.visible { display: block; }
    .context-menu-item {
      padding: 4px 16px;
      cursor: pointer;
      font-size: 12px;
      color: var(--vscode-menu-foreground);
    }
    .context-menu-item:hover {
      background: var(--vscode-menu-selectionBackground);
      color: var(--vscode-menu-selectionForeground);
    }
    ` : ''}
    .empty-state {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--vscode-descriptionForeground);
      text-align: center;
      padding: 20px;
      font-size: 12px;
      line-height: 1.8;
    }
  </style>
</head>
<body>
  <div class="path-bar" id="pathBar">
    <span id="ctxPath"></span>
    <span class="branch" id="ctxBranch"></span>
  </div>
  <div id="messages">
    ${emptyState ? '<div class="empty-state">' + emptyState + '</div>' : ''}
  </div>
  <div class="input-area">
    <div class="input-wrapper">
      <div id="autocomplete" class="autocomplete"></div>
      <textarea id="input" rows="1" placeholder="Ask anything...  Shift+Enter new line, / for commands"></textarea>
    </div>
    <button id="sendBtn" disabled>Send</button>
  </div>
  <div class="status-bar">
    <span><span id="spinner" style="display:none">⏳</span> <span id="hintCommands">/review  /run  /prompt  /help  /clear</span></span>
    <span class="provider" id="ctxModel"></span>
  </div>
  ${options.sidebarMode ? `
  <div id="contextMenu" class="context-menu">
    <div class="context-menu-item" data-action="copy">Copy</div>
    <div class="context-menu-item" data-action="copyAll">Copy All</div>
  </div>
  ` : ''}

  <script>
    const vscode = acquireVsCodeApi();
    const messagesEl = document.getElementById('messages');
    const inputEl = document.getElementById('input');
    const sendBtn = document.getElementById('sendBtn');
    const autocompleteEl = document.getElementById('autocomplete');
    const ctxPath = document.getElementById('ctxPath');
    const ctxBranch = document.getElementById('ctxBranch');
    const ctxModel = document.getElementById('ctxModel');
    const hintCommands = document.getElementById('hintCommands');
    const spinner = document.getElementById('spinner');
    const CMDS = ${JSON.stringify(chatCommands())};
    const CMD_KEYS = Object.keys(CMDS);
    let selectedIndex = 0;
    let isExecuting = false;
    let lastAssistant = null;

    function setExecuting(executing) {
      isExecuting = executing;
      spinner.style.display = executing ? 'inline' : 'none';
      hintCommands.textContent = executing ? '/help for commands' : '/review  /run  /prompt  /help  /clear';
      sendBtn.disabled = executing;
      document.body.classList.toggle('executing', executing);
    }

    function updateContext(info) {
      ctxPath.textContent = info.projectPath ? '📁 ' + info.projectPath : '';
      ctxBranch.textContent = info.gitBranch ? '⎇ ' + info.gitBranch : '';
      ctxModel.textContent = info.provider || '';
    }

    function filterCommands(input) {
      if (!input.startsWith('/') || input.includes(' ')) return [];
      return CMD_KEYS.filter(c => c.startsWith(input));
    }

    function showAutocomplete(matches) {
      if (matches.length === 0) { autocompleteEl.classList.remove('visible'); return; }
      autocompleteEl.innerHTML = matches.map((cmd, i) =>
        '<div class="autocomplete-item' + (i === selectedIndex ? ' selected' : '') + '" data-cmd="' + cmd + '">' +
          '<span>' + cmd + '</span><span class="desc">' + CMDS[cmd].desc + '</span></div>'
      ).join('');
      autocompleteEl.classList.add('visible');
    }

    function hideAutocomplete() { autocompleteEl.classList.remove('visible'); }

    function acceptAutocomplete() {
      const matches = filterCommands(inputEl.value);
      if (matches.length > 0) {
        inputEl.value = (matches[Math.min(selectedIndex, matches.length - 1)] || matches[0]) + ' ';
        hideAutocomplete();
      }
    }

    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        const matches = filterCommands(inputEl.value);
        const visible = autocompleteEl.classList.contains('visible');
        if (visible && matches.length > 0) {
          acceptAutocomplete();
        } else {
          sendMessage();
        }
        return;
      }

      const matches = filterCommands(inputEl.value);
      const visible = autocompleteEl.classList.contains('visible');
      if (e.key === 'Tab' && visible && matches.length > 0) { e.preventDefault(); acceptAutocomplete(); return; }
      if (e.key === 'Escape') { hideAutocomplete(); return; }
    });

    inputEl.addEventListener('keyup', (e) => {
      autoResize();

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const visible = autocompleteEl.classList.contains('visible');
        if (!visible) return;
        const matches = filterCommands(inputEl.value);
        if (matches.length === 0) return;
        e.preventDefault();
        if (e.key === 'ArrowDown') selectedIndex = (selectedIndex + 1) % matches.length;
        else selectedIndex = (selectedIndex - 1 + matches.length) % matches.length;
        showAutocomplete(matches);
        return;
      }

      selectedIndex = 0;
      showAutocomplete(filterCommands(inputEl.value));
    });

    inputEl.addEventListener('input', () => { autoResize(); });
    inputEl.addEventListener('blur', () => setTimeout(hideAutocomplete, 150));

    function autoResize() {
      inputEl.style.height = 'auto';
      inputEl.style.height = inputEl.scrollHeight + 'px';
    }

    function handleCommand(cmd, args) {
      switch (cmd) {
        case '/help': {
          let h = '\\nCommands:\\n\\n';
          for (const [c, info] of Object.entries(CMDS)) h += '  ' + c.padEnd(12) + info.desc + '\\n';
          return h;
        }
        case '/clear': vscode.postMessage({ type: 'clearChat' }); return null;
        case '/review': case '/connect': case '/init': case '/status': case '/run': case '/prompt':
          vscode.postMessage({ type: 'runCommand', command: cmd, args }); return null;
        default: return 'Unknown: ' + cmd + '\\nType /help to see commands.';
      }
    }

    function sendMessage() {
      const text = inputEl.value.trim();
      if (!text || isExecuting) return;
      hideAutocomplete();
      appendMessage('user', text);
      if (text.startsWith('/')) {
        const parts = text.split(/\\s+/);
        const result = handleCommand(parts[0].toLowerCase(), parts.slice(1).join(' '));
        if (result) appendMessage('system', result);
      } else {
        vscode.postMessage({ type: 'sendMessage', text });
      }
      inputEl.value = '';
      inputEl.style.height = 'auto';
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    sendBtn.addEventListener('click', sendMessage);

    autocompleteEl.addEventListener('mousedown', (e) => {
      const item = e.target.closest('.autocomplete-item');
      if (item && item.dataset.cmd) {
        e.preventDefault();
        inputEl.value = item.dataset.cmd + ' ';
        hideAutocomplete();
        inputEl.focus();
      }
    });

    messagesEl.addEventListener('click', (e) => {
      if (e.target.classList.contains('apply-btn')) {
        vscode.postMessage({ type: 'applyCode', code: decodeURIComponent(e.target.dataset.code), language: e.target.dataset.lang || '' });
      }
    });` +
    (options.sidebarMode ? `
    let emptyState = messagesEl.querySelector('.empty-state');

    messagesEl.addEventListener('contextmenu', (e) => {
      const msg = e.target.closest('.message');
      if (!msg) return;
      e.preventDefault();
      document.getElementById('contextMenu').style.left = e.clientX + 'px';
      document.getElementById('contextMenu').style.top = e.clientY + 'px';
      document.getElementById('contextMenu').classList.add('visible');
      window._contextTarget = msg;
    });

    document.addEventListener('click', () => {
      const cm = document.getElementById('contextMenu');
      if (cm) cm.classList.remove('visible');
    });

    document.getElementById('contextMenu').addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action === 'copy' && window._contextTarget) {
        navigator.clipboard.writeText(window._contextTarget.textContent).catch(() => {});
      } else if (action === 'copyAll') {
        const all = Array.from(messagesEl.querySelectorAll('.message')).map(m => m.textContent).join('\\n');
        navigator.clipboard.writeText(all).catch(() => {});
      }
      document.getElementById('contextMenu').classList.remove('visible');
      window._contextTarget = null;
    });` : '') +
    `

    window.addEventListener('message', (event) => {
      const d = event.data;
      switch (d.type) {
        case 'message':` +
        (options.sidebarMode ? `
          if (emptyState) { emptyState.remove(); emptyState = null; }` : '') +
        `
          appendMessage(d.role, d.content);
          messagesEl.scrollTop = messagesEl.scrollHeight;
          break;
        case 'clear': messagesEl.innerHTML = ''; lastAssistant = null;` +
        (options.sidebarMode ? ` emptyState = document.createElement('div'); emptyState.className = 'empty-state'; emptyState.textContent = 'Chat cleared.'; messagesEl.appendChild(emptyState);` : '') +
        ` break;
        case 'context': updateContext(d); break;
        case 'executing': setExecuting(d.executing); break;
      }
    });

    function appendMessage(role, content) {
      if (lastAssistant && role === 'assistant') {
        lastAssistant._raw += content;
        lastAssistant.innerHTML = renderContent(lastAssistant._raw);
      } else {
        const div = document.createElement('div');
        div.className = 'message ' + role;
        div._raw = content;
        div.innerHTML = renderContent(content);
        messagesEl.appendChild(div);
        lastAssistant = role === 'assistant' ? div : null;
      }
    }

    function renderContent(text) {
      let html = '';
      const parts = text.split(/(\`\`\`[\\s\\S]*?\`\`\`)/g);
      for (const part of parts) {
        const m = part.match(/^\`\`\`(\\w*)\\n([\\s\\S]*)\`\`\`$/);
        if (m) {
          html += '<div class="code-block-wrapper"><button class="apply-btn" data-code="' + encodeURIComponent(m[2]) + '" data-lang="' + (m[1]||'') + '">Apply</button><pre class="code-block">' + esc(m[2]) + '</pre></div>';
        } else {
          html += '<span>' + esc(part) + '</span>';
        }
      }
      return html;
    }

    function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
}
