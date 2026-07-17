import fs from 'node:fs';
import path from 'node:path';
import type { ToolHandler } from './registry.js';

export const globTool: ToolHandler = {
  definition: {
    name: 'glob',
    description: 'Find files matching a glob pattern.',
    parameters: {
      pattern: {
        type: 'string',
        description: 'Glob pattern (e.g., "**/*.ts", "src/**/*.tsx")',
      },
    },
  },

  async execute(args) {
    const pattern = args.pattern as string;
    const cwd = process.cwd();

    try {
      const files = findFiles(cwd, pattern);
      return files.length > 0 ? files.join('\n') : '(no files found)';
    } catch (err) {
      return `Error: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
};

function findFiles(dir: string, pattern: string): string[] {
  const results: string[] = [];
  const segments = pattern.split('/');
  const firstSegment = segments[0];
  const rest = segments.slice(1).join('/');

  if (pattern.startsWith('**')) {
    const suffix = pattern.replace(/^\*\*\//, '');
    walk(dir, suffix, results);
  } else if (pattern.includes('*')) {
    const glob = patternToRegex(pattern);
    walk(dir, pattern.includes('**') ? pattern.replace(/^.*?\*\*\//, '') : firstSegment, results);
  } else {
    const fullPath = path.join(dir, pattern);
    if (fs.existsSync(fullPath)) {
      results.push(fullPath);
      if (fs.statSync(fullPath).isDirectory()) {
        const entries = fs.readdirSync(fullPath, { recursive: true });
        for (const entry of entries as string[]) {
          const entryPath = path.join(fullPath, entry);
          if (fs.statSync(entryPath).isFile()) {
            results.push(entryPath);
          }
        }
      }
    }
  }

  return results.map((f) => path.relative(dir, f));
}

function walk(dir: string, pattern: string, results: string[], maxDepth = 10): void {
  if (maxDepth <= 0) return;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(process.cwd(), full);

    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') || entry.name === '.forge') {
        walk(full, pattern, results, maxDepth - 1);
      }
    } else if (entry.isFile()) {
      if (matchSimple(rel, pattern)) {
        results.push(full);
      }
    }
  }
}

function matchSimple(filepath: string, pattern: string): boolean {
  const regex = patternToRegex(pattern);
  return regex.test(filepath);
}

function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '<<DOUBLESTAR>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<DOUBLESTAR>>/g, '.*');

  return new RegExp(`^${escaped}$`);
}
