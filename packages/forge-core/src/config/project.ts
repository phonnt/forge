import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { ProjectConfigSchema, type ProjectConfig } from './schema.js';

const FORGE_DIR = '.forge';
const PROJECT_CONFIG = 'config.yaml';

export function findProjectRoot(startDir: string = process.cwd()): string | null {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;

  while (current !== root) {
    const forgePath = path.join(current, FORGE_DIR, PROJECT_CONFIG);
    if (fs.existsSync(forgePath)) {
      return current;
    }
    current = path.dirname(current);
  }

  return null;
}

export function loadProjectConfig(projectRoot: string): ProjectConfig {
  const configPath = path.join(projectRoot, FORGE_DIR, PROJECT_CONFIG);

  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    const raw = yaml.load(fs.readFileSync(configPath, 'utf-8'));
    return ProjectConfigSchema.parse(raw);
  } catch {
    return {};
  }
}

export function loadRulesFile(projectRoot: string): string {
  const rulesPath = path.join(projectRoot, FORGE_DIR, 'rules.md');

  if (!fs.existsSync(rulesPath)) {
    return '';
  }

  return fs.readFileSync(rulesPath, 'utf-8');
}

export function initProjectConfig(cwd: string = process.cwd()): string {
  const forgeDir = path.join(cwd, FORGE_DIR);

  if (!fs.existsSync(forgeDir)) {
    fs.mkdirSync(forgeDir, { recursive: true });
  }

  const configPath = path.join(forgeDir, PROJECT_CONFIG);
  if (!fs.existsSync(configPath)) {
    const defaultConfig: ProjectConfig = {
      version: '0.1.0',
      review: {
        rulesFile: 'rules.md',
        outputFormat: 'markdown',
        outputPath: '.forge/review-report.md',
      },
    };
    fs.writeFileSync(configPath, yaml.dump(defaultConfig), 'utf-8');
  }

  const rulesPath = path.join(forgeDir, 'rules.md');
  if (!fs.existsSync(rulesPath)) {
    fs.writeFileSync(rulesPath, DEFAULT_RULES, 'utf-8');
  }

  return forgeDir;
}

const DEFAULT_RULES = `# Review Rules

## Quy tắc chung

1. Không hardcode credentials, API keys, tokens
2. Validate tất cả user input
3. Xử lý lỗi đầy đủ (try-catch, error boundaries)
4. Không sử dụng \`any\` type (TypeScript)
5. Ưu tiên \`const\` và immutable data

## Checklist Review

### Security
- [ ] Không có SQL injection
- [ ] Không có XSS vulnerabilities
- [ ] Authentication & Authorization đúng
- [ ] Sensitive data không bị log/expose

### Performance
- [ ] Không có N+1 queries
- [ ] Tránh memory leaks (event listeners, timers, subscriptions)
- [ ] Sử dụng caching khi cần thiết
- [ ] Lazy loading cho heavy components

### Code Quality
- [ ] Function/class single responsibility
- [ ] Đặt tên rõ ràng, nhất quán
- [ ] Không có dead code hoặc commented-out code
- [ ] Magic numbers được extract thành constants
- [ ] Tuân thủ coding convention của dự án

### Error Handling
- [ ] Edge cases được xử lý
- [ ] Error messages có ý nghĩa
- [ ] Retry logic cho transient failures
- [ ] Graceful degradation

### Testing
- [ ] Unit test cho business logic
- [ ] Integration test cho API endpoints
- [ ] Edge case coverage
`;
