import { z } from "zod";

// --- Pages ---

const FlowSchema = z.object({
  trigger: z.string(),
  conditions: z.array(z.record(z.unknown())).optional(),
  action: z.string(),
});

const AssertionSchema = z.object({
  condition: z.string(),
});

const PageSchema = z.object({
  components: z.array(z.string()),
  flows: z.array(FlowSchema).optional(),
  assertions: z.array(AssertionSchema).optional(),
});

export const PagesSpecSchema = z.object({
  pages: z.record(PageSchema),
});

// --- Flows ---

const StepSchema = z.object({
  action: z.string(),
  target: z.string().optional(),
  value: z.string().optional(),
  expected: z.record(z.unknown()).optional(),
});

const FlowDefinitionSchema = z.object({
  name: z.string(),
  steps: z.array(StepSchema),
});

export const FlowsSpecSchema = z.object({
  flows: z.array(FlowDefinitionSchema),
});

// --- Contracts ---

const ContractSchema = z.object({
  provides: z.record(z.unknown()),
  expects: z.record(z.unknown()),
});

export const ContractsSpecSchema = z.object({
  contracts: z.record(ContractSchema),
});

// --- API ---

const ApiEndpointSchema = z.object({
  input: z.record(z.unknown()).optional(),
  expected: z.record(z.unknown()),
});

export const ApiSpecSchema = z.object({
  api: z.record(ApiEndpointSchema),
});

// --- Performance ---

export const PerformanceSpecSchema = z.object({
  performance: z.object({
    min_fps: z.number().optional(),
    max_memory_mb: z.number().optional(),
    max_render_time_ms: z.number().optional(),
  }),
});

// --- Tolerances ---

export const TolerancesSpecSchema = z.object({
  tolerances: z.object({
    layout_px: z.number().optional(),
    timing_ms: z.number().optional(),
    color_delta: z.number().optional(),
    fps_min: z.number().optional(),
  }),
});

// Schema map: filename -> schema
export const SPEC_SCHEMAS: Record<string, z.ZodType> = {
  "pages.yaml": PagesSpecSchema,
  "flows.yaml": FlowsSpecSchema,
  "contracts.yaml": ContractsSpecSchema,
  "api.yaml": ApiSpecSchema,
  "performance.yaml": PerformanceSpecSchema,
  "tolerances.yaml": TolerancesSpecSchema,
};

// Inferred types
export type PagesSpec = z.infer<typeof PagesSpecSchema>;
export type FlowsSpec = z.infer<typeof FlowsSpecSchema>;
export type ContractsSpec = z.infer<typeof ContractsSpecSchema>;
export type ApiSpec = z.infer<typeof ApiSpecSchema>;
export type PerformanceSpec = z.infer<typeof PerformanceSpecSchema>;
export type TolerancesSpec = z.infer<typeof TolerancesSpecSchema>;
