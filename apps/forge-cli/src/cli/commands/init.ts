import { Command } from 'commander';
import chalk from 'chalk';
import { initProjectConfig, ensureForgeDir } from 'forge-core';

export const initCommand = new Command('init')
  .description('Initialize forge configuration in the current project')
  .summary('Create .forge/ directory with default configuration and review rules')
  .usage('[options]')
  .addHelpText(
    'after',
    `
${chalk.bold('What this does:')}
  Creates a .forge/ directory in your project with:
    config.yaml  - Project-specific settings
    rules.md     - Customizable code review rules and checklist
    skills.yaml  - Skills configuration

${chalk.bold('Examples:')}
  ${chalk.gray('$')} forge init

${chalk.bold('After init:')}
  1. Edit .forge/rules.md to customize your review criteria
  2. Edit .forge/config.yaml to set project-specific options
  3. Run ${chalk.cyan('forge review <url>')} to start reviewing
`,
  )
  .action(async () => {
    console.log(chalk.bold.cyan('\n🔨 forge - Initialize\n'));

    try {
      ensureForgeDir();

      const forgeDir = initProjectConfig();
      console.log(chalk.green('✅ Project initialized!'));
      console.log(chalk.gray(`   Created: ${forgeDir}`));
      console.log(chalk.gray(`   - config.yaml  (project settings)`));
      console.log(chalk.gray(`   - rules.md     (review rules & checklist)`));
      console.log();
      console.log(chalk.white('Next steps:'));
      console.log(chalk.white('  1. Edit .forge/rules.md to customize review rules'));
      console.log(chalk.white('  2. Configure provider: ~/.forge/config.yaml'));
      console.log(chalk.white('  3. Run: forge review <pr-url>'));
      console.log();
    } catch (err) {
      console.error(chalk.red(`Error: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  });
