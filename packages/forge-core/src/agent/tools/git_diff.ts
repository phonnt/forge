import { execSync } from 'node:child_process';
import path from 'node:path';
import type { ToolHandler } from './registry.js';

export const gitDiffTool: ToolHandler = {
  definition: {
    name: 'git_diff',
    description:
      'Get the diff of a GitHub pull request or GitLab merge request. Fetches via gh/glab CLI.',
    parameters: {
      url: {
        type: 'string',
        description: 'GitHub PR or GitLab MR URL (e.g., https://github.com/owner/repo/pull/42)',
      },
      format: {
        type: 'string',
        description: 'Output format: diff, files, or full (default: full)',
      },
    },
  },

  async execute(args) {
    const url = args.url as string;
    const format = (args.format as string) ?? 'full';

    const parsed = parseURL(url);
    if (!parsed) {
      return 'Error: Invalid URL. Expected GitHub PR or GitLab MR URL.';
    }

    try {
      if (parsed.provider === 'github') {
        return await fetchGitHubPR(parsed, format);
      } else {
        return await fetchGitLabMR(parsed, format);
      }
    } catch (err) {
      return `Error fetching diff: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
};

interface ParsedURL {
  provider: 'github' | 'gitlab';
  owner: string;
  repo: string;
  number: string;
}

function parseURL(url: string): ParsedURL | null {
  const githubMatch = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (githubMatch) {
    return {
      provider: 'github',
      owner: githubMatch[1],
      repo: githubMatch[2].replace('.git', ''),
      number: githubMatch[3],
    };
  }

  const gitlabMatch = url.match(/gitlab\.com\/([^/]+(?:\/[^/]+)*)\/-\/merge_requests\/(\d+)/);
  if (gitlabMatch) {
    return {
      provider: 'gitlab',
      owner: '',
      repo: gitlabMatch[1],
      number: gitlabMatch[2],
    };
  }

  return null;
}

function runCmd(command: string, cwd?: string): string {
  const result = execSync(command, {
    cwd: cwd ?? process.cwd(),
    encoding: 'utf-8',
    timeout: 60000,
    maxBuffer: 10 * 1024 * 1024,
  });
  return result;
}

function fetchGitHubPR(parsed: ParsedURL, format: string): string {
  const result: string[] = [];

  result.push(`## Pull Request #${parsed.number}`);
  result.push(`Repository: ${parsed.owner}/${parsed.repo}\n`);

  try {
    const info = runCmd(`gh pr view ${parsed.number} --repo ${parsed.owner}/${parsed.repo} --json title,body,author,files,additions,deletions`);
    const data = JSON.parse(info);
    result.push(`**Title:** ${data.title}`);
    result.push(`**Author:** ${data.author?.login ?? 'unknown'}`);
    result.push(`**Changes:** +${data.additions}/-${data.deletions} across ${data.files?.length ?? 0} files\n`);
    result.push(`**Description:**\n${data.body ?? '(none)'}\n`);
  } catch {
    // gh CLI not available, skip metadata
  }

  if (format === 'full' || format === 'files') {
    try {
      const files = runCmd(`gh pr view ${parsed.number} --repo ${parsed.owner}/${parsed.repo} --json files --jq '.files[].path'`);
      result.push(`\n### Changed Files\n\`\`\`\n${files}\n\`\`\`\n`);
    } catch {
      result.push('\n### Changed Files\n(Failed to fetch file list)\n');
    }
  }

  if (format === 'full' || format === 'diff') {
    try {
      const diff = runCmd(`gh pr diff ${parsed.number} --repo ${parsed.owner}/${parsed.repo}`);
      result.push(`\n### Diff\n\`\`\`diff\n${diff}\n\`\`\``);
    } catch {
      result.push('\n### Diff\n(Failed to fetch diff - ensure `gh` CLI is installed and authenticated)\n');
    }
  }

  return result.join('\n');
}

function fetchGitLabMR(parsed: ParsedURL, format: string): string {
  const result: string[] = [];

  result.push(`## Merge Request !${parsed.number}`);
  result.push(`Project: ${parsed.repo}\n`);

  try {
    const info = runCmd(`glab mr view ${parsed.number} --repo ${parsed.repo}`);
    result.push(info);
    result.push('');
  } catch {
    // glab CLI not available
  }

  if (format === 'full' || format === 'diff') {
    try {
      const diff = runCmd(`glab mr diff ${parsed.number} --repo ${parsed.repo}`);
      result.push(`\n### Diff\n\`\`\`diff\n${diff}\n\`\`\``);
    } catch {
      result.push('\n### Diff\n(Failed to fetch diff - ensure `glab` CLI is installed and authenticated)\n');
    }
  }

  return result.join('\n');
}
