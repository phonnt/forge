import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, Tool } from '@anthropic-ai/sdk/resources/index';
import type { LLMProvider, AgentEvent, Message, ToolDefinition } from '../types.js';
import type { ProviderConfig } from '../../config/schema.js';

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  readonly model: string;
  private client: Anthropic;

  constructor(config: ProviderConfig) {
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.model = config.model;
    this.client = new Anthropic({ apiKey: config.apiKey });
  }

  async *chat(
    messages: Message[],
    tools: ToolDefinition[],
    signal?: AbortSignal,
  ): AsyncGenerator<AgentEvent> {
    const systemBlock = messages
      .filter((m) => m.role === 'system')
      .map((m) => (typeof m.content === 'string' ? m.content : ''))
      .join('\n\n');

    const userMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => this.convertMessage(m))
      .filter((m): m is MessageParam => m !== null);

    const anthropicTools: Tool[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: {
        type: 'object' as const,
        properties: t.parameters as Record<string, unknown>,
        required: Object.keys(t.parameters),
      },
    }));

    try {
      const stream = this.client.messages.stream(
        {
          model: this.model,
          max_tokens: 16000,
          system: systemBlock || undefined,
          messages: userMessages,
          tools: anthropicTools.length > 0 ? anthropicTools : undefined,
        },
        { signal },
      );

      let currentToolId = '';
      let currentToolName = '';
      let currentToolInput = '';

      for await (const event of stream) {
        switch (event.type) {
          case 'content_block_start':
            if (event.content_block.type === 'tool_use') {
              currentToolId = event.content_block.id;
              currentToolName = event.content_block.name;
              currentToolInput = '';
            }
            break;

          case 'content_block_delta':
            if (event.delta.type === 'text_delta') {
              yield { type: 'text_delta', text: event.delta.text };
            } else if (event.delta.type === 'input_json_delta') {
              currentToolInput += event.delta.partial_json;
            }
            break;

          case 'content_block_stop':
            if (currentToolId) {
              let parsed: Record<string, unknown> = {};
              try {
                parsed = JSON.parse(currentToolInput);
              } catch {
                // partial JSON, skip
              }
              yield {
                type: 'tool_call',
                tool: { id: currentToolId, name: currentToolName, arguments: parsed },
              };
              currentToolId = '';
              currentToolName = '';
              currentToolInput = '';
            }
            break;

          case 'message_stop':
            yield { type: 'done', output: '' };
            break;
        }
      }
    } catch (err) {
      yield { type: 'error', error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  private convertMessage(msg: Message): MessageParam | null {
    if (typeof msg.content === 'string') {
      return {
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      };
    }

    const content = msg.content.map((block) => {
      switch (block.type) {
        case 'text':
          return { type: 'text' as const, text: block.text };
        case 'tool_use':
          return {
            type: 'tool_use' as const,
            id: block.id,
            name: block.name,
            input: block.input,
          };
        case 'tool_result':
          return {
            type: 'tool_result' as const,
            tool_use_id: block.tool_use_id,
            content: block.content,
          };
        default:
          return { type: 'text' as const, text: '' };
      }
    });

    return {
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content,
    };
  }
}
