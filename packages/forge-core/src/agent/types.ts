import type { MessageParam } from '@anthropic-ai/sdk/resources/index';

export type MessageRole = 'system' | 'user' | 'assistant';

export interface Message {
  role: MessageRole;
  content: string | ContentBlock[];
}

export type ContentBlock =
  | TextBlock
  | ToolUseBlock
  | ToolResultBlock;

export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export type AgentEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'thinking_delta'; text: string }
  | { type: 'tool_call'; tool: ToolCall }
  | { type: 'tool_result'; toolUseId: string; result: string }
  | { type: 'done'; output: string }
  | { type: 'error'; error: Error };

export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  chat(
    messages: Message[],
    tools: ToolDefinition[],
    signal?: AbortSignal,
  ): AsyncGenerator<AgentEvent>;
}

export interface Skill {
  readonly name: string;
  readonly description: string;
  readonly tools: ToolDefinition[];
  readonly systemPrompt: string;
  /** Called before agent loop starts */
  onBeforeRun?(context: SkillContext): Promise<void>;
  /** Called after agent loop completes */
  onAfterRun?(context: SkillContext, result: AgentResult): Promise<void>;
}

export interface SkillContext {
  workspaceRoot: string;
  config: Record<string, unknown>;
}

export interface AgentResult {
  success: boolean;
  output: string;
  data?: unknown;
  error?: Error;
}
