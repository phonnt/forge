import type { ToolDefinition } from '../types.js';

export interface ToolHandler {
  definition: ToolDefinition;
  execute(args: Record<string, unknown>): Promise<string>;
}

export class ToolRegistry {
  private tools = new Map<string, ToolHandler>();

  register(handler: ToolHandler): void {
    this.tools.set(handler.definition.name, handler);
  }

  unregister(name: string): void {
    this.tools.delete(name);
  }

  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((h) => h.definition);
  }

  async execute(name: string, args: Record<string, unknown>): Promise<string> {
    const handler = this.tools.get(name);
    if (!handler) {
      return `Error: Unknown tool '${name}'`;
    }
    try {
      return await handler.execute(args);
    } catch (err) {
      return `Error executing tool '${name}': ${err instanceof Error ? err.message : String(err)}`;
    }
  }
}
