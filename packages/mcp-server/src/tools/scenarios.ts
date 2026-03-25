import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ScenarioEngine } from "@scenario-editor/scenario-engine";

export function registerScenarioTools(
  server: McpServer,
  engine: ScenarioEngine,
): void {
  server.tool(
    "get_scenarios",
    "전체 시나리오 목록을 반환한다. 각 시나리오의 ID, 이름, 설명, 대상 URL, 마지막 실행 상태를 포함한다.",
    {},
    async () => {
      const scenarios = engine.listScenarios();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ scenarios }, null, 2),
          },
        ],
      };
    },
  );

  server.tool(
    "run_scenario",
    "특정 시나리오를 실행한다. Playwright로 대상 앱에 접속하여 시나리오 단계를 수행하고, 이벤트 앵커 시점에 DOM/스크린샷을 캡처한다.",
    {
      id: z
        .string()
        .describe("실행할 시나리오 ID (파일명에서 .scenario.yaml 제외)"),
    },
    async ({ id }) => {
      try {
        const result = await engine.runScenario(id);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                status: "error",
                scenario_id: id,
                error: err instanceof Error ? err.message : String(err),
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "get_scenario_result",
    "특정 시나리오의 최신 실행 결과를 조회한다. 프레임 캡처, assertion 결과, 요약 정보를 포함한다.",
    {
      id: z.string().describe("조회할 시나리오 ID"),
    },
    async ({ id }) => {
      const result = engine.getLatestResult(id);
      if (!result) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                scenario_id: id,
                error: "실행 결과 없음",
              }),
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );
}
