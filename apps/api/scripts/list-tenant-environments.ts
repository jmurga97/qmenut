import { TENANT_ENVIRONMENTS, TENANT_ENVIRONMENT_NAMES } from "./tenant-environment";

console.log("Ambientes remotos disponibles para onboarding:\n");

for (const environment of TENANT_ENVIRONMENT_NAMES) {
  const config = TENANT_ENVIRONMENTS[environment];
  console.log(
    `${environment}\n` +
      `  D1            ${config.databaseName}\n` +
      `  API Worker    ${config.apiWorker}\n` +
      `  Theme Worker  ${config.tenantConfigWorker}\n` +
      `  Web Worker    ${config.webWorker}\n`,
  );
}
