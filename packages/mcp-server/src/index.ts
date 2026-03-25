#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SpecStore } from "@scenario-editor/spec-store";
import { ScenarioEngine } from "@scenario-editor/scenario-engine";
import { registerSpecTools } from "./tools/spec.js";
import { registerScenarioTools } from "./tools/scenarios.js";

const ROOT_DIR = process.env.SCENARIO_EDITOR_ROOT || process.cwd();

const server = new McpServer({
  name: "scenario-editor",
  version: "0.2.0",
});

const store = new SpecStore({ rootDir: ROOT_DIR });
const engine = new ScenarioEngine({ rootDir: ROOT_DIR });

registerSpecTools(server, store);
registerScenarioTools(server, engine);

const transport = new StdioServerTransport();
await server.connect(transport);
