import { z } from "zod";

const StepSchema = z.object({
  action: z.enum(["click", "type", "navigate", "wait", "scroll"]),
  selector: z.string().optional(),
  value: z.string().optional(),
  url: z.string().optional(),
  ms: z.number().optional(),
  anchor: z.string().optional(),
  scroll_y: z.number().optional(),
  scroll_x: z.number().optional(),
});

const AnchorCaptureSchema = z.object({
  offset_ms: z.number(),
  capture: z.array(z.enum(["dom", "screenshot"])),
});

const AnchorDefinitionSchema = z.object({
  name: z.string(),
  captures: z.array(AnchorCaptureSchema),
});

const AssertionSchema = z.object({
  anchor: z.string(),
  offset_ms: z.number(),
  type: z.enum(["selector_visible", "selector_text", "url_match"]),
  selector: z.string().optional(),
  expected: z.unknown(),
});

const DockerConfigSchema = z.object({
  image: z.string(),
  port: z.number(),
  container_port: z.number().optional(),
  env: z.record(z.string()).optional(),
  volumes: z.array(z.string()).optional(),
  health_check: z.string().optional(),
  health_timeout: z.number().optional(),
});

export const ScenarioDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  target_url: z.string(),
  docker: DockerConfigSchema.optional(),
  steps: z.array(StepSchema),
  anchors: z.array(AnchorDefinitionSchema).default([]),
  assertions: z.array(AssertionSchema).default([]),
});

export type ScenarioDefinitionParsed = z.infer<
  typeof ScenarioDefinitionSchema
>;
