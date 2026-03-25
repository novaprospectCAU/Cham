import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";
import { validateSpec, type ValidationResult } from "./validator.js";
import { diffSpecs, type SpecDiff } from "./differ.js";

export interface SpecStoreOptions {
  /** Root directory containing specs/ folder */
  rootDir: string;
}

export class SpecStore {
  private readonly specsDir: string;
  private readonly currentDir: string;
  private readonly historyDir: string;

  constructor(options: SpecStoreOptions) {
    this.specsDir = path.join(options.rootDir, "specs");
    this.currentDir = path.join(this.specsDir, "current");
    this.historyDir = path.join(this.specsDir, "history");
  }

  /**
   * Read all current spec files and return as a merged object.
   */
  getCurrentSpec(): Record<string, unknown> {
    const specs: Record<string, unknown> = {};

    if (!fs.existsSync(this.currentDir)) {
      return specs;
    }

    const files = fs.readdirSync(this.currentDir).filter((f) =>
      f.endsWith(".yaml") || f.endsWith(".yml")
    );

    for (const file of files) {
      const filePath = path.join(this.currentDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const parsed = yaml.load(content);
      specs[file] = parsed;
    }

    return specs;
  }

  /**
   * Read a specific spec file.
   */
  getSpecFile(filename: string): unknown {
    const filePath = path.join(this.currentDir, filename);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return yaml.load(content);
  }

  /**
   * Validate all current specs against their schemas.
   */
  validateAll(): ValidationResult[] {
    const specs = this.getCurrentSpec();
    return Object.entries(specs).map(([file, data]) =>
      validateSpec(file, data)
    );
  }

  /**
   * Save a snapshot of current specs to history.
   */
  saveVersion(version: string): void {
    const versionDir = path.join(this.historyDir, version);
    fs.mkdirSync(versionDir, { recursive: true });

    if (!fs.existsSync(this.currentDir)) return;

    const files = fs.readdirSync(this.currentDir).filter((f) =>
      f.endsWith(".yaml") || f.endsWith(".yml")
    );

    for (const file of files) {
      const src = path.join(this.currentDir, file);
      const dest = path.join(versionDir, file);
      fs.copyFileSync(src, dest);
    }
  }

  /**
   * List all saved versions.
   */
  listVersions(): string[] {
    if (!fs.existsSync(this.historyDir)) return [];
    return fs
      .readdirSync(this.historyDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
  }

  /**
   * Load specs from a specific version.
   */
  getVersionSpec(version: string): Record<string, unknown> {
    const versionDir = path.join(this.historyDir, version);
    const specs: Record<string, unknown> = {};

    if (!fs.existsSync(versionDir)) {
      return specs;
    }

    const files = fs.readdirSync(versionDir).filter((f) =>
      f.endsWith(".yaml") || f.endsWith(".yml")
    );

    for (const file of files) {
      const filePath = path.join(versionDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      specs[file] = yaml.load(content);
    }

    return specs;
  }

  /**
   * Diff two versions. Use "current" to refer to the live specs.
   */
  diff(fromVersion: string, toVersion: string): SpecDiff {
    const oldSpecs =
      fromVersion === "current"
        ? this.getCurrentSpec()
        : this.getVersionSpec(fromVersion);
    const newSpecs =
      toVersion === "current"
        ? this.getCurrentSpec()
        : this.getVersionSpec(toVersion);

    return diffSpecs(fromVersion, toVersion, oldSpecs, newSpecs);
  }

  /**
   * Write a spec file to current/.
   */
  writeSpecFile(filename: string, data: unknown): ValidationResult {
    const validation = validateSpec(filename, data);
    if (!validation.valid) {
      return validation;
    }

    fs.mkdirSync(this.currentDir, { recursive: true });
    const filePath = path.join(this.currentDir, filename);
    const content = yaml.dump(data, { lineWidth: -1 });
    fs.writeFileSync(filePath, content, "utf-8");

    return validation;
  }
}
