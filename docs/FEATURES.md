# forge — Feature Tracking

> AI-powered development companion: code review, chat agent, multi-provider LLM support

---

## Architecture

```
forge/                              # npm workspaces monorepo
├── packages/forge-core/            # shared business logic
│   ├── agent/      types, runtime, providers, skills, tools
│   ├── config/     schema, loader, project
│   ├── store/      zustand (agent, chat, review)
│   └── mcp/        client + server
├── apps/forge-cli/                 # terminal app (Commander + Ink)
│   ├── cli/        commands: review, init, connect, version
│   └── tui/        terminal UI (ChatShell, InputBar, WizardModal, ...)
└── apps/forge-vscode/              # VS Code extension
    ├── commands.ts   review, init, connect, configure
    ├── chatPanel.ts  sidebar webview chat
    └── statusBar.ts  provider/model indicator
```

---

## forge-core — Shared Library

### Agent Runtime (`agent/`)

| File | Description |
|------|-------------|
| `types.ts` | `Message`, `AgentEvent`, `LLMProvider`, `Skill`, `ToolDefinition`, `AgentResult` |
| `runtime.ts` | `AgentRuntime` — agent loop (max 30 iterations), streaming, tool execution, abort |
| `review.ts` | `ReviewFinding`, `ReviewSession`, `ReviewReport`, `ChecklistResult` types |

### LLM Providers (`agent/providers/`)

| Provider | SDK | Models |
|----------|-----|--------|
| Anthropic | `@anthropic-ai/sdk` | Claude Sonnet 4, Opus 4, Haiku |
| OpenAI | `openai` | GPT-4o, o1, o3-mini |
| Ollama | `ollama` | Llama 3.1, CodeLlama, Mistral, DeepSeek Coder |
| Copilot | via `openai` | Claude Sonnet 4, GPT-4o, o1 |
| OpenCode Zen | via `openai` | Claude Sonnet 5, GPT-5.6, Gemini 3.5, DeepSeek V4 |
| OpenCode Go | via `openai` | DeepSeek V4, Qwen 3.7, Kimi K3, GLM 5.2, Grok 4.5 |
| Google Gemini | via `openai` | Gemini 2.5 Pro, Flash |

### Tools (`agent/tools/`)

| Tool | Description |
|------|-------------|
| `bash` | Execute shell commands in workspace |
| `read_file` | Read file contents with line numbers |
| `git_diff` | Fetch GitHub PR / GitLab MR diff via `gh`/`glab` CLI |
| `glob` | Find files matching glob patterns |

### Skills (`agent/skills/`)

| Skill | Description |
|-------|-------------|
| `code-review` | Review PR/MR changes against project rules, output JSONL findings, auto-save `.forge/review-report.md` + `.json` |

### Config (`config/`)

| Export | Description |
|--------|-------------|
| `loadForgeConfig` | Load `~/.forge/config.yaml` |
| `saveForgeConfig` | Save config |
| `getActiveProvider` | Get active provider with env var interpolation |
| `setActiveProvider` | Switch active provider |
| `ensureForgeDir` | Create `~/.forge/` |
| `findProjectRoot` | Walk up to find `.forge/config.yaml` |
| `loadProjectConfig` | Load project config |
| `loadRulesFile` | Load `.forge/rules.md` |
| `initProjectConfig` | Create `.forge/` with default config + rules |

### MCP (`mcp/`)

| Export | Description |
|--------|-------------|
| `MCPClient` | Connect to external MCP servers via stdio |
| `createMCPServer` | Expose forge tools as MCP server |
| `startMCPServer` | Start MCP server on stdio |

### Stores (`store/`)

| Store | Description |
|-------|-------------|
| `useAgentStore` | Agent runtime: status, progress, events, result, abort |
| `useChatStore` | TUI chat: messages, input, autocomplete, history, provider wizard |
| `useReviewStore` | Review session: findings, progress, summary |

---

## forge-cli — Terminal App

### Commands

| Command | Options | Description |
|---------|---------|-------------|
| `forge` | — | Open interactive TUI dashboard |
| `forge review <url>` | `--tui`, `--format`, `--model`, `--rules`, `--output` | AI code review for PR/MR |
| `forge init` | — | Create `.forge/` with config + rules + skills |
| `forge connect <name>` | — | Switch active LLM provider |
| `forge version` | — | Show version, Node.js, OS info |

### TUI Components

| Component | Description |
|-----------|-------------|
| `ChatShell` | Main layout: header, messages, input, status |
| `InputBar` | Command input with autocomplete, history navigation |
| `OutputArea` | Scrollable message display |
| `Autocomplete` | Command suggestions (`/review`, `/connect`, ...) |
| `WizardModal` | Provider setup wizard (select → API key → model) |
| `ContextBar` | Project context (root, git branch) |
| `StatusBar` | Agent status, provider, model |
| `FindingList` | Review findings list |
| `ReportView` | Review report display |
| `ProgressBar` | Agent progress indicator |

### TUI Hooks

| Hook | Description |
|------|-------------|
| `useMouse` | Mouse event handling (scroll, click) |
| `useTermSize` | Terminal resize detection |

