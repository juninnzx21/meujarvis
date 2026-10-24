import { describe, expect, it } from "vitest";
import {
  disposablePostgresIdentity,
  isVerifiedDisposablePostgresMetadata,
  matchesDisposablePostgresSqlIdentity,
  isVerifiedDisposablePostgresUrl
} from "./disposablePostgres.js";

const containerId = "a".repeat(64);
const image = {
  Id: disposablePostgresIdentity.imageId,
  RepoDigests: [disposablePostgresIdentity.repoDigest],
  Architecture: "amd64",
  Os: "linux"
};

function createContainer(overrides: Record<string, unknown> = {}) {
  return {
    Id: containerId,
    Name: `/${disposablePostgresIdentity.containerName}`,
    Image: disposablePostgresIdentity.imageId,
    State: { Status: "running", Health: { Status: "healthy" } },
    Config: {
      Image: disposablePostgresIdentity.image,
      Env: [
        `POSTGRES_DB=${disposablePostgresIdentity.database}`,
        "POSTGRES_USER=synthetic_test_user",
        "POSTGRES_PASSWORD=synthetic_test_password"
      ]
    },
    HostConfig: {
      NetworkMode: disposablePostgresIdentity.network,
      Privileged: false,
      CapAdd: null,
      PidMode: "",
      IpcMode: "",
      Binds: null,
      PortBindings: {
        "5432/tcp": [{ HostIp: disposablePostgresIdentity.host, HostPort: disposablePostgresIdentity.port }]
      },
      Tmpfs: { "/var/lib/postgresql/data": "rw,noexec,nosuid,size=1g" }
    },
    Mounts: [],
    NetworkSettings: {
      Networks: { [disposablePostgresIdentity.network]: { IPAddress: "172.19.0.2" } }
    },
    ...overrides
  };
}

function isVerified(overrides: {
  container?: Record<string, unknown>;
  image?: Record<string, unknown>;
  network?: Record<string, unknown>;
} = {}) {
  return isVerifiedDisposablePostgresMetadata(
    createContainer(overrides.container),
    overrides.image ?? image,
    overrides.network ?? {
      Name: disposablePostgresIdentity.network,
      Driver: "bridge",
      Internal: false,
      Attachable: false,
      Containers: { [containerId]: { Name: disposablePostgresIdentity.containerName } }
    }
  );
}

