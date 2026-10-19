import { spawnSync } from "node:child_process";
import { isIPv4 } from "node:net";
import { z } from "zod";

export const disposablePostgresIdentity = {
  containerName: "jarvis-agent-sync-postgres-test",
  image: "postgres:16-alpine",
  imageId: "sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea",
  repoDigest: "postgres@sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea",
  database: "jarvis_agent_sync_test",
  host: "127.0.0.1",
  port: "55433",
  network: "jarvis-agent-sync-test"
} as const;

const dockerInspectSchema = z.object({
  Id: z.string().regex(/^[a-f0-9]{64}$/),
  Name: z.literal(`/${disposablePostgresIdentity.containerName}`),
  Image: z.literal(disposablePostgresIdentity.imageId),
  State: z.object({
    Status: z.literal("running"),
    Health: z.object({ Status: z.literal("healthy") })
  }),
  Config: z.object({
    Image: z.literal(disposablePostgresIdentity.image),
    Env: z.array(z.string())
  }),
  HostConfig: z.object({
    // Docker reports "bridge" in HostConfig.NetworkMode when the container
    // was later attached to a user-defined network. Effective connectivity is
    // verified from NetworkSettings plus the inspected internal network below.
    NetworkMode: z.enum([disposablePostgresIdentity.network, "bridge"]),
    Privileged: z.literal(false),
    CapAdd: z.array(z.string()).nullable().optional(),
    PidMode: z.string().optional(),
    IpcMode: z.string().optional(),
    Binds: z.array(z.string()).nullable().optional(),
    PortBindings: z.record(z.string(), z.array(z.object({
      HostIp: z.string(),
      HostPort: z.string()
    }))),
    Tmpfs: z.record(z.string(), z.string()).optional().nullable()
  }),
  Mounts: z.array(z.unknown()),
  NetworkSettings: z.object({
    Networks: z.record(z.string(), z.object({ IPAddress: z.string() }))
  })
});

const dockerImageSchema = z.object({
  Id: z.literal(disposablePostgresIdentity.imageId),
  RepoDigests: z.array(z.string()).refine((digests) =>
    digests.includes(disposablePostgresIdentity.repoDigest)
  ),
  Architecture: z.literal("amd64"),
  Os: z.literal("linux")
});

const dockerNetworkSchema = z.object({
  Name: z.literal(disposablePostgresIdentity.network),
  Driver: z.literal("bridge"),
  Internal: z.literal(false),
  Attachable: z.literal(false),
  Containers: z.record(z.string(), z.unknown())
}).passthrough();

const sqlIdentitySchema = z.array(z.object({
  database: z.string(),
  role: z.string(),
  serverAddress: z.string().nullable(),
  serverPort: z.number().nullable()
}));

type DisposableContainer = z.infer<typeof dockerInspectSchema>;
type DockerImage = z.infer<typeof dockerImageSchema>;

function containerEnvironment(entries: string[]): Map<string, string> {
  const environment = new Map<string, string>();
  for (const entry of entries) {
    const separator = entry.indexOf("=");
    environment.set(
      separator < 0 ? entry : entry.slice(0, separator),
      separator < 0 ? "" : entry.slice(separator + 1)
    );
  }
  return environment;
}

function parseTmpfsOptions(value: string): boolean {
  const parts = value.split(",").map((part) => part.trim().toLowerCase());
  const options = new Set(parts);
  return parts.length === 4 && options.size === 4 &&
    options.has("rw") && options.has("noexec") && options.has("nosuid") && options.has("size=1g");
}

/** Pure metadata check, separately testable with synthetic Docker inspect data. */
export function isVerifiedDisposablePostgresMetadata(
  rawContainer: unknown,
  rawImage: unknown,
  rawNetwork: unknown
): boolean {
  const parsedContainer = dockerInspectSchema.safeParse(rawContainer);
  const parsedImage = dockerImageSchema.safeParse(rawImage);
  const network = dockerNetworkSchema.safeParse(rawNetwork);
  if (!parsedContainer.success || !parsedImage.success || !network.success) return false;

  const container = parsedContainer.data;
  const environment = containerEnvironment(container.Config.Env);
  const bindings = container.HostConfig.PortBindings;
  const publishedBindings = Object.values(bindings).flat();
  const dataTmpfs = container.HostConfig.Tmpfs?.["/var/lib/postgresql/data"];
  const networks = container.NetworkSettings.Networks;
  const containerNetwork = networks[disposablePostgresIdentity.network];
  const networkMembers = Object.keys(network.data.Containers);
  const addedCapabilities = container.HostConfig.CapAdd ?? [];
  const binds = container.HostConfig.Binds ?? [];

  return environment.get("POSTGRES_DB") === disposablePostgresIdentity.database &&
    Boolean(environment.get("POSTGRES_USER")) &&
    Boolean(environment.get("POSTGRES_PASSWORD")) &&
    Object.keys(bindings).length === 1 &&
    publishedBindings.length === 1 &&
    bindings["5432/tcp"]?.length === 1 &&
    bindings["5432/tcp"][0].HostIp === disposablePostgresIdentity.host &&
    bindings["5432/tcp"][0].HostPort === disposablePostgresIdentity.port &&
    binds.length === 0 &&
    container.Mounts.length === 0 &&
    Boolean(dataTmpfs && parseTmpfsOptions(dataTmpfs)) &&
    container.HostConfig.PidMode !== "host" &&
    container.HostConfig.IpcMode !== "host" &&
    addedCapabilities.length === 0 &&
    Object.keys(networks).length === 1 &&
    (container.HostConfig.NetworkMode === disposablePostgresIdentity.network ||
      container.HostConfig.NetworkMode === "bridge") &&
    Boolean(containerNetwork && isIPv4(containerNetwork.IPAddress)) &&
    networkMembers.length === 1 &&
    networkMembers[0] === container.Id;
}

