import { z } from 'zod';

export const ProviderConfigSchema = z.object({
  name: z.string(),
  type: z.enum(['anthropic', 'openai', 'ollama', 'copilot', 'opencode-zen', 'opencode-go', 'gemini']),
  model: z.string(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  maxTokens: z.number().optional(),
});

export const ForgeConfigSchema = z.object({
  active: z.string().optional(),
  providers: z.array(ProviderConfigSchema).min(1),
});

export const ProjectConfigSchema = z.object({
  version: z.string().optional(),
  agent: z
    .object({
      provider: z.string().optional(),
      model: z.string().optional(),
      maxTokens: z.number().optional(),
    })
    .optional(),
  review: z
    .object({
      rulesFile: z.string().optional(),
      outputFormat: z.enum(['markdown', 'json', 'sarif']).optional(),
      outputPath: z.string().optional(),
    })
    .optional(),
  skills: z.record(z.unknown()).optional(),
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type ForgeConfig = z.infer<typeof ForgeConfigSchema>;
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
