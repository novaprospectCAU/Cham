import { execSync, spawn, type ChildProcess } from "node:child_process";

export interface DockerConfig {
  image: string;
  port: number;
  containerPort?: number;
  env?: Record<string, string>;
  volumes?: string[];
  healthCheck?: string;
  healthTimeout?: number;
}

export interface DockerContainer {
  id: string;
  url: string;
  stop: () => Promise<void>;
}

/**
 * Check if Docker is available on the system.
 */
export function isDockerAvailable(): boolean {
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Start a Docker container for the target app.
 * Returns a handle to stop it after the scenario completes.
 */
export async function startContainer(
  config: DockerConfig,
): Promise<DockerContainer> {
  const containerPort = config.containerPort || config.port;
  const hostPort = config.port;

  const args = [
    "run", "-d", "--rm",
    "-p", `${hostPort}:${containerPort}`,
  ];

  // Environment variables
  if (config.env) {
    for (const [key, value] of Object.entries(config.env)) {
      args.push("-e", `${key}=${value}`);
    }
  }

  // Volume mounts
  if (config.volumes) {
    for (const vol of config.volumes) {
      args.push("-v", vol);
    }
  }

  args.push(config.image);

  const containerId = execSync(`docker ${args.join(" ")}`, {
    encoding: "utf-8",
  }).trim();

  const url = `http://localhost:${hostPort}`;

  // Wait for health check
  if (config.healthCheck) {
    await waitForHealth(url + config.healthCheck, config.healthTimeout || 30000);
  } else {
    await waitForPort(hostPort, config.healthTimeout || 15000);
  }

  return {
    id: containerId,
    url,
    stop: async () => {
      try {
        execSync(`docker stop ${containerId}`, { stdio: "ignore" });
      } catch {
        // Container may have already stopped
      }
    },
  };
}

/**
 * Wait for a URL to return 200.
 */
async function waitForHealth(
  url: string,
  timeoutMs: number,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    JSON.stringify({
      error: "DOCKER_HEALTH_TIMEOUT",
      url,
      timeout_ms: timeoutMs,
    }),
  );
}

/**
 * Wait for a port to accept connections.
 */
async function waitForPort(
  port: number,
  timeoutMs: number,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://localhost:${port}`);
      if (res) return;
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    JSON.stringify({
      error: "DOCKER_PORT_TIMEOUT",
      port,
      timeout_ms: timeoutMs,
    }),
  );
}

/**
 * Pull a Docker image if not already present.
 */
export function pullImage(image: string): void {
  try {
    execSync(`docker image inspect ${image}`, { stdio: "ignore" });
  } catch {
    execSync(`docker pull ${image}`, { stdio: "inherit" });
  }
}
