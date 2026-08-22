export const TENANT_ENVIRONMENT_NAMES = ["development", "production"] as const;

export type TenantEnvironmentName = (typeof TENANT_ENVIRONMENT_NAMES)[number];

interface TenantEnvironmentConfig {
  apiWorker: string;
  databaseName: string;
  tenantConfigWorker: string;
  webWorker: string;
}

export const TENANT_ENVIRONMENTS: Record<TenantEnvironmentName, TenantEnvironmentConfig> = {
  development: {
    apiWorker: "qmenut-api-dev",
    databaseName: "qmenut-db-v2-dev",
    tenantConfigWorker: "qmenut-tenant-config-dev",
    webWorker: "qmenut-web-dev",
  },
  production: {
    apiWorker: "qmenut-api",
    databaseName: "qmenut-db-v2",
    tenantConfigWorker: "qmenut-tenant-config",
    webWorker: "qmenut-web",
  },
};

interface ResolveTenantEnvironmentInput {
  remote: boolean;
  selected?: string;
}

export function resolveTenantEnvironment({ remote, selected }: ResolveTenantEnvironmentInput): TenantEnvironmentName {
  if (selected === undefined) {
    if (remote) {
      throw new Error("--remote requiere --env development o --env production");
    }

    return "development";
  }

  if (!TENANT_ENVIRONMENT_NAMES.some((environment) => environment === selected)) {
    throw new Error(`--env debe ser ${TENANT_ENVIRONMENT_NAMES.join(" o ")}`);
  }

  return selected;
}

export function getD1TargetArgs(environment: TenantEnvironmentName, remote: boolean): string[] {
  return remote ? ["--remote", "--env", environment, "-y"] : ["--local"];
}

export function getKvTargetArgs(environment: TenantEnvironmentName, remote: boolean): string[] {
  return remote
    ? ["--remote", "--env", environment]
    : ["--preview", "--local", "--persist-to", "../../.wrangler-shared/state"];
}

export function describeTenantTarget(environment: TenantEnvironmentName, remote: boolean): string {
  if (!remote) return "local (D1/KV persistidos por Wrangler)";

  const config = TENANT_ENVIRONMENTS[environment];
  return `${environment}: D1 ${config.databaseName}, ${config.tenantConfigWorker}, ${config.webWorker}`;
}
