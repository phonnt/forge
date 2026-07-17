# forge - Getting Started Guide

**forge** is an AI-powered CLI agent that automates tasks throughout the software development lifecycle. Start with code review and expand to testing, deployment, and more.

---

## Quick Start

### 1. Install

```bash
npm install -g forge-dev
```

Or run directly with npx:

```bash
npx forge-dev <command>
```

### 2. Configure AI Provider

Create `~/.forge/config.yaml`:

```yaml
providers:
  - name: anthropic
    type: anthropic
    model: claude-sonnet-4-20250514
    apiKey: ${ANTHROPIC_API_KEY}

  - name: openai
    type: openai
    model: gpt-4o
    apiKey: ${OPENAI_API_KEY}

  - name: ollama
    type: ollama
    model: llama3.1
    baseUrl: http://localhost:11434

active: anthropic
```

Set your API keys as environment variables:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-proj-..."
```

Switch providers anytime:

```bash
forge connect openai
forge connect ollama
```

### 3. Initialize Your Project

```bash
cd your-project
forge init
```

This creates a `.forge/` directory with:
- `config.yaml` — Project-specific settings
- `rules.md` — Customizable code review rules and checklist
- `skills.yaml` — Skills configuration

### 4. Run Your First Review

```bash
forge review https://github.com/owner/repo/pull/42
```

---

## Command Reference

### `forge review <url>`

Analyze a pull request or merge request against project rules.

```bash
forge review <url> [options]
```

| Option | Description |
|--------|-------------|
| `-r, --rules <path>` | Path to custom rules file (default: `.forge/rules.md`) |
| `-o, --output <path>` | Output path for review report (default: `.forge/review-report.md`) |
| `-f, --format <fmt>` | Output format: `markdown`, `json`, `sarif` (default: `markdown`) |
| `-m, --model <model>` | Override the active model for this review |
| `--no-tui` | Disable TUI, output plain text to stdout |

**Supported URLs:**

| Platform | URL Pattern |
|----------|-------------|
| GitHub | `https://github.com/<owner>/<repo>/pull/<number>` |
| GitLab | `https://gitlab.com/<group>/<project>/-/merge_requests/<number>` |

**Prerequisites:**
- **GitHub:** [`gh` CLI](https://cli.github.com) installed and authenticated
- **GitLab:** [`glab` CLI](https://gitlab.com/gitlab-org/cli) installed and authenticated

**Examples:**

```bash
# Basic review
forge review https://github.com/owner/repo/pull/42

# Custom rules
forge review https://github.com/owner/repo/pull/42 --rules ./backend-rules.md

# JSON output
forge review https://gitlab.com/group/project/-/merge_requests/1 --format json

# Plain text (no TUI), custom output path
forge review https://github.com/owner/repo/pull/42 --output ./review.md --no-tui

# Use specific model for this review
forge review https://github.com/owner/repo/pull/42 --model claude-opus-4-20250514
```

---

### `forge init`

Initialize forge in your project.

```bash
forge init
```

Creates `.forge/` directory with default configuration files.

---

### `forge connect <provider>`

Switch the active AI provider.

```bash
forge connect <provider>
```

Lists all configured providers and their status.

---

## Review Rules

Edit `.forge/rules.md` to define your project's code review criteria. The file uses a checklist format:

```markdown
## Quy tắc chung

1. Không hardcode credentials, API keys, tokens
2. Validate tất cả user input
3. Xử lý lỗi đầy đủ

## Checklist Review

### Security
- [ ] Không có SQL injection
- [ ] Không có XSS vulnerabilities

### Performance
- [ ] Không có N+1 queries
- [ ] Tránh memory leaks

### Code Quality
- [ ] Function/class single responsibility
- [ ] Đặt tên rõ ràng, nhất quán
```

The AI agent uses these rules as its system prompt. See [Custom Rules Guide](./CUSTOM_RULES.md) for advanced usage.

---

## Report Output

After review, forge generates reports in `.forge/`:

### Markdown (`review-report.md`)

Human-readable report with:
- Statistics (total findings by severity)
- Finding details (file, line, severity, description, suggestion)

### JSON (`review-report.json`)

Machine-readable for CI/CD integration:

```json
{
  "timestamp": "2026-07-17T03:00:00.000Z",
  "url": "https://github.com/owner/repo/pull/42",
  "findings": [
    {
      "file": "src/auth.ts",
      "lineStart": 42,
      "lineEnd": 45,
      "severity": "critical",
      "category": "security",
      "title": "Hardcoded API key",
      "description": "API key is hardcoded in source code",
      "suggestion": "Move to environment variable"
    }
  ],
  "summary": {
    "total": 5,
    "critical": 1,
    "major": 2,
    "minor": 1,
    "info": 1
  }
}
```

### SARIF (Static Analysis Results Interchange Format)

Standard format for integration with GitHub Code Scanning, GitLab SAST, and other tools.

---

## Configuration Files

### User Config (`~/.forge/config.yaml`)

Global configuration for all projects:

```yaml
active: anthropic
providers:
  - name: anthropic
    type: anthropic
    model: claude-sonnet-4-20250514
    apiKey: ${ANTHROPIC_API_KEY}
```

### Project Config (`.forge/config.yaml`)

Per-project overrides:

```yaml
version: "0.1.0"

agent:
  provider: anthropic
  model: claude-opus-4-20250514
  maxTokens: 32000

review:
  rulesFile: rules.md
  outputFormat: markdown
  outputPath: .forge/review-report.md
```

### Skills Config (`.forge/skills.yaml`)

Enable and configure skills per project:

```yaml
skills:
  code-review:
    enabled: true
    options:
      severity_threshold: info
      max_findings_per_file: 20
      exclude_patterns:
        - "*.test.*"
        - "*.spec.*"
        - "node_modules/**"
```

---

## Architecture

```
forge/
├── CLI Layer (Commander.js)      # Command parsing, help text, argument validation
├── Agent Runtime                  # LLM loop, tool execution, conversation management
│   ├── Providers                  # Anthropic, OpenAI, Ollama adapters
│   ├── Tools                      # bash, read_file, git_diff, glob
│   └── Skills                     # code-review, future: test-runner, deploy-check
├── TUI (Ink + React)             # Terminal UI with progress, findings, reports
├── Store (Zustand)                # Agent state, review session, UI state
├── MCP Integrations               # Consume + expose Model Context Protocol tools
└── Config System                  # ~/.forge/ + .forge/ hierarchical configuration
```

---

## Next Steps

- [Customize review rules](./CUSTOM_RULES.md)
- [Set up CI/CD integration](./CI_CD.md)
- [Extend with custom skills](./SKILLS.md)
- [MCP integration guide](./MCP.md)
