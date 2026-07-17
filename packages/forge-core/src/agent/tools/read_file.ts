import fs from 'node:fs';
import path from 'node:path';
import type { ToolHandler } from './registry.js';

export const readFileTool: ToolHandler = {
  definition: {
    name: 'read_file',
    description: 'Read the contents of a file. Returns the file content with line numbers.',
    parameters: {
      filePath: {
        type: 'string',
        description: 'Absolute or relative path to the file',
      },
      offset: {
        type: 'number',
        description: 'Line number to start reading from (1-indexed)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of lines to read',
      },
    },
  },

  async execute(args) {
    const filePath = args.filePath as string;
    const offset = (args.offset as number) ?? 1;
    const limit = (args.limit as number) ?? 2000;

    const resolved = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    if (!fs.existsSync(resolved)) {
      return `Error: File not found: ${resolved}`;
    }

    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      return `Error: Path is a directory: ${resolved}`;
    }

    try {
      const content = fs.readFileSync(resolved, 'utf-8');
      const lines = content.split('\n');
      const sliced = lines.slice(offset - 1, offset - 1 + limit);

      return sliced
        .map((line, i) => `${offset + i}: ${line}`)
        .join('\n');
    } catch (err) {
      return `Error reading file: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
};