describe("disposable PostgreSQL target verification", () => {
  const validUrl = "postgresql://synthetic_test_user:synthetic_test_password@127.0.0.1:55433/jarvis_agent_sync_test";

  it("accepts only the positively identified disposable container", () => {
    expect(isVerified()).toBe(true);
  });

  it.each([
    ["lookalike testprod database", { pathname: "/testprod" }],
    ["different test database", { pathname: "/other_test" }],
    ["production database on expected port", { pathname: "/production" }],
    ["wrong published port", { port: "55434" }],
    ["localhost alias", { hostname: "localhost" }],
    ["remote host", { hostname: "192.0.2.10" }],
    ["SSH tunnel endpoint", { hostname: "127.0.0.1", port: "15433" }],
    ["different protocol", { protocol: "mysql:" }]
  ])("rejects URL for %s", (_label, mutation) => {
    const url = new URL(validUrl);
    Object.assign(url, mutation);
    expect(isVerifiedDisposablePostgresUrl(url.toString())).toBe(false);
  });

  it.each([
    ["another container", { container: { Name: "/jarvis-prod-postgres" } }],
    ["a different immutable image", { container: { Image: `sha256:${"b".repeat(64)}` } }],
    ["a different image tag", { container: { Config: { Image: "postgres:latest", Env: ["POSTGRES_DB=jarvis_agent_sync_test", "POSTGRES_USER=x", "POSTGRES_PASSWORD=y"] } } }],
    ["an unpinned image digest", { image: { ...image, RepoDigests: ["postgres@sha256:deadbeef"] } }],
    ["a publicly bound port", { container: { HostConfig: { ...createContainer().HostConfig, PortBindings: { "5432/tcp": [{ HostIp: "0.0.0.0", HostPort: "55433" }] } } } }],
    ["an extra published port", { container: { HostConfig: { ...createContainer().HostConfig, PortBindings: { ...createContainer().HostConfig.PortBindings, "9187/tcp": [{ HostIp: "127.0.0.1", HostPort: "9187" }] } } } }],
    ["a persistent volume", { container: { Mounts: [{ Type: "volume", Destination: "/var/lib/postgresql/data" }] } }],
    ["a bind mount", { container: { HostConfig: { ...createContainer().HostConfig, Binds: ["/data:/var/lib/postgresql/data"] } } }],
    ["missing tmpfs", { container: { HostConfig: { ...createContainer().HostConfig, Tmpfs: {} } } }],
    ["unsafe tmpfs options", { container: { HostConfig: { ...createContainer().HostConfig, Tmpfs: { "/var/lib/postgresql/data": "rw,size=1g" } } } }],
    ["conflicting tmpfs options", { container: { HostConfig: { ...createContainer().HostConfig, Tmpfs: { "/var/lib/postgresql/data": "rw,noexec,nosuid,size=1g,exec" } } } }],
    ["a privileged container", { container: { HostConfig: { ...createContainer().HostConfig, Privileged: true } } }],
    ["added Linux capabilities", { container: { HostConfig: { ...createContainer().HostConfig, CapAdd: ["SYS_ADMIN"] } } }],
    ["host networking", { container: { HostConfig: { ...createContainer().HostConfig, NetworkMode: "host" } } }],
    ["the shared default bridge", { network: {
      Name: "bridge",
      Driver: "bridge",
      Internal: false,
      Attachable: false,
      Containers: { [containerId]: { Name: disposablePostgresIdentity.containerName } }
    } }],
    ["a network that allows external routing under an untrusted name", { network: {
      Name: `${disposablePostgresIdentity.network}-untrusted`,
      Driver: "bridge",
      Internal: false,
      Attachable: false,
      Containers: { [containerId]: { Name: disposablePostgresIdentity.containerName } }
    } }],
    ["an attachable test network", { network: {
      Name: disposablePostgresIdentity.network,
      Driver: "bridge",
      Internal: false,
      Attachable: true,
      Containers: { [containerId]: { Name: disposablePostgresIdentity.containerName } }
    } }],
    ["a network with another attached container", { network: {
      Name: disposablePostgresIdentity.network,
      Driver: "bridge",
      Internal: false,
      Attachable: false,
      Containers: {
        [containerId]: { Name: disposablePostgresIdentity.containerName },
        ["b".repeat(64)]: { Name: "unrelated-service" }
      }
    } }]
  ])("rejects metadata for %s", (_label, overrides) => {
    expect(isVerified(overrides)).toBe(false);
  });

  it("requires SQL to report the container database, user, internal address and port", () => {
    const sql = [{
      database: "jarvis_agent_sync_test",
      role: "synthetic_test_user",
      serverAddress: "172.19.0.2",
      serverPort: 5432
    }];
    const internalAddresses = new Set(["172.19.0.2"]);
    expect(matchesDisposablePostgresSqlIdentity(sql, validUrl, internalAddresses)).toBe(true);
    expect(matchesDisposablePostgresSqlIdentity([{ ...sql[0], database: "testprod" }], validUrl, internalAddresses)).toBe(false);
    expect(matchesDisposablePostgresSqlIdentity([{ ...sql[0], serverAddress: "10.0.0.5" }], validUrl, internalAddresses)).toBe(false);
    expect(matchesDisposablePostgresSqlIdentity([{ ...sql[0], serverAddress: "127.0.0.1" }], validUrl, internalAddresses)).toBe(false);
    expect(matchesDisposablePostgresSqlIdentity([{ ...sql[0], serverPort: 15433 }], validUrl, internalAddresses)).toBe(false);
    expect(matchesDisposablePostgresSqlIdentity([{ ...sql[0], role: "other_user" }], validUrl, internalAddresses)).toBe(false);
  });
});
