# MCP Integration

forge supports the [Model Context Protocol (MCP)](https://modelcontextprotocol.io) for both consuming external tools and exposing its own capabilities.

---

## Overview

- **MCP Server**: forge can expose its tools (bash, read_file, git_diff, glob) as an MCP server, making them available to other MCP-compatible clients
- **MCP Client**: forge can connect to external MCP servers and register their tools for the AI agent to use

---

## Using forge as an MCP Server

Configure your MCP client to use forge as a tool provider:

```json
{
  "mcpServers": {
    "forge": {
      "command": "forge",
      "args": ["mcp", "serve"]
    }
  }
}
```

forge exposes these tools via MCP:

| Tool | Description |
|------|-------------|
| `bash` | Execute shell commands |
| `read_file` | Read file contents |
| `git_diff` | Fetch PR/MR diffs |
| `glob` | Find files by pattern |

---

## Consuming External MCP Tools

Configure forge to connect to external MCP servers in `~/.forge/config.yaml`:

```yaml
mcp:
  servers:
    - name: github
      command: npx
      args: ["-y", "@modelcontextprotocol/server-github"]

    - name: postgres
      command: npx
      args: ["-y", "@modelcontextprotocol/server-postgres"]
      env:
        DATABASE_URL: ${DATABASE_URL}

    - name: custom-tools
      command: node
      args: ["./mcp-server.js"]
```

External tools become available to the AI agent automatically during reviews.

---

## Use Cases

### GitHub Integration

Connect to the GitHub MCP server to read issues, labels, and other PR metadata during reviews:

```yaml
mcp:
  servers:
    - name: github
      command: npx
      args: ["-y", "@modelcontextprotocol/server-github"]
      env:
        GITHUB_PERSONAL_ACCESS_TOKEN: ${GITHUB_TOKEN}
```

The agent can then read issue descriptions to check if a PR addresses the requirements.

### Database Access

Connect to a PostgreSQL MCP server to verify schema changes:

```yaml
mcp:
  servers:
    - name: postgres
      command: npx
      args: ["-y", "@modelcontextprotocol/server-postgres"]
      env:
        DATABASE_URL: ${DATABASE_URL}
```

### Custom Tool Integration

Expose your own internal tools to forge via MCP:

```javascript
// mcp-server.js
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'custom-tools',
  version: '1.0.0',
}, {
  capabilities: { tools: {} }
});

server.setRequestHandler('tools/list', async () => ({
  tools: [{
    name: 'run_linter',
    description: 'Run project linter and return results',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string' } }
    }
  }]
}));

server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'run_linter') {
    // Run your linter
    return { content: [{ type: 'text', text: 'Linter results...' }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
```
