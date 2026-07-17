import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import yaml from 'js-yaml';
import {
  ForgeConfigSchema,
  ProviderConfigSchema,
  type ForgeConfig,
  type ProviderConfig,
} from './schema.js';

const FORGE_DIR = path.join(os.homedir(), '.forge');
const CONFIG_PATH = path.join(FORGE_DIR, 'config.yaml');

export function ensureForgeDir(): string {
  if (!fs.existsSync(FORGE_DIR)) {
    fs.mkdirSync(FORGE_DIR, { recursive: true });
  }
  return FORGE_DIR;
}

export function loadForgeConfig(): ForgeConfig {
  ensureForgeDir();

  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(
      `No forge config found at ${CONFIG_PATH}. Run 'forge init' to create one.`,
    );
  }

  try {
    const raw = yaml.load(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    return ForgeConfigSchema.parse(raw);
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Failed to parse forge config: ${err.message}`);
    }
    throw err;
  }
}

export function saveForgeConfig(config: ForgeConfig): void {
  ensureForgeDir();
  fs.writeFileSync(CONFIG_PATH, yaml.dump(config), 'utf-8');
}

export function getActiveProvider(config: ForgeConfig): ProviderConfig {
  const active = config.active ?? config.providers[0].name;
  const provider = config.providers.find((p) => p.name === active);
  if (!provider) {
    throw new Error(`Provider '${active}' not found in config`);
  }

  const resolved = { ...provider };
  if (resolved.apiKey?.startsWith('${') && resolved.apiKey.endsWith('}')) {
    const envVar = resolved.apiKey.slice(2, -1);
    resolved.apiKey = process.env[envVar];
  }

  return ProviderConfigSchema.parse(resolved);
}

export function setActiveProvider(name: string): void {
  const config = loadForgeConfig();
  const provider = config.providers.find((p) => p.name === name);
  if (!provider) {
    throw new Error(`Provider '${name}' not found in config`);
  }
  config.active = name;
  saveForgeConfig(config);
}
