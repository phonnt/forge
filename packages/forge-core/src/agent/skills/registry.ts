import type { Skill, SkillContext, AgentResult, ToolDefinition } from '../types.js';

export class SkillRegistry {
  private skills = new Map<string, Skill>();

  register(skill: Skill): void {
    this.skills.set(skill.name, skill);
  }

  unregister(name: string): void {
    this.skills.delete(name);
  }

  getAll(): Skill[] {
    return Array.from(this.skills.values());
  }

  get(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  getSystemPrompt(): string {
    const prompts: string[] = [
      ROLE_PROMPT,
      '',
      '## Active Skills',
    ];

    for (const skill of this.skills.values()) {
      prompts.push(`### ${skill.name}`);
      prompts.push(skill.systemPrompt);
      prompts.push('');
    }

    return prompts.join('\n');
  }

  getAllTools(): ToolDefinition[] {
    const tools: ToolDefinition[] = [];
    for (const skill of this.skills.values()) {
      tools.push(...skill.tools);
    }
    return tools;
  }

  async onBeforeRun(context: SkillContext): Promise<void> {
    for (const skill of this.skills.values()) {
      if (skill.onBeforeRun) {
        await skill.onBeforeRun(context);
      }
    }
  }

  async onAfterRun(context: SkillContext, result: AgentResult): Promise<void> {
    for (const skill of this.skills.values()) {
      if (skill.onAfterRun) {
        await skill.onAfterRun(context, result);
      }
    }
  }
}

const ROLE_PROMPT = `You are an expert code reviewer operating within the "forge" agent CLI. Your task is to review code changes in a Pull Request / Merge Request and produce structured findings.

## Instructions
1. Read the diff and changed files carefully
2. Apply ALL review rules provided by the project
3. For each issue found, output a structured finding in JSON format
4. After all findings, output a summary with statistics
5. Be constructive and specific in your suggestions

## Output Format
Output each finding as a JSON object, one per line (JSONL format):
{"file":"path/to/file.ts","lineStart":42,"lineEnd":45,"severity":"major","category":"performance","title":"N+1 Query","description":"API called inside loop","suggestion":"Use batch endpoint instead"}
`;
