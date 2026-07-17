import { execSync } from 'node:child_process';
import type { ToolHandler } from './registry.js';

export const searchSymbolsTool: ToolHandler = {
  definition: {
    name: 'search_symbols',
    description: 'Search for symbols, function definitions, class references, or text patterns in the codebase. Uses ripgrep (rg) or grep.',
    parameters: {
      pattern: {
        type: 'string',
        description: 'The pattern to search for (supports regex)',
      },
      path: {
        type: 'string',
        description: 'Relative path to search in (defaults to workspace root)',
      },
      fileTypes: {
        type: 'string',
        description: 'File extensions to search (e.g. ".ts,.tsx,.js")',
      },
    },
  },

  async execute(args) {
    const pattern = args.pattern as string;
    const searchPath = (args.path as string) ?? '.';
    const fileTypes = args.fileTypes as string | undefined;

    if (!pattern) {
      return 'Error: pattern is required';
    }

    try {
      let command: string;

      try {
        execSync('which rg 2>/dev/null', { encoding: 'utf-8', timeout: 2000 });
        const globFlag = fileTypes ? ` -g '*{${fileTypes}}'` : '';
        command = `rg --no-heading -n --color never ${globFlag} '${pattern.replace(/'/g, "'\\''")}' '${searchPath}'`;
      } catch {
        const globFlag = fileTypes ? ` --include='*{${fileTypes}}'` : '';
        command = `grep -rn${globFlag} '${pattern.replace(/'/g, "'\\''")}' '${searchPath}'`;
      }

      const result = execSync(command, {
        cwd: process.cwd(),
        encoding: 'utf-8',
        timeout: 10000,
        maxBuffer: 5 * 1024 * 1024,
      });

      const lines = result.trim().split('\n').slice(0, 50);
      if (lines.length === 0) {
        return '(no results)';
      }
      if (lines.length === 50) {
        return lines.join('\n') + '\n(truncated at 50 results)';
      }
      return lines.join('\n');
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e.status === 1) {
        return '(no results)';
      }
      return `Error searching: ${e.message || String(err)}`;
    }
  },
};