function dockerJson(args: string[]): unknown | undefined {
  const result = spawnSync("docker", args, {
    encoding: "utf8",
    windowsHide: true,
    timeout: 5_000,
    maxBuffer: 256 * 1024
  });
  if (result.error || result.status !== 0 || !result.stdout) return undefined;
  try {
    return JSON.parse(result.stdout) as unknown;
  } catch {
    return undefined;
  }
}

interface VerifiedDisposableTarget {
  container: DisposableContainer;
  image: DockerImage;
  networkContainers: Record<string, unknown>;
  environment: Map<string, string>;
}

function inspectDisposableTarget(): VerifiedDisposableTarget | undefined {
  const rawContainer = dockerJson([
    "inspect", "--format", "{{json .}}", disposablePostgresIdentity.containerName
  ]);
  const parsedContainer = dockerInspectSchema.safeParse(rawContainer);
  if (!parsedContainer.success) return undefined;

  const rawImage = dockerJson([
    "image", "inspect", "--format", "{{json .}}", parsedContainer.data.Image
  ]);
  const parsedImage = dockerImageSchema.safeParse(rawImage);
  if (!parsedImage.success) return undefined;

  const rawNetwork = dockerJson([
    "network", "inspect", "--format", "{{json .}}", disposablePostgresIdentity.network
  ]);
  const parsedNetwork = dockerNetworkSchema.safeParse(rawNetwork);
  if (!parsedNetwork.success || !isVerifiedDisposablePostgresMetadata(
    rawContainer,
    rawImage,
    parsedNetwork.data
  )) return undefined;

  return {
    container: parsedContainer.data,
    image: parsedImage.data,
    networkContainers: parsedNetwork.data.Containers,
    environment: containerEnvironment(parsedContainer.data.Config.Env)
  };
}

function parseDisposablePostgresUrl(value: string): URL | undefined {
  const validatedUrl = z.string().url().safeParse(value);
  if (!validatedUrl.success) return undefined;

  try {
    const url = new URL(validatedUrl.data);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      url.hostname !== disposablePostgresIdentity.host ||
      url.port !== disposablePostgresIdentity.port ||
      decodeURIComponent(url.pathname.slice(1)) !== disposablePostgresIdentity.database ||
      [...url.searchParams.keys()].some((key) => !["schema", "connection_limit", "pool_timeout"].includes(key))
    ) return undefined;
    return url;
  } catch {
    return undefined;
  }
}

export function matchesDisposablePostgresSqlIdentity(
  rawIdentity: unknown,
  databaseUrl: string,
  expectedAddresses: Set<string>
): boolean {
  const url = parseDisposablePostgresUrl(databaseUrl);
  const actual = sqlIdentitySchema.safeParse(rawIdentity);
  const identity = actual.success ? actual.data[0] : undefined;
  const serverAddress = identity?.serverAddress?.replace(/^::ffff:/i, "").split("/")[0];

  return Boolean(url && identity &&
    identity.database === disposablePostgresIdentity.database &&
    identity.role === decodeURIComponent(url.username) &&
    serverAddress &&
    isIPv4(serverAddress) &&
    expectedAddresses.has(serverAddress) &&
    identity.serverPort === 5432);
}

export function isVerifiedDisposablePostgresUrl(value: string): boolean {
  const url = parseDisposablePostgresUrl(value);
  if (!url) return false;
  const target = inspectDisposableTarget();
  if (!target) return false;
  return decodeURIComponent(url.username) === target.environment.get("POSTGRES_USER") &&
    decodeURIComponent(url.password) === target.environment.get("POSTGRES_PASSWORD");
}

export async function assertDisposablePostgresConnection(
  databaseUrl: string,
  query: () => Promise<unknown>
): Promise<void> {
  const url = parseDisposablePostgresUrl(databaseUrl);
  const target = inspectDisposableTarget();
  if (!url || !target ||
    decodeURIComponent(url.username) !== target.environment.get("POSTGRES_USER") ||
    decodeURIComponent(url.password) !== target.environment.get("POSTGRES_PASSWORD")) {
    throw new Error("Database operation blocked: the verified disposable PostgreSQL container identity is unavailable.");
  }

  const expectedAddresses = new Set(Object.values(target.container.NetworkSettings.Networks)
    .map((network) => network.IPAddress)
    .filter(Boolean));
  let queryResult: unknown;
  try {
    queryResult = await query();
  } catch {
    throw new Error("Database operation blocked: unable to verify PostgreSQL connection identity.");
  }
  // Re-inspect after SQL so replacing the container during the query fails closed.
  const afterQuery = inspectDisposableTarget();
  if (
    !matchesDisposablePostgresSqlIdentity(queryResult, databaseUrl, expectedAddresses) ||
    afterQuery?.container.Id !== target.container.Id ||
    afterQuery?.image.Id !== target.image.Id
  ) {
    throw new Error("Database operation blocked: connected PostgreSQL identity does not match the verified disposable container.");
  }
}
