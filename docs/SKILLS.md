# Skills

Skills are the core extensibility mechanism of forge. Each skill adds capabilities to the AI agent.

---

## Built-in Skills

### code-review

The primary skill that performs code review against project rules.

**Configuration** (`.forge/skills.yaml`):

```yaml
skills:
  code-review:
    enabled: true
    options:
      severity_threshold: info          # minimum severity to report
      max_findings_per_file: 20         # cap findings per file
      exclude_patterns:                 # files to skip
        - "*.test.*"
        - "*.spec.*"
        - "node_modules/**"
```

---

## Creating Custom Skills

Skills are loaded from `~/.forge/skills/` (global) and `.forge/skills/` (project).

### Skill Structure

A skill is a TypeScript/JavaScript module that exports a `Skill` object:

```typescript
import type { Skill } from 'forge-dev';

const mySkill: Skill = {
  name: 'my-skill',
  description: 'What this skill does',

  // Added to the agent's system prompt
  systemPrompt: `You have access to the my-skill capability.
When reviewing code, also check for ...`,

  // Tools that the agent can call
  tools: [
    {
      name: 'custom_tool',
      description: 'Description for the LLM',
      parameters: {
        param1: {
          type: 'string',
          description: 'Parameter description',
        },
      },
      handler: async (args) => {
        // Tool implementation
        return 'result';
      },
    },
  ],

  // Called before the agent loop starts
  onBeforeRun: async (context) => {
    console.log(`Running in ${context.workspaceRoot}`);
  },

  // Called after the agent loop completes
  onAfterRun: async (context, result) => {
    if (result.success) {
      console.log('Skill completed successfully');
    }
  },
};

export default mySkill;
```

### Registering a Custom Skill

1. Save the skill file to `~/.forge/skills/my-skill.ts`
2. Reference it in your project's `.forge/skills.yaml`:

```yaml
skills:
  code-review:
    enabled: true
  my-skill:
    enabled: true
    options:
      customOption: value
```

---

## Planned Skills (Future)

forge will ship with additional built-in skills in future releases:

| Skill | Description |
|-------|-------------|
| `test-runner` | Run tests and analyze failures |
| `security-scan` | Dedicated security vulnerability scanning |
| `deploy-check` | Pre-deployment checklist verification |
| `dependency-audit` | Check dependency updates and vulnerabilities |
| `lint-fixer` | Auto-fix common linting issues |
| `refactor-suggest` | Suggest code refactoring opportunities |
| `changelog-gen` | Generate changelog from PR descriptions |

---

## Skill Lifecycle

```
User runs: forge review <url>
  ↓
Agent Runtime initializes
  ↓
SkillRegistry.load({ code-review, my-skill })
  ↓
onBeforeRun(context) - each skill prepares
  ↓
Agent Loop (LLM with skills' system prompts + tools)
  ↓
onAfterRun(context, result) - each skill processes output
  ↓
Report generated
```
