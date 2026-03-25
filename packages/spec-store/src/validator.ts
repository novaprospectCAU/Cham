import { ZodType, ZodError } from "zod";
import { SPEC_SCHEMAS } from "./schemas.js";

export interface ValidationResult {
  valid: boolean;
  file: string;
  errors?: Array<{
    path: string;
    message: string;
  }>;
}

export function validateSpec(
  filename: string,
  data: unknown,
): ValidationResult {
  const schema = SPEC_SCHEMAS[filename];

  // No schema registered — treat as valid (custom spec files allowed)
  if (!schema) {
    return { valid: true, file: filename };
  }

  return validateWithSchema(filename, data, schema);
}

export function validateWithSchema(
  filename: string,
  data: unknown,
  schema: ZodType,
): ValidationResult {
  const result = schema.safeParse(data);

  if (result.success) {
    return { valid: true, file: filename };
  }

  return {
    valid: false,
    file: filename,
    errors: formatZodError(result.error),
  };
}

function formatZodError(
  error: ZodError,
): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}
