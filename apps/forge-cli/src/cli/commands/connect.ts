import { Command } from 'commander';
import chalk from 'chalk';
import { loadForgeConfig, setActiveProvider } from 'forge-core';

export const connectCommand = new Command('connect')
  .description('Switch the active LLM provider')
  .summary('Select which AI provider to use for code review and other tasks')
  .usage('<provider> [options]')
  .argument('<provider>', 'Provider name to activate (as defined in ~/.forge/config.yaml)')
  .addHelpText(
    'after',
    `
${chalk.bold('Available providers:')}
  Defined in ~/.forge/config.yaml under the 'providers' key.
  Supported types: anthropic, openai, ollama

${chalk.bold('Examples:')}
  ${chalk.gray('$')} forge connect anthropic
  ${chalk.gray('$')} forge connect openai
  ${chalk.gray('$')} forge connect ollama

${chalk.bold('Configuration (~/.forge/config.yaml):')}
  providers:
    - name: anthropic
      type: anthropic
      model: claude-sonnet-4-20250514
      apiKey: \${ANTHROPIC_API_KEY}

    - name: openai
      type: openai
      model: gpt-4o
      apiKey: \${OPENAI_API_KEY}

    - name: ollama
      type: ollama
      model: llama3.1
      baseUrl: http://localhost:11434

  active: anthropic
`,
  )
  .action(async (name: string) => {
    console.log(chalk.bold.cyan('\n🔨 forge - Connect\n'));

    try {
      setActiveProvider(name);
      const config = loadForgeConfig();
      const provider = config.providers.find((p) => p.name === name);

      console.log(chalk.green(`✅ Connected to ${name}`));
      console.log(chalk.gray(`   Type:  ${provider?.type}`));
      console.log(chalk.gray(`   Model: ${provider?.model}`));
      console.log();

      console.log(chalk.white('Available providers:'));
      for (const p of config.providers) {
        const marker = p.name === config.active ? chalk.green(' ●') : '  ';
        console.log(`${marker} ${p.name} (${p.type}/${p.model})`);
      }
      console.log();
    } catch (err) {
      console.error(chalk.red(`Error: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  });
