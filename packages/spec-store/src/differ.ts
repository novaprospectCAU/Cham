export interface DiffChange {
  type: "add" | "remove" | "modify";
  path: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface SpecDiff {
  from: string;
  to: string;
  changes: DiffChange[];
  affected_files: string[];
  ai_instructions: string;
}

/**
 * Deep-diff two spec objects and produce a structured change list.
 */
export function diffSpecs(
  fromVersion: string,
  toVersion: string,
  oldSpecs: Record<string, unknown>,
  newSpecs: Record<string, unknown>,
): SpecDiff {
  const changes: DiffChange[] = [];
  const affectedFiles = new Set<string>();

  const allFiles = new Set([
    ...Object.keys(oldSpecs),
    ...Object.keys(newSpecs),
  ]);

  for (const file of allFiles) {
    const oldData = oldSpecs[file];
    const newData = newSpecs[file];

    if (oldData === undefined) {
      changes.push({ type: "add", path: file, newValue: newData });
      affectedFiles.add(file);
    } else if (newData === undefined) {
      changes.push({ type: "remove", path: file, oldValue: oldData });
      affectedFiles.add(file);
    } else {
      const fileChanges = diffObjects(oldData, newData, file);
      if (fileChanges.length > 0) {
        changes.push(...fileChanges);
        affectedFiles.add(file);
      }
    }
  }

  return {
    from: fromVersion,
    to: toVersion,
    changes,
    affected_files: [...affectedFiles],
    ai_instructions: generateInstructions(changes),
  };
}

function diffObjects(
  oldObj: unknown,
  newObj: unknown,
  basePath: string,
): DiffChange[] {
  const changes: DiffChange[] = [];

  if (typeof oldObj !== "object" || typeof newObj !== "object") {
    if (oldObj !== newObj) {
      changes.push({
        type: "modify",
        path: basePath,
        oldValue: oldObj,
        newValue: newObj,
      });
    }
    return changes;
  }

  if (oldObj === null || newObj === null) {
    if (oldObj !== newObj) {
      changes.push({
        type: "modify",
        path: basePath,
        oldValue: oldObj,
        newValue: newObj,
      });
    }
    return changes;
  }

  if (Array.isArray(oldObj) && Array.isArray(newObj)) {
    return diffArrays(oldObj, newObj, basePath);
  }

  const oldRecord = oldObj as Record<string, unknown>;
  const newRecord = newObj as Record<string, unknown>;
  const allKeys = new Set([
    ...Object.keys(oldRecord),
    ...Object.keys(newRecord),
  ]);

  for (const key of allKeys) {
    const childPath = `${basePath}.${key}`;
    if (!(key in oldRecord)) {
      changes.push({ type: "add", path: childPath, newValue: newRecord[key] });
    } else if (!(key in newRecord)) {
      changes.push({
        type: "remove",
        path: childPath,
        oldValue: oldRecord[key],
      });
    } else {
      changes.push(...diffObjects(oldRecord[key], newRecord[key], childPath));
    }
  }

  return changes;
}

function diffArrays(
  oldArr: unknown[],
  newArr: unknown[],
  basePath: string,
): DiffChange[] {
  const changes: DiffChange[] = [];
  const maxLen = Math.max(oldArr.length, newArr.length);

  for (let i = 0; i < maxLen; i++) {
    const childPath = `${basePath}[${i}]`;
    if (i >= oldArr.length) {
      changes.push({ type: "add", path: childPath, newValue: newArr[i] });
    } else if (i >= newArr.length) {
      changes.push({ type: "remove", path: childPath, oldValue: oldArr[i] });
    } else {
      changes.push(...diffObjects(oldArr[i], newArr[i], childPath));
    }
  }

  return changes;
}

function generateInstructions(changes: DiffChange[]): string {
  if (changes.length === 0) return "변경사항 없음";

  const parts: string[] = [];
  const adds = changes.filter((c) => c.type === "add");
  const removes = changes.filter((c) => c.type === "remove");
  const modifies = changes.filter((c) => c.type === "modify");

  if (adds.length > 0) {
    parts.push(`추가: ${adds.map((c) => c.path).join(", ")}`);
  }
  if (removes.length > 0) {
    parts.push(`제거: ${removes.map((c) => c.path).join(", ")}`);
  }
  if (modifies.length > 0) {
    parts.push(`수정: ${modifies.map((c) => c.path).join(", ")}`);
  }

  return parts.join("; ");
}
