import { Ollama as OllamaClient } from 'ollama';
import type { LLMProvider, AgentEvent, Message, ToolDefinition } from '../types.js';
import type { ProviderConfig } from '../../config/schema.js';

export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama';
  readonly model: string;
  private client: OllamaClient;

  constructor(config: ProviderConfig) {
    this.model = config.model;
    this.client = new OllamaClient({
      host: config.baseUrl ?? 'http://localhost:11434',
    });
  }

  async *chat(
    messages: Message[],
    tools: ToolDefinition[],
    signal?: AbortSignal,
  ): AsyncGenerator<AgentEvent> {
    const ollamaMessages = messages.map((m) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    }));

    try {
      const response = await this.client.chat({
        model: this.model,
        messages: ollamaMessages,
        stream: true,
        tools: tools.length > 0
          ? (tools.map((t) => ({
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
            })) as any)
          : undefined,
      });

      let buffer = '';

      for await (const part of response) {
        if (signal?.aborted) break;

        if (part.message?.content) {
          buffer += part.message.content;
          yield { type: 'text_delta', text: part.message.content };
        }

        if (part.message?.tool_calls) {
          for (const tc of part.message.tool_calls) {
            yield {
              type: 'tool_call',
              tool: {
                id: tc.function.name,
                name: tc.function.name,
                arguments: tc.function.arguments as Record<string, unknown>,
              },
            };
          }
        }
      }

      yield { type: 'done', output: buffer };
    } catch (err) {
      yield { type: 'error', error: err instanceof Error ? err : new Error(String(err)) };
    }
  }
}
