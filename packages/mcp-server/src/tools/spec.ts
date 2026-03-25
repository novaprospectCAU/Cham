import { z } from "zod";
import { SpecStore } from "@scenario-editor/spec-store";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerSpecTools(server: McpServer, store: SpecStore): void {
  server.tool(
    "get_current_spec",
    "현재 설계서(specs/current/) 전체를 읽어서 반환한다.",
    {},
    async () => {
      const specs = store.getCurrentSpec();
      const validation = store.validateAll();
      const invalid = validation.filter((v) => !v.valid);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                specs,
                validation: {
                  valid: invalid.length === 0,
                  errors: invalid,
                },
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.tool(
    "get_spec_diff",
    "두 버전 간의 설계서 diff를 반환한다. 'current'를 사용하면 현재 설계서를 참조한다.",
    {
      from_version: z
        .string()
        .describe("비교 기준 버전 (예: 'v1' 또는 'current')"),
      to_version: z
        .string()
        .describe("비교 대상 버전 (예: 'v2' 또는 'current')"),
    },
    async ({ from_version, to_version }) => {
      const diff = store.diff(from_version, to_version);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(diff, null, 2),
          },
        ],
      };
    },
  );

  server.tool(
    "save_spec_version",
    "현재 설계서를 특정 버전으로 스냅샷 저장한다.",
    {
      version: z.string().describe("저장할 버전 이름 (예: 'v1')"),
    },
    async ({ version }) => {
      store.saveVersion(version);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              version,
              message: `설계서가 '${version}'으로 저장되었습니다.`,
            }),
          },
        ],
      };
    },
  );

  server.tool(
    "list_spec_versions",
    "저장된 설계서 버전 목록을 반환한다.",
    {},
    async () => {
      const versions = store.listVersions();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ versions }),
          },
        ],
      };
    },
  );

  server.tool(
    "validate_specs",
    "현재 설계서의 스키마 유효성을 검증한다.",
    {},
    async () => {
      const results = store.validateAll();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                valid: results.every((r) => r.valid),
                results,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
