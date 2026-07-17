#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { reviewCommand } from './commands/review.js';
import { initCommand } from './commands/init.js';
import { connectCommand } from './commands/connect.js';
import { versionCommand } from './commands/version.js';
import { runTUIDashboard } from '../tui/index.js';

const program = new Command();

program
  .name('forge')
  .description('AI-powered CLI agent for software development lifecycle')
  .summary('Automate code review, testing, deployment, and more')
  .version('0.1.0')
  .usage('[command] [options]')
  .addHelpText(
    'before',
    chalk.bold.cyan('\n🔨 forge') +
      chalk.gray(' - Your AI-powered development companion\n'),
  )
  .addHelpText(
    'after',
    `
${chalk.bold('Getting Started:')}
  ${chalk.cyan('forge')}                    Open interactive TUI dashboard
  ${chalk.cyan('forge init')}              Create .forge/ configuration in your project
  ${chalk.cyan('forge review <url>')}      Review a pull request or merge request

${chalk.bold('Examples:')}
  ${chalk.gray('$')} forge
  ${chalk.gray('$')} forge review https://github.com/owner/repo/pull/42
  ${chalk.gray('$')} forge review https://github.com/owner/repo/pull/42 --tui
  ${chalk.gray('$')} forge review https://gitlab.com/group/project/-/merge_requests/1 --format json
  ${chalk.gray('$')} forge connect openai
  ${chalk.gray('$')} forge init

${chalk.bold('Configuration:')}
  User config   ~/.forge/config.yaml
  Project config .forge/config.yaml
  Review rules   .forge/rules.md

${chalk.bold('Documentation:')}
  docs/GETTING_STARTED.md

${chalk.dim(`v${program.version()}`)}
`,
  )
  .showHelpAfterError('Use --help to see available commands')
  .configureHelp({
    sortSubcommands: true,
    subcommandTerm: (cmd) => chalk.cyan(cmd.name()),
  });

program.addCommand(reviewCommand);
program.addCommand(initCommand);
program.addCommand(connectCommand);
program.addCommand(versionCommand);

const args = process.argv.slice(2);
const knownCommands = program.commands.map((c) => c.name());

if (args.length === 0) {
  runTUIDashboard().catch((err) => {
    console.error(chalk.red(`Error: ${err.message}`));
    process.exit(1);
  });
} else if (
  args[0] === '--help' ||
  args[0] === '-h' ||
  args[0] === 'help' ||
  knownCommands.includes(args[0])
) {
  program.parse(process.argv);
} else {
  program.parse(process.argv);
}
