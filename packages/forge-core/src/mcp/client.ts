import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { ToolRegistry } from '../agent/tools/registry.js';

interface MCPConnection {
  name: string;
  client: Client;
  transport: StdioClientTransport;
}

export class MCPClient {
  private connections = new Map<string, MCPConnection>();

  async connect(name: string, command: string, args: string[] = []): Promise<ToolRegistry | null> {
    try {
      const transport = new StdioClientTransport({
        command,
        args,
      });

      const client = new Client(
        {
          name: 'forge-mcp-client',
          version: '0.1.0',
        },
        {
          capabilities: {},
        },
      );

      await client.connect(transport);

      this.connections.set(name, { name, client, transport });

      return null;
    } catch (err) {
      console.error(`Failed to connect to MCP server '${name}':`, err);
      return null;
    }
  }

  async listTools(name: string): Promise<string[]> {
    const conn = this.connections.get(name);
    if (!conn) return [];

    try {
      const result = await conn.client.listTools();
      return result.tools.map((t) => t.name);
    } catch {
      return [];
    }
  }

  async disconnect(name: string): Promise<void> {
    const conn = this.connections.get(name);
    if (conn) {
      try {
        await conn.transport.close();
      } catch {
        // ignore
      }
      this.connections.delete(name);
    }
  }

  async disconnectAll(): Promise<void> {
    for (const [name] of this.connections) {
      await this.disconnect(name);
    }
  }
}
