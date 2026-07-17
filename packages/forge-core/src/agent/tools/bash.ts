import { execSync } from 'node:child_process';
import type { ToolHandler } from './registry.js';

export const bashTool: ToolHandler = {
  definition: {
    name: 'bash',
    description:
      'Execute a bash command in the workspace. Returns stdout. Use for git, npm, or any CLI.',
    parameters: {
      command: {
        type: 'string',
        description: 'The bash command to execute',
      },
      workdir: {
        type: 'string',
        description: 'Working directory (defaults to workspace root)',
      },
    },
  },

  async execute(args) {
    const command = args.command as string;
    const workdir = (args.workdir as string) ?? process.cwd();
    const timeout = 30000;

    try {
      const result = execSync(command, {
        cwd: workdir,
        timeout,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
      });
      return result || '(no output)';
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; message?: string };
      return `Exit code: ${e.message}\nStdout: ${e.stdout ?? ''}\nStderr: ${e.stderr ?? ''}`;
    }
  },
};
