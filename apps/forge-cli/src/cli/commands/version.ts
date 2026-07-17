import { Command } from 'commander';
import os from 'node:os';
import chalk from 'chalk';

export const versionCommand = new Command('version')
  .description('Show detailed version information')
  .summary('Display forge version, environment, and system info')
  .action(async () => {
    const pkg = await readPackageJson();

    console.log(chalk.bold.cyan('\n🔨 forge'));
    console.log();

    console.log(chalk.white('  Version:    ') + chalk.green(pkg.version));
    console.log(chalk.white('  License:    ') + pkg.license || 'MIT');
    console.log();
    console.log(chalk.bold('Environment'));
    console.log(chalk.white('  Node.js:    ') + process.version);
    console.log(chalk.white('  Platform:   ') + `${os.platform()} ${os.arch()}`);
    console.log(chalk.white('  OS:         ') + `${os.type()} ${os.release()}`);
    console.log();
    console.log(chalk.bold('Paths'));
    console.log(chalk.white('  CLI:        ') + process.argv[1]);
    console.log(chalk.white('  CWD:        ') + process.cwd());
    console.log(chalk.white('  Home:       ') + os.homedir());
    console.log();
  });

async function readPackageJson(): Promise<Record<string, string>> {
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const url = await import('node:url');
    
    const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
    const pkgPath = path.join(__dirname, '..', '..', 'package.json');
    const raw = fs.readFileSync(pkgPath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { version: '0.1.0', license: 'MIT' };
  }
}
