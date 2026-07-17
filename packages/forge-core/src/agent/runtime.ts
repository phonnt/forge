import type {
  LLMProvider,
  Message,
  SkillContext,
  AgentResult,
  AgentEvent,
  ToolUseBlock,
  ToolResultBlock,
  TextBlock,
} from './types.js';
import type { SkillRegistry } from './skills/registry.js';
import type { ToolRegistry } from './tools/registry.js';
import { useAgentStore } from '../store/agent.js';

export interface RuntimeConfig {
  provider: LLMProvider;
  skills: SkillRegistry;
  tools: ToolRegistry;
  workspaceRoot: string;
  skillContext?: Record<string, unknown>;
  onEvent?: (event: AgentEvent) => void;
}

export class AgentRuntime {
  readonly config: RuntimeConfig;
  private messages: Message[] = [];

  constructor(config: RuntimeConfig) {
    this.config = config;
  }

  async run(task: string): Promise<AgentResult> {
    const store = useAgentStore.getState();
    store.setStatus('thinking');
    store.setProgress('Loading skills...');

    const context: SkillContext = {
      workspaceRoot: this.config.workspaceRoot,
      config: this.config.skillContext ?? {},
    };

    await this.config.skills.onBeforeRun(context);

    const systemPrompt = this.config.skills.getSystemPrompt();
    const skillTools = this.config.skills.getAllTools();

    const allTools = [...this.config.tools.getDefinitions(), ...skillTools];

    this.messages = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: task,
      },
    ];

    let output = '';
    let iteration = 0;
    const maxIterations = 30;

    try {
      while (iteration < maxIterations) {
        iteration++;
        store.setProgress(`Thinking... (iteration ${iteration}/${maxIterations})`);

        let hasToolCall = false;
        let currentText = '';

        for await (const event of this.config.provider.chat(
          this.messages,
          allTools,
          useAgentStore.getState().abortController?.signal,
        )) {
          switch (event.type) {
            case 'text_delta':
              currentText += event.text;
              store.setProgress(currentText.slice(-100));
              this.emit(event);
              break;

            case 'tool_call':
              hasToolCall = true;
              store.setStatus('executing');
              store.setProgress(`Executing tool: ${event.tool.name}`);
              this.emit(event);
              await this.executeTool(event.tool.id, event.tool.name, event.tool.arguments);
              break;

            case 'done':
              output += currentText;
              store.setProgress('Complete');
              this.emit(event);

              const result: AgentResult = {
                success: true,
                output,
                data: this.config.skillContext,
              };

              await this.config.skills.onAfterRun(context, result);
              store.setResult(result);
              return result;

            case 'error':
              store.setError(event.error.message);
              this.emit(event);
              return {
                success: false,
                output,
                error: event.error,
              };
          }
        }

        if (!hasToolCall) {
          output += currentText;
          break;
        }
      }

      const finalResult: AgentResult = {
        success: true,
        output,
        data: this.config.skillContext,
      };

      await this.config.skills.onAfterRun(context, finalResult);
      store.setResult(finalResult);
      return finalResult;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      store.setError(error.message);
      return {
        success: false,
        output,
        error,
      };
    }
  }

  private async executeTool(
    id: string,
    name: string,
    args: Record<string, unknown>,
  ): Promise<void> {
    const result = await this.config.tools.execute(name, args);

    this.messages.push({
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id,
          name,
          input: args,
        } satisfies ToolUseBlock,
      ],
    });

    this.messages.push({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: id,
          content: result,
        } satisfies ToolResultBlock,
      ],
    });

    this.emit({ type: 'tool_result', toolUseId: id, result });
  }

  abort(): void {
    const store = useAgentStore.getState();
    store.abortController?.abort();
  }

  private emit(event: AgentEvent): void {
    this.config.onEvent?.(event);
    useAgentStore.getState().addEvent(event);
  }
}
