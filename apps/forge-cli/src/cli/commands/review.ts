import { Command } from 'commander';
import chalk from 'chalk';
import {
  createProvider,
  loadForgeConfig,
  getActiveProvider,
  findProjectRoot,
  loadProjectConfig,
  loadRulesFile,
  AgentRuntime,
  SkillRegistry,
  createCodeReviewSkill,
  ToolRegistry,
  bashTool,
  readFileTool,
  gitDiffTool,
  globTool,
  useAgentStore,
} from 'forge-core';
import { runTUIReview } from '../../tui/index.js';

interface ReviewOptions {
  rules?: string;
  output?: string;
  format?: string;
  model?: string;
  tui?: boolean;
}

export async function createReviewRuntime(url: string, options: ReviewOptions) {
  const forgeConfig = loadForgeConfig();
  const providerConfig = getActiveProvider(forgeConfig);

  if (options.model) {
    providerConfig.model = options.model;
  }

  const provider = createProvider(providerConfig);

  const projectRoot = findProjectRoot() ?? process.cwd();
  const projectConfig = loadProjectConfig(projectRoot);

  const rulesFile = options.rules ?? projectConfig.review?.rulesFile;
  const rules = rulesFile
    ? loadRulesFile(projectRoot)
    : '';

  const tools = new ToolRegistry();
  tools.register(bashTool);
  tools.register(readFileTool);
  tools.register(gitDiffTool);
  tools.register(globTool);

  const skills = new SkillRegistry();
  skills.register(createCodeReviewSkill(rules));

  const runtime = new AgentRuntime({
    provider,
    skills,
    tools,
    workspaceRoot: projectRoot,
    skillContext: {
      url,
      outputPath: options.output ?? projectConfig.review?.outputPath,
    },
  });

  return { runtime, providerConfig };
}

export const reviewCommand = new Command('review')
  .description('Review a pull request or merge request using AI')
  .summary('Analyze code changes against project rules and generate a review report')
  .usage('<url> [options]')
  .argument('<url>', 'GitHub PR or GitLab MR URL')
  .option('-r, --rules <path>', 'Path to custom rules file (default: .forge/rules.md)')
  .option('-o, --output <path>', 'Output path for review report (default: .forge/review-report.md)')
  .option('-f, --format <format>', 'Output format: markdown, json, sarif', 'markdown')
  .option('-m, --model <model>', 'Override the active model for this review')
  .option('--tui', 'Open interactive TUI mode (default: plain text CLI)')
  .addHelpText(
    'after',
    `
${chalk.bold('Examples:')}
  ${chalk.gray('$')} forge review https://github.com/owner/repo/pull/42
  ${chalk.gray('$')} forge review https://github.com/owner/repo/pull/42 --rules ./custom-rules.md
  ${chalk.gray('$')} forge review https://github.com/owner/repo/pull/42 --tui
  ${chalk.gray('$')} forge review https://gitlab.com/group/project/-/merge_requests/1 --format json
  ${chalk.gray('$')} forge review https://github.com/owner/repo/pull/42 --output ./review.md

${chalk.bold('Supported URL formats:')}
  GitHub:  https://github.com/<owner>/<repo>/pull/<number>
  GitLab:  https://gitlab.com/<group>/<project>/-/merge_requests/<number>

${chalk.bold('Requires:')}
  gh CLI  (for GitHub)  - https://cli.github.com
  glab CLI (for GitLab) - https://gitlab.com/gitlab-org/cli

${chalk.bold('Workflow:')}
  1. Fetches PR/MR diff via gh/glab
  2. Loads review rules from .forge/rules.md
  3. AI agent analyzes each changed file
  4. Generates report with findings and suggestions
  5. Saves report to .forge/review-report.md
`,
  )
  .action(async (url: string, options) => {
    const startTime = Date.now();

    try {
      const { runtime, providerConfig } = await createReviewRuntime(url, options);

      if (options.tui) {
        await runTUIReview(runtime, buildReviewTask(url, options.format ?? 'markdown'), url);

        const state = useAgentStore.getState();
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        if (state.status === 'done' && state.result?.success) {
          console.log(chalk.green(`\n✅ Review complete in ${elapsed}s`));
          console.log(chalk.gray(`   Report saved to .forge/review-report.md`));
        }
      } else {
        console.log(chalk.bold.cyan('\n🔨 forge - Code Review Agent'));
        console.log(chalk.gray(`   Target: ${url}`));
        console.log(chalk.gray(`   Provider: ${providerConfig.type} / ${providerConfig.model}\n`));

        runtime.config.onEvent = (event) => {
          switch (event.type) {
            case 'text_delta':
              process.stdout.write(event.text);
              break;
            case 'tool_call':
              console.log(chalk.yellow(`\n🔧 [tool:${event.tool.name}]`));
              break;
            case 'tool_result':
              console.log(chalk.gray(`   ✓ done (${event.result.length} chars)`));
              break;
          }
        };

        const result = await runtime.run(buildReviewTask(url, options.format ?? 'markdown'));

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        if (result.success) {
          console.log(chalk.green(`\n✅ Review complete in ${elapsed}s`));
          if (options.output) {
            console.log(chalk.gray(`   Report saved to ${options.output}`));
          } else {
            console.log(chalk.gray(`   Report saved to .forge/review-report.md`));
          }
        } else {
          console.log(chalk.red(`\n❌ Review failed: ${result.error?.message}`));
          process.exit(1);
        }
      }
    } catch (err) {
      console.error(chalk.red(`\nError: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  });

function buildReviewTask(url: string, format: string): string {
  return `Review the code changes at this URL: ${url}

First, use the git_diff tool to fetch the diff and changed files. Then analyze each file against the review rules. 

For each issue you find, output a JSONL line with the finding. Use this exact format:
{"file":"<path>","lineStart":<number>,"lineEnd":<number>,"severity":"critical|major|minor|info","category":"security|performance|bug|style|maintainability|naming|other","title":"<short title>","description":"<detailed description>","suggestion":"<actionable fix>"}

After reviewing all files, output:
---SUMMARY---
{"total":<n>,"critical":<n>,"major":<n>,"minor":<n>,"info":<n>}

Be thorough - check every changed file and every line of the diff.`;
}
