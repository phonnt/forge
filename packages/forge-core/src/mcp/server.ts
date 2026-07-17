import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { ToolRegistry } from '../agent/tools/registry.js';

export function createMCPServer(tools: ToolRegistry): Server {
  const server = new Server(
    {
      name: 'forge-agent',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const definitions = tools.getDefinitions();
    return {
      tools: definitions.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: {
          type: 'object',
          properties: t.parameters,
        } as const,
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const result = await tools.execute(name, args ?? {});
    return {
      content: [
        {
          type: 'text' as const,
          text: result,
        },
      ],
    };
  });

  return server;
}

export async function startMCPServer(tools: ToolRegistry): Promise<void> {
  const server = createMCPServer(tools);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
