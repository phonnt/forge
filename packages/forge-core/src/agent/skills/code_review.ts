import fs from 'node:fs';
import path from 'node:path';
import type { Skill, SkillContext, AgentResult } from '../types.js';

export const CODE_REVIEW_SKILL_NAME = 'code-review';

export function createCodeReviewSkill(rules: string = ''): Skill {
  return {
    name: CODE_REVIEW_SKILL_NAME,
    description: 'Review pull request / merge request code changes against project rules',

    systemPrompt: buildReviewPrompt(rules),

    tools: [],

    async onBeforeRun(context: SkillContext) {
      const reportDir = path.join(context.workspaceRoot, '.forge');
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
    },

    async onAfterRun(context: SkillContext, result: AgentResult) {
      if (!result.success) return;

      const report = buildReport(result);
      const outputPath = path.join(context.workspaceRoot, '.forge', 'review-report.md');

      fs.writeFileSync(outputPath, report, 'utf-8');

      const jsonPath = path.join(context.workspaceRoot, '.forge', 'review-report.json');
      const findings = parseFindings(result.output);
      const jsonReport = {
        timestamp: new Date().toISOString(),
        url: context.config.url as string,
        findings,
        summary: extractSummary(result.output),
      };
      fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2), 'utf-8');
    },
  };
}

function buildReviewPrompt(rules: string): string {
  return `## Code Review Skill

You are performing a code review. Follow these steps:

1. **Analyze the diff** - Understand all changes
2. **Check each file** against the project rules below
3. **Output findings** in JSONL format
4. **Provide summary** with statistics

### Project Review Rules
${rules || '_No project-specific rules provided._'}

### Finding Categories
- **security**: SQL injection, XSS, hardcoded secrets, auth issues
- **performance**: N+1 queries, memory leaks, missing caching
- **bug**: Logic errors, null references, race conditions
- **style**: Naming conventions, formatting, code structure
- **maintainability**: Complexity, coupling, testability
- **naming**: Unclear or inconsistent variable/function names
- **other**: Any other issue not fitting the above

### Severity Levels
- **critical**: Must fix before merge (security, data loss, crash)
- **major**: Should fix before merge (bug, significant performance issue)
- **minor**: Nice to fix (style, minor improvement)
- **info**: Observation or suggestion

### Output Format (JSONL)
Each finding on one line:
{"file":"<path>","lineStart":<number>,"lineEnd":<number>,"severity":"<level>","category":"<category>","title":"<short title>","description":"<detailed description>","suggestion":"<actionable fix>"}

After all findings, output:
---SUMMARY---
{"total":<n>,"critical":<n>,"major":<n>,"minor":<n>,"info":<n>}
`;
}

interface ReviewFinding {
  file: string;
  lineStart?: number;
  lineEnd?: number;
  severity: string;
  category: string;
  title: string;
  description: string;
  suggestion: string;
}

function parseFindings(output: string): ReviewFinding[] {
  const findings: ReviewFinding[] = [];

  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('---')) continue;
    if (trimmed.startsWith('{') && trimmed.includes('"file"')) {
      try {
        const f = JSON.parse(trimmed);
        findings.push(f);
      } catch {
        // skip malformed JSON
      }
    }
  }

  return findings;
}

interface ReviewStats {
  total: number;
  critical: number;
  major: number;
  minor: number;
  info: number;
}

function extractSummary(output: string): ReviewStats | null {
  const summaryMatch = output.match(/---SUMMARY---\s*(\{[\s\S]*?\})/);
  if (!summaryMatch) return null;

  try {
    return JSON.parse(summaryMatch[1]);
  } catch {
    return null;
  }
}

function buildReport(result: AgentResult): string {
  const findings = parseFindings(result.output);
  const stats = extractSummary(result.output);

  const lines: string[] = [
    '# Code Review Report',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    `**Review URL:** ${result.data ?? 'N/A'}`,
    '',
    '---',
    '',
    '## Statistics',
    '',
  ];

  if (stats) {
    lines.push(`| Severity | Count |`);
    lines.push(`|----------|-------|`);
    lines.push(`| Critical | ${stats.critical} |`);
    lines.push(`| Major    | ${stats.major} |`);
    lines.push(`| Minor    | ${stats.minor} |`);
    lines.push(`| Info     | ${stats.info} |`);
    lines.push(`| **Total** | **${stats.total}** |`);
  } else {
    lines.push(`**Total findings:** ${findings.length}`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Findings');
  lines.push('');

  const severityOrder = ['critical', 'major', 'minor', 'info'];
  const sorted = [...findings].sort(
    (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity),
  );

  for (const f of sorted) {
    const icon =
      f.severity === 'critical' ? '🔴' :
      f.severity === 'major' ? '🟠' :
      f.severity === 'minor' ? '🟡' : '🔵';

    const location = f.lineStart
      ? `\`${f.file}:${f.lineStart}${f.lineEnd ? `-${f.lineEnd}` : ''}\``
      : `\`${f.file}\``;

    lines.push(`### ${icon} [${f.severity.toUpperCase()}] ${f.title}`);
    lines.push('');
    lines.push(`- **File:** ${location}`);
    lines.push(`- **Category:** ${f.category}`);
    lines.push(`- **Description:** ${f.description}`);
    lines.push(`- **Suggestion:** ${f.suggestion}`);
    lines.push('');
  }

  if (findings.length === 0) {
    lines.push('No issues found. Great job! 🎉');
    lines.push('');
  }

  return lines.join('\n');
}
