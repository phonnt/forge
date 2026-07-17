import OpenAI from 'openai';
import type { LLMProvider, AgentEvent, Message, ToolDefinition } from '../types.js';
import type { ProviderConfig } from '../../config/schema.js';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  readonly model: string;
  private client: OpenAI;

  constructor(config: ProviderConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }

    this.model = config.model;
    const opts: Record<string, unknown> = { apiKey: config.apiKey };
    if (config.baseUrl) {
      opts.baseURL = config.baseUrl;
    }
    this.client = new OpenAI(opts as any);
  }

  async *chat(
    messages: Message[],
    tools: ToolDefinition[],
    signal?: AbortSignal,
  ): AsyncGenerator<AgentEvent> {
    const openaiMessages = messages.map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    }));

    const openaiTools = tools.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: {
          type: 'object' as const,
          properties: t.parameters as Record<string, unknown>,
          required: Object.keys(t.parameters),
        },
      },
    }));

    try {
      const stream = await this.client.chat.completions.create(
        {
          model: this.model,
          messages: openaiMessages,
          tools: openaiTools.length > 0 ? openaiTools : undefined,
          stream: true,
        },
        { signal },
      );

      let currentToolCall: { id: string; name: string; args: string } | null = null;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          yield { type: 'text_delta', text: delta.content };
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.id) {
              if (currentToolCall) {
                yield {
                  type: 'tool_call',
                  tool: {
                    id: currentToolCall.id,
                    name: currentToolCall.name,
                    arguments: this.safeParse(currentToolCall.args),
                  },
                };
              }
              currentToolCall = { id: tc.id, name: tc.function?.name ?? '', args: '' };
            }
            if (tc.function?.arguments && currentToolCall) {
              currentToolCall.args += tc.function.arguments;
            }
          }
        }

        if (chunk.choices[0]?.finish_reason === 'stop') {
          if (currentToolCall) {
            yield {
              type: 'tool_call',
              tool: {
                id: currentToolCall.id,
                name: currentToolCall.name,
                arguments: this.safeParse(currentToolCall.args),
              },
            };
            currentToolCall = null;
          }
          yield { type: 'done', output: '' };
        }
      }
    } catch (err) {
      yield { type: 'error', error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  private safeParse(args: string): Record<string, unknown> {
    try {
      return JSON.parse(args);
    } catch {
      return {};
    }
  }
}
