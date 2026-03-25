import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DiffEngine } from "@scenario-editor/diff-engine";

export function registerDiffTools(
  server: McpServer,
  diffEngine: DiffEngine,
): void {
  server.tool(
    "set_baseline",
    "특정 시나리오의 현재 실행 결과를 baseline(정답)으로 설정한다. diff 비교의 기준점이 된다.",
    {
      scenario_id: z
        .string()
        .describe("baseline으로 설정할 시나리오 ID"),
    },
    async ({ scenario_id }) => {
      const result = diffEngine.setBaseline(scenario_id);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: result.success,
              scenario_id,
              ...(result.error ? { error: result.error } : {}),
            }),
          },
        ],
        ...(result.success ? {} : { isError: true }),
      };
    },
  );

  server.tool(
    "get_diff_log",
    "시나리오의 baseline 대비 최신 결과를 비교하여 불일치 로그를 반환한다. 4개 레이어(visual, layout, nodetree, assertion)에서 비교한다.",
    {
      scenario_id: z.string().describe("비교할 시나리오 ID"),
      severity: z
        .enum(["high", "medium", "low"])
        .optional()
        .describe("최소 심각도 필터 (선택)"),
    },
    async ({ scenario_id, severity }) => {
      const diffLog = diffEngine.diffScenario(scenario_id);

      if (severity) {
        const filtered = diffEngine.getDiffLog(scenario_id, severity);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                filtered.length > 0 ? filtered[0] : diffLog,
                null,
                2,
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(diffLog, null, 2),
          },
        ],
      };
    },
  );

  server.tool(
    "get_latest_diff_log",
    "가장 최근에 생성된 diff 로그를 반환한다. 시나리오 ID 지정 시 해당 시나리오의 최신 로그를 반환한다.",
    {
      scenario_id: z
        .string()
        .optional()
        .describe("시나리오 ID (선택, 미지정 시 전체)"),
    },
    async ({ scenario_id }) => {
      if (scenario_id) {
        const log = diffEngine.getLatestDiffLog(scenario_id);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                log || {
                  error: "DIFF_LOG_NOT_FOUND",
                  scenario_id,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      const allLogs = diffEngine.getDiffLog();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ diff_logs: allLogs }, null, 2),
          },
        ],
      };
    },
  );

  server.tool(
    "get_coverage",
    "전체 시나리오의 커버리지 리포트를 반환한다. 통과/실패/미실행 시나리오 수와 미커버 분기 목록을 포함한다.",
    {},
    async () => {
      const coverage = diffEngine.getCoverage();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(coverage, null, 2),
          },
        ],
      };
    },
  );
}