---

## forge-vscode — VS Code Extension

### Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `forge: Review PR/MR` | Cmd+Shift+P | Input URL → AI review |
| `forge: Review from Clipboard URL` | Context menu | Auto-detect PR/MR URL from clipboard |
| `forge: Initialize Project` | Cmd+Shift+P | Create `.forge/` config |
| `forge: Switch Provider` | Cmd+Shift+P | Add/select AI provider (7 types) |
| `forge: Open Chat` | Activity bar | Sidebar chat panel |
| `forge: Open Settings` | Title bar icon | Open forge settings |
| `forge: Clear Chat` | Title bar icon | Clear chat history |

### UI

| Element | Description |
|---------|-------------|
| Activity Bar icon | 🤖 forge sidebar |
| Sidebar Chat (webview) | Real-time agent output streaming, command autocomplete, right-click copy |
| Status Bar | Current provider/model |
| Settings (`forge.providers`, `forge.activeProvider`) | VS Code settings UI |

### Chat Features (webview)

| Feature | Description |
|---------|-------------|
| Autocomplete | Type `/` → dropdown list of commands, Enter/Tab to accept, ↑↓ to navigate |
| Streaming merge | Consecutive assistant messages merge into one bubble |
| Right-click menu | Copy single message / Copy All chat history |
| Context bar | Project path + git branch below messages |
| Status bar | Provider/model on bottom-right, spinner (⏳) when agent running |
| Chat agent | Send message → AgentRuntime executes with tools → stream response |
| Chat commands | `/review`, `/connect`, `/init`, `/help`, `/clear`, `/status` |

### Auto-Detect Provider

| Detection | Method |
|-----------|--------|
| Anthropic | `ANTHROPIC_API_KEY` env |
| OpenAI | `OPENAI_API_KEY` env |
| Google Gemini | `GEMINI_API_KEY` env |
| Ollama | `localhost:11434/api/tags` |
| GitHub Copilot | `gh auth token` |
| OpenCode Zen/Go | `OPENCODE_API_KEY` env or `opencode` CLI |

---

## forge-vscode — Upcoming Features

### 🔴 Priority 1 (high impact, easy)

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Inline Chat (Cmd+I)** | Select code → Cmd+I → prompt → AI edits in-place with diff preview |
| 2 | **Code Actions** | Lightbulb menu: "Explain", "Fix issues", "Add tests", "Refactor" |
| 3 | **Editor Context** | Send current file + selection + open tabs as agent context |
| 4 | **Quick Fix integration** | Hook into diagnostics: error → AI suggest fix → one-click Apply |

### 🟡 Priority 2 (medium effort)

| # | Feature | Description |
|---|---------|-------------|
| 5 | **Terminal Agent** | Chat `/run <cmd>` → AI writes + executes script, shows output |
| 6 | **Apply Diff** | AI outputs code block → "Apply" button → diff view → accept/reject hunks |
| 7 | **Workspace Symbol Search** | AI searches definitions/references to understand codebase before answering |
| 8 | **Saved Prompts / Templates** | Reusable prompt library: "Security review", "Generate tests", "Add JSDoc" |

### 🟢 Priority 3 (advanced)

| # | Feature | Description |
|---|---------|-------------|
| 9 | **Inline Completions** | Ghost text like Copilot (FIM streaming model) |
| 10 | **Agent Mode (multi-file)** | AI plans → edits multiple files → diff all → user accept |
| 11 | **Session Memory** | Persistent context across chat sessions (project rules, past decisions) |
| 12 | **.forge/rules.md hot-reload** | Auto-reload rules on file change |

---

## Build & Quality

| Check | forge-core | forge-cli | forge-vscode |
|-------|------------|-----------|--------------|
| `npm run build` | ✅ pass | ✅ pass | ✅ pass |
| `npm run typecheck` | ✅ pass | ✅ pass | ✅ pass |
| `forge` binary works | — | ✅ | — |

### Scripts

```bash
npm run build          # build all packages
npm run build:core     # build forge-core only
npm run build:cli      # build forge-cli only
npm run build:vscode   # build forge-vscode only
npm run typecheck      # typecheck all packages
npm run dev            # run forge-cli in dev mode
```

---

## Roadmap

- [x] Monorepo: `forge-core` + `forge-cli` + `forge-vscode`
- [x] Sidebar chat webview with agent, commands, autocomplete
- [x] Auto-detect providers (env vars, CLI tools, Ollama API)
- [x] Right-click copy/copyAll in chat
- [x] Streaming merge for AI output
- [ ] `forge-mcp` — standalone MCP server package
- [ ] `forge-vscode` — publish to VS Code Marketplace
- [ ] Priority 1: Inline Chat (Cmd+I), Code Actions, Editor Context
- [ ] Priority 2: Terminal Agent, Apply Diff, Symbol Search, Prompt Templates
- [ ] Priority 3: Inline Completions, Agent Mode, Session Memory, Hot-reload
- [ ] Unit tests
- [ ] CI/CD pipeline
- [ ] More skills (testing, deployment, security scan)
