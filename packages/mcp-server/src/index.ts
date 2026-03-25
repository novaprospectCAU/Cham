#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SpecStore } from "@scenario-editor/spec-store";
import { registerSpecTools } from "./tools/spec.js";

const ROOT_DIR = process.env.SCENARIO_EDITOR_ROOT || process.cwd();

const server = new McpServer({
  name: "scenario-editor",
  version: "0.1.0",
});

const store = new SpecStore({ rootDir: ROOT_DIR });

registerSpecTools(server, store);

const transport = new StdioServerTransport();
await server.connect(transport);
